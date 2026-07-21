/**
 * Hardening: Redis rate limiter fail modes (lib/redis/rate-limiter.ts)
 *
 * Pins the 2026-07-21 failMode contract:
 * - default 'open' preserves the previous behavior for non-auth callers
 *   (every strategy used to fail open unconditionally).
 * - 'closed' denies when Redis errors or is unavailable — for auth/payment
 *   paths, aligning this module with middleware.ts which fails closed on
 *   Redis errors for all paths.
 */

jest.mock('@/lib/redis/client', () => ({
  redis: {
    pipeline: jest.fn(),
    getClient: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  },
  createRateLimitKey: (identifier: string, prefix: string) =>
    `oilamor:ratelimit:${prefix}:${identifier}`,
}))

jest.mock('@/lib/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

import { redis } from '@/lib/redis/client'
import {
  checkRateLimit,
  checkApiRateLimit,
  checkUserRateLimit,
  RateLimitStrategy,
  type RateLimitConfig,
} from '@/lib/redis/rate-limiter'

const mockRedis = redis as unknown as {
  pipeline: jest.Mock
  getClient: jest.Mock
  hget: jest.Mock
}

const FIXED: RateLimitConfig = {
  strategy: RateLimitStrategy.FIXED_WINDOW,
  maxRequests: 5,
  windowMs: 60000,
}

const SLIDING: RateLimitConfig = {
  strategy: RateLimitStrategy.SLIDING_WINDOW,
  maxRequests: 5,
  windowMs: 60000,
}

const TOKEN: RateLimitConfig = {
  strategy: RateLimitStrategy.TOKEN_BUCKET,
  maxRequests: 5,
  windowMs: 60000,
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================================================
// Happy path (behavior unchanged)
// ============================================================================

describe('enforcement when Redis works', () => {
  it('fixed window allows under the limit and counts down remaining', async () => {
    const exec = jest.fn().mockResolvedValue([3])
    mockRedis.pipeline.mockReturnValue({ incr: jest.fn(), expire: jest.fn(), exec })
    const result = await checkRateLimit('user-1', FIXED)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('fixed window denies over the limit with retryAfter', async () => {
    const exec = jest.fn().mockResolvedValue([6])
    mockRedis.pipeline.mockReturnValue({ incr: jest.fn(), expire: jest.fn(), exec })
    const result = await checkRateLimit('user-1', FIXED)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})

// ============================================================================
// Fail open (default — preserved behavior)
// ============================================================================

describe('fail open (default)', () => {
  it('fixed window allows when the pipeline throws', async () => {
    mockRedis.pipeline.mockImplementation(() => {
      throw new Error('ECONNREFUSED')
    })
    const result = await checkRateLimit('user-1', FIXED)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(FIXED.maxRequests)
  })

  it('fixed window allows when no pipeline is available', async () => {
    mockRedis.pipeline.mockReturnValue(null)
    const result = await checkRateLimit('user-1', FIXED)
    expect(result.allowed).toBe(true)
  })

  it('sliding window allows when no client is available', async () => {
    mockRedis.getClient.mockReturnValue(null)
    const result = await checkRateLimit('user-1', SLIDING)
    expect(result.allowed).toBe(true)
  })

  it('token bucket allows when Redis reads fail', async () => {
    mockRedis.hget.mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await checkRateLimit('user-1', TOKEN)
    expect(result.allowed).toBe(true)
  })
})

// ============================================================================
// Fail closed (2026-07-21 — for auth/payment callers)
// ============================================================================

describe('fail closed', () => {
  it('fixed window denies when the pipeline throws', async () => {
    mockRedis.pipeline.mockImplementation(() => {
      throw new Error('ECONNREFUSED')
    })
    const result = await checkRateLimit('user-1', { ...FIXED, failMode: 'closed' })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('fixed window denies when no pipeline is available', async () => {
    mockRedis.pipeline.mockReturnValue(null)
    const result = await checkRateLimit('user-1', { ...FIXED, failMode: 'closed' })
    expect(result.allowed).toBe(false)
  })

  it('sliding window denies when no client is available', async () => {
    mockRedis.getClient.mockReturnValue(null)
    const result = await checkRateLimit('user-1', { ...SLIDING, failMode: 'closed' })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('sliding window denies when the pipeline rejects', async () => {
    mockRedis.getClient.mockReturnValue({
      pipeline: () => ({
        zremrangebyscore: jest.fn(),
        zcard: jest.fn(),
        zadd: jest.fn(),
        expire: jest.fn(),
        exec: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      }),
    })
    const result = await checkRateLimit('user-1', { ...SLIDING, failMode: 'closed' })
    expect(result.allowed).toBe(false)
  })

  it('token bucket denies when Redis reads fail', async () => {
    mockRedis.hget.mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await checkRateLimit('user-1', { ...TOKEN, failMode: 'closed' })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

// ============================================================================
// Convenience wrappers pass failMode through (2026-07-21)
// ============================================================================

describe('convenience wrappers', () => {
  it('checkApiRateLimit stays fail-open by default', async () => {
    mockRedis.pipeline.mockReturnValue(null)
    const result = await checkApiRateLimit('1.2.3.4', 'general')
    expect(result.allowed).toBe(true)
  })

  it('checkApiRateLimit(..., "closed") denies on Redis failure', async () => {
    mockRedis.pipeline.mockReturnValue(null)
    const result = await checkApiRateLimit('1.2.3.4', 'auth', 'closed')
    expect(result.allowed).toBe(false)
  })

  it('checkUserRateLimit(..., "closed") denies on Redis failure', async () => {
    mockRedis.pipeline.mockImplementation(() => {
      throw new Error('ECONNREFUSED')
    })
    const result = await checkUserRateLimit('user-9', 'login', 'closed')
    expect(result.allowed).toBe(false)
  })
})
