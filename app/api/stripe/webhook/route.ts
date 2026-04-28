/**
 * Stripe Webhook Handler
 * Processes Stripe events for order fulfillment
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { db } from '@/lib/db'
import { orders, unlockedOils, customers } from '@/lib/db/schema-refill'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Stripe webhook secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// ============================================================================
// POST /api/stripe/webhook - Handle Stripe events
// ============================================================================

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  if (!signature || !endpointSecret) {
    console.error('Missing Stripe signature or webhook secret')
    return NextResponse.json(
      { error: 'Webhook configuration error' },
      { status: 500 }
    )
  }
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  console.log(`Processing Stripe event: ${event.type}`)
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'checkout.session.async_payment_succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'checkout.session.async_payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'invoice.payment_succeeded':
        // Handle subscription invoices if needed
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { orderId, customerId, subtotal, shipping, tax, itemCount, type } = session.metadata || {}
  
  if (!orderId) {
    console.error('No orderId in session metadata')
    return
  }

  // Handle refill orders separately
  if (type === 'refill') {
    const { refillOrders } = await import('@/lib/db/schema-refill')
    const now = new Date()
    const existingRefill = await db.query.refillOrders.findFirst({
      where: eq(refillOrders.id, orderId),
    })
    if (existingRefill) {
      await db.update(refillOrders)
        .set({
          status: 'in-transit',
          updatedAt: now,
        })
        .where(eq(refillOrders.id, orderId))
      console.log(`Refill order ${orderId} payment confirmed, status updated to in-transit`)
    }
    return
  }
  
  console.log(`Processing completed checkout for order: ${orderId}`)
  
  const now = new Date()
  
  // IDEMPOTENCY GUARD — Check FIRST before any mutation
  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })
  
  if (existingOrder?.processingCompletedAt) {
    console.log(`Order ${orderId} already processed at ${existingOrder.processingCompletedAt}, skipping`)
    return NextResponse.json({ received: true, idempotency: 'skipped' })
  }
  
  let dbOrder: any = existingOrder
  
  if (existingOrder) {
    console.log(`Order ${orderId} already exists, updating status`)
    
    // Update order status
    const currentPayment = (existingOrder.payment as any) || {}
    await db.update(orders)
      .set({
        status: 'processing',
        statusHistory: [
          ...(existingOrder.statusHistory || []),
          {
            status: 'confirmed',
            timestamp: now.toISOString(),
            note: 'Payment confirmed via Stripe',
          },
        ],
        payment: {
          ...currentPayment,
          status: 'captured',
          paidAt: now.toISOString(),
          transactionId: session.payment_intent as string,
        },
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
    
    dbOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })
  } else {
    // Order doesn't exist - create it from webhook
    console.warn(`Order ${orderId} not found in database, creating from webhook`)
    
    // Extract items from session with metadata
    let orderItems: any[] = []
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product'],
      })
      
      orderItems = lineItems.data
        .filter(item => item.description !== 'Shipping' && item.description !== 'GST (10%)')
        .map(item => {
          // Get metadata from the product
          const product = (item.price?.product as any) || {}
          const metadata = product.metadata || {}
          
          const customMixRaw = metadata.customMix
          let customMix: any = undefined
          if (customMixRaw) {
            try {
              customMix = typeof customMixRaw === 'string' ? JSON.parse(customMixRaw) : customMixRaw
            } catch (e) {
              console.error('Failed to parse customMix metadata:', e)
            }
          }
          
          if (customMix) {
            return {
              id: `line_${nanoid(8)}`,
              type: 'custom-mix' as const,
              name: customMix.recipeName || item.description || 'Custom Blend',
              unitPrice: item.amount_total || 0,
              quantity: item.quantity || 1,
              subtotal: item.amount_subtotal || 0,
              taxAmount: 0,
              total: item.amount_total || 0,
              customMix,
              metadata: {
                blendId: metadata.blendId,
              },
            }
          }
          
          return {
            id: `line_${nanoid(8)}`,
            type: 'standard-oil' as const,
            name: item.description || 'Unknown Item',
            unitPrice: item.amount_total || 0,
            quantity: item.quantity || 1,
            subtotal: item.amount_subtotal || 0,
            taxAmount: 0,
            total: item.amount_total || 0,
            metadata: {
              oilId: metadata.oilId,
              size: metadata.size,
              type: metadata.type,
            },
          }
        })
    } catch (err) {
      console.error('Failed to fetch line items from Stripe session:', err)
      // Continue with empty items - order will still be created
    }
    
    console.log('[Webhook] Creating order:', { 
      orderId, 
      customerEmail: session.customer_email,
      customerId: customerId || 'guest'
    })
    
    // Create order
    await db.insert(orders).values({
      id: orderId,
      customerId: customerId || 'guest',
      customerEmail: session.customer_email || 'guest@oilamor.com',
      customerName: session.customer_details?.name || 'Guest',
      isGuest: !customerId || customerId === 'guest',
      
      status: 'confirmed',
      statusHistory: [{
        status: 'confirmed',
        timestamp: now.toISOString(),
        note: 'Payment confirmed via Stripe webhook',
      }],
      
      items: orderItems,
      
      subtotal: parseInt(subtotal || '0'),
      taxTotal: parseInt(tax || '0'),
      shippingTotal: parseInt(shipping || '0'),
      discountTotal: 0,
      total: session.amount_total || 0,
      
      currency: 'AUD',
      
      payment: {
        method: 'credit-card',
        status: 'captured',
        paidAt: now.toISOString(),
        transactionId: session.payment_intent as string,
      },
      
      shippingAddress: {
        firstName: session.metadata?.shipName?.split(' ')[0] || (session as any).shipping_details?.name?.split(' ')[0] || '',
        lastName: session.metadata?.shipName?.split(' ').slice(1).join(' ') || (session as any).shipping_details?.name?.split(' ').slice(1).join(' ') || '',
        address1: session.metadata?.shipLine1 || (session as any).shipping_details?.address?.line1 || '',
        address2: session.metadata?.shipLine2 || (session as any).shipping_details?.address?.line2 || undefined,
        city: session.metadata?.shipCity || (session as any).shipping_details?.address?.city || '',
        province: session.metadata?.shipState || (session as any).shipping_details?.address?.state || '',
        country: session.metadata?.shipCountry || (session as any).shipping_details?.address?.country || 'AU',
        zip: session.metadata?.shipPostcode || (session as any).shipping_details?.address?.postal_code || '',
        phone: session.customer_details?.phone || undefined,
      },
      
      shipping: {
        carrier: 'auspost',
        service: 'standard',
        cost: parseInt(shipping || '0') / 100,
      },
      
      isGift: session.metadata?.isGift === 'true',
      giftMessage: session.metadata?.giftMessage,
      
      requiresBlending: orderItems.some(i => i.type === 'custom-mix'),
      eligibleForReturns: parseInt(itemCount || '0') >= 1,
      
      createdAt: now,
      updatedAt: now,
    })
    
    dbOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })
  }
  
  // Set processingCompletedAt immediately to prevent duplicate processing on Stripe retries
  // This is our idempotency guarantee — once set, subsequent webhook retries will skip
  try {
    await db.update(orders)
      .set({ processingCompletedAt: now, updatedAt: now })
      .where(eq(orders.id, orderId))
  } catch (err) {
    console.error(`Failed to set processingCompletedAt for ${orderId}:`, err)
  }
  
  // Complete order processing for registered customers (unlocks, rewards, etc.)
  if (customerId && customerId !== 'guest' && dbOrder) {
    const { completeOrderProcessing } = await import('@/lib/orders/order-completion')
    
    // Fetch existing unlocks
    const dbUnlocks = await db.query.unlockedOils.findMany({
      where: eq(unlockedOils.customerId, customerId),
    })
    
    const existingUnlocks = dbUnlocks.map(u => ({
      oilId: u.oilId,
      unlockedAt: u.unlockedAt instanceof Date ? u.unlockedAt.toISOString() : String(u.unlockedAt),
      unlockedBy: u.unlockedBy,
      type: u.type as 'pure' | 'enhanced',
    }))
    
    // Construct context-style Order
    const contextOrder: import('@/lib/context/user-context').Order = {
      id: dbOrder.id,
      customerId: dbOrder.customerId,
      date: dbOrder.createdAt instanceof Date ? dbOrder.createdAt.toISOString() : String(dbOrder.createdAt),
      status: 'processing',
      items: (dbOrder.items || []).map((item: any) => {
        if (item.type === 'custom-mix' && item.customMix) {
          return {
            oilId: '',
            name: item.customMix.recipeName || item.name,
            size: `${item.customMix.totalVolume}ml`,
            type: 'pure' as const,
            price: (item.total || 0) / 100,
            customMix: item.customMix,
          }
        }
        
        return {
          oilId: item.metadata?.oilId || item.unlocksOilId || '',
          name: item.name,
          size: item.metadata?.size || '30ml',
          type: (item.metadata?.type as 'pure' | 'enhanced') || 'pure',
          price: (item.total || 0) / 100,
          blendId: item.metadata?.blendId,
        }
      }),
      total: (dbOrder.total || 0) / 100,
    }
    
    try {
      const result = await completeOrderProcessing(contextOrder, customerId, existingUnlocks)
      console.log(`Order completion processing finished for ${orderId}`)
      
      // Persist new standard oil unlocks from processing result
      for (const unlock of result.unlockResult.newUnlocks) {
        const alreadyExists = await db.query.unlockedOils.findFirst({
          where: and(eq(unlockedOils.customerId, customerId), eq(unlockedOils.oilId, unlock.oilId)),
        })
        if (!alreadyExists) {
          await db.insert(unlockedOils).values({
            id: `unlock_${nanoid(8)}`,
            customerId,
            oilId: unlock.oilId,
            unlockedAt: now,
            unlockedBy: orderId,
            type: unlock.type,
            createdAt: now,
          })
        }
      }
      
      // Persist enhanced upgrades
      for (const upgrade of result.unlockResult.upgradedUnlocks) {
        await db.update(unlockedOils)
          .set({
            type: 'enhanced',
          })
          .where(and(
            eq(unlockedOils.customerId, customerId),
            eq(unlockedOils.oilId, upgrade.oilId)
          ))
      }
    } catch (err) {
      console.error('Error in completeOrderProcessing:', err)
      // Don't fail the webhook — side effects are best-effort after idempotency is set
    }
    
    // Update customer metadata (first purchase date)
    try {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      })
      
      if (customer && !customer.metadata?.firstPurchaseDate) {
        await db.update(customers)
          .set({
            metadata: {
              ...customer.metadata,
              firstPurchaseDate: now.toISOString(),
            },
            updatedAt: now,
          })
          .where(eq(customers.id, customerId))
      }
    } catch (err) {
      console.error('Error updating customer metadata:', err)
    }
  }
  
  // Deduct inventory for ALL orders (guests included)
  if (dbOrder) {
    try {
      const { deductInventory } = await import('@/lib/inventory/inventory')
      await deductInventory(dbOrder.items || [])
      console.log(`[Inventory] Deducted stock for order ${orderId}`)
    } catch (err) {
      console.error(`[Inventory] Failed to deduct stock for order ${orderId}:`, err)
      // Don't fail the webhook
    }
    
    // Send confirmation email for ALL orders (guests included)
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend')
      
      const shippingAddress = (dbOrder.shippingAddress as any) || {}
      const firstName = session.customer_details?.name?.split(' ')[0] 
        || shippingAddress.firstName 
        || 'Customer'
      
      await sendOrderConfirmationEmail({
        to: dbOrder.customerEmail || session.customer_email || '',
        firstName,
        orderNumber: dbOrder.id,
        orderDate: now.toISOString(),
        items: (dbOrder.items || []).map((item: any) => ({
          name: item.name,
          variant: item.type === 'custom-mix' 
            ? `${item.customMix?.totalVolume}ml Custom Blend` 
            : item.metadata?.size,
          quantity: item.quantity || 1,
          price: item.total || 0,
        })),
        subtotal: dbOrder.subtotal || 0,
        shipping: dbOrder.shippingTotal || 0,
        total: dbOrder.total || 0,
        shippingAddress: {
          name: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
          line1: shippingAddress.address1 || '',
          line2: shippingAddress.address2,
          city: shippingAddress.city || '',
          state: shippingAddress.province || '',
          postalCode: shippingAddress.zip || '',
          country: shippingAddress.country || 'AU',
        },
      })
      
      console.log(`Order confirmation email sent for ${orderId}`)
    } catch (err) {
      console.error('Error sending order confirmation email:', err)
      // Don't fail the webhook
    }
  }
  
  console.log(`Order ${orderId} confirmed and saved`)
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  console.log(`Payment succeeded for session: ${session.id}`)
  // Additional success handling if needed
}

async function handlePaymentFailure(session: Stripe.Checkout.Session) {
  const { orderId } = session.metadata || {}
  
  if (!orderId) {
    console.error('No orderId in session metadata for failed payment')
    return
  }
  
  console.log(`Payment failed for order: ${orderId}`)
  
  // Update order status to cancelled or pending
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })
  
  if (order) {
    await db.update(orders)
      .set({
        status: 'cancelled',
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            note: 'Payment failed',
          },
        ],
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent failed: ${paymentIntent.id}`)
  // Handle failed payment intent if needed
}

// ============================================================================
// Route Configuration
// ============================================================================

export const dynamic = 'force-dynamic'  // Disable static generation for webhook
export const runtime = 'nodejs'         // Use Node.js runtime
