/**
 * Refill Pricing — engine-driven, integer cents
 *
 * 2026-07-21: algorithm-driven refill pricing (business directive: NO
 * flat-fee refill price anywhere). Pins the exact engine outputs, the
 * blend formula, the throw-on-unknown-oil contract, and the absence of
 * flat price constants in REFILL_RULES.
 */

// eligibility/index pull in db-dependent modules; pricing itself is pure.
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }));
jest.mock('@/lib/shipping/auspost', () => ({}));

import {
  getOilRefillPriceCents,
  getBlendRefillPriceCents,
  getCheapestOilRefillPriceCents,
} from '../pricing';
import { calculatePurePrice, calculateCarrierPrice, WHOLESALE_OILS } from '@/lib/content/pricing-engine-final';
import { getRefillRules } from '../eligibility';
import { REFILL_RULES } from '../index';

// ---------------------------------------------------------------------------
// Single-oil refills — exact engine values
// ---------------------------------------------------------------------------

describe('getOilRefillPriceCents', () => {
  it('lavender 100ml pure refill → 3095 cents (engine sanity check)', () => {
    expect(getOilRefillPriceCents('lavender', 100)).toBe(3095);
    expect(Math.round(calculatePurePrice('lavender', 100, true) * 100)).toBe(3095);
  });

  it('myrrh 100ml pure refill → 17895 cents (engine sanity check)', () => {
    expect(getOilRefillPriceCents('myrrh', 100)).toBe(17895);
    expect(Math.round(calculatePurePrice('myrrh', 100, true) * 100)).toBe(17895);
  });

  it('wintergreen 100ml pure refill → 8395 cents', () => {
    expect(getOilRefillPriceCents('wintergreen', 100)).toBe(8395);
  });

  it('uses the 50ml margin divisor for 50ml refills (volume-scaled buffer)', () => {
    expect(getOilRefillPriceCents('lavender', 50)).toBe(1895);
    expect(Math.round(calculatePurePrice('lavender', 50, true) * 100)).toBe(1895);
  });

  it('a luxury oil now charges ABOVE wholesale oil cost (no more loss)', () => {
    // Myrrh wholesale is $1000/L → $100.00 of raw oil in a 100ml refill.
    // The old flat $35 sold below cost.
    const price = getOilRefillPriceCents('myrrh', 100);
    const wholesaleCostCents = Math.round((WHOLESALE_OILS['myrrh'].pricePerLiter / 1000) * 100 * 100);
    expect(price).toBeGreaterThan(wholesaleCostCents);
  });

  it('a cheap oil prices BELOW the old flat $35', () => {
    // camphor-white ($41.80/L) — the cheapest catalog oil
    expect(getOilRefillPriceCents('camphor-white', 100)).toBe(1895);
    expect(getOilRefillPriceCents('camphor-white', 100)).toBeLessThan(3500);
  });

  it('resolves product slugs to oil ids', () => {
    expect(getOilRefillPriceCents('lavender-essential-oil', 100)).toBe(3095);
  });

  it('throws on unknown oil — never returns 0 or a flat fallback', () => {
    expect(() => getOilRefillPriceCents('ghost-oil', 100)).toThrow(/unknown oil/i);
    expect(() => getOilRefillPriceCents('', 100)).toThrow(/unknown oil/i);
  });
});

// ---------------------------------------------------------------------------
// Cheapest-oil preview ("from $X")
// ---------------------------------------------------------------------------

describe('getCheapestOilRefillPriceCents', () => {
  it('is the minimum engine price across the catalog, not a constant', () => {
    const cheapest = getCheapestOilRefillPriceCents(100);

    expect(cheapest.oilId).toBe('camphor-white');
    expect(cheapest.priceCents).toBe(1895);

    const min = Math.min(
      ...Object.keys(WHOLESALE_OILS).map(id => getOilRefillPriceCents(id, 100))
    );
    expect(cheapest.priceCents).toBe(min);
  });
});

// ---------------------------------------------------------------------------
// Blend / recipe refills
// ---------------------------------------------------------------------------

describe('getBlendRefillPriceCents', () => {
  it('a single-oil pure blend matches the engine pure refill price', () => {
    const blend = getBlendRefillPriceCents(
      { mode: 'pure', oils: [{ oilId: 'lavender', ml: 100 }] },
      100
    );
    expect(blend).toBe(3095);
  });

  it('prices a multi-oil pure blend from summed wholesale cost', () => {
    // 50ml lavender + 50ml cedarwood: (5.75 + 4.68)/0.6 + 7.5 + 4.1667 → 29.95
    const blend = getBlendRefillPriceCents(
      { mode: 'pure', oils: [{ oilId: 'lavender', ml: 50 }, { oilId: 'cedarwood', ml: 50 }] },
      100
    );
    expect(blend).toBe(2995);
  });

  it('prices a carrier blend with the carrier remainder at carrier cost', () => {
    // 25% lavender in 100ml: matches engine calculateCarrierPrice(0.25, refill)
    const blend = getBlendRefillPriceCents(
      { mode: 'carrier', carrierRatio: 25, oils: [{ oilId: 'lavender', ml: 25 }] },
      100
    );
    expect(blend).toBe(2695);
    expect(blend).toBe(Math.round(calculateCarrierPrice('lavender', 100, 0.25, true) * 100));
  });

  it('pure blends cost more than carrier blends with the same oils and volume', () => {
    const oils = [{ oilId: 'lavender', ml: 30 }, { oilId: 'cedarwood', ml: 30 }];
    const pure = getBlendRefillPriceCents({ mode: 'pure', oils: oils.map(o => ({ ...o, ml: o.ml * (100 / 60) })) }, 100);
    const carrier = getBlendRefillPriceCents({ mode: 'carrier', carrierRatio: 60, oils }, 100);
    expect(pure).toBeGreaterThan(carrier);
  });

  it('throws on unknown oil in a blend', () => {
    expect(() =>
      getBlendRefillPriceCents(
        { mode: 'pure', oils: [{ oilId: 'lavender', ml: 50 }, { oilId: 'ghost', ml: 50 }] },
        100
      )
    ).toThrow(/unknown oil/i);
  });
});

// ---------------------------------------------------------------------------
// Guard: no flat refill price constants remain
// ---------------------------------------------------------------------------

describe('REFILL_RULES flat-price guard', () => {
  it('eligibility REFILL_RULES contains no standardRefillPrice/effectiveRefillPrice', () => {
    const rules = getRefillRules() as Record<string, unknown>;
    expect('standardRefillPrice' in rules).toBe(false);
    expect('effectiveRefillPrice' in rules).toBe(false);
    // The bottle-return CREDIT stays — it is a credit, not a price
    expect(rules.returnCreditAmount).toBe(500);
  });

  it('the lib/refill/index duplicate contains no flat price keys either', () => {
    const rules = REFILL_RULES as Record<string, unknown>;
    expect('standardRefillPrice' in rules).toBe(false);
    expect('effectiveRefillPrice' in rules).toBe(false);
    expect(rules.returnCreditAmount).toBe(500);
  });
});
