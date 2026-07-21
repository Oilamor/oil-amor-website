/**
 * Hardening Tests — lib/stripe/checkout.ts calculateCheckoutTotals
 * Subtotal/shipping/GST/credit combinations with exact cent-level rounding,
 * free-shipping threshold boundaries, and degenerate carts.
 */

import {
  calculateCheckoutTotals,
  FREE_SHIPPING_THRESHOLD_CENTS,
} from '@/lib/stripe/checkout'

describe('subtotal accumulation and per-item cent rounding', () => {
  it('rounds each unit price to cents before multiplying by quantity', () => {
    // 24.944 → 2494c, ×2 = 4988c = $49.88
    const totals = calculateCheckoutTotals([{ unitPrice: 24.944, quantity: 2 }])
    expect(totals.subtotal).toBe(49.88)
  })

  it('rounds half-cent unit prices up to the next cent', () => {
    // Math.round(0.5) = 1 — a $0.005 item costs 1c
    const totals = calculateCheckoutTotals([{ unitPrice: 0.005, quantity: 1 }])
    expect(totals.subtotal).toBe(0.01)
  })

  it('rounds sub-cent prices below half a cent down to zero', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 0.004, quantity: 1 }])
    expect(totals.subtotal).toBe(0)
  })

  it('sums multiple line items exactly in cents', () => {
    const totals = calculateCheckoutTotals([
      { unitPrice: 24.95, quantity: 2 },
      { unitPrice: 16.95, quantity: 3 },
      { unitPrice: 76.95, quantity: 1 },
    ])
    expect(totals.subtotal).toBe(177.7)
    expect(totals.itemCount).toBe(6)
  })

  it('handles large orders without floating-point drift', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 99.95, quantity: 100 }])
    expect(totals.subtotal).toBe(9995)
    expect(totals.itemCount).toBe(100)
  })
})

describe('free shipping threshold boundary ($199.00)', () => {
  it('charges shipping at $198.99 (one cent under)', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 198.99, quantity: 1 }])
    expect(totals.subtotal).toBe(198.99)
    expect(totals.shipping).toBe(10)
  })

  it('ships free at exactly $199.00', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 199.0, quantity: 1 }])
    expect(totals.shipping).toBe(0)
  })

  it('ships free at $199.01 (one cent over)', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 199.01, quantity: 1 }])
    expect(totals.shipping).toBe(0)
  })

  it('ships free when multiple items sum to exactly the threshold', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 99.5, quantity: 2 }])
    expect(totals.subtotal).toBe(199)
    expect(totals.shipping).toBe(0)
  })

  it('ignores a provided live shipping rate once the threshold is met', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 250, quantity: 1 }],
      { shippingAmountCents: 1500 }
    )
    expect(totals.shipping).toBe(0)
  })

  it('honors a provided live shipping rate below the threshold', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1500 }
    )
    expect(totals.shipping).toBe(15)
  })

  it('treats a null live rate as absent and falls back to $10', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: null }
    )
    expect(totals.shipping).toBe(10)
  })

  it('honors an explicit zero live rate below the threshold', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 0 }
    )
    expect(totals.shipping).toBe(0)
  })

  it('threshold constant is exactly $199.00 in cents', () => {
    expect(FREE_SHIPPING_THRESHOLD_CENTS).toBe(19900)
  })
})

describe('GST rounding at half-cent boundaries', () => {
  it.each([
    // [unitPrice, expectedGstCents] with $10 shipping, AU
    [39.94, 499], // 4994c base → 499.4c GST → 499c
    [39.95, 500], // 4995c base → 499.5c GST → 500c (rounds half up)
    [39.96, 500], // 4996c base → 499.6c GST → 500c
  ])('unitPrice $%f yields GST of %fc', (unitPrice, expectedGstCents) => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    expect(totals.gst).toBeCloseTo(expectedGstCents / 100, 10)
  })

  it('applies GST to both subtotal and shipping for AU orders', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 100, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    expect(totals.gst).toBe(11) // 10% of $110
    expect(totals.total).toBe(121)
  })

  it('charges no GST on free-shipping AU orders beyond the subtotal share', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 199, quantity: 1 }])
    expect(totals.shipping).toBe(0)
    expect(totals.gst).toBe(19.9)
    expect(totals.total).toBe(218.9)
  })

  it.each(['US', 'NZ', 'GB'])('charges no GST for %s orders', (country) => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 2500, country }
    )
    expect(totals.gst).toBe(0)
    expect(totals.total).toBe(75)
  })

  it('defaults to AU GST when country is not provided', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1000 }
    )
    expect(totals.gst).toBe(6)
  })

  it('BEHAVIOR PIN: lowercase "au" is not treated as Australia (case-sensitive)', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'au' }
    )
    expect(totals.gst).toBe(0)
  })
})

describe('store credit application', () => {
  const twoLavenders = [{ unitPrice: 24.95, quantity: 2 }] // 4990c + 1000c ship + 599c GST = 6589c

  it('reduces the total but never the GST line itself', () => {
    const withCredit = calculateCheckoutTotals(twoLavenders, {
      shippingAmountCents: 1000,
      country: 'AU',
      creditCents: 1000,
    })
    const withoutCredit = calculateCheckoutTotals(twoLavenders, {
      shippingAmountCents: 1000,
      country: 'AU',
    })
    expect(withCredit.gst).toBe(withoutCredit.gst)
    expect(withCredit.total).toBeCloseTo(withoutCredit.total - 10, 10)
  })

  it('floors the total at $0.00 when credit exceeds the order total', () => {
    const totals = calculateCheckoutTotals(twoLavenders, {
      shippingAmountCents: 1000,
      country: 'AU',
      creditCents: 999999,
    })
    expect(totals.total).toBe(0)
  })

  it('results in exactly $0.00 when credit equals the order total', () => {
    const totals = calculateCheckoutTotals(twoLavenders, {
      shippingAmountCents: 1000,
      country: 'AU',
      creditCents: 6589,
    })
    expect(totals.total).toBe(0)
  })

  it('leaves one cent payable when credit is one cent short', () => {
    const totals = calculateCheckoutTotals(twoLavenders, {
      shippingAmountCents: 1000,
      country: 'AU',
      creditCents: 6588,
    })
    expect(totals.total).toBe(0.01)
  })

  it('treats omitted credit as zero', () => {
    const totals = calculateCheckoutTotals(twoLavenders, {
      shippingAmountCents: 1000,
      country: 'AU',
    })
    expect(totals.total).toBe(65.89)
  })

  it('combines free shipping, GST, and credit correctly', () => {
    // $250 subtotal → free ship → $25 GST → $275 − $200 credit = $75
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 250, quantity: 1 }],
      { country: 'AU', creditCents: 20000 }
    )
    expect(totals.shipping).toBe(0)
    expect(totals.gst).toBe(25)
    expect(totals.total).toBe(75)
  })
})

describe('degenerate carts', () => {
  it('BEHAVIOR PIN: an empty cart still quotes $10 shipping + $1 GST', () => {
    const totals = calculateCheckoutTotals([])
    expect(totals).toEqual({
      subtotal: 0,
      shipping: 10,
      gst: 1,
      total: 11,
      itemCount: 0,
    })
  })

  it('an empty cart with an explicit zero rate totals $0.00', () => {
    const totals = calculateCheckoutTotals([], { shippingAmountCents: 0 })
    expect(totals.total).toBe(0)
    expect(totals.gst).toBe(0)
  })

  it('a zero-quantity line item behaves like an empty cart', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 50, quantity: 0 }])
    expect(totals.subtotal).toBe(0)
    expect(totals.shipping).toBe(10)
    expect(totals.itemCount).toBe(0)
  })
})
