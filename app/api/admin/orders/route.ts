/**
 * Admin Orders API v2
 * Local DB only — Shopify-independent enterprise order management
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders, customers, refillOrders, auditLogs, type InsertOrder } from '@/lib/db/schema-refill'
import { desc, eq, or, and, sql, gte, lte, ilike, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { OrderStatus, OrderAttachment, PaymentInfo, ShippingAddress, ShippingInfo } from '@/lib/db/schema/orders'
import { EnrichedOrder, EnrichedOrderItem, OrderFilters, OrderItemType } from '@/lib/orders/types'
import { getStatusLabel, getStatusColor, transitionOrderStatus } from '@/lib/orders/status-workflow'
import { orderRequiresBlending, getOrderTypeLabel } from '@/lib/orders/order-classifier'
import { CARRIER_OIL_NAMES } from '@/lib/label/generator'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

// ============================================================================
// ORDER MAPPERS
// ============================================================================

type RefillStatus = typeof refillOrders.$inferSelect.status

/** Order item as stored in the orders.items JSONB column (superset of the schema $type) */
interface AdminDbOrderItem {
  id?: string
  name?: string
  type?: string
  productType?: EnrichedOrderItem['productType']
  oilId?: string
  crystalId?: string
  bottleSize?: number
  unitPrice?: number
  quantity?: number
  subtotal?: number
  total?: number
  image?: string
  description?: string
  attachment?: OrderAttachment
  unlocksOilId?: string
  isRefill?: boolean
  originalBatchId?: string
  sourceVolume?: number
  targetVolume?: number
  originalOrderId?: string
  scaledRecipe?: EnrichedOrderItem['scaledRecipe']
  collectionBlendId?: string
  communityBlendId?: string
  communityBlendCreatorId?: string
  communityBlendCreatorName?: string
  commissionRate?: number
  commissionAmount?: number
  customMix?: {
    recipeName?: string
    mode: 'pure' | 'carrier'
    totalVolume: number
    oils: Array<{
      oilId: string
      oilName: string
      ml: number
      percentage: number
      drops?: number
    }>
    carrierOilId?: string
    carrierRatio?: number
    crystalId?: string
    cordId?: string
    intendedUse?: string
    safetyScore: number
    safetyRating: string
    safetyWarnings?: string[]
    batchId?: string
  }
}

interface AdminOrderUpdateBody {
  orderId?: string
  status?: OrderStatus
  trackingNumber?: string
  carrier?: string
  note?: string
  changedBy?: string
}

function mapDbOrderToEnriched(dbOrder: typeof orders.$inferSelect): EnrichedOrder {
  const items: EnrichedOrderItem[] = ((dbOrder.items || []) as AdminDbOrderItem[]).map((item) => ({
    id: item.id || `item-${nanoid(4)}`,
    name: item.name || 'Unknown Item',
    type: (item.type as OrderItemType | undefined) || inferItemType(item),
    unitPrice: (item.unitPrice || 0) / 100,
    quantity: item.quantity || 1,
    totalPrice: (item.total || item.subtotal || 0) / 100,
    productType: item.productType,
    oilId: item.oilId,
    crystalId: item.crystalId,
    bottleSize: item.bottleSize || item.customMix?.totalVolume,
    customMix: item.customMix ? {
      name: item.customMix.recipeName || 'Custom Blend',
      mode: item.customMix.mode,
      totalVolume: item.customMix.totalVolume,
      oils: item.customMix.oils.map((o) => ({
        oilId: o.oilId,
        oilName: o.oilName,
        ml: o.ml,
        percentage: o.percentage,
        drops: o.drops,
      })),
      carrierOil: item.customMix.carrierOilId
        ? (CARRIER_OIL_NAMES[item.customMix.carrierOilId] || item.customMix.carrierOilId)
        : undefined,
      carrierPercentage: item.customMix.carrierRatio !== undefined
        ? (100 - item.customMix.carrierRatio)
        : undefined,
      carrierMl: item.customMix.carrierRatio !== undefined && item.customMix.totalVolume
        ? Math.round((item.customMix.totalVolume * (100 - item.customMix.carrierRatio) / 100) * 10) / 10
        : undefined,
      crystal: item.customMix.crystalId,
      cord: item.customMix.cordId,
      intendedUse: item.customMix.intendedUse,
      safetyScore: item.customMix.safetyScore,
      safetyRating: item.customMix.safetyRating,
      safetyWarnings: item.customMix.safetyWarnings || [],
      batchId: item.customMix.batchId || `OA-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${nanoid(4).toUpperCase()}`,
    } : undefined,
    collectionBlendId: item.collectionBlendId,
    communityBlendId: item.communityBlendId,
    communityBlendCreatorId: item.communityBlendCreatorId,
    communityBlendCreatorName: item.communityBlendCreatorName,
    commissionRate: item.commissionRate,
    commissionAmount: item.commissionAmount ? item.commissionAmount / 100 : undefined,
    isRefill: item.isRefill,
    originalBatchId: item.originalBatchId,
    sourceVolume: item.sourceVolume,
    targetVolume: item.targetVolume,
    originalOrderId: item.originalOrderId,
    scaledRecipe: item.scaledRecipe,
    imageUrl: item.image,
    description: item.description,
    attachment: item.attachment,
    unlocksOilId: item.unlocksOilId,
  }))

  return {
    id: dbOrder.id,
    customerId: dbOrder.customerId,
    customerEmail: dbOrder.customerEmail,
    customerName: dbOrder.customerName,
    isGuest: dbOrder.isGuest,
    status: dbOrder.status as OrderStatus,
    statusHistory: (dbOrder.statusHistory || []).map((h) => ({
      status: h.status as OrderStatus,
      timestamp: h.timestamp,
      note: h.note,
      changedBy: h.changedBy,
    })),
    items,
    subtotal: dbOrder.subtotal / 100,
    taxTotal: dbOrder.taxTotal / 100,
    shippingTotal: dbOrder.shippingTotal / 100,
    discountTotal: dbOrder.discountTotal / 100,
    storeCreditUsed: dbOrder.storeCreditUsed / 100,
    giftCardUsed: dbOrder.giftCardUsed / 100,
    total: dbOrder.total / 100,
    currency: dbOrder.currency,
    payment: (dbOrder.payment || { method: 'credit-card', status: 'pending' }) as PaymentInfo,
    shippingAddress: (dbOrder.shippingAddress || {
      firstName: '', lastName: '', address1: '', city: '', province: '', country: 'AU', zip: '',
    }) as ShippingAddress,
    shipping: (dbOrder.shipping || { carrier: 'auspost', service: 'Standard', cost: 0 }) as ShippingInfo,
    isGift: dbOrder.isGift,
    giftMessage: dbOrder.giftMessage || undefined,
    giftReceipt: dbOrder.giftReceipt,
    requiresBlending: orderRequiresBlending(items),
    blendingPriority: (dbOrder.blendingPriority ?? undefined) as EnrichedOrder['blendingPriority'],
    eligibleForReturns: dbOrder.eligibleForReturns,
    returnCreditsEarned: dbOrder.returnCreditsEarned,
    returnCreditsUsed: dbOrder.returnCreditsUsed,
    customerNote: dbOrder.customerNote || undefined,
    internalNote: dbOrder.internalNote || undefined,
    metadata: dbOrder.metadata || {},
    createdAt: dbOrder.createdAt ? dbOrder.createdAt.toISOString() : new Date(0).toISOString(),
    updatedAt: dbOrder.updatedAt ? dbOrder.updatedAt.toISOString() : new Date(0).toISOString(),
    processingCompletedAt: dbOrder.processingCompletedAt?.toISOString(),
  }
}

function inferItemType(item: AdminDbOrderItem): OrderItemType {
  if (item.customMix) return 'custom_blend'
  if (item.isRefill) return 'refill'
  if (item.communityBlendId) return 'community_blend'
  if (item.collectionBlendId) return 'collection_blend'
  if (item.unlocksOilId) return 'pure_oil'
  return 'pure_oil'
}

// ============================================================================
// GET — List Orders
// ============================================================================

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)

  // Parse filters
  const filters: OrderFilters = {
    status: searchParams.get('status')?.split(',').filter(Boolean) as OrderStatus[] || undefined,
    type: searchParams.get('type')?.split(',') as OrderItemType[] || undefined,
    search: searchParams.get('search') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    requiresBlending: searchParams.has('requiresBlending') ? searchParams.get('requiresBlending') === 'true' : undefined,
    limit: Math.min(parseInt(searchParams.get('limit') || '100'), 500),
    offset: parseInt(searchParams.get('offset') || '0'),
    sortBy: (searchParams.get('sortBy') as OrderFilters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as OrderFilters['sortOrder']) || 'desc',
  }

  try {
    // Build query conditions
    const conditions = []

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(orders.status, filters.status))
    }

    if (filters.dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(filters.dateFrom)))
    }

    if (filters.dateTo) {
      conditions.push(lte(orders.createdAt, new Date(filters.dateTo)))
    }

    // Search filter (customer name, email, order ID)
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      conditions.push(
        or(
          ilike(orders.id, searchTerm),
          ilike(orders.customerName, searchTerm),
          ilike(orders.customerEmail, searchTerm)
        )
      )
    }

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const orderList = await db.select()
      .from(orders)
      .where(whereClause)
      .orderBy(filters.sortOrder === 'asc' ? orders.createdAt : desc(orders.createdAt))
      .limit(filters.limit!)
      .offset(filters.offset!)

    // Also fetch refill orders and convert them
    let refillList: typeof refillOrders.$inferSelect[] = []
    try {
      const refillConditions = []
      if (filters.status && filters.status.length > 0) {
        const refillStatusMap: Record<string, RefillStatus[]> = {
          pending: ['pending-return'],
          confirmed: ['pending-return'],
          blending: ['received', 'inspecting', 'refilling'],
          'quality-check': ['inspecting'],
          'ready-to-ship': ['refilling'],
          shipped: ['completed'],
          delivered: ['completed'],
          cancelled: ['cancelled', 'rejected'],
        }
        const refillStatuses = filters.status.flatMap(s => refillStatusMap[s] || [])
        if (refillStatuses.length > 0) {
          refillConditions.push(inArray(refillOrders.status, refillStatuses))
        }
      }

      if (filters.search) {
        // Refill orders don't have customer name/email in the same table
        // Skip search for refill orders for now
      }

      const refillWhere = refillConditions.length > 0 ? and(...refillConditions) : undefined
      refillList = await db.select().from(refillOrders)
        .where(refillWhere)
        .orderBy(desc(refillOrders.createdAt))
        .limit(filters.limit!)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!message.includes('does not exist')) {
        logger.error('[Admin Orders] Refill query error', err instanceof Error ? err : new Error(String(err)))
      }
    }

    // Convert regular orders
    const enrichedOrders = orderList.map(mapDbOrderToEnriched)

    // Convert refill orders
    const enrichedRefills = await Promise.all(
      refillList.map(async (refill) => {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, refill.customerId),
        })
        const pricing = refill.pricing || { standardPrice: 0, creditApplied: 0, finalPrice: 0 }
        return {
          id: refill.id,
          customerId: refill.customerId,
          customerEmail: customer?.email || '',
          customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
          isGuest: false,
          status: mapRefillStatus(refill.status),
          statusHistory: [{ status: mapRefillStatus(refill.status), timestamp: refill.createdAt.toISOString(), note: 'Refill order' }],
          items: [{
            id: `item-${refill.id}`,
            name: `${refill.oilType} Refill`,
            type: 'refill',
            unitPrice: (pricing.finalPrice || 0) / 100,
            quantity: 1,
            totalPrice: (pricing.finalPrice || 0) / 100,
            isRefill: true,
            bottleSize: 100,
          }],
          subtotal: (pricing.finalPrice || 0) / 100,
          taxTotal: ((pricing.finalPrice || 0) * 0.1) / 100,
          shippingTotal: 0,
          discountTotal: (pricing.creditApplied || 0) / 100,
          storeCreditUsed: (pricing.creditApplied || 0) / 100,
          giftCardUsed: 0,
          total: (pricing.finalPrice || 0) / 100,
          currency: 'AUD',
          payment: { method: 'credit-card', status: 'captured' },
          shippingAddress: { firstName: '', lastName: '', address1: '', city: '', province: '', country: 'AU', zip: '' },
          shipping: { carrier: 'auspost', service: 'Standard', cost: 0 },
          isGift: false,
          giftReceipt: false,
          requiresBlending: ['received', 'inspecting', 'refilling'].includes(refill.status),
          eligibleForReturns: true,
          returnCreditsEarned: 0,
          returnCreditsUsed: (pricing.creditApplied || 0) / 100,
          createdAt: refill.createdAt.toISOString(),
          updatedAt: refill.updatedAt.toISOString(),
        } as EnrichedOrder
      })
    )

    // Combine and sort
    const toTime = (value: unknown): number => {
      if (value instanceof Date) return value.getTime()
      if (typeof value === 'number') return new Date(value).getTime()
      return new Date(String(value)).getTime()
    }
    const combined = [...enrichedOrders, ...enrichedRefills]
      .sort((a, b) => {
        const sortField = filters.sortBy || 'createdAt'
        const aTime = toTime(a[sortField])
        const bTime = toTime(b[sortField])
        return filters.sortOrder === 'asc' ? aTime - bTime : bTime - aTime
      })
      .slice(0, filters.limit!)

    // Apply type filter post-query (since type is in JSONB)
    let filtered = combined
    if (filters.type && filters.type.length > 0) {
      filtered = combined.filter(order =>
        order.items.some(item => filters.type!.includes(item.type))
      )
    }

    // Apply requiresBlending filter
    if (filters.requiresBlending !== undefined) {
      filtered = filtered.filter(order => order.requiresBlending === filters.requiresBlending)
    }

    return NextResponse.json({
      orders: filtered,
      count: filtered.length,
      total: enrichedOrders.length + enrichedRefills.length,
      source: 'local',
    })
  } catch (error) {
    logger.error('[Admin Orders v2] Error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      orders: [],
      count: 0,
      total: 0,
      error: 'Failed to fetch orders',
    }, { status: 500 })
  }
}

function mapRefillStatus(status: string): OrderStatus {
  const map: Record<string, OrderStatus> = {
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
// POST — Update Order
// ============================================================================

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  let orderId: string | undefined
  try {
    const body = (await request.json()) as AdminOrderUpdateBody
    orderId = body.orderId
    const { status, trackingNumber, carrier, note, changedBy = 'admin-api' } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Try regular order first
    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })

    if (existingOrder) {
      // If status change, use workflow
      if (status) {
        const result = await transitionOrderStatus(orderId, status, {
          note,
          changedBy,
          trackingNumber,
          carrier,
        })

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          order: result.order ? mapDbOrderToEnriched(result.order) : undefined,
          emailSent: result.emailSent,
          emailTemplate: result.emailTemplate,
        })
      }

      // Otherwise, simple field update
      const updateData: Partial<InsertOrder> = { updatedAt: new Date() }
      if (trackingNumber) {
        updateData.shipping = {
          service: 'Standard',
          cost: 0,
          ...(existingOrder.shipping || {}),
          trackingNumber,
          carrier: carrier || 'auspost',
          trackingUrl: `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`,
        }
      }
      if (note) {
        updateData.internalNote = [existingOrder.internalNote, note].filter(Boolean).join('\n')
      }

      const [updated] = await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId))
        .returning()

      return NextResponse.json({ success: true, order: mapDbOrderToEnriched(updated) })
    }

    // Try refill order
    const existingRefill = await db.query.refillOrders.findFirst({
      where: eq(refillOrders.id, orderId),
    })

    if (existingRefill) {
      const reverseMap: Record<string, RefillStatus> = {
        pending: 'pending-return',
        blending: 'refilling',
        'quality-check': 'inspecting',
        'ready-to-ship': 'refilling',
        shipped: 'completed',
        cancelled: 'cancelled',
      }
      const refillStatus = (status && reverseMap[status] ? reverseMap[status] : status) as RefillStatus

      const [updated] = await db.update(refillOrders)
        .set({ status: refillStatus, updatedAt: new Date() })
        .where(eq(refillOrders.id, orderId))
        .returning()

      await db.insert(auditLogs).values({
        id: `audit_${nanoid(8)}`,
        adminId: changedBy,
        action: 'update_refill_status',
        entityType: 'refillOrder',
        entityId: orderId,
        before: { status: existingRefill.status },
        after: { status: refillStatus },
        createdAt: new Date(),
      })

      return NextResponse.json({ success: true, refillOrder: updated })
    }

    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  } catch (error) {
    logger.error('[Admin Orders v2] POST error', error instanceof Error ? error : new Error(String(error)), { orderId })
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
