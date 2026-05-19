/**
 * Brand Ambassador System
 * 
 * Features:
 * - Generate unique share codes for blends
 * - Track referrals and purchases via shared links
 * - Calculate and apply credits to referrer's account
 * - Manage user's brand ambassador dashboard
 */

import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging/logger'
import { userBlends, blendReferrals, type UserBlend, type InsertUserBlend } from '@/lib/db/schema/user-blends'
import { creditTransactions, customerCredits } from '@/lib/db/schema-refill'
import { eq, and, sql, desc } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'

// ============================================================================
// SHARE CODE GENERATION
// ============================================================================

/**
 * Generate a unique share code for a blend
 * Format: OIL-XXXX-XXXX (e.g., OIL-ABCD-1234)
 */
export function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `OIL-${part1}-${part2}`
}

/**
 * Ensure share code is unique by checking database
 */
async function generateUniqueShareCode(): Promise<string> {
  let code = generateShareCode()
  let existing = await db.query.userBlends.findFirst({
    where: eq(userBlends.shareCode, code),
  })
  
  // Regenerate if exists (very rare collision)
  while (existing) {
    code = generateShareCode()
    existing = await db.query.userBlends.findFirst({
      where: eq(userBlends.shareCode, code),
    })
  }
  
  return code
}

// ============================================================================
// USER BLEND MANAGEMENT
// ============================================================================

export interface SaveBlendInput {
  userId: string
  name: string
  description?: string
  intendedUse?: string
  recipe: UserBlend['recipe']
  tags?: string[]
  createdFromOrderId?: string
  isPublic?: boolean
}

/**
 * Save a blend to user's personal library
 * Called after purchase or when user explicitly saves
 */
export async function saveBlendToLibrary(input: SaveBlendInput): Promise<{ success: boolean; blendId?: string; shareCode?: string; error?: string }> {
  try {
    const shareCode = await generateUniqueShareCode()
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${nanoid(6)}`
    
    const [blend] = await db.insert(userBlends).values({
      id: nanoid(),
      userId: input.userId,
      name: input.name,
      slug,
      shareCode,
      recipe: input.recipe,
      description: input.description,
      intendedUse: input.intendedUse,
      tags: input.tags || [],
      createdFromOrderId: input.createdFromOrderId,
      isPublic: input.isPublic ?? false,
      isBrandAmbassadorEnabled: true, // Auto-enable for sharing
      totalShares: 0,
      totalViews: 0,
      totalPurchasesViaShare: 0,
      totalCreditsEarned: 0,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()
    
    revalidateTag(`user-blends-${input.userId}`)
    
    return {
      success: true,
      blendId: blend.id,
      shareCode: blend.shareCode,
    }
  } catch (error) {
    logger.error('Error saving blend', error instanceof Error ? error : new Error(String(error)))
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save blend',
    }
  }
}

/**
 * Get user's blend library
 */
export async function getUserBlends(userId: string): Promise<UserBlend[]> {
  return db.query.userBlends.findMany({
    where: and(
      eq(userBlends.userId, userId),
      eq(userBlends.isDeleted, false)
    ),
    orderBy: desc(userBlends.createdAt),
  })
}

/**
 * Get a single blend by share code
 */
export async function getBlendByShareCode(shareCode: string): Promise<UserBlend | null> {
  const result = await db.query.userBlends.findFirst({
    where: and(
      eq(userBlends.shareCode, shareCode),
      eq(userBlends.isDeleted, false)
    ),
  })
  return result as UserBlend | null
}

/**
 * Get blend by ID (for re-purchasing)
 */
export async function getBlendById(blendId: string): Promise<UserBlend | null> {
  const result = await db.query.userBlends.findFirst({
    where: eq(userBlends.id, blendId),
  })
  return result as UserBlend | null
}

// ============================================================================
// BRAND AMBASSADOR / REFERRAL SYSTEM
// ============================================================================

export interface TrackReferralInput {
  shareCode: string
  orderId: string
  purchaseAmount: number // in cents
  referredUserId?: string
  referrerIp?: string
  userAgent?: string
}

const REFERRAL_CREDIT_PERCENTAGE = 0.10 // 10% credit

/**
 * Track a referral when someone purchases via shared link
 */
export async function trackReferral(input: TrackReferralInput): Promise<{ success: boolean; creditEarned?: number; error?: string }> {
  try {
    // Find the blend and referrer
    const blend = await getBlendByShareCode(input.shareCode)
    if (!blend) {
      return { success: false, error: 'Invalid share code' }
    }
    
    // Calculate credit (10% of purchase)
    const creditEarned = Math.round(input.purchaseAmount * REFERRAL_CREDIT_PERCENTAGE)
    
    // Record the referral
    await db.insert(blendReferrals).values({
      id: nanoid(),
      shareCode: input.shareCode,
      referrerUserId: blend.userId,
      referredUserId: input.referredUserId,
      orderId: input.orderId,
      blendId: blend.id,
      purchaseAmount: input.purchaseAmount,
      creditEarned,
      creditStatus: 'pending',
      referrerIp: input.referrerIp,
      userAgent: input.userAgent,
      createdAt: new Date(),
    })
    
    // Update blend stats
    await db.update(userBlends)
      .set({
        totalPurchasesViaShare: sql`${userBlends.totalPurchasesViaShare} + 1`,
        totalCreditsEarned: sql`${userBlends.totalCreditsEarned} + ${creditEarned}`,
        updatedAt: new Date(),
      })
      .where(eq(userBlends.id, blend.id))
    
    // Apply credit to referrer's account
    await applyReferralCredit(blend.userId, creditEarned, input.orderId)
    
    // Mark referral as applied
    await db.update(blendReferrals)
      .set({
        creditStatus: 'applied',
        creditAppliedAt: new Date(),
      })
      .where(eq(blendReferrals.orderId, input.orderId))
    
    revalidateTag(`user-blends-${blend.userId}`)
    revalidateTag(`referrals-${blend.userId}`)
    
    return {
      success: true,
      creditEarned,
    }
  } catch (error) {
    logger.error('Error tracking referral', error instanceof Error ? error : new Error(String(error)))
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track referral',
    }
  }
}

/**
 * Apply referral credit to user's account
 */
async function applyReferralCredit(userId: string, amount: number, orderId: string): Promise<void> {
  const now = new Date()
  
  // Get or create customer credit record
  let creditRecord = await db.query.customerCredits.findFirst({
    where: eq(customerCredits.customerId, userId),
  })
  
  if (!creditRecord) {
    await db.insert(customerCredits).values({
      id: nanoid(),
      customerId: userId,
      balance: amount,
      totalEarned: amount,
      totalUsed: 0,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    await db.update(customerCredits)
      .set({
        balance: sql`${customerCredits.balance} + ${amount}`,
        totalEarned: sql`${customerCredits.totalEarned} + ${amount}`,
        updatedAt: now,
      })
      .where(eq(customerCredits.customerId, userId))
  }
  
  // Create transaction record
  await db.insert(creditTransactions).values({
    id: nanoid(),
    customerId: userId,
    type: 'earned',
    amount,
    balance: (creditRecord?.balance || 0) + amount,
    description: `Brand ambassador credit from referral (Order: ${orderId})`,
    metadata: {
      orderId,
      reason: 'referral_purchase',
      creditAmount: amount,
    },
    createdAt: now,
  })
}

// ============================================================================
// BRAND AMBASSADOR DASHBOARD
// ============================================================================

export interface BrandAmbassadorStats {
  totalBlends: number
  totalShares: number
  totalViews: number
  totalReferrals: number
  totalCreditsEarned: number
  topPerformingBlends: Array<{
    blendId: string
    name: string
    shareCode: string
    purchases: number
    creditsEarned: number
  }>
}

/**
 * Get brand ambassador stats for a user
 */
export async function getBrandAmbassadorStats(userId: string): Promise<BrandAmbassadorStats> {
  const blends = await db.query.userBlends.findMany({
    where: and(
      eq(userBlends.userId, userId),
      eq(userBlends.isDeleted, false),
      eq(userBlends.isBrandAmbassadorEnabled, true)
    ),
  })
  
  const referrals = await db.query.blendReferrals.findMany({
    where: eq(blendReferrals.referrerUserId, userId),
  })
  
  const totalCredits = blends.reduce((sum, b) => sum + (b.totalCreditsEarned ?? 0), 0)
  
  // Sort by performance
  const topBlends = blends
    .filter(b => (b.totalPurchasesViaShare ?? 0) > 0)
    .sort((a, b) => (b.totalPurchasesViaShare ?? 0) - (a.totalPurchasesViaShare ?? 0))
    .slice(0, 5)
    .map(b => ({
      blendId: b.id,
      name: b.name,
      shareCode: b.shareCode,
      purchases: b.totalPurchasesViaShare ?? 0,
      creditsEarned: b.totalCreditsEarned ?? 0,
    }))
  
  return {
    totalBlends: blends.length,
    totalShares: blends.reduce((sum, b) => sum + (b.totalShares ?? 0), 0),
    totalViews: blends.reduce((sum, b) => sum + (b.totalViews ?? 0), 0),
    totalReferrals: referrals.length,
    totalCreditsEarned: totalCredits,
    topPerformingBlends: topBlends,
  }
}

/**
 * Get referral history for a user
 */
export async function getReferralHistory(userId: string) {
  return db.query.blendReferrals.findMany({
    where: eq(blendReferrals.referrerUserId, userId),
    orderBy: desc(blendReferrals.createdAt),
  })
}

// ============================================================================
// SHARE LINK UTILITIES
// ============================================================================

/**
 * Generate a shareable URL for a blend
 */
export function generateShareUrl(shareCode: string): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://oilamor.com'}/mixing-atelier?ref=${shareCode}`
}

/**
 * Extract share code from URL
 */
export function extractShareCodeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('ref')
  } catch {
    return null
  }
}

/**
 * Increment share count when user shares a blend
 */
export async function recordBlendShare(blendId: string): Promise<void> {
  await db.update(userBlends)
    .set({
      totalShares: sql`${userBlends.totalShares} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userBlends.id, blendId))
}

/**
 * Increment view count (call when someone visits via share link)
 */
export async function recordBlendView(shareCode: string): Promise<void> {
  await db.update(userBlends)
    .set({
      totalViews: sql`${userBlends.totalViews} + 1`,
    })
    .where(eq(userBlends.shareCode, shareCode))
}
