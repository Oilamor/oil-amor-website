import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCreditSummary, getCreditHistory } from '@/lib/refill/credits'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customerId = session.customerId
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const [summary, history] = await Promise.all([
      getCreditSummary(customerId),
      getCreditHistory(customerId, { limit }),
    ])

    return NextResponse.json({
      summary,
      history,
    })
  } catch (error) {
    logger.error('Refill credits error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
  }
}
