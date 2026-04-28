import { getIronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { env } from '@/env'

export interface AdminSessionData {
  isAdmin: boolean
  loggedInAt?: string
}

// ADMIN_SESSION_PASSWORD is preferred; fall back to IRON_SESSION_PASSWORD
const password = env.ADMIN_SESSION_PASSWORD || env.IRON_SESSION_PASSWORD

if (!password || password.length < 32) {
  throw new Error('IRON_SESSION_PASSWORD (or ADMIN_SESSION_PASSWORD) is required and must be at least 32 characters')
}

export const adminSessionOptions: SessionOptions = {
  cookieName: 'oilamor_admin_session',
  password,
  cookieOptions: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
  },
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  return getIronSession<AdminSessionData>(cookieStore, adminSessionOptions)
}

export async function requireAdminSession() {
  const session = await getAdminSession()
  if (!session.isAdmin) {
    throw new Error('Unauthorized')
  }
  return session
}
