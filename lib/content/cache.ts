// ========================================
// Redis Cache Utilities
// ========================================

import { Redis } from '@upstash/redis'
import { DEFAULT_CACHE_TTL } from './types'
import { logger } from '@/lib/logging/logger'

// Redis client singleton (Upstash REST — the single Redis client for the app)
let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are not set')
    }

    redisClient = new Redis({ url, token })
  }

  return redisClient
}

// Reset singleton for testing
export function __resetRedisClient(): void {
  redisClient = null
}

// Cache key generator
export function generateCacheKey(prefix: string, ...params: (string | number)[]): string {
  const sanitized = params.map(p => String(p).replace(/:/g, '-'))
  return `oil-amor:${prefix}:${sanitized.join(':')}`
}

// Generic cache get
// Note: @upstash/redis auto-deserializes JSON, so a hit comes back parsed.
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    const cached = await client.get<T>(key)

    if (cached !== null && cached !== undefined) {
      return cached
    }

    return null
  } catch (error) {
    logger.error('Cache get error', error instanceof Error ? error : new Error(String(error)), { key })
    return null
  }
}

// Generic cache set
// Note: @upstash/redis serializes non-string values with JSON.stringify, so
// the stored payload is identical to the previous ioredis setex(JSON.stringify).
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_CACHE_TTL.SYNERGY
): Promise<void> {
  try {
    const client = getRedisClient()
    await client.set(key, data as unknown as string, { ex: ttl })
  } catch (error) {
    logger.error('Cache set error', error instanceof Error ? error : new Error(String(error)), { key })
  }
}

// Cache delete
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.del(key)
  } catch (error) {
    logger.error('Cache delete error', error instanceof Error ? error : new Error(String(error)), { key })
  }
}

// Cache delete by pattern
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient()
    const keys = await client.keys(pattern)

    if (keys.length > 0) {
      await client.del(...keys)
    }
  } catch (error) {
    logger.error('Cache pattern delete error', error instanceof Error ? error : new Error(String(error)), { pattern })
  }
}

// Cache warming utility
export async function warmCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL.SYNERGY
): Promise<T> {
  try {
    // Try cache first
    const cached = await getFromCache<T>(key)

    if (cached) {
      return cached
    }

    // Fetch fresh data
    const data = await fetcher()

    // Store in cache
    await setCache(key, data, ttl)

    return data
  } catch (error) {
    logger.error('Cache warming error', error instanceof Error ? error : new Error(String(error)), { key })

    // Fallback to fetcher on error
    return fetcher()
  }
}

// Conditional cache revalidation
export async function revalidateCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL.SYNERGY,
  force: boolean = false
): Promise<T> {
  if (force) {
    const data = await fetcher()
    await setCache(key, data, ttl)
    return data
  }

  return warmCache(key, fetcher, ttl)
}
