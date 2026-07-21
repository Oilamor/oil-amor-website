/**
 * Community Blends API
 *
 * GET /api/community-blends - List community blends
 * POST /api/community-blends - Record a blend purchase (awards commission)
 *
 * Creator earnings are served by GET /api/community-blends/earnings,
 * which enforces its own authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCommunityBlends } from '@/lib/community-blends/data';
import { recordBlendPurchase } from '@/lib/community-blends/actions';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logging/logger';
import { verifyBlendPurchase } from './verify-purchase';

export const dynamic = 'force-dynamic'

// ============================================================================
// GET /api/community-blends - List blends
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = (searchParams.get('sort') as 'popular' | 'newest' | 'rated' | 'purchased') || 'popular';
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);

    // Return community blends — filter out demo data so fake blends never appear on the site
    const blends = await getCommunityBlends(sortBy, limit);
    const realBlends = (blends || []).filter((b) => !b.id.startsWith('demo-'));
    return NextResponse.json({ blends: realBlends });
  } catch (error) {
    logger.error('Error fetching community blends:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch blends' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/community-blends - Record a blend purchase
// ============================================================================

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
        { error: 'Missing required fields: blendId, orderId' },
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
      message: 'Purchase recorded and commission awarded',
      commissionAmount: result.commissionAmount,
    });
  } catch (error) {
    logger.error('Error processing blend purchase:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}
