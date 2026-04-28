/**
 * Admin Order Detail API
 * GET / PATCH for single order
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders, refillOrders, customers } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { EnrichedOrder } from '@/lib/orders/types'
import { OrderStatus } from '@/lib/db/schema/orders'

export const dynamic = 'force-dynamic'

// Re-use mapper from main orders route
function mapDbOrderToEnriched(dbOrder: typeof orders.$inferSelect): EnrichedOrder {
  const items = (dbOrder.items || []).map((item: any) => ({
    id: item.id || `item-${Math.random().toString(36).slice(2, 6)}`,
    name: item.name || 'Unknown Item',
    type: (item.type as any) || inferItemType(item),
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
      oils: item.customMix.oils.map((o: any) => ({
        oilId: o.oilId,
        oilName: o.oilName,
        ml: o.ml,
        percentage: o.percentage,
        drops: o.drops,
      })),
      carrierOil: item.customMix.carrierOilId,
      carrierPercentage: item.customMix.carrierRatio,
      crystal: item.customMix.crystalId,
      cord: item.customMix.cordId,
      intendedUse: item.customMix.intendedUse,
      safetyScore: item.customMix.safetyScore,
      safetyRating: item.customMix.safetyRating,
      safetyWarnings: item.customMix.safetyWarnings || [],
      batchId: item.customMix.batchId || `OA-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
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

  const requiresBlending = items.some((item: any) =>
    item.type === 'custom_blend' ||
    item.type === 'collection_blend' ||
    item.type === 'community_blend' ||
    item.type === 'refill'
  )

  return {
    id: dbOrder.id,
    customerId: dbOrder.customerId,
    customerEmail: dbOrder.customerEmail,
    customerName: dbOrder.customerName,
    isGuest: dbOrder.isGuest,
    status: dbOrder.status as OrderStatus,
    statusHistory: (dbOrder.statusHistory || []).map((h: any) => ({
      status: h.status as OrderStatus,
      timestamp: h.timestamp,
      note: h.note,
      changedBy: h.changedBy,
    })),
    items: items as any,
    subtotal: dbOrder.subtotal / 100,
    taxTotal: dbOrder.taxTotal / 100,
    shippingTotal: dbOrder.shippingTotal / 100,
    discountTotal: dbOrder.discountTotal / 100,
    storeCreditUsed: dbOrder.storeCreditUsed / 100,
    giftCardUsed: dbOrder.giftCardUsed / 100,
    total: dbOrder.total / 100,
    currency: dbOrder.currency,
    payment: (dbOrder.payment || { method: 'credit-card', status: 'pending' }) as any,
    shippingAddress: (dbOrder.shippingAddress || {
      firstName: '', lastName: '', address1: '', city: '', province: '', country: 'AU', zip: '',
    }) as any,
    shipping: (dbOrder.shipping || { carrier: 'auspost', service: 'Standard', cost: 0 }) as any,
    isGift: dbOrder.isGift,
    giftMessage: dbOrder.giftMessage || undefined,
    giftReceipt: dbOrder.giftReceipt,
    requiresBlending,
    blendingPriority: dbOrder.blendingPriority as any,
    eligibleForReturns: dbOrder.eligibleForReturns,
    returnCreditsEarned: dbOrder.returnCreditsEarned,
    returnCreditsUsed: dbOrder.returnCreditsUsed,
    customerNote: dbOrder.customerNote || undefined,
    internalNote: dbOrder.internalNote || undefined,
    metadata: dbOrder.metadata || {},
    createdAt: dbOrder.createdAt.toISOString(),
    updatedAt: dbOrder.updatedAt.toISOString(),
    processingCompletedAt: dbOrder.processingCompletedAt?.toISOString(),
  }
}

function inferItemType(item: any): string {
  if (item.customMix) return 'custom_blend'
  if (item.isRefill) return 'refill'
  if (item.communityBlendId) return 'community_blend'
  if (item.collectionBlendId) return 'collection_blend'
  if (item.unlocksOilId) return 'pure_oil'
  return 'pure_oil'
}

// ============================================================================
// GET — Single Order Detail
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { id } = params

  try {
    // Try regular order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    })

    if (order) {
      return NextResponse.json({
        success: true,
        order: mapDbOrderToEnriched(order),
        source: 'local',
      })
    }

    // Try refill order
    const refill = await db.query.refillOrders.findFirst({
      where: eq(refillOrders.id, id),
    })

    if (refill) {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, refill.customerId),
      })
      const pricing = refill.pricing || { standardPrice: 0, creditApplied: 0, finalPrice: 0 }
      const finalPrice = pricing.finalPrice || 0

      const enrichedRefill: EnrichedOrder = {
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
          unitPrice: finalPrice / 100,
          quantity: 1,
          totalPrice: finalPrice / 100,
          isRefill: true,
          bottleSize: 100,
        }],
        subtotal: finalPrice / 100,
        taxTotal: (finalPrice * 0.1) / 100,
        shippingTotal: 0,
        discountTotal: (pricing.creditApplied || 0) / 100,
        storeCreditUsed: (pricing.creditApplied || 0) / 100,
        giftCardUsed: 0,
        total: finalPrice / 100,
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
      }

      return NextResponse.json({
        success: true,
        order: enrichedRefill,
        source: 'local',
      })
    }

    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  } catch (error: any) {
    console.error('[Admin Order Detail] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
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
// PATCH — Update Order Fields
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { id } = params

  try {
    const body = await request.json()
    const { internalNote, customerNote, blendingPriority, isGift, giftMessage } = body

    const existingOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = { updatedAt: new Date() }

    if (internalNote !== undefined) {
      updateData.internalNote = internalNote
    }
    if (customerNote !== undefined) {
      updateData.customerNote = customerNote
    }
    if (blendingPriority !== undefined) {
      updateData.blendingPriority = blendingPriority
    }
    if (isGift !== undefined) {
      updateData.isGift = isGift
    }
    if (giftMessage !== undefined) {
      updateData.giftMessage = giftMessage
    }

    const [updated] = await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      order: mapDbOrderToEnriched(updated),
    })
  } catch (error: any) {
    console.error('[Admin Order Detail] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
