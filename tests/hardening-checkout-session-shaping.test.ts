/**
 * Hardening Tests — lib/stripe/checkout.ts cartItemsToCheckoutItems
 * Checkout-session shaping: metadata completeness per item type, field
 * precedence, gift-card denomination parsing edges, description generation,
 * and NaN-safety across weird-but-plausible cart states (with the
 * server-side validator as the backstop).
 */

import { cartItemsToCheckoutItems } from '@/lib/stripe/checkout'
import { validateCheckoutItem } from '@/lib/pricing/checkout-validation'
import { calculatePurePrice, calculateCarrierPrice } from '@/lib/content/pricing-engine-final'
import { calculateAtelierPrice } from '@/lib/atelier/atelier-engine'

function standardCartItem(overrides: any = {}) {
  return {
    id: 'line_std',
    productId: 'myrrh',
    variantId: 'myrrh-30ml-pure',
    name: 'Myrrh',
    unitPrice: 76.95,
    quantity: 1,
    properties: { oilId: 'myrrh', size: '30ml', type: 'pure', carrier: '', ratio: '' },
    ...overrides,
  }
}

function giftCardCartItem(overrides: any = {}) {
  return {
    id: 'line_gc',
    productId: 'gift-card-100',
    variantId: 'gift-card-100',
    name: 'Oil Amor Gift Card - $100',
    unitPrice: 100,
    quantity: 1,
    properties: { sku: 'GIFT-100', type: 'gift-card' },
    ...overrides,
  }
}

const MIX = {
  recipeName: 'Deep Sleep',
  mode: 'pure',
  oils: [
    { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
    { oilId: 'cedarwood', oilName: 'Cedarwood Atlas', ml: 15, percentage: 50 },
  ],
  totalVolume: 30,
}

function customMixCartItem(overrides: any = {}) {
  return {
    id: 'line_mix',
    productId: 'custom-mix',
    name: 'Deep Sleep',
    unitPrice: calculateAtelierPrice({
      name: 'Deep Sleep', mode: 'pure', bottleSize: 30,
      components: [{ oilId: 'lavender', ml: 15 }, { oilId: 'cedarwood', ml: 15 }],
    }).total,
    quantity: 1,
    customMix: MIX,
    configuration: { bottleSize: '30ml', mode: 'pure' },
    properties: { blendName: 'Deep Sleep', bottleSize: '30ml', mode: 'pure' },
    ...overrides,
  }
}

describe('metadata completeness per item type', () => {
  it('standard items always carry oilId/size/type/cartItemId keys', () => {
    const [result] = cartItemsToCheckoutItems([standardCartItem()])
    expect(result.metadata).toMatchObject({
      oilId: 'myrrh', size: '30ml', type: 'pure', cartItemId: 'line_std',
    })
    expect(result.metadata).not.toHaveProperty('ratio')
    expect(result.metadata).not.toHaveProperty('carrierOil')
    expect(result.metadata).not.toHaveProperty('customMix')
  })

  it('carrier items add ratio and carrierOil on top of the standard keys', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        unitPrice: calculateCarrierPrice('myrrh', 30, 0.5),
        properties: {
          oilId: 'myrrh', size: '30ml', type: 'carrier',
          ratio: 'Potent Strength', carrier: 'Jojoba Oil',
        },
      }),
    ])
    expect(result.metadata).toMatchObject({
      oilId: 'myrrh', size: '30ml', type: 'carrier',
      ratio: 'Potent Strength', carrierOil: 'Jojoba Oil', cartItemId: 'line_std',
    })
  })

  it('custom-mix items carry the serialized recipe and no oil identifiers', () => {
    const [result] = cartItemsToCheckoutItems([customMixCartItem()])
    expect(result.metadata?.customMix).toBeDefined()
    expect(JSON.parse(result.metadata!.customMix!)).toMatchObject({
      recipeName: 'Deep Sleep', totalVolume: 30,
    })
    expect(result.metadata?.oilId).toBe('')
    expect(result.metadata?.type).toBe('')
  })

  it('gift-card items carry gift-card keys and no oil keys', () => {
    const [result] = cartItemsToCheckoutItems([giftCardCartItem()])
    expect(result.metadata).toMatchObject({
      type: 'gift-card', giftCardAmount: '100', cartItemId: 'line_gc',
    })
    expect(result.metadata).not.toHaveProperty('oilId')
    expect(result.metadata).not.toHaveProperty('size')
    expect(result.metadata).not.toHaveProperty('customMix')
  })

  it('optional gift-card fields are omitted when absent', () => {
    const [result] = cartItemsToCheckoutItems([giftCardCartItem()])
    for (const key of ['recipientName', 'recipientEmail', 'senderName', 'message', 'deliveryDate']) {
      expect(result.metadata).not.toHaveProperty(key)
    }
  })
})

describe('field precedence', () => {
  it('prefers properties.ratio over configuration.ratio', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        properties: { oilId: 'myrrh', size: '30ml', type: 'carrier', ratio: '0.5' },
        configuration: { ratio: '0.05', carrierOil: 'Config Carrier' },
      }),
    ])
    expect(result.metadata?.ratio).toBe('0.5')
    expect(result.metadata?.carrierOil).toBe('Config Carrier')
  })

  it('reads ratio/carrier from configuration when properties omit them', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        properties: { oilId: 'myrrh', size: '30ml', type: 'carrier' },
        configuration: { ratio: '0.25', carrierOil: 'Jojoba Oil' },
      }),
    ])
    expect(result.metadata?.ratio).toBe('0.25')
    expect(result.metadata?.carrierOil).toBe('Jojoba Oil')
  })

  it('prefers legacy top-level fields over properties', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({ oilId: 'tea-tree', size: '10ml', type: 'pure' }),
    ])
    expect(result.metadata?.oilId).toBe('tea-tree')
    expect(result.metadata?.size).toBe('10ml')
  })

  it('preserves item order across a mixed cart', () => {
    const results = cartItemsToCheckoutItems([
      standardCartItem(), giftCardCartItem(), customMixCartItem(),
    ])
    expect(results.map(r => r.metadata?.cartItemId)).toEqual(['line_std', 'line_gc', 'line_mix'])
    expect(results[0].metadata?.oilId).toBe('myrrh')
    expect(results[1].metadata?.type).toBe('gift-card')
    expect(results[2].metadata?.customMix).toBeDefined()
  })
})

describe('gift card denomination parsing edges', () => {
  it('parses the $50 minimum and $500 maximum denominations from productId', () => {
    const [fifty] = cartItemsToCheckoutItems([
      giftCardCartItem({ productId: 'gift-card-50', variantId: 'gift-card-50', properties: { sku: 'GIFT-50', type: 'gift-card' }, unitPrice: 50 }),
    ])
    expect(fifty.amount).toBe(5000)
    const [fiveHundred] = cartItemsToCheckoutItems([
      giftCardCartItem({ productId: 'gift-card-500', variantId: 'gift-card-500', properties: { sku: 'GIFT-500', type: 'gift-card' }, unitPrice: 500 }),
    ])
    expect(fiveHundred.amount).toBe(50000)
    expect(validateCheckoutItem(fifty).valid).toBe(true)
    expect(validateCheckoutItem(fiveHundred).valid).toBe(true)
  })

  it('falls back to variantId when productId has no trailing number', () => {
    const [result] = cartItemsToCheckoutItems([
      giftCardCartItem({ productId: 'gift-card', variantId: 'gift-card-200' }),
    ])
    expect(result.amount).toBe(20000)
    expect(result.metadata?.giftCardAmount).toBe('200')
  })

  it('falls back to the sku when productId and variantId carry no number', () => {
    const [result] = cartItemsToCheckoutItems([
      giftCardCartItem({
        productId: 'gift-card', variantId: 'gift-card',
        properties: { sku: 'GIFT-100', type: 'gift-card' },
      }),
    ])
    expect(result.amount).toBe(10000)
  })

  it('falls back to properties.price when no identifier has a number', () => {
    const [result] = cartItemsToCheckoutItems([
      giftCardCartItem({
        productId: 'gift-card', variantId: 'gift-card',
        properties: { type: 'gift-card', price: '200' },
      }),
    ])
    expect(result.amount).toBe(20000)
    expect(result.metadata?.giftCardAmount).toBe('200')
  })

  it('extracts a decimal denomination from the identifier tail', () => {
    const [result] = cartItemsToCheckoutItems([
      giftCardCartItem({ productId: 'gift-card-100.50', variantId: undefined, properties: { type: 'gift-card' } }),
    ])
    expect(result.amount).toBe(10050)
    expect(result.metadata?.giftCardAmount).toBe('100.5')
  })

  it('pipeline backstop: a $75 denomination parses but is rejected by validation', () => {
    const [result] = cartItemsToCheckoutItems([
      giftCardCartItem({
        productId: 'gift-card-75', variantId: 'gift-card-75',
        properties: { sku: 'GIFT-75', type: 'gift-card' }, unitPrice: 75,
      }),
    ])
    expect(result.amount).toBe(7500)
    const validation = validateCheckoutItem(result)
    expect(validation.valid).toBe(false)
    expect(validation.error).toMatch(/not an available amount/)
  })

  it('pipeline backstop: an unparseable gift card falls back to cart price and is rejected', () => {
    const [result] = cartItemsToCheckoutItems([
      giftCardCartItem({
        productId: 'gift-card', variantId: 'gift-card', unitPrice: 42,
        properties: { type: 'gift-card', sku: 'GIFT-' },
      }),
    ])
    expect(result.amount).toBe(4200)
    expect(result.metadata?.giftCardAmount).toBe('')
    expect(validateCheckoutItem(result).valid).toBe(false)
  })

  it('uses the default gift card description when none is provided', () => {
    const [result] = cartItemsToCheckoutItems([giftCardCartItem()])
    expect(result.description).toBe('Digital gift card — delivered by email')
  })
})

describe('description generation', () => {
  it('keeps an explicitly provided description', () => {
    const [result] = cartItemsToCheckoutItems([standardCartItem({ description: 'Hand-poured in Byron Bay' })])
    expect(result.description).toBe('Hand-poured in Byron Bay')
  })

  it('generates "size • Pure Essential Oil" for pure items', () => {
    const [result] = cartItemsToCheckoutItems([standardCartItem()])
    expect(result.description).toBe('30ml • Pure Essential Oil')
  })

  it('includes carrier and ratio for carrier items', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        properties: { oilId: 'myrrh', size: '30ml', type: 'carrier' },
        configuration: { carrierOil: 'Jojoba Oil', ratio: 'Potent Strength' },
      }),
    ])
    expect(result.description).toBe('30ml • Jojoba Oil • Potent Strength')
  })

  it('falls back to "Carrier Enhanced" without carrier details', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        properties: { oilId: 'myrrh', size: '30ml', type: 'carrier' },
        configuration: {},
      }),
    ])
    expect(result.description).toBe('30ml • Carrier Enhanced')
  })

  it('appends crystal and cord details when configured', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        configuration: { crystalName: 'Amethyst', cord: 'Leather' },
      }),
    ])
    expect(result.description).toBe('30ml • Pure Essential Oil • with Amethyst • + Leather cord')
  })

  it('summarizes a custom mix with up to three oil names', () => {
    const [result] = cartItemsToCheckoutItems([
      customMixCartItem({
        customMix: {
          ...MIX,
          oils: [
            { oilId: 'a', oilName: 'One', ml: 7.5 },
            { oilId: 'b', oilName: 'Two', ml: 7.5 },
            { oilId: 'c', oilName: 'Three', ml: 7.5 },
            { oilId: 'd', oilName: 'Four', ml: 7.5 },
          ],
        },
      }),
    ])
    expect(result.description).toContain('Custom: Deep Sleep')
    expect(result.description).toContain('(One, Two, Three)')
    expect(result.description).not.toContain('Four')
    expect(result.description).toContain('30ml')
  })

  it('falls back to "Essential Oil" when nothing is known about the item', () => {
    const [result] = cartItemsToCheckoutItems([
      { id: 'line_bare', name: 'Mystery', unitPrice: 10, quantity: 1 },
    ])
    expect(result.description).toBe('Essential Oil')
  })
})

describe('NaN-safety across weird-but-plausible cart states', () => {
  it.each([
    { label: 'legacy string price', unitPrice: '24.95', expectedAmount: 2495, expectedValid: true, useLavender: true },
    { label: 'fractional-cent price', unitPrice: 24.949, expectedAmount: 2495, expectedValid: true, useLavender: true },
    { label: 'zero price', unitPrice: 0, expectedAmount: 0, expectedValid: false, useLavender: false },
    { label: 'negative price', unitPrice: -24.95, expectedAmount: -2495, expectedValid: false, useLavender: false },
    { label: 'null price', unitPrice: null, expectedAmount: 0, expectedValid: false, useLavender: false },
    // finite but fails server-side price validation
    { label: 'huge price', unitPrice: 1e9, expectedAmount: 100000000000, expectedValid: false, useLavender: false },
  ])('$label produces a finite integer amount and the right validation outcome',
    ({ unitPrice, expectedAmount, expectedValid, useLavender }) => {
      const overrides: any = { unitPrice }
      if (useLavender) {
        // lavender 30ml pure canonical price is exactly 2495c
        overrides.properties = { oilId: 'lavender', size: '30ml', type: 'pure', carrier: '', ratio: '' }
      }
      const [result] = cartItemsToCheckoutItems([standardCartItem(overrides)])
      expect(result.amount).toBe(expectedAmount)
      expect(Number.isFinite(result.amount)).toBe(true)
      expect(Number.isInteger(result.amount)).toBe(true)
      expect(validateCheckoutItem(result).valid).toBe(expectedValid)
    }
  )

  it('BEHAVIOR PIN: undefined unitPrice yields NaN, which the validator then rejects', () => {
    const [result] = cartItemsToCheckoutItems([standardCartItem({ unitPrice: undefined })])
    expect(Number.isNaN(result.amount)).toBe(true)
    const validation = validateCheckoutItem(result)
    expect(validation.valid).toBe(false)
    expect(validation.error).toMatch(/must be greater than 0/)
  })

  it('BEHAVIOR PIN: NaN unitPrice yields NaN, which the validator then rejects', () => {
    const [result] = cartItemsToCheckoutItems([standardCartItem({ unitPrice: NaN })])
    expect(Number.isNaN(result.amount)).toBe(true)
    expect(validateCheckoutItem(result).valid).toBe(false)
  })

  it('every amount across a realistic mixed catalog is a positive integer', () => {
    const items = [
      standardCartItem({ unitPrice: calculatePurePrice('myrrh', 30) }),
      standardCartItem({
        id: 'line_c', unitPrice: calculateCarrierPrice('myrrh', 30, 0.25),
        properties: { oilId: 'myrrh', size: '30ml', type: 'carrier', ratio: '0.25' },
      }),
      giftCardCartItem(),
      customMixCartItem(),
    ]
    for (const result of cartItemsToCheckoutItems(items)) {
      expect(Number.isInteger(result.amount)).toBe(true)
      expect(result.amount).toBeGreaterThan(0)
    }
  })
})

describe('end-to-end shaping → server validation', () => {
  it('a canonically-priced standard item survives the round trip', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({ unitPrice: calculatePurePrice('myrrh', 30) }),
    ])
    expect(validateCheckoutItem(result).valid).toBe(true)
  })

  it('a canonically-priced carrier item survives the round trip', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({
        unitPrice: calculateCarrierPrice('myrrh', 30, 0.5),
        properties: { oilId: 'myrrh', size: '30ml', type: 'carrier', ratio: '0.5' },
      }),
    ])
    expect(validateCheckoutItem(result).valid).toBe(true)
  })

  it('an atelier custom mix survives the round trip at its canonical price', () => {
    const [result] = cartItemsToCheckoutItems([customMixCartItem()])
    expect(validateCheckoutItem(result).valid).toBe(true)
  })

  it('a tampered custom mix price is caught after shaping', () => {
    const [result] = cartItemsToCheckoutItems([customMixCartItem({ unitPrice: 1 })])
    expect(validateCheckoutItem(result).valid).toBe(false)
  })

  it('a tampered standard price is caught after shaping', () => {
    const [result] = cartItemsToCheckoutItems([
      standardCartItem({ unitPrice: calculatePurePrice('myrrh', 30) - 10 }),
    ])
    expect(validateCheckoutItem(result).valid).toBe(false)
  })
})
