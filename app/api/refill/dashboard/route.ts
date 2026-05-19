import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { foreverBottles, refillOrders } from '@/lib/db/schema-refill'
import { eq, desc } from 'drizzle-orm'
import { getCreditSummary } from '@/lib/refill/credits'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerId = session.customerId

    const [bottles, orders, credits] = await Promise.all([
      db.query.foreverBottles.findMany({
        where: eq(foreverBottles.customerId, customerId),
        orderBy: [desc(foreverBottles.createdAt)],
      }),
      db.query.refillOrders.findMany({
        where: eq(refillOrders.customerId, customerId),
        orderBy: [desc(refillOrders.createdAt)],
      }),
      getCreditSummary(customerId),
    ])

    return NextResponse.json({
      bottles,
      orders,
      credits,
    })
  } catch (error) {
    logger.error('Refill dashboard error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
