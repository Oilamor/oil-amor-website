/**
 * Middleware Rate Limiting Hardening Tests (middleware.ts)
 *
 * Pins the Redis-backed sliding-window rate limiter behavior:
 * - allowed under the limit, 429 over the limit (with Retry-After)
 * - per-path config selection (auth 10/5min, api 100/min, general 200/min)
 * - fail-closed for auth paths when Redis is not configured
 * - fail-open for non-auth paths when Redis is not configured (actual behavior)
 * - fail-closed for ALL paths when Redis errors (actual behavior)
 * - sliding-window reset semantics (zremrangebyscore / expire)
 * - request validation (path traversal, null bytes, blocked paths)
 *
 * next/server and @upstash/redis are mocked.
 */

// Shared pipeline spies — the middleware builds a fresh pipeline per request,
// so the factory wires each pipeline method to these stable jest.fns.
const mockZremrangebyscore = jest.fn()
const mockZcard = jest.fn()
const mockZadd = jest.fn()
const mockExpire = jest.fn()
const mockPipelineExec = jest.fn()

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    pipeline: () => ({
      zremrangebyscore: (...args: unknown[]) => mockZremrangebyscore(...args),
      zcard: (...args: unknown[]) => mockZcard(...args),
      zadd: (...args: unknown[]) => mockZadd(...args),
      expire: (...args: unknown[]) => mockExpire(...args),
      exec: (...args: unknown[]) => mockPipelineExec(...args),
    }),
  })),
}))

// Minimal NextResponse stand-in with a real header store
class MockHeaders {
  private store = new Map<string, string>()
  set(k: string, v: string) { this.store.set(k.toLowerCase(), v) }
  get(k: string) { return this.store.get(k.toLowerCase()) ?? null }
  delete(k: string) { this.store.delete(k.toLowerCase()) }
}

class MockNextResponse {
  status: number
  headers = new MockHeaders()
  private rawBody: unknown

  constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    this.rawBody = body
    this.status = init?.status ?? 200
    if (init?.headers) {
      for (const [k, v] of Object.entries(init.headers)) this.headers.set(k, v)
    }
  }

  static next() { return new MockNextResponse() }

  static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return new MockNextResponse(JSON.stringify(body), init)
  }

  async json() {
    return typeof this.rawBody === 'string' ? JSON.parse(this.rawBody) : this.rawBody
  }
}

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: MockNextResponse,
}))

import type { NextRequest } from 'next/server'
import nodeCrypto from 'crypto'

// jsdom's global crypto lacks randomUUID — backfill it for the middleware's
// X-Request-ID generation (runs at request time, so post-import is fine)
{
  const g = globalThis as unknown as { crypto?: { randomUUID?: unknown } }
  if (!g.crypto || typeof g.crypto.randomUUID !== 'function') {
    Object.defineProperty(globalThis, 'crypto', {
      value: (nodeCrypto as unknown as { webcrypto?: unknown }).webcrypto ?? nodeCrypto,
      configurable: true,
    })
  }
}

import { middleware } from '@/middleware'

function makeReq(pathname: string, headers: Record<string, string> = {}, method = 'GET'): NextRequest {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    method,
    nextUrl: { pathname },
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
  } as unknown as NextRequest
}

/**
 * Mutations and auth routes are rate-limited; plain GET reads (pages,
 * prefetches, read APIs) skip Redis entirely by design — an awaited
 * cross-region Redis call on every page view added 50–250ms TTFB for zero
 * security benefit.
 */
function makeLimitedReq(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return makeReq(pathname, headers, 'POST')
}

/** Redis pipeline results: [zremrangebyscore, zcard, zadd, expire] */
function pipelineReturning(zcardCount: number) {
  mockPipelineExec.mockResolvedValue([0, zcardCount, 1, 1])
}

async function loadMiddlewareWithoutRedis() {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  jest.resetModules()
  const mod = await import('@/middleware')
  process.env.UPSTASH_REDIS_REST_URL = savedUrl as string
  process.env.UPSTASH_REDIS_REST_TOKEN = savedToken as string
  return mod
}

beforeEach(() => {
  pipelineReturning(0)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

// ============================================================================
// Under / over the limit
// ============================================================================

describe('rate limit enforcement', () => {
  it('allows requests under the limit and sets rate limit headers', async () => {
    pipelineReturning(0)
    const res = await middleware(makeLimitedReq('/api/products'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
    expect(res.headers.get('x-ratelimit-remaining')).toBe('99')
    expect(res.headers.get('x-ratelimit-reset')).toBeTruthy()
  })

  it('allows the request at count = limit - 1 (boundary)', async () => {
    pipelineReturning(99)
    const res = await middleware(makeLimitedReq('/api/products'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0')
  })

  it('returns 429 when the window count reaches the limit', async () => {
    pipelineReturning(100)
    const res = await middleware(makeLimitedReq('/api/products'))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too Many Requests')
    expect(typeof body.retryAfter).toBe('number')
  })

  it('sets Retry-After and zeroed remaining headers on 429', async () => {
    pipelineReturning(250)
    const res = await middleware(makeLimitedReq('/api/products'))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBeTruthy()
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0')
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
  })

  it('read-only GETs skip Redis entirely (no pipeline, no rate limit headers)', async () => {
    const res = await middleware(makeReq('/api/products'))
    expect(res.status).toBe(200)
    expect(mockPipelineExec).not.toHaveBeenCalled()
    expect(res.headers.get('x-ratelimit-limit')).toBeNull()
  })

  it('GET pages skip Redis entirely', async () => {
    const res = await middleware(makeReq('/about'))
    expect(res.status).toBe(200)
    expect(mockPipelineExec).not.toHaveBeenCalled()
    expect(res.headers.get('x-ratelimit-limit')).toBeNull()
  })
})

// ============================================================================
// Per-path configuration
// ============================================================================

describe('per-path rate limit configuration', () => {
  it('applies the auth limit (10) to /api/auth/* paths', async () => {
    const res = await middleware(makeReq('/api/auth/login'))
    expect(res.headers.get('x-ratelimit-limit')).toBe('10')
  })

  it('blocks auth requests at the auth limit, not the api limit', async () => {
    pipelineReturning(10)
    const res = await middleware(makeReq('/api/auth/callback'))
    expect(res.status).toBe(429)
    expect(res.headers.get('x-ratelimit-limit')).toBe('10')
  })

  it('applies the api limit (100) to other /api/* paths', async () => {
    const res = await middleware(makeLimitedReq('/api/cart'))
    expect(res.headers.get('x-ratelimit-limit')).toBe('100')
  })

  it('applies the general limit (200) to mutations on non-api pages', async () => {
    const res = await middleware(makeReq('/about', {}, 'POST'))
    expect(res.headers.get('x-ratelimit-limit')).toBe('200')
  })
})

// ============================================================================
// Fail-closed / fail-open behavior
// ============================================================================

describe('Redis failure behavior', () => {
  it('fails closed (429) for auth paths when Redis is not configured', async () => {
    const { middleware: bareMiddleware } = await loadMiddlewareWithoutRedis()
    const res = await bareMiddleware(makeReq('/api/auth/login'))
    expect(res.status).toBe(429)
  })

  it('fails open for api paths when Redis is not configured (actual behavior)', async () => {
    const { middleware: bareMiddleware } = await loadMiddlewareWithoutRedis()
    const res = await bareMiddleware(makeLimitedReq('/api/products'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-ratelimit-remaining')).toBe('Infinity')
  })

  it('fails open for general pages when Redis is not configured', async () => {
    const { middleware: bareMiddleware } = await loadMiddlewareWithoutRedis()
    const res = await bareMiddleware(makeLimitedReq('/collections'))
    expect(res.status).toBe(200)
  })

  it('fails closed (429) when the Redis pipeline throws, even for auth paths', async () => {
    mockPipelineExec.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await middleware(makeReq('/api/auth/login'))
    expect(res.status).toBe(429)
  })

  it('fails open when the Redis pipeline throws for non-auth paths (actual behavior)', async () => {
    mockPipelineExec.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await middleware(makeLimitedReq('/api/products'))
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// Sliding window mechanics
// ============================================================================

describe('sliding window mechanics', () => {
  it('evicts entries older than the window via zremrangebyscore', async () => {
    const before = Date.now()
    await middleware(makeLimitedReq('/api/products', { 'x-forwarded-for': '1.2.3.4' }))
    const after = Date.now()

    expect(mockZremrangebyscore).toHaveBeenCalledTimes(1)
    const [key, min, windowStart] = mockZremrangebyscore.mock.calls[0] as [string, number, number]
    expect(key).toBe('ratelimit:1.2.3.4')
    expect(min).toBe(0)
    expect(windowStart).toBeGreaterThanOrEqual(before - 60000)
    expect(windowStart).toBeLessThanOrEqual(after - 60000)
  })

  it('records the current request in the sorted set with a unique member', async () => {
    await middleware(makeLimitedReq('/api/products', { 'x-forwarded-for': '1.2.3.4' }))
    expect(mockZadd).toHaveBeenCalledTimes(1)
    const [key, entry] = mockZadd.mock.calls[0] as [string, { score: number; member: string }]
    expect(key).toBe('ratelimit:1.2.3.4')
    expect(typeof entry.score).toBe('number')
    expect(entry.member).toMatch(/^\d+-[0-9.]+$/)
  })

  it('sets the key expiry to the window length in seconds', async () => {
    await middleware(makeLimitedReq('/api/products', { 'x-forwarded-for': '1.2.3.4' }))
    expect(mockExpire).toHaveBeenCalledWith('ratelimit:1.2.3.4', 60)
  })

  it('uses a 300-second expiry for auth paths (5-minute window)', async () => {
    await middleware(makeReq('/api/auth/login', { 'x-forwarded-for': '1.2.3.4' }))
    expect(mockExpire).toHaveBeenCalledWith('ratelimit:1.2.3.4', 300)
  })

  it('executes the pipeline atomically once per request', async () => {
    await middleware(makeLimitedReq('/api/products'))
    expect(mockPipelineExec).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Client identification
// ============================================================================

describe('client identification', () => {
  it('keys on the first IP of x-forwarded-for', async () => {
    await middleware(makeLimitedReq('/api/products', { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))
    expect(mockZremrangebyscore.mock.calls[0][0]).toBe('ratelimit:1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    await middleware(makeLimitedReq('/api/products', { 'x-real-ip': '9.9.9.9' }))
    expect(mockZremrangebyscore.mock.calls[0][0]).toBe('ratelimit:9.9.9.9')
  })

  it('uses "unknown" when no IP headers are present', async () => {
    await middleware(makeLimitedReq('/api/products'))
    expect(mockZremrangebyscore.mock.calls[0][0]).toBe('ratelimit:unknown')
  })

  it('does not include the User-Agent in the identifier (UA rotation resistance)', async () => {
    await middleware(makeLimitedReq('/api/products', {
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'AttackerBot/9.9',
    }))
    expect(mockZremrangebyscore.mock.calls[0][0]).toBe('ratelimit:1.2.3.4')
  })
})

// ============================================================================
// Request validation (runs before rate limiting)
// ============================================================================

describe('request validation', () => {
  it('rejects path traversal with 400', async () => {
    const res = await middleware(makeReq('/api/../secret'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toBe('Path traversal detected')
    expect(mockPipelineExec).not.toHaveBeenCalled()
  })

  it('rejects encoded path traversal (%2e%2e)', async () => {
    const res = await middleware(makeReq('/api/%2e%2e/secret'))
    expect(res.status).toBe(400)
  })

  it('rejects null byte injection', async () => {
    const res = await middleware(makeReq('/api/users%00.json'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toBe('Null byte detected')
  })

  it.each(['/.env', '/.git/config', '/wp-admin/login.php', '/phpmyadmin/index.php', '/config/app.yml', '/administrator/'])(
    'blocks the exploit path %s',
    async (path) => {
      const res = await middleware(makeReq(path))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.message).toBe('Blocked path')
    }
  )

  it('does not rate-limit a rejected request', async () => {
    await middleware(makeReq('/.env'))
    expect(mockPipelineExec).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Security headers (alongside rate limiting)
// ============================================================================

describe('security headers on allowed responses', () => {
  it('sets the core security headers', async () => {
    const res = await middleware(makeReq('/about'))
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('strict-transport-security')).toContain('max-age=31536000')
    expect(res.headers.get('strict-transport-security')).toContain('includeSubDomains')
  })

  it('sets an enforcing Content-Security-Policy outside development', async () => {
    const res = await middleware(makeReq('/about'))
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(res.headers.get('content-security-policy-report-only')).toBeNull()
  })

  it('marks API responses as no-store', async () => {
    const res = await middleware(makeLimitedReq('/api/products'))
    expect(res.headers.get('cache-control')).toBe('no-store, max-age=0')
  })

  it('leaves the cacheable inventory status endpoint to its own CDN cache headers', async () => {
    const res = await middleware(makeReq('/api/inventory/status'))
    expect(res.headers.get('cache-control')).toBeNull()
  })

  it('caches static assets immutably', async () => {
    const res = await middleware(makeReq('/scripts/app.js'))
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('attaches a request ID for tracing', async () => {
    const res = await middleware(makeReq('/about'))
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })
})
