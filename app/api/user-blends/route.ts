/**
 * User Blends API Routes
 * GET /api/user-blends?userId=xxx - Get user's blends
 * POST /api/user-blends - Save a new blend (called after purchase)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserBlends, saveBlendToLibrary } from '@/lib/brand-ambassador'
import { getBrandAmbassadorStats } from '@/lib/brand-ambassador'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

// GET /api/user-blends?userId=xxx
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

    const blends = await getUserBlends(userId)

    return NextResponse.json({ blends })
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
    const body = await request.json()
    const { userId, name, description, intendedUse, recipe, tags, createdFromOrderId, isPublic } = body

    if (!userId || !name || !recipe) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await saveBlendToLibrary({
      userId,
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
