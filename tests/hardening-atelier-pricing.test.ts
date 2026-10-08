/**
 * Hardening Tests — lib/atelier/atelier-engine.ts pricing
 * calculateAtelierPrice determinism, UI/server parity with the collection
 * engine, cost-component accounting, oil-count fees, and extreme inputs.
 */

import {
  ATELIER_OILS,
  calculateAtelierPrice,
  calculatePurePrice,
  calculateCarrierPrice,
  roundTo95,
  WHOLESALE_OILS as ATELIER_WHOLESALE_OILS,
  FIXED_COSTS,
  CRYSTAL_COUNTS,
  MARGIN_DIVISORS,
  formatPrice,
  AtelierBlendConfig,
} from '@/lib/atelier/atelier-engine'
import { WHOLESALE_OILS } from '@/lib/content/pricing-engine-final'
import { applyLaunchDiscount } from '@/lib/content/launch-pricing'

const BOTTLE_SIZES = [5, 10, 15, 20, 30] as const

function blend(overrides: Partial<AtelierBlendConfig> = {}): AtelierBlendConfig {
  return {
    name: 'Test Blend',
    mode: 'pure',
    bottleSize: 30,
    components: [{ oilId: 'lavender', ml: 15 }, { oilId: 'lemon', ml: 15 }],
    ...overrides,
  }
}

describe('module consistency with the canonical engine', () => {
  it('re-exports the identical WHOLESALE_OILS table', () => {
    expect(ATELIER_WHOLESALE_OILS).toBe(WHOLESALE_OILS)
  })

  it('every atelier oil exists in the wholesale table with the same cost', () => {
    for (const oil of ATELIER_OILS) {
      expect(WHOLESALE_OILS[oil.id]).toBeDefined()
      expect(WHOLESALE_OILS[oil.id].pricePerLiter).toBe(oil.wholesalePerLiter)
    }
  })

  it('re-exports the same pricing functions', () => {
    // Same reference → atelier can never drift from collection pricing
    // launch-discounted (20%): 24.95 → 19.96, 38.95 → 31.16
    expect(calculatePurePrice('lavender', 30)).toBe(applyLaunchDiscount(24.95))
    expect(calculateCarrierPrice('myrrh', 30, 0.25)).toBe(applyLaunchDiscount(38.95))
  })
})

describe('UI/server parity — a single-oil full bottle equals the collection price', () => {
  it('matches calculatePurePrice for every atelier oil and bottle size', () => {
    for (const oil of ATELIER_OILS) {
      for (const size of BOTTLE_SIZES) {
        const result = calculateAtelierPrice({
          name: 'Parity',
          mode: 'pure',
          bottleSize: size,
          components: [{ oilId: oil.id, ml: size }],
        })
        expect(result.total).toBe(calculatePurePrice(oil.id, size))
      }
    }
  })
})

describe('determinism', () => {
  it('returns identical results for identical inputs', () => {
    const config = blend({ crystalId: 'amethyst', cordId: 'leather' })
    const first = calculateAtelierPrice(config)
    const second = calculateAtelierPrice({ ...config, components: [...config.components] })
    expect(second.total).toBe(first.total)
    expect(second.costs).toEqual(first.costs)
    expect(second.perDrop).toBe(first.perDrop)
  })

  it('does not depend on component ordering', () => {
    const a = calculateAtelierPrice(blend())
    const b = calculateAtelierPrice(
      blend({ components: [{ oilId: 'lemon', ml: 15 }, { oilId: 'lavender', ml: 15 }] })
    )
    expect(b.total).toBe(a.total)
    expect(b.costs.oilsSubtotal).toBeCloseTo(a.costs.oilsSubtotal, 10)
  })
})

describe('cost component accounting', () => {
  it('components add up: subtotal = oils + fee + crystals + labor + bottle', () => {
    const result = calculateAtelierPrice(blend())
    const c = result.costs
    const sum = c.oilsSubtotal + c.additionalOilFee + c.crystals + c.cord + c.labor + c.bottleCost
    expect(sum).toBeCloseTo(c.subtotalBeforeRounding, 10)
  })

  it('total is the launch-discounted roundTo95 of the subtotal and the adjustment reconciles', () => {
    const result = calculateAtelierPrice(blend())
    // launch-discounted (20%): engine applies applyLaunchDiscount after roundTo95
    expect(result.total).toBe(applyLaunchDiscount(roundTo95(result.costs.subtotalBeforeRounding)))
    expect(result.costs.roundingAdjustment).toBeCloseTo(
      result.total - result.costs.subtotalBeforeRounding,
      10
    )
  })

  it('itemizes every component oil with wholesale cost and retail price', () => {
    const result = calculateAtelierPrice(blend())
    expect(result.costs.oils).toHaveLength(2)
    const lavender = result.costs.oils.find(o => o.name === 'Lavender')!
    // 15ml at $115/L = $1.725 wholesale; retail = wholesale / 0.51
    expect(lavender.ml).toBe(15)
    expect(lavender.wholesaleCost).toBeCloseTo(1.725, 10)
    expect(lavender.retailPrice).toBeCloseTo(1.725 / MARGIN_DIVISORS.pure, 10)
    const oilsSum = result.costs.oils.reduce((s, o) => s + o.retailPrice, 0)
    expect(oilsSum).toBeCloseTo(result.costs.oilsSubtotal, 10)
  })

  it('scales crystal cost by bottle size', () => {
    for (const size of BOTTLE_SIZES) {
      const result = calculateAtelierPrice(blend({ bottleSize: size }))
      expect(result.costs.crystals).toBeCloseTo(0.25 * CRYSTAL_COUNTS[`${size}ml`], 10)
    }
  })

  it('charges pure labor with margin in pure mode and carrier labor in carrier mode', () => {
    const pure = calculateAtelierPrice(blend({ mode: 'pure' }))
    expect(pure.costs.labor).toBeCloseTo(FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure, 10)
    const carrier = calculateAtelierPrice(blend({ mode: 'carrier' }))
    expect(carrier.costs.labor).toBeCloseTo(FIXED_COSTS.laborCarrier / MARGIN_DIVISORS.carrier, 10)
  })

  it('marks dropper bottles for pure mode and roller bottles for carrier mode', () => {
    expect(calculateAtelierPrice(blend({ mode: 'pure' })).costs.bottleType).toBe('dropper')
    expect(calculateAtelierPrice(blend({ mode: 'carrier' })).costs.bottleType).toBe('roller')
  })

  it('computes perDrop as total / (bottleSize × 20 drops)', () => {
    const result = calculateAtelierPrice(blend({ bottleSize: 15 }))
    expect(result.perDrop).toBeCloseTo(result.total / (15 * 20), 10)
  })
})

describe('carrier mode vs pure mode pricing', () => {
  it('carrier mode costs more than pure for identical components', () => {
    // Divisor 0.50 < 0.51 raises oil retail, and carrier labor is higher
    const pure = calculateAtelierPrice(blend({ mode: 'pure' }))
    const carrier = calculateAtelierPrice(blend({ mode: 'carrier' }))
    expect(carrier.total).toBeGreaterThan(pure.total)
  })

  it('applies the carrier margin divisor to the oil retail prices', () => {
    const result = calculateAtelierPrice(blend({ mode: 'carrier' }))
    const lavender = result.costs.oils.find(o => o.name === 'Lavender')!
    expect(lavender.retailPrice).toBeCloseTo(1.725 / MARGIN_DIVISORS.carrier, 10)
  })
})

describe('additional oil fees (min/max oil counts)', () => {
  it.each([
    [1, 0],
    [2, 0],
    [3, 1],
    [4, 2],
    [5, 3],
  ])('charges $%f extra for %i oils', (count, expectedFee) => {
    const components = [
      { oilId: 'lavender', ml: 6 },
      { oilId: 'lemon', ml: 6 },
      { oilId: 'cedarwood', ml: 6 },
      { oilId: 'peppermint', ml: 6 },
      { oilId: 'rosemary', ml: 6 },
    ].slice(0, count)
    const result = calculateAtelierPrice(blend({ components }))
    expect(result.costs.additionalOilFee).toBe(expectedFee)
  })

  it('handles the extreme-but-valid 5-oil blend at 1ml each in a 5ml bottle', () => {
    const result = calculateAtelierPrice({
      name: 'Maximalist',
      mode: 'pure',
      bottleSize: 5,
      components: [
        { oilId: 'lavender', ml: 1 },
        { oilId: 'lemon', ml: 1 },
        { oilId: 'myrrh', ml: 1 },
        { oilId: 'peppermint', ml: 1 },
        { oilId: 'cedarwood', ml: 1 },
      ],
    })
    expect(result.costs.additionalOilFee).toBe(3)
    expect(result.total).toBeGreaterThan(0)
    // launch-discounted (20%): .95 × 0.8 always ends in .x6
    expect(Math.round(result.total * 100) % 10).toBe(6)
    // Price must still cover the launch-discounted floor (labor + bottle +
    // crystals + fee); oil cost on top guarantees strictly above it
    const floorCosts = 0.25 * 2 + FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure + 5 + 3
    expect(result.total).toBeGreaterThan(applyLaunchDiscount(floorCosts))
  })
})

describe('unknown and degenerate inputs', () => {
  it('throws on an unknown oil id instead of pricing it as free', () => {
    expect(() =>
      calculateAtelierPrice(blend({ components: [{ oilId: 'essence-of-dragon', ml: 30 }] }))
    ).toThrow('Unknown oil in blend: essence-of-dragon')
  })

  it('throws when any single component is unknown, even alongside valid oils', () => {
    expect(() =>
      calculateAtelierPrice(
        blend({ components: [{ oilId: 'lavender', ml: 15 }, { oilId: 'snake-oil', ml: 15 }] })
      )
    ).toThrow(/snake-oil/)
  })

  it('BEHAVIOR PIN: prices an empty component list (checkout validation rejects it upstream)', () => {
    const result = calculateAtelierPrice(blend({ components: [] }))
    expect(result.costs.oilsSubtotal).toBe(0)
    expect(result.costs.additionalOilFee).toBe(0)
    // Base price = crystals + labor + bottle, rounded to .95, then
    // launch-discounted (20%): 17.95 → 14.36
    expect(result.total).toBe(applyLaunchDiscount(roundTo95(3 + FIXED_COSTS.laborPure / 0.51 + 5)))
  })

  it('BEHAVIOR PIN: crystalId and cordId do not affect the price', () => {
    const bare = calculateAtelierPrice(blend())
    const dressed = calculateAtelierPrice(blend({ crystalId: 'amethyst', cordId: 'hemp' }))
    expect(dressed.total).toBe(bare.total)
    expect(dressed.costs.cord).toBe(0)
  })

  it('prices a blend whose oil volume under-fills the bottle (engine trusts input)', () => {
    // Volume enforcement lives in lib/pricing/checkout-validation.ts; the
    // engine itself still produces a deterministic price.
    const result = calculateAtelierPrice(blend({ components: [{ oilId: 'lavender', ml: 1 }] }))
    expect(result.total).toBeGreaterThan(0)
    expect(Number.isFinite(result.total)).toBe(true)
  })
})

describe('formatPrice', () => {
  it.each([
    [24.95, '$24.95'],
    [0, '$0.00'],
    [178.95, '$178.95'],
  ])('formatPrice(%f) = %s', (input, expected) => {
    expect(formatPrice(input)).toBe(expected)
  })
})
