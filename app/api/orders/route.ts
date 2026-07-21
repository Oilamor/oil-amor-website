/**
 * Orders API Route
 * Read orders with cord/charm attachments.
 *
 * Order creation goes through /api/stripe/checkout, which applies
 * server-side pricing and only creates orders after payment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { requireAdminAuth } from '@/lib/admin/auth'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET /api/orders - Get orders (admin or customer)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const orderId = searchParams.get('orderId')

    // Check customer session first
    const session = await getSession()
    const isLoggedIn = session.isLoggedIn && session.customerId

    if (orderId) {
      // Return specific order
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      })

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      // Authorization: allow if the order belongs to the logged-in customer,
      // or if an admin is requesting it
      if (isLoggedIn && order.customerId === session.customerId) {
        return NextResponse.json({ order })
      }

      // Check admin auth
      const adminAuthError = await requireAdminAuth(request)
      if (!adminAuthError) {
        return NextResponse.json({ order })
      }

      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (customerId) {
      // Authorization: customers can only view their own orders
      if (isLoggedIn && session.customerId === customerId) {
        const userOrders = await db.query.orders.findMany({
          where: eq(orders.customerId, customerId),
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        })

        return NextResponse.json({
          orders: userOrders,
          total: userOrders.length,
        })
      }

      // Check admin auth
      const adminAuthError = await requireAdminAuth(request)
      if (!adminAuthError) {
        const userOrders = await db.query.orders.findMany({
          where: eq(orders.customerId, customerId),
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        })

        return NextResponse.json({
          orders: userOrders,
          total: userOrders.length,
        })
      }

      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // No params provided — require admin auth
    const adminAuthError = await requireAdminAuth(request)
    if (adminAuthError) return adminAuthError

    const allOrders = await db.query.orders.findMany({
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: 100,
    })

    return NextResponse.json({
      orders: allOrders,
      total: allOrders.length,
    })

  } catch (error) {
    logger.error('Order GET error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
