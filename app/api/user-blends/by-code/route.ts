/**
 * Get Blend by Share Code API
 * GET /api/user-blends/by-code?code=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBlendByShareCode } from '@/lib/brand-ambassador'
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

    return NextResponse.json({ blend })
  } catch (error) {
    logger.error('Error fetching blend by code:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch blend' },
      { status: 500 }
    )
  }
}
