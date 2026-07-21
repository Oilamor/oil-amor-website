/**
 * Community Blends Queries
 * 
 * Fetch blends for display on the community page.
 *
 * MODERATION (2026-07-21): public queries (listCommunityBlends,
 * getFeaturedBlends, getBlendBySlug) only return blends with
 * moderation_status='approved' — 'flagged' blends await admin review and
 * 'hidden' blends were removed by an admin. Owners still see their own
 * flagged/hidden blends through getUserBlends (their private library view),
 * and id-based lookups (getBlendById, getBlendStats) stay unfiltered for
 * internal/admin use.
 */

import { db } from '@/lib/db';
import { 
  communityBlends, 
  blendRatings,
  type CommunityBlend,
  type BlendRating,
} from '@/lib/db/schema/community-blends';
import { orders } from '@/lib/db/schema-refill';
import { eq, and, desc, sql, count, gte } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface BlendWithRating extends CommunityBlend {
  averageRating: number;
  ratingCount: number;
}

export interface BlendDetail extends BlendWithRating {
  ratings: BlendRating[];
}

// ============================================================================
// LIST BLENDS
// ============================================================================

interface ListBlendsOptions {
  sortBy?: 'popular' | 'newest' | 'rated' | 'purchased';
  limit?: number;
  offset?: number;
  creatorId?: string; // Filter by specific creator
}

export async function listCommunityBlends(options: ListBlendsOptions = {}): Promise<BlendWithRating[]> {
  const { sortBy = 'popular', limit = 20, offset = 0, creatorId } = options;

  let query = db.select().from(communityBlends)
    .where(and(
      eq(communityBlends.status, 'published'),
      eq(communityBlends.visibility, 'community'),
      eq(communityBlends.moderationStatus, 'approved')
    ));

  if (creatorId) {
    query = db.select().from(communityBlends)
      .where(and(
        eq(communityBlends.status, 'published'),
        eq(communityBlends.visibility, 'community'),
        eq(communityBlends.moderationStatus, 'approved'),
        eq(communityBlends.creatorId, creatorId)
      ));
  }

  // Determine sort column
  const orderByColumn = 
    sortBy === 'newest' ? communityBlends.publishedAt :
    sortBy === 'rated' ? communityBlends.ratingSum :
    sortBy === 'purchased' ? communityBlends.purchaseCount :
    communityBlends.popularityScore;

  const blends = await query
    .orderBy(desc(orderByColumn))
    .limit(limit)
    .offset(offset);

  // Calculate average ratings
  return blends.map(blend => ({
    ...blend,
    averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
    ratingCount: blend.ratingCount,
  }));
}

// ============================================================================
// GET SINGLE BLEND
// ============================================================================

export async function getBlendBySlug(slug: string): Promise<BlendDetail | null> {
  // Public detail view: flagged/hidden blends resolve as not found (owners
  // can still see their own via getUserBlends; admins via the moderation API)
  const blend = await db.query.communityBlends.findFirst({
    where: and(
      eq(communityBlends.slug, slug),
      eq(communityBlends.moderationStatus, 'approved')
    ),
    with: {
      ratings: {
        orderBy: [desc(blendRatings.createdAt)],
        limit: 10,
      },
    },
  });

  if (!blend) return null;

  return {
    ...blend,
    averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
    ratingCount: blend.ratingCount,
    ratings: blend.ratings || [],
  };
}

export async function getBlendById(id: string): Promise<BlendWithRating | null> {
  const blend = await db.query.communityBlends.findFirst({
    where: eq(communityBlends.id, id),
  });

  if (!blend) return null;

  return {
    ...blend,
    averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
    ratingCount: blend.ratingCount,
  };
}

// ============================================================================
// GET USER'S BLENDS
// ============================================================================

export async function getUserBlends(userId: string): Promise<BlendWithRating[]> {
  const blends = await db.select().from(communityBlends)
    .where(eq(communityBlends.creatorId, userId))
    .orderBy(desc(communityBlends.createdAt));

  return blends.map(blend => ({
    ...blend,
    averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
    ratingCount: blend.ratingCount,
  }));
}

// ============================================================================
// GET FEATURED BLENDS (For homepage)
// ============================================================================

export async function getFeaturedBlends(limit: number = 4): Promise<BlendWithRating[]> {
  const blends = await db.select().from(communityBlends)
    .where(and(
      eq(communityBlends.status, 'published'),
      eq(communityBlends.visibility, 'community'),
      eq(communityBlends.moderationStatus, 'approved'),
      gte(communityBlends.ratingCount, 3) // At least 3 ratings
    ))
    .orderBy(desc(communityBlends.popularityScore))
    .limit(limit);

  return blends.map(blend => ({
    ...blend,
    averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
    ratingCount: blend.ratingCount,
  }));
}

// ============================================================================
// GET BLEND STATS
// ============================================================================

export async function getBlendStats(blendId: string) {
  const blend = await db.query.communityBlends.findFirst({
    where: eq(communityBlends.id, blendId),
  });

  if (!blend) return null;

  const ratings = await db.select().from(blendRatings)
    .where(eq(blendRatings.blendId, blendId))
    .orderBy(desc(blendRatings.createdAt));

  // Calculate rating distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as keyof typeof distribution]++;
    }
  });

  return {
    viewCount: blend.viewCount,
    purchaseCount: blend.purchaseCount,
    averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
    ratingCount: blend.ratingCount,
    distribution,
    recentRatings: ratings.slice(0, 5),
  };
}

// ============================================================================
// CHECK IF USER HAS PURCHASED (For rating verification)
// ============================================================================

/**
 * Check whether a user has a paid order containing the given blend.
 * Used to gate the "verified purchase" badge on ratings.
 *
 * An order qualifies when ALL of the following hold:
 * - it belongs to the user (orders.customer_id = userId)
 * - one of its line items references the blend (items[].blendId)
 * - it was actually paid (payment.status = 'captured') and not refunded
 *
 * When orderId is supplied, the check is restricted to that specific order —
 * a client-claimed orderId only verifies if it is genuinely the user's own
 * paid order for this blend.
 */
export async function hasUserPurchasedBlend(
  userId: string,
  blendId: string,
  orderId?: string
): Promise<boolean> {
  try {
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.customerId, userId),
        ...(orderId ? [eq(orders.id, orderId)] : []),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${orders.items}) AS item
          WHERE item->>'blendId' = ${blendId}
        )`,
        sql`${orders.payment}->>'status' = 'captured'`,
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`
      ),
    });

    return !!order;
  } catch (error) {
    // Verification failures must never mark a rating as verified
    return false;
  }
}

// ============================================================================
// GET USER'S RATING FOR A BLEND
// ============================================================================

export async function getUserRating(userId: string, blendId: string): Promise<BlendRating | null> {
  const result = await db.query.blendRatings.findFirst({
    where: and(
      eq(blendRatings.userId, userId),
      eq(blendRatings.blendId, blendId)
    ),
  });
  return result ?? null;
}
