/**
 * Hardening Tests — lib/content/pricing-engine-final.ts
 * Table-driven price matrix invariants over every wholesale oil:
 * positivity, .95 endings, integer cents, size/cost monotonicity,
 * margins, carrier ratios, refill sanity, slug mapping, breakdown consistency.
 */

import {
  WHOLESALE_OILS,
  SLUG_TO_OIL_ID,
  FIXED_COSTS,
  CRYSTAL_COUNTS,
  MARGIN_DIVISORS,
  OIL_PRICING,
  getOilIdFromSlug,
  roundTo95,
  calculatePurePrice,
  calculateCarrierPrice,
  calculatePrice,
  getPriceBreakdown,
  getAllPrices,
  getOilPrices,
  formatPrice,
  getSavingsPercentage,
} from '@/lib/content/pricing-engine-final'
import { logger } from '@/lib/logging/logger'

const OIL_IDS = Object.keys(WHOLESALE_OILS)
const SIZES = [5, 10, 15, 20, 30] as const
const RATIOS = [0.05, 0.1, 0.25, 0.5, 0.75] as const
const REFILL_SIZES = [50, 100] as const

function centsOf(price: number): number {
  return Math.round(price * 100)
}

describe('roundTo95', () => {
  it.each([
    [0, 0.95],
    [0.5, 0.95],
    [0.94, 0.95],
    [0.95, 0.95],
    [0.96, 1.95],
    [1.95, 1.95],
    [2.0, 2.95],
    [24.5686, 24.95],
    [25.1078, 25.95],
  ])('roundTo95(%f) = %f', (input, expected) => {
    expect(roundTo95(input)).toBeCloseTo(expected, 10)
  })

  it('never rounds below the input', () => {
    for (let x = 0; x <= 200; x += 0.37) {
      expect(roundTo95(x)).toBeGreaterThanOrEqual(x)
    }
  })

  it('is monotonic non-decreasing', () => {
    let prev = -Infinity
    for (let x = 0; x <= 200; x += 0.13) {
      const r = roundTo95(x)
      expect(r).toBeGreaterThanOrEqual(prev)
      prev = r
    }
  })

  it('always produces a .95 ending', () => {
    for (let x = 0.01; x <= 300; x += 0.77) {
      expect(centsOf(roundTo95(x)) % 100).toBe(95)
    }
  })
})

describe('slug mapping', () => {
  it('every mapped slug resolves to a real wholesale oil', () => {
    for (const [slug, oilId] of Object.entries(SLUG_TO_OIL_ID)) {
      expect(WHOLESALE_OILS[oilId]).toBeDefined()
      expect(getOilIdFromSlug(slug)).toBe(oilId)
    }
  })

  it('passes through ids that are already oil ids', () => {
    for (const oilId of OIL_IDS) {
      expect(getOilIdFromSlug(oilId)).toBe(oilId)
    }
  })

  it('passes through unknown strings unchanged', () => {
    expect(getOilIdFromSlug('not-a-real-oil')).toBe('not-a-real-oil')
  })

  it('prices a slug identically to its canonical oil id', () => {
    expect(calculatePurePrice('lavender-essential-oil', 30)).toBe(calculatePurePrice('lavender', 30))
    expect(calculateCarrierPrice('myrrh-oil', 30, 0.25)).toBe(calculateCarrierPrice('myrrh', 30, 0.25))
  })
})

describe('pure price matrix — invariants over every oil', () => {
  it('produces a positive price for every oil and size', () => {
    for (const oilId of OIL_IDS) {
      for (const size of SIZES) {
        expect(calculatePurePrice(oilId, size)).toBeGreaterThan(0)
      }
    }
  })

  it('produces integer cents for every oil and size', () => {
    for (const oilId of OIL_IDS) {
      for (const size of SIZES) {
        const price = calculatePurePrice(oilId, size)
        expect(Math.abs(price * 100 - centsOf(price))).toBeLessThan(1e-6)
      }
    }
  })

  it('every pure price ends in .95', () => {
    for (const oilId of OIL_IDS) {
      for (const size of SIZES) {
        expect(centsOf(calculatePurePrice(oilId, size)) % 100).toBe(95)
      }
    }
  })

  it('is monotonic non-decreasing in bottle size for every oil', () => {
    for (const oilId of OIL_IDS) {
      const prices = SIZES.map(s => calculatePurePrice(oilId, s))
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
      }
    }
  })

  it('is strictly increasing in size for a luxury oil (myrrh)', () => {
    const prices = SIZES.map(s => calculatePurePrice('myrrh', s))
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it('is monotonic non-decreasing in wholesale cost at 30ml', () => {
    const sorted = [...OIL_IDS].sort(
      (a, b) => WHOLESALE_OILS[a].pricePerLiter - WHOLESALE_OILS[b].pricePerLiter
    )
    const prices = sorted.map(id => calculatePurePrice(id, 30))
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
    }
  })

  it('charges strictly more for the luxury oil than the cheapest oil at every size', () => {
    const cheapest = OIL_IDS.reduce((a, b) =>
      WHOLESALE_OILS[a].pricePerLiter <= WHOLESALE_OILS[b].pricePerLiter ? a : b
    )
    expect(cheapest).toBe('camphor-white')
    for (const size of SIZES) {
      expect(calculatePurePrice('myrrh', size)).toBeGreaterThan(calculatePurePrice(cheapest, size))
    }
  })
})

describe('carrier price matrix', () => {
  it('produces positive integer-cent .95 prices across oils × sizes × ratios', () => {
    for (const oilId of OIL_IDS) {
      for (const size of SIZES) {
        for (const ratio of RATIOS) {
          const price = calculateCarrierPrice(oilId, size, ratio)
          expect(price).toBeGreaterThan(0)
          expect(Math.abs(price * 100 - centsOf(price))).toBeLessThan(1e-6)
          expect(centsOf(price) % 100).toBe(95)
        }
      }
    }
  })

  it('is monotonic in ratio for every oil, with direction set by oil vs carrier cost', () => {
    // An essential oil cheaper per ml than the carrier oil ($83.33/L) makes
    // the blend CHEAPER as the ratio rises; pricier oils make it costlier.
    for (const oilId of OIL_IDS) {
      const prices = RATIOS.map(r => calculateCarrierPrice(oilId, 30, r))
      const oilPerMl = WHOLESALE_OILS[oilId].pricePerLiter / 1000
      const oilCheaperThanCarrier = oilPerMl < FIXED_COSTS.carrierOilPerMl
      for (let i = 1; i < prices.length; i++) {
        if (oilCheaperThanCarrier) {
          expect(prices[i]).toBeLessThanOrEqual(prices[i - 1])
        } else {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
        }
      }
    }
  })

  it('is strictly increasing in ratio for a luxury oil (myrrh) at 30ml', () => {
    const prices = RATIOS.map(r => calculateCarrierPrice('myrrh', 30, r))
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it('distinguishes every ratio step for myrrh at 30ml (known values)', () => {
    // Computed from the engine formula: 25 + 55r pre-round, rounded to .95
    expect(calculateCarrierPrice('myrrh', 30, 0.05)).toBeCloseTo(27.95, 10)
    expect(calculateCarrierPrice('myrrh', 30, 0.1)).toBeCloseTo(30.95, 10)
    expect(calculateCarrierPrice('myrrh', 30, 0.25)).toBeCloseTo(38.95, 10)
    expect(calculateCarrierPrice('myrrh', 30, 0.5)).toBeCloseTo(52.95, 10)
    expect(calculateCarrierPrice('myrrh', 30, 0.75)).toBeCloseTo(66.95, 10)
  })

  it('BEHAVIOR PIN: diluting a luxury oil is cheaper than buying it pure', () => {
    // Myrrh 30ml: pure $76.95 vs 75% carrier blend $66.95
    expect(calculateCarrierPrice('myrrh', 30, 0.75)).toBeLessThan(calculatePurePrice('myrrh', 30))
  })

  it('BEHAVIOR PIN: a carrier blend of a cheap oil costs MORE than pure', () => {
    // Camphor ($41.8/L) is cheaper per ml than the carrier oil, and carrier
    // blends carry higher labor — so enhancing raises the price. Reported as
    // a pricing-model quirk (design decision), not changed here.
    expect(calculatePurePrice('camphor-white', 30)).toBeCloseTo(20.95, 10)
    expect(calculateCarrierPrice('camphor-white', 30, 0.05)).toBeCloseTo(24.95, 10)
    expect(calculateCarrierPrice('camphor-white', 30, 0.05))
      .toBeGreaterThan(calculatePurePrice('camphor-white', 30))
  })
})

describe('refill pricing', () => {
  it('produces positive integer-cent .95 prices for every oil, size and mode', () => {
    for (const oilId of OIL_IDS) {
      for (const size of REFILL_SIZES) {
        for (const ratio of [null, ...RATIOS]) {
          const price = ratio === null
            ? calculatePurePrice(oilId, size, true)
            : calculateCarrierPrice(oilId, size, ratio, true)
          expect(price).toBeGreaterThan(0)
          expect(Math.abs(price * 100 - centsOf(price))).toBeLessThan(1e-6)
          expect(centsOf(price) % 100).toBe(95)
        }
      }
    }
  })

  it('100ml refill costs more than 50ml refill for every oil (pure and carrier)', () => {
    for (const oilId of OIL_IDS) {
      expect(calculatePurePrice(oilId, 100, true)).toBeGreaterThan(calculatePurePrice(oilId, 50, true))
      expect(calculateCarrierPrice(oilId, 100, 0.25, true)).toBeGreaterThan(
        calculateCarrierPrice(oilId, 50, 0.25, true)
      )
    }
  })

  it('luxury refill costs much more than cheap refill (cost-based pricing)', () => {
    // 100ml pure refills: myrrh oil alone is $100 wholesale vs $4.18 for camphor
    expect(calculatePurePrice('myrrh', 100, true)).toBeCloseTo(178.95, 10)
    expect(calculatePurePrice('camphor-white', 100, true)).toBeCloseTo(18.95, 10)
    expect(calculatePurePrice('myrrh', 100, true)).toBeGreaterThan(
      5 * calculatePurePrice('camphor-white', 100, true)
    )
  })

  it('refill price always exceeds the raw wholesale oil cost it contains', () => {
    for (const oilId of OIL_IDS) {
      const rawOilCost = (WHOLESALE_OILS[oilId].pricePerLiter / 1000) * 100
      expect(calculatePurePrice(oilId, 100, true)).toBeGreaterThan(rawOilCost)
    }
  })

  it('uses the 45% margin divisor for 50ml and 40% for 100ml', () => {
    // 50ml pure refill of lavender: (5.75/0.55) + 7.5 + (2.5/0.55) = 22.045 → 22.95
    expect(calculatePurePrice('lavender', 50, true)).toBeCloseTo(22.95, 10)
    // 100ml pure refill of lavender: (11.5/0.60) + 7.5 + (2.5/0.60) = 30.833 → 30.95
    expect(calculatePurePrice('lavender', 100, true)).toBeCloseTo(30.95, 10)
  })
})

describe('margins and price breakdown', () => {
  it('sells every oil above its itemized cost (margin is applied)', () => {
    for (const oilId of OIL_IDS) {
      for (const size of SIZES) {
        const breakdown = getPriceBreakdown({ oilId, sizeMl: size, type: 'pure' })
        expect(breakdown).not.toBeNull()
        expect(breakdown!.price).toBeGreaterThan(breakdown!.costs.total)
      }
    }
  })

  it('keeps the effective margin within a sane band (30–60%) across the matrix', () => {
    for (const oilId of OIL_IDS) {
      const breakdown = getPriceBreakdown({ oilId, sizeMl: 30, type: 'pure' })!
      const margin = parseFloat(breakdown.margin)
      expect(margin).toBeGreaterThan(30)
      expect(margin).toBeLessThan(60)
    }
  })

  it('breakdown cost components add up to the stated total cost', () => {
    for (const oilId of OIL_IDS) {
      const b = getPriceBreakdown({ oilId, sizeMl: 30, type: 'carrier', ratio: 0.25 })!
      const sum = b.costs.oil + b.costs.carrier + b.costs.buffer + b.costs.crystals + b.costs.labor
      expect(sum).toBeCloseTo(b.costs.total, 10)
    }
  })

  it('breakdown price matches the engine price for the same config', () => {
    for (const oilId of OIL_IDS) {
      const pure = getPriceBreakdown({ oilId, sizeMl: 15, type: 'pure' })!
      expect(pure.price).toBe(calculatePurePrice(oilId, 15))
      const carrier = getPriceBreakdown({ oilId, sizeMl: 15, type: 'carrier', ratio: 0.5 })!
      expect(carrier.price).toBe(calculateCarrierPrice(oilId, 15, 0.5))
    }
  })

  it('returns null breakdown for an unknown oil', () => {
    expect(getPriceBreakdown({ oilId: 'ghost-oil', sizeMl: 30, type: 'pure' })).toBeNull()
  })

  it('includes crystals only for new bottles and scales them by size', () => {
    const b5 = getPriceBreakdown({ oilId: 'lavender', sizeMl: 5, type: 'pure' })!
    const b30 = getPriceBreakdown({ oilId: 'lavender', sizeMl: 30, type: 'pure' })!
    expect(b5.costs.crystals).toBeCloseTo(CRYSTAL_COUNTS['5ml'] * FIXED_COSTS.crystalPerChip, 10)
    expect(b30.costs.crystals).toBeCloseTo(CRYSTAL_COUNTS['30ml'] * FIXED_COSTS.crystalPerChip, 10)
    const refill = getPriceBreakdown({ oilId: 'lavender', sizeMl: 100, type: 'pure', isRefill: true })!
    expect(refill.costs.crystals).toBe(0)
  })
})

describe('calculatePrice dispatcher', () => {
  it('delegates pure configs to calculatePurePrice', () => {
    expect(calculatePrice({ oilId: 'lavender', sizeMl: 20, type: 'pure' }))
      .toBe(calculatePurePrice('lavender', 20))
  })

  it('delegates carrier configs to calculateCarrierPrice with the given ratio', () => {
    expect(calculatePrice({ oilId: 'myrrh', sizeMl: 30, type: 'carrier', ratio: 0.5 }))
      .toBe(calculateCarrierPrice('myrrh', 30, 0.5))
  })

  it('defaults a missing carrier ratio to 0.25', () => {
    expect(calculatePrice({ oilId: 'myrrh', sizeMl: 30, type: 'carrier' }))
      .toBe(calculateCarrierPrice('myrrh', 30, 0.25))
  })

  it('passes the refill flag through for both types', () => {
    expect(calculatePrice({ oilId: 'lemon', sizeMl: 100, type: 'pure', isRefill: true }))
      .toBe(calculatePurePrice('lemon', 100, true))
    expect(calculatePrice({ oilId: 'lemon', sizeMl: 50, type: 'carrier', ratio: 0.1, isRefill: true }))
      .toBe(calculateCarrierPrice('lemon', 50, 0.1, true))
  })
})

describe('unknown oil handling', () => {
  it('returns 0 for unknown oils and logs an error', () => {
    expect(calculatePurePrice('essence-of-dragon', 30)).toBe(0)
    expect(logger.error).toHaveBeenCalled()
  })

  it('returns 0 for unknown oils in carrier mode too', () => {
    expect(calculateCarrierPrice('essence-of-dragon', 30, 0.25)).toBe(0)
  })
})

describe('getAllPrices structure', () => {
  it('exposes all five pure sizes', () => {
    const all = getAllPrices('lavender')
    for (const size of ['5ml', '10ml', '15ml', '20ml', '30ml'] as const) {
      expect(all.pure[size]).toBe(calculatePurePrice('lavender', parseInt(size)))
    }
  })

  it('only offers 50% ratios from 15ml up and 75% only at 30ml', () => {
    const all = getAllPrices('lavender')
    expect(all.carrier['5ml']).not.toHaveProperty('50%')
    expect(all.carrier['10ml']).not.toHaveProperty('50%')
    expect(all.carrier['15ml']).toHaveProperty('50%')
    expect(all.carrier['30ml']).toHaveProperty('75%')
    expect(all.carrier['20ml']).not.toHaveProperty('75%')
  })

  it('offers pure and all five ratios for both refill sizes', () => {
    const all = getAllPrices('lavender')
    for (const size of ['50ml', '100ml'] as const) {
      expect(all.refill[size].pure).toBeGreaterThan(0)
      for (const ratio of ['5%', '10%', '25%', '50%', '75%'] as const) {
        expect(all.refill[size][ratio]).toBeGreaterThan(0)
      }
    }
    expect(all.refill['100ml'].pure).toBeGreaterThan(all.refill['50ml'].pure)
  })

  it('matches direct engine calls for a carrier entry', () => {
    const all = getAllPrices('myrrh')
    expect(all.carrier['30ml']['25%']).toBe(calculateCarrierPrice('myrrh', 30, 0.25))
  })
})

describe('OIL_PRICING and getOilPrices', () => {
  it('contains exactly one entry per wholesale oil', () => {
    expect(OIL_PRICING).toHaveLength(OIL_IDS.length)
    expect(new Set(OIL_PRICING.map(o => o.id))).toEqual(new Set(OIL_IDS))
  })

  it('mirrors calculatePurePrice for every entry', () => {
    for (const entry of OIL_PRICING) {
      for (const size of SIZES) {
        expect(entry.prices[`${size}ml` as const]).toBe(calculatePurePrice(entry.id, size))
      }
    }
  })

  it('getOilPrices returns the engine prices for a known oil', () => {
    const prices = getOilPrices('myrrh')
    expect(prices['30ml']).toBe(calculatePurePrice('myrrh', 30))
  })

  it('getOilPrices falls back to default prices for an unknown oil', () => {
    expect(getOilPrices('ghost-oil')).toEqual({
      '5ml': 16.95, '10ml': 19.95, '15ml': 22.95, '20ml': 24.95, '30ml': 29.95,
    })
  })
})

describe('formatPrice and getSavingsPercentage', () => {
  it.each([
    [24.95, '$24.95'],
    [0, '$0.00'],
    [178.95, '$178.95'],
    [5, '$5.00'],
  ])('formatPrice(%f) = %s', (input, expected) => {
    expect(formatPrice(input)).toBe(expected)
  })

  it('computes whole-percent savings against the equivalent regular volume', () => {
    // Regular $10 for 30ml → 100ml equivalent is $33.33; refill $15 saves 55%
    expect(getSavingsPercentage(10, 15, 100, 30)).toBe(55)
  })

  it('rounds to the nearest percent', () => {
    // 24.95 * (50/30) = 41.583; (41.583 - 22.95) / 41.583 = 44.81% → 45
    expect(getSavingsPercentage(24.95, 22.95, 50, 30)).toBe(45)
  })

  it('returns 0 when the refill costs the same as the equivalent regular price', () => {
    expect(getSavingsPercentage(30, 100, 100, 30)).toBe(0)
  })

  it('goes negative when the refill is more expensive than buying regular bottles', () => {
    expect(getSavingsPercentage(10, 40, 100, 30)).toBe(-20)
  })
})

describe('engine constants sanity', () => {
  it('margin divisors sit between 0 and 1 (price = cost / divisor > cost)', () => {
    for (const divisor of Object.values(MARGIN_DIVISORS)) {
      expect(divisor).toBeGreaterThan(0)
      expect(divisor).toBeLessThan(1)
    }
  })

  it('crystal counts increase with bottle size', () => {
    const counts = ['5ml', '10ml', '15ml', '20ml', '30ml'].map(k => CRYSTAL_COUNTS[k])
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1])
    }
  })

  it('every wholesale oil has a positive price per liter and a known rarity', () => {
    for (const oil of Object.values(WHOLESALE_OILS)) {
      expect(oil.pricePerLiter).toBeGreaterThan(0)
      expect(['common', 'premium', 'luxury']).toContain(oil.rarity)
    }
  })
})
