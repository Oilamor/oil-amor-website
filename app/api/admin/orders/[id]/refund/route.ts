/**
 * Admin Order Refund API
 * Processes Stripe refunds for orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { getStripe } from '@/lib/stripe/config'
import { sendRefundConfirmationEmail } from '@/lib/email/resend'
import { reverseBlendCommission } from '@/lib/community-blends/commissions'
import { restoreCustomerCredits } from '@/lib/refill/credit-restore'
import { revokeOrderUnlocks } from '@/lib/orders/revocations'
import { logger } from '@/lib/logging/logger'
import { restoreOrderInventory } from '@/lib/inventory/refund-restore'

export const dynamic = 'force-dynamic'

interface RefundRequestBody {
  amount?: number
  reason?: string
}

// ============================================================================
// POST /api/admin/orders/[id]/refund
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { id: orderId } = await params
    const body = (await request.json()) as RefundRequestBody
    const { amount, reason } = body

    // Fetch order
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)

    if (orderResult.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orderResult[0]

    // Guard against double refunds — reversals below are not safe to run twice
    if (order.status === 'refunded') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      )
    }

    // Check if order has a payment transaction
    const paymentIntentId = order.payment?.transactionId
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment transaction found for this order' },
        { status: 400 }
      )
    }

    // Validate amount
    const refundAmount = amount ? Math.round(amount) : undefined
    if (refundAmount && (refundAmount <= 0 || refundAmount > order.total)) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      )
    }

    // Create Stripe refund (lazy-init client — throws here, not at import, if unconfigured)
    const stripe = getStripe()
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        orderId,
        adminReason: reason || 'Customer request',
        refundedAt: new Date().toISOString(),
      },
    })

    // Reverse order side effects — each step is failure-isolated so one failure
    // doesn't block the rest; any failure flags the order for admin review
    const reversalFailures: string[] = []

    // 1. Reverse community blend commissions
    try {
      const blendIds = (order.items || [])
        .map(item => item.blendId)
        .filter((blendId): blendId is string => Boolean(blendId))
      for (const blendId of blendIds) {
        const result = await reverseBlendCommission(orderId, blendId)
        // 'not found' / 'already reversed' are benign (no commission or double run)
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
          `Admin refund for order ${orderId} (refund ${refund.id})`
        )
      }
    } catch (err) {
      reversalFailures.push(`store credit: ${err instanceof Error ? err.message : String(err)}`)
    }

    // 3. Revoke oils unlocked by this order
    try {
      await revokeOrderUnlocks(orderId)
    } catch (err) {
      reversalFailures.push(`unlock revocation: ${err instanceof Error ? err.message : String(err)}`)
    }

    // 4. Restock inventory deducted for this order
    try {
      await restoreOrderInventory(orderId)
    } catch (err) {
      reversalFailures.push(`inventory restore: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (reversalFailures.length > 0) {
      logger.error(
        `[Admin Refund] Order ${orderId} refunded but ${reversalFailures.length} reversal step(s) failed — flagged for admin review`,
        new Error(reversalFailures.join('; '))
      )
    }

    // Update order status
    const newStatus = 'refunded'
    const statusHistory = Array.isArray(order.statusHistory)
      ? order.statusHistory
      : []

    // Update payment record with refund details
    const currentPayment: typeof order.payment = order.payment || { method: 'card', status: 'captured' }
    const updatedPayment = {
      ...currentPayment,
      status: refundAmount && refundAmount < order.total ? 'partially-refunded' : 'refunded',
      refundedAt: new Date().toISOString(),
      refundAmount: refundAmount || order.total,
    }

    await db
      .update(orders)
      .set({
        status: newStatus,
        statusHistory: [
          ...statusHistory,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: reason || `Refund processed via admin. Amount: ${refundAmount ? `$${(refundAmount / 100).toFixed(2)}` : 'full'}`,
          },
        ],
        payment: updatedPayment,
        metadata: {
          ...(order.metadata || {}),
          ...(reversalFailures.length > 0
            ? { needsAdminReview: true, refundReversalFailures: reversalFailures }
            : {}),
        },
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    // Send refund confirmation email
    try {
      await sendRefundConfirmationEmail({
        to: order.customerEmail,
        orderNumber: order.id,
        amount: refund.amount / 100,
      })
    } catch (emailError) {
      // Don't fail the request if email fails
    }

    // Notify admin of refund
    try {
      const { sendAdminOrderNotification } = await import('@/lib/email/resend')
      const items = order.items || []
      await sendAdminOrderNotification({
        orderNumber: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total || 0,
        status: newStatus,
        refundAmount: refund.amount / 100,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity || 1,
          price: item.total || 0,
        })),
        action: 'refund',
      })
    } catch (adminNotifyError) {
      // Don't fail the request if admin notification fails
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      orderStatus: newStatus,
      reversalFailures: reversalFailures.length > 0 ? reversalFailures : undefined,
    })
  } catch (error) {
    logger.error('[Admin Refund] Failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Refund failed' },
      { status: 500 }
    )
  }
}
