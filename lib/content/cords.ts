// ========================================
// Cord/Charm/Chain Management API
// ========================================

import { sanityClient as client } from '@/app/lib/sanity'
import { logger } from '@/lib/logging/logger'
import {
  getFromCache,
  setCache,
  generateCacheKey,
  warmCache,
  deleteCachePattern,
} from './cache'
import {
  DEFAULT_CACHE_TTL,
  type CordOption,
  type CharmOption,
  type ChainOption,
  type TierLevel,
  type CordType,
} from './types'

// ========================================
// Tier Level Hierarchy
// ========================================

const TIER_HIERARCHY: Record<TierLevel, number> = {
  seed: 0,
  sprout: 1,
  bloom: 2,
  radiance: 3,
  luminary: 4,
}

function tierMeetsRequirement(
  customerTier: TierLevel,
  requiredTier: TierLevel
): boolean {
  return TIER_HIERARCHY[customerTier] >= TIER_HIERARCHY[requiredTier]
}

// ========================================
// GROQ Queries
// ========================================

const cordFields = `
  _id,
  name,
  "slug": slug.current,
  type,
  material,
  tierRequirement,
  price,
  images[] {
    asset-> {
      _ref,
      url
    },
    alt
  },
  description,
  shortDescription,
  color,
  length,
  availability,
  purchaseCountRequirement,
  isDefault,
  sortOrder,
  symbolism,
  careInstructions
`

const cordsByTypeQuery = `*[_type == "cordType" && type == $type && availability != "unavailable"] | order(sortOrder asc, name asc) {
  ${cordFields}
}`

const cordsByTierQuery = `*[_type == "cordType" && tierRequirement == $tier && availability != "unavailable"] | order(sortOrder asc, name asc) {
  ${cordFields}
}`

const allCordsQuery = `*[_type == "cordType" && availability != "unavailable"] | order(type asc, sortOrder asc) {
  ${cordFields}
}`

const defaultCordQuery = `*[_type == "cordType" && type == $type && isDefault == true][0] {
  ${cordFields}
}`

const cordBySlugQuery = `*[_type == "cordType" && slug.current == $slug][0] {
  ${cordFields}
}`

// ========================================
// API Functions
// ========================================

/**
 * Get available cords for a customer's tier
 */
export async function getAvailableCords(
  customerTier: TierLevel
): Promise<CordOption[]> {
  const cacheKey = generateCacheKey('cords-available', customerTier)
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const allCords = await client.fetch<CordOption[]>(
          cordsByTypeQuery,
          { type: 'cord' }
        )
        
        // Filter by tier
        return (allCords || []).filter((cord: CordOption) =>
          tierMeetsRequirement(customerTier, cord.tierRequirement)
        )
      } catch (error) {
        logger.error('Error fetching available cords', error instanceof Error ? error : new Error(String(error)))
        return []
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Get available charms for a customer
 * Considers both tier level and purchase count
 */
export async function getAvailableCharms(
  customerTier: TierLevel,
  purchaseCount: number = 0
): Promise<CharmOption[]> {
  const cacheKey = generateCacheKey('charms-available', customerTier, purchaseCount)
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const allCharms = await client.fetch<CordOption[]>(
          cordsByTypeQuery,
          { type: 'charm' }
        )
        
        // Filter by tier and purchase count
        return (allCharms || [])
          .filter((charm: CordOption) => {
            const meetsTier = tierMeetsRequirement(
              customerTier,
              charm.tierRequirement
            )
            const meetsPurchaseCount =
              purchaseCount >= charm.purchaseCountRequirement
            return meetsTier && meetsPurchaseCount
          })
          .map((charm: CordOption) => ({
            ...charm,
            type: 'charm' as const,
            symbolism: (charm as any).symbolism || '',
          })) as CharmOption[]
      } catch (error) {
        logger.error('Error fetching available charms', error instanceof Error ? error : new Error(String(error)))
        return []
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Get available chains for a customer's tier
 */
export async function getAvailableChains(
  customerTier: TierLevel
): Promise<ChainOption[]> {
  const cacheKey = generateCacheKey('chains-available', customerTier)
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const allChains = await client.fetch<CordOption[]>(
          cordsByTypeQuery,
          { type: 'chain' }
        )
        
        // Filter by tier
        return (allChains || [])
          .filter((chain: CordOption) =>
            tierMeetsRequirement(customerTier, chain.tierRequirement)
          )
          .map((chain: CordOption) => ({
            ...chain,
            type: 'chain' as const,
            length: (chain as any).length || '',
          })) as ChainOption[]
      } catch (error) {
        logger.error('Error fetching available chains', error instanceof Error ? error : new Error(String(error)))
        return []
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Get all cord options for a customer (cords, charms, chains)
 */
export async function getAllCordOptions(
  customerTier: TierLevel,
  purchaseCount: number = 0
): Promise<{
  cords: CordOption[]
  charms: CharmOption[]
  chains: ChainOption[]
}> {
  const [cords, charms, chains] = await Promise.all([
    getAvailableCords(customerTier),
    getAvailableCharms(customerTier, purchaseCount),
    getAvailableChains(customerTier),
  ])
  
  return { cords, charms, chains }
}

/**
 * Get default cord for a type
 */
export async function getDefaultCord(
  type: CordType
): Promise<CordOption | null> {
  const cacheKey = generateCacheKey('cord-default', type)
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const result = await client.fetch(defaultCordQuery, { type })
        return result as CordOption | null
      } catch (error) {
        logger.error('Error fetching default cord', error instanceof Error ? error : new Error(String(error)))
        return null
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Get a specific cord by slug
 */
export async function getCordBySlug(slug: string): Promise<CordOption | null> {
  const cacheKey = generateCacheKey('cord-slug', slug)
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const result = await client.fetch(cordBySlugQuery, { slug })
        return result as CordOption | null
      } catch (error) {
        logger.error('Error fetching cord by slug', error instanceof Error ? error : new Error(String(error)))
        return null
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Get cords by material
 */
export async function getCordsByMaterial(
  material: string
): Promise<CordOption[]> {
  const cacheKey = generateCacheKey('cords-material', material)
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const allCords = await client.fetch<CordOption[]>(allCordsQuery)
        return (allCords || []).filter(
          (cord: CordOption) =>
            cord.material.toLowerCase() === material.toLowerCase()
        )
      } catch (error) {
        logger.error('Error fetching cords by material', error instanceof Error ? error : new Error(String(error)))
        return []
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Check if a cord is available for a customer's tier
 */
export async function isCordAvailableForTier(
  cordId: string,
  customerTier: TierLevel
): Promise<boolean> {
  try {
    const cord = await client.fetch(
      `*[_type == "cordType" && _id == $id][0] {
        tierRequirement,
        availability
      }`,
      { id: cordId }
    )
    
    if (!cord || cord.availability === 'unavailable') {
      return false
    }
    
    return tierMeetsRequirement(customerTier, cord.tierRequirement)
  } catch (error) {
    logger.error('Error checking cord availability', error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

/**
 * Get tier requirements for all cord types
 */
export async function getTierRequirements(): Promise<
  Record<CordType, TierLevel>
> {
  const cacheKey = generateCacheKey('tier-requirements')
  
  return warmCache(
    cacheKey,
    async () => {
      try {
        const cords = await client.fetch<
          { type: CordType; tierRequirement: TierLevel }[]
        >(
          `*[_type == "cordType"] {
            type,
            tierRequirement
          }`
        )
        
        // Get the minimum tier for each type
        const requirements: Record<CordType, TierLevel> = {
          cord: 'seed',
          charm: 'seed',
          chain: 'seed',
        }
        
        ;(cords || []).forEach((cord: { type: CordType; tierRequirement: TierLevel }) => {
          const currentLevel = TIER_HIERARCHY[requirements[cord.type]]
          const newLevel = TIER_HIERARCHY[cord.tierRequirement]
          
          if (newLevel < currentLevel) {
            requirements[cord.type] = cord.tierRequirement
          }
        })
        
        return requirements
      } catch (error) {
        logger.error('Error fetching tier requirements', error instanceof Error ? error : new Error(String(error)))
        return { cord: 'seed', charm: 'seed', chain: 'seed' }
      }
    },
    DEFAULT_CACHE_TTL.CORD
  )
}

/**
 * Get cord price (0 if included with tier)
 */
export async function getCordPrice(
  cordSlug: string,
  customerTier: TierLevel
): Promise<number> {
  try {
    const cord = await getCordBySlug(cordSlug)
    
    if (!cord) {
      throw new Error(`Cord not found: ${cordSlug}`)
    }
    
    // If customer's tier meets requirement, price may be 0
    if (tierMeetsRequirement(customerTier, cord.tierRequirement)) {
      return cord.price
    }
    
    // Otherwise, return a premium price or throw error
    throw new Error(
      `Cord ${cordSlug} not available for tier ${customerTier}`
    )
  } catch (error) {
    logger.error('Error getting cord price', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Clear cord cache
 */
export async function clearCordCache(): Promise<void> {
  await deleteCachePattern('oil-amor:cord*')
  await deleteCachePattern('oil-amor:charm*')
  await deleteCachePattern('oil-amor:chain*')
  await deleteCachePattern('oil-amor:tier*')
}
