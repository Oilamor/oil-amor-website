/**
 * Community Blend Pricing tests
 * Blend prices must come from the pricing engine (cost-based), not a flat $35.
 */

import { calculateBlendPriceCents, DEFAULT_BLEND_PRICE_CENTS } from '../pricing';
import {
  WHOLESALE_OILS,
  FIXED_COSTS,
  MARGIN_DIVISORS,
  CRYSTAL_COUNTS,
  roundTo95,
} from '@/lib/content/pricing-engine-final';

jest.mock('@/lib/logging/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('calculateBlendPriceCents', () => {
  it('prices a pure single-oil blend from wholesale cost', () => {
    // 30ml pure lavender: oilCost = 115/1000 * 30 = 3.45
    const priceCents = calculateBlendPriceCents({
      mode: 'pure',
      bottleSize: 30,
      strength: 100,
      oils: [{ oilId: 'lavender', ml: 30 }],
    });

    const oilCost = (WHOLESALE_OILS['lavender'].pricePerLiter / 1000) * 30;
    const expectedDollars = roundTo95(
      oilCost / MARGIN_DIVISORS.pure +
        FIXED_COSTS.newBottleBuffer * 1.25 +
        CRYSTAL_COUNTS['30ml'] * FIXED_COSTS.crystalPerChip +
        FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure
    );

    expect(priceCents).toBe(Math.round(expectedDollars * 100));
  });

  it('prices carrier blends including carrier oil cost', () => {
    // 30ml carrier blend at 30% strength: 9ml lavender + 21ml carrier
    const priceCents = calculateBlendPriceCents({
      mode: 'carrier',
      bottleSize: 30,
      strength: 30,
      oils: [{ oilId: 'lavender', ml: 9 }],
    });

    const oilCost = (WHOLESALE_OILS['lavender'].pricePerLiter / 1000) * 9;
    const carrierCost = 21 * FIXED_COSTS.carrierOilPerMl;
    const expectedDollars = roundTo95(
      oilCost / MARGIN_DIVISORS.carrier +
        carrierCost / MARGIN_DIVISORS.carrier +
        FIXED_COSTS.newBottleBuffer * 1.25 +
        CRYSTAL_COUNTS['30ml'] * FIXED_COSTS.crystalPerChip +
        FIXED_COSTS.laborCarrier / MARGIN_DIVISORS.carrier
    );

    expect(priceCents).toBe(Math.round(expectedDollars * 100));
  });

  it('is not the old hardcoded $35 for a cheap blend', () => {
    const priceCents = calculateBlendPriceCents({
      mode: 'carrier',
      bottleSize: 30,
      strength: 30,
      oils: [
        { oilId: 'lavender', ml: 5.4 },
        { oilId: 'lemon', ml: 3.6 },
      ],
    });

    expect(priceCents).not.toBe(3500);
    expect(priceCents).toBeGreaterThan(0);
    expect(Number.isInteger(priceCents)).toBe(true);
  });

  it('falls back to the default price for unknown oils', () => {
    const priceCents = calculateBlendPriceCents({
      mode: 'pure',
      bottleSize: 30,
      strength: 100,
      oils: [{ oilId: 'nonexistent-oil', ml: 30 }],
    });

    expect(priceCents).toBe(DEFAULT_BLEND_PRICE_CENTS);
  });

  it('returns integer cents', () => {
    const priceCents = calculateBlendPriceCents({
      mode: 'pure',
      bottleSize: 10,
      strength: 100,
      oils: [{ oilId: 'myrrh', ml: 10 }],
    });

    expect(Number.isInteger(priceCents)).toBe(true);
  });
});
