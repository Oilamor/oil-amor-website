/**
 * Oil Amor - Unified Pricing Engine
 * Re-exports from pricing-engine-final for consistency
 */

import { calculatePurePrice, calculateCarrierPrice } from './pricing-engine-final'

// Re-export everything from pricing-engine-final
export {
  SLUG_TO_OIL_ID,
  getOilIdFromSlug,
  WHOLESALE_OILS,
  FIXED_COSTS,
  CRYSTAL_COUNTS,
  MARGIN_DIVISORS,
  calculatePurePrice,
  calculatePurePrice as calculatePureOilPrice,
  calculateCarrierPrice,
  getAllPrices,
  formatPrice,
  type OilPricing,
  OIL_PRICING,
  getOilPrices,
} from './pricing-engine-final'

// Local calculateRefillPrice implementation
export function calculateRefillPrice(oilId: string, sizeMl: number): number {
  // Refill is approximately 15% cheaper than original
  const originalPrice = calculatePurePrice(oilId, sizeMl)
  return Math.round(originalPrice * 0.85 * 100) / 100
}

// Export from product-config
export {
  BOTTLE_SIZES,
  CARRIER_OILS,
  CORD_OPTIONS,
  type BottleSize,
  type CarrierOil,
  type CordOption,
  type ProductType,
} from './product-config'

// ============================================================================
// Additional Types (for backward compatibility)
// ============================================================================

export type CarrierOilId = string

export interface ProductTypeConfig {
  id: string
  name: string
  description: string
  applicatorCost: number
}

export const PRODUCT_TYPES: ProductTypeConfig[] = [
  {
    id: 'pure',
    name: 'Pure Essential Oil',
    description: '100% pure essential oil with crystals',
    applicatorCost: 0.5,
  },
  {
    id: 'carrier',
    name: 'Carrier Oil Blend',
    description: 'Essential oil diluted in carrier oil',
    applicatorCost: 0.5,
  },
]

// ============================================================================
// COST BREAKDOWN INTERFACE
// ============================================================================

export interface PriceBreakdown {
  // Component costs
  wholesaleOilCost: number      // Raw oil at wholesale (no markup)
  markedUpOilCost: number       // Oil cost with retail markup applied
  carrierCost: number           // Carrier oil cost
  packagingCost: number         // Bottle, label, etc
  crystalCost: number           // Crystal chips
  applicatorCost: number        // Roller ball or dropper
  laborCost: number             // Fixed preparation cost
  
  // Final price
  subtotal: number
  total: number                 // Final rounded price (.95)
  
  // Comparison
  pureOilEquivalent: number     // What pure oil would cost at this size
  savings: number               // Savings vs pure oil
  savingsPercent: number
}

// ============================================================================
// BACKWARD COMPATIBILITY FUNCTIONS
// ============================================================================

import { BOTTLE_SIZES, CARRIER_OILS } from './product-config'
import { RATIO_PRESETS, type RatioPreset } from './ratio-engine'

export function calculatePriceBreakdown(
  oilId: string,
  sizeId: string,
  productType: 'pure' | 'carrier',
  options?: {
    carrierId?: string
    ratio?: RatioPreset
    isRefill?: boolean
  }
): PriceBreakdown {
  const { WHOLESALE_OILS, calculatePurePrice, calculateCarrierPrice } = require('./pricing-engine-final')
  const oil = WHOLESALE_OILS[oilId as keyof typeof WHOLESALE_OILS]
  const size = BOTTLE_SIZES.find(s => s.id === sizeId)
  
  if (!oil || !size) {
    return createEmptyBreakdown()
  }

  // Calculate based on product type (convert sizeId like "5ml" to volume number)
  const volume = parseInt(sizeId)
  const purePrice = calculatePurePrice(oilId, volume)
  const carrierPrice = productType === 'carrier' 
    ? calculateCarrierPrice(oilId, volume, (options?.ratio?.essentialOilPercent ?? 25) / 100)
    : purePrice

  // Estimate breakdown (simplified for backward compatibility)
  const wholesaleOilCost = (oil.pricePerLiter / 1000) * size.volume
  const markedUpOilCost = wholesaleOilCost * 3
  
  const carrier = CARRIER_OILS.find(c => c.id === options?.carrierId)
  const carrierCost = carrier && productType === 'carrier' 
    ? ((carrier.costPer30ml / 30) * size.volume) * 1.2
    : 0
  
  const packagingCost = options?.isRefill ? 0 : size.packagingCost
  const crystalCost = options?.isRefill ? 0 : size.crystalChips * size.crystalCost
  const applicatorCost = options?.isRefill ? 0 : 0.5
  const laborCost = options?.isRefill ? 2.0 : 5.0
  
  const subtotal = markedUpOilCost + carrierCost + packagingCost + crystalCost + applicatorCost + laborCost
  const total = productType === 'pure' ? purePrice : carrierPrice

  return {
    wholesaleOilCost,
    markedUpOilCost,
    carrierCost,
    packagingCost,
    crystalCost,
    applicatorCost,
    laborCost,
    subtotal,
    total,
    pureOilEquivalent: purePrice,
    savings: Math.max(0, purePrice - total),
    savingsPercent: Math.max(0, Math.round(((purePrice - total) / purePrice) * 100)),
  }
}

export function calculateProductPrice(
  oilId: string,
  sizeId: string,
  productType: 'pure' | 'carrier',
  carrierId?: string,
  ratio?: RatioPreset
): number {
  const volume = parseInt(sizeId)
  if (productType === 'pure') {
    return calculatePurePrice(oilId, volume)
  }
  return calculateCarrierPrice(oilId, volume, (ratio?.essentialOilPercent ?? 25) / 100)
}

export interface RefillSavings {
  originalPrice: number
  refillPrice: number
  savings: number
  savingsPercent: number
}

export function calculateRefillSavings(
  oilId: string,
  sizeId: string,
  ratio?: RatioPreset
): RefillSavings {
  const volume = parseInt(sizeId)
  const original = calculateCarrierPrice(oilId, volume, 0.25)
  // Refill is approximately 15% cheaper
  const refill = Math.round(original * 0.85 * 100) / 100
  
  return {
    originalPrice: original,
    refillPrice: refill,
    savings: original - refill,
    savingsPercent: 15,
  }
}

export function getAllPricesForOil(oilId: string): Record<string, number> {
  const prices: Record<string, number> = {}
  
  for (const size of BOTTLE_SIZES) {
    prices[size.id] = calculatePurePrice(oilId, size.volume)
  }
  
  return prices
}

export interface RatioPricePreview {
  ratio: RatioPreset
  price: number
  savingsVsPure: number
  savingsPercent: number
}

export function getRatioPricePreviews(
  oilId: string,
  sizeId: string,
  carrierId?: string
): RatioPricePreview[] {
  const volume = parseInt(sizeId)
  const purePrice = calculatePurePrice(oilId, volume)
  
  return RATIO_PRESETS.map(ratio => {
    const price = calculateCarrierPrice(oilId, volume, ratio.essentialOilPercent / 100)
    return {
      ratio,
      price,
      savingsVsPure: purePrice - price,
      savingsPercent: Math.round(((purePrice - price) / purePrice) * 100),
    }
  })
}

function createEmptyBreakdown(): PriceBreakdown {
  return {
    wholesaleOilCost: 0,
    markedUpOilCost: 0,
    carrierCost: 0,
    packagingCost: 0,
    crystalCost: 0,
    applicatorCost: 0,
    laborCost: 0,
    subtotal: 0,
    total: 0,
    pureOilEquivalent: 0,
    savings: 0,
    savingsPercent: 0,
  }
}
