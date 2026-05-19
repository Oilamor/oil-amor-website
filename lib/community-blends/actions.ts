/**
 * Community Blends Server Actions
 * 
 * Handles creating, sharing, rating, and purchasing community blends.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { 
  communityBlends, 
  blendRatings, 
  blendShares,
  userBlendStats,
  type CommunityBlend,
  type BlendRating,
} from '@/lib/db/schema/community-blends';
import { eq, and, desc, sql, count, avg } from 'drizzle-orm';
import { slugify as generateSlug } from '@/lib/utils';
import { logger } from '@/lib/logging/logger';

// ============================================================================
// CREATE BLEND
// ============================================================================

interface CreateBlendInput {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorBio?: string;
  name: string;
  description?: string;
  story?: string;
  recipe: CommunityBlend['recipe'];
  revelationData?: Record<string, unknown>;
  price: number; // in cents
}

export async function createCommunityBlend(input: CreateBlendInput): Promise<{ success: boolean; blendId?: string; error?: string }> {
  try {
    // Generate unique slug
    let slug = generateSlug(input.name);
    let existing = await db.query.communityBlends.findFirst({
      where: eq(communityBlends.slug, slug),
    });
    
    // Append random chars if slug exists
    let counter = 1;
    while (existing) {
      slug = `${generateSlug(input.name)}-${counter}`;
      existing = await db.query.communityBlends.findFirst({
        where: eq(communityBlends.slug, slug),
      });
      counter++;
    }

    const [blend] = await db.insert(communityBlends).values({
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      creatorAvatar: input.creatorAvatar,
      creatorBio: input.creatorBio,
      name: input.name,
      slug,
      description: input.description,
      story: input.story,
      recipe: input.recipe,
      revelationData: input.revelationData,
      price: input.price,
      status: 'draft',
      visibility: 'private',
    }).returning();

    // Update user stats
    await db.insert(userBlendStats).values({
      userId: input.creatorId,
      blendsCreated: 1,
    }).onConflictDoUpdate({
      target: userBlendStats.userId,
      set: {
        blendsCreated: sql`${userBlendStats.blendsCreated} + 1`,
        updatedAt: new Date(),
      },
    });

    revalidatePath('/community-blends');
    return { success: true, blendId: blend.id };
  } catch (error) {
    logger.error('Error creating community blend', error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: 'Failed to create blend' };
  }
}

// ============================================================================
// PUBLISH BLEND (After purchase + consent)
// ============================================================================

interface PublishBlendInput {
  blendId: string;
  creatorId: string;
  orderId: string;
  consentToShare: boolean;
}

export async function publishBlend(input: PublishBlendInput): Promise<{ success: boolean; slug?: string; error?: string }> {
  try {
    if (!input.consentToShare) {
      return { success: false, error: 'Consent required to publish blend' };
    }

    const [updated] = await db.update(communityBlends)
      .set({
        status: 'published',
        visibility: 'community',
        consentToShare: true,
        consentDate: new Date(),
        originalOrderId: input.orderId,
        purchaseVerifiedAt: new Date(),
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(communityBlends.id, input.blendId),
        eq(communityBlends.creatorId, input.creatorId) // Ensure ownership
      ))
      .returning();

    if (!updated) {
      return { success: false, error: 'Blend not found or not owned by you' };
    }

    // Update user stats
    await db.update(userBlendStats)
      .set({
        blendsPublished: sql`${userBlendStats.blendsPublished} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(userBlendStats.userId, updated.creatorId));

    revalidatePath('/community-blends');
    revalidatePath(`/community-blends/${updated.slug}`);
    return { success: true, slug: updated.slug };
  } catch (error) {
    logger.error('Error publishing blend', error instanceof Error ? error : new Error(String(error)), { blendId: input.blendId, orderId: input.orderId });
    return { success: false, error: 'Failed to publish blend' };
  }
}

// ============================================================================
// SHARE BLEND (Private sharing)
// ============================================================================

interface ShareBlendInput {
  blendId: string;
  sharedBy: string;
  platform?: string;
}

export async function createShareLink(input: ShareBlendInput): Promise<{ success: boolean; shareToken?: string; error?: string }> {
  try {
    const token = `shr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(blendShares).values({
      blendId: input.blendId,
      sharedBy: input.sharedBy,
      platform: input.platform || 'link',
      shareToken: token,
    });

    return { success: true, shareToken: token };
  } catch (error) {
    logger.error('Error creating share link', error instanceof Error ? error : new Error(String(error)), { blendId: input.blendId });
    return { success: false, error: 'Failed to create share link' };
  }
}

// ============================================================================
// RATE BLEND
// ============================================================================

interface RateBlendInput {
  blendId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  review?: string;
  orderId?: string; // To verify purchase
}

export async function rateBlend(input: RateBlendInput): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Check if user already rated this blend
    const existingRating = await db.query.blendRatings.findFirst({
      where: and(
        eq(blendRatings.blendId, input.blendId),
        eq(blendRatings.userId, input.userId)
      ),
    });

    const verifiedPurchase = !!input.orderId;

    if (existingRating) {
      // Update existing rating
      await db.update(blendRatings)
        .set({
          rating: input.rating,
          review: input.review,
          verifiedPurchase,
          orderId: input.orderId,
          updatedAt: new Date(),
        })
        .where(eq(blendRatings.id, existingRating.id));
    } else {
      // Create new rating
      await db.insert(blendRatings).values({
        blendId: input.blendId,
        userId: input.userId,
        userName: input.userName,
        userAvatar: input.userAvatar,
        rating: input.rating,
        review: input.review,
        verifiedPurchase,
        orderId: input.orderId,
      });
    }

    // Recalculate blend's average rating
    const ratings = await db.select({
      sum: sql<number>`sum(${blendRatings.rating})`,
      count: count(),
    })
    .from(blendRatings)
    .where(eq(blendRatings.blendId, input.blendId));

    const sum = ratings[0]?.sum || 0;
    const count_val = ratings[0]?.count || 0;

    await db.update(communityBlends)
      .set({
        ratingSum: sum,
        ratingCount: count_val,
        updatedAt: new Date(),
      })
      .where(eq(communityBlends.id, input.blendId));

    revalidatePath(`/community-blends`);
    return { success: true };
  } catch (error) {
    logger.error('Error rating blend', error instanceof Error ? error : new Error(String(error)), { blendId: input.blendId });
    return { success: false, error: 'Failed to submit rating' };
  }
}

// ============================================================================
// RECORD PURCHASE (When someone buys a community blend)
// ============================================================================

export async function recordBlendPurchase(
  blendId: string,
  orderId: string,
  purchaserId: string,
  saleAmount: number // in cents
): Promise<{ success: boolean; commissionAmount?: number; error?: string }> {
  try {
    // Import commission function
    const { awardBlendCommission } = await import('./commissions');
    
    // Award commission to creator (this also updates purchase counts)
    const result = await awardBlendCommission(blendId, orderId, purchaserId, saleAmount);
    
    if (!result.success) {
      logger.error('Failed to award commission', new Error(result.error), { blendId, orderId });
      // Still return success since the purchase was recorded, just commission failed
    }

    return {
      success: true,
      commissionAmount: result.commissionAmount,
    };
  } catch (error) {
    logger.error('Error recording blend purchase', error instanceof Error ? error : new Error(String(error)), { blendId, orderId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record purchase',
    };
  }
}

// ============================================================================
// INCREMENT VIEW
// ============================================================================

export async function incrementBlendView(blendId: string): Promise<void> {
  try {
    await db.update(communityBlends)
      .set({
        viewCount: sql`${communityBlends.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(communityBlends.id, blendId));
  } catch (error) {
    logger.error('Error incrementing view', error instanceof Error ? error : new Error(String(error)), { blendId });
  }
}
