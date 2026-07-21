/**
 * Hardening tests — lib/community-blends/pricing.ts
 *
 * Recipe-shape matrix: multi-oil summing, slug-vs-id lookup, unknown-oil
 * fallback with warning, carrier vs pure cost model, crystal counts per
 * bottle size, and the integer-cents contract.
 */

import { calculateBlendPriceCents, DEFAULT_BLEND_PRICE_CENTS } from '../pricing';
import {
  WHOLESALE_OILS,
  FIXED_COSTS,
  MARGIN_DIVISORS,
  CRYSTAL_COUNTS,
  roundTo95,
} from '@/lib/content/pricing-engine-final';

const mockWarn = jest.fn();
const mockError = jest.fn();
jest.mock('@/lib/logging/logger', () => ({
  logger: { info: jest.fn(), warn: (...a: unknown[]) => mockWarn(...a), error: (...a: unknown[]) => mockError(...a), debug: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function expectedPrice(opts: {
  mode: 'pure' | 'carrier';
  bottleSize: number;
  oilMlById: Array<[string, number]>;
}): number {
  const oilCost = opts.oilMlById.reduce(
    (sum, [id, ml]) => sum + (WHOLESALE_OILS[id].pricePerLiter / 1000) * ml,
    0
  );
  const totalOilMl = opts.oilMlById.reduce((sum, [, ml]) => sum + ml, 0);
  const divisor = MARGIN_DIVISORS[opts.mode];
  const carrierMl = Math.max(0, opts.bottleSize - totalOilMl);
  const carrierCost = opts.mode === 'carrier' ? carrierMl * FIXED_COSTS.carrierOilPerMl : 0;
  const chips = CRYSTAL_COUNTS[`${opts.bottleSize}ml`] || 0;
  const labor = (opts.mode === 'pure' ? FIXED_COSTS.laborPure : FIXED_COSTS.laborCarrier) / divisor;
  const dollars = roundTo95(
    oilCost / divisor + carrierCost / divisor + FIXED_COSTS.newBottleBuffer * 1.25 + chips * FIXED_COSTS.crystalPerChip + labor
  );
  return Math.round(dollars * 100);
}

// ---------------------------------------------------------------------------
// Multi-oil recipes
// ---------------------------------------------------------------------------

describe('calculateBlendPriceCents recipe shapes', () => {
  it('sums wholesale cost across multiple oils', () => {
    const oils = [
      { oilId: 'lavender', ml: 3 },
      { oilId: 'bergamot-fcf', ml: 2 },
      { oilId: 'cedarwood', ml: 4 },
    ];

    const price = calculateBlendPriceCents({ mode: 'carrier', bottleSize: 30, strength: 30, oils });

    expect(price).toBe(expectedPrice({
      mode: 'carrier',
      bottleSize: 30,
      oilMlById: [['lavender', 3], ['bergamot-fcf', 2], ['cedarwood', 4]],
    }));
  });

  it('a luxury oil prices higher than a common oil at the same volume', () => {
    const common = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 10, strength: 100,
      oils: [{ oilId: 'lemongrass', ml: 10 }],
    });
    const luxury = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 10, strength: 100,
      oils: [{ oilId: 'myrrh', ml: 10 }],
    });

    expect(luxury).toBeGreaterThan(common);
  });

  it('resolves product slugs to oil ids (lavender-essential-oil ≡ lavender)', () => {
    const bySlug = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 100,
      oils: [{ oilId: 'lavender-essential-oil', ml: 30 }],
    });
    const byId = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 100,
      oils: [{ oilId: 'lavender', ml: 30 }],
    });

    expect(bySlug).toBe(byId);
  });

  it('scales monotonically with oil volume for the same recipe', () => {
    const small = calculateBlendPriceCents({
      mode: 'carrier', bottleSize: 30, strength: 10, oils: [{ oilId: 'lavender', ml: 3 }],
    });
    const large = calculateBlendPriceCents({
      mode: 'carrier', bottleSize: 30, strength: 60, oils: [{ oilId: 'lavender', ml: 18 }],
    });

    expect(large).toBeGreaterThan(small);
  });
});

// ---------------------------------------------------------------------------
// Unknown oils → fallback
// ---------------------------------------------------------------------------

describe('calculateBlendPriceCents unknown-oil fallback', () => {
  it('returns the default price and logs a warning naming the oil', () => {
    const price = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 100,
      oils: [{ oilId: 'dragon-blood', ml: 30 }],
    });

    expect(price).toBe(DEFAULT_BLEND_PRICE_CENTS);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringMatching(/unknown oil/i),
      expect.objectContaining({ oilId: 'dragon-blood' })
    );
  });

  it('fails the whole recipe when ANY oil is unknown (no partial pricing)', () => {
    const price = calculateBlendPriceCents({
      mode: 'carrier', bottleSize: 30, strength: 30,
      oils: [
        { oilId: 'lavender', ml: 5 },
        { oilId: 'not-an-oil', ml: 4 },
      ],
    });

    expect(price).toBe(DEFAULT_BLEND_PRICE_CENTS);
  });

  it('falls back with an error log when the recipe shape is invalid', () => {
    const price = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 100,
      // @ts-expect-error deliberately broken recipe
      oils: undefined,
    });

    expect(price).toBe(DEFAULT_BLEND_PRICE_CENTS);
    expect(mockError).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Carrier vs pure cost model
// ---------------------------------------------------------------------------

describe('calculateBlendPriceCents carrier vs pure', () => {
  it('carrier mode charges for the remaining volume as carrier oil', () => {
    // 30ml bottle, 9ml oils → 21ml carrier
    const withOils = calculateBlendPriceCents({
      mode: 'carrier', bottleSize: 30, strength: 30, oils: [{ oilId: 'lavender', ml: 9 }],
    });

    expect(withOils).toBe(expectedPrice({
      mode: 'carrier', bottleSize: 30, oilMlById: [['lavender', 9]],
    }));
  });

  it('pure mode never charges carrier cost even with spare volume', () => {
    const price = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 50, oils: [{ oilId: 'lavender', ml: 15 }],
    });

    expect(price).toBe(expectedPrice({
      mode: 'pure', bottleSize: 30, oilMlById: [['lavender', 15]],
    }));
  });

  it('clamps carrier ml at 0 when oils exceed the bottle size', () => {
    const price = calculateBlendPriceCents({
      mode: 'carrier', bottleSize: 30, strength: 100,
      oils: [{ oilId: 'lavender', ml: 40 }],
    });

    // carrierMl = max(0, 30 - 40) = 0 — no negative carrier discount
    expect(price).toBe(expectedPrice({
      mode: 'carrier', bottleSize: 30, oilMlById: [['lavender', 40]],
    }));
  });
});

// ---------------------------------------------------------------------------
// Crystals
// ---------------------------------------------------------------------------

describe('calculateBlendPriceCents crystals', () => {
  it('includes the crystal chip cost for known bottle sizes', () => {
    const withCrystals = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 100, oils: [{ oilId: 'lavender', ml: 30 }],
    });
    expect(CRYSTAL_COUNTS['30ml']).toBeGreaterThan(0);
    // Expected value already includes chips; also verify against a size with fewer chips
    const fiveMl = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 5, strength: 100, oils: [{ oilId: 'lavender', ml: 5 }],
    });
    expect(withCrystals).toBe(expectedPrice({ mode: 'pure', bottleSize: 30, oilMlById: [['lavender', 30]] }));
    expect(fiveMl).toBe(expectedPrice({ mode: 'pure', bottleSize: 5, oilMlById: [['lavender', 5]] }));
  });

  it('uses zero crystal chips for bottle sizes outside the table', () => {
    const price = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 50, strength: 100, oils: [{ oilId: 'lavender', ml: 50 }],
    });

    expect(CRYSTAL_COUNTS['50ml']).toBeUndefined();
    expect(price).toBe(expectedPrice({ mode: 'pure', bottleSize: 50, oilMlById: [['lavender', 50]] }));
  });
});

// ---------------------------------------------------------------------------
// Contract: integer cents, always positive
// ---------------------------------------------------------------------------

describe('calculateBlendPriceCents contract', () => {
  const shapes: Array<[string, Parameters<typeof calculateBlendPriceCents>[0]]> = [
    ['pure 5ml single oil', { mode: 'pure', bottleSize: 5, strength: 100, oils: [{ oilId: 'lemon', ml: 5 }] }],
    ['pure 30ml myrrh', { mode: 'pure', bottleSize: 30, strength: 100, oils: [{ oilId: 'myrrh', ml: 30 }] }],
    ['carrier 10ml three oils', { mode: 'carrier', bottleSize: 10, strength: 25, oils: [{ oilId: 'lemon', ml: 1 }, { oilId: 'rosemary', ml: 1 }, { oilId: 'peppermint', ml: 0.5 }] }],
    ['carrier 30ml fractional ml', { mode: 'carrier', bottleSize: 30, strength: 30, oils: [{ oilId: 'lavender', ml: 5.4 }, { oilId: 'lemon', ml: 3.6 }] }],
    ['pure 20ml tiny volume', { mode: 'pure', bottleSize: 20, strength: 10, oils: [{ oilId: 'tea-tree', ml: 0.1 }] }],
  ];

  it.each(shapes)('returns positive integer cents for %s', (_label, recipe) => {
    const price = calculateBlendPriceCents(recipe);

    expect(Number.isInteger(price)).toBe(true);
    expect(price).toBeGreaterThan(0);
  });

  it('PINNED: the strength field does not affect the price (pricing uses oil ml only)', () => {
    const base = { mode: 'carrier' as const, bottleSize: 30, oils: [{ oilId: 'lavender', ml: 9 }] };
    const at30 = calculateBlendPriceCents({ ...base, strength: 30 });
    const at75 = calculateBlendPriceCents({ ...base, strength: 75 });

    expect(at30).toBe(at75);
  });

  it('ends in 95 cents (roundTo95 price psychology)', () => {
    const price = calculateBlendPriceCents({
      mode: 'pure', bottleSize: 30, strength: 100, oils: [{ oilId: 'lavender', ml: 30 }],
    });

    expect(price % 100).toBe(95);
  });
});
