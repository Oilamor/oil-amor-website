/**
 * Recipe Scaling Engine
 * 
 * Preserves exact ratios when scaling custom blends to refill sizes.
 * Handles both pure essential oil blends and carrier dilutions.
 * 
 * Key Principles:
 * 1. Store recipes as PERCENTAGES (not absolute amounts)
 * 2. Scale proportionally to target volume
 * 3. Maintain carrier:essential oil ratio for dilutions
 * 4. Use PRECISE ML MEASUREMENTS (0.1ml increments) - NO DROPS
 */

import { OrderCustomMix } from '@/lib/db/schema/orders'

// ============================================================================
// TYPES
// ============================================================================

export interface NormalizedOil {
  oilId: string
  oilName: string
  percentage: number  // 0-100%
  ml: number          // Precise ml amount (0.1ml increments)
}

export interface NormalizedRecipe {
  mode: 'pure' | 'carrier'
  totalVolume: number  // Original volume (5, 10, 15, or 30ml)
  oils: NormalizedOil[]
  
  // For carrier blends
  carrierRatio?: number  // 5-75% (percentage of total that's essential oils)
  carrierPercentage?: number  // 25-95% (percentage that's carrier oil)
  
  // Safety data
  safetyScore: number
  safetyRating: string
  safetyWarnings: string[]
}

export interface ScaledRefill {
  targetVolume: 50 | 100  // Refill sizes
  
  // Total amounts
  totalEssentialOilMl: number
  totalCarrierOilMl: number
  
  // Individual oils with scaled amounts
  oils: Array<{
    oilId: string
    oilName: string
    percentage: number
    ml: number          // Precise ml amount (0.1ml increments)
  }>
  
  // For carrier blends
  carrierOilMl?: number
  
  // Cost calculation
  estimatedPrice: number
  
  // Display
  formula: string  // Human-readable formula
}

// ============================================================================
// RECIPE NORMALIZATION
// ============================================================================

/**
 * Normalize a recipe to percentages for scaling
 * This is the key function - converts absolute amounts to ratios
 * Uses ML measurements ONLY - no drops
 */
export function normalizeRecipe(customMix: OrderCustomMix): NormalizedRecipe {
  // Calculate total ml for percentage calculation
  const totalMl = customMix.oils.reduce((sum, o) => sum + (o.ml ?? (o.drops ? o.drops * 0.05 : 0)), 0)
  
  const normalizedOils: NormalizedOil[] = customMix.oils.map(oil => {
    // Use ml if available, otherwise convert from drops for backwards compatibility
    const oilMl = oil.ml ?? (oil.drops ? oil.drops * 0.05 : 0)
    
    // Calculate percentage of total essential oils
    const percentage = totalMl > 0 
      ? (oilMl / totalMl) * 100 
      : 0
    
    return {
      oilId: oil.oilId,
      oilName: oil.oilName,
      percentage: Math.round(percentage * 100) / 100, // 2 decimal places
      ml: Math.round(oilMl * 10) / 10, // Round to 0.1ml
    }
  })
  
  return {
    mode: customMix.mode,
    totalVolume: customMix.totalVolume,
    oils: normalizedOils,
    carrierRatio: customMix.carrierRatio,
    carrierPercentage: customMix.mode === 'carrier' 
      ? 100 - (customMix.carrierRatio || 30) 
      : undefined,
    safetyScore: customMix.safetyScore,
    safetyRating: customMix.safetyRating,
    safetyWarnings: customMix.safetyWarnings,
  }
}

// ============================================================================
// REFILL SCALING
// ============================================================================

/**
 * Scale a normalized recipe to a refill size
 * This preserves the EXACT ratios using ML measurements
 */
export function scaleToRefill(
  normalizedRecipe: NormalizedRecipe,
  targetVolume: 50 | 100
): ScaledRefill {
  if (normalizedRecipe.mode === 'pure') {
    return scalePureBlend(normalizedRecipe, targetVolume)
  } else {
    return scaleCarrierBlend(normalizedRecipe, targetVolume)
  }
}

/**
 * Scale a pure essential oil blend
 * All volume is essential oils, distributed by percentage
 */
function scalePureBlend(
  recipe: NormalizedRecipe,
  targetVolume: 50 | 100
): ScaledRefill {
  const oils = recipe.oils.map(oil => {
    // Calculate ml based on percentage
    const ml = Math.round((oil.percentage / 100) * targetVolume * 10) / 10 // Round to 0.1ml
    
    return {
      oilId: oil.oilId,
      oilName: oil.oilName,
      percentage: oil.percentage,
      ml,
    }
  })
  
  // Calculate total essential oil (should equal target volume)
  const totalEssentialOilMl = oils.reduce((sum, o) => sum + o.ml, 0)
  
  // Generate formula string
  const formula = generateFormulaString(oils, 'pure', targetVolume)
  
  return {
    targetVolume,
    totalEssentialOilMl,
    totalCarrierOilMl: 0,
    oils,
    estimatedPrice: calculateRefillPrice(targetVolume, 'pure'),
    formula,
  }
}

/**
 * Scale a carrier oil blend
 * Maintains the carrier:essential oil ratio
 */
function scaleCarrierBlend(
  recipe: NormalizedRecipe,
  targetVolume: 50 | 100
): ScaledRefill {
  // Get the essential oil percentage (default 30% if not specified)
  const essentialOilPercentage = recipe.carrierRatio || 30
  const carrierPercentage = 100 - essentialOilPercentage
  
  // Calculate volumes (rounded to 0.1ml)
  const totalEssentialOilMl = Math.round((essentialOilPercentage / 100) * targetVolume * 10) / 10
  const carrierOilMl = Math.round((carrierPercentage / 100) * targetVolume * 10) / 10
  
  const oils = recipe.oils.map(oil => {
    // Calculate ml based on percentage of essential oils
    const ml = Math.round((oil.percentage / 100) * totalEssentialOilMl * 10) / 10
    
    return {
      oilId: oil.oilId,
      oilName: oil.oilName,
      percentage: oil.percentage,
      ml,
    }
  })
  
  // Generate formula string
  const formula = generateFormulaString(oils, 'carrier', targetVolume, carrierOilMl)
  
  return {
    targetVolume,
    totalEssentialOilMl,
    totalCarrierOilMl: carrierOilMl,
    oils,
    carrierOilMl,
    estimatedPrice: calculateRefillPrice(targetVolume, 'carrier'),
    formula,
  }
}

// ============================================================================
// FORMULA GENERATION
// ============================================================================

/**
 * Generate a human-readable formula string
 */
function generateFormulaString(
  oils: Array<{ oilName: string; ml: number }>,
  mode: 'pure' | 'carrier',
  totalVolume: number,
  carrierMl?: number
): string {
  const oilParts = oils.map(o => `${o.ml}ml ${o.oilName}`).join(' + ')
  
  if (mode === 'pure') {
    return `${totalVolume}ml Pure Blend: ${oilParts}`
  } else {
    return `${totalVolume}ml Carrier Blend: ${oilParts} + ${carrierMl}ml carrier oil (${Math.round((carrierMl! / totalVolume) * 100)}% carrier)`
  }
}

/**
 * Generate a detailed breakdown for display
 * Uses ML measurements ONLY - no drops
 */
export function generateRefillBreakdown(scaled: ScaledRefill): {
  title: string
  subtitle: string
  ingredients: Array<{ name: string; amount: string; percentage: string }>
  total: string
} {
  const ingredients = scaled.oils.map(o => ({
    name: o.oilName,
    amount: `${o.ml.toFixed(1)}ml`,  // ML ONLY
    percentage: `${o.percentage.toFixed(1)}%`,
  }))
  
  if (scaled.carrierOilMl) {
    ingredients.push({
      name: 'Carrier Oil',
      amount: `${scaled.carrierOilMl.toFixed(1)}ml`,
      percentage: `${((scaled.carrierOilMl / scaled.targetVolume) * 100).toFixed(1)}%`,
    })
  }
  
  return {
    title: scaled.targetVolume === 50 ? '50ml Forever Bottle Refill' : '100ml Forever Bottle Refill',
    subtitle: scaled.carrierOilMl 
      ? `Carrier dilution with ${scaled.oils.length} essential oils`
      : `Pure essential oil blend`,
    ingredients,
    total: `${scaled.targetVolume}ml total`,
  }
}

// ============================================================================
// PRICING
// ============================================================================

/**
 * Calculate estimated refill price
 * Pure refills cost more (more essential oil)
 */
export function calculateRefillPrice(volume: 50 | 100, mode: 'pure' | 'carrier'): number {
  // Pure blends cost more (100% essential oils)
  if (mode === 'pure') {
    return volume === 50 ? 45 : 85
  }
  
  // Carrier blends are cheaper (mostly carrier oil)
  return volume === 50 ? 30 : 55
}

// ============================================================================
// UNLOCKED REFILL MANAGEMENT
// ============================================================================

export interface UnlockedRefill {
  id: string
  userId: string
  originalOrderId: string
  recipeName: string
  normalizedRecipe: NormalizedRecipe
  unlockedAt: string
  availableSizes: Array<{
    size: 50 | 100
    price: number
    lastPurchasedAt?: string
  }>
  purchaseCount: number
}

/**
 * Create an unlocked refill entry after purchase
 * This stores the normalized recipe for future refills
 */
export function createUnlockedRefill(
  userId: string,
  originalOrderId: string,
  recipeName: string,
  customMix: OrderCustomMix
): UnlockedRefill {
  const normalized = normalizeRecipe(customMix)
  
  return {
    id: `refill-${Date.now()}`,
    userId,
    originalOrderId,
    recipeName,
    normalizedRecipe: normalized,
    unlockedAt: new Date().toISOString(),
    availableSizes: [
      {
        size: 50,
        price: calculateRefillPrice(50, customMix.mode),
      },
      {
        size: 100,
        price: calculateRefillPrice(100, customMix.mode),
      },
    ],
    purchaseCount: 0,
  }
}

/**
 * Get refill options for an unlocked blend
 */
export function getRefillOptions(unlocked: UnlockedRefill): {
  '50ml': ScaledRefill
  '100ml': ScaledRefill
} {
  return {
    '50ml': scaleToRefill(unlocked.normalizedRecipe, 50),
    '100ml': scaleToRefill(unlocked.normalizedRecipe, 100),
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a scaled recipe maintains safety limits
 */
export function validateScaledRecipe(scaled: ScaledRefill): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  // Check total volume adds up correctly
  const totalOilMl = scaled.oils.reduce((sum, o) => sum + o.ml, 0)
  const calculatedTotal = scaled.carrierOilMl 
    ? totalOilMl + scaled.carrierOilMl 
    : totalOilMl
  
  if (Math.abs(calculatedTotal - scaled.targetVolume) > 0.5) {
    warnings.push('Volume calculation may have rounding differences')
  }
  
  // Check for very small amounts (hard to measure precisely)
  scaled.oils.forEach(oil => {
    if (oil.ml < 0.3) {
      warnings.push(`${oil.oilName} amount (${oil.ml}ml) is very small and may be difficult to measure precisely`)
    }
  })
  
  return {
    valid: warnings.length === 0,
    warnings,
  }
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format a recipe for display in the refill store
 */
export function formatRecipeForDisplay(
  recipe: NormalizedRecipe,
  targetSize?: 50 | 100
): {
  name: string
  type: string
  oils: string
  ratio: string
  preview: string
} {
  const type = recipe.mode === 'pure' ? 'Pure Essential Oil Blend' : 'Carrier Oil Dilution'
  
  // Format oil list
  const oilList = recipe.oils.map(o => o.oilName).join(' + ')
  
  // Format ratio
  const ratio = recipe.oils.map(o => `${o.percentage.toFixed(0)}% ${o.oilName}`).join(' / ')
  
  // Generate preview for specific size
  let preview = ''
  if (targetSize) {
    const scaled = scaleToRefill(recipe, targetSize)
    if (scaled.carrierOilMl) {
      preview = `${scaled.totalEssentialOilMl.toFixed(1)}ml essential oils + ${scaled.carrierOilMl.toFixed(1)}ml carrier`
    } else {
      preview = `${scaled.oils.length} oils totaling ${scaled.targetVolume}ml`
    }
  }
  
  return {
    name: recipe.oils.map(o => o.oilName.split(' ')[0]).join('-'), // Short name
    type,
    oils: oilList,
    ratio,
    preview,
  }
}
