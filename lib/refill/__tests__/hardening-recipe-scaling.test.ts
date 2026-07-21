/**
 * Hardening tests — Recipe Scaling Engine (pure functions, no I/O)
 *
 * Pins the scaling math between 30ml custom blends and 50/100ml refills,
 * the carrierRatio PERCENT semantics (5–75%), ml rounding, and the
 * engine-computed refill prices (integer cents).
 *
 * 2026-07-21: algorithm-driven refill pricing — the flat 45/85/30/55 dollar
 * prices are gone; every recipe is priced from actual wholesale oil cost.
 */

import {
  normalizeRecipe,
  scaleToRefill,
  calculateRecipeRefillPriceCents,
  validateScaledRecipe,
  generateRefillBreakdown,
  createUnlockedRefill,
  getRefillOptions,
  formatRecipeForDisplay,
  type NormalizedRecipe,
  type ScaledRefill,
} from '../recipe-scaling';
import type { OrderCustomMix } from '@/lib/db/schema/orders';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMix(overrides: Partial<OrderCustomMix> = {}): OrderCustomMix {
  return {
    recipeName: 'Test Blend',
    mode: 'pure',
    oils: [
      { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
      { oilId: 'cedarwood', oilName: 'Cedarwood', ml: 15, percentage: 50 },
    ],
    totalVolume: 30,
    safetyScore: 90,
    safetyRating: 'safe',
    safetyWarnings: [],
    labCertified: true,
    ...overrides,
  } as OrderCustomMix;
}

function makeNormalized(overrides: Partial<NormalizedRecipe> = {}): NormalizedRecipe {
  return {
    mode: 'pure',
    totalVolume: 30,
    oils: [
      { oilId: 'lavender', oilName: 'Lavender', percentage: 50, ml: 15 },
      { oilId: 'cedarwood', oilName: 'Cedarwood', percentage: 50, ml: 15 },
    ],
    safetyScore: 90,
    safetyRating: 'safe',
    safetyWarnings: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeRecipe
// ---------------------------------------------------------------------------

describe('normalizeRecipe', () => {
  it('converts ml amounts to percentages of the total', () => {
    const recipe = normalizeRecipe(makeMix());

    expect(recipe.oils).toHaveLength(2);
    expect(recipe.oils[0]).toMatchObject({ oilId: 'lavender', percentage: 50, ml: 15 });
    expect(recipe.oils[1]).toMatchObject({ oilId: 'cedarwood', percentage: 50, ml: 15 });
  });

  it('computes uneven percentages correctly', () => {
    const recipe = normalizeRecipe(makeMix({
      oils: [
        { oilId: 'lavender', oilName: 'A', ml: 20, percentage: 0 },
        { oilId: 'eucalyptus', oilName: 'B', ml: 10, percentage: 0 },
      ],
    }));

    expect(recipe.oils[0].percentage).toBeCloseTo(66.67, 2);
    expect(recipe.oils[1].percentage).toBeCloseTo(33.33, 2);
  });

  it('rounds percentages to 2 decimal places', () => {
    const recipe = normalizeRecipe(makeMix({
      oils: [
        { oilId: 'lavender', oilName: 'A', ml: 10, percentage: 0 },
        { oilId: 'eucalyptus', oilName: 'B', ml: 10, percentage: 0 },
        { oilId: 'tea-tree', oilName: 'C', ml: 10, percentage: 0 },
      ],
    }));

    for (const oil of recipe.oils) {
      expect(oil.percentage).toBe(33.33);
    }
  });

  it('rounds ml to 0.1ml increments', () => {
    const recipe = normalizeRecipe(makeMix({
      oils: [
        { oilId: 'lavender', oilName: 'A', ml: 10.04, percentage: 0 },
        { oilId: 'eucalyptus', oilName: 'B', ml: 10.06, percentage: 0 },
      ],
    }));

    expect(recipe.oils[0].ml).toBe(10);
    expect(recipe.oils[1].ml).toBe(10.1);
  });

  it('falls back to drops * 0.05ml for legacy recipes without ml', () => {
    const mix = makeMix();
    (mix as { oils: unknown[] }).oils = [
      { oilId: 'lavender', oilName: 'A', drops: 20, percentage: 0 }, // 20 drops = 1.0ml
      { oilId: 'eucalyptus', oilName: 'B', drops: 40, percentage: 0 }, // 40 drops = 2.0ml
    ];

    const recipe = normalizeRecipe(mix);

    expect(recipe.oils[0].ml).toBe(1);
    expect(recipe.oils[1].ml).toBe(2);
    expect(recipe.oils[0].percentage).toBeCloseTo(33.33, 2);
    expect(recipe.oils[1].percentage).toBeCloseTo(66.67, 2);
  });

  it('handles a zero-total recipe without NaN percentages', () => {
    const recipe = normalizeRecipe(makeMix({
      oils: [{ oilId: 'lavender', oilName: 'A', ml: 0, percentage: 0 }],
    }));

    expect(recipe.oils[0].percentage).toBe(0);
    expect(Number.isNaN(recipe.oils[0].percentage)).toBe(false);
  });

  it('computes carrierPercentage as 100 - carrierRatio for carrier mode', () => {
    const recipe = normalizeRecipe(makeMix({ mode: 'carrier', carrierRatio: 30 }));

    expect(recipe.mode).toBe('carrier');
    expect(recipe.carrierRatio).toBe(30);
    expect(recipe.carrierPercentage).toBe(70);
  });

  it('defaults carrierRatio to 30% when a carrier blend omits it', () => {
    const recipe = normalizeRecipe(makeMix({ mode: 'carrier', carrierRatio: undefined }));

    expect(recipe.carrierPercentage).toBe(70);
  });

  it('leaves carrierPercentage undefined for pure mode', () => {
    const recipe = normalizeRecipe(makeMix({ mode: 'pure', carrierRatio: 30 }));

    expect(recipe.carrierPercentage).toBeUndefined();
  });

  it('carries safety data through unchanged', () => {
    const recipe = normalizeRecipe(makeMix({
      safetyScore: 42,
      safetyRating: 'caution',
      safetyWarnings: ['Avoid during pregnancy'],
    }));

    expect(recipe.safetyScore).toBe(42);
    expect(recipe.safetyRating).toBe('caution');
    expect(recipe.safetyWarnings).toEqual(['Avoid during pregnancy']);
  });
});

// ---------------------------------------------------------------------------
// scaleToRefill — pure blends
// ---------------------------------------------------------------------------

describe('scaleToRefill — pure blends', () => {
  const recipe = makeNormalized();

  it('scales a 30ml 50/50 blend to 100ml proportionally', () => {
    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.targetVolume).toBe(100);
    expect(scaled.oils[0].ml).toBe(50);
    expect(scaled.oils[1].ml).toBe(50);
    expect(scaled.totalEssentialOilMl).toBe(100);
  });

  it('scales a 30ml 50/50 blend to 50ml proportionally', () => {
    const scaled = scaleToRefill(recipe, 50);

    expect(scaled.oils[0].ml).toBe(25);
    expect(scaled.oils[1].ml).toBe(25);
    expect(scaled.totalEssentialOilMl).toBe(50);
  });

  it('sums scaled oils to the target volume within rounding', () => {
    const thirds = makeNormalized({
      oils: [
        { oilId: 'lavender', oilName: 'A', percentage: 33.33, ml: 10 },
        { oilId: 'eucalyptus', oilName: 'B', percentage: 33.33, ml: 10 },
        { oilId: 'tea-tree', oilName: 'C', percentage: 33.34, ml: 10 },
      ],
    });

    const scaled = scaleToRefill(thirds, 100);
    const total = scaled.oils.reduce((sum, o) => sum + o.ml, 0);

    expect(total).toBeCloseTo(100, 0);
    expect(scaled.oils[2].ml).toBe(33.3); // 33.34 rounds to 33.3 at 0.1ml
  });

  it('uses no carrier oil for pure blends', () => {
    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.totalCarrierOilMl).toBe(0);
    expect(scaled.carrierOilMl).toBeUndefined();
  });

  it('generates a pure formula string with ml amounts', () => {
    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.formula).toBe('100ml Pure Blend: 50ml Lavender + 50ml Cedarwood');
  });

  it('preserves oil percentages in the scaled output', () => {
    const scaled = scaleToRefill(recipe, 50);

    expect(scaled.oils[0].percentage).toBe(50);
    expect(scaled.oils[1].percentage).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// scaleToRefill — carrier blends (carrierRatio is a PERCENT — pinned)
// ---------------------------------------------------------------------------

describe('scaleToRefill — carrier blends (carrierRatio percent semantics)', () => {
  it('REGRESSION: carrierRatio 30 means 30% essential oils, not 30ml or a 0.30 fraction', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: 30 });

    const scaled = scaleToRefill(recipe, 100);

    // 30% of 100ml is essential oils; 70% carrier. If carrierRatio were
    // misread as ml this would be 30/70 by coincidence — the 50ml case
    // below separates percent from absolute ml.
    expect(scaled.totalEssentialOilMl).toBe(30);
    expect(scaled.carrierOilMl).toBe(70);
    expect(scaled.totalCarrierOilMl).toBe(70);
  });

  it('applies the same percent to a 50ml refill (30% → 15ml, not 30ml)', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: 30 });

    const scaled = scaleToRefill(recipe, 50);

    expect(scaled.totalEssentialOilMl).toBe(15);
    expect(scaled.carrierOilMl).toBe(35);
  });

  it('honours the documented lower boundary carrierRatio 5 (5%)', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: 5 });

    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.totalEssentialOilMl).toBe(5);
    expect(scaled.carrierOilMl).toBe(95);
  });

  it('honours the documented upper boundary carrierRatio 75 (75%)', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: 75 });

    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.totalEssentialOilMl).toBe(75);
    expect(scaled.carrierOilMl).toBe(25);
  });

  it('defaults to 30% essential oils when carrierRatio is missing', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: undefined });

    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.totalEssentialOilMl).toBe(30);
    expect(scaled.carrierOilMl).toBe(70);
  });

  it('distributes the essential-oil portion across oils by percentage', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: 30 });

    const scaled = scaleToRefill(recipe, 100);

    // 50% of the 30ml essential portion each
    expect(scaled.oils[0].ml).toBe(15);
    expect(scaled.oils[1].ml).toBe(15);
  });

  it('generates a carrier formula string with the carrier percent', () => {
    const recipe = makeNormalized({ mode: 'carrier', carrierRatio: 30 });

    const scaled = scaleToRefill(recipe, 100);

    expect(scaled.formula).toBe(
      '100ml Carrier Blend: 15ml Lavender + 15ml Cedarwood + 70ml carrier oil (70% carrier)'
    );
  });
});

// ---------------------------------------------------------------------------
// calculateRecipeRefillPriceCents — engine-computed per-recipe (integer cents)
// 2026-07-21: algorithm-driven refill pricing (was flat 45/85/30/55 dollars)
// ---------------------------------------------------------------------------

describe('calculateRecipeRefillPriceCents', () => {
  // 50/50 lavender + cedarwood pure blend
  const recipe = makeNormalized();

  it('computes per-recipe prices from actual oil costs (integer cents)', () => {
    expect(calculateRecipeRefillPriceCents(recipe, 100)).toBe(2995);
    // 50ml uses the volume-scaled bottle buffer (2026-07-21)
    expect(calculateRecipeRefillPriceCents(recipe, 50)).toBe(1795);
  });

  it('prices carrier blends below pure blends of the same recipe and size', () => {
    const carrier = makeNormalized({ mode: 'carrier', carrierRatio: 30 });

    expect(calculateRecipeRefillPriceCents(carrier, 100)).toBe(2695);
    expect(calculateRecipeRefillPriceCents(carrier, 50)).toBe(1695);
    expect(calculateRecipeRefillPriceCents(recipe, 100))
      .toBeGreaterThan(calculateRecipeRefillPriceCents(carrier, 100));
    expect(calculateRecipeRefillPriceCents(recipe, 50))
      .toBeGreaterThan(calculateRecipeRefillPriceCents(carrier, 50));
  });

  it('charges luxury oils above wholesale cost (no more loss-leaders)', () => {
    const myrrh = makeNormalized({
      oils: [{ oilId: 'myrrh', oilName: 'Myrrh', percentage: 100, ml: 30 }],
    });

    // 100ml pure myrrh: wholesale oil alone is $100.00 (10000 cents)
    expect(calculateRecipeRefillPriceCents(myrrh, 100)).toBe(17895);
    expect(calculateRecipeRefillPriceCents(myrrh, 100)).toBeGreaterThan(10000);
  });

  it('throws on unknown oils instead of flat-rating them', () => {
    const ghost = makeNormalized({
      oils: [{ oilId: 'ghost', oilName: 'Ghost', percentage: 100, ml: 30 }],
    });

    expect(() => calculateRecipeRefillPriceCents(ghost, 100)).toThrow(/unknown oil/i);
  });
});

// ---------------------------------------------------------------------------
// validateScaledRecipe
// ---------------------------------------------------------------------------

describe('validateScaledRecipe', () => {
  it('accepts a correctly scaled pure recipe', () => {
    const scaled = scaleToRefill(makeNormalized(), 100);

    const result = validateScaledRecipe(scaled);

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('warns when scaled volumes diverge from the target by more than 0.5ml', () => {
    const broken: ScaledRefill = {
      targetVolume: 100,
      totalEssentialOilMl: 80,
      totalCarrierOilMl: 0,
      oils: [
        { oilId: 'a', oilName: 'A', percentage: 50, ml: 40 },
        { oilId: 'b', oilName: 'B', percentage: 50, ml: 40 },
      ],
      estimatedPrice: 2995,
      formula: '',
    };

    const result = validateScaledRecipe(broken);

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('Volume calculation may have rounding differences');
  });

  it('warns for oils below 0.3ml (hard to measure)', () => {
    const tiny: ScaledRefill = {
      targetVolume: 100,
      totalEssentialOilMl: 100,
      totalCarrierOilMl: 0,
      oils: [
        { oilId: 'a', oilName: 'A', percentage: 99.8, ml: 99.8 },
        { oilId: 'b', oilName: 'B', percentage: 0.2, ml: 0.2 },
      ],
      estimatedPrice: 2995,
      formula: '',
    };

    const result = validateScaledRecipe(tiny);

    expect(result.valid).toBe(false);
    expect(result.warnings.some(w => w.includes('B') && w.includes('0.2ml'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateRefillBreakdown
// ---------------------------------------------------------------------------

describe('generateRefillBreakdown', () => {
  it('formats a pure 100ml breakdown with ml-only amounts', () => {
    const breakdown = generateRefillBreakdown(scaleToRefill(makeNormalized(), 100));

    expect(breakdown.title).toBe('100ml Forever Bottle Refill');
    expect(breakdown.subtitle).toBe('Pure essential oil blend');
    expect(breakdown.ingredients).toEqual([
      { name: 'Lavender', amount: '50.0ml', percentage: '50.0%' },
      { name: 'Cedarwood', amount: '50.0ml', percentage: '50.0%' },
    ]);
    expect(breakdown.total).toBe('100ml total');
  });

  it('formats a 50ml carrier breakdown including the carrier row', () => {
    const breakdown = generateRefillBreakdown(
      scaleToRefill(makeNormalized({ mode: 'carrier', carrierRatio: 30 }), 50)
    );

    expect(breakdown.title).toBe('50ml Forever Bottle Refill');
    expect(breakdown.subtitle).toBe('Carrier dilution with 2 essential oils');
    expect(breakdown.ingredients).toHaveLength(3);
    expect(breakdown.ingredients[2]).toEqual({
      name: 'Carrier Oil',
      amount: '35.0ml',
      percentage: '70.0%',
    });
  });
});

// ---------------------------------------------------------------------------
// createUnlockedRefill / getRefillOptions
// ---------------------------------------------------------------------------

describe('createUnlockedRefill / getRefillOptions', () => {
  it('creates an unlocked refill with both sizes priced by the engine (cents)', () => {
    const unlocked = createUnlockedRefill('user-1', 'order-1', 'My Blend', makeMix());

    expect(unlocked.id).toMatch(/^refill-/);
    expect(unlocked.userId).toBe('user-1');
    expect(unlocked.originalOrderId).toBe('order-1');
    expect(unlocked.purchaseCount).toBe(0);
    expect(unlocked.availableSizes).toEqual([
      { size: 50, price: 1795 },
      { size: 100, price: 2995 },
    ]);
  });

  it('prices carrier blends from their scaled recipe (cents)', () => {
    const unlocked = createUnlockedRefill(
      'user-1', 'order-1', 'My Blend', makeMix({ mode: 'carrier', carrierRatio: 30 })
    );

    expect(unlocked.availableSizes).toEqual([
      { size: 50, price: 1695 },
      { size: 100, price: 2695 },
    ]);
  });

  it('getRefillOptions returns scaled recipes for both refill sizes', () => {
    const unlocked = createUnlockedRefill('user-1', 'order-1', 'My Blend', makeMix());

    const options = getRefillOptions(unlocked);

    expect(options['50ml'].targetVolume).toBe(50);
    expect(options['100ml'].targetVolume).toBe(100);
    expect(options['100ml'].totalEssentialOilMl).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// formatRecipeForDisplay
// ---------------------------------------------------------------------------

describe('formatRecipeForDisplay', () => {
  it('builds a short hyphenated name from first words of oil names', () => {
    const display = formatRecipeForDisplay(makeNormalized());

    expect(display.name).toBe('Lavender-Cedarwood');
    expect(display.type).toBe('Pure Essential Oil Blend');
    expect(display.oils).toBe('Lavender + Cedarwood');
    expect(display.ratio).toBe('50% Lavender / 50% Cedarwood');
  });

  it('leaves preview empty when no target size is given', () => {
    const display = formatRecipeForDisplay(makeNormalized());

    expect(display.preview).toBe('');
  });

  it('previews essential + carrier split for carrier blends at a size', () => {
    const display = formatRecipeForDisplay(
      makeNormalized({ mode: 'carrier', carrierRatio: 30 }),
      100
    );

    expect(display.type).toBe('Carrier Oil Dilution');
    expect(display.preview).toBe('30.0ml essential oils + 70.0ml carrier');
  });

  it('previews pure blends as an oil count and volume', () => {
    const display = formatRecipeForDisplay(makeNormalized(), 50);

    expect(display.preview).toBe('2 oils totaling 50ml');
  });
});
