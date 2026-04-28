/**
 * Stripe Checkout Session API
 * Creates checkout sessions for Oil Amor orders
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, calculateShippingCost, SHIPPING_RATES } from '@/lib/stripe/config'
import { getBestShippingRate, calculateParcelWeight } from '@/lib/shipping/auspost'
import { nanoid } from 'nanoid'
import { validateCheckoutItems, validateRedirectUrl } from '@/lib/pricing/checkout-validation'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export interface CheckoutItem {
  name: string
  description?: string
  amount: number // in cents
  quantity: number
  image?: string
  metadata?: Record<string, string>
}

export interface CheckoutSessionRequest {
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
  successUrl: string
  cancelUrl: string
}

// ============================================================================
// POST /api/stripe/checkout - Create checkout session
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutSessionRequest = await request.json()
    
    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }
    
    if (!body.shippingAddress) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }
    
    // SECURITY: Server-side price validation — prevent price manipulation
    const priceValidation = validateCheckoutItems(body.items)
    if (!priceValidation.valid) {
      console.error('[Checkout] Price validation failed:', priceValidation.error)
      return NextResponse.json(
        { error: priceValidation.error },
        { status: 400 }
      )
    }
    
    // SECURITY: Validate redirect URLs to prevent open redirect
    const successUrlValidation = validateRedirectUrl(body.successUrl)
    if (!successUrlValidation.valid) {
      return NextResponse.json(
        { error: successUrlValidation.error },
        { status: 400 }
      )
    }
    
    const cancelUrlValidation = validateRedirectUrl(body.cancelUrl)
    if (!cancelUrlValidation.valid) {
      return NextResponse.json(
        { error: cancelUrlValidation.error },
        { status: 400 }
      )
    }
    
    // Calculate subtotal
    const subtotal = body.items.reduce((sum, item) => 
      sum + (item.amount * item.quantity), 0
    )
    
    // Calculate shipping
    const totalItems = body.items.reduce((sum, item) => sum + item.quantity, 0)
    const hasCustomBlends = body.items.some(i => i.metadata?.customMix)
    
    let shipping: { amount: number; description: string }
    
    if (body.shippingAddress.country === 'AU' && subtotal < SHIPPING_RATES.domestic.free.threshold) {
      // Live AusPost rate for Australian orders under free shipping threshold
      const weightKg = calculateParcelWeight(totalItems, hasCustomBlends)
      shipping = await getBestShippingRate(
        body.shippingAddress.postalCode,
        weightKg,
        body.isExpressShipping
      )
    } else {
      // Free shipping over $199, or international fallback
      shipping = calculateShippingCost(
        subtotal,
        body.shippingAddress.country,
        body.isExpressShipping
      )
    }
    
    // Calculate tax (10% GST for Australia) — GST applies to both subtotal AND shipping
    const taxRate = body.shippingAddress.country === 'AU' ? 0.1 : 0
    const taxAmount = Math.round((subtotal + shipping.amount) * taxRate)
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}-${nanoid(4).toUpperCase()}`
    
    // Create or retrieve Stripe Customer for address pre-fill
    let stripeCustomerId: string | undefined
    try {
      // Search for existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: body.customerEmail,
        limit: 1,
      })
      
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id
        // Update customer with latest address
        await stripe.customers.update(stripeCustomerId, {
          shipping: {
            name: `${body.shippingAddress.firstName} ${body.shippingAddress.lastName}`,
            address: {
              line1: body.shippingAddress.address1,
              line2: body.shippingAddress.address2 || undefined,
              city: body.shippingAddress.city,
              state: body.shippingAddress.province,
              postal_code: body.shippingAddress.postalCode,
              country: body.shippingAddress.country,
            },
          },
          metadata: {
            customerId: body.customerId || 'guest',
          },
        })
      } else if (body.customerEmail) {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: body.customerEmail,
          name: `${body.shippingAddress.firstName} ${body.shippingAddress.lastName}`,
          shipping: {
            name: `${body.shippingAddress.firstName} ${body.shippingAddress.lastName}`,
            address: {
              line1: body.shippingAddress.address1,
              line2: body.shippingAddress.address2 || undefined,
              city: body.shippingAddress.city,
              state: body.shippingAddress.province,
              postal_code: body.shippingAddress.postalCode,
              country: body.shippingAddress.country,
            },
          },
          metadata: {
            customerId: body.customerId || 'guest',
          },
        })
        stripeCustomerId = newCustomer.id
      }
    } catch (err) {
      console.error('Error creating/updating Stripe customer:', err)
      // Continue without customer - checkout will still work
    }
    
    // Build line items for Stripe
    const lineItems = body.items.map(item => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.name,
          description: item.description,
          images: item.image ? [item.image] : undefined,
          metadata: {
            ...item.metadata,
            orderId,
          },
        },
        unit_amount: item.amount, // Already in cents
      },
      quantity: item.quantity,
    }))
    
    // Add shipping as line item
    lineItems.push({
      price_data: {
        currency: 'aud',
        product_data: {
          name: 'Shipping',
          description: shipping.description,
          images: undefined,
          metadata: { orderId },
        },
        unit_amount: shipping.amount,
      },
      quantity: 1,
    })
    
    // Add tax as line item if applicable
    if (taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'GST (10%)',
            description: 'Australian Goods and Services Tax',
            images: undefined as any,
            metadata: { orderId } as any,
          },
          unit_amount: taxAmount,
        },
        quantity: 1,
      })
    }
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      
      // Line items
      line_items: lineItems,
      
      // Customer info - use customer ID if available (pre-fills address)
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: body.customerEmail }),
      
      // Shipping address collection
      shipping_address_collection: {
        allowed_countries: ['AU', 'NZ', 'US', 'GB', 'CA', 'DE', 'FR', 'JP', 'SG'],
      },
      
      // Collect phone number for delivery
      phone_number_collection: {
        enabled: true,
      },
      
      // Metadata for webhook processing
      metadata: {
        orderId,
        customerId: body.customerId || 'guest',
        customerEmail: body.customerEmail || '',
        isGift: body.isGift ? 'true' : 'false',
        giftMessage: body.giftMessage || '',
        subtotal: String(subtotal),
        shipping: String(shipping.amount),
        tax: String(taxAmount),
        itemCount: String(totalItems),
        // Store original shipping address as source of truth
        shipName: `${body.shippingAddress.firstName} ${body.shippingAddress.lastName}`,
        shipLine1: body.shippingAddress.address1,
        shipLine2: body.shippingAddress.address2 || '',
        shipCity: body.shippingAddress.city,
        shipState: body.shippingAddress.province,
        shipPostcode: body.shippingAddress.postalCode,
        shipCountry: body.shippingAddress.country,
      },
      
      // Success and cancel URLs
      success_url: `${body.successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: body.cancelUrl,
      
      // Expire after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      
      // Custom text
      custom_text: {
        submit: {
          message: 'Thank you for supporting sustainable essential oils!',
        } as any,
      },
      
      // Invoice settings
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Oil Amor Order ${orderId}`,
          footer: 'Thank you for your purchase! Return your bottles for $5 credit each.',
        },
      },
      
      // Receipt settings
      payment_intent_data: {
        receipt_email: body.customerEmail,
        metadata: {
          orderId,
          customerId: body.customerId || 'guest',
        },
      },
    })
    
    return NextResponse.json({
      sessionId: session.id,
      orderId,
      url: session.url,
      amount_total: session.amount_total,
    })
    
  } catch (error) {
    console.error('Stripe checkout error:', error)
    
    if (error instanceof stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/stripe/checkout - Retrieve checkout session status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent', 'customer'],
    })
    
    // SECURITY: Only allow retrieval by the session's customer or an admin
    const userSession = await getSession()
    const isCustomer = userSession.isLoggedIn && session.customer_email === userSession.email
    
    // If not the customer, check admin auth
    if (!isCustomer) {
      const { requireAdminAuth } = await import('@/lib/admin/auth')
      const adminError = await requireAdminAuth(request)
      if (adminError) return adminError
    }
    
    return NextResponse.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      customer_email: session.customer_email,
      metadata: session.metadata,
      line_items: session.line_items,
    })
    
  } catch (error) {
    console.error('Stripe session retrieve error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    )
  }
}
