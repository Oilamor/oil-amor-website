/**
 * Record Blend View API
 * POST /api/user-blends/view
 */

import { NextRequest, NextResponse } from 'next/server'
import { recordBlendView } from '@/lib/brand-ambassador'
import { logger } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shareCode } = body

    if (!shareCode) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      )
    }

    await recordBlendView(shareCode)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error recording blend view:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    )
  }
}
