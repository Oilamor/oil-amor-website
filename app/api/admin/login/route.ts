import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getAdminSession } from '@/lib/auth/admin-session'
import { logger } from '@/lib/logging/logger'
import { checkUserRateLimit } from '@/lib/redis/rate-limiter'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Redis-backed, distributed, and fail-closed: the in-memory Map this
  // replaced didn't aggregate across Vercel instances and reset on cold
  // starts. A Redis outage denies admin logins rather than opening the gate.
  const rateLimit = await checkUserRateLimit(ip, 'login', 'closed')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    let valid = false

    if (!env.ADMIN_PASSWORD_HASH) {
      console.error(
        '[SECURITY] ADMIN_PASSWORD_HASH is not set. ' +
        'Admin login is disabled until a secure password hash is configured. ' +
        "Run: node -e \"require('bcryptjs').hash('your-password', 10).then(console.log)\" " +
        'and set ADMIN_PASSWORD_HASH in your environment.'
      )
      return NextResponse.json(
        { error: 'Server misconfiguration: admin authentication is not properly configured' },
        { status: 500 }
      )
    }

    // Secure: bcrypt comparison against hashed password
    try {
      valid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH)
    } catch (bcryptError: any) {
      logger.error('bcrypt compare error', bcryptError instanceof Error ? bcryptError : new Error(String(bcryptError)))
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const session = await getAdminSession()
    session.isAdmin = true
    session.loggedInAt = new Date().toISOString()
    await session.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Admin login error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
