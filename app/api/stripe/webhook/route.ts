/**
 * Stripe Webhook Handler
 * Processes Stripe events for order fulfillment
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/config'
import { db } from '@/lib/db'
import { orders, unlockedOils, customers } from '@/lib/db/schema-refill'
import { checkoutRecipes } from '@/lib/db/schema/checkout-recipes'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logging/logger'
import type { OrderCustomMix, ShippingAddress } from '@/lib/db/schema/orders'
import { reverseBlendCommission } from '@/lib/community-blends/commissions'
import {
  restoreCustomerCredits,
  restoreRefillCredit,
  releaseBottleLock,
} from '@/lib/refill/credit-restore'
import { revokeOrderUnlocks } from '@/lib/orders/revocations'
import { restoreOrderInventory } from '@/lib/inventory/refund-restore'

// Stripe webhook secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// ============================================================================
// LOCAL TYPES
// ============================================================================

type DbOrder = typeof orders.$inferSelect
type DbOrderItem = NonNullable<DbOrder['items']>[number]

/** Order items as actually stored by checkout/webhook (schema $type + metadata) */
type WebhookOrderItem = Omit<DbOrderItem, 'customMix'> & {
  customMix?: OrderCustomMix
  metadata?: {
    oilId?: string
    size?: string
    type?: string
    blendId?: string
  }
}

// ============================================================================
// POST /api/stripe/webhook - Handle Stripe events
// ============================================================================

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !endpointSecret) {
    logger.error('Missing Stripe signature or webhook secret', new Error('Missing Stripe signature or webhook secret'))
    return NextResponse.json(
      { error: 'Webhook configuration error' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }


  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.async_payment_succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.Checkout.Session)
        break

      case 'checkout.session.async_payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.Checkout.Session)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'invoice.payment_succeeded':
        // Handle subscription invoices if needed
        break

      default:
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error('Webhook processing error', error instanceof Error ? error : new Error(String(error)))
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
    logger.error('No orderId in session metadata', new Error('No orderId in session metadata'))
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
    }
    return
  }


  const now = new Date()

  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })

  let dbOrder: DbOrder | undefined = existingOrder

  if (existingOrder) {
    // ATOMIC IDEMPOTENCY CLAIM — a single UPDATE grabs processing rights.
    // Exactly one concurrent handler wins; losers update 0 rows and ack as duplicate.
    const claimed = await db.update(orders)
      .set({ processingCompletedAt: now, updatedAt: now })
      .where(and(eq(orders.id, orderId), isNull(orders.processingCompletedAt)))
      .returning({ id: orders.id })

    if (claimed.length === 0) {
      logger.info(`[Webhook] Duplicate checkout.session.completed for ${orderId} — skipping side effects`)
      return
    }

    // Update order status
    const currentPayment: DbOrder['payment'] = existingOrder.payment || { method: 'credit-card', status: 'pending' }
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

    // Extract items from session with metadata
    let orderItems: WebhookOrderItem[] = []
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product'],
      })

      orderItems = await Promise.all(lineItems.data
        .filter(item => item.description !== 'Shipping' && item.description !== 'GST (10%)')
        .map(async (item): Promise<WebhookOrderItem> => {
          // Get metadata from the product
          const metadata = getProductMetadata(item.price?.product)

          // Resolve the full recipe staged at checkout (Stripe caps metadata
          // values at 500 chars, so checkout passes a customMixRef instead of
          // the recipe). Guest checkout has no session — resolution is a
          // plain table lookup keyed by the ref.
          let customMix: OrderCustomMix | undefined
          if (metadata.customMixRef) {
            try {
              const staged = await db.query.checkoutRecipes.findFirst({
                where: eq(checkoutRecipes.id, metadata.customMixRef),
              })
              if (staged) {
                customMix = staged.recipe as OrderCustomMix
                await db.delete(checkoutRecipes).where(eq(checkoutRecipes.id, metadata.customMixRef))
              } else {
                logger.warn(`[Webhook] customMixRef ${metadata.customMixRef} for order ${orderId} not found — falling back to summary fields`)
              }
            } catch (e) {
              logger.error(`[Webhook] Failed to resolve customMixRef ${metadata.customMixRef} for order ${orderId}`, e instanceof Error ? e : new Error(String(e)))
            }
          }

          // Legacy checkouts embedded the recipe JSON directly in metadata
          if (!customMix && metadata.customMix) {
            try {
              customMix = JSON.parse(metadata.customMix) as OrderCustomMix
            } catch (e) {
              logger.error('Failed to parse customMix metadata', e instanceof Error ? e : new Error(String(e)))
            }
          }

          // Unresolvable ref (expired row, staging failure) must not drop the
          // order — rebuild a minimal mix from the compact summary fields.
          if (!customMix && metadata.customMixSummary) {
            try {
              const summary = JSON.parse(metadata.customMixSummary) as {
                recipeName?: string
                mode?: string
                totalVolume?: number
                oilCount?: number
              }
              customMix = {
                recipeName: summary.recipeName || item.description || 'Custom Blend',
                mode: summary.mode === 'carrier' ? 'carrier' : 'pure',
                oils: [],
                totalVolume: (summary.totalVolume ?? 30) as OrderCustomMix['totalVolume'],
                safetyScore: 0,
                safetyRating: 'unknown',
                safetyWarnings: ['Full recipe unavailable — staged recipe missing at webhook time'],
                labCertified: false,
              }
              logger.warn(`[Webhook] Order ${orderId} custom mix reconstructed from summary only`, { recipeName: summary.recipeName })
            } catch (e) {
              logger.error('Failed to parse customMixSummary metadata', e instanceof Error ? e : new Error(String(e)))
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
              blendId: metadata.blendId || undefined,
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
        }))
    } catch (err) {
      logger.error('Failed to fetch line items from Stripe session', err instanceof Error ? err : new Error(String(err)))
      // Continue with empty items - order will still be created
    }

    // Create order — concurrent deliveries can both miss the initial SELECT,
    // so tolerate a unique-violation here and let the claim below arbitrate.
    try {
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
          firstName: session.metadata?.shipName?.split(' ')[0] || session.collected_information?.shipping_details?.name?.split(' ')[0] || '',
          lastName: session.metadata?.shipName?.split(' ').slice(1).join(' ') || session.collected_information?.shipping_details?.name?.split(' ').slice(1).join(' ') || '',
          address1: session.metadata?.shipLine1 || session.collected_information?.shipping_details?.address?.line1 || '',
          address2: session.metadata?.shipLine2 || session.collected_information?.shipping_details?.address?.line2 || undefined,
          city: session.metadata?.shipCity || session.collected_information?.shipping_details?.address?.city || '',
          province: session.metadata?.shipState || session.collected_information?.shipping_details?.address?.state || '',
          country: session.metadata?.shipCountry || session.collected_information?.shipping_details?.address?.country || 'AU',
          zip: session.metadata?.shipPostcode || session.collected_information?.shipping_details?.address?.postal_code || '',
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
    } catch (insertErr) {
      logger.warn(`[Webhook] Order ${orderId} insert raced with a concurrent delivery — falling through to idempotency claim`, {
        error: insertErr instanceof Error ? insertErr.message : String(insertErr),
      })
    }

    // ATOMIC IDEMPOTENCY CLAIM — only the delivery that wins this UPDATE
    // proceeds to side effects (credits, unlocks, inventory, emails).
    const claimed = await db.update(orders)
      .set({ processingCompletedAt: now, updatedAt: now })
      .where(and(eq(orders.id, orderId), isNull(orders.processingCompletedAt)))
      .returning({ id: orders.id })

    if (claimed.length === 0) {
      logger.info(`[Webhook] Duplicate checkout.session.completed for ${orderId} — skipping side effects`)
      return
    }

    dbOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })
  }

  // Process store credit usage
  const creditUsedCents = parseInt(session.metadata?.creditUsed || '0')
  if (creditUsedCents > 0 && customerId && customerId !== 'guest') {
    try {
      const { useCredits: deductCredits } = await import('@/lib/refill/credits')
      const creditResult = await deductCredits(customerId, creditUsedCents, orderId)
      if (creditResult.success) {
        // Update order to record store credit used
        await db.update(orders)
          .set({
            storeCreditUsed: creditUsedCents,
            updatedAt: now,
          })
          .where(eq(orders.id, orderId))
      }
    } catch (creditErr) {
      logger.error(`[Webhook] Failed to deduct store credit for ${orderId}`, creditErr instanceof Error ? creditErr : new Error(String(creditErr)))
      // Don't fail the webhook — credit deduction is best-effort
    }
  }

  // Construct context-style Order — shared by registered-customer completion
  // processing and the guest community-blend legs below.
  const contextOrder: import('@/lib/context/user-context').Order | null = dbOrder ? {
    id: dbOrder.id,
    customerId: dbOrder.customerId,
    date: dbOrder.createdAt instanceof Date ? dbOrder.createdAt.toISOString() : String(dbOrder.createdAt),
    status: 'processing',
    items: ((dbOrder.items || []) as WebhookOrderItem[]).map((item) => {
      if (item.type === 'custom-mix' && item.customMix) {
        return {
          oilId: '',
          name: item.customMix.recipeName || item.name,
          size: `${item.customMix.totalVolume}ml`,
          type: 'pure' as const,
          price: (item.total || 0) / 100,
          customMix: item.customMix,
          blendId: item.blendId || item.metadata?.blendId,
        }
      }

      return {
        oilId: item.metadata?.oilId || item.unlocksOilId || '',
        name: item.name,
        size: item.metadata?.size || '30ml',
        type: (item.metadata?.type as 'pure' | 'enhanced') || 'pure',
        price: (item.total || 0) / 100,
        blendId: item.blendId || item.metadata?.blendId,
      }
    }),
    total: (dbOrder.total || 0) / 100,
  } : null

  // Complete order processing for registered customers (unlocks, rewards, etc.)
  if (customerId && customerId !== 'guest' && dbOrder && contextOrder) {
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

    try {
      const result = await completeOrderProcessing(contextOrder, customerId, existingUnlocks)

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
      logger.error('Error in completeOrderProcessing', err instanceof Error ? err : new Error(String(err)))
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
      logger.error('Error updating customer metadata', err instanceof Error ? err : new Error(String(err)))
    }
  }

  // Community-blend legs for GUEST buyers. Creator attribution comes from the
  // blend lookup (item.blendId), not the buyer's session, so purchase
  // recording + creator commission must run for guests too — only the
  // login-only legs (oil unlocks, ambassador credit, health profile) stay
  // gated. Registered buyers already received these via completeOrderProcessing.
  // Refund reversal is symmetric: handleChargeRefunded reverses commissions
  // for every order regardless of guest status.
  if ((!customerId || customerId === 'guest') && contextOrder) {
    try {
      const { processCommunityBlendPurchases } = await import('@/lib/orders/order-completion')
      const { communityShares, commissionResults } = await processCommunityBlendPurchases(contextOrder)

      for (const share of communityShares) {
        if (!share.success) {
          logger.error(`[Webhook] Guest community share failed for order ${orderId}`, new Error(share.error || 'unknown error'), { blendName: share.blendName })
        }
      }
      for (const commission of commissionResults) {
        if (!commission.success) {
          logger.error(`[Webhook] Guest blend commission failed for order ${orderId}`, new Error('recordBlendPurchase failed'), { blendId: commission.blendId })
        }
      }
    } catch (err) {
      logger.error('Error processing guest community blend purchases', err instanceof Error ? err : new Error(String(err)))
      // Don't fail the webhook — side effects are best-effort after idempotency is set
    }
  }

  // Deduct inventory for ALL orders (guests included)
  if (dbOrder) {
    try {
      const { deductInventory } = await import('@/lib/inventory/inventory')
      await deductInventory(dbOrder.items || [])
    } catch (err) {
      logger.error(`[Inventory] Failed to deduct stock for order ${orderId}`, err instanceof Error ? err : new Error(String(err)))
      // Don't fail the webhook
    }

    // Send confirmation email for ALL orders (guests included)
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email/resend')

      const shippingAddress: Partial<ShippingAddress> = dbOrder.shippingAddress || {}
      const firstName = session.customer_details?.name?.split(' ')[0]
        || shippingAddress.firstName
        || 'Customer'

      // Custom-mix blend: QR + batch link + one-click reorder for the confirmation email
      let customBlend:
        | { blendName: string; batchUrl: string; reorderUrl: string; qrDataUrl: string }
        | undefined
      const customMixItem = ((dbOrder.items || []) as WebhookOrderItem[]).find(
        (item) => item.type === 'custom-mix' && item.customMix?.batchId
      )
      if (customMixItem?.customMix?.batchId) {
        try {
          const { buildAtelierReorderUrlFromMix } = await import('@/lib/atelier/reorder')
          const { generateEmailQRDataUrl } = await import('@/lib/label/generator')
          const { getSiteUrl } = await import('@/lib/utils')
          const siteUrl = getSiteUrl()
          const batchId = customMixItem.customMix.batchId
          const batchUrl = `${siteUrl}/batch/${batchId}`
          customBlend = {
            blendName: customMixItem.customMix.recipeName,
            batchUrl,
            reorderUrl: `${siteUrl}${buildAtelierReorderUrlFromMix(customMixItem.customMix)}`,
            qrDataUrl: await generateEmailQRDataUrl(batchUrl, 200),
          }
        } catch (err) {
          logger.error('Failed to build confirmation-email QR extras', err instanceof Error ? err : new Error(String(err)))
        }
      }

      const confirmationResult = await sendOrderConfirmationEmail({
        to: dbOrder.customerEmail || session.customer_email || '',
        firstName,
        orderNumber: dbOrder.id,
        orderDate: now.toISOString(),
        items: ((dbOrder.items || []) as WebhookOrderItem[]).map((item) => ({
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
        customBlend,
        containsPreorder: session.metadata?.containsPreorder === 'true',
      })

      // A false result (e.g. RESEND_API_KEY unconfigured) must be loud in the
      // logs but must not break order processing.
      if (confirmationResult && confirmationResult.success === false) {
        logger.error(
          `[Webhook] Order confirmation email for ${orderId} was NOT sent (sendEmail reported failure)`,
          new Error(confirmationResult.error || 'sendEmail returned success:false')
        )
      }

      // Notify admin of new order
      const { sendAdminOrderNotification } = await import('@/lib/email/resend')
      const adminNotifyResult = await sendAdminOrderNotification({
        orderNumber: dbOrder.id,
        customerName: dbOrder.customerName || firstName,
        customerEmail: dbOrder.customerEmail || session.customer_email || '',
        total: dbOrder.total || 0,
        status: dbOrder.status,
        items: ((dbOrder.items || []) as WebhookOrderItem[]).map((item) => ({
          name: item.name,
          quantity: item.quantity || 1,
          price: item.total || 0,
        })),
        action: 'new_order',
      })

      if (adminNotifyResult && adminNotifyResult.success === false) {
        logger.error(
          `[Webhook] Admin order notification for ${orderId} was NOT sent (sendEmail reported failure)`,
          new Error(adminNotifyResult.error || 'sendEmail returned success:false')
        )
      }

    } catch (err) {
      logger.error('Error sending order confirmation email', err instanceof Error ? err : new Error(String(err)))
      // Don't fail the webhook
    }
  }

}

/**
 * Extract product metadata from an expanded Stripe line-item product reference
 */
function getProductMetadata(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined
): Stripe.Metadata {
  if (!product || typeof product === 'string') return {}
  if ('deleted' in product && product.deleted) return {}
  return (product as Stripe.Product).metadata || {}
}

/**
 * charge.refunded — a refund issued via Stripe Dashboard or API.
 * Locates the order by payment intent and reverses every side effect
 * (commissions, store credit, oil unlocks, inventory). Each reversal step is
 * failure-isolated: failures are logged, the remaining steps continue, and the
 * order is flagged for admin review.
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!paymentIntentId) {
    logger.warn(`[Webhook] charge.refunded ${charge.id} has no payment intent — nothing to reverse`)
    return
  }

  const order = await db.query.orders.findFirst({
    where: sql`${orders.payment}->>'transactionId' = ${paymentIntentId}`,
  })

  if (!order) {
    logger.warn(`[Webhook] Refunded charge ${charge.id} (pi ${paymentIntentId}) did not match any order`)
    return
  }

  // Idempotency — an order already marked refunded has already been reversed
  if (order.status === 'refunded') {
    logger.info(`[Webhook] Order ${order.id} already refunded — skipping duplicate charge.refunded`)
    return
  }

  const reversalFailures: string[] = []

  // 1. Reverse community blend commissions
  try {
    const blendIds = (order.items || [])
      .map(item => item.blendId)
      .filter((blendId): blendId is string => Boolean(blendId))
    for (const blendId of blendIds) {
      const result = await reverseBlendCommission(order.id, blendId)
      // 'not found' / 'already reversed' are benign (no commission or double delivery)
      if (!result.success && !/not found|already reversed/i.test(result.error || '')) {
        reversalFailures.push(`commission ${blendId}: ${result.error || 'unknown error'}`)
      }
    }
  } catch (err) {
    reversalFailures.push(`commissions: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2. Restore the customer's store credit used on this order
  try {
    const creditUsedCents = order.storeCreditUsed || 0
    if (creditUsedCents > 0 && order.customerId && order.customerId !== 'guest') {
      await restoreCustomerCredits(
        order.customerId,
        creditUsedCents,
        `Refund for order ${order.id} (charge ${charge.id})`
      )
    }
  } catch (err) {
    reversalFailures.push(`store credit: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 3. Revoke oils unlocked by this order
  try {
    await revokeOrderUnlocks(order.id)
  } catch (err) {
    reversalFailures.push(`unlock revocation: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 4. Restock inventory deducted for this order
  try {
    await restoreOrderInventory(order.id)
  } catch (err) {
    reversalFailures.push(`inventory restore: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Mark the order refunded; flag for admin review if any reversal failed
  const now = new Date()
  const statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : []
  const currentPayment: DbOrder['payment'] = order.payment || { method: 'credit-card', status: 'captured' }
  const isFullRefund = charge.amount_refunded >= charge.amount

  await db.update(orders)
    .set({
      status: 'refunded',
      statusHistory: [
        ...statusHistory,
        {
          status: 'refunded',
          timestamp: now.toISOString(),
          note: `Refund detected via Stripe webhook (charge ${charge.id})`,
        },
      ],
      payment: {
        ...currentPayment,
        status: isFullRefund ? 'refunded' : 'partially-refunded',
        refundedAt: now.toISOString(),
        refundAmount: charge.amount_refunded,
      },
      metadata: {
        ...(order.metadata || {}),
        ...(reversalFailures.length > 0
          ? { needsAdminReview: true, refundReversalFailures: reversalFailures }
          : {}),
      },
      updatedAt: now,
    })
    .where(eq(orders.id, order.id))

  if (reversalFailures.length > 0) {
    logger.error(
      `[Webhook] Order ${order.id} refunded but ${reversalFailures.length} reversal step(s) failed — flagged for admin review`,
      new Error(reversalFailures.join('; '))
    )
  }
}

/**
 * checkout.session.expired — the customer abandoned checkout.
 * Refill sessions debit store credit and lock the bottle at creation, so the
 * abandonment must be fully reversed.
 */
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  await reverseAbandonedRefillCheckout(session, 'checkout.session.expired')
}

/**
 * Reverse the side effects of an abandoned refill checkout:
 * restore the debited refill credit, release the bottle lock, cancel the refill order.
 * Every step is failure-isolated.
 */
async function reverseAbandonedRefillCheckout(session: Stripe.Checkout.Session, trigger: string) {
  const { orderId, bottleId, customerId, type } = session.metadata || {}

  if (type !== 'refill') return

  // Restore the refill credit debited at checkout creation (if any was)
  const creditUsedCents = parseInt(session.metadata?.creditUsed || '0', 10)
  if (creditUsedCents > 0 && customerId) {
    try {
      await restoreRefillCredit(
        customerId,
        creditUsedCents,
        `${trigger}: refill checkout abandoned (session ${session.id})`
      )
    } catch (err) {
      logger.error(`[Webhook] Failed to restore refill credit for ${customerId}`, err instanceof Error ? err : new Error(String(err)))
    }
  }

  // Release the bottle locked when the refill was initiated
  if (bottleId) {
    try {
      await releaseBottleLock(bottleId, `${trigger}: refill checkout abandoned (session ${session.id})`)
    } catch (err) {
      logger.error(`[Webhook] Failed to release bottle lock for ${bottleId}`, err instanceof Error ? err : new Error(String(err)))
    }
  }

  // Cancel the refill order so it doesn't linger as pending-return
  if (orderId) {
    try {
      const { refillOrders } = await import('@/lib/db/schema-refill')
      const existingRefill = await db.query.refillOrders.findFirst({
        where: eq(refillOrders.id, orderId),
      })
      if (existingRefill && !['cancelled', 'completed'].includes(existingRefill.status)) {
        await db.update(refillOrders)
          .set({
            status: 'cancelled',
            metadata: {
              ...((existingRefill.metadata as Record<string, unknown> | null) || {}),
              cancellationReason: trigger,
              cancelledAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(refillOrders.id, orderId))
      }
    } catch (err) {
      logger.error(`[Webhook] Failed to cancel abandoned refill order ${orderId}`, err instanceof Error ? err : new Error(String(err)))
    }
  }
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  // Additional success handling if needed
}

async function handlePaymentFailure(session: Stripe.Checkout.Session) {
  const { orderId, type } = session.metadata || {}

  if (!orderId) {
    logger.error('No orderId in session metadata for failed payment', new Error('No orderId in session metadata for failed payment'))
    return
  }

  // Refill checkouts — reverse the credit debit and bottle lock instead
  if (type === 'refill') {
    await reverseAbandonedRefillCheckout(session, 'checkout.session.async_payment_failed')
    return
  }

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
  // Handle failed payment intent if needed
}

// ============================================================================
// Route Configuration
// ============================================================================

export const dynamic = 'force-dynamic'  // Disable static generation for webhook
export const runtime = 'nodejs'         // Use Node.js runtime
