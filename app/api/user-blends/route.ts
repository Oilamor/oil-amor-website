/**
 * User Blends API Routes
 * GET /api/user-blends?userId=xxx - Get user's blends (own library, or another
 *                                   user's public blends only)
 * POST /api/user-blends - Save a new blend to the authenticated user's library
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserBlends, saveBlendToLibrary } from '@/lib/brand-ambassador'
import { getBrandAmbassadorStats } from '@/lib/brand-ambassador'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

// GET /api/user-blends?userId=xxx
export async function GET(request: NextRequest) {
  try {
    // Require an authenticated customer session
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.customerId

    const blends = await getUserBlends(userId)

    // Another user's library is only visible through their public blends
    const visibleBlends = userId === session.customerId
      ? blends
      : blends.filter((blend) => blend.isPublic)

    return NextResponse.json({ blends: visibleBlends })
  } catch (error) {
    logger.error('Error fetching user blends:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch blends' },
      { status: 500 }
    )
  }
}

// POST /api/user-blends - Save a blend to user's library
export async function POST(request: NextRequest) {
  try {
    // Require an authenticated customer session — the blend owner is always
    // derived from the session, never from the request body
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, intendedUse, recipe, tags, createdFromOrderId, isPublic } = body

    if (!name || !recipe) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await saveBlendToLibrary({
      userId: session.customerId,
      name,
      description,
      intendedUse,
      recipe,
      tags,
      createdFromOrderId,
      isPublic,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      blendId: result.blendId,
      shareCode: result.shareCode,
    })
  } catch (error) {
    logger.error('Error saving blend:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to save blend' },
      { status: 500 }
    )
  }
}
