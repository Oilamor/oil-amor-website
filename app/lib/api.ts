/**
 * API Utilities
 * Real API functions for fetching synergy content and customer data
 * Connected to Sanity backend via lib/content modules
 */

import { SynergyContent, Crystal } from '../types'
import { getSynergyContent as getContentFromCMS } from '../../lib/content/synergy'
import { getAllCrystals, getAvailableCrystals } from '../../lib/content/crystals'
import { getCustomerTier } from '../../lib/rewards/tiers'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// SYNERGY CONTENT API
// ============================================================================

/**
 * Fetch synergy content for an oil-crystal combination
 * Uses real CMS data with fallback logic
 */
export async function fetchSynergyContent(
  oilSlug: string,
  crystalSlug: string
): Promise<SynergyContent | null> {
  try {
    const response = await getContentFromCMS(oilSlug, crystalSlug)
    
    if (!response) {
      return null
    }
    
    return response
  } catch (error) {
    logger.error('Error fetching synergy content:', error instanceof Error ? error : new Error(String(error)))
    return null
  }
}

/**
 * Fetch all available crystals
 */
export async function fetchCrystalsForOil(
  oilSlug?: string
): Promise<Crystal[]> {
  try {
    // If oilSlug is provided, we could filter by compatible crystals
    // For now, return all available crystals
    // Note: getAvailableCrystals already returns Crystal[] in the expected format
    return await getAvailableCrystals('seed')
  } catch (error) {
    logger.error('Error fetching crystals:', error instanceof Error ? error : new Error(String(error)))
    return []
  }
}

/**
 * Fetch customer tier based on purchase history
 */
export async function fetchCustomerTier(
  customerId: string
): Promise<{ tier: string; history: unknown }> {
  try {
    const tierInfo = await getCustomerTier(customerId)
    
    return {
      tier: tierInfo.tier,
      history: {
        totalSpend: tierInfo.spend,
        // These would come from a more detailed API in production
        totalOrders: 0,
        totalBottles: 0,
        uniqueOils: [],
        uniqueCrystals: [],
      },
    }
  } catch (error) {
    logger.error('Error fetching customer tier:', error instanceof Error ? error : new Error(String(error)))
    // Return default tier on error
    return {
      tier: 'seed',
      history: {
        totalOrders: 0,
        totalBottles: 0,
        totalSpend: 0,
        uniqueOils: [],
        uniqueCrystals: [],
      },
    }
  }
}


