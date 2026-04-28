/**
 * Security Event Logging API
 * Receives security events from client-side and forwards to monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const securityEventSchema = z.object({
  type: z.enum(['auth', 'access', 'error', 'suspicious']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
})

// ============================================================================
// RATE LIMITING (Simple in-memory for this endpoint)
// ============================================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 10 // 10 events per minute per IP
  
  const entry = rateLimitStore.get(identifier)
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  
  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}

// ============================================================================
// SECURITY EVENT PROCESSOR
// ============================================================================

interface ProcessedEvent {
  type: string
  severity: string
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
  source: 'client' | 'server'
  userAgent: string
  ip: string
  url: string
}

function processSecurityEvent(
  event: z.infer<typeof securityEventSchema>,
  request: NextRequest
): ProcessedEvent {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  
  return {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    source: 'client',
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip,
    url: request.headers.get('referer') || 'unknown',
  }
}

// ============================================================================
// LOGGING DESTINATIONS
// ============================================================================

async function logToSentry(event: ProcessedEvent): Promise<void> {
  // In production, send to Sentry
  if (process.env.SENTRY_DSN) {
    // Dynamic import to avoid loading Sentry in development
    const Sentry = await import('@sentry/nextjs')
    
    Sentry.captureMessage(event.message, {
      level: event.severity as any,
      tags: {
        type: event.type,
        source: event.source,
      },
      extra: {
        ...event.metadata,
        clientIp: event.ip,
        userAgent: event.userAgent,
        url: event.url,
      },
    })
  }
}

async function logToConsole(event: ProcessedEvent): Promise<void> {
  // Structured logging for log aggregation services
  const logEntry = {
    ...event,
    service: 'oil-amor-web',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  }
  
  // Use appropriate log level
  switch (event.severity) {
    case 'critical':
      console.error('[SECURITY_CRITICAL]', JSON.stringify(logEntry))
      break
    case 'high':
      console.error('[SECURITY_HIGH]', JSON.stringify(logEntry))
      break
    case 'medium':
      console.warn('[SECURITY_MEDIUM]', JSON.stringify(logEntry))
      break
    default:
      console.log('[SECURITY_LOW]', JSON.stringify(logEntry))
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
    const { allowed, remaining } = checkRateLimit(ip)
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = securityEventSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid event format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }
    
    // Process the event
    const processedEvent = processSecurityEvent(validationResult.data, request)
    
    // Log to all destinations (non-blocking)
    await Promise.allSettled([
      logToConsole(processedEvent),
      logToSentry(processedEvent),
    ])
    
    // Return success with rate limit headers
    return NextResponse.json(
      { success: true },
      {
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    )
    
  } catch (error) {
    // Log the error but don't expose details to client
    console.error('Security logging error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// CORS & METHOD HANDLING
// ============================================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
