/**
 * POST /api/community-blends/purchase
 * 
 * Records a purchase of a community blend and awards 5% commission to the creator.
 * This should be called during order completion when a community blend is purchased.
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordBlendPurchase } from '@/lib/community-blends/actions';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema-refill';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blendId, orderId, purchaserId, saleAmount } = body;

    // Validate required fields
    if (!blendId || !orderId || !purchaserId || saleAmount === undefined) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['blendId', 'orderId', 'purchaserId', 'saleAmount'],
          received: { blendId: !!blendId, orderId: !!orderId, purchaserId: !!purchaserId, saleAmount: saleAmount !== undefined }
        },
        { status: 400 }
      );
    }

    // Validate sale amount is positive
    if (saleAmount <= 0) {
      return NextResponse.json(
        { error: 'Sale amount must be greater than 0' },
        { status: 400 }
      );
    }

    // SECURITY: Verify saleAmount matches the actual order total
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    if (order.total !== saleAmount) {
      return NextResponse.json(
        { error: 'Sale amount does not match order total' },
        { status: 400 }
      );
    }

    // Record the purchase and award commission
    const result = await recordBlendPurchase(blendId, orderId, purchaserId, saleAmount);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to record purchase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase recorded and commission awarded to creator',
      commissionAmount: result.commissionAmount,
      commissionRate: 5, // 5%
    });
  } catch (error) {
    console.error('Error processing blend purchase:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
