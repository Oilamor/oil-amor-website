import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, session.customerId),
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const address = customer.metadata?.defaultAddress || customer.metadata?.shippingAddress || null

    return NextResponse.json({ address })
  } catch (error) {
    logger.error('Customer address error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to fetch address' }, { status: 500 })
  }
}
