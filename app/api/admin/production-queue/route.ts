/**
 * Production Queue API v2
 * Local DB only — orders that need blending/mixing atelier preparation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders, refillOrders, customers } from '@/lib/db/schema-refill'
import { desc, eq, inArray } from 'drizzle-orm'
import { ProductionQueueItem } from '@/lib/orders/types'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET — Production Queue
// ============================================================================

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') || '90'), 365)
  const statusFilter = searchParams.get('status')?.split(',') || ['confirmed', 'blending', 'quality-check']

  const items: ProductionQueueItem[] = []
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    // Regular orders that need blending
    const regularOrders = await db.select()
      .from(orders)
      .where(inArray(orders.status, statusFilter as any))
      .orderBy(desc(orders.createdAt))
      .limit(200)

    for (const order of regularOrders) {
      const orderItems = (order.items || []) as any[]

      for (const item of orderItems) {
        // Skip non-blending items
        if (!item.customMix && !item.isRefill && !item.communityBlendId && !item.collectionBlendId) {
          continue
        }

        const mix = item.customMix
        const isRefill = item.isRefill

        items.push({
          orderId: order.id,
          itemId: item.id || `item-${order.id}-${Math.random().toString(36).slice(2, 6)}`,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          blendName: mix?.recipeName || item.name || 'Unknown Blend',
          type: item.type || (isRefill ? 'refill' : mix ? 'custom_blend' : 'pure_oil'),
          mode: mix?.mode,
          bottleSize: mix?.totalVolume || item.bottleSize || 30,
          oils: mix?.oils?.map((o: any) => ({
            oilName: o.oilName,
            ml: o.ml,
            percentage: o.percentage,
          })) || [],
          carrierOil: mix?.carrierOilId,
          carrierMl: mix?.carrierRatio ? (mix.totalVolume * mix.carrierRatio / 100) : undefined,
          crystal: mix?.crystalId,
          cord: mix?.cordId,
          safetyScore: mix?.safetyScore || 95,
          safetyWarnings: mix?.safetyWarnings || [],
          priority: (order.blendingPriority as any) || 'normal',
          queuedAt: order.createdAt.toISOString(),
          status: order.status as any,
          batchId: mix?.batchId,
        })
      }
    }
  } catch (err: any) {
    if (!err?.message?.includes('does not exist')) {
      console.error('[Production Queue] Regular orders error:', err)
    }
  }

  // Refill orders that need production
  try {
    const refillOrdersList = await db.select()
      .from(refillOrders)
      .where(inArray(refillOrders.status, ['received', 'inspecting', 'refilling']))
      .orderBy(desc(refillOrders.createdAt))
      .limit(100)

    for (const refill of refillOrdersList) {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, refill.customerId),
      })

      items.push({
        orderId: refill.id,
        itemId: `item-${refill.id}`,
        customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
        customerEmail: customer?.email || '',
        blendName: `${refill.oilType} Refill`,
        type: 'refill',
        mode: 'carrier',
        bottleSize: 100,
        oils: [{ oilName: refill.oilType, ml: 100, percentage: 100 }],
        safetyScore: 95,
        safetyWarnings: [],
        priority: 'normal',
        queuedAt: refill.createdAt.toISOString(),
        status: mapRefillStatus(refill.status),
      })
    }
  } catch (err: any) {
    if (!err?.message?.includes('does not exist')) {
      console.error('[Production Queue] Refill orders error:', err)
    }
  }

  // Sort by priority then date
  items.sort((a, b) => {
    if (a.priority === 'rush' && b.priority !== 'rush') return -1
    if (a.priority !== 'rush' && b.priority === 'rush') return 1
    return new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
  })

  return NextResponse.json({
    items,
    count: items.length,
    source: 'local',
  })
}

function mapRefillStatus(status: string): any {
  const map: Record<string, any> = {
    'pending-return': 'pending',
    'in-transit': 'processing',
    'received': 'blending',
    'inspecting': 'quality-check',
    'refilling': 'blending',
    'completed': 'shipped',
    'cancelled': 'cancelled',
    'rejected': 'cancelled',
  }
  return map[status] || 'pending'
}

// ============================================================================
// POST — Update Production Status
// ============================================================================

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { orderId, action, changedBy = 'admin' } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Try regular order
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })

    if (existingOrder) {
      const { transitionOrderStatus } = await import('@/lib/orders/status-workflow')

      if (action === 'start') {
        const result = await transitionOrderStatus(orderId, 'blending', {
          note: 'Production started',
          changedBy,
        })
        return NextResponse.json({ success: result.success, action, orderId })
      }

      if (action === 'complete') {
        const result = await transitionOrderStatus(orderId, 'quality-check', {
          note: 'Production completed, awaiting quality check',
          changedBy,
        })
        return NextResponse.json({ success: result.success, action, orderId })
      }

      if (action === 'label') {
        const result = await transitionOrderStatus(orderId, 'ready-to-ship', {
          note: 'Label printed, ready for dispatch',
          changedBy,
        })
        return NextResponse.json({ success: result.success, action, orderId })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    // Try refill order
    const existingRefill = await db.query.refillOrders.findFirst({
      where: eq(refillOrders.id, orderId),
    })

    if (existingRefill) {
      if (action === 'start') {
        await db.update(refillOrders)
          .set({ status: 'refilling', updatedAt: new Date() })
          .where(eq(refillOrders.id, orderId))
      } else if (action === 'complete') {
        await db.update(refillOrders)
          .set({ status: 'completed', updatedAt: new Date(), completedAt: new Date() })
          .where(eq(refillOrders.id, orderId))
      }

      return NextResponse.json({ success: true, action, orderId })
    }

    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  } catch (error: any) {
    console.error('[Production Queue] POST error:', error)
    return NextResponse.json({ error: 'Failed to update production queue' }, { status: 500 })
  }
}
