/**
 * Unlocked Refills Service
 * 
 * Manages custom blends that users have unlocked for refill purchases.
 * When a user buys a custom blend from the Mixing Atelier,
 * it becomes available for refill in larger sizes (50ml, 100ml).
 */

// Simple ID generator to avoid nanoid ES module issues
function generateId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
import { db } from '@/lib/db'
import { unlockedRefills, type UnlockedRefill, type InsertUnlockedRefill } from '@/lib/db/schema/unlocked-refills'
import { OrderCustomMix } from '@/lib/db/schema/orders'
import { eq, and, desc, sql } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { normalizeRecipe, calculateRefillPrice } from './recipe-scaling'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// CREATE UNLOCKED REFILL
// ============================================================================

export interface CreateUnlockedRefillInput {
  userId: string
  originalOrderId: string
  name: string
  description?: string
  intendedUse?: string
  customMix: OrderCustomMix
  tags?: string[]
  shareCode?: string // If blend was shared to community
}

/**
 * Create an unlocked refill entry after custom blend purchase
 * This makes the blend available for refill purchases
 */
export async function createUnlockedRefill(
  input: CreateUnlockedRefillInput
): Promise<{ success: boolean; refillId?: string; error?: string }> {
  try {
    // Normalize the recipe for scaling
    const normalizedRecipe = normalizeRecipe(input.customMix)
    
    // Calculate prices for refill sizes
    const availableSizes = [
      {
        size: 50 as const,
        price: calculateRefillPrice(50, input.customMix.mode),
        isAvailable: true,
      },
      {
        size: 100 as const,
        price: calculateRefillPrice(100, input.customMix.mode),
        isAvailable: true,
      },
    ]
    
    const [refill] = await db.insert(unlockedRefills).values({
      id: generateId(),
      userId: input.userId,
      originalOrderId: input.originalOrderId,
      name: input.name,
      description: input.description,
      intendedUse: input.intendedUse,
      tags: input.tags || [],
      recipe: {
        mode: normalizedRecipe.mode,
        oils: normalizedRecipe.oils.map(o => ({
          oilId: o.oilId,
          oilName: o.oilName,
          percentage: o.percentage,
        })),
        carrierRatio: normalizedRecipe.carrierRatio,
        totalVolume: normalizedRecipe.totalVolume,
        safetyScore: normalizedRecipe.safetyScore,
        safetyRating: normalizedRecipe.safetyRating,
        safetyWarnings: normalizedRecipe.safetyWarnings,
      },
      availableSizes,
      refillCount: 0,
      shareCode: input.shareCode,
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()
    
    revalidateTag(`unlocked-refills-${input.userId}`)
    
    return {
      success: true,
      refillId: refill.id,
    }
  } catch (error) {
    logger.error('Error creating unlocked refill', error instanceof Error ? error : new Error(String(error)))
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlock refill',
    }
  }
}

// ============================================================================
// GET UNLOCKED REFILLS
// ============================================================================

/**
 * Get all unlocked refills for a user
 * Used in the refill store and account page
 */
export async function getUnlockedRefills(userId: string): Promise<UnlockedRefill[]> {
  return db.query.unlockedRefills.findMany({
    where: and(
      eq(unlockedRefills.userId, userId),
      eq(unlockedRefills.isActive, true),
      eq(unlockedRefills.isDeleted, false)
    ),
    orderBy: desc(unlockedRefills.createdAt),
  })
}

/**
 * Get a single unlocked refill by ID
 */
export async function getUnlockedRefillById(refillId: string): Promise<UnlockedRefill | undefined> {
  return db.query.unlockedRefills.findFirst({
    where: eq(unlockedRefills.id, refillId),
  })
}

/**
 * Get unlocked refill by share code
 * For looking up blends that were shared to community
 */
export async function getUnlockedRefillByShareCode(shareCode: string): Promise<UnlockedRefill | undefined> {
  return db.query.unlockedRefills.findFirst({
    where: eq(unlockedRefills.shareCode, shareCode),
  })
}

// ============================================================================
// UPDATE REFILL USAGE
// ============================================================================

/**
 * Record a refill purchase
 * Updates the refill count and last purchased date
 */
export async function recordRefillPurchase(
  refillId: string,
  size: 50 | 100
): Promise<void> {
  const now = new Date()
  
  await db.update(unlockedRefills)
    .set({
      refillCount: sql`${unlockedRefills.refillCount} + 1`,
      lastRefilledAt: now,
      updatedAt: now,
      // Update the specific size's last purchased date
      availableSizes: sql`
        jsonb_set(
          ${unlockedRefills.availableSizes},
          array[(SELECT pos::text FROM jsonb_array_elements(${unlockedRefills.availableSizes}) WITH ORDINALITY AS elem(value, pos) WHERE (value->>'size')::int = ${size})::int - 1, 'lastPurchasedAt'],
          to_jsonb(${now.toISOString()})
        )
      `,
    })
    .where(eq(unlockedRefills.id, refillId))
}

// ============================================================================
// DELETE/DEACTIVATE
// ============================================================================

/**
 * Soft delete an unlocked refill
 * User can remove blends they no longer want to see
 */
export async function deactivateUnlockedRefill(refillId: string): Promise<boolean> {
  try {
    await db.update(unlockedRefills)
      .set({
        isActive: false,
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(unlockedRefills.id, refillId))
    
    return true
  } catch (error) {
    logger.error('Error deactivating refill', error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

// ============================================================================
// REFILL STORE DATA
// ============================================================================

export interface RefillStoreItem {
  id: string
  name: string
  description?: string
  intendedUse?: string
  tags: string[]
  originalSize: number
  mode: 'pure' | 'carrier'
  oilCount: number
  oilNames: string[]
  safetyRating: string
  safetyScore: number
  availableSizes: Array<{
    size: 50 | 100
    price: number
    priceFormatted: string
  }>
  refillCount: number
  lastRefilledAt?: Date
  createdAt: Date
}

/**
 * Get refill store data for display
 * Formats unlocked refills for the refill store UI
 */
export async function getRefillStoreItems(userId: string): Promise<RefillStoreItem[]> {
  const refills = await getUnlockedRefills(userId)
  
  return refills.map(refill => ({
    id: refill.id,
    name: refill.name,
    description: refill.description || undefined,
    intendedUse: refill.intendedUse || undefined,
    tags: refill.tags || [],
    originalSize: refill.recipe.totalVolume,
    mode: refill.recipe.mode,
    oilCount: refill.recipe.oils.length,
    oilNames: refill.recipe.oils.map(o => o.oilName),
    safetyRating: refill.recipe.safetyRating,
    safetyScore: refill.recipe.safetyScore,
    availableSizes: refill.availableSizes.map(s => ({
      size: s.size,
      price: s.price,
      priceFormatted: formatPrice(s.price),
    })),
    refillCount: refill.refillCount,
    lastRefilledAt: refill.lastRefilledAt || undefined,
    createdAt: refill.createdAt,
  }))
}

// ============================================================================
// HELPERS
// ============================================================================

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Group refills by intended use for organized display
 */
export function groupRefillsByCategory(items: RefillStoreItem[]): Record<string, RefillStoreItem[]> {
  const groups: Record<string, RefillStoreItem[]> = {
    'Sleep & Relaxation': [],
    'Energy & Focus': [],
    'Wellness & Immunity': [],
    'Mood & Emotion': [],
    'Other': [],
  }
  
  const categoryMap: Record<string, string> = {
    'sleep': 'Sleep & Relaxation',
    'relaxation': 'Sleep & Relaxation',
    'calm': 'Sleep & Relaxation',
    'energy': 'Energy & Focus',
    'focus': 'Energy & Focus',
    'concentration': 'Energy & Focus',
    'immunity': 'Wellness & Immunity',
    'wellness': 'Wellness & Immunity',
    'breathing': 'Wellness & Immunity',
    'mood': 'Mood & Emotion',
    'uplift': 'Mood & Emotion',
    'balance': 'Mood & Emotion',
  }
  
  for (const item of items) {
    const category = item.intendedUse 
      ? categoryMap[item.intendedUse.toLowerCase()] 
      : 'Other'
    
    if (category && groups[category]) {
      groups[category].push(item)
    } else {
      groups['Other'].push(item)
    }
  }
  
  // Remove empty categories
  return Object.fromEntries(
    Object.entries(groups).filter(([_, items]) => items.length > 0)
  )
}

/**
 * Get stats for user's refill program
 */
export async function getRefillStats(userId: string): Promise<{
  totalUnlocked: number
  totalRefills: number
  savedVsOriginal: number // How much they've saved
  favoriteBlend?: string
}> {
  const refills = await getUnlockedRefills(userId)
  
  const totalRefills = refills.reduce((sum, r) => sum + r.refillCount, 0)
  
  // Find most refilled blend
  const favorite = refills
    .filter(r => r.refillCount > 0)
    .sort((a, b) => b.refillCount - a.refillCount)[0]
  
  // Calculate savings (refills are cheaper than original)
  // Original ~$35, refill ~$30 for 50ml, ~$55 for 100ml
  const estimatedSavings = totalRefills * 5 // Approx $5 saved per refill
  
  return {
    totalUnlocked: refills.length,
    totalRefills,
    savedVsOriginal: estimatedSavings,
    favoriteBlend: favorite?.name,
  }
}
