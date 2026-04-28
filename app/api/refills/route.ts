/**
 * Refills API Route
 * Fetches unlocked custom blend refills for authenticated users
 * 
 * GET /api/refills - Get user's unlocked custom blend refills
 * POST /api/refills - Record a refill purchase
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnlockedRefills, recordRefillPurchase } from '@/lib/refill/unlocked-refills'
import { scaleToRefill } from '@/lib/refill/recipe-scaling'
import { getSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

// ============================================================================
// Authentication Helper — Uses iron-session for secure customer authentication
// ============================================================================

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const session = await getSession()
  if (session.isLoggedIn && session.customerId) {
    return session.customerId
  }
  return null
}

// ============================================================================
// GET /api/refills - Get user's unlocked refills
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Fetch unlocked refills from database
    const refills = await getUnlockedRefills(userId)
    
    // Format for frontend with scaled options
    const formattedRefills = refills.map(refill => ({
      id: refill.id,
      name: refill.name,
      originalSize: refill.recipe.totalVolume,
      mode: refill.recipe.mode,
      normalizedRecipe: {
        mode: refill.recipe.mode,
        oils: refill.recipe.oils.map(o => ({
          oilId: o.oilId,
          oilName: o.oilName,
          percentage: o.percentage,
        })),
        carrierRatio: refill.recipe.carrierRatio,
      },
      availableSizes: {
        '50ml': scaleToRefill({
          mode: refill.recipe.mode,
          totalVolume: refill.recipe.totalVolume,
          oils: refill.recipe.oils.map(o => ({
            oilId: o.oilId,
            oilName: o.oilName,
            percentage: o.percentage,
            ml: 0, // Will be calculated by scaleToRefill
          })),
          carrierRatio: refill.recipe.carrierRatio,
          safetyScore: refill.recipe.safetyScore,
          safetyRating: refill.recipe.safetyRating,
          safetyWarnings: refill.recipe.safetyWarnings,
        }, 50),
        '100ml': scaleToRefill({
          mode: refill.recipe.mode,
          totalVolume: refill.recipe.totalVolume,
          oils: refill.recipe.oils.map(o => ({
            oilId: o.oilId,
            oilName: o.oilName,
            percentage: o.percentage,
            ml: 0,
          })),
          carrierRatio: refill.recipe.carrierRatio,
          safetyScore: refill.recipe.safetyScore,
          safetyRating: refill.recipe.safetyRating,
          safetyWarnings: refill.recipe.safetyWarnings,
        }, 100),
      },
      // Additional metadata
      description: refill.description,
      safetyScore: refill.recipe.safetyScore,
      safetyRating: refill.recipe.safetyRating,
      refillCount: refill.refillCount,
      lastRefilledAt: refill.lastRefilledAt,
      unlockedAt: refill.createdAt,
      shareCode: refill.shareCode,
    }))
    
    return NextResponse.json({ 
      refills: formattedRefills,
      count: formattedRefills.length,
      userId: userId,
    })
    
  } catch (error) {
    console.error('Error fetching refills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch refills' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/refills - Record a refill purchase
// Body: { refillId: string, size: 50 | 100 }
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await getAuthenticatedUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { refillId, size } = body
    
    if (!refillId || !size) {
      return NextResponse.json(
        { error: 'Missing required fields: refillId, size' },
        { status: 400 }
      )
    }
    
    // Validate size
    if (![50, 100].includes(size)) {
      return NextResponse.json(
        { error: 'Invalid size. Must be 50 or 100' },
        { status: 400 }
      )
    }
    
    await recordRefillPurchase(refillId, size as 50 | 100)
    
    return NextResponse.json({ 
      success: true,
      message: `Refill recorded for ${size}ml`,
      refillId,
      size,
      userId,
    })
    
  } catch (error) {
    console.error('Error recording refill:', error)
    return NextResponse.json(
      { error: 'Failed to record refill' },
      { status: 500 }
    )
  }
}
