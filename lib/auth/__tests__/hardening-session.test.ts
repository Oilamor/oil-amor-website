/**
 * Session Hardening Tests
 *
 * Pins the security-critical semantics of the two iron-session wrappers:
 * - lib/auth/session.ts        (customer sessions, 30-day cookie)
 * - lib/auth/admin-session.ts  (admin sessions, 8-hour cookie, separate password)
 *
 * Cookie flags (httpOnly / sameSite=strict / secure-in-production) and the
 * customerId/isAdmin gates are asserted directly so any regression that
 * weakens session security fails loudly. iron-session and next/headers are
 * mocked — no real cookies or sealing crypto involved.
 */

const CUSTOMER_PASSWORD = 'c'.repeat(32)
const ADMIN_PASSWORD = 'a'.repeat(32)

jest.mock('@/env', () => ({
  env: {
    IRON_SESSION_PASSWORD: 'c'.repeat(32),
    ADMIN_SESSION_PASSWORD: undefined,
    NODE_ENV: 'test',
  },
}))

const mockGetIronSession = jest.fn()
jest.mock('iron-session', () => ({
  getIronSession: (...args: unknown[]) => mockGetIronSession(...args),
}))

const mockCookies = jest.fn()
jest.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}))

import {
  sessionOptions,
  getSession,
  requireAuth,
} from '@/lib/auth/session'
import {
  adminSessionOptions,
  getAdminSession,
  requireAdminSession,
} from '@/lib/auth/admin-session'

/**
 * Fresh module load with a different @/env — the session modules read env at
 * import time, so variants (production mode, missing passwords) need a reset
 * module registry plus a re-registered env mock.
 */
async function loadSessionModule(envValues: Record<string, unknown>) {
  jest.resetModules()
  jest.doMock('@/env', () => ({ env: envValues }))
  return import('@/lib/auth/session')
}

async function loadAdminSessionModule(envValues: Record<string, unknown>) {
  jest.resetModules()
  jest.doMock('@/env', () => ({ env: envValues }))
  return import('@/lib/auth/admin-session')
}

const fakeCookieStore = { name: 'cookie-store' }

beforeEach(() => {
  mockCookies.mockResolvedValue(fakeCookieStore)
})

// ============================================================================
// lib/auth/session.ts — cookie options (security-critical, pinned)
// ============================================================================

describe('customer sessionOptions — cookie security flags', () => {
  it('pins the cookie name', () => {
    expect(sessionOptions.cookieName).toBe('oilamor_session')
  })

  it('marks the cookie httpOnly (not readable from JS)', () => {
    expect(sessionOptions.cookieOptions?.httpOnly).toBe(true)
  })

  it('pins sameSite to strict (CSRF hardening)', () => {
    expect(sessionOptions.cookieOptions?.sameSite).toBe('strict')
  })

  it('pins a 30-day maxAge', () => {
    expect(sessionOptions.cookieOptions?.maxAge).toBe(60 * 60 * 24 * 30)
  })

  it('sources the sealing password from IRON_SESSION_PASSWORD', () => {
    expect(sessionOptions.password).toBe(CUSTOMER_PASSWORD)
    expect(sessionOptions.password).toHaveLength(32)
  })

  it('disables secure outside production (NODE_ENV=test)', () => {
    expect(sessionOptions.cookieOptions?.secure).toBe(false)
  })

  it('enables secure in production', async () => {
    const mod = await loadSessionModule({
      IRON_SESSION_PASSWORD: CUSTOMER_PASSWORD,
      NODE_ENV: 'production',
    })
    expect(mod.sessionOptions.cookieOptions?.secure).toBe(true)
  })

  it('disables secure in development', async () => {
    const mod = await loadSessionModule({
      IRON_SESSION_PASSWORD: CUSTOMER_PASSWORD,
      NODE_ENV: 'development',
    })
    expect(mod.sessionOptions.cookieOptions?.secure).toBe(false)
  })

  it('throws at import time when IRON_SESSION_PASSWORD is missing', async () => {
    await expect(loadSessionModule({ NODE_ENV: 'test' })).rejects.toThrow(
      'IRON_SESSION_PASSWORD is required and must be at least 32 characters'
    )
  })

  it('throws at import time when IRON_SESSION_PASSWORD is empty', async () => {
    await expect(
      loadSessionModule({ IRON_SESSION_PASSWORD: '', NODE_ENV: 'test' })
    ).rejects.toThrow('IRON_SESSION_PASSWORD is required')
  })
})

// ============================================================================
// getSession / requireAuth
// ============================================================================

describe('getSession', () => {
  it('awaits the cookie store and hands it to getIronSession with the pinned options', async () => {
    const fakeSession = { isLoggedIn: false }
    mockGetIronSession.mockResolvedValue(fakeSession)

    const session = await getSession()

    expect(mockCookies).toHaveBeenCalledTimes(1)
    expect(mockGetIronSession).toHaveBeenCalledWith(fakeCookieStore, sessionOptions)
    expect(session).toBe(fakeSession)
  })
})

describe('requireAuth', () => {
  it('returns the session for a logged-in customer', async () => {
    const authed = {
      isLoggedIn: true,
      customerId: 'cust-1',
      email: 'a@b.co',
      firstName: 'A',
      lastName: 'B',
    }
    mockGetIronSession.mockResolvedValue(authed)

    const session = await requireAuth()
    expect(session).toBe(authed)
    expect(session.customerId).toBe('cust-1')
  })

  it('rejects when isLoggedIn is false (guest)', async () => {
    mockGetIronSession.mockResolvedValue({ isLoggedIn: false, customerId: 'cust-1' })
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })

  it('rejects when isLoggedIn is true but customerId is missing', async () => {
    mockGetIronSession.mockResolvedValue({ isLoggedIn: true })
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })

  it('rejects for an empty session (no flags set at all)', async () => {
    mockGetIronSession.mockResolvedValue({})
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })

  it('rejects when customerId is an empty string', async () => {
    mockGetIronSession.mockResolvedValue({ isLoggedIn: true, customerId: '' })
    await expect(requireAuth()).rejects.toThrow('Unauthorized')
  })
})

// ============================================================================
// lib/auth/admin-session.ts — cookie options (security-critical, pinned)
// ============================================================================

describe('admin adminSessionOptions — cookie security flags', () => {
  it('pins the admin cookie name', () => {
    expect(adminSessionOptions.cookieName).toBe('oilamor_admin_session')
  })

  it('uses a distinct cookie name from the customer session', () => {
    expect(adminSessionOptions.cookieName).not.toBe(sessionOptions.cookieName)
  })

  it('marks the cookie httpOnly', () => {
    expect(adminSessionOptions.cookieOptions?.httpOnly).toBe(true)
  })

  it('pins sameSite to strict', () => {
    expect(adminSessionOptions.cookieOptions?.sameSite).toBe('strict')
  })

  it('pins an 8-hour maxAge (shorter lived than customer sessions)', () => {
    expect(adminSessionOptions.cookieOptions?.maxAge).toBe(60 * 60 * 8)
    expect(adminSessionOptions.cookieOptions!.maxAge!).toBeLessThan(
      sessionOptions.cookieOptions!.maxAge!
    )
  })

  it('disables secure outside production (NODE_ENV=test)', () => {
    expect(adminSessionOptions.cookieOptions?.secure).toBe(false)
  })

  it('enables secure in production', async () => {
    const mod = await loadAdminSessionModule({
      IRON_SESSION_PASSWORD: CUSTOMER_PASSWORD,
      NODE_ENV: 'production',
    })
    expect(mod.adminSessionOptions.cookieOptions?.secure).toBe(true)
  })

  it('prefers ADMIN_SESSION_PASSWORD over IRON_SESSION_PASSWORD', async () => {
    const mod = await loadAdminSessionModule({
      IRON_SESSION_PASSWORD: CUSTOMER_PASSWORD,
      ADMIN_SESSION_PASSWORD: ADMIN_PASSWORD,
      NODE_ENV: 'test',
    })
    expect(mod.adminSessionOptions.password).toBe(ADMIN_PASSWORD)
  })

  it('falls back to IRON_SESSION_PASSWORD when ADMIN_SESSION_PASSWORD is unset', () => {
    // Top-level env mock has ADMIN_SESSION_PASSWORD: undefined
    expect(adminSessionOptions.password).toBe(CUSTOMER_PASSWORD)
  })

  it('throws at import time when neither password is set', async () => {
    await expect(loadAdminSessionModule({ NODE_ENV: 'test' })).rejects.toThrow(
      'IRON_SESSION_PASSWORD (or ADMIN_SESSION_PASSWORD) is required and must be at least 32 characters'
    )
  })

  it('throws at import time when the password is shorter than 32 characters', async () => {
    await expect(
      loadAdminSessionModule({
        IRON_SESSION_PASSWORD: 'x'.repeat(31),
        NODE_ENV: 'test',
      })
    ).rejects.toThrow('at least 32 characters')
  })

  it('accepts a password of exactly 32 characters (boundary)', async () => {
    const mod = await loadAdminSessionModule({
      IRON_SESSION_PASSWORD: 'y'.repeat(32),
      NODE_ENV: 'test',
    })
    expect(mod.adminSessionOptions.password).toBe('y'.repeat(32))
  })
})

// ============================================================================
// getAdminSession / requireAdminSession
// ============================================================================

describe('getAdminSession', () => {
  it('awaits the cookie store and hands it to getIronSession with the admin options', async () => {
    const fakeSession = { isAdmin: false }
    mockGetIronSession.mockResolvedValue(fakeSession)

    const session = await getAdminSession()

    expect(mockCookies).toHaveBeenCalledTimes(1)
    expect(mockGetIronSession).toHaveBeenCalledWith(fakeCookieStore, adminSessionOptions)
    expect(session).toBe(fakeSession)
  })
})

describe('requireAdminSession', () => {
  it('returns the session when isAdmin is true', async () => {
    const admin = { isAdmin: true, loggedInAt: new Date().toISOString() }
    mockGetIronSession.mockResolvedValue(admin)

    const session = await requireAdminSession()
    expect(session).toBe(admin)
    expect(session.isAdmin).toBe(true)
  })

  it('throws when isAdmin is false', async () => {
    mockGetIronSession.mockResolvedValue({ isAdmin: false })
    await expect(requireAdminSession()).rejects.toThrow('Unauthorized')
  })

  it('throws when isAdmin is absent (fresh cookie)', async () => {
    mockGetIronSession.mockResolvedValue({})
    await expect(requireAdminSession()).rejects.toThrow('Unauthorized')
  })
})
