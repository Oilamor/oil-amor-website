/**
 * Oil Amor — Order Status Workflow
 * Handles status transitions, validation, audit logging, and email triggers
 */

import { OrderStatus } from '@/lib/db/schema/orders'
import { isValidStatusTransition, getTransitionEmailTemplate } from './types'
import { db } from '@/lib/db'
import { orders, auditLogs } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// ============================================================================
// STATUS TRANSITION
// ============================================================================

export interface StatusChangeResult {
  success: boolean
  error?: string
  order?: typeof orders.$inferSelect
  emailSent?: boolean
  emailTemplate?: string
}

export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options: {
    note?: string
    changedBy?: string
    sendEmail?: boolean
    trackingNumber?: string
    carrier?: string
  } = {}
): Promise<StatusChangeResult> {
  const { note, changedBy = 'system', sendEmail = true, trackingNumber, carrier } = options

  // Fetch current order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })

  if (!order) {
    return { success: false, error: `Order ${orderId} not found` }
  }

  const currentStatus = order.status as OrderStatus

  // Validate transition
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
    }
  }

  // Build status history entry
  const historyEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    note: note || `Status changed from ${currentStatus} to ${newStatus}`,
    changedBy,
  }

  const newHistory = [...(order.statusHistory || []), historyEntry]

  // Build update data
  const updateData: Record<string, unknown> = {
    status: newStatus,
    statusHistory: newHistory,
    updatedAt: new Date(),
  }

  // Add tracking if provided
  if (trackingNumber) {
    updateData.shipping = {
      ...(order.shipping || { carrier: carrier || 'auspost', service: 'Standard', cost: 0 }),
      trackingNumber,
      carrier: carrier || 'auspost',
      trackingUrl: `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`,
      shippedAt: newStatus === 'shipped' ? new Date().toISOString() : (order.shipping as any)?.shippedAt,
    }
  }

  // Update order
  const [updated] = await db.update(orders)
    .set(updateData)
    .where(eq(orders.id, orderId))
    .returning()

  // Audit log
  await db.insert(auditLogs).values({
    id: `audit_${nanoid(8)}`,
    adminId: changedBy,
    action: 'update_order_status',
    entityType: 'order',
    entityId: orderId,
    before: { status: currentStatus, shipping: order.shipping },
    after: { status: newStatus, shipping: updateData.shipping },
    createdAt: new Date(),
  })

  // Determine email template
  const emailTemplate = getTransitionEmailTemplate(currentStatus, newStatus)
  let emailSent = false

  if (sendEmail && emailTemplate) {
    try {
      await sendStatusEmail(order, newStatus, emailTemplate, trackingNumber)
      emailSent = true
    } catch (err) {
      console.error(`[Status Workflow] Failed to send ${emailTemplate} email for ${orderId}:`, err)
    }
  }

  return {
    success: true,
    order: updated,
    emailSent,
    emailTemplate,
  }
}

// ============================================================================
// EMAIL TRIGGERS
// ============================================================================

async function sendStatusEmail(
  order: typeof orders.$inferSelect,
  status: OrderStatus,
  template: string,
  trackingNumber?: string
) {
  const {
    sendShippingConfirmationEmail,
    sendBlendPreparationEmail,
    sendBlendCraftingEmail,
    sendOrderReadyEmail,
    sendOrderDeliveredEmail,
    sendOrderCancelledEmail,
  } = await import('@/lib/email/resend')

  const firstName = order.customerName.split(' ')[0] || 'Valued Customer'
  const items = (order.items || []) as any[]
  const blendItem = items.find((i) => i.customMix)
  const blendName = blendItem?.customMix?.recipeName || blendItem?.name || 'your order'
  const mode = blendItem?.customMix?.mode || 'pure'
  const bottleSize = blendItem?.customMix?.totalVolume || 30

  switch (template) {
    case 'order_confirmed':
      // Already sent by Stripe webhook on initial creation
      if (blendItem) {
        await sendBlendPreparationEmail({
          to: order.customerEmail,
          firstName,
          orderNumber: order.id,
          blendName,
          mode,
          bottleSize,
        })
      }
      break

    case 'blend_mixing':
      await sendBlendCraftingEmail({
        to: order.customerEmail,
        firstName,
        orderNumber: order.id,
        blendName,
      })
      break

    case 'order_ready':
      await sendOrderReadyEmail({
        to: order.customerEmail,
        firstName,
        orderNumber: order.id,
        blendName,
      })
      break

    case 'order_shipped':
      if (trackingNumber) {
        await sendShippingConfirmationEmail({
          to: order.customerEmail,
          firstName,
          orderNumber: order.id,
          trackingNumber,
          carrier: (order.shipping as any)?.carrier || 'Australia Post',
          trackingUrl: `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`,
        })
      }
      break

    case 'order_delivered':
      await sendOrderDeliveredEmail({
        to: order.customerEmail,
        firstName,
        orderNumber: order.id,
        blendName,
        batchId: blendItem?.customMix?.batchId,
      })
      break

    case 'order_cancelled':
      await sendOrderCancelledEmail({
        to: order.customerEmail,
        firstName,
        orderNumber: order.id,
      })
      break

    default:
      console.log(`[Email] Unknown template: ${template}`)
  }
}

// ============================================================================
// BULK STATUS OPERATIONS
// ============================================================================

export async function bulkTransitionOrders(
  orderIds: string[],
  newStatus: OrderStatus,
  options: {
    note?: string
    changedBy?: string
    sendEmail?: boolean
  } = {}
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const success: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const orderId of orderIds) {
    const result = await transitionOrderStatus(orderId, newStatus, options)
    if (result.success) {
      success.push(orderId)
    } else {
      failed.push({ id: orderId, error: result.error || 'Unknown error' })
    }
  }

  return { success, failed }
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: 'gray',
    confirmed: 'blue',
    processing: 'indigo',
    blending: 'amber',
    'quality-check': 'orange',
    'ready-to-ship': 'emerald',
    shipped: 'cyan',
    delivered: 'green',
    cancelled: 'red',
    refunded: 'rose',
  }
  return colors[status] || 'gray'
}

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    blending: 'Mixing',
    'quality-check': 'Quality Check',
    'ready-to-ship': 'Ready to Ship',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  }
  return labels[status] || status
}

export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const nextMap: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['blending', 'cancelled'],
    processing: ['blending', 'cancelled'],
    blending: ['quality-check', 'cancelled'],
    'quality-check': ['ready-to-ship', 'blending'],
    'ready-to-ship': ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: [],
  }
  return nextMap[currentStatus] || []
}
