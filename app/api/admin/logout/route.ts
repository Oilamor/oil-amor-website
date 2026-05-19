import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin-session'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getAdminSession()
    session.destroy()
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Admin logout error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
