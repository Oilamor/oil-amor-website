/**
 * Stripe Checkout Client
 * Helper functions for creating checkout sessions
 */

import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js'
import { CheckoutItem } from '@/app/api/stripe/checkout/route'

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
    console.error('Checkout error:', error)
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
    console.error('Get session status error:', error)
    throw error
  }
}

/**
 * Transform cart items to checkout items
 */
export function cartItemsToCheckoutItems(
  items: Array<{
    id: string
    name: string
    description?: string
    unitPrice: number
    quantity: number
    image?: string
    oilId?: string
    size?: string
    type?: string
    customMix?: any
    configuration?: any
    properties?: Record<string, string>
  }>
): CheckoutItem[] {
  return items.map(item => ({
    name: item.name,
    description: item.description || generateItemDescription(item),
    amount: Math.round(item.unitPrice * 100), // Convert to cents
    quantity: item.quantity,
    image: item.image,
    metadata: {
      oilId: item.oilId || '',
      size: item.size || '30ml',
      type: item.type || 'pure',
      cartItemId: item.id,
      ...(item.customMix && { customMix: JSON.stringify(item.customMix) }),
      ...(item.properties?.blendId && { blendId: item.properties.blendId }),
    },
  }))
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
