/**
 * Blend Purchase Verification
 *
 * Shared server-side verification for community-blend purchase claims.
 * The order record is the source of truth: the purchaser must own the order,
 * the order must be paid, and it must actually contain the blend. The sale
 * amount is always derived from the order line items — never from the client.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema-refill';
import { eq } from 'drizzle-orm';

export type BlendPurchaseVerification =
  | { saleAmount: number }
  | { error: NextResponse };

export async function verifyBlendPurchase(
  blendId: string,
  orderId: string,
  purchaserId: string
): Promise<BlendPurchaseVerification> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return {
      error: NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      ),
    };
  }

  // The order must belong to the authenticated purchaser
  if (order.customerId !== purchaserId) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      ),
    };
  }

  // Commission is only due on paid orders
  if (order.payment?.status !== 'captured') {
    return {
      error: NextResponse.json(
        { error: 'Order is not paid' },
        { status: 400 }
      ),
    };
  }

  // The order must actually contain the blend
  const blendItems = (order.items || []).filter((item) => item.blendId === blendId);
  if (blendItems.length === 0) {
    return {
      error: NextResponse.json(
        { error: 'Order does not contain this blend' },
        { status: 400 }
      ),
    };
  }

  // Derive the sale amount from the order line items (cents)
  const saleAmount = blendItems.reduce((sum, item) => sum + item.total, 0);
  if (saleAmount <= 0) {
    return {
      error: NextResponse.json(
        { error: 'Invalid sale amount' },
        { status: 400 }
      ),
    };
  }

  return { saleAmount };
}
