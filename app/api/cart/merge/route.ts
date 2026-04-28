/**
 * Cart Merge API
 * Merge guest cart into authenticated user cart
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { CartManager } from '@/lib/cart/cart-manager'
import { logger } from '@/lib/logging/logger'
import { checkApiRateLimit, createRateLimitHeaders } from '@/lib/redis/rate-limiter'
import { getSession } from '@/lib/auth/session'

// ============================================================================
// REDIS CLIENT
// ============================================================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

const cartManager = new CartManager(redis)

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const mergeSchema = z.object({
  guestCartId: z.string().startsWith('cart_'),
  userCartId: z.string().startsWith('cart_'),
})

// ============================================================================
// POST /api/cart/merge - Merge carts
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = await checkApiRateLimit(ip, 'general')
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }
    
    // Parse and validate body
    const body = await request.json()
    const validation = mergeSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }
    
    const { guestCartId, userCartId } = validation.data
    
    // SECURITY: Verify the authenticated user owns the userCartId
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // The user cart ID should contain or match the customer's ID
    // Cart IDs are typically formatted as cart_{customerId}_{random}
    const expectedCartPrefix = `cart_${session.customerId}`
    if (!userCartId.startsWith(expectedCartPrefix)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot merge carts that do not belong to you' },
        { status: 403 }
      )
    }
    
    // Merge carts
    const cart = await cartManager.mergeCarts(guestCartId, userCartId)
    
    // Cart merged successfully (Shopify sync removed — local DB only)

    logger.info('Carts merged via API', { 
      guestCart: guestCartId.slice(0, 8), 
      userCart: userCartId.slice(0, 8) 
    })
    
    return NextResponse.json(
      { success: true, cart },
      {
        headers: {
          ...createRateLimitHeaders(rateLimit),
          'Cache-Control': 'no-store',
        },
      }
    )
    
  } catch (error) {
    logger.error('Cart merge error', error as Error)
    
    return NextResponse.json(
      { 
        error: 'Failed to merge carts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
