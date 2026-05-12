/**
 * Seed script: Create "67 Lemon" admin community blend
 * 
 * This blend is configurable: any size (5-30ml), any mode (pure/carrier),
 * any carrier strength (5%, 10%, 15%, 25%, 50%, 75%).
 * 
 * Oil ratios (of total EO portion):
 * - Lemongrass:  52%
 * - Ho Wood:     20%
 * - Frankincense: 12%
 * - Cedarwood:    9%
 * - Ginger:       5%
 * - Clove Bud:    2%
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../lib/db';
import { communityBlends } from '../lib/db/schema/community-blends';
import { slugify } from '../lib/utils';

// Oil ratios as percentages of total essential oil portion
const OIL_RATIOS: Record<string, number> = {
  lemongrass: 0.52,
  'ho-wood': 0.20,
  frankincense: 0.12,
  cedarwood: 0.09,
  ginger: 0.05,
  'clove-bud': 0.02,
};

// Reference configuration: pure 30ml (ratios are intrinsic, not tied to this config)
const REFERENCE_SIZE = 30;
const REFERENCE_MODE = 'pure' as const;

function buildRecipe() {
  const oils = [
    { oilId: 'lemongrass', name: 'Lemongrass' },
    { oilId: 'ho-wood', name: 'Ho Wood' },
    { oilId: 'frankincense', name: 'Frankincense' },
    { oilId: 'cedarwood', name: 'Cedarwood Atlas' },
    { oilId: 'ginger', name: 'Ginger' },
    { oilId: 'clove-bud', name: 'Clove Bud' },
  ];

  return {
    mode: REFERENCE_MODE,
    bottleSize: REFERENCE_SIZE,
    strength: 100,
    oils: oils.map(o => ({
      oilId: o.oilId,
      name: o.name,
      ml: Math.round(OIL_RATIOS[o.oilId] * REFERENCE_SIZE * 100) / 100,
    })),
    // Store explicit ratios for dynamic configuration in UI
    oilRatios: OIL_RATIOS,
  };
}

async function main() {
  console.log('Seeding "67 Lemon" community blend...\n');

  // Check if blend already exists
  const existing = await db.query.communityBlends.findFirst({
    where: (blends, { eq }) => eq(blends.slug, '67-lemon'),
  });

  if (existing) {
    console.log('Blend "67 Lemon" already exists (ID:', existing.id, ')');
    console.log('Updating recipe to latest ratios...');

    await db.update(communityBlends)
      .set({
        recipe: buildRecipe(),
        updatedAt: new Date(),
      })
      .where(eq(communityBlends.id, existing.id));

    console.log('Updated successfully!');
    return;
  }

  const recipe = buildRecipe();

  const [blend] = await db.insert(communityBlends).values({
    creatorId: 'oil-amor-admin',
    creatorName: 'Oil Amor',
    creatorBio: 'Artisan essential oil blends crafted with intention in the Oil Amor Atelier.',
    name: '67 Lemon',
    slug: '67-lemon',
    description: 'A bright, uplifting citrus-forward blend with warm woody undertones and a gentle spice finish. Named for the year of transformation — 1967 — this blend captures the spirit of renewal, clarity, and joyful energy. Lemongrass leads with its crisp, lemony vibrancy, supported by the creamy sweetness of Ho Wood and the sacred depth of Frankincense. Cedarwood grounds the composition, while Ginger and Clove Bud add a subtle warming spice that lingers beautifully on the skin.',
    story: 'The "67 Lemon" blend was born from a desire to capture the essence of a perfect summer morning — when sunlight filters through lemon trees and the air is alive with possibility. Each oil was selected not just for its individual character, but for how they harmonise: Lemongrass brings the brightness, Ho Wood the softness, Frankincense the sacred pause, Cedarwood the earth, and Ginger & Clove Bud the warm embrace. It is a blend for those who seek clarity with comfort, energy with grounding.',
    recipe,
    price: 2995, // Reference price for pure 30ml — actual price calculated dynamically in atelier
    status: 'published',
    visibility: 'community',
    consentToShare: true,
    consentDate: new Date(),
    purchaseVerifiedAt: new Date(),
    publishedAt: new Date(),
  }).returning();

  console.log('Successfully created "67 Lemon" blend!');
  console.log('ID:', blend.id);
  console.log('Slug:', blend.slug);
  console.log('Recipe:', JSON.stringify(recipe, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed blend:', err);
    process.exit(1);
  });
