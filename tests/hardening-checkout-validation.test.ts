/**
 * Hardening Tests — lib/pricing/checkout-validation.ts (uncovered paths)
 * Tolerance edges, malformed items, carrierRatio parsing formats,
 * gift-card denomination boundaries, custom-mix tolerance boundaries,
 * multi-item carts, and redirect URL validation.
 */

import {
  validateCheckoutItem,
  validateCheckoutItems,
  validateRedirectUrl,
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
    name: 'Myrrh',
    amount: cents(calculatePurePrice('myrrh', 30)),
    quantity: 1,
    metadata: { oilId: 'myrrh', size: '30ml', type: 'pure' },
    ...overrides,
  }
}

function carrierItem(ratio: string | undefined, pricedRatio: number): CheckoutItem {
  return {
    name: 'Myrrh Carrier Blend',
    amount: cents(calculateCarrierPrice('myrrh', 30, pricedRatio)),
    quantity: 1,
    metadata: { oilId: 'myrrh', size: '30ml', type: 'carrier', ...(ratio !== undefined && { ratio }) },
  }
}

function giftCardItem(declared: string, amountCents: number): CheckoutItem {
  return {
    name: 'Oil Amor Gift Card',
    amount: amountCents,
    quantity: 1,
    metadata: { type: 'gift-card', giftCardAmount: declared },
  }
}

function mixItem(mix: any, amount?: number): CheckoutItem {
  const canonical = amount ?? cents(
    calculateAtelierPrice({
      name: mix.recipeName || 'Blend',
      mode: mix.mode || 'pure',
      bottleSize: mix.totalVolume,
      components: mix.oils.map((o: any) => ({ oilId: o.oilId, ml: o.ml })),
    }).total
  )
  return {
    name: mix.recipeName || 'Blend',
    amount: canonical,
    quantity: 1,
    metadata: { customMix: JSON.stringify(mix) },
  }
}

const PURE_MIX = {
  recipeName: 'Boundary Blend',
  mode: 'pure',
  oils: [
    { oilId: 'lavender', ml: 15, percentage: 50 },
    { oilId: 'lemon', ml: 15, percentage: 50 },
  ],
  totalVolume: 30,
}

describe('price tolerance boundaries (±2c)', () => {
  it('accepts exactly +2c above canonical', () => {
    const item = standardItem()
    item.amount += 2
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('accepts exactly -2c below canonical', () => {
    const item = standardItem()
    item.amount -= 2
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('rejects +3c above canonical', () => {
    const item = standardItem()
    item.amount += 3
    const result = validateCheckoutItem(item)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Price mismatch/)
  })

  it('rejects -3c below canonical', () => {
    const item = standardItem()
    item.amount -= 3
    expect(validateCheckoutItem(item).valid).toBe(false)
  })

  it('applies the same ±2c tolerance to custom blends', () => {
    const canonical = cents(
      calculateAtelierPrice({
        name: 'Blend', mode: 'pure', bottleSize: 30,
        components: [{ oilId: 'lavender', ml: 15 }, { oilId: 'lemon', ml: 15 }],
      }).total
    )
    expect(validateCheckoutItem(mixItem(PURE_MIX, canonical + 2)).valid).toBe(true)
    expect(validateCheckoutItem(mixItem(PURE_MIX, canonical + 3)).valid).toBe(false)
  })
})

describe('malformed amounts and quantities', () => {
  it('rejects NaN amount', () => {
    expect(validateCheckoutItem(standardItem({ amount: NaN })).valid).toBe(false)
  })

  it('rejects Infinity amount as a price mismatch, never a crash', () => {
    const result = validateCheckoutItem(standardItem({ amount: Infinity }))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Price mismatch/)
  })

  it('rejects fractional-cent amounts more than 2c away from canonical', () => {
    const result = validateCheckoutItem(standardItem({ amount: cents(calculatePurePrice('myrrh', 30)) + 2.5 }))
    expect(result.valid).toBe(false)
  })

  it('accepts fractional-cent amounts within 2c of canonical', () => {
    const item = standardItem({ amount: cents(calculatePurePrice('myrrh', 30)) + 1.9 })
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('rejects negative and fractional quantities', () => {
    expect(validateCheckoutItem(standardItem({ quantity: -2 })).valid).toBe(false)
    expect(validateCheckoutItem(standardItem({ quantity: 0.99 })).valid).toBe(false)
  })

  it('rejects Infinity and NaN quantities', () => {
    expect(validateCheckoutItem(standardItem({ quantity: Infinity })).valid).toBe(false)
    expect(validateCheckoutItem(standardItem({ quantity: NaN })).valid).toBe(false)
  })

  it('rejects a string quantity even when it looks numeric', () => {
    const result = validateCheckoutItem(standardItem({ quantity: '1' as any }))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/quantity/)
  })

  it('BEHAVIOR PIN: a numeric-string amount currently passes (type hole reported)', () => {
    // amount is typed `number` but a JSON payload can deliver a string; the
    // arithmetic checks coerce it, so a correct string amount validates.
    const item = standardItem({ amount: String(cents(calculatePurePrice('myrrh', 30))) as any })
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('rejects when metadata is missing entirely', () => {
    const result = validateCheckoutItem(standardItem({ metadata: undefined }))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/product identifiers/)
  })
})

describe('standard item identifier parsing', () => {
  it('defaults type to pure when type metadata is absent', () => {
    const item: CheckoutItem = {
      name: 'Myrrh',
      amount: cents(calculatePurePrice('myrrh', 30)),
      quantity: 1,
      metadata: { oilId: 'myrrh', size: '30ml' },
    }
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('parses sizes with trailing decorations via parseInt ("30ml-refill" → 30)', () => {
    const item: CheckoutItem = {
      name: 'Myrrh',
      amount: cents(calculatePurePrice('myrrh', 30)),
      quantity: 1,
      metadata: { oilId: 'myrrh', size: '30ml-refill', type: 'pure' },
    }
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('BEHAVIOR PIN: truncates fractional sizes via parseInt ("30.9ml" → 30)', () => {
    const item: CheckoutItem = {
      name: 'Myrrh',
      amount: cents(calculatePurePrice('myrrh', 30)),
      quantity: 1,
      metadata: { oilId: 'myrrh', size: '30.9ml', type: 'pure' },
    }
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('rejects sizes that do not start with a number', () => {
    const item: CheckoutItem = {
      name: 'Myrrh',
      amount: cents(calculatePurePrice('myrrh', 30)),
      quantity: 1,
      metadata: { oilId: 'myrrh', size: 'ml30', type: 'pure' },
    }
    expect(validateCheckoutItem(item).valid).toBe(false)
  })

  it('rejects zero and negative sizes', () => {
    for (const size of ['0', '-30']) {
      const item: CheckoutItem = {
        name: 'Myrrh',
        amount: 100,
        quantity: 1,
        metadata: { oilId: 'myrrh', size, type: 'pure' },
      }
      expect(validateCheckoutItem(item).valid).toBe(false)
    }
  })

  it('rejects a valid oil whose price was computed for a different size', () => {
    const item: CheckoutItem = {
      name: 'Myrrh',
      amount: cents(calculatePurePrice('myrrh', 10)),
      quantity: 1,
      metadata: { oilId: 'myrrh', size: '30ml', type: 'pure' },
    }
    expect(validateCheckoutItem(item).valid).toBe(false)
  })
})

describe('carrier ratio parsing formats', () => {
  // myrrh 30ml carrier prices are distinct at every ratio step, so these
  // cannot pass by a rounding collision.
  it.each([
    ['0.05', 0.05],
    ['0.1', 0.1],
    ['0.25', 0.25],
    ['0.5', 0.5],
    ['0.75', 0.75],
    ['5', 0.05],
    ['10', 0.1],
    ['25', 0.25],
    ['50', 0.5],
    ['75', 0.75],
  ])('accepts numeric ratio string "%s" priced at ratio %f', (raw, ratio) => {
    expect(validateCheckoutItem(carrierItem(raw, ratio)).valid).toBe(true)
  })

  it.each([
    ['Micro-Dose', 0.05],
    ['Gentle Touch', 0.1],
    ['Balanced Harmony', 0.25],
    ['Potent Strength', 0.5],
    ['Maximum Enhanced', 0.75],
    ['micro', 0.05],
    ['gentle', 0.1],
    ['balanced', 0.25],
    ['strong', 0.5],
    ['max', 0.75],
  ])('accepts preset name/id "%s" priced at ratio %f', (raw, ratio) => {
    expect(validateCheckoutItem(carrierItem(raw, ratio)).valid).toBe(true)
  })

  it('falls back to 0.25 when ratio metadata is absent', () => {
    expect(validateCheckoutItem(carrierItem(undefined, 0.25)).valid).toBe(true)
  })

  it.each([['0'], ['-5'], ['76'], ['100'], ['abc'], ['0.0'], ['NaN']])(
    'falls back to 0.25 for unparseable/out-of-range ratio "%s"',
    (raw) => {
      expect(validateCheckoutItem(carrierItem(raw, 0.25)).valid).toBe(true)
    }
  )

  it('BEHAVIOR PIN: ratio string "1" is read as 1% (1/100), not 100%', () => {
    // parseFloat('1') is not < 1 and is <= 75, so it becomes 0.01
    expect(validateCheckoutItem(carrierItem('1', 0.01)).valid).toBe(true)
  })

  it('rejects when the declared ratio does not match the priced ratio', () => {
    // Priced at 75% myrrh ($66.95) but declared as Balanced Harmony (25% → $38.95)
    const item = carrierItem('Balanced Harmony', 0.75)
    const result = validateCheckoutItem(item)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Price mismatch/)
  })

  it('rejects a pure-priced item declared as carrier', () => {
    const item: CheckoutItem = {
      name: 'Myrrh',
      amount: cents(calculatePurePrice('myrrh', 30)),
      quantity: 1,
      metadata: { oilId: 'myrrh', size: '30ml', type: 'carrier', ratio: '0.25' },
    }
    expect(validateCheckoutItem(item).valid).toBe(false)
  })
})

describe('gift card denomination boundaries', () => {
  it('accepts the minimum denomination ($50)', () => {
    expect(validateCheckoutItem(giftCardItem('50', 5000)).valid).toBe(true)
  })

  it('accepts the maximum denomination ($500)', () => {
    expect(validateCheckoutItem(giftCardItem('500', 50000)).valid).toBe(true)
  })

  it('accepts a denomination declared with decimal places ("100.00")', () => {
    expect(validateCheckoutItem(giftCardItem('100.00', 10000)).valid).toBe(true)
  })

  it('rejects one cent below the minimum denomination', () => {
    const result = validateCheckoutItem(giftCardItem('49.99', 4999))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not an available amount/)
  })

  it('rejects one cent above the maximum denomination', () => {
    const result = validateCheckoutItem(giftCardItem('500.01', 50001))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not an available amount/)
  })

  it('rejects an amount matching its declaration when the denomination is not sold', () => {
    // declared $50.50, amount 5050c — internally consistent but not a real product
    const result = validateCheckoutItem(giftCardItem('50.5', 5050))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not an available amount/)
  })

  it.each([['0'], ['-50'], ['abc'], ['']])(
    'rejects an unusable declared denomination "%s"',
    (declared) => {
      const result = validateCheckoutItem(giftCardItem(declared, 5000))
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/missing denomination/)
    }
  )

  it('rejects a one-cent drift between declaration and amount', () => {
    const result = validateCheckoutItem(giftCardItem('50', 5001))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/does not match the gift card denomination/)
  })

  it('validates gift cards with quantity > 1 (amount is per-unit)', () => {
    const item = giftCardItem('100', 10000)
    item.quantity = 3
    expect(validateCheckoutItem(item).valid).toBe(true)
  })

  it('denomination table is positive, sorted, and unique', () => {
    const denoms = [...GIFT_CARD_DENOMINATIONS_CENTS]
    for (const d of denoms) expect(d).toBeGreaterThan(0)
    expect(new Set(denoms).size).toBe(denoms.length)
    expect(denoms).toEqual([...denoms].sort((a, b) => a - b))
  })
})

describe('custom blend tolerance boundaries', () => {
  it('accepts oil volumes exactly 0.25ml over the bottle volume', () => {
    const mix = {
      ...PURE_MIX,
      oils: [
        { oilId: 'lavender', ml: 15.125, percentage: 50 },
        { oilId: 'lemon', ml: 15.125, percentage: 50 },
      ],
    }
    expect(validateCheckoutItem(mixItem(mix)).valid).toBe(true)
  })

  it('rejects oil volumes 0.26ml over the bottle volume', () => {
    const mix = {
      ...PURE_MIX,
      oils: [
        { oilId: 'lavender', ml: 15.13, percentage: 50 },
        { oilId: 'lemon', ml: 15.13, percentage: 50 },
      ],
    }
    const result = validateCheckoutItem(mixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/do not add up/)
  })

  it('accepts percentages summing to exactly 105 (tolerance edge)', () => {
    const mix = {
      ...PURE_MIX,
      oils: [
        { oilId: 'lavender', ml: 15, percentage: 52 },
        { oilId: 'lemon', ml: 15, percentage: 53 },
      ],
    }
    expect(validateCheckoutItem(mixItem(mix)).valid).toBe(true)
  })

  it('rejects percentages summing to 106 (just outside tolerance)', () => {
    const mix = {
      ...PURE_MIX,
      oils: [
        { oilId: 'lavender', ml: 15, percentage: 53 },
        { oilId: 'lemon', ml: 15, percentage: 53 },
      ],
    }
    const result = validateCheckoutItem(mixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/percentages/)
  })

  it('skips the percentage check when any oil omits its percentage', () => {
    const mix = {
      ...PURE_MIX,
      oils: [
        { oilId: 'lavender', ml: 15, percentage: 10 },
        { oilId: 'lemon', ml: 15 }, // no percentage → check skipped entirely
      ],
    }
    expect(validateCheckoutItem(mixItem(mix)).valid).toBe(true)
  })

  it('accepts a numeric string totalVolume', () => {
    const mix = { ...PURE_MIX, totalVolume: '30' }
    expect(validateCheckoutItem(mixItem(mix)).valid).toBe(true)
  })

  it.each([
    ['totalVolume "abc"', { ...PURE_MIX, totalVolume: 'abc' }],
    ['totalVolume -30', { ...PURE_MIX, totalVolume: -30 }],
    ['totalVolume 0', { ...PURE_MIX, totalVolume: 0 }],
  ])('rejects %s', (_label, mix) => {
    const result = validateCheckoutItem(mixItem(mix))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/total volume/)
  })

  it('rejects oils that are not an array', () => {
    const result = validateCheckoutItem(mixItem({ ...PURE_MIX, oils: 'lavender' }, 2495))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/no oils/)
  })

  it.each([
    ['ml as a string', [{ oilId: 'lavender', ml: '15' }, { oilId: 'lemon', ml: 15 }]],
    ['ml of zero', [{ oilId: 'lavender', ml: 0 }, { oilId: 'lemon', ml: 15 }]],
    ['negative ml', [{ oilId: 'lavender', ml: -5 }, { oilId: 'lemon', ml: 15 }]],
  ])('rejects an oil with %s', (_label, oils) => {
    const result = validateCheckoutItem(mixItem({ ...PURE_MIX, oils }, 2495))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/positive ml/)
  })

  it('rejects an oil without an oilId', () => {
    const mix = { ...PURE_MIX, oils: [{ ml: 15 }, { oilId: 'lemon', ml: 15 }] }
    const result = validateCheckoutItem(mixItem(mix, 2495))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/oilId/)
  })

  it('BEHAVIOR PIN: carrier mix with string carrierRatio expects full-bottle oil volume', () => {
    // carrierRatio must be a number to scale the expected volume; a string
    // ratio is ignored, so oils must sum to the whole 30ml bottle.
    const mix = {
      recipeName: 'String Ratio Blend',
      mode: 'carrier',
      carrierRatio: '25',
      oils: [
        { oilId: 'lavender', ml: 15, percentage: 50 },
        { oilId: 'lemon', ml: 15, percentage: 50 },
      ],
      totalVolume: 30,
    }
    expect(validateCheckoutItem(mixItem(mix)).valid).toBe(true)
  })

  it('rejects a carrier mix priced in pure mode', () => {
    const mix = {
      recipeName: 'Mode Confusion',
      mode: 'carrier',
      carrierRatio: 100, // oils must fill the whole bottle
      oils: [
        { oilId: 'lavender', ml: 15, percentage: 50 },
        { oilId: 'lemon', ml: 15, percentage: 50 },
      ],
      totalVolume: 30,
    }
    const purePrice = cents(
      calculateAtelierPrice({
        name: 'Mode Confusion', mode: 'pure', bottleSize: 30,
        components: [{ oilId: 'lavender', ml: 15 }, { oilId: 'lemon', ml: 15 }],
      }).total
    )
    expect(validateCheckoutItem(mixItem(mix, purePrice)).valid).toBe(false)
  })
})

describe('validateCheckoutItems cart-level rules', () => {
  it('rejects null and undefined item arrays', () => {
    expect(validateCheckoutItems(null as any).valid).toBe(false)
    expect(validateCheckoutItems(undefined as any).valid).toBe(false)
    expect(validateCheckoutItems(null as any).error).toMatch(/empty/)
  })

  it('accepts a cart of exactly 50 items', () => {
    const items = Array.from({ length: 50 }, () => standardItem())
    expect(validateCheckoutItems(items).valid).toBe(true)
  })

  it('accepts a mixed cart where every item class is valid', () => {
    const result = validateCheckoutItems([
      standardItem(),
      carrierItem('0.5', 0.5),
      giftCardItem('200', 20000),
      mixItem(PURE_MIX),
    ])
    expect(result.valid).toBe(true)
  })

  it('reports the offending item when a mixed cart contains one bad apple', () => {
    const result = validateCheckoutItems([
      standardItem(),
      giftCardItem('75', 7500),
      mixItem(PURE_MIX),
    ])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Oil Amor Gift Card')
  })

  it('stops at the first invalid item in order', () => {
    const badStandard = standardItem({ name: 'Bad Oil First', amount: 100 })
    const badGift = giftCardItem('75', 7500)
    const result = validateCheckoutItems([badStandard, badGift])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Bad Oil First')
  })
})

describe('validateRedirectUrl', () => {
  it.each([
    'https://oilamor.com/checkout/success',
    'https://www.oilamor.com/cart',
    'http://localhost:3000/cart',
    'http://localhost:3001/checkout/success',
    'https://oilamor.com/path?query=1#hash',
  ])('accepts allowed URL %s', (url) => {
    expect(validateRedirectUrl(url).valid).toBe(true)
  })

  it.each([
    ['external domain', 'https://evil.com'],
    ['lookalike domain', 'https://oilamor.com.evil.com'],
    ['subdomain not on allowlist', 'https://shop.oilamor.com'],
    ['wrong protocol', 'ftp://oilamor.com'],
    ['javascript URL', 'javascript:alert(1)'],
    ['protocol-relative', '//oilamor.com'],
  ])('rejects %s', (_label, url) => {
    expect(validateRedirectUrl(url).valid).toBe(false)
  })

  it('rejects a malformed URL with a specific error', () => {
    const result = validateRedirectUrl('not a url at all')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/malformed/)
  })

  it('rejects an empty URL', () => {
    const result = validateRedirectUrl('')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/required/)
  })
})
