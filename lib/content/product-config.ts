/**
 * Product Configuration
 * 
 * Central source of truth for product options, pricing, and specifications.
 */

import { calculateCarrierPrice } from './pricing-engine-final'

export type ProductType = 'pure' | 'carrier'

export interface BottleSize {
  id: string
  label: string
  volume: number
  description: string
  crystalChips: number
  markup: number           // Retail markup multiplier
  packagingCost: number    // Bottle, label, etc. cost
  crystalCost: number      // Cost per crystal chip
}

export interface CarrierOil {
  id: string
  name: string
  description: string
  price: number
  costPer30ml: number      // Wholesale cost per 30ml
  color?: string           // Visual color for UI
  // Extended educational content
  scientificName?: string
  type?: string
  skinMatch?: string
  shelfLife?: string
  comedogenicRating?: number
  absorption?: string
  bestFor?: string[]
  uniqueProperties?: string[]
}

export interface CordOption {
  id: string
  name: string
  material: string
  description: string
  price: number
  color: string
  bestFor: string[]
  energy?: string
  crystalSynergy?: string
  oilAbsorption?: string
  synergy?: string
}

export const BOTTLE_SIZES: BottleSize[] = [
  {
    id: '30ml',
    label: '30ml',
    volume: 30,
    description: '20% savings | Gift-ready box',
    crystalChips: 12,
    markup: 3.5,
    packagingCost: 2.5,
    crystalCost: 0.5,
  },
  {
    id: '20ml',
    label: '20ml',
    volume: 20,
    description: 'Most popular | Premium experience',
    crystalChips: 8,
    markup: 3.5,
    packagingCost: 2.0,
    crystalCost: 0.5,
  },
  {
    id: '15ml',
    label: '15ml',
    volume: 15,
    description: 'Perfect introduction | Travel size',
    crystalChips: 6,
    markup: 4.0,
    packagingCost: 1.8,
    crystalCost: 0.5,
  },
  {
    id: '10ml',
    label: '10ml',
    volume: 10,
    description: 'Compact | Sample size',
    crystalChips: 4,
    markup: 4.5,
    packagingCost: 1.5,
    crystalCost: 0.5,
  },
  {
    id: '5ml',
    label: '5ml',
    volume: 5,
    description: 'Discovery size | Try before you commit',
    crystalChips: 2,
    markup: 5.0,
    packagingCost: 1.2,
    crystalCost: 0.5,
  },
]

export const CARRIER_OILS: CarrierOil[] = [
  {
    id: 'pure',
    name: 'Pure Essential Oil (No Carrier)',
    description: '100% pure essential oil. Use for diffusing, inhalation, or DIY blends.',
    price: 0,
    costPer30ml: 0,
  },
  {
    id: 'jojoba',
    name: 'Jojoba Oil',
    description: 'Golden liquid wax ester. Molecularly identical to human sebum. Superior for facial care, balancing all skin types.',
    price: 3,
    costPer30ml: 8.5,
    // Extended educational content
    scientificName: 'Simmondsia chinensis',
    type: 'wax-ester',
    skinMatch: '98% similar to human sebum',
    shelfLife: 'Indefinite (natural antioxidant)',
    comedogenicRating: 2,
    absorption: 'medium',
    bestFor: ['Facial application', 'Acne-prone skin', 'Mature skin', 'Balancing oil production', 'Daily rituals'],
    uniqueProperties: [
      'Only plant source of liquid wax esters',
      'Non-comedogenic despite being an oil',
      'Balances sebum production (dry skin: adds oil, oily skin: signals stop)',
      'Rich in vitamin E and B-complex',
      'Natural anti-inflammatory',
    ],
  },
  {
    id: 'fractionated-coconut',
    name: 'Fractionated Coconut Oil',
    description: 'Lightweight, odorless liquid coconut oil. Stays liquid at any temperature. Perfect for massage and body application.',
    price: 2.5,
    costPer30ml: 5.5,
    // Extended educational content
    scientificName: 'Cocos nucifera (fractionated)',
    type: 'fractionated-triglyceride',
    skinMatch: 'Universal compatibility',
    shelfLife: 'Indefinite (highly stable)',
    comedogenicRating: 1,
    absorption: 'fast',
    bestFor: ['Full body massage', 'Sensitive skin', 'Tropical climates', 'Large area application', 'Beginners'],
    uniqueProperties: [
      'Long-chain fatty acids removed - never solidifies',
      'Completely odorless (won\'t compete with essential oils)',
      'Colorless (won\'t stain fabrics)',
      'Highest stability of any carrier oil',
      'Rich in caprylic and capric acids (antimicrobial)',
    ],
  },
]

// ============================================================================
// CARRIER OIL EDUCATION
// ============================================================================

export interface CarrierOilComparison {
  factor: string
  jojoba: string
  fractionatedCoconut: string
  winner: 'jojoba' | 'fractionated-coconut' | 'tie'
}

export const CARRIER_COMPARISON: CarrierOilComparison[] = [
  { factor: 'Molecular Structure', jojoba: 'Liquid wax ester (unique in plant kingdom)', fractionatedCoconut: 'Fractionated triglyceride', winner: 'jojoba' },
  { factor: 'Skin Similarity', jojoba: '98% identical to human sebum', fractionatedCoconut: 'Highly compatible', winner: 'jojoba' },
  { factor: 'Absorption Speed', jojoba: 'Medium (sustained release)', fractionatedCoconut: 'Fast (quick penetration)', winner: 'tie' },
  { factor: 'Facial Application', jojoba: 'Superior - balances sebum', fractionatedCoconut: 'Good - lightweight', winner: 'jojoba' },
  { factor: 'Body/Massage', jojoba: 'Excellent - long glide', fractionatedCoconut: 'Superior - spreads easily', winner: 'fractionated-coconut' },
  { factor: 'Aroma Preservation', jojoba: 'Good - subtle nutty note', fractionatedCoconut: 'Superior - completely odorless', winner: 'fractionated-coconut' },
  { factor: 'Stain Potential', jojoba: 'Minimal - golden color', fractionatedCoconut: 'None - completely clear', winner: 'fractionated-coconut' },
  { factor: 'Climate Stability', jojoba: 'Stable - stays liquid', fractionatedCoconut: 'Superior - never solidifies', winner: 'fractionated-coconut' },
  { factor: 'Acne-Prone Skin', jojoba: 'Superior - regulates oil', fractionatedCoconut: 'Good - non-comedogenic', winner: 'jojoba' },
  { factor: 'Shelf Life', jojoba: 'Indefinite', fractionatedCoconut: 'Indefinite', winner: 'tie' },
]

export const CARRIER_GUIDANCE = {
  chooseJojoba: [
    'Facial serums and daily face oils',
    'Balancing oily or acne-prone skin',
    'Mature skin requiring nourishment',
    'Creating long-lasting perfume blends',
    'Regulating sebum production naturally',
  ],
  chooseFractionatedCoconut: [
    'Full body massage and large areas',
    'When you want zero scent interference',
    'Hot climates or travel (guaranteed liquid)',
    'Sensitive skin requiring gentlest option',
    'Beginners starting their oil journey',
  ],
}

export const CORD_OPTIONS: CordOption[] = [
  {
    id: 'waxed-cotton',
    name: 'Waxed Cotton Cord',
    material: 'Waxed Cotton',
    description: 'Traditional cord with natural wax coating. Water-resistant and durable.',
    price: 0.00,
    color: '#2C241B',
    bestFor: ['Everyday wear', 'Boho style', 'Layering'],
    energy: 'Grounding, earthy connection',
    crystalSynergy: 'Amplifies earth-element crystals like Black Tourmaline and Smoky Quartz',
    oilAbsorption: 'Low absorption - maintains oil integrity for topical application',
    synergy: 'Grounding energy complements oils like Patchouli and Cedarwood'
  },
  {
    id: 'hemp',
    name: 'Hemp Cord',
    material: 'Natural Hemp',
    description: 'Eco-friendly, strong natural fiber. Earthy texture that ages beautifully.',
    price: 0.00,
    color: '#8B7355',
    bestFor: ['Eco-conscious', 'Natural look', 'Rustic style'],
    energy: 'Organic, sustainable vitality',
    crystalSynergy: 'Enhances growth-energy crystals like Green Aventurine and Moss Agate',
    oilAbsorption: 'Moderate absorption - ideal for diffuser jewelry',
    synergy: 'Vitality energy pairs beautifully with energizing oils like Lemon and Ginger'
  },
  {
    id: 'vegan-leather',
    name: 'Vegan Leather Cord',
    material: 'Cork/Pineapple Leather',
    description: 'Cruelty-free alternative with luxurious feel. Soft and comfortable.',
    price: 0.00,
    color: '#4A3728',
    bestFor: ['Premium look', 'Sensitive skin', 'Elegant style'],
    energy: 'Luxurious, compassionate protection',
    crystalSynergy: 'Complements heart-centered crystals like Rose Quartz and Rhodonite',
    oilAbsorption: 'Minimal absorption - preserves oil for direct skin contact',
    synergy: 'Heart-centered energy harmonizes with love oils like Rose and Ylang Ylang'
  },
  {
    id: 'elastic',
    name: 'Stretch Elastic',
    material: 'Silicone Elastic',
    description: 'Comfortable stretch cord for bracelets. Easy on and off.',
    price: 0.00,
    color: '#333333',
    bestFor: ['Bracelets', 'Active wear', 'Easy adjustment'],
    energy: 'Flexible, adaptable flow',
    crystalSynergy: 'Supports all crystal types with neutral energy conductivity',
    oilAbsorption: 'Very low absorption - best for frequent oil reapplication',
    synergy: 'Adaptive energy works with all oil types for versatile daily wear'
  },
  {
    id: 'mystery-pendant',
    name: 'Mystery Crystal Pendant',
    material: 'Crystal + Bail',
    description: 'A surprise crystal pendant intuitively selected for your oil. Perfect for those who already have cords.',
    price: 0.00,
    color: '#9333ea',
    bestFor: ['Ready-to-wear', 'Gift surprise', 'No cord needed'],
    energy: 'Intuitive, divinely guided selection',
    crystalSynergy: 'The crystal chooses you - trust in universal alignment',
    oilAbsorption: 'N/A - Pendant style ready to wear',
    synergy: 'No cord needed - receive a beautifully wire-wrapped crystal pendant ready to wear'
  },
]

export const FREE_SHIPPING_THRESHOLD = 75
export const DEFAULT_SHIPPING_COST = 8.50

// ============================================================================
// REFILL EXPORTS (for backward compatibility)
// ============================================================================

export const REFILL_SIZES = ['50ml', '100ml'] as const
export type RefillSize = typeof REFILL_SIZES[number]

export interface OilPricing {
  id: string
  name: string
  rarity: 'common' | 'premium' | 'luxury'
  pricePerLiter: number
}

// Re-export from pricing-engine for refill dashboard
export {
  calculateRefillPrice,
} from './pricing-engine'

export {
  calculatePurePrice,
  calculateCarrierPrice,
  OIL_PRICING,
} from './pricing-engine-final'

// Refill savings calculation
export interface RefillSavings {
  originalPrice: number
  refillPrice: number
  savings: number
  savingsPercent: number
}

export function getRefillSavings(oilId: string, sizeId: string): RefillSavings {
  // 2026-07-21 fix: calculateCarrierPrice's signature is
  // (slug, sizeMl: number, oilRatio: number, isRefill?: boolean) — the
  // previous call passed the string sizeId as sizeMl and the carrier id
  // 'jojoba' as the ratio (plus a calculateRefillPrice that pricing-engine-
  // final does not export), producing NaN prices rendered as "NaN%" in
  // refill-dashboard. sizeId arrives as e.g. '50ml-refill'; savings are
  // measured against the equivalent non-refill bottle at the standard
  // 25% dilution.
  const sizeMl = parseInt(sizeId, 10)
  const original = calculateCarrierPrice(oilId, sizeMl, 0.25)
  const refill = calculateCarrierPrice(oilId, sizeMl, 0.25, true)
  const savings = original - refill

  return {
    originalPrice: original,
    refillPrice: refill,
    savings,
    savingsPercent: original > 0 ? Math.round((savings / original) * 100) : 0,
  }
}

// Placeholder functions for refill eligibility
export interface PurchaseRecord {
  oilId: string
  size: string
  date: Date
  orderId: string
}

export function getRefillEligibleOils(purchaseHistory: PurchaseRecord[]): string[] {
  // Return unique oil IDs from purchase history
  const uniqueIds = new Set(purchaseHistory.map(p => p.oilId))
  return Array.from(uniqueIds)
}

export function getLockedOils(purchaseHistory: PurchaseRecord[]): string[] {
  // This would compare against all available oils
  // For now, return empty array
  return []
}
