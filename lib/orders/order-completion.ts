/**
 * Order Completion Logic
 * Handles unlocking oils when orders are completed
 * Pure purchase → unlocks Pure refills
 * Enhanced purchase → unlocks ALL strengths (Pure + Enhanced)
 * Community blends → Shares custom mixes to community when user consents
 * User blends → Saves blends to user's personal library for re-purchase
 */

import { UnlockedOil, Order, OrderItem } from '@/lib/context/user-context'
import { OrderCustomMix } from '@/lib/db/schema/orders'
import { saveBlendToLibrary } from '@/lib/brand-ambassador'
import { trackReferral, extractShareCodeFromUrl } from '@/lib/brand-ambassador'
import { normalizeRecipe, calculateRecipeRefillPriceCents } from '@/lib/refill/recipe-scaling'
import { calculateBlendPriceCents } from '@/lib/community-blends/pricing'
import { sanitizeBlendText, flagBlendContent } from '@/lib/community-blends/moderation'
import { validateCustomMixServer } from '@/lib/safety/server-validation'
import { logger } from '@/lib/logging/logger'

export interface OrderCompletionResult {
  success: boolean
  newUnlocks: UnlockedOil[]
  upgradedUnlocks: { oilId: string; from: 'pure'; to: 'enhanced' }[]
  errors?: string[]
}

/**
 * Process an order completion and determine what oils should be unlocked
 * 
 * Rules:
 * - Pure oil purchase → Unlocks Pure refills for that oil
 * - Enhanced oil purchase → Unlocks BOTH Pure AND Enhanced refills for that oil
 * - If already unlocked as Pure and now buying Enhanced → Upgrade to Enhanced
 */
export function processOrderCompletion(
  order: Order,
  existingUnlocks: UnlockedOil[]
): OrderCompletionResult {
  const newUnlocks: UnlockedOil[] = []
  const upgradedUnlocks: { oilId: string; from: 'pure'; to: 'enhanced' }[] = []
  const errors: string[] = []

  for (const item of order.items) {
    // Skip items that aren't oils
    if (!item.oilId) {
      errors.push(`Item ${item.name} has no oilId`)
      continue
    }

    const existingUnlock = existingUnlocks.find(u => u.oilId === item.oilId)

    if (!existingUnlock) {
      // New unlock
      newUnlocks.push({
        oilId: item.oilId,
        unlockedAt: new Date().toISOString(),
        unlockedBy: order.id,
        type: item.type, // 'pure' or 'enhanced'
      })
    } else if (existingUnlock.type === 'pure' && item.type === 'enhanced') {
      // Upgrade from Pure to Enhanced (unlocks all strengths)
      upgradedUnlocks.push({
        oilId: item.oilId,
        from: 'pure',
        to: 'enhanced',
      })
    }
    // If already unlocked as enhanced, no change needed
  }

  return {
    success: errors.length === 0,
    newUnlocks,
    upgradedUnlocks,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Apply unlocks to existing list (for state updates)
 */
export function applyUnlocks(
  existingUnlocks: UnlockedOil[],
  result: OrderCompletionResult
): UnlockedOil[] {
  let updated = [...existingUnlocks]

  // Add new unlocks
  updated = [...updated, ...result.newUnlocks]

  // Apply upgrades
  for (const upgrade of result.upgradedUnlocks) {
    updated = updated.map(u =>
      u.oilId === upgrade.oilId ? { ...u, type: 'enhanced' } : u
    )
  }

  return updated
}

/**
 * Check if an order item grants enhanced access
 * Enhanced access means all strengths (5%-75%) are available for refill
 */
export function hasEnhancedAccess(
  oilId: string,
  unlockedOils: UnlockedOil[]
): boolean {
  const unlock = unlockedOils.find(u => u.oilId === oilId)
  return unlock?.type === 'enhanced'
}

/**
 * Get the highest tier unlock for an oil
 * Returns 'enhanced' if any order unlocked it as enhanced, otherwise 'pure' if unlocked, null if locked
 */
export function getOilUnlockTier(
  oilId: string,
  unlockedOils: UnlockedOil[]
): 'enhanced' | 'pure' | null {
  const unlock = unlockedOils.find(u => u.oilId === oilId)
  if (!unlock) return null
  return unlock.type
}

/**
 * Calculate available refill types for an oil
 */
export function getAvailableRefillTypes(
  oilId: string,
  unlockedOils: UnlockedOil[]
): { pure: boolean; enhanced: boolean } {
  const tier = getOilUnlockTier(oilId, unlockedOils)
  return {
    pure: tier !== null, // Pure is available if any unlock exists
    enhanced: tier === 'enhanced', // Enhanced only if explicitly unlocked
  }
}

// ============================================================================
// COMMUNITY BLEND SHARING
// ============================================================================

/**
 * Shared blend-store adapters for order-completion sharing.
 * Identity here comes from the server-verified paid order, not from a client
 * session (this code path runs from the Stripe webhook where no user session
 * exists) — which is also why the guest-buyer path in the webhook can reuse
 * them via processCommunityBlendPurchases.
 */
async function createBlendFromPaidOrder(input: Record<string, unknown>): Promise<{ success: boolean; blendId?: string; error?: string }> {
  const { insertCommunityBlend } = await import('@/lib/community-blends/blend-store')
  const shareInput = input as unknown as Parameters<typeof insertCommunityBlend>[0]
  const { blendId } = await insertCommunityBlend(shareInput)
  return { success: true, blendId }
}

async function publishBlendFromPaidOrder(input: { blendId: string; creatorId: string; orderId: string; consentToShare: boolean; moderationStatus?: 'approved' | 'flagged' }): Promise<{ success: boolean; slug?: string; error?: string }> {
  const { publishBlendRecord } = await import('@/lib/community-blends/blend-store')
  const updated = await publishBlendRecord({
    blendId: input.blendId,
    creatorId: input.creatorId,
    orderId: input.orderId,
    moderationStatus: input.moderationStatus,
  })
  return {
    success: !!updated,
    slug: updated?.slug,
    error: updated ? undefined : 'Blend not found or not owned by creator',
  }
}

export interface CommunityBlendShare {
  shouldShare: boolean
  blendName: string
  creatorId: string
  creatorName: string
  recipe: OrderCustomMix
  orderId: string
}

/**
 * Extract community blend shares from an order
 * Called when order is completed to share blends user consented to share
 */
export function extractCommunityBlendShares(order: Order): CommunityBlendShare[] {
  const shares: CommunityBlendShare[] = []

  for (const item of order.items) {
    // Check if this is a custom mix with community sharing enabled
    if (item.customMix?.shareToCommunity) {
      shares.push({
        shouldShare: true,
        blendName: item.customMix.recipeName,
        creatorId: item.customMix.creatorId || order.customerId || 'anonymous',
        creatorName: item.customMix.creatorName || 'Anonymous Alchemist',
        recipe: item.customMix,
        orderId: order.id,
      })
    }
  }

  return shares
}

/**
 * Process community blend shares after order completion
 * Creates AND publishes blends since user has already consented and purchased
 * Returns results of share attempts for user feedback
 */
export interface CommunityShareResult {
  success: boolean
  blendName: string
  blendId?: string
  slug?: string
  error?: string
}

export async function processCommunityBlendShares(
  order: Order,
  createBlendFn: (input: Record<string, unknown>) => Promise<{ success: boolean; blendId?: string; error?: string }>,
  publishBlendFn?: (input: { blendId: string; creatorId: string; orderId: string; consentToShare: boolean; moderationStatus?: 'approved' | 'flagged' }) => Promise<{ success: boolean; slug?: string; error?: string }>
): Promise<CommunityShareResult[]> {
  const shares = extractCommunityBlendShares(order)
  const results: CommunityShareResult[] = []

  for (const share of shares) {
    try {
      // Server-side safety re-validation — never publish a mix that fails
      // validation, regardless of what was stored on the order.
      const validation = validateCustomMixServer({
        oils: share.recipe.oils.map(o => ({
          oilId: o.oilId,
          ml: o.ml,
          percentage: o.percentage,
        })),
        totalVolume: share.recipe.totalVolume,
        carrierRatio: share.recipe.carrierRatio,
        mode: share.recipe.mode,
      })

      if (!validation.canProceed) {
        results.push({
          success: false,
          blendName: share.blendName,
          error: `Safety validation failed: ${validation.errors.join('; ') || 'mix did not pass server validation'}`,
        })
        continue
      }

      // carrierRatio is a PERCENT (5–75): the percentage of total volume
      // that is essential oils. Pure blends are 100% essential oils.
      // (Previously treated as a 0–1 fraction, which produced strength
      // values like 3000 and negative oil ml for carrier blends.)
      const essentialOilPercent = share.recipe.mode === 'carrier'
        ? (share.recipe.carrierRatio ?? 30)
        : 100

      // Transform recipe to CommunityBlend format
      const communityRecipe = {
        mode: share.recipe.mode,
        bottleSize: share.recipe.totalVolume,
        strength: essentialOilPercent,
        oils: share.recipe.oils.map(oil => ({
          oilId: oil.oilId,
          name: oil.oilName || oil.oilId,
          ml: Number(((share.recipe.totalVolume * (essentialOilPercent / 100) * oil.percentage) / 100).toFixed(2)),
        })),
        // Include additional recipe details
        carrierOilId: share.recipe.carrierOilId,
        crystalId: share.recipe.crystalId,
        // Server-computed safety fields (re-validated above)
        safetyScore: validation.safetyScore,
        safetyRating: validation.safetyRating,
        safetyWarnings: validation.safetyWarnings,
      }

      // Price the blend from its scaled recipe via the pricing engine
      // (previously a flat $35 regardless of oil costs)
      const priceCents = calculateBlendPriceCents({
        mode: communityRecipe.mode,
        bottleSize: communityRecipe.bottleSize,
        strength: essentialOilPercent,
        oils: communityRecipe.oils,
      })

      // Publish hygiene: same profanity/PII flag check as the interactive
      // publish flow (lib/community-blends/actions.ts). Flagged content is
      // still created/published but lands in the moderation queue
      // (moderation_status='flagged'), hidden from public queries.
      const blendName = sanitizeBlendText(share.blendName)
      const blendDescription = share.recipe.intendedUse
        ? `A custom blend designed for ${share.recipe.intendedUse}. Created with intention in the Oil Amor Mixing Atelier.`
        : `Custom blend created in the Mixing Atelier with intention and care.`
      const blendStory = share.recipe.intendedUse
        ? `This blend was crafted to support ${share.recipe.intendedUse}. The creator carefully selected each oil for its unique properties and how they harmonize together.`
        : undefined

      const contentFlags = flagBlendContent([blendName, blendDescription, blendStory].filter(Boolean).join('\n'))
      const moderationStatus = contentFlags.length > 0 ? 'flagged' as const : 'approved' as const
      if (contentFlags.length > 0) {
        logger.warn('Community blend content flagged at order-completion share', {
          orderId: share.orderId,
          blendName: share.blendName,
          flags: contentFlags,
        })
      }

      // Create the blend
      const result = await createBlendFn({
        creatorId: share.creatorId,
        creatorName: share.creatorName,
        name: blendName,
        description: blendDescription,
        story: blendStory,
        recipe: communityRecipe,
        revelationData: share.recipe.revelationData,
        price: priceCents,
        // Store additional metadata
        originalOrderId: share.orderId,
        consentToShare: true,
      })

      if (result.success && result.blendId && publishBlendFn) {
        // Immediately publish the blend since user has already consented and purchased
        const publishResult = await publishBlendFn({
          blendId: result.blendId,
          creatorId: share.creatorId,
          orderId: share.orderId,
          consentToShare: true,
          moderationStatus,
        })

        results.push({
          success: publishResult.success,
          blendName: share.blendName,
          blendId: result.blendId,
          slug: publishResult.slug,
          error: publishResult.error,
        })
      } else {
        results.push({
          success: result.success,
          blendName: share.blendName,
          blendId: result.blendId,
          error: result.error,
        })
      }
    } catch (error) {
      results.push({
        success: false,
        blendName: share.blendName,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

// ============================================================================
// USER BLEND LIBRARY (MY BLENDS)
// ============================================================================

export interface UserBlendSaveResult {
  success: boolean
  blendId?: string
  shareCode?: string
  blendName: string
  error?: string
}

export interface UnlockedRefillResult {
  success: boolean
  refillId?: string
  blendName: string
  /** Engine-computed refill prices in integer cents (AUD) */
  availableSizes: Array<{ size: 50 | 100; price: number }>
  error?: string
}

/**
 * Save all custom mix blends from an order to user's personal library
 * Called after order completion so user can re-purchase their blends
 */
export async function saveBlendsToUserLibrary(
  order: Order,
  userId: string
): Promise<UserBlendSaveResult[]> {
  const results: UserBlendSaveResult[] = []

  for (const item of order.items) {
    // Only save custom mixes
    if (!item.customMix) continue

    try {
      const result = await saveBlendToLibrary({
        userId,
        name: item.customMix.recipeName,
        description: `Created in the Mixing Atelier`,
        intendedUse: item.customMix.intendedUse,
        recipe: {
          mode: item.customMix.mode,
          oils: item.customMix.oils.map(o => ({
            ...o,
            drops: o.drops ?? Math.round((o.ml || 0) * 20),
          })),
          carrierRatio: item.customMix.carrierRatio,
          totalVolume: item.customMix.totalVolume,
          safetyScore: item.customMix.safetyScore,
          safetyRating: item.customMix.safetyRating,
          safetyWarnings: item.customMix.safetyWarnings,
        },
        tags: item.customMix.intendedUse ? [item.customMix.intendedUse] : [],
        createdFromOrderId: order.id,
        isPublic: item.customMix.shareToCommunity || false,
      })

      results.push({
        success: result.success,
        blendId: result.blendId,
        shareCode: result.shareCode,
        blendName: item.customMix.recipeName,
        error: result.error,
      })
    } catch (error) {
      results.push({
        success: false,
        blendName: item.customMix.recipeName,
        error: error instanceof Error ? error.message : 'Failed to save blend',
      })
    }
  }

  return results
}

// ============================================================================
// UNLOCK REFILLS FOR CUSTOM BLENDS
// ============================================================================

/**
 * Unlock custom blend refills after purchase
 * Makes the blend available in the refill store at 50ml and 100ml sizes
 */
export async function unlockCustomBlendRefills(
  order: Order,
  userId: string,
  shareCodes?: Record<string, string> // Map of recipeName -> shareCode
): Promise<UnlockedRefillResult[]> {
  const results: UnlockedRefillResult[] = []
  
  // Import here to avoid circular dependency
  const { createUnlockedRefill } = await import('@/lib/refill/unlocked-refills')
  
  for (const item of order.items) {
    // Only process custom mixes
    if (!item.customMix) continue
    
    try {
      const result = await createUnlockedRefill({
        userId,
        originalOrderId: order.id,
        name: item.customMix.recipeName,
        description: `Created in the Mixing Atelier`,
        intendedUse: item.customMix.intendedUse,
        customMix: item.customMix,
        tags: item.customMix.tags,
        shareCode: shareCodes?.[item.customMix.recipeName],
      })
      
      // Engine-computed refill prices in integer cents (2026-07-21: no flat fees)
      const normalizedRecipe = normalizeRecipe(item.customMix)
      
      results.push({
        success: result.success,
        refillId: result.refillId,
        blendName: item.customMix.recipeName,
        availableSizes: [
          { size: 50, price: calculateRecipeRefillPriceCents(normalizedRecipe, 50) },
          { size: 100, price: calculateRecipeRefillPriceCents(normalizedRecipe, 100) },
        ],
        error: result.error,
      })
    } catch (error) {
      results.push({
        success: false,
        blendName: item.customMix.recipeName,
        availableSizes: [],
        error: error instanceof Error ? error.message : 'Failed to unlock refill',
      })
    }
  }
  
  return results
}

// ============================================================================
// REFERRAL TRACKING (BRAND AMBASSADOR)
// ============================================================================

export interface ReferralTrackingInput {
  order: Order
  referringShareCode?: string | null
  referringBlendId?: string | null
  userAgent?: string
  ipAddress?: string
}

export interface ReferralResult {
  success: boolean
  creditEarned?: number
  referrerUserId?: string
  error?: string
}

/**
 * Track referrals from share links when order is completed
 * Called after order completion to award credits to referrer
 */
export async function trackBlendReferral(
  input: ReferralTrackingInput
): Promise<ReferralResult> {
  // Check if this order came from a share link
  const shareCode = input.referringShareCode
  
  if (!shareCode) {
    return { success: true } // No referral, that's fine
  }

  try {
    // Referral credit is computed on the MERCHANDISE SUBTOTAL only —
    // order.total includes GST and shipping, which must not earn credit.
    const merchandiseSubtotalCents = Math.round(
      input.order.items
        .filter(item => item.itemType !== 'shipping' && item.itemType !== 'gift-card')
        .reduce((sum, item) => sum + item.price * (item.quantity || 1), 0) * 100
    )

    if (merchandiseSubtotalCents <= 0) {
      return { success: true } // Nothing purchasable to credit against
    }

    const result = await trackReferral({
      shareCode,
      orderId: input.order.id,
      purchaseAmount: merchandiseSubtotalCents,
      referredUserId: input.order.customerId,
      referrerIp: input.ipAddress,
      userAgent: input.userAgent,
    })

    return {
      success: result.success,
      creditEarned: result.creditEarned,
      error: result.error,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track referral',
    }
  }
}

// ============================================================================
// COMPLETE ORDER PROCESSING
// ============================================================================

export interface CompleteOrderResult {
  orderId: string
  unlockResult: OrderCompletionResult
  communityShares: CommunityShareResult[]
  savedBlends: UserBlendSaveResult[]
  unlockedRefills: UnlockedRefillResult[]
  referralResult?: ReferralResult
  commissionResults: Array<{ blendId: string; success: boolean; commissionAmount?: number }>
  xpEarned: number
}

/**
 * Complete order processing - handles all post-purchase actions
 * 
 * This is the main function to call when an order is successfully completed
 */
export async function completeOrderProcessing(
  order: Order,
  userId: string,
  existingUnlocks: UnlockedOil[],
  options?: {
    referringShareCode?: string
    userAgent?: string
    ipAddress?: string
  }
): Promise<CompleteOrderResult> {
  // 1. Process oil unlocks
  const unlockResult = processOrderCompletion(order, existingUnlocks)

  // 2. Share to community (if user consented) — session-free store adapters
  const communityShares = await processCommunityBlendShares(
    order,
    createBlendFromPaidOrder,
    publishBlendFromPaidOrder
  )

  // 3. Save to user's personal library (My Blends)
  const savedBlends = await saveBlendsToUserLibrary(order, userId)

  // 4. Unlock refills for custom blends (makes them available in refill store)
  const shareCodeMap = savedBlends.reduce((map, blend) => {
    if (blend.shareCode) {
      map[blend.blendName] = blend.shareCode
    }
    return map
  }, {} as Record<string, string>)
  const unlockedRefills = await unlockCustomBlendRefills(order, userId, shareCodeMap)

  // 5. Track referral if came from share link
  const referralResult = await trackBlendReferral({
    order,
    referringShareCode: options?.referringShareCode,
    userAgent: options?.userAgent,
    ipAddress: options?.ipAddress,
  })

  // 5.5 Award community blend commissions
  const commissionResults: Array<{ blendId: string; success: boolean; commissionAmount?: number }> = []
  for (const item of order.items) {
    if (item.blendId) {
      const { recordBlendPurchase } = await import('@/lib/community-blends/actions')
      const result = await recordBlendPurchase(
        item.blendId,
        order.id,
        userId,
        Math.round(item.price * 100 * (item.quantity || 1))
      )
      commissionResults.push({ blendId: item.blendId, success: result.success, commissionAmount: result.commissionAmount })
    }
  }

  // 6. Calculate XP earned
  const xpEarned = calculateOrderXP(order, existingUnlocks)

  // 7. Unlock the refill program when the order contains a 30ml bottle
  await maybeUnlockRefillProgram(order, userId)

  return {
    orderId: order.id,
    unlockResult,
    communityShares,
    savedBlends,
    unlockedRefills,
    referralResult,
    commissionResults,
    xpEarned,
  }
}

/**
 * Community-blend-only legs of order completion: consented shares (create +
 * publish) and creator commission via recordBlendPurchase.
 *
 * Extracted from completeOrderProcessing so the Stripe webhook can run these
 * for GUEST buyers too — creator attribution comes from the blend lookup
 * (item.blendId), not from the buyer's session. Login-only legs (oil unlocks,
 * ambassador credit, refill program, health profile) are NOT run here.
 */
export async function processCommunityBlendPurchases(
  order: Order
): Promise<{
  communityShares: CommunityShareResult[]
  commissionResults: Array<{ blendId: string; success: boolean; commissionAmount?: number }>
}> {
  const communityShares = await processCommunityBlendShares(
    order,
    createBlendFromPaidOrder,
    publishBlendFromPaidOrder
  )

  const commissionResults: Array<{ blendId: string; success: boolean; commissionAmount?: number }> = []
  for (const item of order.items) {
    if (item.blendId) {
      const { recordBlendPurchase } = await import('@/lib/community-blends/actions')
      const result = await recordBlendPurchase(
        item.blendId,
        order.id,
        order.customerId || 'guest',
        Math.round(item.price * 100 * (item.quantity || 1))
      )
      commissionResults.push({ blendId: item.blendId, success: result.success, commissionAmount: result.commissionAmount })
    }
  }

  return { communityShares, commissionResults }
}

// ============================================================================
// REFILL PROGRAM UNLOCK (30ML QUALIFYING PURCHASE)
// ============================================================================

/**
 * A 30ml bottle qualifies by item size ('30ml') or product name containing
 * "30ml". Shared by the unlock detection below.
 */
export function orderContains30mlBottle(order: Order): boolean {
  return order.items.some(item =>
    /^30\s?ml$/i.test((item.size || '').trim()) || /\b30\s?ml\b/i.test(item.name || '')
  )
}

/**
 * Unlock the refill program after a qualifying 30ml bottle purchase.
 *
 * This is the real writer for the unlock path: it stamps the order's
 * metadata (has30mlBottle) so refill eligibility can find the qualifying
 * purchase, and flips the customer's refillUnlocked metadata. Best-effort —
 * failures are logged, never thrown (order completion must not fail).
 */
async function maybeUnlockRefillProgram(order: Order, userId: string): Promise<void> {
  try {
    if (!userId || !orderContains30mlBottle(order)) return

    const { db } = await import('@/lib/db')
    const { orders } = await import('@/lib/db/schema-refill')
    const { eq, sql } = await import('drizzle-orm')

    // Stamp the order so eligibility.check30mlPurchase can find it
    await db.update(orders)
      .set({
        metadata: sql`jsonb_set(coalesce(${orders.metadata}, '{}'::jsonb), '{has30mlBottle}', 'true'::jsonb)`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))

    // Unlock the refill program on the customer record (idempotent)
    const { unlockRefillForCustomer } = await import('@/lib/refill/eligibility')
    await unlockRefillForCustomer(userId)
  } catch (error) {
    logger.error('Failed to unlock refill program after 30ml purchase', error instanceof Error ? error : new Error(String(error)), { orderId: order.id, userId })
  }
}

// ============================================================================
// XP CALCULATION
// ============================================================================

/**
 * Calculate collector XP from an order
 * Base: 50 XP per order
 * Bonus: 25 XP per unique oil
 * Bonus: 50 XP for first enhanced purchase of an oil
 */
export function calculateOrderXP(
  order: Order,
  existingUnlocks: UnlockedOil[]
): number {
  let xp = 50 // Base XP

  const uniqueOils = new Set(order.items.map(i => i.oilId))
  xp += uniqueOils.size * 25 // Bonus per unique oil

  // Bonus for first enhanced purchase
  for (const item of order.items) {
    if (item.type === 'enhanced') {
      const existing = existingUnlocks.find(u => u.oilId === item.oilId)
      if (!existing || existing.type === 'pure') {
        xp += 50 // First enhanced bonus
      }
    }
  }

  return xp
}


