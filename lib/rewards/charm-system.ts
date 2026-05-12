/**
 * Charm Collection & Unlock System
 * 
 * Manages collectible diffuser charms that customers unlock through
 * purchase milestones and tier achievements.
 * 
 * Charm claims are persisted to Redis rewards store.
 */

import {
  TierLevel,
  CRYSTAL_CIRCLE_TIERS,
  TIER_ORDER,
  compareTiers
} from './tiers';
import { getCustomerRewardsProfile, invalidateProfileCache } from './customer-rewards';
import { updateCustomerRewardsData, getCustomerRewardsData } from './rewards-store';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CharmConfig {
  id: string;
  name: string;
  material: string;
  meaning: string;
  description: string;
  unlockCondition: UnlockCondition;
  image: string;
  compatibleChains: string[];
  careInstructions: string[];
  limitedEdition: boolean;
}

export type UnlockCondition =
  | { type: 'purchase_count'; count: number }
  | { type: 'tier'; tier: TierLevel }
  | { type: 'special'; description: string };

export interface CharmOption {
  id: string;
  config: CharmConfig;
  isLocked: boolean;
  isCollected: boolean;
  progressToUnlock: number;
  purchasesNeeded?: number;
}

export interface CustomerCharmCollection {
  customerId: string;
  collectedCharms: string[];
  equippedCharm: string | null;
  collectionProgress: {
    total: number;
    collected: number;
    percentage: number;
  };
}

export interface CharmMilestone {
  purchaseCount: number;
  charms: string[];
}

export interface CharmClaim {
  charmId: string;
  claimedAt: Date;
  orderId?: string;
  source: 'purchase_milestone' | 'tier_unlock' | 'special';
}

// ============================================================================
// CHARM CATALOG
// ============================================================================

export const CHARM_CATALOG: Record<string, CharmConfig> = {
  'crescent-moon': {
    id: 'crescent-moon',
    name: 'Crescent Moon',
    material: 'Brass',
    meaning: 'Intuition, cycles, feminine energy',
    description: 'The crescent moon represents the rhythm of time, lunar energy, and the power of intuition. Wear this charm to honor your inner wisdom and embrace life\'s natural cycles.',
    unlockCondition: { type: 'purchase_count', count: 3 },
    image: '/charms/crescent-moon.jpg',
    compatibleChains: ['silver-plated', 'gold-plated', 'sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Clean with soft, dry cloth',
      'Avoid exposure to water',
      'Store in dry place'
    ],
    limitedEdition: false
  },
  'lotus-flower': {
    id: 'lotus-flower',
    name: 'Lotus Flower',
    material: 'Silver-Plated',
    meaning: 'Purity, spiritual awakening, resilience',
    description: 'Like the lotus that blooms from muddy waters, this charm symbolizes rising above challenges. A reminder of your strength and the beauty that emerges from growth.',
    unlockCondition: { type: 'purchase_count', count: 5 },
    image: '/charms/lotus-flower.jpg',
    compatibleChains: ['silver-plated', 'gold-plated', 'sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Polish gently with silver cloth',
      'Store in anti-tarnish pouch',
      'Remove before swimming'
    ],
    limitedEdition: false
  },
  'tree-of-life': {
    id: 'tree-of-life',
    name: 'Tree of Life',
    material: 'Gold-Plated',
    meaning: 'Growth, connection, family, strength',
    description: 'The Tree of Life represents the interconnectedness of all things. Its roots deep in the earth, branches reaching to the sky—a symbol of your grounded yet aspirational journey.',
    unlockCondition: { type: 'purchase_count', count: 7 },
    image: '/charms/tree-of-life.jpg',
    compatibleChains: ['gold-plated', 'sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Wipe with soft cloth',
      'Keep away from chemicals',
      'Store separately'
    ],
    limitedEdition: false
  },
  'evil-eye': {
    id: 'evil-eye',
    name: 'Evil Eye',
    material: 'Enamel & Silver',
    meaning: 'Protection, warding negativity',
    description: 'An ancient symbol of protection across many cultures. The evil eye charm guards against negative energy and brings peace of mind to your daily rituals.',
    unlockCondition: { type: 'purchase_count', count: 10 },
    image: '/charms/evil-eye.jpg',
    compatibleChains: ['silver-plated', 'gold-plated', 'sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Handle enamel carefully',
      'Avoid dropping or impact',
      'Clean with soft, damp cloth'
    ],
    limitedEdition: false
  },
  'compass': {
    id: 'compass',
    name: 'Compass',
    material: 'Sterling Silver',
    meaning: 'Direction, journey, guidance',
    description: 'Let this compass guide you on your wellness journey. A symbol of finding your true north and trusting your path, wherever it may lead.',
    unlockCondition: { type: 'tier', tier: 'radiance' },
    image: '/charms/compass.jpg',
    compatibleChains: ['sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Polish regularly',
      'Store in anti-tarnish bag',
      'Professional cleaning recommended'
    ],
    limitedEdition: false
  },
  'sunburst': {
    id: 'sunburst',
    name: 'Sunburst',
    material: '14k Gold-Filled',
    meaning: 'Energy, vitality, illumination',
    description: 'Radiate positive energy with the sunburst charm. A symbol of your luminous spirit and the light you bring to the world. Exclusive to Luminary members.',
    unlockCondition: { type: 'tier', tier: 'luminary' },
    image: '/charms/sunburst.jpg',
    compatibleChains: ['14k-gold-filled'],
    careInstructions: [
      'Can wear daily',
      'Clean with mild soap',
      'Buff to maintain shine'
    ],
    limitedEdition: false
  },
  'custom-initial': {
    id: 'custom-initial',
    name: 'Custom Initial',
    material: 'Sterling Silver',
    meaning: 'Personal identity, individuality',
    description: 'Your story, your identity. This custom initial charm celebrates your unique journey. Handcrafted with your chosen letter—a truly personal treasure.',
    unlockCondition: { type: 'tier', tier: 'luminary' },
    image: '/charms/custom-initial.jpg',
    compatibleChains: ['sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Handle with care',
      'Polish regularly',
      'Store in soft pouch'
    ],
    limitedEdition: false
  },
  'birthstone': {
    id: 'birthstone',
    name: 'Birthstone Crystal',
    material: 'Genuine Gemstone',
    meaning: 'Birth month energy, personal power',
    description: 'A genuine crystal representing your birth month. Each stone carries unique energetic properties aligned with your personal astrological signature.',
    unlockCondition: { type: 'special', description: 'Birthday gift for Bloom+ members' },
    image: '/charms/birthstone.jpg',
    compatibleChains: ['silver-plated', 'gold-plated', 'sterling-silver', '14k-gold-filled'],
    careInstructions: [
      'Clean with soft cloth only',
      'Avoid harsh chemicals',
      'Recharge in moonlight'
    ],
    limitedEdition: true
  }
};

// Display order for collection view
export const CHARM_DISPLAY_ORDER: string[] = [
  'crescent-moon',
  'lotus-flower',
  'tree-of-life',
  'evil-eye',
  'compass',
  'sunburst',
  'custom-initial',
  'birthstone'
];

// Purchase milestone definitions
export const CHARM_MILESTONES: CharmMilestone[] = [
  { purchaseCount: 3, charms: ['crescent-moon'] },
  { purchaseCount: 5, charms: ['lotus-flower'] },
  { purchaseCount: 7, charms: ['tree-of-life'] },
  { purchaseCount: 10, charms: ['evil-eye'] }
];

// ============================================================================
// CHARM AVAILABILITY FUNCTIONS
// ============================================================================

/**
 * Get available charms based on purchase count and tier
 * @param purchaseCount - Number of purchases made
 * @param tier - Current tier level
 * @returns Array of charm options with unlock status
 */
export function getAvailableCharms(
  purchaseCount: number,
  tier: TierLevel
): CharmOption[] {
  return CHARM_DISPLAY_ORDER.map((charmId): CharmOption | null => {
    const config = CHARM_CATALOG[charmId];
    if (!config) return null;
    
    const isUnlocked = isCharmUnlocked(charmId, purchaseCount, tier);
    const isCollected = false;
    const purchasesNeeded = getPurchasesNeeded(charmId, purchaseCount);
    
    return {
      id: charmId,
      config,
      isLocked: !isUnlocked,
      isCollected,
      progressToUnlock: calculateCharmProgress(charmId, purchaseCount, tier),
      ...(purchasesNeeded !== undefined ? { purchasesNeeded } : {})
    } as CharmOption;
  }).filter((c): c is CharmOption => c !== null);
}

/**
 * Check if a specific charm is unlocked
 * @param charmId - Charm identifier
 * @param purchaseCount - Number of purchases made
 * @param tier - Current tier level
 * @returns Boolean indicating unlock status
 */
export function isCharmUnlocked(
  charmId: string,
  purchaseCount: number,
  tier: TierLevel
): boolean {
  const config = CHARM_CATALOG[charmId];
  if (!config) return false;
  
  const condition = config.unlockCondition;
  
  switch (condition.type) {
    case 'purchase_count':
      return purchaseCount >= condition.count;
    
    case 'tier':
      return compareTiers(tier, condition.tier) >= 0;
    
    case 'special':
      return false;
    
    default:
      return false;
  }
}

/**
 * Calculate progress percentage to unlock a charm
 * @param charmId - Charm identifier
 * @param purchaseCount - Number of purchases made
 * @param tier - Current tier level
 * @returns Progress percentage (0-100)
 */
function calculateCharmProgress(
  charmId: string,
  purchaseCount: number,
  tier: TierLevel
): number {
  const config = CHARM_CATALOG[charmId];
  if (!config) return 0;
  
  const condition = config.unlockCondition;
  
  switch (condition.type) {
    case 'purchase_count': {
      const required = condition.count;
      const progress = Math.min(purchaseCount / required, 1);
      return Math.floor(progress * 100);
    }
    
    case 'tier': {
      const currentIndex = TIER_ORDER.indexOf(tier);
      const requiredIndex = TIER_ORDER.indexOf(condition.tier);
      
      if (currentIndex >= requiredIndex) return 100;
      
      const tiersNeeded = requiredIndex - currentIndex;
      return Math.max(0, 100 - tiersNeeded * 25);
    }
    
    case 'special':
      return 0;
    
    default:
      return 0;
  }
}

/**
 * Get number of purchases needed to unlock a charm
 * @param charmId - Charm identifier
 * @param currentPurchases - Current purchase count
 * @returns Purchases needed or null if not purchase-based
 */
function getPurchasesNeeded(
  charmId: string,
  currentPurchases: number
): number | undefined {
  const config = CHARM_CATALOG[charmId];
  if (!config || config.unlockCondition.type !== 'purchase_count') {
    return undefined;
  }
  
  const required = config.unlockCondition.count;
  return Math.max(0, required - currentPurchases);
}

/**
 * Check if customer has claimed a charm
 * @param customerId - Customer's unique identifier
 * @param charmId - Charm identifier
 * @returns Boolean indicating if claimed
 */
export async function hasCustomerClaimedCharm(
  customerId: string,
  charmId: string
): Promise<boolean> {
  const profile = await getCustomerRewardsProfile(customerId);
  
  if (profile.unlockedCharms.includes('all')) {
    return true;
  }
  
  return profile.unlockedCharms.includes(charmId);
}

/**
 * Get charms unlocked at specific purchase milestone
 * @param purchaseCount - Purchase count to check
 * @returns Array of charm IDs unlocked at this milestone
 */
export function getCharmsAtMilestone(purchaseCount: number): string[] {
  const milestone = CHARM_MILESTONES.find(m => m.purchaseCount === purchaseCount);
  return milestone?.charms || [];
}

/**
 * Get next charm milestone
 * @param purchaseCount - Current purchase count
 * @returns Next milestone info or null
 */
export function getNextCharmMilestone(
  purchaseCount: number
): { purchaseCount: number; charms: string[]; purchasesNeeded: number } | null {
  const nextMilestone = CHARM_MILESTONES.find(m => m.purchaseCount > purchaseCount);
  
  if (!nextMilestone) {
    return null;
  }
  
  return {
    purchaseCount: nextMilestone.purchaseCount,
    charms: nextMilestone.charms,
    purchasesNeeded: nextMilestone.purchaseCount - purchaseCount
  };
}

// ============================================================================
// CHARM COLLECTION MANAGEMENT - WITH PERSISTENCE
// ============================================================================

/**
 * Get customer's charm collection
 * @param customerId - Customer's unique identifier
 * @returns Customer's charm collection details
 */
export async function getCustomerCharmCollection(
  customerId: string
): Promise<CustomerCharmCollection> {
  const profile = await getCustomerRewardsProfile(customerId);
  const metafields = await getCustomerRewardsData(customerId);
  
  const totalCharms = Object.keys(CHARM_CATALOG).length;
  const collected = profile.unlockedCharms.includes('all')
    ? totalCharms
    : profile.unlockedCharms.length;
  
  return {
    customerId,
    collectedCharms: profile.unlockedCharms,
    equippedCharm: (metafields.equipped_charm as string) || null,
    collectionProgress: {
      total: totalCharms,
      collected,
      percentage: Math.floor((collected / totalCharms) * 100)
    }
  };
}

/**
 * Claim a charm for a customer
 * Persists the claim to Redis rewards store
 * 
 * @param customerId - Customer's unique identifier
 * @param charmId - Charm to claim
 * @param orderId - Optional order ID associated with the claim
 * @returns Success status with details
 */
export async function claimCharm(
  customerId: string,
  charmId: string,
  orderId?: string
): Promise<{
  success: boolean;
  error?: string;
  alreadyClaimed?: boolean;
}> {
  const profile = await getCustomerRewardsProfile(customerId);
  
  // Check if already claimed
  if (profile.unlockedCharms.includes(charmId) || profile.unlockedCharms.includes('all')) {
    return { success: false, alreadyClaimed: true };
  }
  
  // Check if charm exists
  const charm = CHARM_CATALOG[charmId];
  if (!charm) {
    return { success: false, error: 'Invalid charm ID' };
  }
  
  // Check eligibility
  const isEligible = isCharmUnlocked(charmId, profile.purchaseCount, profile.currentTier);
  if (!isEligible) {
    return { success: false, error: 'Charm not yet unlocked' };
  }
  
  // Get current rewards data for claim history
  const metafields = await getCustomerRewardsData(customerId);
  const claimHistory: CharmClaim[] = (metafields.charm_claims as CharmClaim[]) || [];
  
  // Determine source of unlock
  let source: CharmClaim['source'] = 'special';
  if (charm.unlockCondition.type === 'purchase_count') {
    source = 'purchase_milestone';
  } else if (charm.unlockCondition.type === 'tier') {
    source = 'tier_unlock';
  }
  
  // Record the claim
  const claim: CharmClaim = {
    charmId,
    claimedAt: new Date(),
    orderId,
    source
  };
  
  // Update claim history
  const updatedClaims = [...claimHistory, claim];
  
  // Update collected charms
  const updatedCharms = [...profile.unlockedCharms, charmId];
  
  // Persist to Redis rewards store
  await updateCustomerRewardsData(customerId, {
    collected_charms: updatedCharms,
    charm_claims: updatedClaims,
  });
  
  // Create notification for the customer
  await createCharmClaimNotification(customerId, charmId);
  
  // Invalidate cache
  await invalidateProfileCache(customerId);
  
  return { success: true };
}

/**
 * Equip a charm to customer's chain
 * @param customerId - Customer's unique identifier
 * @param charmId - Charm to equip
 * @returns Success status
 */
export async function equipCharm(
  customerId: string,
  charmId: string
): Promise<{ success: boolean; error?: string }> {
  const hasClaimed = await hasCustomerClaimedCharm(customerId, charmId);
  
  if (!hasClaimed) {
    return { success: false, error: 'Charm not in collection' };
  }
  
  // Persist equipped charm to Redis rewards store
  await updateCustomerRewardsData(customerId, {
    equipped_charm: charmId,
  });
  
  // Invalidate cache
  await invalidateProfileCache(customerId);
  
  return { success: true };
}

/**
 * Unequip current charm
 * @param customerId - Customer's unique identifier
 */
export async function unequipCharm(customerId: string): Promise<void> {
  // Remove equipped charm from Redis rewards store
  await updateCustomerRewardsData(customerId, {
    equipped_charm: null,
  });
  
  // Invalidate cache
  await invalidateProfileCache(customerId);
}

/**
 * Create notification for charm claim
 * @param customerId - Customer's unique identifier
 * @param charmId - Charm ID that was claimed
 */
async function createCharmClaimNotification(
  customerId: string,
  charmId: string
): Promise<void> {
  const charm = CHARM_CATALOG[charmId];
  if (!charm) return;
  
  // In production, this would create a notification in your system
  // or send an email/push notification
  
  // Example notification structure:
  // await createNotification(customerId, {
  //   type: 'charm_unlocked',
  //   title: 'New Charm Unlocked!',
  //   message: `You've unlocked the ${charm.name} charm.`,
  //   metadata: { charmId, charmName: charm.name }
  // });
}

// ============================================================================
// CHARM RECOMMENDATIONS
// ============================================================================

/**
 * Get recommended next charm for customer
 * @param purchaseCount - Current purchase count
 * @param tier - Current tier
 * @returns Recommended charm with reason
 */
export function getNextCharmRecommendation(
  purchaseCount: number,
  tier: TierLevel
): { charm: CharmOption; reason: string } | null {
  const availableCharms = getAvailableCharms(purchaseCount, tier);
  
  // Find first locked charm with highest progress
  const lockedCharms = availableCharms.filter(c => c.isLocked && !c.config.limitedEdition);
  
  if (lockedCharms.length === 0) {
    return null;
  }
  
  // Sort by progress (descending)
  lockedCharms.sort((a, b) => b.progressToUnlock - a.progressToUnlock);
  
  const nextCharm = lockedCharms[0];
  let reason = '';
  
  if (nextCharm.purchasesNeeded) {
    reason = `Just ${nextCharm.purchasesNeeded} more purchase${nextCharm.purchasesNeeded > 1 ? 's' : ''} to unlock!`;
  } else if (nextCharm.config.unlockCondition.type === 'tier') {
    reason = `Unlock at ${nextCharm.config.unlockCondition.tier} tier`;
  }
  
  return { charm: nextCharm, reason };
}

/**
 * Get recently unlocked charms
 * @param previousPurchaseCount - Previous purchase count
 * @param currentPurchaseCount - Current purchase count
 * @param tier - Current tier
 * @returns Array of newly unlocked charms
 */
export function getRecentlyUnlockedCharms(
  previousPurchaseCount: number,
  currentPurchaseCount: number,
  tier: TierLevel
): string[] {
  const newlyUnlocked: string[] = [];
  
  for (let i = previousPurchaseCount + 1; i <= currentPurchaseCount; i++) {
    const charms = getCharmsAtMilestone(i);
    newlyUnlocked.push(...charms);
  }
  
  return newlyUnlocked;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate charm ID
 * @param charmId - String to validate
 * @returns Boolean indicating if valid charm ID
 */
export function isValidCharmId(charmId: string): boolean {
  return charmId in CHARM_CATALOG;
}

/**
 * Get charm display info
 * @param charmId - Charm identifier
 * @returns Display information
 */
export function getCharmDisplayInfo(charmId: string): {
  name: string;
  meaning: string;
  material: string;
  image: string;
} | null {
  const config = CHARM_CATALOG[charmId];
  if (!config) return null;
  
  return {
    name: config.name,
    meaning: config.meaning,
    material: config.material,
    image: config.image
  };
}

/**
 * Get charms by tier requirement
 * @param tier - Tier level
 * @returns Array of charm IDs requiring this tier
 */
export function getCharmsByTier(tier: TierLevel): string[] {
  return Object.entries(CHARM_CATALOG)
    .filter(([, config]) => {
      return config.unlockCondition.type === 'tier' &&
             config.unlockCondition.tier === tier;
    })
    .map(([id]) => id);
}

/**
 * Get charms by purchase requirement
 * @returns Array of charms with purchase count requirements
 */
export function getCharmsByPurchaseCount(): Array<{
  charmId: string;
  purchaseCount: number;
}> {
  return Object.entries(CHARM_CATALOG)
    .filter(([, config]) => config.unlockCondition.type === 'purchase_count')
    .map(([id, config]) => ({
      charmId: id,
      purchaseCount: (config.unlockCondition as { count: number }).count
    }))
    .sort((a, b) => a.purchaseCount - b.purchaseCount);
}

/**
 * Format unlock condition for display
 * @param charmId - Charm identifier
 * @returns Human-readable unlock condition
 */
export function formatUnlockCondition(charmId: string): string {
  const config = CHARM_CATALOG[charmId];
  if (!config) return 'Unknown';
  
  const condition = config.unlockCondition;
  
  switch (condition.type) {
    case 'purchase_count':
      return `Unlocked at ${condition.count} purchases`;
    case 'tier':
      return `Unlocked at ${condition.tier} tier`;
    case 'special':
      return condition.description;
    default:
      return 'Special unlock';
  }
}

/**
 * Get total collection value
 * @param charmIds - Array of charm IDs
 * @returns Total value (for insurance/display)
 */
export function calculateCollectionValue(charmIds: string[]): number {
  const values: Record<string, number> = {
    'crescent-moon': 15,
    'lotus-flower': 18,
    'tree-of-life': 22,
    'evil-eye': 25,
    'compass': 35,
    'sunburst': 45,
    'custom-initial': 40,
    'birthstone': 30
  };
  
  return charmIds.reduce((total, id) => total + (values[id] || 0), 0);
}
