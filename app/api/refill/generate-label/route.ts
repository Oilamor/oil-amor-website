import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { generateReturnLabel } from '@/lib/shipping/auspost'
import { db } from '@/lib/db'
import { foreverBottles } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bottleId, customerAddress } = body

    if (!bottleId || !customerAddress) {
      return NextResponse.json(
        { error: 'bottleId and customerAddress are required' },
        { status: 400 }
      )
    }

    const bottle = await db.query.foreverBottles.findFirst({
      where: eq(foreverBottles.id, bottleId),
    })

    if (!bottle || bottle.customerId !== session.customerId) {
      return NextResponse.json({ error: 'Bottle not found' }, { status: 404 })
    }

    const label = await generateReturnLabel(customerAddress, bottleId, {
      shipmentReference: `REFILL-${bottleId.slice(0, 8)}`,
      emailNotification: true,
    })

    return NextResponse.json({
      trackingNumber: label.trackingNumber,
      labelUrl: label.labelUrl,
      expiresAt: label.expiresAt,
    })
  } catch (error: any) {
    logger.error('Generate label error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error.message || 'Failed to generate label' },
      { status: 500 }
    )
  }
}
