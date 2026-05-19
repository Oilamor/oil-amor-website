import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getAdminSession } from '@/lib/auth/admin-session'
import { logger } from '@/lib/logging/logger'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// In-memory rate limiter for admin login (per IP)
const loginAttempts = new Map<string, { count: number; resetTime: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return false
  }

  if (record.count >= MAX_ATTEMPTS) {
    return true
  }

  record.count++
  return false
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  if (isRateLimited(ip)) {
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
