/**
 * Stripe Checkout Client
 * Helper functions for creating checkout sessions
 */

import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js'
import { CheckoutItem } from '@/app/api/stripe/checkout/route'
import { logger } from '@/lib/logging/logger'

// Load Stripe.js
let stripePromise: Promise<StripeJS | null>

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
  }
  return stripePromise
}

export interface CreateCheckoutParams {
  items: CheckoutItem[]
  customerEmail?: string
  customerId?: string
  shippingAddress: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    province: string
    postalCode: string
    country: string
  }
  isExpressShipping?: boolean
  giftMessage?: string
  isGift?: boolean
  creditUsed?: number // in cents
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutResult {
  success: boolean
  sessionId?: string
  orderId?: string
  url?: string
  error?: string
}

/**
 * Create a Stripe Checkout session and redirect to payment
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult> {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        successUrl: params.successUrl || `${window.location.origin}/checkout/success`,
        cancelUrl: params.cancelUrl || `${window.location.origin}/cart`,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create checkout session')
    }
    
    const { sessionId, orderId, url } = await response.json()
    
    // Redirect to Stripe Checkout using URL (redirectToCheckout is deprecated)
    if (url) {
      window.location.href = url
      return { success: true, sessionId, orderId, url }
    }
    
    throw new Error('No checkout URL returned from server')
    
  } catch (error: any) {
    logger.error('Checkout error', error instanceof Error ? error : new Error(String(error)))
    return {
      success: false,
      error: error.message || 'An error occurred during checkout',
    }
  }
}

/**
 * Check the status of a checkout session
 */
export async function getCheckoutSessionStatus(sessionId: string) {
  try {
    const response = await fetch(`/api/stripe/checkout?session_id=${sessionId}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get session status')
    }
    
    return await response.json()
    
  } catch (error: any) {
    logger.error('Get session status error', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

export interface CartItemForCheckout {
  id: string
  productId?: string
  variantId?: string
  name: string
  description?: string
  unitPrice: number
  quantity: number
  image?: string
  customMix?: any
  configuration?: Record<string, any>
  properties?: Record<string, string>
  // Legacy top-level fields (older cart payloads)
  oilId?: string
  size?: string
  type?: string
}

/**
 * Transform cart items to checkout items
 */
export function cartItemsToCheckoutItems(items: CartItemForCheckout[]): CheckoutItem[] {
  return items.map(item => {
    const properties = item.properties || {}
    const configuration = item.configuration || {}
    const isGiftCard =
      properties.type === 'gift-card' ||
      (item.productId || '').startsWith('gift-card') ||
      (properties.sku || '').startsWith('GIFT-')

    // Gift cards: the charged amount comes from the card denomination encoded
    // in the product identifiers, never from the client-side cart price
    if (isGiftCard) {
      const denomination = parseGiftCardDenomination(item)
      return {
        name: item.name,
        description: item.description || 'Digital gift card — delivered by email',
        amount: denomination !== null ? denomination * 100 : Math.round(item.unitPrice * 100),
        quantity: item.quantity,
        image: item.image,
        metadata: {
          type: 'gift-card',
          giftCardAmount: denomination !== null ? String(denomination) : '',
          cartItemId: item.id,
          ...(properties.recipientName && { recipientName: properties.recipientName }),
          ...(properties.recipientEmail && { recipientEmail: properties.recipientEmail }),
          ...(properties.senderName && { senderName: properties.senderName }),
          ...(properties.message && { message: properties.message }),
          ...(properties.deliveryDate && { deliveryDate: properties.deliveryDate }),
        },
      }
    }

    // Standard products store identifiers in properties/configuration, not at
    // the top level of the cart item (top-level kept as a legacy fallback)
    const oilId = item.oilId || properties.oilId || ''
    const size = item.size || properties.size || (configuration.bottleSize as string) || ''
    const type = item.type || properties.type || (configuration.type as string) || ''
    const ratio = properties.ratio || (configuration.ratio as string) || ''
    const carrierOil = properties.carrier || (configuration.carrierOil as string) || ''

    return {
      name: item.name,
      description: item.description || generateItemDescription({ ...item, size, type }),
      amount: Math.round(item.unitPrice * 100), // Convert to cents
      quantity: item.quantity,
      image: item.image,
      metadata: {
        oilId,
        size,
        type,
        ...(ratio && { ratio }),
        ...(carrierOil && { carrierOil }),
        cartItemId: item.id,
        ...(item.customMix && { customMix: JSON.stringify(item.customMix) }),
        ...(item.properties?.blendId && { blendId: item.properties.blendId }),
      },
    }
  })
}

/**
 * Gift card denominations are encoded in the product identifiers
 * ('gift-card-100' productId/variantId, 'GIFT-100' sku)
 */
function parseGiftCardDenomination(item: CartItemForCheckout): number | null {
  for (const candidate of [item.productId, item.variantId, item.properties?.sku]) {
    const match = candidate?.match(/(\d+(?:\.\d+)?)$/)
    if (match) {
      const value = parseFloat(match[1])
      if (value > 0) return value
    }
  }
  const fromProperties = parseFloat(item.properties?.price || '')
  return !isNaN(fromProperties) && fromProperties > 0 ? fromProperties : null
}

function generateItemDescription(item: any): string {
  const parts: string[] = []
  
  // Size
  if (item.size) {
    parts.push(item.size)
  }
  
  // Type with carrier/ratio details
  if (item.type === 'carrier' && item.configuration) {
    const { carrierOil, ratio } = item.configuration
    if (carrierOil && ratio) {
      parts.push(`${carrierOil} • ${ratio}`)
    } else {
      parts.push('Carrier Enhanced')
    }
  } else if (item.type === 'pure') {
    parts.push('Pure Essential Oil')
  } else if (item.type) {
    parts.push(item.type)
  }
  
  // Crystal
  if (item.configuration?.crystalName) {
    parts.push(`with ${item.configuration.crystalName}`)
  }
  
  // Cord
  if (item.configuration?.cord) {
    parts.push(`+ ${item.configuration.cord} cord`)
  }
  
  // Custom Mix details
  if (item.customMix) {
    const oilNames = item.customMix.oils?.map((o: any) => o.oilName || o.name).slice(0, 3).join(', ')
    parts.push(`Custom: ${item.customMix.recipeName || 'Blend'}`)
    if (oilNames) parts.push(`(${oilNames})`)
    if (item.customMix.totalVolume) parts.push(`${item.customMix.totalVolume}ml`)
  }
  
  return parts.join(' • ') || 'Essential Oil'
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

// Free shipping threshold in cents — must match SHIPPING_RATES in lib/stripe/config.ts
export const FREE_SHIPPING_THRESHOLD_CENTS = 19900

export interface CheckoutTotals {
  subtotal: number // dollars
  shipping: number // dollars
  gst: number // dollars
  total: number // dollars
  itemCount: number
}

/**
 * Calculate checkout totals with the exact same rounding as the server
 * (app/api/stripe/checkout/route.ts) so the displayed total matches the charged total.
 * All intermediate math is done in cents.
 */
export function calculateCheckoutTotals(
  items: Array<{ unitPrice: number; quantity: number }>,
  options: { shippingAmountCents?: number | null; country?: string; creditCents?: number } = {}
): CheckoutTotals {
  const subCents = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0)
  const shipCents = subCents >= FREE_SHIPPING_THRESHOLD_CENTS
    ? 0
    : (options.shippingAmountCents ?? 1000)
  // 10% GST applies to subtotal AND shipping for Australian orders
  const gstCents = (options.country ?? 'AU') === 'AU' ? Math.round((subCents + shipCents) * 0.1) : 0
  const creditCents = options.creditCents ?? 0

  return {
    subtotal: subCents / 100,
    shipping: shipCents / 100,
    gst: gstCents / 100,
    total: Math.max(0, (subCents + shipCents + gstCents - creditCents) / 100),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}
