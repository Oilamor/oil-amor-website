/**
 * Health Check API Hardening Tests (app/api/health/route.ts)
 *
 * - Anonymous callers get the basic payload only: no dependency internals,
 *   no memory, no uptime — even on failure (no internals leak with the 503)
 * - ?detailed=true is gated behind requireAdminAuth
 * - Any unhealthy dependency flips the status code to 503
 * - HEAD/OPTIONS probes
 *
 * next/server, admin auth, DB pool, Redis and fetch (Sanity) are mocked.
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

const mockRequireAdminAuth = jest.fn()
jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}))

const dbControl = { fail: false }
jest.mock('@/lib/db', () => ({
  // Plain functions so resetMocks-style config cannot wipe them — the health
  // route dynamically imports the pool at request time
  pool: {
    connect: () => dbControl.fail
      ? Promise.reject(new Error('connection refused'))
      : Promise.resolve({ query: () => Promise.resolve({ rows: [] }), release: () => {} }),
  },
}))

const redisControl = { fail: false }
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    ping: () => redisControl.fail ? Promise.reject(new Error('redis down')) : Promise.resolve('PONG'),
  })),
}))

import { GET, HEAD, OPTIONS } from '@/app/api/health/route'

const realFetch = global.fetch
const sanityControl = { fail: false }

function makeReq(url: string): NextRequest {
  return { url } as unknown as NextRequest
}

beforeAll(() => {
  global.fetch = (() => sanityControl.fail
    ? Promise.reject(new Error('sanity unreachable'))
    : Promise.resolve({ ok: true })) as unknown as typeof fetch
})

afterAll(() => {
  global.fetch = realFetch
})

beforeEach(() => {
  dbControl.fail = false
  redisControl.fail = false
  sanityControl.fail = false
  mockRequireAdminAuth.mockResolvedValue({ status: 401 }) // not admin by default
})

// ============================================================================
// Basic payload (anonymous)
// ============================================================================

describe('GET /api/health — basic anonymous payload', () => {
  it('returns 200 with the aggregate status and public metadata', async () => {
    const res = await GET(makeReq('http://localhost/api/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('healthy')
    expect(typeof body.timestamp).toBe('string')
    expect(body.version).toBeTruthy()
    expect(body.environment).toBeTruthy()
  })

  it('exposes no dependency internals to anonymous callers', async () => {
    const res = await GET(makeReq('http://localhost/api/health'))
    const body = await res.json()
    expect(body.checks).toBeUndefined()
    expect(body.memory).toBeUndefined()
    expect(body.uptime).toBeUndefined()
  })

  it('sets no-store cache headers and a response time header', async () => {
    const res = await GET(makeReq('http://localhost/api/health'))
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate')
    expect(res.headers.get('x-response-time')).toMatch(/^\d+ms$/)
  })

  it('ignores detailed=true without admin auth', async () => {
    const res = await GET(makeReq('http://localhost/api/health?detailed=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checks).toBeUndefined()
    expect(body.memory).toBeUndefined()
    expect(body.uptime).toBeUndefined()
  })

  it('only consults admin auth when detailed=true is requested', async () => {
    await GET(makeReq('http://localhost/api/health'))
    expect(mockRequireAdminAuth).not.toHaveBeenCalled()
    await GET(makeReq('http://localhost/api/health?detailed=true'))
    expect(mockRequireAdminAuth).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Detailed payload (admin only)
// ============================================================================

describe('GET /api/health?detailed=true — admin', () => {
  beforeEach(() => {
    mockRequireAdminAuth.mockResolvedValue(null) // null = authorized admin
  })

  it('returns dependency checks for redis, database and sanity', async () => {
    const res = await GET(makeReq('http://localhost/api/health?detailed=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.checks)).toBe(true)
    expect(body.checks.map((c: { name: string }) => c.name).sort()).toEqual(['database', 'redis', 'sanity'])
  })

  it('includes status, responseTime and lastChecked per dependency', async () => {
    const res = await GET(makeReq('http://localhost/api/health?detailed=true'))
    const body = await res.json()
    for (const check of body.checks) {
      expect(check.status).toBe('healthy')
      expect(typeof check.responseTime).toBe('number')
      expect(typeof check.lastChecked).toBe('string')
    }
  })

  it('includes memory usage and uptime', async () => {
    const res = await GET(makeReq('http://localhost/api/health?detailed=true'))
    const body = await res.json()
    expect(typeof body.uptime).toBe('number')
    expect(typeof body.memory.used).toBe('number')
    expect(typeof body.memory.total).toBe('number')
    expect(typeof body.memory.percentage).toBe('number')
  })
})

// ============================================================================
// Dependency failures
// ============================================================================

describe('GET /api/health — dependency failures', () => {
  it('returns 503 when the database is down, without leaking internals to anonymous callers', async () => {
    dbControl.fail = true
    const res = await GET(makeReq('http://localhost/api/health'))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('unhealthy')
    expect(body.checks).toBeUndefined()
    expect(body.memory).toBeUndefined()
    expect(body.uptime).toBeUndefined()
  })

  it('shows the failing dependency detail to admins', async () => {
    mockRequireAdminAuth.mockResolvedValue(null)
    dbControl.fail = true
    const res = await GET(makeReq('http://localhost/api/health?detailed=true'))
    expect(res.status).toBe(503)
    const body = await res.json()
    const dbCheck = body.checks.find((c: { name: string }) => c.name === 'database')
    expect(dbCheck.status).toBe('unhealthy')
    expect(dbCheck.message).toBe('connection refused')
  })

  it('returns 503 when Redis is down', async () => {
    redisControl.fail = true
    const res = await GET(makeReq('http://localhost/api/health'))
    expect(res.status).toBe(503)
  })

  it('returns 503 when Sanity is unreachable', async () => {
    sanityControl.fail = true
    const res = await GET(makeReq('http://localhost/api/health'))
    expect(res.status).toBe(503)
  })
})

// ============================================================================
// Probes
// ============================================================================

describe('health probes', () => {
  it('HEAD returns 200 with no-store cache header', async () => {
    const res = await HEAD()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('OPTIONS returns 200 when Redis is healthy', async () => {
    const res = await OPTIONS()
    expect(res.status).toBe(200)
  })

  it('OPTIONS returns 503 when Redis is down', async () => {
    redisControl.fail = true
    const res = await OPTIONS()
    expect(res.status).toBe(503)
  })
})
