/**
 * Order Revocations
 *
 * Reversal helpers for side effects created when an order completed.
 * Used by refund/cancellation flows to undo grants made at purchase time.
 */

import { db } from '@/lib/db';
import { unlockedOils } from '@/lib/db/schema-refill';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

/**
 * Revoke all oil unlocks granted by an order.
 * Deletes unlocked_oils rows where unlockedBy = orderId.
 * Idempotent — deleting zero rows is a successful no-op.
 */
export async function revokeOrderUnlocks(orderId: string): Promise<void> {
  await db.delete(unlockedOils).where(eq(unlockedOils.unlockedBy, orderId));
  logger.info('Revoked oil unlocks for order', { orderId });
}
