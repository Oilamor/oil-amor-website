/**
 * Community Blends Data Layer
 * 
 * Server-side data fetching that can be called from Server Components.
 */

'use server';

import { db } from '@/lib/db';
import { 
  communityBlends, 
  blendRatings,
} from '@/lib/db/schema/community-blends';
import { eq, and, desc, sql, count, gte } from 'drizzle-orm';

// Demo data for when database is unavailable
const DEMO_COMMUNITY_BLENDS: BlendWithRating[] = [
  {
    id: 'demo-1',
    name: 'Sunrise Clarity',
    slug: 'sunrise-clarity',
    description: 'A bright, uplifting blend for morning focus and mental clarity.',
    creatorName: 'Alexandra Rose',
    creatorAvatar: null,
    price: 3500,
    recipe: {
      mode: 'carrier',
      bottleSize: 10,
      strength: 5,
      oils: [
        { oilId: 'lemon', name: 'Lemon', ml: 0.5 },
        { oilId: 'rosemary', name: 'Rosemary', ml: 0.3 },
        { oilId: 'peppermint', name: 'Peppermint', ml: 0.2 },
      ],
    },
    revelationData: null,
    viewCount: 128,
    purchaseCount: 23,
    ratingCount: 12,
    averageRating: 4.8,
    publishedAt: new Date('2026-03-01'),
  },
  {
    id: 'demo-2',
    name: 'Midnight Lavender',
    slug: 'midnight-lavender',
    description: 'Deep relaxation blend for restful sleep and peaceful dreams.',
    creatorName: 'Jordan Smith',
    creatorAvatar: null,
    price: 3800,
    recipe: {
      mode: 'carrier',
      bottleSize: 15,
      strength: 3,
      oils: [
        { oilId: 'lavender', name: 'Lavender', ml: 0.8 },
        { oilId: 'chamomile', name: 'Chamomile', ml: 0.4 },
        { oilId: 'cedarwood', name: 'Cedarwood', ml: 0.3 },
      ],
    },
    revelationData: null,
    viewCount: 256,
    purchaseCount: 45,
    ratingCount: 28,
    averageRating: 4.9,
    publishedAt: new Date('2026-02-15'),
  },
  {
    id: 'demo-3',
    name: 'Forest Guardian',
    slug: 'forest-guardian',
    description: 'Grounding blend that connects you to nature\'s protective energy.',
    creatorName: 'Maya Chen',
    creatorAvatar: null,
    price: 4200,
    recipe: {
      mode: 'pure',
      bottleSize: 5,
      strength: 100,
      oils: [
        { oilId: 'pine', name: 'Pine', ml: 2.0 },
        { oilId: 'eucalyptus', name: 'Eucalyptus', ml: 1.5 },
        { oilId: 'tea-tree', name: 'Tea Tree', ml: 1.5 },
      ],
    },
    revelationData: null,
    viewCount: 89,
    purchaseCount: 15,
    ratingCount: 8,
    averageRating: 4.6,
    publishedAt: new Date('2026-03-10'),
  },
];

function isDatabaseAvailable(): boolean {
  return !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes(':');
}

// ============================================================================
// TYPES
// ============================================================================

export interface BlendWithRating {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  price: number;
  recipe: {
    mode: 'pure' | 'carrier';
    bottleSize: number;
    strength: number;
    oils: { oilId: string; name: string; ml: number }[];
    oilRatios?: Record<string, number>;
    carrierOilId?: string;
    crystalId?: string;
    cordId?: string;
  };
  revelationData: Record<string, unknown> | null;
  viewCount: number;
  purchaseCount: number;
  ratingCount: number;
  averageRating: number;
  publishedAt: Date | null;
}

export interface BlendDetail extends BlendWithRating {
  story: string | null;
  creatorBio: string | null;
  ratings: {
    id: string;
    userName: string;
    userAvatar: string | null;
    rating: number;
    review: string | null;
    verifiedPurchase: boolean;
    createdAt: Date;
  }[];
}

// ============================================================================
// LIST BLENDS
// ============================================================================

export async function getCommunityBlends(sortBy: 'popular' | 'newest' | 'rated' | 'purchased' = 'popular', limit: number = 24): Promise<BlendWithRating[]> {
  // Return demo data if database is not available
  if (!isDatabaseAvailable()) {
    console.warn('Database not available, returning demo community blends');
    // Sort demo data based on sortBy
    const sorted = [...DEMO_COMMUNITY_BLENDS];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
        break;
      case 'rated':
        sorted.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'purchased':
        sorted.sort((a, b) => b.purchaseCount - a.purchaseCount);
        break;
      case 'popular':
      default:
        sorted.sort((a, b) => b.viewCount - a.viewCount);
        break;
    }
    return sorted.slice(0, limit);
  }

  try {
    // Build query with sorting applied inline to avoid type issues
    const orderByColumn = 
      sortBy === 'newest' ? communityBlends.publishedAt :
      sortBy === 'rated' ? communityBlends.ratingSum :
      sortBy === 'purchased' ? communityBlends.purchaseCount :
      communityBlends.popularityScore;

    const blends = await db.select().from(communityBlends)
      .where(and(
        eq(communityBlends.status, 'published'),
        eq(communityBlends.visibility, 'community')
      ))
      .orderBy(desc(orderByColumn))
      .limit(limit);

    return blends.map(blend => ({
      id: blend.id,
      name: blend.name,
      slug: blend.slug,
      description: blend.description,
      creatorName: blend.creatorName,
      creatorAvatar: blend.creatorAvatar,
      price: blend.price,
      recipe: blend.recipe as BlendWithRating['recipe'],
      revelationData: (blend.revelationData as BlendWithRating['revelationData']) || null,
      viewCount: blend.viewCount,
      purchaseCount: blend.purchaseCount,
      ratingCount: blend.ratingCount,
      averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
      publishedAt: blend.publishedAt,
    }));
  } catch (error) {
    console.error('Failed to fetch community blends:', error);
    console.warn('Returning demo data as fallback');
    return DEMO_COMMUNITY_BLENDS.slice(0, limit);
  }
}

// ============================================================================
// GET SINGLE BLEND
// ============================================================================

export async function getBlendDetail(slug: string): Promise<BlendDetail | null> {
  // Return demo data if database is not available
  if (!isDatabaseAvailable()) {
    console.warn('Database not available, returning demo blend detail');
    const demoBlend = DEMO_COMMUNITY_BLENDS.find(b => b.slug === slug);
    if (!demoBlend) return null;
    return {
      ...demoBlend,
      story: 'This blend was created with love and intention in the Oil Amor Mixing Atelier. Each ingredient was carefully selected for its unique properties and how they harmonize together.',
      creatorBio: 'A passionate essential oil enthusiast who loves creating unique blends for wellbeing.',
      ratings: [
        {
          id: 'demo-rating-1',
          userName: 'Sarah M.',
          userAvatar: null,
          rating: 5,
          review: 'Absolutely love this blend! The scent is perfectly balanced and lasts all day.',
          verifiedPurchase: true,
          createdAt: new Date('2026-03-15'),
        },
        {
          id: 'demo-rating-2',
          userName: 'James K.',
          userAvatar: null,
          rating: 4,
          review: 'Great quality oils, very satisfied with my purchase.',
          verifiedPurchase: true,
          createdAt: new Date('2026-03-10'),
        },
      ],
    };
  }

  try {
    const blends = await db.select()
      .from(communityBlends)
      .where(eq(communityBlends.slug, slug))
      .limit(1);

    const blend = blends[0];
    if (!blend) return null;

    // Get ratings separately — non-fatal if table doesn't exist yet
    let ratings: Array<{
      id: string; userName: string; userAvatar: string | null;
      rating: number; review: string | null;
      verifiedPurchase: boolean; createdAt: Date;
    }> = [];
    try {
      ratings = await db.select({
        id: blendRatings.id,
        userName: blendRatings.userName,
        userAvatar: blendRatings.userAvatar,
        rating: blendRatings.rating,
        review: blendRatings.review,
        verifiedPurchase: blendRatings.verifiedPurchase,
        createdAt: blendRatings.createdAt,
      })
      .from(blendRatings)
      .where(eq(blendRatings.blendId, blend.id))
      .orderBy(desc(blendRatings.createdAt))
      .limit(10);
    } catch {
      // Ratings table may not exist yet — safe to ignore
    }

    return {
      id: blend.id,
      name: blend.name,
      slug: blend.slug,
      description: blend.description,
      story: blend.story,
      creatorName: blend.creatorName,
      creatorAvatar: blend.creatorAvatar,
      creatorBio: blend.creatorBio,
      price: blend.price,
      recipe: blend.recipe as BlendDetail['recipe'],
      revelationData: (blend.revelationData as BlendDetail['revelationData']) || null,
      viewCount: blend.viewCount,
      purchaseCount: blend.purchaseCount,
      ratingCount: blend.ratingCount,
      averageRating: blend.ratingCount > 0 ? blend.ratingSum / blend.ratingCount : 0,
      publishedAt: blend.publishedAt,
      ratings: ratings.map(r => ({
        ...r,
        review: r.review || null,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch blend detail:', error);
    // Return demo data as fallback
    const demoBlend = DEMO_COMMUNITY_BLENDS.find(b => b.slug === slug);
    if (!demoBlend) return null;
    return {
      ...demoBlend,
      story: 'This blend was created with love and intention in the Oil Amor Mixing Atelier.',
      creatorBio: 'A passionate essential oil enthusiast.',
      ratings: [],
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
    console.error('Error incrementing view:', error);
  }
}
