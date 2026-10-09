/**
 * requireAdminAuth Hardening Tests (lib/admin/auth.ts)
 *
 * Covers the dual auth mechanism for admin API routes:
 * - Bearer token path using crypto.timingSafeEqual (constant-time compare)
 * - iron-session cookie fallback for browser access (checked first — a
 *   logged-in admin is authorized regardless of API-key configuration)
 * - Fail-closed 401 (not 500) when nothing authorizes and the key is unset
 *
 * next/server, @/env and the admin session layer are mocked.
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'

const VALID_KEY = 'test-admin-api-key-0123456789abcdef'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      body,
      json: async () => body,
    })),
  },
}))

// Mutable env — requireAdminAuth reads ADMIN_API_KEY at call time
const mockEnv: { ADMIN_API_KEY?: string; NODE_ENV?: string } = {
  ADMIN_API_KEY: VALID_KEY,
  NODE_ENV: 'test',
}
jest.mock('@/env', () => ({ env: mockEnv }))

const mockGetAdminSession = jest.fn()
jest.mock('@/lib/auth/admin-session', () => ({
  getAdminSession: (...args: unknown[]) => mockGetAdminSession(...args),
}))

import { requireAdminAuth } from '@/lib/admin/auth'

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
  } as unknown as NextRequest
}

function setAdminSession(isAdmin: boolean) {
  mockGetAdminSession.mockResolvedValue(isAdmin ? { isAdmin: true } : { isAdmin: false })
}

beforeEach(() => {
  mockEnv.ADMIN_API_KEY = VALID_KEY
  setAdminSession(false)
})

// ============================================================================
// ADMIN_API_KEY configuration guard
// ============================================================================

describe('ADMIN_API_KEY configuration guard', () => {
  it('returns 401 (not 500) when the key is unconfigured and no session exists', async () => {
    delete mockEnv.ADMIN_API_KEY
    const res = await requireAdminAuth(makeRequest())
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('returns an Unauthorized error body without leaking internals', async () => {
    delete mockEnv.ADMIN_API_KEY
    const res = await requireAdminAuth(makeRequest())
    const body = await res!.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('rejects a Bearer header when no key is configured (nothing to compare against)', async () => {
    delete mockEnv.ADMIN_API_KEY
    const res = await requireAdminAuth(makeRequest({ authorization: `Bearer ${VALID_KEY}` }))
    expect(res!.status).toBe(401)
  })

  it('authorizes a valid admin session even when the key is missing', async () => {
    delete mockEnv.ADMIN_API_KEY
    setAdminSession(true)
    const res = await requireAdminAuth(makeRequest())
    expect(res).toBeNull()
  })
})

// ============================================================================
// Bearer token path (timing-safe comparison)
// ============================================================================

describe('Bearer token path', () => {
  it('returns null (authorized) for the correct Bearer token', async () => {
    const res = await requireAdminAuth(makeRequest({ authorization: `Bearer ${VALID_KEY}` }))
    expect(res).toBeNull()
  })

  it('checks the session first, then authorizes via the Bearer token', async () => {
    const res = await requireAdminAuth(makeRequest({ authorization: `Bearer ${VALID_KEY}` }))
    expect(res).toBeNull()
    expect(mockGetAdminSession).toHaveBeenCalledTimes(1)
  })

  it('uses crypto.timingSafeEqual for a same-length candidate', async () => {
    const spy = jest.spyOn(crypto, 'timingSafeEqual')
    await requireAdminAuth(makeRequest({ authorization: `Bearer ${VALID_KEY}` }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('rejects a wrong token of equal length and falls through to the session check', async () => {
    const wrongKey = 'x'.repeat(VALID_KEY.length)
    const spy = jest.spyOn(crypto, 'timingSafeEqual')
    const res = await requireAdminAuth(makeRequest({ authorization: `Bearer ${wrongKey}` }))
    expect(spy).toHaveBeenCalledTimes(1) // constant-time compare still ran
    expect(mockGetAdminSession).toHaveBeenCalledTimes(1) // fell back to session
    expect(res!.status).toBe(401)
  })

  it('rejects a token differing by one character at the end', async () => {
    const almostKey = VALID_KEY.slice(0, -1) + (VALID_KEY.endsWith('a') ? 'b' : 'a')
    const res = await requireAdminAuth(makeRequest({ authorization: `Bearer ${almostKey}` }))
    expect(res!.status).toBe(401)
  })

  it('does NOT call timingSafeEqual when the header length differs', async () => {
    const spy = jest.spyOn(crypto, 'timingSafeEqual')
    const res = await requireAdminAuth(makeRequest({ authorization: 'Bearer short' }))
    expect(spy).not.toHaveBeenCalled()
    expect(res!.status).toBe(401)
  })

  it('rejects a lowercase "bearer" scheme (exact match required)', async () => {
    const res = await requireAdminAuth(makeRequest({ authorization: `bearer ${VALID_KEY}` }))
    expect(res!.status).toBe(401)
  })

  it('rejects a token with a trailing space', async () => {
    const res = await requireAdminAuth(makeRequest({ authorization: `Bearer ${VALID_KEY} ` }))
    expect(res!.status).toBe(401)
  })

  it('rejects the raw key without the Bearer prefix', async () => {
    const res = await requireAdminAuth(makeRequest({ authorization: VALID_KEY }))
    expect(res!.status).toBe(401)
  })

  it('treats an empty Authorization header as absent and uses the session path', async () => {
    setAdminSession(true)
    const res = await requireAdminAuth(makeRequest({ authorization: '' }))
    expect(mockGetAdminSession).toHaveBeenCalledTimes(1)
    expect(res).toBeNull()
  })
})

// ============================================================================
// Admin session cookie fallback
// ============================================================================

describe('admin session fallback', () => {
  it('returns null when the admin session is valid and no header is present', async () => {
    setAdminSession(true)
    const res = await requireAdminAuth(makeRequest())
    expect(res).toBeNull()
  })

  it('returns 401 when neither Bearer token nor session authorizes', async () => {
    setAdminSession(false)
    const res = await requireAdminAuth(makeRequest())
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
    const body = await res!.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when the session exists but isAdmin is not set', async () => {
    mockGetAdminSession.mockResolvedValue({})
    const res = await requireAdminAuth(makeRequest())
    expect(res!.status).toBe(401)
  })

  it('accepts a valid admin session even with a wrong Bearer header', async () => {
    setAdminSession(true)
    const res = await requireAdminAuth(makeRequest({ authorization: 'Bearer wrong' }))
    expect(res).toBeNull()
  })
})
