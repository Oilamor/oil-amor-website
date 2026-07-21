/**
 * Hardening: Pricing engines, ratio engine, product config, crystal config
 *
 * Pins the invariants of the pricing pipeline (lib/content/pricing-engine-final,
 * lib/content/pricing-engine), the ratio engine, bottle/crystal configuration
 * and product-config constants. Money values here are DOLLARS (the pricing
 * engine works in dollars and rounds to .95); cents conversion happens at the
 * checkout/email layer.
 */

import {
  WHOLESALE_OILS,
  FIXED_COSTS,
  CRYSTAL_COUNTS,
  MARGIN_DIVISORS,
  SLUG_TO_OIL_ID,
  roundTo95,
  calculatePurePrice,
  calculateCarrierPrice,
  calculatePrice,
  getPriceBreakdown,
  getAllPrices,
  OIL_PRICING,
  getOilPrices,
  formatPrice,
  getSavingsPercentage,
  getOilIdFromSlug,
} from '@/lib/content/pricing-engine-final'
import {
  calculateRefillPrice,
  calculatePriceBreakdown,
  calculateProductPrice,
  calculateRefillSavings,
  getAllPricesForOil,
  getRatioPricePreviews,
  PRODUCT_TYPES,
} from '@/lib/content/pricing-engine'
import {
  BOTTLE_SIZES,
  CARRIER_OILS,
  CORD_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_COST,
  REFILL_SIZES,
  getRefillEligibleOils,
  getLockedOils,
  getRefillSavings,
} from '@/lib/content/product-config'
import {
  CARRIER_RATIOS,
  RATIO_PRESETS,
  getRatioBenefits,
  getSafetyWarnings,
  getRecommendedRatio,
  USE_CASE_DESCRIPTIONS,
  type UseCase,
} from '@/lib/content/ratio-engine'
import {
  BOTTLE_CRYSTAL_MAPPING,
  getCrystalCountForBottle,
  getCrystalWeightForBottle,
  getBottleDescription,
  getCrystalConfigForBottle,
  getAllBottleConfigs,
  calculateCrystalCount,
  isValidBottleSize,
  getBottleSizeOptions,
  getNextBottleSize,
  getPreviousBottleSize,
  compareBottleSizes,
} from '@/lib/content/crystal-config'
import { logger } from '@/lib/logging/logger'

const SAMPLE_OILS = ['lavender', 'tea-tree', 'myrrh', 'camphor-white', 'bergamot-fcf']
const ALL_SIZES = [5, 10, 15, 20, 30]

describe('roundTo95', () => {
  it.each([
    [10.0, 10.95],
    [10.94, 10.95],
    [10.95, 10.95],
    [10.96, 11.95],
    [0.0, 0.95],
    [16.5, 16.95],
  ])('roundTo95(%f) = %f', (input, expected) => {
    expect(roundTo95(input)).toBeCloseTo(expected, 5)
  })

  it.each([0, 5.2, 13.37, 99.99, 1000.01])('result ends in .95 and is >= input (%f)', (input) => {
    const result = roundTo95(input)
    expect(result).toBeGreaterThanOrEqual(input)
    expect(Math.round((result % 1) * 100)).toBe(95)
    expect(result - input).toBeLessThan(1)
  })
})

describe('calculatePurePrice', () => {
  it.each(SAMPLE_OILS)('%s: price increases monotonically with bottle size', (oilId) => {
    const prices = ALL_SIZES.map((size) => calculatePurePrice(oilId, size))
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it.each(SAMPLE_OILS)('%s: refill is cheaper than a new bottle at the same size', (oilId) => {
    for (const size of [5, 15, 30]) {
      const newBottle = calculatePurePrice(oilId, size, false)
      const refill = calculatePurePrice(oilId, size, true)
      expect(refill).toBeGreaterThan(0)
      expect(refill).toBeLessThan(newBottle)
    }
  })

  it('returns 0 and logs an error for an unknown slug', () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    expect(calculatePurePrice('no-such-oil', 10)).toBe(0)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('accepts catalog handles via the slug mapping', () => {
    expect(calculatePurePrice('lavender-essential-oil', 10)).toBe(calculatePurePrice('lavender', 10))
  })
})

describe('calculateCarrierPrice', () => {
  it('returns 0 and logs for an unknown oil', () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    expect(calculateCarrierPrice('nope', 10, 0.25)).toBe(0)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it.each(SAMPLE_OILS)('%s: carrier blend prices are positive and end in .95', (oilId) => {
    for (const ratio of [0.05, 0.25, 0.5]) {
      const price = calculateCarrierPrice(oilId, 15, ratio)
      expect(price).toBeGreaterThan(0)
      expect(Math.round((price % 1) * 100)).toBe(95)
    }
  })

  it('refill carrier price excludes crystal cost (cheaper than new bottle)', () => {
    const newBottle = calculateCarrierPrice('lavender', 30, 0.25, false)
    const refill = calculateCarrierPrice('lavender', 30, 0.25, true)
    expect(refill).toBeLessThan(newBottle)
  })
})

describe('calculatePrice / getPriceBreakdown', () => {
  it('dispatches pure type without a ratio', () => {
    expect(calculatePrice({ oilId: 'lavender', sizeMl: 10, type: 'pure' })).toBe(
      calculatePurePrice('lavender', 10)
    )
  })

  it('dispatches carrier type with the default 25% ratio', () => {
    expect(calculatePrice({ oilId: 'lavender', sizeMl: 10, type: 'carrier' })).toBe(
      calculateCarrierPrice('lavender', 10, 0.25)
    )
  })

  it('getPriceBreakdown returns null for an unknown oil', () => {
    expect(getPriceBreakdown({ oilId: 'ghost', sizeMl: 10, type: 'pure' })).toBeNull()
  })

  it('breakdown costs sum to the stated total cost', () => {
    const breakdown = getPriceBreakdown({ oilId: 'lavender', sizeMl: 10, type: 'pure' })!
    const { costs } = breakdown
    expect(costs.oil + costs.carrier + costs.buffer + costs.crystals + costs.labor).toBeCloseTo(costs.total, 5)
  })

  it('breakdown includes crystals for new bottles but not for refills', () => {
    const fresh = getPriceBreakdown({ oilId: 'lavender', sizeMl: 10, type: 'pure' })!
    const refill = getPriceBreakdown({ oilId: 'lavender', sizeMl: 10, type: 'pure', isRefill: true })!
    expect(fresh.costs.crystals).toBeGreaterThan(0)
    expect(refill.costs.crystals).toBe(0)
  })

  it('breakdown margin is a parseable percentage string', () => {
    const breakdown = getPriceBreakdown({ oilId: 'lavender', sizeMl: 30, type: 'carrier', ratio: 0.25 })!
    const margin = Number(breakdown.margin)
    expect(Number.isFinite(margin)).toBe(true)
    expect(margin).toBeGreaterThan(0)
    expect(margin).toBeLessThan(100)
  })

  it('breakdown price matches calculatePrice for the same config', () => {
    const config = { oilId: 'ginger', sizeMl: 20, type: 'carrier' as const, ratio: 0.1 }
    expect(getPriceBreakdown(config)!.price).toBe(calculatePrice(config))
  })
})

describe('getAllPrices / OIL_PRICING / getOilPrices', () => {
  it('getAllPrices exposes pure, carrier and refill tiers', () => {
    const all = getAllPrices('lavender')
    expect(Object.keys(all.pure)).toEqual(['5ml', '10ml', '15ml', '20ml', '30ml'])
    expect(all.carrier['30ml']['75%']).toBeGreaterThan(0)
    expect(all.refill['50ml'].pure).toBeGreaterThan(0)
    expect(all.refill['100ml'].pure).toBeGreaterThan(0)
  })

  it('OIL_PRICING covers every wholesale oil with matching 10ml price', () => {
    expect(OIL_PRICING.length).toBe(Object.keys(WHOLESALE_OILS).length)
    for (const entry of OIL_PRICING) {
      expect(entry.prices['10ml']).toBe(calculatePurePrice(entry.id, 10))
    }
  })

  it('getOilPrices returns catalog prices for known oils', () => {
    expect(getOilPrices('lavender')['5ml']).toBe(calculatePurePrice('lavender', 5))
  })

  it('getOilPrices falls back to default prices for unknown oils', () => {
    expect(getOilPrices('ghost')).toEqual({ '5ml': 16.95, '10ml': 19.95, '15ml': 22.95, '20ml': 24.95, '30ml': 29.95 })
  })
})

describe('pricing-engine formatPrice / getSavingsPercentage / getOilIdFromSlug', () => {
  it.each([
    [16.95, '$16.95'],
    [0, '$0.00'],
    [45, '$45.00'],
    [45.5, '$45.50'],
    [1000, '$1000.00'],
  ])('formatPrice(%f) = %s (dollars, 2 decimals)', (input, expected) => {
    expect(formatPrice(input)).toBe(expected)
  })

  it('getSavingsPercentage computes whole-percent savings', () => {
    // 100ml refill vs 10x 10ml bottles at $20 each = $200
    expect(getSavingsPercentage(20, 100, 100, 10)).toBe(50)
    expect(getSavingsPercentage(20, 200, 100, 10)).toBe(0)
  })

  it('getOilIdFromSlug maps known slugs and passes through unknown ones', () => {
    expect(getOilIdFromSlug('lavender-essential-oil')).toBe('lavender')
    expect(getOilIdFromSlug('lavender')).toBe('lavender')
    expect(getOilIdFromSlug('unmapped-slug')).toBe('unmapped-slug')
  })

  it('SLUG_TO_OIL_ID values all resolve to wholesale oils', () => {
    for (const oilId of Object.values(SLUG_TO_OIL_ID)) {
      expect(WHOLESALE_OILS[oilId]).toBeDefined()
    }
  })
})

describe('pricing constants sanity', () => {
  it('FIXED_COSTS are all positive', () => {
    for (const value of Object.values(FIXED_COSTS)) {
      expect(value).toBeGreaterThan(0)
    }
  })

  it('MARGIN_DIVISORS are between 0 and 1 (dividing by them marks the price up)', () => {
    for (const divisor of Object.values(MARGIN_DIVISORS)) {
      expect(divisor).toBeGreaterThan(0)
      expect(divisor).toBeLessThan(1)
    }
  })

  it('CRYSTAL_COUNTS match product-config bottle crystalChips', () => {
    for (const size of BOTTLE_SIZES) {
      expect(CRYSTAL_COUNTS[size.id]).toBe(size.crystalChips)
    }
  })
})

describe('pricing-engine backward-compat layer', () => {
  it('calculateRefillPrice delegates to the engine refill price (no heuristic)', () => {
    // 2026-07-21: algorithm-driven refill pricing — was "85% of pure".
    expect(calculateRefillPrice('lavender', 100)).toBe(calculatePurePrice('lavender', 100, true))
    expect(calculateRefillPrice('lavender', 100)).toBe(30.95)
  })

  it('calculatePriceBreakdown returns a zeroed breakdown for unknown oils', () => {
    const breakdown = calculatePriceBreakdown('ghost', '10ml', 'pure')
    expect(breakdown.total).toBe(0)
    expect(breakdown.subtotal).toBe(0)
    expect(breakdown.wholesaleOilCost).toBe(0)
  })

  it('calculatePriceBreakdown total matches the engine price for known oils', () => {
    const breakdown = calculatePriceBreakdown('lavender', '10ml', 'pure')
    expect(breakdown.total).toBe(calculatePurePrice('lavender', 10))
  })

  it('calculateProductPrice handles pure and carrier product types', () => {
    expect(calculateProductPrice('lavender', '10ml', 'pure')).toBe(calculatePurePrice('lavender', 10))
    expect(calculateProductPrice('lavender', '10ml', 'carrier')).toBe(calculateCarrierPrice('lavender', 10, 0.25))
  })

  it('calculateRefillSavings reports the fixed 15% model', () => {
    const savings = calculateRefillSavings('lavender', '30ml')
    const original = calculateCarrierPrice('lavender', 30, 0.25)
    expect(savings.originalPrice).toBe(original)
    expect(savings.refillPrice).toBe(Math.round(original * 0.85 * 100) / 100)
    expect(savings.savingsPercent).toBe(15)
  })

  it('getAllPricesForOil covers every bottle size', () => {
    const prices = getAllPricesForOil('lavender')
    expect(Object.keys(prices).sort()).toEqual(['10ml', '15ml', '20ml', '30ml', '5ml'])
  })

  it('getRatioPricePreviews returns one preview per ratio preset with engine prices', () => {
    const previews = getRatioPricePreviews('lavender', '30ml')
    expect(previews.length).toBe(RATIO_PRESETS.length)
    for (const preview of previews) {
      expect(preview.price).toBe(
        calculateCarrierPrice('lavender', 30, preview.ratio.essentialOilPercent / 100)
      )
      expect(preview.savingsVsPure).toBeCloseTo(calculatePurePrice('lavender', 30) - preview.price, 5)
    }
  })

  it('PRODUCT_TYPES exposes pure and carrier with applicator cost', () => {
    expect(PRODUCT_TYPES.map((t) => t.id).sort()).toEqual(['carrier', 'pure'])
    for (const type of PRODUCT_TYPES) {
      expect(type.applicatorCost).toBeGreaterThan(0)
    }
  })
})

describe('product-config integrity', () => {
  it('BOTTLE_SIZES have unique ids and cover the 5ml–30ml range', () => {
    const ids = BOTTLE_SIZES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    const volumes = BOTTLE_SIZES.map((s) => s.volume)
    expect([...volumes].sort((a, b) => a - b)).toEqual([5, 10, 15, 20, 30])
    for (const size of BOTTLE_SIZES) {
      expect(size.volume).toBeGreaterThan(0)
      expect(size.crystalChips).toBeGreaterThan(0)
      expect(size.packagingCost).toBeGreaterThan(0)
    }
  })

  it('CARRIER_OILS have unique ids and the pure option is free', () => {
    const ids = CARRIER_OILS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    const pure = CARRIER_OILS.find((c) => c.id === 'pure')!
    expect(pure.price).toBe(0)
    expect(pure.costPer30ml).toBe(0)
  })

  it('CORD_OPTIONS have unique ids, non-negative prices and hex colors', () => {
    const ids = CORD_OPTIONS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const cord of CORD_OPTIONS) {
      expect(cord.price).toBeGreaterThanOrEqual(0)
      expect(cord.color).toMatch(/^#[0-9a-fA-F]{3,8}$/)
      expect(cord.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('shipping constants are sane', () => {
    expect(FREE_SHIPPING_THRESHOLD).toBeGreaterThan(0)
    expect(DEFAULT_SHIPPING_COST).toBeGreaterThan(0)
    expect(DEFAULT_SHIPPING_COST).toBeLessThan(FREE_SHIPPING_THRESHOLD)
  })

  it('REFILL_SIZES are the documented 50ml/100ml bottles', () => {
    expect(REFILL_SIZES).toEqual(['50ml', '100ml'])
  })

  it('getRefillEligibleOils dedupes purchase history', () => {
    const history = [
      { oilId: 'lavender', size: '10ml', date: new Date(), orderId: '1' },
      { oilId: 'lavender', size: '30ml', date: new Date(), orderId: '2' },
      { oilId: 'myrrh', size: '5ml', date: new Date(), orderId: '3' },
    ]
    expect(getRefillEligibleOils(history).sort()).toEqual(['lavender', 'myrrh'])
    expect(getRefillEligibleOils([])).toEqual([])
  })

  it('getLockedOils currently locks nothing', () => {
    expect(getLockedOils([])).toEqual([])
  })
})

describe('ratio engine', () => {
  it.each(CARRIER_RATIOS)('$id: essential + carrier percents sum to 100', (preset) => {
    expect(preset.essentialOilPercent + preset.carrierOilPercent).toBe(100)
  })

  it('ratio presets have unique ids and never exceed 75% essential oil', () => {
    const ids = CARRIER_RATIOS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const preset of CARRIER_RATIOS) {
      expect(preset.essentialOilPercent).toBeLessThanOrEqual(75)
      expect(preset.warnings.length).toBeGreaterThan(0)
      expect(preset.benefits.length).toBeGreaterThan(0)
    }
  })

  it('RATIO_PRESETS is the same list as CARRIER_RATIOS', () => {
    expect(RATIO_PRESETS).toBe(CARRIER_RATIOS)
  })

  it('getRatioBenefits returns curated benefits for documented oils', () => {
    expect(getRatioBenefits('lavender', 'micro')!.benefit).toBe('Sleep Support')
    expect(getRatioBenefits('myrrh', 'max')!.benefit).toBe('Sacred Anointing')
  })

  it('getRatioBenefits falls back to defaults for oils without curated entries', () => {
    const fallback = getRatioBenefits('oregano', 'balanced')!
    expect(fallback.ratioId).toBe('balanced')
    expect(fallback.benefit.length).toBeGreaterThan(0)
    expect(fallback.explanation).toContain('25%')
  })

  it('getSafetyWarnings flags hot oils above safe ratios', () => {
    const strong = CARRIER_RATIOS.find((r) => r.id === 'strong')!
    const warnings = getSafetyWarnings('cinnamon-bark', strong)
    expect(warnings.some((w) => w.condition === 'Hot Oil')).toBe(true)
  })

  it('getSafetyWarnings flags citrus photosensitivity above 10%', () => {
    const balanced = CARRIER_RATIOS.find((r) => r.id === 'balanced')!
    for (const citrus of ['lemon', 'lemon-myrtle', 'may-chang']) {
      const warnings = getSafetyWarnings(citrus, balanced)
      expect(warnings.some((w) => w.condition === 'Photosensitivity')).toBe(true)
    }
  })

  it('getSafetyWarnings does not flag citrus at micro dose', () => {
    const micro = CARRIER_RATIOS.find((r) => r.id === 'micro')!
    expect(getSafetyWarnings('lemon', micro).some((w) => w.condition === 'Photosensitivity')).toBe(false)
  })

  it('getSafetyWarnings always warns for strong and max concentrations', () => {
    expect(getSafetyWarnings('lavender', CARRIER_RATIOS.find((r) => r.id === 'strong')!).length).toBeGreaterThan(0)
    expect(getSafetyWarnings('lavender', CARRIER_RATIOS.find((r) => r.id === 'max')!).length).toBeGreaterThan(0)
    expect(getSafetyWarnings('lavender', CARRIER_RATIOS.find((r) => r.id === 'micro')!)).toEqual([])
  })

  it.each([
    ['daily', 'balanced'],
    ['sensitive', 'gentle'],
    ['therapeutic', 'strong'],
    ['spiritual', 'balanced'],
    ['facial', 'micro'],
    ['children', 'micro'],
    ['intensive', 'max'],
  ] as Array<[UseCase, string]>)('getRecommendedRatio(%s) = %s', (useCase, expected) => {
    expect(getRecommendedRatio(useCase)).toBe(expected)
  })

  it('every use case has a description and a valid recommendation', () => {
    for (const useCase of Object.keys(USE_CASE_DESCRIPTIONS) as UseCase[]) {
      expect(USE_CASE_DESCRIPTIONS[useCase].label.length).toBeGreaterThan(0)
      expect(CARRIER_RATIOS.some((r) => r.id === getRecommendedRatio(useCase))).toBe(true)
    }
  })
})

describe('crystal-config', () => {
  it('maps every bottle size to a positive count and weight', () => {
    for (const [size, config] of Object.entries(BOTTLE_CRYSTAL_MAPPING)) {
      expect(config.count).toBeGreaterThan(0)
      expect(config.weight).toBeGreaterThan(0)
      expect(config.description.length).toBeGreaterThan(0)
      expect(isValidBottleSize(size)).toBe(true)
    }
  })

  it('getCrystalCountForBottle/getCrystalWeightForBottle return configured values', () => {
    expect(getCrystalCountForBottle('30ml')).toBe(12)
    expect(getCrystalWeightForBottle('30ml')).toBe(50)
    expect(getBottleDescription('5ml')).toBe('Crystal Tease')
  })

  it('falls back to 10ml defaults for unknown sizes', () => {
    expect(getCrystalCountForBottle('50ml' as never)).toBe(4)
    expect(getCrystalWeightForBottle('50ml' as never)).toBe(15)
    expect(getBottleDescription('50ml' as never)).toBe('Crystal Touch')
    expect(getCrystalConfigForBottle('50ml' as never)).toEqual({ count: 4, weight: 15, description: 'Crystal Touch' })
  })

  it('calculateCrystalCount applies and rounds the multiplier', () => {
    expect(calculateCrystalCount('30ml')).toBe(12)
    expect(calculateCrystalCount('30ml', 0.5)).toBe(6)
    // 2026-07-21 fix: 5ml base count is 2 (unified on CRYSTAL_COUNTS from
    // pricing-engine-final); was pinned at 3 before the fix.
    expect(getCrystalCountForBottle('5ml')).toBe(2)
    expect(calculateCrystalCount('5ml', 1.5)).toBe(Math.round(2 * 1.5))
  })

  it('isValidBottleSize rejects unknown and malformed sizes', () => {
    expect(isValidBottleSize('5ml')).toBe(true)
    expect(isValidBottleSize('50ml')).toBe(false)
    expect(isValidBottleSize('')).toBe(false)
    expect(isValidBottleSize('5ML')).toBe(false)
  })

  it('getAllBottleConfigs and getBottleSizeOptions cover all sizes', () => {
    expect(getAllBottleConfigs().map((c) => c.size)).toEqual(['5ml', '10ml', '15ml', '20ml', '30ml'])
    const options = getBottleSizeOptions()
    expect(options.length).toBe(5)
    for (const option of options) {
      expect(option.crystalCount).toBe(BOTTLE_CRYSTAL_MAPPING[option.value].count)
    }
  })

  it('bottle size navigation walks the ladder correctly', () => {
    expect(getNextBottleSize('5ml')).toBe('10ml')
    expect(getNextBottleSize('30ml')).toBeNull()
    expect(getPreviousBottleSize('30ml')).toBe('20ml')
    expect(getPreviousBottleSize('5ml')).toBeNull()
  })

  it('compareBottleSizes orders by catalog position', () => {
    expect(compareBottleSizes('5ml', '30ml')).toBe(-1)
    expect(compareBottleSizes('30ml', '5ml')).toBe(1)
    expect(compareBottleSizes('15ml', '15ml')).toBe(0)
  })
})

describe('getRefillSavings (2026-07-21 fix)', () => {
  // Previously this helper passed a string sizeId as sizeMl and the carrier
  // id 'jojoba' as the oil ratio, so savingsPercent came out NaN ("NaN%" in
  // refill-dashboard). Now sizes are parsed and prices are engine-driven.
  it('returns finite prices and a sane percent for a known oil', () => {
    const savings = getRefillSavings('lavender', '50ml-refill')
    expect(Number.isFinite(savings.originalPrice)).toBe(true)
    expect(Number.isFinite(savings.refillPrice)).toBe(true)
    expect(Number.isFinite(savings.savingsPercent)).toBe(true)
    expect(savings.originalPrice).toBeGreaterThan(0)
    expect(savings.refillPrice).toBeGreaterThan(0)
    expect(savings.refillPrice).toBeLessThan(savings.originalPrice)
    expect(savings.savings).toBeCloseTo(savings.originalPrice - savings.refillPrice, 2)
    expect(savings.savingsPercent).toBeGreaterThan(0)
    expect(savings.savingsPercent).toBeLessThan(100)
  })

  it('never renders NaN% — unknown oils yield 0 percent, not NaN', () => {
    const savings = getRefillSavings('not-an-oil', '50ml-refill')
    expect(savings.originalPrice).toBe(0)
    expect(savings.savingsPercent).toBe(0)
    expect(Number.isNaN(savings.savingsPercent)).toBe(false)
  })
})
