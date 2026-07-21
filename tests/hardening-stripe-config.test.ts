/**
 * Hardening Tests — lib/stripe/config.ts
 * Shipping rate invariants, threshold consistency with the cart manager,
 * currency formatting, and Stripe client lazy-init behavior.
 */

import {
  SHIPPING_RATES,
  STRIPE_PRICE_IDS,
  calculateShippingCost,
  formatStripeAmount,
} from '@/lib/stripe/config'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/stripe/checkout'

describe('SHIPPING_RATES invariants', () => {
  it('domestic standard is $10.00 and express is $15.00', () => {
    expect(SHIPPING_RATES.domestic.standard.amount).toBe(1000)
    expect(SHIPPING_RATES.domestic.express.amount).toBe(1500)
  })

  it('express costs more than standard in both zones', () => {
    expect(SHIPPING_RATES.domestic.express.amount)
      .toBeGreaterThan(SHIPPING_RATES.domestic.standard.amount)
    expect(SHIPPING_RATES.international.express.amount)
      .toBeGreaterThan(SHIPPING_RATES.international.standard.amount)
  })

  it('international costs more than domestic for the same speed', () => {
    expect(SHIPPING_RATES.international.standard.amount)
      .toBeGreaterThan(SHIPPING_RATES.domestic.standard.amount)
    expect(SHIPPING_RATES.international.express.amount)
      .toBeGreaterThan(SHIPPING_RATES.domestic.express.amount)
  })

  it('free shipping is $0 with the threshold in cents', () => {
    expect(SHIPPING_RATES.domestic.free.amount).toBe(0)
    expect(SHIPPING_RATES.domestic.free.threshold).toBe(19900)
  })

  it('every rate has a non-empty customer-facing description', () => {
    const rates = [
      SHIPPING_RATES.domestic.standard,
      SHIPPING_RATES.domestic.express,
      SHIPPING_RATES.domestic.free,
      SHIPPING_RATES.international.standard,
      SHIPPING_RATES.international.express,
    ]
    for (const rate of rates) {
      expect(rate.description.length).toBeGreaterThan(0)
    }
  })
})

describe('threshold consistency across modules', () => {
  it('matches FREE_SHIPPING_THRESHOLD_CENTS in lib/stripe/checkout', () => {
    expect(SHIPPING_RATES.domestic.free.threshold).toBe(FREE_SHIPPING_THRESHOLD_CENTS)
  })

  it('matches the cart-manager rule: free at $199, otherwise $10 standard', () => {
    // lib/cart/cart-manager.ts: `if (subtotal < 199) totalShipping = 10`
    expect(SHIPPING_RATES.domestic.free.threshold / 100).toBe(199)
    expect(SHIPPING_RATES.domestic.standard.amount / 100).toBe(10)
  })
})

describe('calculateShippingCost', () => {
  it('charges standard domestic one cent below the threshold', () => {
    const result = calculateShippingCost(19899, 'AU')
    expect(result.amount).toBe(1000)
    expect(result.description).toBe(SHIPPING_RATES.domestic.standard.description)
  })

  it('ships free at exactly the threshold', () => {
    const result = calculateShippingCost(19900, 'AU')
    expect(result.amount).toBe(0)
  })

  it('ships free above the threshold', () => {
    expect(calculateShippingCost(50000, 'AU').amount).toBe(0)
  })

  it('BEHAVIOR PIN: free shipping wins over express above the threshold', () => {
    // The free-shipping check runs before the express branch, so an express
    // customer over $199 pays $0. Reported as a design observation.
    expect(calculateShippingCost(19900, 'AU', true).amount).toBe(0)
  })

  it('charges express domestic below the threshold', () => {
    expect(calculateShippingCost(19899, 'AU', true).amount).toBe(1500)
  })

  it('charges standard domestic for an empty subtotal', () => {
    expect(calculateShippingCost(0, 'AU').amount).toBe(1000)
  })

  it('charges international rates for non-AU countries', () => {
    expect(calculateShippingCost(0, 'NZ').amount).toBe(2500)
    expect(calculateShippingCost(99999, 'US').amount).toBe(2500)
    expect(calculateShippingCost(99999, 'US', true).amount).toBe(5000)
  })

  it('never applies the domestic free threshold to international orders', () => {
    expect(calculateShippingCost(999999, 'GB').amount).toBe(2500)
  })

  it('defaults the country to AU', () => {
    expect(calculateShippingCost(0).amount).toBe(1000)
    expect(calculateShippingCost(19900).amount).toBe(0)
  })

  it('BEHAVIOR PIN: country matching is case-sensitive ("au" is international)', () => {
    expect(calculateShippingCost(0, 'au').amount).toBe(2500)
  })

  it('returns the exact rate objects from SHIPPING_RATES', () => {
    expect(calculateShippingCost(19900, 'AU')).toBe(SHIPPING_RATES.domestic.free)
    expect(calculateShippingCost(0, 'AU')).toBe(SHIPPING_RATES.domestic.standard)
    expect(calculateShippingCost(0, 'AU', true)).toBe(SHIPPING_RATES.domestic.express)
    expect(calculateShippingCost(0, 'US')).toBe(SHIPPING_RATES.international.standard)
    expect(calculateShippingCost(0, 'US', true)).toBe(SHIPPING_RATES.international.express)
  })
})

describe('formatStripeAmount (AUD currency)', () => {
  it.each([
    [0, '$0.00'],
    [1000, '$10.00'],
    [1500, '$15.00'],
    [19900, '$199.00'],
    [2495, '$24.95'],
    [123456, '$1,234.56'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatStripeAmount(cents)).toBe(expected)
  })
})

describe('STRIPE_PRICE_IDS', () => {
  it('declares the standard and express shipping price slots', () => {
    expect(STRIPE_PRICE_IDS).toHaveProperty('shipping-standard')
    expect(STRIPE_PRICE_IDS).toHaveProperty('shipping-express')
  })
})

describe('getStripe lazy initialization', () => {
  const ORIGINAL_KEY = process.env.STRIPE_SECRET_KEY

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.STRIPE_SECRET_KEY
    } else {
      process.env.STRIPE_SECRET_KEY = ORIGINAL_KEY
    }
  })

  it('throws a clear error when STRIPE_SECRET_KEY is not configured', () => {
    jest.resetModules()
    delete process.env.STRIPE_SECRET_KEY
    const { getStripe } = require('@/lib/stripe/config')
    expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not configured')
  })

  it('constructs and memoizes a Stripe client when the key is present', () => {
    jest.resetModules()
    process.env.STRIPE_SECRET_KEY = 'sk_test_hardening_dummy'
    const { getStripe } = require('@/lib/stripe/config')
    const first = getStripe()
    expect(first).toBeDefined()
    expect(getStripe()).toBe(first)
  })

  it('the stripe proxy delegates property access to the lazy client', () => {
    jest.resetModules()
    process.env.STRIPE_SECRET_KEY = 'sk_test_hardening_dummy'
    const { stripe } = require('@/lib/stripe/config')
    expect(stripe.checkout).toBeDefined()
    expect(stripe.checkout.sessions).toBeDefined()
  })

  it('the stripe proxy surfaces the missing-key error instead of a build crash', () => {
    jest.resetModules()
    delete process.env.STRIPE_SECRET_KEY
    const { stripe } = require('@/lib/stripe/config')
    expect(() => stripe.checkout).toThrow('STRIPE_SECRET_KEY is not configured')
  })
})
