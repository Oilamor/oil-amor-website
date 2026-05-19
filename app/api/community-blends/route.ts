/**
 * Community Blends API
 * 
 * GET /api/community-blends - List community blends
 * POST /api/community-blends/purchase - Purchase a community blend (awards commission)
 * GET /api/community-blends/earnings - Get creator earnings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCommunityBlends } from '@/lib/community-blends/data';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic'
import { recordBlendPurchase } from '@/lib/community-blends/actions';
import { getCreatorEarnings, getCreatorCommissionHistory } from '@/lib/community-blends/commissions';

// ============================================================================
// GET /api/community-blends - List blends
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = (searchParams.get('sort') as 'popular' | 'newest' | 'rated' | 'purchased') || 'popular';
    const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 100);
    const earnings = searchParams.get('earnings');
    const creatorId = searchParams.get('creatorId');

    // Return creator earnings if requested
    if (earnings === 'true' && creatorId) {
      const [earnings, history] = await Promise.all([
        getCreatorEarnings(creatorId),
        getCreatorCommissionHistory(creatorId, { limit: 20 }),
      ]);

      return NextResponse.json({
        earnings,
        history,
      });
    }

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
// POST /api/community-blends/purchase - Purchase a blend
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blendId, orderId, purchaserId, saleAmount } = body;

    // Validate required fields
    if (!blendId || !orderId || !purchaserId || !saleAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: blendId, orderId, purchaserId, saleAmount' },
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
