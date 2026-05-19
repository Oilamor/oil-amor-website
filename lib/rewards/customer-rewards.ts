/**
 * Customer Rewards Profile Management
 * 
 * Uses Redis as the SINGLE SOURCE OF TRUTH for customer rewards data.
 * All reads and writes are persisted to Redis with no TTL.
 * 
 * Handles customer rewards data, tier progression, account credits,
 * with Redis-backed persistent storage.
 */

import { Redis } from 'ioredis';
import {
  TierLevel,
  ChainType,
  calculateTier,
  getNextTier,
  getTierProgressDetails,
  checkTierUpgrade,
  CRYSTAL_CIRCLE_TIERS
} from './tiers';
import { getAvailableChains } from './chain-system';
import { getAvailableCharms } from './charm-system';
import { 
  getCustomerRewardsData, 
  updateCustomerRewardsData 
} from './rewards-store';
import { logger } from '@/lib/logging/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CrystalCount {
  crystalType: string;
  count: number;
  lastAcquired: Date;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'expired' | 'adjusted';
  reason: string;
  orderId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface CustomerRewardsProfile {
  customerId: string;
  currentTier: TierLevel;
  totalSpend: number;
  lifetimePurchases: number;
  purchaseCount: number;
  unlockedChains: ChainType[];
  unlockedCharms: string[];
  accountCredit: number;
  reservedCredit: number;
  refillDiscount: number;
  refillUnlocked: boolean;
  cordsOwned: number;
  crystalsCollected: CrystalCount[];
  progressToNextTier: {
    current: number;
    target: number;
    percentage: number;
    amountNeeded: number;
    nextTierName: string | null;
  };
  memberSince: Date;
  lastPurchaseDate?: Date;
  creditHistory: CreditTransaction[];
}

export interface RewardsUpdateResult {
  profile: CustomerRewardsProfile;
  tierUpgraded: boolean;
  previousTier?: TierLevel;
  newTier?: TierLevel;
  newChainsUnlocked: ChainType[];
  newCharmsUnlocked: string[];
  notifications: RewardsNotification[];
}

export interface RewardsNotification {
  type: 'tier_upgrade' | 'chain_unlock' | 'charm_unlock' | 'credit_earned' | 'milestone' | 'refill_unlocked';
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

export interface OrderInfo {
  orderId: string;
  orderTotal: number;
  items: OrderItem[];
  isRefill: boolean;
  refillDiscountApplied?: number;
}

export interface OrderItem {
  productId: string;
  productType: 'oil' | 'chain' | 'charm' | 'cord' | 'crystal' | '30ml_bottle';
  quantity: number;
  price: number;
}

// ============================================================================
// REDIS CLIENT INITIALIZATION
// ============================================================================

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Cache keys
const CACHE_KEYS = {
  profile: (customerId: string) => `rewards:customer:${customerId}`,
  chains: (customerId: string) => `rewards:chains:${customerId}`,
  charms: (customerId: string) => `rewards:charms:${customerId}`,
  credit: (customerId: string) => `rewards:credit:${customerId}`,
  reservation: (reservationId: string) => `rewards:reservation:${reservationId}`
};

const CACHE_TTL = 3600; // 1 hour in seconds

// ============================================================================
// PROFILE MANAGEMENT - REDIS SOURCE OF TRUTH
// ============================================================================

/**
 * Get customer rewards profile from Redis (source of truth)
 * @param customerId - Customer's unique identifier
 * @returns Complete rewards profile
 */
export async function getCustomerRewardsProfile(
  customerId: string
): Promise<CustomerRewardsProfile> {
  // Try cache first
  const cacheKey = CACHE_KEYS.profile(customerId);
  const cached = await getCache<CustomerRewardsProfile>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from Redis (source of truth)
  const profile = await fetchProfileFromStore(customerId);
  
  // Cache for 1 hour
  await setCache(cacheKey, profile, CACHE_TTL);
  
  return profile;
}

/**
 * Fetch profile from Redis (SOURCE OF TRUTH)
 * @param customerId - Customer's unique identifier
 * @returns Customer rewards profile
 */
async function fetchProfileFromStore(
  customerId: string
): Promise<CustomerRewardsProfile> {
  const metafields = await getCustomerRewardsData(customerId);
  
  const tier = (metafields.crystal_circle_tier as TierLevel) || 'seed';
  const totalSpend = metafields.total_spend || 0;
  const purchaseCount = metafields.purchase_count || 0;
  
  return {
    customerId,
    currentTier: tier,
    totalSpend,
    lifetimePurchases: totalSpend,
    purchaseCount,
    unlockedChains: (metafields.unlocked_chains as ChainType[]) || CRYSTAL_CIRCLE_TIERS[tier].unlockedChains,
    unlockedCharms: (metafields.collected_charms as string[]) || [],
    accountCredit: metafields.account_credit || 0,
    reservedCredit: 0, // Tracked separately in credit reservations
    refillDiscount: CRYSTAL_CIRCLE_TIERS[tier].refillDiscount,
    refillUnlocked: metafields.refill_unlocked || false,
    cordsOwned: 0, // Would need separate tracking
    crystalsCollected: [], // Would need separate tracking
    progressToNextTier: getTierProgressDetails(totalSpend, tier),
    memberSince: new Date(metafields.last_purchase_date || Date.now()),
    lastPurchaseDate: metafields.last_purchase_date 
      ? new Date(metafields.last_purchase_date) 
      : undefined,
    creditHistory: [] // Credit history would be stored in separate metafield or database
  };
}

/**
 * Save profile to Redis (SOURCE OF TRUTH)
 * Also invalidates the cache
 * @param profile - Customer rewards profile to save
 */
async function saveProfileToStore(
  profile: CustomerRewardsProfile
): Promise<void> {
  await updateCustomerRewardsData(profile.customerId, {
    crystal_circle_tier: profile.currentTier,
    total_spend: profile.totalSpend,
    purchase_count: profile.purchaseCount,
    account_credit: profile.accountCredit,
    unlocked_chains: profile.unlockedChains,
    collected_charms: profile.unlockedCharms,
    refill_unlocked: profile.refillUnlocked,
    last_purchase_date: profile.lastPurchaseDate?.toISOString(),
  });
  
  // Invalidate cache after update
  await invalidateProfileCache(profile.customerId);
}

/**
 * Create default profile for new customers
 * @param customerId - Customer's unique identifier
 * @returns Default rewards profile
 */
export function createDefaultProfile(customerId: string): CustomerRewardsProfile {
  return {
    customerId,
    currentTier: 'seed',
    totalSpend: 0,
    lifetimePurchases: 0,
    purchaseCount: 0,
    unlockedChains: [],
    unlockedCharms: [],
    accountCredit: 0,
    reservedCredit: 0,
    refillDiscount: 0,
    refillUnlocked: false,
    cordsOwned: 0,
    crystalsCollected: [],
    progressToNextTier: getTierProgressDetails(0, 'seed'),
    memberSince: new Date(),
    creditHistory: []
  };
}

// ============================================================================
// SPEND & TIER UPDATES
// ============================================================================

/**
 * Update customer spend and handle tier progression
 * @param customerId - Customer's unique identifier
 * @param orderInfo - Order information
 * @returns Updated profile with upgrade details
 */
export async function updateCustomerSpend(
  customerId: string,
  orderInfo: OrderInfo
): Promise<RewardsUpdateResult> {
  const profile = await getCustomerRewardsProfile(customerId);
  const previousSpend = profile.totalSpend;
  const previousTier = profile.currentTier;
  const previousPurchaseCount = profile.purchaseCount;

  // Calculate new totals
  const newTotalSpend = previousSpend + orderInfo.orderTotal;
  const newTier = calculateTier(newTotalSpend);
  const newPurchaseCount = previousPurchaseCount + 1;
  
  // Check for tier upgrade
  const tierCheck = checkTierUpgrade(previousSpend, newTotalSpend);
  
  // Update profile
  profile.totalSpend = newTotalSpend;
  profile.lifetimePurchases += orderInfo.orderTotal;
  profile.purchaseCount = newPurchaseCount;
  profile.currentTier = newTier;
  profile.lastPurchaseDate = new Date();
  profile.refillDiscount = CRYSTAL_CIRCLE_TIERS[newTier].refillDiscount;
  
  // Update unlocked chains based on new tier
  const newChainsUnlocked: ChainType[] = [];
  const availableChains = getAvailableChains(newTier);
  for (const chain of availableChains) {
    if (!profile.unlockedChains.includes(chain.type) && !chain.isLocked) {
      profile.unlockedChains.push(chain.type);
      newChainsUnlocked.push(chain.type);
    }
  }
  
  // Update unlocked charms
  const newCharmsUnlocked: string[] = [];
  const availableCharms = getAvailableCharms(newPurchaseCount, newTier);
  for (const charm of availableCharms) {
    if (!profile.unlockedCharms.includes(charm.id) && !charm.isLocked && charm.id !== 'all') {
      profile.unlockedCharms.push(charm.id);
      newCharmsUnlocked.push(charm.id);
    }
  }
  
  // Handle Luminary "all charms" unlock
  if (newTier === 'luminary' && !profile.unlockedCharms.includes('all')) {
    profile.unlockedCharms = ['all'];
    newCharmsUnlocked.push('all');
  }
  
  // Check for refill unlock (first 30ml purchase)
  const has30mlBottle = orderInfo.items.some(item => item.productType === '30ml_bottle');
  let refillUnlocked = false;
  if (has30mlBottle && !profile.refillUnlocked) {
    profile.refillUnlocked = true;
    refillUnlocked = true;
  }
  
  // Update progress tracking
  profile.progressToNextTier = getTierProgressDetails(newTotalSpend, newTier);
  
  // Save to Redis (source of truth)
  await saveProfileToStore(profile);
  
  // Generate notifications
  const notifications = generateNotifications(
    tierCheck,
    newChainsUnlocked,
    newCharmsUnlocked,
    refillUnlocked,
    profile
  );
  
  return {
    profile,
    tierUpgraded: tierCheck.upgraded,
    previousTier: tierCheck.previousTier,
    newChainsUnlocked,
    newCharmsUnlocked,
    notifications
  };
}

/**
 * Upgrade customer tier manually (for admin use)
 * @param customerId - Customer's unique identifier
 * @param newTier - New tier level
 */
export async function upgradeCustomerTier(
  customerId: string,
  newTier: TierLevel
): Promise<void> {
  const profile = await getCustomerRewardsProfile(customerId);
  
  if (profile.currentTier === newTier) {
    return;
  }
  
  profile.currentTier = newTier;
  profile.refillDiscount = CRYSTAL_CIRCLE_TIERS[newTier].refillDiscount;
  
  // Unlock chains for new tier
  const tierConfig = CRYSTAL_CIRCLE_TIERS[newTier];
  for (const chain of tierConfig.unlockedChains) {
    if (!profile.unlockedChains.includes(chain)) {
      profile.unlockedChains.push(chain);
    }
  }
  
  // Unlock charms
  for (const charm of tierConfig.unlockedCharms) {
    if (!profile.unlockedCharms.includes(charm)) {
      profile.unlockedCharms.push(charm);
    }
  }
  
  await saveProfileToStore(profile);
}

/**
 * Unlock refill for customer
 * @param customerId - Customer's unique identifier
 */
export async function unlockRefillForCustomer(customerId: string): Promise<void> {
  const profile = await getCustomerRewardsProfile(customerId);
  profile.refillUnlocked = true;
  await saveProfileToStore(profile);
}

/**
 * Generate notifications for rewards events
 */
function generateNotifications(
  tierCheck: ReturnType<typeof checkTierUpgrade>,
  newChains: ChainType[],
  newCharms: string[],
  refillUnlocked: boolean,
  profile: CustomerRewardsProfile
): RewardsNotification[] {
  const notifications: RewardsNotification[] = [];
  
  // Tier upgrade notification
  if (tierCheck.upgraded) {
    const tierNames = tierCheck.tiersCrossed.map(t => CRYSTAL_CIRCLE_TIERS[t].name);
    notifications.push({
      type: 'tier_upgrade',
      title: tierCheck.tiersCrossed.length > 1 
        ? `Multi-Tier Ascension!` 
        : `Welcome to ${tierNames[0]}!`,
      message: `Congratulations! You've reached ${tierNames.join(' → ')} tier.`,
      metadata: {
        tiersCrossed: tierCheck.tiersCrossed,
        newBenefits: CRYSTAL_CIRCLE_TIERS[tierCheck.newTier].benefits
      }
    });
  }
  
  // Chain unlock notifications
  for (const chain of newChains) {
    notifications.push({
      type: 'chain_unlock',
      title: 'New Chain Unlocked!',
      message: `You've unlocked the ${chain} chain for your diffuser jewelry.`,
      metadata: { chainType: chain }
    });
  }
  
  // Charm unlock notifications
  for (const charm of newCharms) {
    if (charm !== 'all') {
      notifications.push({
        type: 'charm_unlock',
        title: 'New Charm Available!',
        message: 'A new charm has been added to your collection.',
        metadata: { charmId: charm }
      });
    }
  }
  
  // Refill unlock notification
  if (refillUnlocked) {
    notifications.push({
      type: 'refill_unlocked',
      title: 'Forever Bottle Unlocked!',
      message: 'You can now order refills for your 30ml bottles.',
      metadata: {}
    });
  }
  
  // Milestone notifications
  const milestones = [5, 10, 25, 50, 100];
  if (milestones.includes(profile.purchaseCount)) {
    notifications.push({
      type: 'milestone',
      title: `${profile.purchaseCount} Purchases!`,
      message: `Thank you for ${profile.purchaseCount} purchases with Oil Amor.`,
      metadata: { purchaseCount: profile.purchaseCount }
    });
  }
  
  return notifications;
}

// ============================================================================
// ACCOUNT CREDIT MANAGEMENT
// ============================================================================

/**
 * Add account credit to customer's balance
 * @param customerId - Customer's unique identifier
 * @param amount - Amount to add (must be positive)
 * @param reason - Reason for credit
 * @param expiresInDays - Optional expiration period
 * @returns New account balance
 */
export async function addAccountCredit(
  customerId: string,
  amount: number,
  reason: string,
  expiresInDays?: number
): Promise<number> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }
  
  const profile = await getCustomerRewardsProfile(customerId);
  
  const transaction: CreditTransaction = {
    id: generateTransactionId(),
    amount,
    type: 'earned',
    reason,
    createdAt: new Date(),
    expiresAt: expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined
  };
  
  profile.accountCredit += amount;
  profile.creditHistory.push(transaction);
  
  await saveProfileToStore(profile);
  
  return profile.accountCredit;
}

/**
 * Use account credit for an order
 * @param customerId - Customer's unique identifier
 * @param amount - Amount to use
 * @param orderId - Associated order ID
 * @returns Boolean indicating success
 */
export async function useAccountCredit(
  customerId: string,
  amount: number,
  orderId: string
): Promise<boolean> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }
  
  const profile = await getCustomerRewardsProfile(customerId);
  
  if (profile.accountCredit < amount) {
    return false;
  }
  
  const transaction: CreditTransaction = {
    id: generateTransactionId(),
    amount: -amount,
    type: 'spent',
    reason: 'Applied to order',
    orderId,
    createdAt: new Date()
  };
  
  profile.accountCredit -= amount;
  profile.creditHistory.push(transaction);
  
  await saveProfileToStore(profile);
  
  return true;
}

/**
 * Get available account credit (excluding reserved)
 * @param customerId - Customer's unique identifier
 * @returns Available credit amount
 */
export async function getAvailableCredit(customerId: string): Promise<number> {
  const profile = await getCustomerRewardsProfile(customerId);
  return Math.max(0, profile.accountCredit - profile.reservedCredit);
}

/**
 * Get credit transaction history
 * @param customerId - Customer's unique identifier
 * @param limit - Maximum number of transactions to return
 * @returns Array of credit transactions
 */
export async function getCreditHistory(
  customerId: string,
  limit: number = 20
): Promise<CreditTransaction[]> {
  const profile = await getCustomerRewardsProfile(customerId);
  
  return profile.creditHistory
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

// ============================================================================
// CREDIT RESERVATION SYSTEM
// ============================================================================

export interface CreditReservation {
  id: string;
  customerId: string;
  amount: number;
  status: 'pending' | 'committed' | 'released';
  discountCode: string;
  createdAt: Date;
  expiresAt: Date;
  committedAt?: Date;
  releasedAt?: Date;
}

/**
 * Reserve credit for checkout
 * Deducts from available credit and creates a reservation
 * @param customerId - Customer's unique identifier
 * @param amount - Amount to reserve
 * @returns Reservation details with discount code
 */
export async function reserveCreditForCheckout(
  customerId: string,
  amount: number
): Promise<{ reservationId: string; discountCode: string }> {
  const profile = await getCustomerRewardsProfile(customerId);
  
  // Check available balance (excluding already reserved)
  const availableCredit = profile.accountCredit - profile.reservedCredit;
  if (availableCredit < amount) {
    throw new Error(`Insufficient credit. Available: ${availableCredit}, Requested: ${amount}`);
  }
  
  // Generate reservation ID and discount code
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const discountCode = `CREDIT-${customerId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;
  
  // Create reservation
  const reservation: CreditReservation = {
    id: reservationId,
    customerId,
    amount,
    status: 'pending',
    discountCode,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  };
  
  // Update profile reserved credit
  profile.reservedCredit += amount;
  
  // Save to Redis (reservations are temporary)
  await setCache(CACHE_KEYS.reservation(reservationId), reservation, 30 * 60);
  
  // Update profile in Redis
  await saveProfileToStore(profile);
  
  return { reservationId, discountCode };
}

/**
 * Commit a credit reservation (order completed)
 * Deducts the reserved amount from account credit
 * @param reservationId - Reservation ID
 */
export async function commitCreditReservation(reservationId: string): Promise<void> {
  const reservation = await getCache<CreditReservation>(CACHE_KEYS.reservation(reservationId));
  if (!reservation || reservation.status !== 'pending') {
    throw new Error('Invalid or expired reservation');
  }
  
  const profile = await getCustomerRewardsProfile(reservation.customerId);
  
  // Deduct from account credit
  profile.accountCredit -= reservation.amount;
  profile.reservedCredit -= reservation.amount;
  
  // Add transaction record
  profile.creditHistory.push({
    id: generateTransactionId(),
    amount: -reservation.amount,
    type: 'spent',
    reason: 'Applied to order via reservation',
    createdAt: new Date()
  });
  
  // Update reservation status
  reservation.status = 'committed';
  reservation.committedAt = new Date();
  
  // Save changes
  await saveProfileToStore(profile);
  await setCache(CACHE_KEYS.reservation(reservationId), reservation, 24 * 60 * 60);
}

/**
 * Release a credit reservation (order abandoned/cancelled)
 * Returns reserved credit to available balance
 * @param reservationId - Reservation ID
 */
export async function releaseCreditReservation(reservationId: string): Promise<void> {
  const reservation = await getCache<CreditReservation>(CACHE_KEYS.reservation(reservationId));
  if (!reservation || reservation.status !== 'pending') {
    return; // Already handled
  }
  
  const profile = await getCustomerRewardsProfile(reservation.customerId);
  
  // Return reserved credit
  profile.reservedCredit = Math.max(0, profile.reservedCredit - reservation.amount);
  
  // Update reservation status
  reservation.status = 'released';
  reservation.releasedAt = new Date();
  
  // Save changes
  await saveProfileToStore(profile);
  await setCache(CACHE_KEYS.reservation(reservationId), reservation, 24 * 60 * 60);
}

// ============================================================================
// CACHING HELPERS
// ============================================================================

async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    logger.error('Redis cache error', error instanceof Error ? error : new Error(String(error)));
  }
  return null;
}

async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis cache error', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Invalidate cached profile
 * @param customerId - Customer's unique identifier
 */
export async function invalidateProfileCache(customerId: string): Promise<void> {
  try {
    await redis.del(CACHE_KEYS.profile(customerId));
  } catch (error) {
    logger.error('Redis cache error', error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// ORDER PROCESSING
// ============================================================================

/**
 * Process a local order for rewards updates
 * @param customerId - Customer's unique identifier
 * @param orderInfo - Order information
 * @returns Updated profile with upgrade details
 */
export async function processOrderForRewards(
  customerId: string,
  orderInfo: OrderInfo
): Promise<RewardsUpdateResult> {
  const result = await updateCustomerSpend(customerId, orderInfo);

  // Send tier upgrade notification if applicable
  if (result.tierUpgraded) {
    await sendTierUpgradeNotification(customerId, result.profile.currentTier);
  }

  // Send charm unlock notifications
  for (const charmId of result.newCharmsUnlocked) {
    await sendCharmUnlockNotification(customerId, charmId);
  }

  // Invalidate cache
  await invalidateProfileCache(customerId);

  return result;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Send tier upgrade notification
 * @param customerId - Customer's unique identifier
 * @param newTier - New tier level
 */
async function sendTierUpgradeNotification(
  customerId: string,
  newTier: TierLevel
): Promise<void> {
  const tierConfig = CRYSTAL_CIRCLE_TIERS[newTier];
  
  // In production, integrate with email service or notification system
  // Example: await sendEmail(customerId, 'tier-upgrade', { tier: tierConfig });
}

/**
 * Send charm unlock notification
 * @param customerId - Customer's unique identifier
 * @param charmId - Charm ID
 */
async function sendCharmUnlockNotification(
  customerId: string,
  charmId: string
): Promise<void> {
  
  // In production, integrate with email service or notification system
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get multiple customer profiles in one call
 * @param customerIds - Array of customer IDs
 * @returns Array of customer profiles
 */
export async function getBatchCustomerProfiles(
  customerIds: string[]
): Promise<CustomerRewardsProfile[]> {
  const profiles = await Promise.all(
    customerIds.map(id => getCustomerRewardsProfile(id).catch(() => null))
  );
  
  return profiles.filter((p): p is CustomerRewardsProfile => p !== null);
}
