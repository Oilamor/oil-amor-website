/**
 * Checkout Price Validation
 * Server-side validation of checkout item prices to prevent manipulation
 */

import { calculatePurePrice, calculateCarrierPrice } from '@/lib/content/pricing-engine-final'
import { calculateAtelierPrice } from '@/lib/atelier/atelier-engine'
import { CARRIER_RATIOS } from '@/lib/content/ratio-engine'

export interface CheckoutItem {
  name: string
  description?: string
  amount: number // in cents
  quantity: number
  image?: string
  metadata?: Record<string, string>
}

const PRICE_TOLERANCE_CENTS = 2

// Gift cards are sold at fixed denominations (matches app/gift-cards/page.tsx)
export const GIFT_CARD_DENOMINATIONS_CENTS: readonly number[] = [5000, 10000, 20000, 50000]

// Tolerance when comparing blend component volumes (ml values are rounded to 0.1)
const MIX_VOLUME_TOLERANCE_ML = 0.25

// Tolerance for the sum of blend oil percentages (each is rounded to a whole %)
const MIX_PERCENTAGE_TOLERANCE = 5

/**
 * Resolve a carrier blend ratio to a decimal (0.05–0.75).
 * Accepts decimals ('0.25'), percentages ('25'), and configurator preset names/ids.
 */
function parseCarrierRatio(raw: string | undefined): number {
  if (!raw) return 0.25

  const asNumber = parseFloat(raw)
  if (!isNaN(asNumber) && asNumber > 0) {
    if (asNumber < 1) return asNumber
    if (asNumber <= 75) return asNumber / 100
  }

  const preset = CARRIER_RATIOS.find(r => r.name === raw || r.id === raw)
  return preset ? preset.essentialOilPercent / 100 : 0.25
}

/**
 * Calculate the canonical server-side price for a standard oil item
 */
function calculateCanonicalPrice(item: CheckoutItem): number | null {
  const metadata = item.metadata || {}

  const oilId = metadata.oilId
  if (!oilId) {
    // No oilId and no customMix — we can't validate this item's price
    return null
  }

  const sizeMl = parseInt(metadata.size || '')
  if (isNaN(sizeMl) || sizeMl <= 0) {
    return null
  }

  const type = metadata.type || 'pure'
  const price = type === 'carrier'
    ? calculateCarrierPrice(oilId, sizeMl, parseCarrierRatio(metadata.ratio))
    : calculatePurePrice(oilId, sizeMl)

  // Unknown oils / invalid variants must not validate as free
  if (!isFinite(price) || price <= 0) {
    return null
  }

  return Math.round(price * 100)
}

/**
 * Validate a gift card item against the fixed denomination set.
 * The client price is never trusted — it must match the declared denomination,
 * and the denomination must be one we actually sell.
 */
function validateGiftCardItem(item: CheckoutItem): { valid: boolean; error?: string } {
  const metadata = item.metadata || {}
  const declaredDollars = parseFloat(metadata.giftCardAmount || '')

  if (!declaredDollars || isNaN(declaredDollars) || declaredDollars <= 0) {
    return { valid: false, error: `Invalid gift card "${item.name}": missing denomination` }
  }

  if (Math.round(declaredDollars * 100) !== item.amount) {
    return {
      valid: false,
      error: `Price mismatch for "${item.name}": amount does not match the gift card denomination`,
    }
  }

  if (!GIFT_CARD_DENOMINATIONS_CENTS.includes(item.amount)) {
    return {
      valid: false,
      error: `Invalid gift card denomination for "${item.name}": $${(item.amount / 100).toFixed(2)} is not an available amount`,
    }
  }

  return { valid: true }
}

/**
 * Validate a custom blend item: component volumes must add up to the bottle
 * contents, then the price is recomputed server-side from the recipe.
 */
function validateCustomMixItem(item: CheckoutItem, mix: any): { valid: boolean; error?: string } {
  const oils = Array.isArray(mix.oils) ? mix.oils : []
  if (oils.length === 0) {
    return { valid: false, error: `Invalid custom blend "${item.name}": no oils specified` }
  }

  const totalVolume = typeof mix.totalVolume === 'number' ? mix.totalVolume : parseFloat(mix.totalVolume)
  if (!totalVolume || isNaN(totalVolume) || totalVolume <= 0) {
    return { valid: false, error: `Invalid custom blend "${item.name}": missing total volume` }
  }

  for (const oil of oils) {
    if (!oil.oilId) {
      return { valid: false, error: `Invalid custom blend "${item.name}": every oil needs an oilId` }
    }
    if (typeof oil.ml !== 'number' || !(oil.ml > 0)) {
      return { valid: false, error: `Invalid custom blend "${item.name}": every oil needs a positive ml amount` }
    }
  }

  // The component volumes must add up to the bottle contents — otherwise the
  // client could order a large bottle while only paying for a small volume of oils
  const sumMl = oils.reduce((sum: number, o: any) => sum + o.ml, 0)
  const expectedMl = mix.mode === 'carrier' && typeof mix.carrierRatio === 'number'
    ? totalVolume * (mix.carrierRatio / 100)
    : totalVolume
  if (Math.abs(sumMl - expectedMl) > MIX_VOLUME_TOLERANCE_ML) {
    return {
      valid: false,
      error: `Invalid custom blend "${item.name}": oil volumes (${sumMl.toFixed(1)}ml) do not add up to the ${totalVolume}ml bottle`,
    }
  }

  // Percentages, when present, must be consistent with the ml amounts
  const percentages = oils.map((o: any) => o.percentage).filter((p: any) => typeof p === 'number')
  if (percentages.length === oils.length) {
    const sumPercentage = percentages.reduce((a: number, b: number) => a + b, 0)
    if (Math.abs(sumPercentage - 100) > MIX_PERCENTAGE_TOLERANCE) {
      return {
        valid: false,
        error: `Invalid custom blend "${item.name}": oil percentages do not add up to 100%`,
      }
    }
  }

  let canonicalPrice: number
  try {
    const result = calculateAtelierPrice({
      name: mix.recipeName || item.name || 'Custom Blend',
      mode: mix.mode || 'pure',
      bottleSize: totalVolume as 5 | 10 | 15 | 20 | 30,
      components: oils.map((o: any) => ({
        oilId: o.oilId,
        ml: o.ml,
      })),
      crystalId: mix.crystalId,
      cordId: mix.cordId,
    })
    canonicalPrice = Math.round(result.total * 100)
  } catch (err) {
    // Unknown oils and other pricing failures are a hard reject
    return {
      valid: false,
      error: `Invalid custom blend "${item.name}": ${err instanceof Error ? err.message : 'could not be priced'}`,
    }
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
 * Validate a single checkout item's price
 */
export function validateCheckoutItem(item: CheckoutItem): { valid: boolean; error?: string } {
  if (!item.amount || item.amount <= 0) {
    return { valid: false, error: `Invalid price for "${item.name}": must be greater than 0` }
  }

  if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
    return { valid: false, error: `Invalid quantity for "${item.name}": must be a positive integer` }
  }

  const metadata = item.metadata || {}

  // Gift cards have their own denomination-based validation
  if (metadata.type === 'gift-card') {
    return validateGiftCardItem(item)
  }

  // Custom blends are repriced from the recipe
  if (metadata.customMix) {
    let mix: any
    try {
      mix = JSON.parse(metadata.customMix)
    } catch {
      return { valid: false, error: `Invalid custom blend "${item.name}": malformed mix data` }
    }
    return validateCustomMixItem(item, mix)
  }

  const canonicalPrice = calculateCanonicalPrice(item)

  // If we can't calculate a canonical price (no identifiers), we can't validate — reject
  if (canonicalPrice === null) {
    return { valid: false, error: `Unable to validate price for "${item.name}": missing or invalid product identifiers` }
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
