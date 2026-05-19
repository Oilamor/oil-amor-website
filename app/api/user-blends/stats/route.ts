/**
 * Brand Ambassador Stats API
 * GET /api/user-blends/stats?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBrandAmbassadorStats } from '@/lib/brand-ambassador'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const stats = await getBrandAmbassadorStats(userId)

    return NextResponse.json(stats)
  } catch (error) {
    logger.error('Error fetching brand ambassador stats:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
