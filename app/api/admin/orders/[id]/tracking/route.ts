/**
 * Admin Order Tracking API
 * POST /api/admin/orders/[id]/tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders, auditLogs } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { transitionOrderStatus } from '@/lib/orders/status-workflow'

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
    const { trackingNumber, carrier = 'auspost', labelUrl, changedBy = 'admin', sendEmail = true } = body

    if (!trackingNumber) {
      return NextResponse.json({ error: 'trackingNumber is required' }, { status: 400 })
    }

    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update shipping info
    const updatedShipping = {
      ...(existingOrder.shipping || { carrier: 'auspost', service: 'Standard', cost: 0 }),
      trackingNumber,
      carrier,
      trackingUrl: labelUrl || `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`,
      shippedAt: new Date().toISOString(),
    }

    const [updated] = await db.update(orders)
      .set({
        shipping: updatedShipping,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning()

    // Audit log
    await db.insert(auditLogs).values({
      id: `audit_${nanoid(8)}`,
      adminId: changedBy,
      action: 'add_tracking',
      entityType: 'order',
      entityId: id,
      before: { shipping: existingOrder.shipping },
      after: { shipping: updatedShipping },
      createdAt: new Date(),
    })

    // Auto-transition to shipped if currently ready-to-ship
    let statusResult = null
    if (existingOrder.status === 'ready-to-ship' || existingOrder.status === 'quality-check') {
      statusResult = await transitionOrderStatus(id, 'shipped', {
        note: `Tracking added: ${trackingNumber} (${carrier})`,
        changedBy,
        sendEmail,
        trackingNumber,
        carrier,
      })
    }

    return NextResponse.json({
      success: true,
      order: updated,
      trackingNumber,
      carrier,
      trackingUrl: updatedShipping.trackingUrl,
      statusTransitioned: statusResult?.success || false,
      emailSent: statusResult?.emailSent || false,
    })
  } catch (error: any) {
    console.error('[Admin Order Tracking] Error:', error)
    return NextResponse.json({ error: 'Failed to add tracking' }, { status: 500 })
  }
}
