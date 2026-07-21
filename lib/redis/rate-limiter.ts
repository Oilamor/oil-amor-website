/**
 * Advanced Rate Limiting with Redis
 * Enterprise-grade rate limiting with multiple strategies
 */

import { redis, createRateLimitKey } from './client'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// RATE LIMIT STRATEGIES
// ============================================================================

export enum RateLimitStrategy {
  /** Fixed window: counts requests in fixed time buckets */
  FIXED_WINDOW = 'fixed_window',
  
  /** Sliding window: uses Redis sorted sets for precise sliding window */
  SLIDING_WINDOW = 'sliding_window',
  
  /** Token bucket: allows bursts up to a maximum */
  TOKEN_BUCKET = 'token_bucket',
  
  /** Leaky bucket: smooths out request rate */
  LEAKY_BUCKET = 'leaky_bucket',
}

// ============================================================================
// RATE LIMIT CONFIGURATION
// ============================================================================

/**
 * What to do when Redis is unavailable or errors.
 * - 'open' (default): allow the request — preserves availability for
 *   non-critical paths.
 * - 'closed': deny the request — for auth/payment paths, matching
 *   middleware.ts which fails closed on Redis errors (2026-07-21 fix:
 *   previously every strategy in this module failed open, disagreeing
 *   with the middleware's fail-closed stance for those paths).
 */
export type RateLimitFailMode = 'open' | 'closed'

export interface RateLimitConfig {
  strategy: RateLimitStrategy
  maxRequests: number
  windowMs: number
  keyPrefix?: string
  failMode?: RateLimitFailMode
}

/**
 * Result returned when Redis is unavailable or errors. Honors
 * config.failMode (2026-07-21) — 'open' allows, 'closed' denies.
 */
function failureResult(config: RateLimitConfig, resetTime: number): RateLimitResult {
  const failClosed = config.failMode === 'closed'
  return {
    allowed: !failClosed,
    limit: config.maxRequests,
    remaining: failClosed ? 0 : config.maxRequests,
    resetTime,
    retryAfter: failClosed ? Math.ceil(config.windowMs / 1000) : undefined,
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RATE_LIMITS = {
  // API endpoints
  api: {
    general: {
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
    auth: {
      strategy: RateLimitStrategy.FIXED_WINDOW,
      maxRequests: 5,
      windowMs: 60000, // 1 minute
    },
    checkout: {
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      maxRequests: 10,
      windowMs: 60000, // 1 minute
    },
  },
  
  // User actions
  user: {
    login: {
      strategy: RateLimitStrategy.FIXED_WINDOW,
      maxRequests: 5,
      windowMs: 300000, // 5 minutes
    },
    passwordReset: {
      strategy: RateLimitStrategy.FIXED_WINDOW,
      maxRequests: 3,
      windowMs: 3600000, // 1 hour
    },
    registration: {
      strategy: RateLimitStrategy.FIXED_WINDOW,
      maxRequests: 3,
      windowMs: 3600000, // 1 hour
    },
  },
  
  // Cart operations
  cart: {
    addItem: {
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      maxRequests: 50,
      windowMs: 60000, // 1 minute
    },
    update: {
      strategy: RateLimitStrategy.SLIDING_WINDOW,
      maxRequests: 30,
      windowMs: 60000, // 1 minute
    },
  },
} as const

// ============================================================================
// FIXED WINDOW RATE LIMITER
// ============================================================================

async function fixedWindowLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = createRateLimitKey(identifier, config.keyPrefix || 'fixed')
  const now = Date.now()
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs
  const windowKey = `${key}:${windowStart}`
  
  try {
    const pipeline = redis.pipeline()
    if (!pipeline) {
      return failureResult(config, now + config.windowMs)
    }
    
    // Increment counter
    ;(pipeline as any).incr(windowKey)
    // Set expiry if new key
    ;(pipeline as any).expire(windowKey, Math.ceil(config.windowMs / 1000))
    
    const results = await pipeline.exec()
    const count = (results?.[0] as number) || 0
    
    const allowed = count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - count)
    const resetTime = windowStart + config.windowMs
    
    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
    }
  } catch (error) {
    logger.error('Fixed window rate limit error', error as Error, { identifier, config })
    // Fail per config.failMode (default 'open') — 2026-07-21
    return failureResult(config, now + config.windowMs)
  }
}

// ============================================================================
// SLIDING WINDOW RATE LIMITER
// ============================================================================

async function slidingWindowLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = createRateLimitKey(identifier, config.keyPrefix || 'sliding')
  const now = Date.now()
  const windowStart = now - config.windowMs
  
  try {
    const client = redis.getClient()
    if (!client) {
      return failureResult(config, now + config.windowMs)
    }
    
    // Use Redis sorted set for sliding window
    const pipeline = client.pipeline()
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current entries
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    
    // Set expiry on the key
    pipeline.expire(key, Math.ceil(config.windowMs / 1000))
    
    const results = await pipeline.exec()
    const count = (results?.[1] as number) || 0
    
    const allowed = count < config.maxRequests
    const remaining = Math.max(0, config.maxRequests - count)
    const resetTime = now + config.windowMs
    
    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil(config.windowMs / 1000),
    }
  } catch (error) {
    logger.error('Sliding window rate limit error', error as Error, { identifier, config })
    return failureResult(config, now + config.windowMs)
  }
}

// ============================================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================================

async function tokenBucketLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = createRateLimitKey(identifier, config.keyPrefix || 'token')
  const tokensKey = `${key}:tokens`
  const lastRefillKey = `${key}:last_refill`
  
  try {
    const now = Date.now()
    
    // Get current state
    const [tokensStr, lastRefillStr] = await Promise.all([
      redis.hget<string>(key, 'tokens'),
      redis.hget<string>(key, 'last_refill'),
    ])
    
    let tokens = parseFloat(tokensStr || '0')
    let lastRefill = parseInt(lastRefillStr || '0')
    
    // Initialize if new
    if (!lastRefill) {
      tokens = config.maxRequests
      lastRefill = now
    }
    
    // Calculate tokens to add based on time passed
    const timePassed = now - lastRefill
    const refillRate = config.maxRequests / config.windowMs // tokens per ms
    const tokensToAdd = timePassed * refillRate
    
    tokens = Math.min(config.maxRequests, tokens + tokensToAdd)
    
    // Check if request can be allowed
    if (tokens >= 1) {
      tokens -= 1
      
      // Update state
      await redis.hset(key, 'tokens', tokens.toString())
      await redis.hset(key, 'last_refill', now.toString())
      await redis.expire(key, Math.ceil(config.windowMs / 1000))
      
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.floor(tokens),
        resetTime: now + config.windowMs,
      }
    }
    
    // Request denied
    const retryAfter = Math.ceil((1 - tokens) / refillRate / 1000)
    
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: now + config.windowMs,
      retryAfter,
    }
  } catch (error) {
    logger.error('Token bucket rate limit error', error as Error, { identifier, config })
    return failureResult(config, Date.now() + config.windowMs)
  }
}

// ============================================================================
// MAIN RATE LIMITER FUNCTION
// ============================================================================

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  switch (config.strategy) {
    case RateLimitStrategy.FIXED_WINDOW:
      return fixedWindowLimit(identifier, config)
    case RateLimitStrategy.SLIDING_WINDOW:
      return slidingWindowLimit(identifier, config)
    case RateLimitStrategy.TOKEN_BUCKET:
      return tokenBucketLimit(identifier, config)
    default:
      // Default to sliding window
      return slidingWindowLimit(identifier, config)
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function checkApiRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMITS.api = 'general',
  // 2026-07-21: callers guarding auth/payment surfaces pass 'closed' so a
  // Redis outage denies rather than opens the gate (see RateLimitFailMode).
  failMode: RateLimitFailMode = 'open'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS.api[type]
  return checkRateLimit(identifier, { ...config, keyPrefix: `api:${type}`, failMode })
}

export async function checkUserRateLimit(
  identifier: string,
  action: keyof typeof RATE_LIMITS.user,
  failMode: RateLimitFailMode = 'open'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS.user[action]
  return checkRateLimit(identifier, { ...config, keyPrefix: `user:${action}`, failMode })
}

export async function checkCartRateLimit(
  identifier: string,
  action: keyof typeof RATE_LIMITS.cart,
  failMode: RateLimitFailMode = 'open'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS.cart[action]
  return checkRateLimit(identifier, { ...config, keyPrefix: `cart:${action}`, failMode })
}

// ============================================================================
// RATE LIMIT HEADERS
// ============================================================================

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime / 1000).toString(),
  }
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }
  
  return headers
}

// ============================================================================
// RATE LIMIT RESET
// ============================================================================

export async function resetRateLimit(
  identifier: string,
  keyPrefix?: string
): Promise<boolean> {
  const pattern = keyPrefix 
    ? `oilamor:ratelimit:${keyPrefix}*${identifier}*`
    : `oilamor:ratelimit:*${identifier}*`
  
  try {
    const keys = await redis.keys(pattern)
    
    for (const key of keys) {
      await redis.del(key)
    }
    
    logger.info('Rate limit reset', { identifier, keysDeleted: keys.length })
    return true
  } catch (error) {
    logger.error('Rate limit reset error', error as Error, { identifier })
    return false
  }
}
