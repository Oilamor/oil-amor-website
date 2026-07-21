/**
 * Checkout Price Validation Tests
 * Server-side canonical price validation: standard oils, gift cards, custom blends
 */

import {
  validateCheckoutItem,
  validateCheckoutItems,
  GIFT_CARD_DENOMINATIONS_CENTS,
  CheckoutItem,
} from '@/lib/pricing/checkout-validation'
import { calculatePurePrice, calculateCarrierPrice } from '@/lib/content/pricing-engine-final'
import { calculateAtelierPrice } from '@/lib/atelier/atelier-engine'

function cents(price: number): number {
  return Math.round(price * 100)
}

function standardItem(overrides: Partial<CheckoutItem> = {}): CheckoutItem {
  return {
    name: 'Lavender',
    amount: cents(calculatePurePrice('lavender', 30)),
    quantity: 1,
    metadata: { oilId: 'lavender', size: '30ml', type: 'pure' },
    ...overrides,
  }
}

function giftCardItem(denominationDollars: number, amountCents?: number): CheckoutItem {
  return {
    name: `Oil Amor Gift Card - $${denominationDollars}`,
    amount: amountCents ?? denominationDollars * 100,
    quantity: 1,
    metadata: { type: 'gift-card', giftCardAmount: String(denominationDollars) },
  }
}

function customMixItem(mix: any, amount?: number): CheckoutItem {
  const canonical = amount ?? cents(
    calculateAtelierPrice({
      name: mix.recipeName || 'Test Blend',
      mode: mix.mode || 'pure',
      bottleSize: mix.totalVolume,
      components: mix.oils.map((o: any) => ({ oilId: o.oilId, ml: o.ml })),
    }).total
  )
  return {
    name: mix.recipeName || 'Test Blend',
    amount: canonical,
    quantity: 1,
    metadata: { customMix: JSON.stringify(mix) },
  }
}

const VALID_PURE_MIX = {
  recipeName: 'Sleep Blend',
  mode: 'pure',
  oils: [
    { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
    { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 50 },
  ],
  totalVolume: 30,
}

const VALID_CARRIER_MIX = {
  recipeName: 'Gentle Blend',
  mode: 'carrier',
  carrierRatio: 25,
  oils: [
    { oilId: 'lavender', oilName: 'Lavender', ml: 4, percentage: 53 },
    { oilId: 'lemon', oilName: 'Lemon', ml: 3.5, percentage: 47 },
  ],
  totalVolume: 30,
}

describe('validateCheckoutItem — standard oils', () => {
  it('accepts a pure oil at the canonical price', () => {
    expect(validateCheckoutItem(standardItem()).valid).toBe(true)
  })

  it('accepts prices within the 2c tolerance', () => {
    const item = standardItem()
    item.amount += 2
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('rejects prices outside the 2c tolerance', () => {
    const item = standardItem()
    item.amount -= 50
    const result = validateCheckoutItem(item)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Price mismatch/)
  })

  it('rejects items without product identifiers', () => {
    const result = validateCheckoutItem(standardItem({ metadata: {} }))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/product identifiers/)
  })

  it('rejects unknown oil ids instead of pricing them as free', () => {
    const result = validateCheckoutItem(
      standardItem({ metadata: { oilId: 'dragon-sweat', size: '30ml', type: 'pure' } })
    )
    expect(result.valid).toBe(false)
  })

  it('rejects unparseable sizes', () => {
    const result = validateCheckoutItem(
      standardItem({ metadata: { oilId: 'lavender', size: 'huge', type: 'pure' } })
    )
    expect(result.valid).toBe(false)
  })

  it('accepts a carrier blend when the ratio is a configurator preset name', () => {
    const item: CheckoutItem = {
      name: 'Lavender Carrier Blend',
      amount: cents(calculateCarrierPrice('lavender', 30, 0.25)),
      quantity: 1,
      metadata: { oilId: 'lavender', size: '30ml', type: 'carrier', ratio: 'Balanced Harmony' },
    }
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('accepts a carrier blend with a decimal ratio string', () => {
    const item: CheckoutItem = {
      name: 'Lavender Carrier Blend',
      amount: cents(calculateCarrierPrice('lavender', 30, 0.5)),
      quantity: 1,
      metadata: { oilId: 'lavender', size: '30ml', type: 'carrier', ratio: '0.5' },
    }
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('accepts a carrier blend with a percentage ratio string', () => {
    const item: CheckoutItem = {
      name: 'Lavender Carrier Blend',
      amount: cents(calculateCarrierPrice('lavender', 30, 0.5)),
      quantity: 1,
      metadata: { oilId: 'lavender', size: '30ml', type: 'carrier', ratio: '50' },
    }
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('rejects a carrier blend priced for a different ratio', () => {
    // tea-tree 30ml: 25% → $25.95, 50% → $26.95 (canonically distinct)
    const item: CheckoutItem = {
      name: 'Tea Tree Carrier Blend',
      // Priced for 50% essential oil, but the declared ratio is 25%
      amount: cents(calculateCarrierPrice('tea-tree', 30, 0.5)),
      quantity: 1,
      metadata: { oilId: 'tea-tree', size: '30ml', type: 'carrier', ratio: 'Balanced Harmony' },
    }
    expect(validateCheckoutItem(item).valid).toBe(false)
  })

  it('rejects zero and negative amounts', () => {
    expect(validateCheckoutItem(standardItem({ amount: 0 })).valid).toBe(false)
    expect(validateCheckoutItem(standardItem({ amount: -500 })).valid).toBe(false)
  })

  it('rejects non-integer or zero quantities', () => {
    expect(validateCheckoutItem(standardItem({ quantity: 0 })).valid).toBe(false)
    expect(validateCheckoutItem(standardItem({ quantity: 1.5 })).valid).toBe(false)
  })
})

describe('validateCheckoutItem — gift cards', () => {
  it('accepts every denomination offered on the gift cards page', () => {
    for (const denominationCents of GIFT_CARD_DENOMINATIONS_CENTS) {
      const item = giftCardItem(denominationCents / 100)
      expect(validateCheckoutItem(item).valid).toBe(true)
    }
  })

  it('rejects a denomination we do not sell', () => {
    const result = validateCheckoutItem(giftCardItem(75))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/denomination/)
  })

  it('rejects when the charged amount does not match the declared denomination', () => {
    const result = validateCheckoutItem(giftCardItem(100, 5000))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/does not match the gift card denomination/)
  })

  it('rejects gift cards without a declared denomination', () => {
    const item: CheckoutItem = {
      name: 'Gift Card',
      amount: 10000,
      quantity: 1,
      metadata: { type: 'gift-card' },
    }
    const result = validateCheckoutItem(item)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/missing denomination/)
  })

  it('rejects a $1 gift card (price manipulation)', () => {
    const result = validateCheckoutItem(giftCardItem(1))
    expect(result.valid).toBe(false)
  })
})

describe('validateCheckoutItem — custom blends', () => {
  it('accepts a valid pure blend priced canonically', () => {
    expect(validateCheckoutItem(customMixItem(VALID_PURE_MIX)).valid).toBe(true)
  })

  it('accepts a valid carrier blend priced canonically', () => {
    expect(validateCheckoutItem(customMixItem(VALID_CARRIER_MIX)).valid).toBe(true)
  })

  it('rejects blends whose oil volumes under-fill the bottle (Σ(ml) < totalVolume)', () => {
    const mix = {
      ...VALID_PURE_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 3, percentage: 50 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 2, percentage: 50 },
      ],
    }
    const result = validateCheckoutItem(customMixItem(mix, 500))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/do not add up/)
  })

  it('rejects blends whose oil volumes exceed the bottle (Σ(ml) > totalVolume)', () => {
    const mix = {
      ...VALID_PURE_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 16, percentage: 50 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 14.6, percentage: 50 },
      ],
    }
    const result = validateCheckoutItem(customMixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/do not add up/)
  })

  it('accepts blends within the volume tolerance', () => {
    const mix = {
      ...VALID_PURE_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15.1, percentage: 50 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 50 },
      ],
    }
    expect(validateCheckoutItem(customMixItem(mix)).valid).toBe(true)
  })

  it('rejects carrier blends whose volumes do not match volume × ratio', () => {
    const mix = {
      ...VALID_CARRIER_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 50 },
      ],
    }
    const result = validateCheckoutItem(customMixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/do not add up/)
  })

  it('rejects blends containing unknown oils', () => {
    const mix = {
      ...VALID_PURE_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
        { oilId: 'essence-of-dragon', oilName: 'Dragon', ml: 15, percentage: 50 },
      ],
    }
    const result = validateCheckoutItem(customMixItem(mix, 2495))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Unknown oil/)
  })

  it('rejects blends whose percentages are inconsistent', () => {
    const mix = {
      ...VALID_PURE_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 10 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 10 },
      ],
    }
    const result = validateCheckoutItem(customMixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/percentages/)
  })

  it('rejects blends with a manipulated price even when volumes are valid', () => {
    const result = validateCheckoutItem(customMixItem(VALID_PURE_MIX, 100))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Price mismatch/)
  })

  it('rejects blends without a total volume', () => {
    const mix = { ...VALID_PURE_MIX, totalVolume: undefined }
    const result = validateCheckoutItem(customMixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/total volume/)
  })

  it('rejects blends with oils missing ml amounts', () => {
    const mix = {
      ...VALID_PURE_MIX,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', percentage: 50 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 50 },
      ],
    }
    const result = validateCheckoutItem(customMixItem(mix, 2495))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/positive ml/)
  })

  it('rejects malformed customMix JSON', () => {
    const item: CheckoutItem = {
      name: 'Broken Blend',
      amount: 2495,
      quantity: 1,
      metadata: { customMix: '{not json' },
    }
    const result = validateCheckoutItem(item)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/malformed mix data/)
  })

  it('rejects blends with an empty oil list', () => {
    const mix = { ...VALID_PURE_MIX, oils: [] }
    const result = validateCheckoutItem(customMixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/no oils/)
  })
})

describe('validateCheckoutItems', () => {
  it('rejects an empty cart', () => {
    expect(validateCheckoutItems([]).valid).toBe(false)
  })

  it('rejects carts over 50 items', () => {
    const items = Array.from({ length: 51 }, () => standardItem())
    const result = validateCheckoutItems(items)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/50/)
  })

  it('accepts a mixed cart of standard oil, gift card, and custom blend', () => {
    const result = validateCheckoutItems([
      standardItem(),
      giftCardItem(100),
      customMixItem(VALID_PURE_MIX),
    ])
    expect(result.valid).toBe(true)
  })

  it('fails the whole cart when any single item is invalid', () => {
    const result = validateCheckoutItems([
      standardItem(),
      giftCardItem(75),
    ])
    expect(result.valid).toBe(false)
  })
})
