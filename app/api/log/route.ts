/**
 * Log Ingestion API
 * Receives logs from client-side and forwards to logging infrastructure
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const logEntrySchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']),
  message: z.string(),
  timestamp: z.string().datetime(),
  service: z.string(),
  environment: z.string(),
  version: z.string(),
  context: z.record(z.unknown()).optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }).optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  duration: z.number().optional(),
})

const requestSchema = z.object({
  logs: z.array(logEntrySchema).min(1).max(50),
})

// ============================================================================
// LOG PROCESSING
// ============================================================================

interface ProcessedLog {
  level: string
  message: string
  timestamp: string
  source: 'client'
  userAgent: string
  ip: string
  url: string
}

function processLogs(
  logs: z.infer<typeof requestSchema>['logs'],
  request: NextRequest
): ProcessedLog[] {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  
  return logs.map((log) => ({
    ...log,
    source: 'client' as const,
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip,
    url: request.headers.get('referer') || 'unknown',
  }))
}

// ============================================================================
// LOGGING DESTINATIONS
// ============================================================================

async function logToSentry(logs: ProcessedLog[]): Promise<void> {
  const { captureMessage } = await import('@sentry/nextjs')
  
  for (const log of logs) {
    const levelMap: Record<string, any> = {
      debug: 'debug',
      info: 'info',
      warn: 'warning',
      error: 'error',
      fatal: 'fatal',
    }

    if (log.level === 'error' || log.level === 'fatal') {
      captureMessage(log.message, {
        level: levelMap[log.level],
        tags: {
          source: 'client',
        },
        extra: {
          clientIp: log.ip,
          userAgent: log.userAgent,
          url: log.url,
        },
      })
    }
  }
}

async function logToConsole(logs: ProcessedLog[]): Promise<void> {
  for (const log of logs) {
    const prefix = `[CLIENT] [${log.level.toUpperCase()}] [${new Date(log.timestamp).toISOString()}]`
    
    switch (log.level) {
      case 'debug':
        break
      case 'info':
        logger.info(log.message, { prefix, level: log.level, source: 'client' })
        break
      case 'warn':
        break
      case 'error':
      case 'fatal':
        logger.error(log.message, new Error('Client-side error log'))
        break
    }
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 30 // 30 batches per minute per IP
  
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
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
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
    
    // Validate request body
    const body = await request.json()
    const validationResult = requestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid log format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }
    
    // Process logs
    const processedLogs = processLogs(validationResult.data.logs, request)
    
    // Send to all destinations
    await Promise.allSettled([
      logToConsole(processedLogs),
      logToSentry(processedLogs),
    ])
    
    return NextResponse.json(
      { success: true, count: processedLogs.length },
      {
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    )
    
  } catch (error) {
    logger.error('Log ingestion error', error instanceof Error ? error : new Error(String(error)))
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// CORS
// ============================================================================

export async function OPTIONS() {
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
