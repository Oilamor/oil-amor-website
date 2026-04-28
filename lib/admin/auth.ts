import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getAdminSession } from '@/lib/auth/admin-session'
import crypto from 'crypto'

export async function requireAdminAuth(request: NextRequest) {
  const adminKey = env.ADMIN_API_KEY

  if (!adminKey) {
    return NextResponse.json(
      { error: 'Server misconfiguration: ADMIN_API_KEY not set' },
      { status: 500 }
    )
  }

  // Allow Bearer token for API/script access
  const authHeader = request.headers.get('authorization')
  const expectedBearer = `Bearer ${adminKey}`
  if (authHeader && authHeader.length === expectedBearer.length) {
    // Constant-time comparison to prevent timing attacks
    const authBuffer = Buffer.from(authHeader)
    const expectedBuffer = Buffer.from(expectedBearer)
    try {
      if (crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
        return null
      }
    } catch {
      // Length mismatch (caught by the length check above, but safety net)
    }
  }

  // Allow admin session cookie for browser access
  const session = await getAdminSession()
  if (session.isAdmin) {
    return null
  }

  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
