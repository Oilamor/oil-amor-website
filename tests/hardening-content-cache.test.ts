/**
 * Hardening: Redis cache utilities (lib/content/cache.ts)
 *
 * Focus: failure modes — missing config, Redis down, bad payloads.
 * Redis (Upstash REST) is fully mocked; no network access.
 */

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
}

jest.mock('@upstash/redis', () => ({
  __esModule: true,
  Redis: jest.fn(() => mockRedis),
}))

import {
  getRedisClient,
  getFromCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  warmCache,
  revalidateCache,
  generateCacheKey,
  __resetRedisClient,
} from '@/lib/content/cache'
import { logger } from '@/lib/logging/logger'

const UPSTASH_VARS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const

function setUpstashEnv(): void {
  process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
}

describe('cache: configuration', () => {
  let savedEnv: Record<string, string | undefined>

  beforeEach(() => {
    savedEnv = Object.fromEntries(UPSTASH_VARS.map(v => [v, process.env[v]]))
    __resetRedisClient()
  })

  afterEach(() => {
    for (const v of UPSTASH_VARS) {
      if (savedEnv[v] === undefined) delete process.env[v]
      else process.env[v] = savedEnv[v]
    }
    __resetRedisClient()
  })

  it('getRedisClient throws a clear error when the Upstash config is not set', () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    expect(() => getRedisClient()).toThrow(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are not set'
    )
  })

  it('getRedisClient constructs a single client (singleton) when configured', () => {
    setUpstashEnv()
    const { Redis } = jest.requireMock('@upstash/redis') as { Redis: jest.Mock }
    const first = getRedisClient()
    const second = getRedisClient()
    expect(first).toBe(second)
    expect(Redis).toHaveBeenCalledTimes(1)
    expect(Redis).toHaveBeenCalledWith({
      url: 'https://test.upstash.io',
      token: 'test-token',
    })
  })

  it('getFromCache returns null instead of throwing when Redis is unconfigured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(getFromCache('k')).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('cache: key generation', () => {
  it('namespaces keys with oil-amor prefix', () => {
    expect(generateCacheKey('synergy', 'lavender', 'amethyst')).toBe('oil-amor:synergy:lavender:amethyst')
  })

  it('sanitizes colons in params so keys stay parseable', () => {
    expect(generateCacheKey('blend', 'user:42', 'oil:lavender')).toBe('oil-amor:blend:user-42:oil-lavender')
  })

  it('handles numeric params', () => {
    expect(generateCacheKey('price', 30)).toBe('oil-amor:price:30')
  })
})

describe('cache: read/write failure handling', () => {
  beforeEach(() => {
    setUpstashEnv()
    __resetRedisClient()
  })

  afterEach(() => {
    __resetRedisClient()
  })

  it('getFromCache returns the deserialized payload on hit', async () => {
    // @upstash/redis auto-deserializes JSON — a hit comes back parsed.
    mockRedis.get.mockResolvedValue({ price: 16.95, tags: ['calm'] })
    await expect(getFromCache('k')).resolves.toEqual({ price: 16.95, tags: ['calm'] })
    expect(mockRedis.get).toHaveBeenCalledWith('k')
  })

  it('getFromCache returns null on cache miss', async () => {
    mockRedis.get.mockResolvedValue(null)
    await expect(getFromCache('k')).resolves.toBeNull()
  })

  it('getFromCache returns null and logs when Redis get rejects', async () => {
    mockRedis.get.mockRejectedValue(new Error('connection refused'))
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(getFromCache('k')).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith('Cache get error', expect.any(Error), { key: 'k' })
  })

  it('setCache writes the payload with a TTL', async () => {
    mockRedis.set.mockResolvedValue('OK')
    await setCache('k', { a: 1 }, 60)
    expect(mockRedis.set).toHaveBeenCalledWith('k', { a: 1 }, { ex: 60 })
  })

  it('setCache swallows and logs Redis failures (never throws)', async () => {
    mockRedis.set.mockRejectedValue(new Error('read-only replica'))
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(setCache('k', { a: 1 })).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('Cache set error', expect.any(Error), { key: 'k' })
  })

  it('deleteCache swallows and logs Redis failures', async () => {
    mockRedis.del.mockRejectedValue(new Error('boom'))
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(deleteCache('k')).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('Cache delete error', expect.any(Error), { key: 'k' })
  })

  it('deleteCachePattern deletes matching keys in one call', async () => {
    mockRedis.keys.mockResolvedValue(['oil-amor:cord:1', 'oil-amor:cord:2'])
    mockRedis.del.mockResolvedValue(2)
    await deleteCachePattern('oil-amor:cord:*')
    expect(mockRedis.del).toHaveBeenCalledWith('oil-amor:cord:1', 'oil-amor:cord:2')
  })

  it('deleteCachePattern skips del when no keys match', async () => {
    mockRedis.keys.mockResolvedValue([])
    await deleteCachePattern('oil-amor:nothing:*')
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('deleteCachePattern swallows and logs Redis failures', async () => {
    mockRedis.keys.mockRejectedValue(new Error('boom'))
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(deleteCachePattern('p:*')).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('Cache pattern delete error', expect.any(Error), { pattern: 'p:*' })
  })
})

describe('cache: warmCache / revalidateCache', () => {
  beforeEach(() => {
    setUpstashEnv()
    __resetRedisClient()
  })

  afterEach(() => {
    __resetRedisClient()
  })

  it('warmCache returns cached data without calling the fetcher', async () => {
    mockRedis.get.mockResolvedValue('cached-value')
    const fetcher = jest.fn().mockResolvedValue('fresh-value')
    await expect(warmCache('k', fetcher)).resolves.toBe('cached-value')
    expect(fetcher).not.toHaveBeenCalled()
    expect(mockRedis.set).not.toHaveBeenCalled()
  })

  it('warmCache fetches and stores on miss', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    const fetcher = jest.fn().mockResolvedValue('fresh-value')
    await expect(warmCache('k', fetcher, 120)).resolves.toBe('fresh-value')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(mockRedis.set).toHaveBeenCalledWith('k', 'fresh-value', { ex: 120 })
  })

  it('warmCache still serves fresh data when the cache backend is down', async () => {
    mockRedis.get.mockRejectedValue(new Error('down'))
    mockRedis.set.mockRejectedValue(new Error('down'))
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    const fetcher = jest.fn().mockResolvedValue('fresh-value')
    await expect(warmCache('k', fetcher)).resolves.toBe('fresh-value')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('warmCache retries the fetcher once when it rejects, then propagates', async () => {
    mockRedis.get.mockResolvedValue(null)
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce('second-attempt')
    // Current behavior: the catch block invokes fetcher() a second time.
    await expect(warmCache('k', fetcher)).resolves.toBe('second-attempt')
    expect(fetcher).toHaveBeenCalledTimes(2)

    const alwaysFailing = jest.fn().mockRejectedValue(new Error('permanent'))
    await expect(warmCache('k2', alwaysFailing)).rejects.toThrow('permanent')
  })

  it('revalidateCache with force bypasses the cache read', async () => {
    mockRedis.get.mockResolvedValue('stale')
    mockRedis.set.mockResolvedValue('OK')
    const fetcher = jest.fn().mockResolvedValue('fresh')
    await expect(revalidateCache('k', fetcher, 60, true)).resolves.toBe('fresh')
    expect(mockRedis.get).not.toHaveBeenCalled()
    expect(mockRedis.set).toHaveBeenCalledWith('k', 'fresh', { ex: 60 })
  })

  it('revalidateCache without force behaves like warmCache', async () => {
    mockRedis.get.mockResolvedValue('cached')
    const fetcher = jest.fn().mockResolvedValue('fresh')
    await expect(revalidateCache('k', fetcher)).resolves.toBe('cached')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
