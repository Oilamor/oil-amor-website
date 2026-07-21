/**
 * Get Blend by Share Code API
 * GET /api/user-blends/by-code?code=xxx
 *
 * Privacy (2026-07-21): anonymous share-code access is only allowed for
 * blends the owner marked isPublic — that is what share links are for.
 * A private blend's share code acts as a lookup key for its owner only:
 * non-owners must hold an admin session/API key, everyone else gets 403.
 * Enforcement lives here in the route (the trust boundary) rather than in
 * getBlendByShareCode, because the internal referral flow (trackReferral)
 * legitimately needs the unfiltered lookup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBlendByShareCode } from '@/lib/brand-ambassador'
import { getSession } from '@/lib/auth/session'
import { requireAdminAuth } from '@/lib/admin/auth'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      )
    }

    const blend = await getBlendByShareCode(code)

    if (!blend) {
      return NextResponse.json(
        { error: 'Blend not found' },
        { status: 404 }
      )
    }

    // Public blends are served anonymously — that is the purpose of share links
    if (!blend.isPublic) {
      const session = await getSession()
      const isOwner = session.isLoggedIn && !!session.customerId && session.customerId === blend.userId

      if (!isOwner) {
        // requireAdminAuth returns null when the request is admin-authorized
        const adminError = await requireAdminAuth(request)
        if (adminError) {
          return NextResponse.json(
            { error: 'This blend is private' },
            { status: 403 }
          )
        }
      }
    }

    return NextResponse.json({ blend })
  } catch (error) {
    logger.error('Error fetching blend by code:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch blend' },
      { status: 500 }
    )
  }
}
