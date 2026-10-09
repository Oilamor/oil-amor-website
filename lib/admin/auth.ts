import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getAdminSession } from '@/lib/auth/admin-session'
import crypto from 'crypto'

export async function requireAdminAuth(request: NextRequest) {
  const adminKey = env.ADMIN_API_KEY

  // 1. Admin session cookie authorizes regardless of API-key configuration —
  // a logged-in admin must never be blocked (or 500ed) by a missing env var.
  const session = await getAdminSession()
  if (session.isAdmin) {
    return null
  }

  // 2. Bearer token for API/script access — only when a key is configured.
  if (adminKey) {
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
  }

  // 3. Neither mechanism authorized. Fail closed with 401 — anonymous callers
  // and bad keys both land here; a missing key is a 401, not a 500.
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
