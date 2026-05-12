/**
 * Admin Order Refund API
 * Processes Stripe refunds for orders
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'
import { sendRefundConfirmationEmail } from '@/lib/email/resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export const dynamic = 'force-dynamic'

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
    const body = await request.json()
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

    // Create Stripe refund
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

    // Update order status
    const newStatus = 'refunded'
    const statusHistory = Array.isArray(order.statusHistory)
      ? order.statusHistory
      : []

    // Update payment record with refund details
    const currentPayment = order.payment || { method: 'card', status: 'captured' }
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
      const items = (order.items || []) as any[]
      await sendAdminOrderNotification({
        orderNumber: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: order.total || 0,
        status: newStatus,
        refundAmount: refund.amount / 100,
        items: items.map((item: any) => ({
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
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Refund failed', details: error.message },
      { status: 500 }
    )
  }
}
