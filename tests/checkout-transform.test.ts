/**
 * Checkout Transform Tests
 * cartItemsToCheckoutItems field extraction from real cart shapes
 * + calculateCheckoutTotals math (must match the server's cent-level rounding)
 */

import {
  cartItemsToCheckoutItems,
  calculateCheckoutTotals,
  FREE_SHIPPING_THRESHOLD_CENTS,
} from '@/lib/stripe/checkout'
import { SHIPPING_RATES } from '@/lib/stripe/config'

// Standard product as built by app/components/add-to-cart-section.tsx
function buildStandardItem(overrides: any = {}) {
  return {
    id: 'line_abc123',
    productId: 'lavender',
    variantId: 'lavender-30ml-pure',
    name: 'Lavender',
    unitPrice: 24.95,
    quantity: 2,
    image: '/images/lavender.webp',
    configuration: {
      bottleSize: '30ml',
      bottleSizeId: '30ml',
      bottleVolume: 30,
      crystalChips: 12,
      type: 'pure',
      isPure: true,
      crystalName: 'Amethyst',
      crystalId: 'amethyst',
    },
    properties: {
      name: 'Lavender',
      price: '24.95',
      image: '/images/lavender.webp',
      oilId: 'lavender',
      size: '30ml',
      type: 'pure',
      carrier: '',
      ratio: '',
      crystalName: 'Amethyst',
    },
    ...overrides,
  }
}

// Gift card as built by app/gift-cards/page.tsx
function buildGiftCardItem(overrides: any = {}) {
  return {
    id: 'line_gc1',
    productId: 'gift-card-100',
    variantId: 'gift-card-100',
    name: 'Oil Amor Gift Card - $100',
    unitPrice: 100,
    quantity: 1,
    image: '/gift-card.jpg',
    properties: {
      name: 'Oil Amor Gift Card - $100',
      price: '100',
      image: '/gift-card.jpg',
      sku: 'GIFT-100',
      recipientName: 'Sarah',
      recipientEmail: 'sarah@example.com',
      senderName: 'Michael',
      message: 'Happy birthday',
      deliveryDate: '2026-08-01',
      type: 'gift-card',
    },
    ...overrides,
  }
}

// Custom blend as built by app/(shop)/mixing-atelier/page.tsx
function buildCustomMixItem(overrides: any = {}) {
  return {
    id: 'line_mix1',
    productId: 'custom-mix',
    name: "Alex's Sleep Blend",
    unitPrice: 24.95,
    quantity: 1,
    customMix: {
      recipeName: "Alex's Sleep Blend",
      mode: 'pure',
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
        { oilId: 'cedarwood', oilName: 'Cedarwood', ml: 15, percentage: 50 },
      ],
      totalVolume: 30,
      safetyScore: 92,
      safetyRating: 'excellent',
      safetyWarnings: [],
      labCertified: true,
    },
    configuration: { bottleSize: '30ml', mode: 'pure' },
    properties: {
      name: "Alex's Sleep Blend",
      price: '24.95',
      blendName: "Alex's Sleep Blend",
      bottleSize: '30ml',
      mode: 'pure',
    },
    ...overrides,
  }
}

describe('cartItemsToCheckoutItems', () => {
  it('extracts oilId/size/type from properties for standard products', () => {
    const [result] = cartItemsToCheckoutItems([buildStandardItem()])
    expect(result.metadata?.oilId).toBe('lavender')
    expect(result.metadata?.size).toBe('30ml')
    expect(result.metadata?.type).toBe('pure')
  })

  it('falls back to configuration.bottleSize when properties are absent', () => {
    const [result] = cartItemsToCheckoutItems([buildStandardItem({ properties: undefined })])
    expect(result.metadata?.size).toBe('30ml')
    expect(result.metadata?.type).toBe('pure')
  })

  it('still supports legacy top-level oilId/size/type', () => {
    const [result] = cartItemsToCheckoutItems([
      {
        id: 'line_legacy',
        name: 'Tea Tree',
        unitPrice: 23.95,
        quantity: 1,
        oilId: 'tea-tree',
        size: '10ml',
        type: 'pure',
      },
    ])
    expect(result.metadata?.oilId).toBe('tea-tree')
    expect(result.metadata?.size).toBe('10ml')
    expect(result.metadata?.type).toBe('pure')
  })

  it('does not default size to 30ml or type to pure when identifiers are missing', () => {
    const [result] = cartItemsToCheckoutItems([
      { id: 'line_bare', name: 'Mystery Item', unitPrice: 10, quantity: 1 },
    ])
    expect(result.metadata?.size).toBe('')
    expect(result.metadata?.type).toBe('')
    expect(result.metadata?.oilId).toBe('')
  })

  it('carries ratio and carrierOil for carrier blends', () => {
    const [result] = cartItemsToCheckoutItems([
      buildStandardItem({
        configuration: {
          bottleSize: '30ml',
          type: 'carrier',
          isCarrierBlend: true,
          carrierOil: 'Jojoba Oil',
          ratio: 'Balanced Harmony',
        },
        properties: {
          oilId: 'lavender',
          size: '30ml',
          type: 'carrier',
          carrier: 'Jojoba Oil',
          ratio: 'Balanced Harmony',
        },
      }),
    ])
    expect(result.metadata?.type).toBe('carrier')
    expect(result.metadata?.ratio).toBe('Balanced Harmony')
    expect(result.metadata?.carrierOil).toBe('Jojoba Oil')
  })

  it('omits empty ratio/carrier values from metadata', () => {
    const [result] = cartItemsToCheckoutItems([buildStandardItem()])
    expect(result.metadata).not.toHaveProperty('ratio')
    expect(result.metadata).not.toHaveProperty('carrierOil')
  })

  it('converts unitPrice to cents for the amount', () => {
    const [result] = cartItemsToCheckoutItems([buildStandardItem()])
    expect(result.amount).toBe(2495)
    expect(result.quantity).toBe(2)
  })

  it('serializes customMix into metadata for custom blends', () => {
    const item = buildCustomMixItem()
    const [result] = cartItemsToCheckoutItems([item])
    expect(result.metadata?.customMix).toBeDefined()
    const mix = JSON.parse(result.metadata!.customMix!)
    expect(mix.recipeName).toBe("Alex's Sleep Blend")
    expect(mix.oils).toHaveLength(2)
    expect(mix.totalVolume).toBe(30)
  })

  it('carries blendId from properties when present', () => {
    const [result] = cartItemsToCheckoutItems([
      buildCustomMixItem({
        properties: { blendId: 'blend_123', bottleSize: '30ml', mode: 'pure' },
      }),
    ])
    expect(result.metadata?.blendId).toBe('blend_123')
  })

  it('includes the cart line id in metadata', () => {
    const [result] = cartItemsToCheckoutItems([buildStandardItem()])
    expect(result.metadata?.cartItemId).toBe('line_abc123')
  })

  describe('gift cards', () => {
    it('derives the amount from the productId denomination, not the cart price', () => {
      const [result] = cartItemsToCheckoutItems([
        buildGiftCardItem({ unitPrice: 0.01 }), // tampered cart price
      ])
      expect(result.amount).toBe(10000)
      expect(result.metadata?.giftCardAmount).toBe('100')
      expect(result.metadata?.type).toBe('gift-card')
    })

    it('detects gift cards via the GIFT- sku', () => {
      const [result] = cartItemsToCheckoutItems([
        buildGiftCardItem({ productId: undefined, variantId: undefined }),
      ])
      expect(result.metadata?.type).toBe('gift-card')
      expect(result.metadata?.giftCardAmount).toBe('100')
    })

    it('detects gift cards via properties.type when identifiers are missing', () => {
      const [result] = cartItemsToCheckoutItems([
        buildGiftCardItem({
          productId: undefined,
          variantId: undefined,
          properties: { type: 'gift-card', price: '200' },
        }),
      ])
      expect(result.metadata?.giftCardAmount).toBe('200')
      expect(result.amount).toBe(20000)
    })

    it('carries recipient details into metadata', () => {
      const [result] = cartItemsToCheckoutItems([buildGiftCardItem()])
      expect(result.metadata?.recipientName).toBe('Sarah')
      expect(result.metadata?.recipientEmail).toBe('sarah@example.com')
      expect(result.metadata?.senderName).toBe('Michael')
      expect(result.metadata?.message).toBe('Happy birthday')
      expect(result.metadata?.deliveryDate).toBe('2026-08-01')
    })

    it('falls back to unitPrice with an empty denomination when nothing is parseable', () => {
      const [result] = cartItemsToCheckoutItems([
        buildGiftCardItem({
          unitPrice: 42,
          productId: 'gift-card',
          variantId: 'gift-card',
          properties: { type: 'gift-card', sku: 'GIFT-' },
        }),
      ])
      expect(result.amount).toBe(4200)
      expect(result.metadata?.giftCardAmount).toBe('')
    })
  })
})

describe('calculateCheckoutTotals', () => {
  it('matches the server GST rounding: Math.round((subtotal + shipping) * 0.1) in cents', () => {
    const items = [{ unitPrice: 24.95, quantity: 2 }]
    const totals = calculateCheckoutTotals(items, { shippingAmountCents: 1000, country: 'AU' })

    const subCents = 2495 * 2
    const expectedGstCents = Math.round((subCents + 1000) * 0.1)
    expect(totals.subtotal).toBeCloseTo(subCents / 100, 2)
    expect(totals.shipping).toBeCloseTo(10, 2)
    expect(totals.gst).toBeCloseTo(expectedGstCents / 100, 2)
    expect(totals.total).toBeCloseTo((subCents + 1000 + expectedGstCents) / 100, 2)
  })

  it('rounds half-cent GST the same way as the server', () => {
    // 3 × 16.95 = 5085c + 1000c shipping = 6085c → GST 608.5c → 609c
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 16.95, quantity: 3 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    expect(totals.gst).toBeCloseTo(6.09, 2)
    expect(totals.total).toBeCloseTo((5085 + 1000 + 609) / 100, 2)
  })

  it('charges shipping below the $199 threshold', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 198.99, quantity: 1 }])
    expect(totals.shipping).toBe(10)
  })

  it('ships free at exactly $199', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 199, quantity: 1 }])
    expect(totals.shipping).toBe(0)
  })

  it('ships free above $199', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 250, quantity: 1 }])
    expect(totals.shipping).toBe(0)
  })

  it('threshold constant matches SHIPPING_RATES in lib/stripe/config', () => {
    expect(FREE_SHIPPING_THRESHOLD_CENTS).toBe(SHIPPING_RATES.domestic.free.threshold)
    expect(FREE_SHIPPING_THRESHOLD_CENTS).toBe(19900)
  })

  it('charges no GST for non-AU orders', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 2500, country: 'US' }
    )
    expect(totals.gst).toBe(0)
    expect(totals.total).toBeCloseTo(75, 2)
  })

  it('subtracts store credit after GST, never below zero', () => {
    const items = [{ unitPrice: 24.95, quantity: 2 }]
    const totals = calculateCheckoutTotals(items, {
      shippingAmountCents: 1000,
      country: 'AU',
      creditCents: 4990,
    })
    const expected = Math.max(0, 4990 + 1000 + Math.round((4990 + 1000) * 0.1) - 4990) / 100
    expect(totals.total).toBeCloseTo(expected, 2)

    const floored = calculateCheckoutTotals(items, {
      shippingAmountCents: 0,
      country: 'AU',
      creditCents: 999999,
    })
    expect(floored.total).toBe(0)
  })

  it('sums item quantities for itemCount', () => {
    const totals = calculateCheckoutTotals([
      { unitPrice: 10, quantity: 2 },
      { unitPrice: 20, quantity: 3 },
    ])
    expect(totals.itemCount).toBe(5)
  })

  it('uses a $10 standard fallback when no live rate is provided', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 50, quantity: 1 }])
    expect(totals.shipping).toBe(10)
  })

  it('handles fractional-cent prices without drift', () => {
    // unitPrice that is not an exact cent value must round per-item like the server
    const totals = calculateCheckoutTotals([{ unitPrice: 24.949, quantity: 1 }])
    expect(totals.subtotal).toBeCloseTo(24.95, 2)
  })
})
