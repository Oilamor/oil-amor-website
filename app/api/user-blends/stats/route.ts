/**
 * Brand Ambassador Stats API
 * GET /api/user-blends/stats?userId=xxx
 *
 * Returns a user's ambassador stats (credits, referrals, top blends).
 * Authenticated users may only read their own stats; admins may read any.
 * Previously this endpoint leaked any user's stats to the world (IDOR).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBrandAmbassadorStats } from '@/lib/brand-ambassador'
import { getSession } from '@/lib/auth/session'
import { requireAdminAuth } from '@/lib/admin/auth'
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

    // Ownership check: a logged-in user may only read their own stats.
    const session = await getSession()
    const isOwner = session.isLoggedIn && !!session.customerId && session.customerId === userId

    if (!isOwner) {
      // requireAdminAuth returns null when the request is admin-authorized
      const adminError = await requireAdminAuth(request)
      if (adminError) {
        return NextResponse.json(
          { error: 'Forbidden: You can only view your own stats' },
          { status: session.isLoggedIn ? 403 : 401 }
        )
      }
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
