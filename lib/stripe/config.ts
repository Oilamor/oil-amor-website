/**
 * Stripe Configuration
 * Payment processing setup for Oil Amor
 */

import Stripe from 'stripe'

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
}

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
}

// Server-side Stripe instance — lazy init to prevent build crashes when key is missing
let _stripe: Stripe | undefined

function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  _stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia' as any,
    typescript: true,
  })
  return _stripe
}

export { getStripe }

// Backward-compatible export — routes that import `stripe` directly should migrate to `getStripe()`
// For now we export a Proxy so `stripe.checkout.sessions.create()` works at runtime but doesn't crash at build time
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    const client = getStripe()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Price IDs for common products (create these in Stripe Dashboard)
export const STRIPE_PRICE_IDS: Record<string, string> = {
  // Oils will be created dynamically
  // These are examples - replace with your actual Stripe Price IDs
  'shipping-standard': process.env.STRIPE_SHIPPING_STANDARD_PRICE_ID || '',
  'shipping-express': process.env.STRIPE_SHIPPING_EXPRESS_PRICE_ID || '',
}

// Shipping rates configuration
export const SHIPPING_RATES = {
  domestic: {
    standard: {
      amount: 1000, // $10.00 in cents - fallback only
      description: 'Standard Shipping (3-5 business days)',
    },
    express: {
      amount: 1500, // $15.00 in cents - fallback only
      description: 'Express Shipping (1-2 business days)',
    },
    free: {
      amount: 0,
      description: 'Free Shipping',
      threshold: 19900, // Free shipping for orders over $199 (in cents)
    },
  },
  international: {
    standard: {
      amount: 2500, // $25.00 in cents
      description: 'International Standard (7-14 days)',
    },
    express: {
      amount: 5000, // $50.00 in cents
      description: 'International Express (3-5 days)',
    },
  },
}

// Helper to calculate shipping cost (fallback for non-AU or API failures)
export function calculateShippingCost(
  subtotalCents: number,
  country: string = 'AU',
  isExpress: boolean = false
): { amount: number; description: string } {
  const isDomestic = country === 'AU'
  
  if (isDomestic) {
    // Free shipping for orders over $199
    if (subtotalCents >= SHIPPING_RATES.domestic.free.threshold) {
      return SHIPPING_RATES.domestic.free
    }
    return isExpress 
      ? SHIPPING_RATES.domestic.express 
      : SHIPPING_RATES.domestic.standard
  }
  
  return isExpress 
    ? SHIPPING_RATES.international.express 
    : SHIPPING_RATES.international.standard
}

// Helper to format amount for display
export function formatStripeAmount(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount / 100)
}

// Product metadata structure for Stripe
export interface StripeProductMetadata {
  oilId?: string
  size?: string
  type: 'pure' | 'enhanced' | 'custom-mix' | 'refill'
  crystalId?: string
  cordId?: string
  charmId?: string
  carrierOilId?: string
  carrierRatio?: number
  customMixRecipe?: string // JSON stringified
}
