/**
 * Checkout Price Validation
 * Server-side validation of checkout item prices to prevent manipulation
 */

import { calculatePurePrice, calculateCarrierPrice } from '@/lib/content/pricing-engine-final'
import { calculateAtelierPrice } from '@/lib/atelier/atelier-engine'

export interface CheckoutItem {
  name: string
  description?: string
  amount: number // in cents
  quantity: number
  image?: string
  metadata?: Record<string, string>
}

const PRICE_TOLERANCE_CENTS = 2

/**
 * Calculate the canonical server-side price for a checkout item
 */
function calculateCanonicalPrice(item: CheckoutItem): number | null {
  const metadata = item.metadata || {}

  // Custom blend pricing
  if (metadata.customMix) {
    try {
      const mix = JSON.parse(metadata.customMix)
      const result = calculateAtelierPrice({
        name: mix.recipeName || item.name || 'Custom Blend',
        mode: mix.mode || 'pure',
        bottleSize: mix.totalVolume || 30,
        components: (mix.oils || []).map((o: any) => ({
          oilId: o.oilId,
          ml: o.ml || 0,
        })),
        crystalId: mix.crystalId,
        cordId: mix.cordId,
      })
      return Math.round(result.total * 100)
    } catch {
      return null
    }
  }

  // Standard oil pricing
  const oilId = metadata.oilId
  const sizeStr = metadata.size || '30ml'
  const type = metadata.type || 'pure'

  if (!oilId) {
    // No oilId and no customMix — we can't validate this item's price
    return null
  }

  const sizeMl = parseInt(sizeStr)
  if (isNaN(sizeMl) || sizeMl <= 0) {
    return null
  }

  let price: number
  if (type === 'carrier') {
    // For carrier blends, we need the ratio. Default to 25% if not specified.
    const ratio = metadata.ratio ? parseFloat(metadata.ratio) : 0.25
    price = calculateCarrierPrice(oilId, sizeMl, ratio)
  } else {
    price = calculatePurePrice(oilId, sizeMl)
  }

  return Math.round(price * 100)
}

/**
 * Validate a single checkout item's price
 */
export function validateCheckoutItem(item: CheckoutItem): { valid: boolean; error?: string } {
  if (!item.amount || item.amount <= 0) {
    return { valid: false, error: `Invalid price for "${item.name}": must be greater than 0` }
  }

  if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
    return { valid: false, error: `Invalid quantity for "${item.name}": must be a positive integer` }
  }

  const canonicalPrice = calculateCanonicalPrice(item)

  // If we can't calculate a canonical price (no identifiers), we can't validate — reject
  if (canonicalPrice === null) {
    return { valid: false, error: `Unable to validate price for "${item.name}": missing product identifiers` }
  }

  const diff = Math.abs(item.amount - canonicalPrice)
  if (diff > PRICE_TOLERANCE_CENTS) {
    return {
      valid: false,
      error: `Price mismatch for "${item.name}": submitted ${item.amount}c, expected ${canonicalPrice}c`,
    }
  }

  return { valid: true }
}

/**
 * Validate all checkout items
 */
export function validateCheckoutItems(items: CheckoutItem[]): { valid: boolean; error?: string } {
  if (!items || items.length === 0) {
    return { valid: false, error: 'Cart is empty' }
  }

  if (items.length > 50) {
    return { valid: false, error: 'Cart cannot contain more than 50 items' }
  }

  for (const item of items) {
    const result = validateCheckoutItem(item)
    if (!result.valid) {
      return result
    }
  }

  return { valid: true }
}

/**
 * Validate redirect URLs to prevent open redirect attacks
 */
export function validateRedirectUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'Redirect URL is required' }
  }

  try {
    const parsed = new URL(url)
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      'https://oilamor.com',
      'https://www.oilamor.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ].filter(Boolean) as string[]

    const isAllowed = allowedOrigins.some(origin => parsed.origin === origin)
    if (!isAllowed) {
      return { valid: false, error: 'Invalid redirect URL: domain not allowed' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid redirect URL: malformed URL' }
  }
}
