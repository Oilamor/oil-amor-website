/**
 * Admin Dashboard Stats API v2
 * Local DB only — comprehensive analytics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders, refillOrders, foreverBottles, customers, inventoryItems, blendCommissions } from '@/lib/db/schema-refill'
import { sql, eq, gte, ne, and } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    // =========================================================================
    // REGULAR ORDERS STATS
    // =========================================================================

    const orderStats = await db.select({
      status: orders.status,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .groupBy(orders.status)

    const totalOrders = orderStats.reduce((sum, s) => sum + Number(s.count), 0)
    const pendingOrders = orderStats.find(s => s.status === 'pending')?.count || 0
    const confirmedOrders = orderStats.find(s => s.status === 'confirmed')?.count || 0
    const mixingOrders = orderStats.find(s => s.status === 'blending')?.count || 0
    const qualityCheckOrders = orderStats.find(s => s.status === 'quality-check')?.count || 0
    const readyOrders = orderStats.find(s => s.status === 'ready-to-ship')?.count || 0
    const shippedOrders = orderStats.find(s => s.status === 'shipped')?.count || 0
    const deliveredOrders = orderStats.find(s => s.status === 'delivered')?.count || 0
    const cancelledOrders = orderStats.find(s => s.status === 'cancelled')?.count || 0

    // Revenue calculations
    const todayRevenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(total), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, today), ne(orders.status, 'cancelled')))

    const weekRevenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(total), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, weekAgo), ne(orders.status, 'cancelled')))

    const monthRevenueResult = await db.select({
      total: sql<number>`COALESCE(SUM(total), 0)`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, monthAgo), ne(orders.status, 'cancelled')))

    const avgOrderResult = await db.select({
      avg: sql<number>`COALESCE(AVG(total), 0)`,
    })
    .from(orders)
    .where(ne(orders.status, 'cancelled'))

    // =========================================================================
    // REFILL ORDERS STATS
    // =========================================================================

    let refillStats = {
      total: 0,
      pending: 0,
      blending: 0,
      completed: 0,
      revenue: 0,
    }

    try {
      const rStats = await db.select({
        status: refillOrders.status,
        count: sql<number>`count(*)`,
      })
      .from(refillOrders)
      .groupBy(refillOrders.status)

      refillStats.total = rStats.reduce((sum, s) => sum + Number(s.count), 0)
      refillStats.pending = rStats.find(s => s.status === 'pending-return')?.count || 0
      refillStats.blending = rStats
        .filter(s => ['received', 'inspecting', 'refilling'].includes(s.status))
        .reduce((sum, s) => sum + Number(s.count), 0)
      refillStats.completed = rStats.find(s => s.status === 'completed')?.count || 0

      const refillRevenue = await db.execute(sql`
        SELECT COALESCE(SUM((pricing->>'finalPrice')::numeric), 0) as total
        FROM ${refillOrders}
        WHERE created_at >= ${monthAgo.toISOString()}
      `)
      refillStats.revenue = Number(refillRevenue.rows[0]?.total || 0)
    } catch (err: any) {
      if (!err?.message?.includes('does not exist')) {
        logger.error('Dashboard refill stats error', err instanceof Error ? err : new Error(String(err)), { statType: 'refill' })
      }
    }

    // =========================================================================
    // BOTTLE STATS
    // =========================================================================

    let bottleStats = { total: 0, active: 0 }
    try {
      const bStats = await db.select({
        status: foreverBottles.status,
        count: sql<number>`count(*)`,
      })
      .from(foreverBottles)
      .groupBy(foreverBottles.status)

      bottleStats.total = bStats.reduce((sum, s) => sum + Number(s.count), 0)
      bottleStats.active = bStats.find(s => s.status === 'active')?.count || 0
    } catch (err: any) {
      if (!err?.message?.includes('does not exist')) {
        logger.error('Dashboard bottle stats error', err instanceof Error ? err : new Error(String(err)), { statType: 'bottle' })
      }
    }

    // =========================================================================
    // CUSTOMER STATS
    // =========================================================================

    let customerCount = 0
    try {
      const cResult = await db.select({
        count: sql<number>`count(*)`,
      })
      .from(customers)
      customerCount = Number(cResult[0]?.count || 0)
    } catch (err: any) {
      if (!err?.message?.includes('does not exist')) {
        logger.error('Dashboard customer stats error', err instanceof Error ? err : new Error(String(err)), { statType: 'customer' })
      }
    }

    // =========================================================================
    // COMMISSION STATS
    // =========================================================================

    let commissionStats = { total: 0, pending: 0, paid: 0 }
    try {
      const commResult = await db.select({
        status: blendCommissions.status,
        total: sql<number>`COALESCE(SUM(commission_amount), 0)`,
      })
      .from(blendCommissions)
      .groupBy(blendCommissions.status)

      commissionStats.total = commResult.reduce((sum, s) => sum + Number(s.total), 0)
      commissionStats.pending = commResult.find(s => s.status === 'purchased')?.total || 0
      commissionStats.paid = commResult.find(s => s.status === 'paid')?.total || 0
    } catch (err: any) {
      if (!err?.message?.includes('does not exist')) {
        logger.error('Dashboard commission stats error', err instanceof Error ? err : new Error(String(err)), { statType: 'commission' })
      }
    }

    // =========================================================================
    // LOW STOCK
    // =========================================================================

    let lowStockItems: string[] = []
    try {
      const lowStock = await db.select()
        .from(inventoryItems)
        .where(sql`${inventoryItems.quantity} <= ${inventoryItems.reorderPoint}`)
      lowStockItems = lowStock.map(item => item.name)
    } catch {
      // Inventory table may not exist
    }

    // =========================================================================
    // COMBINED RESPONSE
    // =========================================================================

    const todayRevenueCents = Number(todayRevenueResult[0]?.total || 0)
    const weekRevenueCents = Number(weekRevenueResult[0]?.total || 0)
    const monthRevenueCents = Number(monthRevenueResult[0]?.total || 0)
    const avgOrderCents = Number(avgOrderResult[0]?.avg || 0)

    return NextResponse.json({
      totalOrders: totalOrders + refillStats.total,
      pendingOrders: Number(pendingOrders) + Number(confirmedOrders) + refillStats.pending,
      mixingOrders: Number(mixingOrders) + Number(qualityCheckOrders) + refillStats.blending,
      readyOrders: Number(readyOrders),
      shippedOrders: Number(shippedOrders) + refillStats.completed,
      deliveredOrders: Number(deliveredOrders),
      cancelledOrders: Number(cancelledOrders),
      todayRevenue: (todayRevenueCents + (todayRevenueCents > 0 ? 0 : refillStats.revenue / 30)) / 100, // Rough daily estimate if no orders today
      weekRevenue: (weekRevenueCents + refillStats.revenue / 4) / 100,
      monthRevenue: (monthRevenueCents + refillStats.revenue) / 100,
      averageOrderValue: avgOrderCents / 100,
      totalCommissions: commissionStats.total / 100,
      pendingCommissions: commissionStats.pending / 100,
      paidCommissions: commissionStats.paid / 100,
      activeCustomers: customerCount,
      totalBottles: bottleStats.total,
      activeBottles: bottleStats.active,
      lowStockItems,
      orderBreakdown: {
        ...orderStats.reduce((acc, s) => ({ ...acc, [s.status]: Number(s.count) }), {}),
        refill: refillStats.total,
      },
      source: 'local',
    })
  } catch (error: any) {
    logger.error('Dashboard stats error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({
      totalOrders: 0,
      pendingOrders: 0,
      mixingOrders: 0,
      readyOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      todayRevenue: 0,
      weekRevenue: 0,
      monthRevenue: 0,
      averageOrderValue: 0,
      totalCommissions: 0,
      pendingCommissions: 0,
      lowStockItems: [],
      orderBreakdown: {},
      error: 'Failed to fetch stats',
      
    }, { status: 500 })
  }
}
