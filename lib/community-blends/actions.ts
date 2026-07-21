/**
 * Community Blends Server Actions
 * 
 * Handles creating, sharing, rating, and purchasing community blends.
 *
 * SECURITY: identity is ALWAYS derived from the iron-session
 * (lib/auth/session). Client-passed creatorId/userId fields are ignored —
 * they remain on the input types only for backward compatibility with
 * existing callers.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { 
  communityBlends, 
  blendRatings, 
  blendShares,
  type CommunityBlend,
} from '@/lib/db/schema/community-blends';
import { eq, and, sql, count } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';
import { insertCommunityBlend, publishBlendRecord } from './blend-store';
import { sanitizeBlendText, flagBlendContent } from './moderation';
import { hasUserPurchasedBlend } from './queries';

// ============================================================================
// SESSION IDENTITY
// ============================================================================

/**
 * Resolve the authenticated customer's identity from the iron-session.
 * Returns null when there is no valid logged-in session.
 */
async function getSessionIdentity(): Promise<{ customerId: string; displayName: string } | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.customerId) {
    return null;
  }
  const displayName = [session.firstName, session.lastName].filter(Boolean).join(' ').trim();
  return {
    customerId: session.customerId,
    displayName: displayName || 'Anonymous Alchemist',
  };
}

// ============================================================================
// CREATE BLEND
// ============================================================================

interface CreateBlendInput {
  /** @deprecated Ignored — identity is derived from the session */
  creatorId?: string;
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
    const identity = await getSessionIdentity();
    if (!identity) {
      return { success: false, error: 'Authentication required' };
    }

    const { blendId } = await insertCommunityBlend({
      creatorId: identity.customerId,
      creatorName: input.creatorName || identity.displayName,
      creatorAvatar: input.creatorAvatar,
      creatorBio: input.creatorBio,
      name: input.name,
      description: input.description,
      story: input.story,
      recipe: input.recipe,
      revelationData: input.revelationData,
      price: input.price,
      status: 'draft',
      visibility: 'private',
    });

    revalidatePath('/community-blends');
    return { success: true, blendId };
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
  /** @deprecated Ignored — identity is derived from the session */
  creatorId?: string;
  orderId: string;
  consentToShare: boolean;
}

export async function publishBlend(input: PublishBlendInput): Promise<{ success: boolean; slug?: string; error?: string; contentFlags?: string[] }> {
  try {
    if (!input.consentToShare) {
      return { success: false, error: 'Consent required to publish blend' };
    }

    const identity = await getSessionIdentity();
    if (!identity) {
      return { success: false, error: 'Authentication required' };
    }

    // Fetch current text so it can be sanitized at publish time
    const existing = await db.query.communityBlends.findFirst({
      where: eq(communityBlends.id, input.blendId),
    });

    if (!existing) {
      return { success: false, error: 'Blend not found or not owned by you' };
    }

    // Publish hygiene: strip HTML from user supplied text
    const name = sanitizeBlendText(existing.name);
    const description = existing.description ? sanitizeBlendText(existing.description) : undefined;
    const story = existing.story ? sanitizeBlendText(existing.story) : undefined;

    // Minimal profanity/PII check — flags for review, never crashes.
    // Flagged content publishes with moderation_status='flagged', which
    // hides it from public community queries until an admin approves it.
    const contentFlags = flagBlendContent([name, description, story].filter(Boolean).join('\n'));
    if (contentFlags.length > 0) {
      logger.warn('Community blend content flagged at publish', {
        blendId: input.blendId,
        flags: contentFlags,
      });
    }

    const updated = await publishBlendRecord({
      blendId: input.blendId,
      creatorId: identity.customerId, // Ownership enforced in the UPDATE
      orderId: input.orderId,
      name,
      description,
      story,
      moderationStatus: contentFlags.length > 0 ? 'flagged' : 'approved',
    });

    if (!updated) {
      return { success: false, error: 'Blend not found or not owned by you' };
    }

    revalidatePath('/community-blends');
    revalidatePath(`/community-blends/${updated.slug}`);
    return {
      success: true,
      slug: updated.slug,
      ...(contentFlags.length > 0 ? { contentFlags } : {}),
    };
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
  /** @deprecated Ignored when a session exists — identity comes from the session */
  sharedBy?: string;
  platform?: string;
}

export async function createShareLink(input: ShareBlendInput): Promise<{ success: boolean; shareToken?: string; error?: string }> {
  try {
    const identity = await getSessionIdentity();
    const token = `shr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.insert(blendShares).values({
      blendId: input.blendId,
      sharedBy: identity?.customerId ?? 'anonymous',
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
  /** @deprecated Ignored — identity is derived from the session */
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  review?: string;
  orderId?: string; // To verify purchase
}

export async function rateBlend(input: RateBlendInput): Promise<{ success: boolean; error?: string }> {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return { success: false, error: 'Authentication required' };
    }
    const userId = identity.customerId;

    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Check if user already rated this blend
    const existingRating = await db.query.blendRatings.findFirst({
      where: and(
        eq(blendRatings.blendId, input.blendId),
        eq(blendRatings.userId, userId)
      ),
    });

    // Verified purchase only when an actual paid order by this user
    // contains the blend — a client-supplied orderId alone proves nothing
    const verifiedPurchase = await hasUserPurchasedBlend(userId, input.blendId, input.orderId);

    if (existingRating) {
      // Update existing rating
      await db.update(blendRatings)
        .set({
          rating: input.rating,
          review: input.review,
          verifiedPurchase,
          orderId: verifiedPurchase ? input.orderId : null,
          updatedAt: new Date(),
        })
        .where(eq(blendRatings.id, existingRating.id));
    } else {
      // Create new rating
      await db.insert(blendRatings).values({
        blendId: input.blendId,
        userId,
        userName: input.userName || identity.displayName,
        userAvatar: input.userAvatar,
        rating: input.rating,
        review: input.review,
        verifiedPurchase,
        orderId: verifiedPurchase ? input.orderId : null,
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

/**
 * Server-to-server: called from order completion and the purchase API route
 * (which verifies the order server-side). The self-dealing guard lives in
 * awardBlendCommission — a creator buying their own blend earns nothing.
 */
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
