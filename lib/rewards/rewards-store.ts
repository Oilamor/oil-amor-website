/**
 * Local Rewards Data Store
 * 
 * Replaces Shopify customer metafields as the source of truth
 * for customer rewards data. Uses Redis for persistence.
 * 
 * This module provides drop-in replacements for:
 *   - getCustomerMetafields(customerId)
 *   - updateCustomerMetafields(customerId, data)
 */

import { Redis } from 'ioredis';
import { logger } from '@/lib/logging/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

const REWARDS_KEY = (customerId: string) => `rewards:data:${customerId}`;

// No TTL — rewards data is persistent
const REWARDS_TTL = 0;

export interface RewardsData {
  crystal_circle_tier?: string;
  total_spend?: number;
  purchase_count?: number;
  account_credit?: number;
  unlocked_chains?: string[];
  collected_charms?: string[];
  refill_unlocked?: boolean;
  last_purchase_date?: string;
  tier_upgrade_date?: string;
  preferred_chain?: string;
  last_chain_selected?: string;
  chain_history?: unknown[];
  equipped_charm?: string | null;
  charm_claims?: unknown[];
  [key: string]: unknown;
}

/**
 * Get customer rewards data from Redis
 * @param customerId - Customer's unique identifier
 * @returns Rewards data object (empty if not found)
 */
export async function getCustomerRewardsData(
  customerId: string
): Promise<RewardsData> {
  try {
    const data = await redis.get(REWARDS_KEY(customerId));
    if (data) {
      return JSON.parse(data) as RewardsData;
    }
  } catch (error) {
    logger.error('Rewards store read error', error instanceof Error ? error : new Error(String(error)));
  }
  return {};
}

/**
 * Update customer rewards data in Redis
 * Merges new data with existing data
 * @param customerId - Customer's unique identifier
 * @param data - Partial rewards data to merge
 */
export async function updateCustomerRewardsData(
  customerId: string,
  data: Partial<RewardsData>
): Promise<void> {
  try {
    const existing = await getCustomerRewardsData(customerId);
    const merged = { ...existing, ...data };
    
    if (REWARDS_TTL > 0) {
      await redis.setex(REWARDS_KEY(customerId), REWARDS_TTL, JSON.stringify(merged));
    } else {
      await redis.set(REWARDS_KEY(customerId), JSON.stringify(merged));
    }
  } catch (error) {
    logger.error('Rewards store write error', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete customer rewards data (for GDPR/account deletion)
 * @param customerId - Customer's unique identifier
 */
export async function deleteCustomerRewardsData(customerId: string): Promise<void> {
  try {
    await redis.del(REWARDS_KEY(customerId));
  } catch (error) {
    logger.error('Rewards store delete error', error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// These match the old Shopify metafield function signatures
// ============================================================================

/**
 * @deprecated Use getCustomerRewardsData instead
 */
export async function getCustomerMetafields(customerId: string): Promise<RewardsData> {
  return getCustomerRewardsData(customerId);
}

/**
 * @deprecated Use updateCustomerRewardsData instead
 */
export async function updateCustomerMetafields(
  customerId: string,
  data: Partial<RewardsData>
): Promise<void> {
  return updateCustomerRewardsData(customerId, data);
}
