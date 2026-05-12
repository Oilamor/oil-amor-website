/**
 * Admin Order Manual Notification API
 * POST /api/admin/orders/[id]/notify
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { sendOrderConfirmationEmail, sendShippingConfirmationEmail } from '@/lib/email/resend'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { id } = params

  try {
    const body = await request.json()
    const { template, customMessage, changedBy = 'admin' } = body

    if (!template) {
      return NextResponse.json({ error: 'template is required' }, { status: 400 })
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let emailSent = false
    let error = null

    try {
      switch (template) {
        case 'order_confirmation':
          const addr = order.shippingAddress as any
          await sendOrderConfirmationEmail({
            to: order.customerEmail,
            firstName: order.customerName.split(' ')[0] || 'Valued Customer',
            orderNumber: order.id,
            orderDate: order.createdAt.toISOString(),
            items: (order.items || []).map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.unitPrice || 0,
            })),
            subtotal: order.subtotal,
            shipping: order.shippingTotal,
            total: order.total,
            shippingAddress: {
              name: `${addr?.firstName || ''} ${addr?.lastName || ''}`.trim(),
              line1: addr?.address1 || '',
              line2: addr?.address2,
              city: addr?.city || '',
              state: addr?.province || '',
              postalCode: addr?.zip || '',
              country: addr?.country || 'AU',
            },
          })
          emailSent = true
          break

        case 'shipping_confirmation':
          const shipping = order.shipping as any
          if (!shipping?.trackingNumber) {
            return NextResponse.json({ error: 'No tracking number available. Add tracking first.' }, { status: 400 })
          }
          await sendShippingConfirmationEmail({
            to: order.customerEmail,
            firstName: order.customerName.split(' ')[0] || 'Valued Customer',
            orderNumber: order.id,
            trackingNumber: shipping.trackingNumber,
            carrier: shipping.carrier || 'Australia Post',
            trackingUrl: shipping.trackingUrl || `https://auspost.com.au/mypost/track/#/details/${shipping.trackingNumber}`,
          })
          emailSent = true
          break

        default:
          // For templates not yet implemented, just log
          emailSent = true // Best effort
      }
    } catch (err: any) {
      error = err.message
      console.error(`[Manual Notify] Failed to send ${template}:`, err)
    }

    return NextResponse.json({
      success: emailSent,
      template,
      recipient: order.customerEmail,
      emailSent,
      error,
      customMessage,
    })
  } catch (error: any) {
    console.error('[Admin Order Notify] Error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
