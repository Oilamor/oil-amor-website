/**
 * Credit System for Oil Amor Refill Program
 * Manages $5 return credits and customer store credit balance
 *
 * UNITS: ALL amounts in this module are integer cents (AUD).
 * REFILL_CREDIT_AMOUNT = 500 cents ($5.00). Balances in the
 * customer_credits / credit_transactions tables are cents.
 *
 * NOTE — TWO STORE-CREDIT SYSTEMS EXIST (see also lib/rewards/customer-rewards.ts):
 * 1. THIS system: Postgres customer_credits + credit_transactions (cents).
 *    Used by refill returns, blend commissions, referral credits, and
 *    checkout store-credit redemption. This is the transactional ledger.
 * 2. Redis CustomerRewardsProfile.accountCredit (lib/rewards/customer-rewards.ts):
 *    a rewards-facing balance with no transactional ledger and no
 *    reconciliation with the Postgres balance.
 * Credits earned/spent in one system are NOT visible in the other. Until a
 * unification decision is made, treat the Postgres ledger as authoritative
 * for anything money-moving.
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import {
  creditTransactions,
  customerCredits,
  type InsertCreditTransaction,
  type InsertCustomerCredit,
} from '@/lib/db/schema-refill';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CreditTransaction {
  id: string;
  customerId: string;
  type: 'earned' | 'used' | 'expired' | 'adjusted';
  amount: number;
  balance: number;
  description: string;
  metadata?: {
    bottleId?: string;
    trackingNumber?: string;
    orderId?: string;
    adminId?: string;
    reason?: string;
  };
  createdAt: Date;
  expiresAt?: Date;
}

export interface CreditValidationResult {
  valid: boolean;
  availableBalance: number;
  suggestedUsage: number;
  pendingCredits?: number;
}

export interface CreditSummary {
  totalEarned: number;
  totalUsed: number;
  totalExpired: number;
  currentBalance: number;
  pendingCredits: number;
  expiringSoon: number; // Credits expiring within 30 days
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const REFILL_CREDIT_AMOUNT = 500; // cents ($5 AUD)
const CREDIT_EXPIRY_MONTHS = 12;
const EXPIRY_WARNING_DAYS = 30;

// ============================================================================
// CREDIT PROCESSING
// ============================================================================

/**
 * Process a refill credit when a bottle is returned
 * Creates transaction and updates customer balance
 */
export async function processRefillCredit(
  customerId: string,
  bottleId: string,
  trackingNumber: string
): Promise<{
  creditApplied: number;
  newBalance: number;
  transactionId: string;
}> {
  // Check if credit was already applied for this tracking number
  const existingTransaction = await db.query.creditTransactions.findFirst({
    where: and(
      eq(creditTransactions.customerId, customerId),
      eq(creditTransactions.type, 'earned'),
      sql`${creditTransactions.metadata}->>'trackingNumber' = ${trackingNumber}`
    ),
  });

  if (existingTransaction) {
    throw new Error('Credit already applied for this return');
  }

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + CREDIT_EXPIRY_MONTHS);

  const transactionId = nanoid();
  const now = new Date();

  // Get or create customer credit record
  let customerCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  if (!customerCredit) {
    // Create new customer credit record
    await db.insert(customerCredits).values({
      id: nanoid(),
      customerId,
      balance: REFILL_CREDIT_AMOUNT,
      totalEarned: REFILL_CREDIT_AMOUNT,
      totalUsed: 0,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Update existing balance
    await db
      .update(customerCredits)
      .set({
        balance: sql`${customerCredits.balance} + ${REFILL_CREDIT_AMOUNT}`,
        totalEarned: sql`${customerCredits.totalEarned} + ${REFILL_CREDIT_AMOUNT}`,
        updatedAt: now,
      })
      .where(eq(customerCredits.customerId, customerId));
  }

  // Create transaction record
  const transaction: InsertCreditTransaction = {
    id: transactionId,
    customerId,
    type: 'earned',
    amount: REFILL_CREDIT_AMOUNT,
    balance: (customerCredit?.balance || 0) + REFILL_CREDIT_AMOUNT,
    description: `Return credit for bottle ${bottleId}`,
    metadata: {
      bottleId,
      trackingNumber,
      creditAmount: REFILL_CREDIT_AMOUNT,
    },
    createdAt: now,
    expiresAt,
  };

  await db.insert(creditTransactions).values(transaction);

  // Get updated balance
  const updatedCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  // Revalidate caches
  revalidateTag(`customer-credits-${customerId}`);
  revalidateTag(`credit-history-${customerId}`);

  return {
    creditApplied: REFILL_CREDIT_AMOUNT,
    newBalance: updatedCredit?.balance || REFILL_CREDIT_AMOUNT,
    transactionId,
  };
}

/**
 * Use credits for a purchase
 */
export async function useCredits(
  customerId: string,
  amount: number,
  orderId: string
): Promise<{
  success: boolean;
  amountUsed: number;
  remainingBalance: number;
  transactionId: string;
}> {
  // Validate request
  const validation = await validateCreditUsage(customerId, amount);
  if (!validation.valid) {
    throw new Error(`Credit usage invalid: Available balance ${validation.availableBalance}, requested ${amount}`);
  }

  return await db.transaction(async (tx) => {
    const customerCredit = await tx.select().from(customerCredits)
      .where(eq(customerCredits.customerId, customerId))
      .limit(1)
      .then(rows => rows[0] || null);

    if (!customerCredit || customerCredit.balance < amount) {
      throw new Error('Insufficient credit balance');
    }

    const transactionId = nanoid();
    const now = new Date();
    const newBalance = customerCredit.balance - amount;

    // Update customer balance
    await tx
      .update(customerCredits)
      .set({
        balance: newBalance,
        totalUsed: sql`${customerCredits.totalUsed} + ${amount}`,
        updatedAt: now,
      })
      .where(eq(customerCredits.customerId, customerId));

    // Create transaction record
    const transaction: InsertCreditTransaction = {
      id: transactionId,
      customerId,
      type: 'used',
      amount: -amount,
      balance: newBalance,
      description: `Credit used for order ${orderId}`,
      metadata: {
        orderId,
        amountUsed: amount,
      },
      createdAt: now,
    };

    await tx.insert(creditTransactions).values(transaction);

    // Revalidate caches
    revalidateTag(`customer-credits-${customerId}`);
    revalidateTag(`credit-history-${customerId}`);

    return {
      success: true,
      amountUsed: amount,
      remainingBalance: newBalance,
      transactionId,
    };
  });
}

/**
 * Adjust customer credit balance (admin only)
 */
export async function adjustCreditBalance(
  customerId: string,
  amount: number,
  reason: string,
  adminId: string
): Promise<{
  success: boolean;
  newBalance: number;
  transactionId: string;
}> {
  const customerCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  const now = new Date();
  const transactionId = nanoid();

  if (!customerCredit) {
    // Create new record with adjusted balance
    await db.insert(customerCredits).values({
      id: nanoid(),
      customerId,
      balance: amount,
      totalEarned: amount > 0 ? amount : 0,
      totalUsed: amount < 0 ? Math.abs(amount) : 0,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const newBalance = customerCredit.balance + amount;

    if (newBalance < 0) {
      throw new Error('Adjustment would result in negative balance');
    }

    await db
      .update(customerCredits)
      .set({
        balance: newBalance,
        updatedAt: now,
      })
      .where(eq(customerCredits.customerId, customerId));
  }

  // Create transaction record
  const transaction: InsertCreditTransaction = {
    id: transactionId,
    customerId,
    type: 'adjusted',
    amount,
    balance: (customerCredit?.balance || 0) + amount,
    description: `Credit adjustment: ${reason}`,
    metadata: {
      adminId,
      reason,
      previousBalance: customerCredit?.balance || 0,
    },
    createdAt: now,
  };

  await db.insert(creditTransactions).values(transaction);

  const updatedCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  revalidateTag(`customer-credits-${customerId}`);
  revalidateTag(`credit-history-${customerId}`);

  return {
    success: true,
    newBalance: updatedCredit?.balance || 0,
    transactionId,
  };
}

// ============================================================================
// CREDIT VALIDATION
// ============================================================================

/**
 * Validate credit usage request
 */
export async function validateCreditUsage(
  customerId: string,
  requestedAmount: number
): Promise<CreditValidationResult> {
  const customerCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  const availableBalance = customerCredit?.balance || 0;

  // Check for pending credits (returns in transit)
  const pendingTransactions = await db.query.creditTransactions.findMany({
    where: and(
      eq(creditTransactions.customerId, customerId),
      eq(creditTransactions.type, 'earned'),
      sql`${creditTransactions.metadata}->>'status' = 'pending'`
    ),
  });

  const pendingCredits = pendingTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  // Determine suggested usage
  let suggestedUsage = Math.min(requestedAmount, availableBalance);
  
  // Round to nearest dollar for better UX
  suggestedUsage = Math.floor(suggestedUsage);

  return {
    valid: availableBalance >= requestedAmount && requestedAmount > 0,
    availableBalance,
    suggestedUsage: Math.max(0, suggestedUsage),
    pendingCredits,
  };
}

// ============================================================================
// CREDIT HISTORY
// ============================================================================

/**
 * Get credit transaction history for a customer
 */
export async function getCreditHistory(
  customerId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: CreditTransaction['type'];
  }
): Promise<CreditTransaction[]> {
  const { limit = 50, offset = 0, type } = options || {};

  const whereClause = type
    ? and(
        eq(creditTransactions.customerId, customerId),
        eq(creditTransactions.type, type)
      )
    : eq(creditTransactions.customerId, customerId);

  const transactions = await db.query.creditTransactions.findMany({
    where: whereClause,
    orderBy: [desc(creditTransactions.createdAt)],
    limit,
    offset,
  });

  return transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    balance: Number(t.balance),
    metadata: t.metadata as CreditTransaction['metadata'],
    createdAt: new Date(t.createdAt),
    expiresAt: t.expiresAt ? new Date(t.expiresAt) : undefined,
  }));
}

/**
 * Get credit summary for a customer
 */
export async function getCreditSummary(
  customerId: string
): Promise<CreditSummary> {
  const customerCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  // Calculate expiring soon (within 30 days)
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

  const expiringTransactions = await db.query.creditTransactions.findMany({
    where: and(
      eq(creditTransactions.customerId, customerId),
      eq(creditTransactions.type, 'earned'),
      gte(creditTransactions.expiresAt, new Date()),
      sql`${creditTransactions.expiresAt} <= ${warningDate}`
    ),
  });

  const expiringSoon = expiringTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  // Get pending credits
  const pendingTransactions = await db.query.creditTransactions.findMany({
    where: and(
      eq(creditTransactions.customerId, customerId),
      eq(creditTransactions.type, 'earned'),
      sql`${creditTransactions.metadata}->>'status' = 'pending'`
    ),
  });

  const pendingCredits = pendingTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  return {
    totalEarned: customerCredit?.totalEarned || 0,
    totalUsed: customerCredit?.totalUsed || 0,
    totalExpired: 0, // Calculated separately if needed
    currentBalance: customerCredit?.balance || 0,
    pendingCredits,
    expiringSoon,
  };
}

// ============================================================================
// CREDIT EXPIRATION
// ============================================================================

/**
 * Process expired credits
 * Should be run by a scheduled job (e.g., daily)
 */
export async function processExpiredCredits(): Promise<{
  expired: number;
  totalAmount: number;
}> {
  const now = new Date();

  // Find all expired credits that haven't been marked as expired
  const expiredTransactions = await db.query.creditTransactions.findMany({
    where: and(
      eq(creditTransactions.type, 'earned'),
      sql`${creditTransactions.expiresAt} < ${now}`,
      sql`NOT EXISTS (
        SELECT 1 FROM ${creditTransactions} t2 
        WHERE t2.metadata->>'originalTransactionId' = ${creditTransactions.id}
        AND t2.type = 'expired'
      )`
    ),
  });

  let expired = 0;
  let totalAmount = 0;

  for (const transaction of expiredTransactions) {
    const customerCredit = await db.query.customerCredits.findFirst({
      where: eq(customerCredits.customerId, transaction.customerId),
    });

    if (!customerCredit) continue;

    const amount = Math.abs(transaction.amount);

    // Expire the REMAINING portion of the credit. Balances are fungible, so
    // we expire min(original amount, current balance): a partially used
    // credit still expires for whatever is left of it. (Previously a credit
    // only expired when the FULL original amount was still available, so
    // partially used credits never expired.)
    const amountToExpire = Math.min(amount, customerCredit.balance);

    if (amountToExpire > 0) {
      // Create expiration transaction
      await db.insert(creditTransactions).values({
        id: nanoid(),
        customerId: transaction.customerId,
        type: 'expired',
        amount: -amountToExpire,
        balance: customerCredit.balance - amountToExpire,
        description: amountToExpire < amount
          ? `Credit expired (remaining ${amountToExpire} of ${amount} cents, from transaction ${transaction.id})`
          : `Credit expired (from transaction ${transaction.id})`,
        metadata: {
          originalTransactionId: transaction.id,
          expiredAt: now.toISOString(),
        },
        createdAt: now,
      });

      // Update customer balance
      await db
        .update(customerCredits)
        .set({
          balance: sql`${customerCredits.balance} - ${amountToExpire}`,
          updatedAt: now,
        })
        .where(eq(customerCredits.customerId, transaction.customerId));

      expired++;
      totalAmount += amountToExpire;

      revalidateTag(`customer-credits-${transaction.customerId}`);
      revalidateTag(`credit-history-${transaction.customerId}`);
    } else {
      // Nothing left to expire (credit fully used) — still record the
      // expiration marker so this transaction is not rescanned on every run
      await db.insert(creditTransactions).values({
        id: nanoid(),
        customerId: transaction.customerId,
        type: 'expired',
        amount: 0,
        balance: customerCredit.balance,
        description: `Credit fully used before expiry (from transaction ${transaction.id})`,
        metadata: {
          originalTransactionId: transaction.id,
          expiredAt: now.toISOString(),
        },
        createdAt: now,
      });
    }
  }

  return { expired, totalAmount };
}

/**
 * Get credits expiring soon for a customer
 */
export async function getExpiringCredits(
  customerId: string,
  days: number = EXPIRY_WARNING_DAYS
): Promise<Array<{
  transactionId: string;
  amount: number;
  expiresAt: Date;
  daysRemaining: number;
}>> {
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + days);

  const transactions = await db.query.creditTransactions.findMany({
    where: and(
      eq(creditTransactions.customerId, customerId),
      eq(creditTransactions.type, 'earned'),
      gte(creditTransactions.expiresAt, new Date()),
      sql`${creditTransactions.expiresAt} <= ${warningDate}`
    ),
    orderBy: [creditTransactions.expiresAt],
  });

  const now = new Date();

  return transactions.map((t) => {
    const expiresAt = new Date(t.expiresAt!);
    const daysRemaining = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      transactionId: t.id,
      amount: Math.abs(t.amount),
      expiresAt,
      daysRemaining,
    };
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Transfer credits between customers (for special cases)
 */
export async function transferCredits(
  fromCustomerId: string,
  toCustomerId: string,
  amount: number,
  reason: string,
  adminId: string
): Promise<{
  success: boolean;
  fromBalance: number;
  toBalance: number;
}> {
  // Deduct from source
  const deductResult = await adjustCreditBalance(
    fromCustomerId,
    -amount,
    `Transfer to ${toCustomerId}: ${reason}`,
    adminId
  );

  // Add to destination
  const addResult = await adjustCreditBalance(
    toCustomerId,
    amount,
    `Transfer from ${fromCustomerId}: ${reason}`,
    adminId
  );

  return {
    success: true,
    fromBalance: deductResult.newBalance,
    toBalance: addResult.newBalance,
  };
}

/**
 * Get all customers with credit balances (admin)
 */
export async function getAllCreditBalances(
  options?: {
    minBalance?: number;
    hasExpiring?: boolean;
  }
): Promise<Array<{
  customerId: string;
  email: string;
  balance: number;
  totalEarned: number;
  totalUsed: number;
  lastActivity: Date;
}>> {
  let query = db.query.customerCredits.findMany;

  const results = await db.query.customerCredits.findMany({
    orderBy: [desc(customerCredits.balance)],
  });

  // Filter results
  let filtered = results;
  
  if (options?.minBalance !== undefined) {
    filtered = filtered.filter((r) => r.balance >= options.minBalance!);
  }

  return filtered.map((r) => ({
    customerId: r.customerId,
    email: '', // Would be joined from customers table
    balance: r.balance,
    totalEarned: r.totalEarned,
    totalUsed: r.totalUsed,
    lastActivity: new Date(r.updatedAt),
  }));
}
