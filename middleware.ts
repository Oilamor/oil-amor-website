import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// ============================================================================
// UPSTASH REDIS CONFIGURATION - Enterprise Rate Limiting
// ============================================================================

// Only initialize Redis if env vars are set
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const hasRedis = redisUrl && redisToken && !redisUrl.includes('example.upstash.io')

const redis = hasRedis ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

interface SecurityConfig {
  csp: {
    directives: Record<string, string[]>
    reportOnly: boolean
    reportUri?: string
  }
  rateLimit: {
    api: { maxRequests: number; windowMs: number }
    auth: { maxRequests: number; windowMs: number }
    general: { maxRequests: number; windowMs: number }
  }
  headers: {
    hsts: { maxAge: number; includeSubDomains: boolean; preload: boolean }
    referrerPolicy: string
    permissionsPolicy: string
  }
}

const securityConfig: SecurityConfig = {
  csp: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.sanity.io',
        'https://js.sentry-cdn.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://js.stripe.com',
        'https://checkout.stripe.com',
      ],
      'script-src-elem': [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.sanity.io',
        'https://js.sentry-cdn.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://js.stripe.com',
        'https://checkout.stripe.com',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ],
      'style-src-elem': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ],
      'img-src': [
        "'self'",
        'blob:',
        'data:',
        'https://cdn.sanity.io',
        'https://images.unsplash.com',
        'https://*.googleusercontent.com',
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
      ],
      'connect-src': [
        "'self'",
        'https://cdn.sanity.io',
        'https://*.sanity.io',
        'https://sentry.io',
        'https://*.sentry.io',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://vitals.vercel-insights.com',
        'https://*.upstash.io',
        'https://api.stripe.com',
        'https://checkout.stripe.com',
      ],
      'media-src': ["'self'", 'https://cdn.sanity.io'],
      'frame-src': [
        "'self'",
        'https://js.stripe.com',
        'https://checkout.stripe.com',
        'https://*.stripe.com',
      ],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [],
    },
    reportOnly: process.env.NODE_ENV === 'development',
    reportUri: process.env.SENTRY_CSP_REPORT_URI,
  },
  rateLimit: {
    api: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
    auth: { maxRequests: 50, windowMs: 300000 },   // 50 login attempts per 5 minutes
    general: { maxRequests: 200, windowMs: 60000 }, // 200 general requests per minute
  },
  headers: {
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
}

// ============================================================================
// CSP GENERATOR
// ============================================================================

function generateCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

// ============================================================================
// REDIS RATE LIMITING - Distributed & Persistent
// ============================================================================

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  limit: number
}

async function checkRedisRateLimit(
  identifier: string,
  config: { maxRequests: number; windowMs: number }
): Promise<RateLimitResult> {
  const now = Date.now()
  
  // Fail open for general/API traffic if Redis is not configured, but fail closed for auth
  if (!redis) {
    console.error('Rate limiting unavailable: Redis not configured')
    const isAuth = config.maxRequests === securityConfig.rateLimit.auth.maxRequests
    return {
      allowed: !isAuth,
      remaining: isAuth ? 0 : Infinity,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    }
  }

  const key = `ratelimit:${identifier}`
  const windowStart = now - config.windowMs

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart)
    
    // Count current entries in window
    pipeline.zcard(key)
    
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    
    // Set expiry on the key
    pipeline.expire(key, Math.ceil(config.windowMs / 1000))
    
    const results = await pipeline.exec()
    const currentCount = (results?.[1] as number) || 0
    
    const allowed = currentCount < config.maxRequests
    const remaining = Math.max(0, config.maxRequests - currentCount - 1)
    const resetTime = now + config.windowMs

    return {
      allowed,
      remaining,
      resetTime,
      limit: config.maxRequests,
    }
  } catch (error) {
    // Fail closed if Redis is down — deny requests rather than allowing unbounded access
    console.error('Rate limiting Redis error:', error)
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + config.windowMs,
      limit: config.maxRequests,
    }
  }
}

function getRateLimitConfig(pathname: string): { maxRequests: number; windowMs: number } | null {
  if (pathname.startsWith('/api/auth/')) {
    return securityConfig.rateLimit.auth
  }
  if (pathname.startsWith('/api/')) {
    return securityConfig.rateLimit.api
  }
  return securityConfig.rateLimit.general
}

function getRateLimitIdentifier(request: NextRequest): string {
  // SECURITY: On Vercel, x-forwarded-for is set by the edge and trustworthy.
  // Do not trust x-forwarded-for on non-Vercel/non-proxied hosts without verification.
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  
  // Rate limit by IP only — including User-Agent allows attackers to rotate UAs and bypass limits
  return ip
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

function validateRequest(request: NextRequest): { valid: boolean; reason?: string } {
  // Block common attack patterns
  const pathname = request.nextUrl.pathname
  
  // Block path traversal attempts
  if (pathname.includes('..') || pathname.includes('%2e%2e')) {
    return { valid: false, reason: 'Path traversal detected' }
  }
  
  // Block null byte injection
  if (pathname.includes('\x00') || pathname.includes('%00')) {
    return { valid: false, reason: 'Null byte detected' }
  }
  
  // Block common exploit paths
  const blockedPaths = [
    '/.env',
    '/.git/',
    '/wp-admin/',
    '/phpmyadmin/',
    '/config/',
    '/administrator/',
  ]
  
  if (blockedPaths.some(path => pathname.toLowerCase().startsWith(path))) {
    return { valid: false, reason: 'Blocked path' }
  }
  
  return { valid: true }
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  // Validate request first
  const validation = validateRequest(request)
  if (!validation.valid) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Bad Request',
        message: validation.reason,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // ==========================================================================
  // SECURITY HEADERS
  // ==========================================================================
  
  // Content Security Policy
  const cspHeader = generateCSPHeader(securityConfig.csp.directives)
  if (securityConfig.csp.reportOnly) {
    response.headers.set('Content-Security-Policy-Report-Only', cspHeader)
  } else {
    response.headers.set('Content-Security-Policy', cspHeader)
  }
  
  if (securityConfig.csp.reportUri) {
    response.headers.set('Report-To', JSON.stringify({
      group: 'csp',
      max_age: 10886400,
      endpoints: [{ url: securityConfig.csp.reportUri }],
    }))
  }

  // Strict Transport Security (HSTS)
  const hsts = securityConfig.headers.hsts
  response.headers.set(
    'Strict-Transport-Security',
    `max-age=${hsts.maxAge}${hsts.includeSubDomains ? '; includeSubDomains' : ''}${hsts.preload ? '; preload' : ''}`
  )

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Type Options
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Frame Options
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', securityConfig.headers.referrerPolicy)
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', securityConfig.headers.permissionsPolicy)
  
  // Remove Server header fingerprinting
  response.headers.delete('Server')
  
  // Add security-related headers
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  // ==========================================================================
  // CACHE CONTROL
  // ==========================================================================
  
  // Static assets - aggressive caching
  if (pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  
  // API routes - no cache
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0')
  }
  
  // HTML pages - revalidate with stale-while-revalidate
  if (pathname === '/' || pathname.endsWith('/')) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================
  
  const rateLimitConfig = getRateLimitConfig(pathname)
  
  if (rateLimitConfig) {
    const identifier = getRateLimitIdentifier(request)
    const rateLimit = await checkRedisRateLimit(identifier, rateLimitConfig)
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString())
    
    if (!rateLimit.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }
  }

  // ==========================================================================
  // REQUEST ID FOR TRACING
  // ==========================================================================
  
  const requestId = crypto.randomUUID()
  response.headers.set('X-Request-ID', requestId)

  return response
}

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     * - manifest.json (web manifest)
     * - *.png, *.jpg, *.jpeg, *.gif, *.webp (image files in public)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:png|jpg|jpeg|gif|webp)$).*)',
  ],
}
