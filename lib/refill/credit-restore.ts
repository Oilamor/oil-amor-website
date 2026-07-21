/**
 * Credit & Bottle Restoration
 *
 * Reversal helpers used by refund/cancellation flows to restore state that
 * was mutated during order completion:
 * - restoreCustomerCredits: credit an amount back to the Postgres
 *   customer_credits balance (integer cents) with a transaction record.
 * - restoreRefillCredit: same, semantically scoped to refill credits.
 * - releaseBottleLock: return an in-transit/locked Forever Bottle to its
 *   prior usable state per the bottle state machine.
 *
 * All restore operations are idempotent by (customerId, reason) via the
 * credit_transactions metadata->>'restoreReason' key, and releaseBottleLock
 * is a no-op unless the bottle is currently locked ('in-transit').
 *
 * UNITS: all amounts are integer cents (see lib/refill/credits.ts).
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import {
  creditTransactions,
  customerCredits,
  foreverBottles,
  foreverBottleHistory,
  type InsertCreditTransaction,
} from '@/lib/db/schema-refill';
import { eq, and, sql, desc } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logging/logger';
import {
  getForeverBottleById,
  type BottleStatus,
} from './forever-bottle';

// ============================================================================
// CREDIT RESTORATION
// ============================================================================

/**
 * Credit amountCents back to the customer's store credit balance.
 * Idempotent by (customerId, reason): a second call with the same reason
 * is a no-op.
 */
async function restoreCredit(
  customerId: string,
  amountCents: number,
  reason: string,
  description: string
): Promise<void> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`Restore amount must be a positive integer (cents), got: ${amountCents}`);
  }

  // Idempotency check — schema supports this via the metadata jsonb column
  const existing = await db.query.creditTransactions.findFirst({
    where: and(
      eq(creditTransactions.customerId, customerId),
      eq(creditTransactions.type, 'earned'),
      sql`${creditTransactions.metadata}->>'restoreReason' = ${reason}`
    ),
  });

  if (existing) {
    logger.info('Credit restore already applied, skipping', { customerId, reason });
    return;
  }

  const now = new Date();

  const customerCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, customerId),
  });

  if (!customerCredit) {
    await db.insert(customerCredits).values({
      id: nanoid(),
      customerId,
      balance: amountCents,
      totalEarned: amountCents,
      totalUsed: 0,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(customerCredits)
      .set({
        balance: sql`${customerCredits.balance} + ${amountCents}`,
        totalEarned: sql`${customerCredits.totalEarned} + ${amountCents}`,
        updatedAt: now,
      })
      .where(eq(customerCredits.customerId, customerId));
  }

  const transaction: InsertCreditTransaction = {
    id: nanoid(),
    customerId,
    type: 'earned',
    amount: amountCents,
    balance: (customerCredit?.balance || 0) + amountCents,
    description,
    metadata: {
      reason,
      restoreReason: reason,
      restoredAt: now.toISOString(),
    } as InsertCreditTransaction['metadata'],
    createdAt: now,
    expiresAt: null,
  };

  await db.insert(creditTransactions).values(transaction);

  revalidateTag(`customer-credits-${customerId}`);
  revalidateTag(`credit-history-${customerId}`);
}

/**
 * Restore store credit to a customer (e.g. order refunded after credit was
 * spent, or goodwill credit). Amount in integer cents.
 */
export async function restoreCustomerCredits(
  customerId: string,
  amountCents: number,
  reason: string
): Promise<void> {
  await restoreCredit(
    customerId,
    amountCents,
    reason,
    `Credit restored: ${reason}`
  );
}

/**
 * Restore a refill (bottle return) credit to a customer, e.g. when a refund
 * is issued for a refill order that had credit applied.
 * Amount in integer cents (REFILL_CREDIT_AMOUNT = 500).
 */
export async function restoreRefillCredit(
  customerId: string,
  amountCents: number,
  reason: string
): Promise<void> {
  await restoreCredit(
    customerId,
    amountCents,
    reason,
    `Refill credit restored: ${reason}`
  );
}

// ============================================================================
// BOTTLE LOCK RELEASE
// ============================================================================

/**
 * Release a locked Forever Bottle back to its prior usable state.
 *
 * Bottles are locked ('in-transit') when a return label is generated. If the
 * associated refill order is cancelled/refunded, the bottle must be returned
 * to the state it had before the label was created (derived from bottle
 * history when available, otherwise from the current fill level).
 *
 * Idempotent: a no-op unless the bottle is currently 'in-transit'.
 * Retired bottles are never resurrected.
 */
export async function releaseBottleLock(
  bottleId: string,
  reason: string
): Promise<void> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  // Idempotent — only locked bottles need releasing
  if (bottle.status !== 'in-transit') {
    logger.info('Bottle is not locked, skipping release', { bottleId, status: bottle.status });
    return;
  }

  // Try to recover the status the bottle had before it was locked
  const history = await db.query.foreverBottleHistory.findMany({
    where: eq(foreverBottleHistory.bottleId, bottleId),
    orderBy: [desc(foreverBottleHistory.timestamp)],
  });

  const lockEvent = history.find((e) => e.eventType === 'return-shipped');
  const previousStatus = (lockEvent?.metadata as { previousStatus?: BottleStatus } | null)?.previousStatus;

  const restoredStatus: BottleStatus =
    previousStatus === 'active' || previousStatus === 'empty' || previousStatus === 'refilled'
      ? previousStatus
      : bottle.currentFillLevel > 0
        ? 'active'
        : 'empty';

  const now = new Date();

  await db
    .update(foreverBottles)
    .set({
      status: restoredStatus,
      returnLabel: null,
      updatedAt: now,
    })
    .where(eq(foreverBottles.id, bottleId));

  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId,
    eventType: 'lock-released',
    timestamp: now,
    metadata: {
      reason,
      previousStatus: 'in-transit',
      restoredStatus,
    },
  });

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`bottle-${bottleId}`);
}
