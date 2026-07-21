/**
 * Request Validation Schema Hardening Tests
 *
 * Boundary values, unknown-field stripping and error-shape contracts for the
 * zod request-validation schemas used by API routes:
 * - app/api/log/route.ts           (client log ingestion)
 * - app/api/security/log/route.ts  (security event ingestion)
 * - app/api/cart/merge/route.ts    (guest → user cart merge)
 *
 * next/server and service dependencies are mocked.
 */

import type { NextRequest } from 'next/server'

jest.mock('next/server', () => {
  class MockHeaders {
    private store = new Map<string, string>()
    constructor(init?: Record<string, string>) {
      if (init) for (const [k, v] of Object.entries(init)) this.set(k, v)
    }
    set(k: string, v: string) { this.store.set(k.toLowerCase(), v) }
    get(k: string) { return this.store.get(k.toLowerCase()) ?? null }
  }

  class MockNextResponse {
    status: number
    headers: MockHeaders
    private rawBody: unknown
    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.rawBody = body
      this.status = init?.status ?? 200
      this.headers = new MockHeaders(init?.headers)
    }
    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const res = new MockNextResponse(undefined, init)
      res.rawBody = body
      return res
    }
    async json() { return this.rawBody }
  }

  return { NextRequest: jest.fn(), NextResponse: MockNextResponse }
})

// ---------------------------------------------------------------------------
// Cart merge dependencies
// ---------------------------------------------------------------------------

const mockMergeCarts = jest.fn()
jest.mock('@/lib/cart/cart-manager', () => ({
  CartManager: jest.fn().mockImplementation(() => ({
    mergeCarts: (...args: unknown[]) => mockMergeCarts(...args),
  })),
}))

const mockCheckApiRateLimit = jest.fn()
jest.mock('@/lib/redis/rate-limiter', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
  createRateLimitHeaders: jest.fn(() => ({})),
}))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

import { POST as logPOST } from '@/app/api/log/route'
import { POST as securityLogPOST, GET as securityLogGET } from '@/app/api/security/log/route'
import { POST as mergePOST } from '@/app/api/cart/merge/route'

// Unique IP per test — the log routes use module-level in-memory rate limiters
let ipCounter = 0
function uniqueIp(): string {
  ipCounter += 1
  return `10.9.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`
}

function makeReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const map = new Map(Object.entries({ 'x-forwarded-for': uniqueIp(), ...headers }).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as unknown as NextRequest
}

const VALID_LOG = {
  level: 'info',
  message: 'something happened',
  timestamp: new Date().toISOString(),
  service: 'web',
  environment: 'test',
  version: '1.0.0',
}

const VALID_SECURITY_EVENT = {
  type: 'suspicious',
  severity: 'high',
  message: 'Repeated failed login attempts',
}

beforeEach(() => {
  mockCheckApiRateLimit.mockResolvedValue({ allowed: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 })
  mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'cust-9' })
  mockMergeCarts.mockResolvedValue({ id: 'cart_cust-9_abc', items: [] })
})

// ============================================================================
// POST /api/log — client log ingestion schema
// ============================================================================

describe('POST /api/log schema', () => {
  it('accepts a single valid log entry', async () => {
    const res = await logPOST(makeReq({ logs: [VALID_LOG] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(1)
  })

  it('rejects an empty logs array (min 1)', async () => {
    const res = await logPOST(makeReq({ logs: [] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid log format')
  })

  it('accepts exactly 50 log entries (upper boundary)', async () => {
    const res = await logPOST(makeReq({ logs: Array(50).fill(VALID_LOG) }))
    expect(res.status).toBe(200)
    expect((await res.json()).count).toBe(50)
  })

  it('rejects 51 log entries (above upper boundary)', async () => {
    const res = await logPOST(makeReq({ logs: Array(51).fill(VALID_LOG) }))
    expect(res.status).toBe(400)
  })

  it.each(['debug', 'info', 'warn', 'error', 'fatal'])('accepts the level "%s"', async (level) => {
    const res = await logPOST(makeReq({ logs: [{ ...VALID_LOG, level }] }))
    expect(res.status).toBe(200)
  })

  it('rejects an unknown level', async () => {
    const res = await logPOST(makeReq({ logs: [{ ...VALID_LOG, level: 'verbose' }] }))
    expect(res.status).toBe(400)
  })

  it('rejects a missing message', async () => {
    const { message: _omit, ...noMessage } = VALID_LOG
    const res = await logPOST(makeReq({ logs: [noMessage] }))
    expect(res.status).toBe(400)
  })

  it('rejects a non-ISO timestamp', async () => {
    const res = await logPOST(makeReq({ logs: [{ ...VALID_LOG, timestamp: 'yesterday' }] }))
    expect(res.status).toBe(400)
  })

  it('accepts optional context/error/requestId/duration fields', async () => {
    const res = await logPOST(makeReq({
      logs: [{
        ...VALID_LOG,
        level: 'error',
        context: { page: '/checkout' },
        error: { name: 'TypeError', message: 'boom', stack: 'at x' },
        requestId: 'req-1',
        userId: 'cust-1',
        duration: 123,
      }],
    }))
    expect(res.status).toBe(200)
  })

  it('strips unknown fields instead of rejecting (zod default)', async () => {
    const res = await logPOST(makeReq({ logs: [{ ...VALID_LOG, password: 'hunter2' }] }))
    expect(res.status).toBe(200)
  })

  it('returns zod issue details with the 400', async () => {
    const res = await logPOST(makeReq({ logs: [{ level: 'nope' }] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(Array.isArray(body.details)).toBe(true)
    expect(body.details.length).toBeGreaterThan(0)
    expect(body.details[0]).toHaveProperty('message')
  })
})

// ============================================================================
// POST /api/security/log — security event schema
// ============================================================================

describe('POST /api/security/log schema', () => {
  it('accepts a valid security event', async () => {
    const res = await securityLogPOST(makeReq(VALID_SECURITY_EVENT))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it.each(['auth', 'access', 'error', 'suspicious'])('accepts the type "%s"', async (type) => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, type }))
    expect(res.status).toBe(200)
  })

  it('rejects an unknown event type', async () => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, type: 'hack' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid event format')
  })

  it.each(['low', 'medium', 'high', 'critical'])('accepts the severity "%s"', async (severity) => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, severity }))
    expect(res.status).toBe(200)
  })

  it('rejects an unknown severity', async () => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, severity: 'catastrophic' }))
    expect(res.status).toBe(400)
  })

  it('rejects an empty message', async () => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, message: '' }))
    expect(res.status).toBe(400)
  })

  it('accepts a 500-character message but rejects 501 (boundary)', async () => {
    expect((await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, message: 'm'.repeat(500) }))).status).toBe(200)
    expect((await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, message: 'm'.repeat(501) }))).status).toBe(400)
  })

  it('accepts an optional ISO timestamp and metadata', async () => {
    const res = await securityLogPOST(makeReq({
      ...VALID_SECURITY_EVENT,
      timestamp: new Date().toISOString(),
      metadata: { attempts: 5 },
    }))
    expect(res.status).toBe(200)
  })

  it('rejects a malformed timestamp when one is provided', async () => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, timestamp: 'not-a-date' }))
    expect(res.status).toBe(400)
  })

  it('strips unknown fields instead of rejecting (zod default)', async () => {
    const res = await securityLogPOST(makeReq({ ...VALID_SECURITY_EVENT, exploit: 'payload' }))
    expect(res.status).toBe(200)
  })

  it('GET returns 405 (only POST is allowed)', async () => {
    const res = await securityLogGET()
    expect(res.status).toBe(405)
    expect((await res.json()).error).toBe('Method not allowed')
  })
})

// ============================================================================
// POST /api/cart/merge — cart id schema + ownership
// ============================================================================

describe('POST /api/cart/merge schema and ownership', () => {
  const validMerge = { guestCartId: 'cart_guest_xyz', userCartId: 'cart_cust-9_abc' }

  it('accepts valid cart ids and merges', async () => {
    const res = await mergePOST(makeReq(validMerge))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockMergeCarts).toHaveBeenCalledWith('cart_guest_xyz', 'cart_cust-9_abc')
  })

  it('rejects a guestCartId without the cart_ prefix', async () => {
    const res = await mergePOST(makeReq({ ...validMerge, guestCartId: 'guest_xyz' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid request')
    expect(mockMergeCarts).not.toHaveBeenCalled()
  })

  it('rejects a userCartId without the cart_ prefix', async () => {
    const res = await mergePOST(makeReq({ ...validMerge, userCartId: 'cust-9_abc' }))
    expect(res.status).toBe(400)
  })

  it('rejects when userCartId is missing entirely', async () => {
    const res = await mergePOST(makeReq({ guestCartId: 'cart_guest_xyz' }))
    expect(res.status).toBe(400)
  })

  it('returns zod issue details with the 400', async () => {
    const res = await mergePOST(makeReq({ guestCartId: 123 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(Array.isArray(body.details)).toBe(true)
  })

  it('requires authentication before merging', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: false })
    const res = await mergePOST(makeReq(validMerge))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Authentication required')
    expect(mockMergeCarts).not.toHaveBeenCalled()
  })

  it('returns 403 when the user cart does not belong to the session customer', async () => {
    const res = await mergePOST(makeReq({ ...validMerge, userCartId: 'cart_someone-else_abc' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toContain('do not belong to you')
    expect(mockMergeCarts).not.toHaveBeenCalled()
  })

  it('strips unknown fields and merges with only the two validated ids', async () => {
    const res = await mergePOST(makeReq({ ...validMerge, admin: true, customerId: 'impersonated' }))
    expect(res.status).toBe(200)
    expect(mockMergeCarts).toHaveBeenCalledWith('cart_guest_xyz', 'cart_cust-9_abc')
  })
})
