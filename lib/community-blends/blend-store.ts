/**
 * Community Blends Store
 *
 * Session-free persistence helpers for community blends. Callers are
 * responsible for establishing identity/authorization BEFORE calling these:
 * - Server actions (lib/community-blends/actions.ts) derive identity from
 *   the iron-session.
 * - Order completion (lib/orders/order-completion.ts) uses the
 *   server-verified customerId from the paid order record.
 *
 * Nothing in this file trusts client-supplied identity on its own.
 */

import { db } from '@/lib/db';
import {
  communityBlends,
  userBlendStats,
  type CommunityBlend,
} from '@/lib/db/schema/community-blends';
import { eq, and, sql } from 'drizzle-orm';
import { slugify as generateSlug } from '@/lib/utils';

// ============================================================================
// INSERT BLEND
// ============================================================================

export interface InsertCommunityBlendInput {
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
  status?: 'draft' | 'published';
  visibility?: 'private' | 'shared' | 'community';
  consentToShare?: boolean;
  originalOrderId?: string;
}

/**
 * Insert a community blend record and bump creator stats.
 * Returns the new blend id and slug.
 */
export async function insertCommunityBlend(
  input: InsertCommunityBlendInput
): Promise<{ blendId: string; slug: string }> {
  // Generate unique slug
  let slug = generateSlug(input.name);
  let existing = await db.query.communityBlends.findFirst({
    where: eq(communityBlends.slug, slug),
  });

  // Append counter if slug exists
  let counter = 1;
  while (existing) {
    slug = `${generateSlug(input.name)}-${counter}`;
    existing = await db.query.communityBlends.findFirst({
      where: eq(communityBlends.slug, slug),
    });
    counter++;
  }

  const publishNow = input.status === 'published';

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
    status: input.status ?? 'draft',
    visibility: input.visibility ?? 'private',
    ...(publishNow
      ? {
          consentToShare: true,
          consentDate: new Date(),
          originalOrderId: input.originalOrderId,
          purchaseVerifiedAt: new Date(),
          publishedAt: new Date(),
        }
      : {}),
  }).returning();

  // Update user stats
  await db.insert(userBlendStats).values({
    userId: input.creatorId,
    blendsCreated: 1,
    blendsPublished: publishNow ? 1 : 0,
  }).onConflictDoUpdate({
    target: userBlendStats.userId,
    set: {
      blendsCreated: sql`${userBlendStats.blendsCreated} + 1`,
      ...(publishNow
        ? { blendsPublished: sql`${userBlendStats.blendsPublished} + 1` }
        : {}),
      updatedAt: new Date(),
    },
  });

  return { blendId: blend.id, slug: blend.slug };
}

// ============================================================================
// PUBLISH BLEND
// ============================================================================

/**
 * Publish a blend owned by creatorId (ownership enforced in the WHERE clause).
 * Optionally updates sanitized text fields at publish time.
 * moderationStatus comes from the caller's flagBlendContent check: content
 * with flags publishes as 'flagged' (held for admin review, hidden from
 * public queries); clean content publishes as 'approved'.
 * Returns the published blend, or null when not found / not owned.
 */
export async function publishBlendRecord(input: {
  blendId: string;
  creatorId: string;
  orderId: string;
  name?: string;
  description?: string;
  story?: string;
  moderationStatus?: 'approved' | 'flagged';
}): Promise<CommunityBlend | null> {
  const [updated] = await db.update(communityBlends)
    .set({
      status: 'published',
      visibility: 'community',
      moderationStatus: input.moderationStatus ?? 'approved',
      consentToShare: true,
      consentDate: new Date(),
      originalOrderId: input.orderId,
      purchaseVerifiedAt: new Date(),
      publishedAt: new Date(),
      updatedAt: new Date(),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.story !== undefined ? { story: input.story } : {}),
    })
    .where(and(
      eq(communityBlends.id, input.blendId),
      eq(communityBlends.creatorId, input.creatorId) // Ensure ownership
    ))
    .returning();

  if (!updated) {
    return null;
  }

  // Update user stats
  await db.update(userBlendStats)
    .set({
      blendsPublished: sql`${userBlendStats.blendsPublished} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userBlendStats.userId, updated.creatorId));

  return updated;
}
