/**
 * Community Blend Pricing
 *
 * Computes a community blend's sale price from its scaled recipe using the
 * existing pricing engine (lib/content/pricing-engine-final) — oil cost is
 * looked up per oil, carrier/bottle/crystal/labor costs and margins follow
 * the same model as single-oil products.
 *
 * Returns integer cents. Falls back to DEFAULT_BLEND_PRICE_CENTS when the
 * recipe references an oil unknown to the pricing engine (pricing should
 * never block a share — but it is logged).
 */

import {
  WHOLESALE_OILS,
  FIXED_COSTS,
  MARGIN_DIVISORS,
  CRYSTAL_COUNTS,
  getOilIdFromSlug,
  roundTo95,
} from '@/lib/content/pricing-engine-final';
import { logger } from '@/lib/logging/logger';

// Fallback when a recipe cannot be priced ($35.00 — the previous flat price)
export const DEFAULT_BLEND_PRICE_CENTS = 3500;

export interface BlendRecipeForPricing {
  mode: 'pure' | 'carrier';
  bottleSize: number; // ml
  strength: number; // percent of total volume that is essential oils (5-100)
  oils: Array<{ oilId: string; ml: number }>;
}

/**
 * Calculate the sale price of a community blend from its recipe.
 * @returns price in integer cents
 */
export function calculateBlendPriceCents(recipe: BlendRecipeForPricing): number {
  try {
    // Oil cost: sum of each oil's wholesale cost for its scaled ml
    let oilCost = 0;
    for (const oil of recipe.oils) {
      const oilId = getOilIdFromSlug(oil.oilId);
      const wholesale = WHOLESALE_OILS[oilId];
      if (!wholesale) {
        logger.warn('Unknown oil in community blend recipe, using fallback price', {
          oilId: oil.oilId,
        });
        return DEFAULT_BLEND_PRICE_CENTS;
      }
      oilCost += (wholesale.pricePerLiter / 1000) * oil.ml;
    }

    const totalOilMl = recipe.oils.reduce((sum, o) => sum + o.ml, 0);
    const marginDivisor = recipe.mode === 'pure' ? MARGIN_DIVISORS.pure : MARGIN_DIVISORS.carrier;

    // Carrier cost (remaining volume is carrier oil)
    const carrierMl = Math.max(0, recipe.bottleSize - totalOilMl);
    const carrierCost = recipe.mode === 'carrier' ? carrierMl * FIXED_COSTS.carrierOilPerMl : 0;

    // Fixed costs — same model as new-bottle single-oil pricing
    const bottleWithMargin = FIXED_COSTS.newBottleBuffer * 1.25;
    const chipCount = CRYSTAL_COUNTS[`${recipe.bottleSize}ml`] || 0;
    const crystalCost = chipCount * FIXED_COSTS.crystalPerChip;
    const labor =
      (recipe.mode === 'pure' ? FIXED_COSTS.laborPure : FIXED_COSTS.laborCarrier) / marginDivisor;

    const priceDollars = roundTo95(
      oilCost / marginDivisor + carrierCost / marginDivisor + bottleWithMargin + crystalCost + labor
    );

    return Math.round(priceDollars * 100);
  } catch (error) {
    logger.error(
      'Failed to price community blend recipe, using fallback price',
      error instanceof Error ? error : new Error(String(error))
    );
    return DEFAULT_BLEND_PRICE_CENTS;
  }
}
