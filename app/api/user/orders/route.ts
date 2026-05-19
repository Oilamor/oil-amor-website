/**
 * User Orders API Route
 * Get orders for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, unlockedOils, customers } from '@/lib/db/schema-refill'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET /api/user/orders - Get current user's orders
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const customerId = session.customerId
    
    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Get customer email to also fetch orders by email
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    })
    
    // Fetch orders from database by customerId
    let userOrders = await db.query.orders.findMany({
      where: eq(orders.customerId, customerId),
      orderBy: desc(orders.createdAt),
      limit,
      offset,
    })
    
    // Also fetch by email if we have it (for linked orders)
    if (customer?.email) {
      const emailOrders = await db.query.orders.findMany({
        where: eq(orders.customerEmail, customer.email.toLowerCase()),
        orderBy: desc(orders.createdAt),
        limit,
        offset,
      })
      
      // Merge and deduplicate
      const orderIds = new Set(userOrders.map(o => o.id))
      for (const order of emailOrders) {
        if (!orderIds.has(order.id)) {
          userOrders.push(order)
          orderIds.add(order.id)
        }
      }
      
      // Sort by date
      userOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }
    
    // Orders fetched successfully
    
    // Fetch unlocked oils for this customer
    const userUnlockedOils = await db.query.unlockedOils.findMany({
      where: eq(unlockedOils.customerId, customerId),
    })
    
    // Transform orders for the frontend
    const transformedOrders = userOrders.map(order => ({
      id: order.id,
      date: order.createdAt.toISOString(),
      status: order.status,
      total: order.total / 100, // Convert cents to dollars
      shipping: order.shipping || undefined,
      shippingAddress: order.shippingAddress || undefined,
      items: (order.items || []).map((item: any) => ({
        oilId: item.unlocksOilId || item.productId,
        name: item.name,
        size: item.customMix?.totalVolume 
          ? `${item.customMix.totalVolume}ml` 
          : '30ml',
        type: item.customMix?.mode === 'carrier' ? 'enhanced' : 'pure',
        ratio: item.customMix?.carrierRatio,
        price: item.total / 100,
        quantity: item.quantity,
        itemType: item.type,
      })),
    }))
    
    // Transform unlocked oils
    const transformedUnlockedOils = userUnlockedOils.map(uo => ({
      oilId: uo.oilId,
      unlockedAt: uo.unlockedAt.toISOString(),
      unlockedBy: uo.unlockedBy,
      type: uo.type as 'pure' | 'enhanced',
    }))
    
    return NextResponse.json({
      orders: transformedOrders,
      unlockedOils: transformedUnlockedOils,
      total: userOrders.length,
    })
    
  } catch (error: any) {
    logger.error('User orders GET error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
