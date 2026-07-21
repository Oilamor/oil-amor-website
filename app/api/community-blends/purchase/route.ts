/**
 * POST /api/community-blends/purchase
 *
 * Records a purchase of a community blend and awards 10% commission to the creator.
 * Requires an authenticated customer session; the purchaser and sale amount are
 * derived server-side from the order record, never from the request body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordBlendPurchase } from '@/lib/community-blends/actions';
import { CREATOR_COMMISSION_RATE } from '@/lib/community-blends/commissions-types';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logging/logger';
import { verifyBlendPurchase } from '../verify-purchase';

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated customer session — the purchaser is always
    // derived from the session, never from the request body
    const session = await getSession();
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { blendId, orderId } = body;

    // Validate required fields
    if (!blendId || !orderId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['blendId', 'orderId'],
          received: { blendId: !!blendId, orderId: !!orderId }
        },
        { status: 400 }
      );
    }

    // Verify the order exists, is paid, belongs to the purchaser and actually
    // contains the blend; the sale amount is derived server-side from the order
    const verification = await verifyBlendPurchase(blendId, orderId, session.customerId);
    if ('error' in verification) {
      return verification.error;
    }

    // Record the purchase and award commission (idempotent on orderId + blendId)
    const result = await recordBlendPurchase(blendId, orderId, session.customerId, verification.saleAmount);

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
      commissionRate: CREATOR_COMMISSION_RATE, // 10%
    });
  } catch (error) {
    logger.error('Error processing blend purchase:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
