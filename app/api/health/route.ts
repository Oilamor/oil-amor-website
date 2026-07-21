/**
 * Health Check API
 * Comprehensive health monitoring for all system dependencies
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { requireAdminAuth } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

// ============================================================================
// DEPENDENCY CHECKS
// ============================================================================

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  message?: string
  lastChecked: string
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  // Detailed diagnostics — only included for authenticated admins
  uptime?: number
  checks?: HealthCheck[]
  memory?: {
    used: number
    total: number
    percentage: number
  }
}

// Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    if (!redis) {
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: 0,
        message: 'Redis not configured',
        lastChecked: new Date().toISOString(),
      }
    }
    
    await redis.ping()
    
    return {
      name: 'redis',
      status: 'healthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const { pool } = await import('@/lib/db')
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    
    return {
      name: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkSanity(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v1/data/query/${process.env.NEXT_PUBLIC_SANITY_DATASET}?query=*%5B_type%20%3D%3D%20%22oil%22%5D%20%7C%20order(_createdAt%20desc)%20%5B0...1%5D`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SANITY_API_TOKEN || ''}`,
        },
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return {
      name: 'sanity',
      status: 'healthy',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'sanity',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

function checkMemory(): { used: number; total: number; percentage: number } {
  const used = process.memoryUsage()
  const total = used.heapTotal
  const usedMemory = used.heapUsed
  
  return {
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round((usedMemory / total) * 100),
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Detailed diagnostics (dependency errors, memory, uptime) are admin-only —
  // unauthenticated callers always receive the basic status
  const { searchParams } = new URL(request.url)
  let detailed = false
  if (searchParams.get('detailed') === 'true') {
    const adminAuthError = await requireAdminAuth(request)
    detailed = !adminAuthError
  }

  // Run all health checks in parallel
  const checks = await Promise.all([
    checkRedis(),
    checkDatabase(),
    checkSanity(),
  ])

  // Determine overall status
  const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length
  const degradedCount = checks.filter((c) => c.status === 'degraded').length

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (unhealthyCount > 0) {
    status = 'unhealthy'
  } else if (degradedCount > 0) {
    status = 'degraded'
  }

  const healthStatus: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }

  if (detailed) {
    healthStatus.uptime = process.uptime()
    healthStatus.checks = checks
    healthStatus.memory = checkMemory()
  }
  
  // Return appropriate status code
  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503
  
  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

// Liveness probe - quick check if app is running
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

// Readiness probe - check if app is ready to serve traffic
export async function OPTIONS() {
  const checks = await Promise.all([checkRedis()])
  
  const allHealthy = checks.every((c) => c.status === 'healthy')
  
  return new NextResponse(null, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
