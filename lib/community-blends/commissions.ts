/**
 * Blend Creator Commission System
 * 
 * Awards 10% commission to blend creators when their community blends are purchased.
 * Commissions are added to the creator's store credit balance.
 */

'use server';

import { db } from '@/lib/db';
import {
  blendCommissions,
  communityBlends,
  userBlendStats,
  type InsertBlendCommission,
} from '@/lib/db/schema/community-blends';
import {
  customerCredits,
  creditTransactions,
  type InsertCreditTransaction,
} from '@/lib/db/schema-refill';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidateTag } from 'next/cache';
import { CREATOR_COMMISSION_RATE, type CommissionResult, type CreatorEarnings } from './commissions-types';

// ============================================================================
// AWARD COMMISSION
// ============================================================================

/**
 * Award commission to blend creator when their blend is purchased
 * This is called during the order completion process
 */
export async function awardBlendCommission(
  blendId: string,
  orderId: string,
  purchaserId: string,
  saleAmount: number // in cents
): Promise<CommissionResult> {
  try {
    // Idempotency check
    const existing = await db.query.blendCommissions.findFirst({
      where: and(eq(blendCommissions.orderId, orderId), eq(blendCommissions.blendId, blendId)),
    });
    if (existing) {
      return { success: true, commissionAmount: existing.commissionAmount, alreadyExists: true };
    }

    // Get blend details
    const blend = await db.query.communityBlends.findFirst({
      where: eq(communityBlends.id, blendId),
    });

    if (!blend) {
      return { success: false, commissionAmount: 0, error: 'Blend not found' };
    }

    // Only award commission for published community blends
    if (blend.status !== 'published' || blend.visibility !== 'community') {
      return { success: false, commissionAmount: 0, error: 'Blend is not published' };
    }

    const creatorId = blend.creatorId;
    const commissionAmount = Math.round((saleAmount * CREATOR_COMMISSION_RATE) / 100);

    // Create commission record
    const commissionRecord: InsertBlendCommission = {
      id: nanoid(),
      blendId,
      creatorId,
      orderId,
      purchaserId,
      saleAmount,
      commissionRate: CREATOR_COMMISSION_RATE,
      commissionAmount,
      status: 'purchased',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(blendCommissions).values(commissionRecord);

    // Update blend purchase count
    await db.update(communityBlends)
      .set({
        purchaseCount: sql`${communityBlends.purchaseCount} + 1`,
        popularityScore: sql`${communityBlends.popularityScore} + 10`,
        updatedAt: new Date(),
      })
      .where(eq(communityBlends.id, blendId));

    // Update creator stats
    await db.insert(userBlendStats).values({
      userId: creatorId,
      totalPurchasesOfBlends: 1,
      totalCommissionEarned: commissionAmount,
      pendingCommission: commissionAmount,
    }).onConflictDoUpdate({
      target: userBlendStats.userId,
      set: {
        totalPurchasesOfBlends: sql`${userBlendStats.totalPurchasesOfBlends} + 1`,
        totalCommissionEarned: sql`${userBlendStats.totalCommissionEarned} + ${commissionAmount}`,
        pendingCommission: sql`${userBlendStats.pendingCommission} + ${commissionAmount}`,
        updatedAt: new Date(),
      },
    });

    // Add commission to creator's store credit
    await addCommissionToStoreCredit(creatorId, commissionAmount, blendId, orderId);

    // Revalidate caches
    revalidateTag(`creator-earnings-${creatorId}`);
    revalidateTag(`community-blends`);

    return {
      success: true,
      commissionId: commissionRecord.id,
      commissionAmount,
      creatorId,
    };
  } catch (error) {
    console.error('Error awarding blend commission:', error);
    return {
      success: false,
      commissionAmount: 0,
      error: error instanceof Error ? error.message : 'Failed to award commission',
    };
  }
}

/**
 * Add commission amount to creator's store credit balance
 */
async function addCommissionToStoreCredit(
  creatorId: string,
  amount: number,
  blendId: string,
  orderId: string
): Promise<void> {
  const now = new Date();
  
  // Get or create customer credit record
  let customerCredit = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, creatorId),
  });

  if (!customerCredit) {
    // Create new customer credit record
    await db.insert(customerCredits).values({
      id: nanoid(),
      customerId: creatorId,
      balance: amount,
      totalEarned: amount,
      totalUsed: 0,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Update existing balance
    await db
      .update(customerCredits)
      .set({
        balance: sql`${customerCredits.balance} + ${amount}`,
        totalEarned: sql`${customerCredits.totalEarned} + ${amount}`,
        updatedAt: now,
      })
      .where(eq(customerCredits.customerId, creatorId));
  }

  // Create transaction record
  const transaction: InsertCreditTransaction = {
    id: nanoid(),
    customerId: creatorId,
    type: 'earned',
    amount,
    balance: (customerCredit?.balance || 0) + amount,
    description: `Commission from community blend sale`,
    metadata: {
      blendId,
      orderId,
      commissionRate: CREATOR_COMMISSION_RATE,
      reason: 'Creator commission from community blend purchase',
    },
    createdAt: now,
    expiresAt: null, // Commission credits don't expire
  };

  await db.insert(creditTransactions).values(transaction);

  // Revalidate caches
  revalidateTag(`customer-credits-${creatorId}`);
  revalidateTag(`credit-history-${creatorId}`);
}

// ============================================================================
// GET CREATOR EARNINGS
// ============================================================================

/**
 * Get total earnings for a blend creator
 */
export async function getCreatorEarnings(creatorId: string): Promise<CreatorEarnings> {
  try {
    // Get from user stats
    const stats = await db.query.userBlendStats.findFirst({
      where: eq(userBlendStats.userId, creatorId),
    });

    // Get blend count
    const blendCount = await db.query.communityBlends.findMany({
      where: and(
        eq(communityBlends.creatorId, creatorId),
        eq(communityBlends.status, 'published')
      ),
    });

    return {
      totalEarned: stats?.totalCommissionEarned || 0,
      pendingAmount: stats?.pendingCommission || 0,
      totalSales: stats?.totalPurchasesOfBlends || 0,
      blendCount: blendCount.length,
    };
  } catch (error) {
    console.error('Error fetching creator earnings:', error);
    return {
      totalEarned: 0,
      pendingAmount: 0,
      totalSales: 0,
      blendCount: 0,
    };
  }
}

/**
 * Get commission history for a creator
 */
export async function getCreatorCommissionHistory(
  creatorId: string,
  options?: { limit?: number; offset?: number }
): Promise<Array<{
  id: string;
  blendName: string;
  saleAmount: number;
  commissionAmount: number;
  createdAt: Date;
}>> {
  const { limit = 50, offset = 0 } = options || {};

  try {
    const commissions = await db.query.blendCommissions.findMany({
      where: eq(blendCommissions.creatorId, creatorId),
      orderBy: [sql`${blendCommissions.createdAt} DESC`],
      limit,
      offset,
    });

    // Get blend names
    const blendIds = commissions.map(c => c.blendId);
    const blends = await db.query.communityBlends.findMany({
      where: sql`${communityBlends.id} IN (${blendIds.join(',')})`,
    });

    const blendMap = new Map(blends.map(b => [b.id, b.name]));

    return commissions.map(c => ({
      id: c.id,
      blendName: blendMap.get(c.blendId) || 'Unknown Blend',
      saleAmount: c.saleAmount,
      commissionAmount: c.commissionAmount,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching commission history:', error);
    return [];
  }
}

// ============================================================================
// PROCESS REFUND
// ============================================================================

/**
 * Reverse commission when a blend purchase is refunded
 */
export async function reverseBlendCommission(
  orderId: string,
  blendId: string
): Promise<{ success: boolean; reversedAmount?: number; error?: string }> {
  try {
    // Find the commission record
    const commission = await db.query.blendCommissions.findFirst({
      where: and(
        eq(blendCommissions.orderId, orderId),
        eq(blendCommissions.blendId, blendId)
      ),
    });

    if (!commission) {
      return { success: false, error: 'Commission record not found' };
    }

    if (commission.status === 'refunded') {
      return { success: false, error: 'Commission already reversed' };
    }

    // Update commission status
    await db.update(blendCommissions)
      .set({
        status: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(blendCommissions.id, commission.id));

    // Deduct from creator's store credit
    const customerCredit = await db.query.customerCredits.findFirst({
      where: eq(customerCredits.customerId, commission.creatorId),
    });

    if (customerCredit && customerCredit.balance >= commission.commissionAmount) {
      const newBalance = customerCredit.balance - commission.commissionAmount;

      await db.update(customerCredits)
        .set({
          balance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(customerCredits.customerId, commission.creatorId));

      // Create reversal transaction
      const transaction: InsertCreditTransaction = {
        id: nanoid(),
        customerId: commission.creatorId,
        type: 'adjusted',
        amount: -commission.commissionAmount,
        balance: newBalance,
        description: 'Commission reversed due to refund',
        metadata: {
          orderId,
          blendId,
          originalCommissionId: commission.id,
          reason: 'Purchase refunded',
        },
        createdAt: new Date(),
      };

      await db.insert(creditTransactions).values(transaction);
    }

    // Update creator stats
    await db.update(userBlendStats)
      .set({
        totalCommissionEarned: sql`${userBlendStats.totalCommissionEarned} - ${commission.commissionAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(userBlendStats.userId, commission.creatorId));

    // Update blend stats
    await db.update(communityBlends)
      .set({
        purchaseCount: sql`GREATEST(${communityBlends.purchaseCount} - 1, 0)`,
        popularityScore: sql`GREATEST(${communityBlends.popularityScore} - 10, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(communityBlends.id, blendId));

    // Revalidate caches
    revalidateTag(`creator-earnings-${commission.creatorId}`);
    revalidateTag(`customer-credits-${commission.creatorId}`);

    return {
      success: true,
      reversedAmount: commission.commissionAmount,
    };
  } catch (error) {
    console.error('Error reversing blend commission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reverse commission',
    };
  }
}
