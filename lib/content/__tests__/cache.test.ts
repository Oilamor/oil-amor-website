// ========================================
// Cache Utilities Tests
// ========================================

import {
  generateCacheKey,
  getFromCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  warmCache,
  revalidateCache,
  __resetRedisClient,
} from '../cache'

// Create mock Redis instance (Upstash REST client surface)
const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn().mockResolvedValue([]),
})

let mockRedis: ReturnType<typeof createMockRedis>

// Mock @upstash/redis (the single Redis client)
jest.mock('@upstash/redis', () => {
  return {
    __esModule: true,
    Redis: jest.fn().mockImplementation(() => mockRedis),
  }
})

describe('Cache Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetRedisClient()
    mockRedis = createMockRedis()
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  })

  describe('generateCacheKey', () => {
    it('should generate key with prefix', () => {
      const key = generateCacheKey('test', 'param1', 'param2')
      expect(key).toBe('oil-amor:test:param1:param2')
    })

    it('should sanitize colons in params', () => {
      const key = generateCacheKey('test', 'a:b', 'c:d')
      expect(key).toBe('oil-amor:test:a-b:c-d')
    })
  })

  describe('getFromCache', () => {
    it('should return deserialized data when cache hit', async () => {
      // @upstash/redis auto-deserializes JSON — a hit comes back parsed.
      const mockData = { test: 'value' }
      mockRedis.get.mockResolvedValue(mockData)

      const result = await getFromCache('test-key')
      expect(result).toEqual(mockData)
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
    })

    it('should return null when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await getFromCache('test-key')
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))

      const result = await getFromCache('test-key')
      expect(result).toBeNull()
    })
  })

  describe('setCache', () => {
    it('should set cache with TTL', async () => {
      const data = { test: 'value' }
      await setCache('test-key', data, 3600)

      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        data,
        { ex: 3600 }
      )
    })

    it('should handle errors gracefully', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis error'))

      await expect(setCache('test-key', {})).resolves.not.toThrow()
    })
  })

  describe('deleteCache', () => {
    it('should delete cache key', async () => {
      await deleteCache('test-key')
      expect(mockRedis.del).toHaveBeenCalledWith('test-key')
    })
  })

  describe('deleteCachePattern', () => {
    it('should delete keys matching pattern', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2'])

      await deleteCachePattern('pattern:*')
      expect(mockRedis.keys).toHaveBeenCalledWith('pattern:*')
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2')
    })

    it('should handle empty key list', async () => {
      mockRedis.keys.mockResolvedValue([])

      await deleteCachePattern('pattern:*')
      expect(mockRedis.del).not.toHaveBeenCalled()
    })
  })

  describe('warmCache', () => {
    it('should return cached data if available', async () => {
      const mockData = { cached: true }
      mockRedis.get.mockResolvedValue(mockData)

      const fetcher = jest.fn()
      const result = await warmCache('test-key', fetcher)

      expect(result).toEqual(mockData)
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('should fetch and cache if no cached data', async () => {
      mockRedis.get.mockResolvedValue(null)
      const freshData = { fresh: true }
      const fetcher = jest.fn().mockResolvedValue(freshData)

      const result = await warmCache('test-key', fetcher)

      expect(result).toEqual(freshData)
      expect(fetcher).toHaveBeenCalled()
      expect(mockRedis.set).toHaveBeenCalled()
    })

    it('should fallback to fetcher on cache error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))
      const freshData = { fresh: true }
      const fetcher = jest.fn().mockResolvedValue(freshData)

      const result = await warmCache('test-key', fetcher)

      expect(result).toEqual(freshData)
    })
  })

  describe('revalidateCache', () => {
    it('should force revalidation when force=true', async () => {
      const mockData = { fresh: true }
      const fetcher = jest.fn().mockResolvedValue(mockData)

      const result = await revalidateCache('test-key', fetcher, 3600, true)

      expect(fetcher).toHaveBeenCalled()
      expect(mockRedis.set).toHaveBeenCalled()
      expect(result).toEqual(mockData)
    })

    it('should use cache when force=false and cache exists', async () => {
      const mockData = { cached: true }
      mockRedis.get.mockResolvedValue(mockData)
      const fetcher = jest.fn()

      const result = await revalidateCache('test-key', fetcher, 3600, false)

      expect(fetcher).not.toHaveBeenCalled()
      expect(result).toEqual(mockData)
    })
  })
})
