/**
 * Oil Amor - The Mixing Atelier Engine
 * Uses EXACT same pricing as collection for fairness
 * Custom blends = same price, but YOU control the recipe
 */

// Re-export from pricing-engine-final for consistency
export {
  WHOLESALE_OILS,
  FIXED_COSTS,
  CRYSTAL_COUNTS,
  MARGIN_DIVISORS,
  calculatePurePrice,
  calculateCarrierPrice,
  roundTo95,
} from '@/lib/content/pricing-engine-final'

import { 
  WHOLESALE_OILS, 
  FIXED_COSTS, 
  CRYSTAL_COUNTS, 
  MARGIN_DIVISORS,
  roundTo95 
} from '@/lib/content/pricing-engine-final'

// ============================================================================
// ATELIER OILS - Only oils with user-provided descriptions
// Original 17 + Bergamot FCF, Sweet Orange, Frankincense, Peppermint, Lemon, Pink Grapefruit, Cedarwood Atlas
// ============================================================================

export interface AtelierOil {
  id: string
  name: string
  wholesalePerLiter: number
  rarity: 'common' | 'premium' | 'luxury'
  color: string
  scentProfile: string
  collectionPrice5ml: number
  collectionPrice30ml: number
  origin?: string
  certification?: string
  botanicalName?: string
  extractionMethod?: string
}

export const ATELIER_OILS: AtelierOil[] = [
  // Original 17 Collection Oils
  { 
    id: 'lemon', 
    name: 'Lemon (Australian)', 
    wholesalePerLiter: 99, 
    rarity: 'common', 
    color: '#fff44f', 
    scentProfile: 'Bright, zesty, clean, uplifting',
    origin: 'Australia',
    botanicalName: 'Citrus limon',
    extractionMethod: 'Cold pressed peel',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 22.95,
  },
  { 
    id: 'lemongrass', 
    name: 'Lemongrass', 
    wholesalePerLiter: 103, 
    rarity: 'common', 
    color: '#9DC183', 
    scentProfile: 'Citrus, grassy, energizing',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'lavender', 
    name: 'Lavender', 
    wholesalePerLiter: 115, 
    rarity: 'common', 
    color: '#9b7cb6', 
    scentProfile: 'Floral, herbaceous, calming',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 24.95,
  },
  { 
    id: 'eucalyptus', 
    name: 'Blue Mallee Eucalyptus', 
    wholesalePerLiter: 115, 
    rarity: 'common', 
    color: '#6b9080', 
    scentProfile: 'Camphoraceous, fresh, clearing',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'cinnamon-leaf', 
    name: 'Cinnamon Leaf', 
    wholesalePerLiter: 130, 
    rarity: 'common', 
    color: '#8B4513', 
    scentProfile: 'Warm, spicy, comforting',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'clove-bud', 
    name: 'Clove Bud', 
    wholesalePerLiter: 130, 
    rarity: 'common', 
    color: '#8B0000', 
    scentProfile: 'Warm, spicy, potent',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'tea-tree', 
    name: 'Tea Tree', 
    wholesalePerLiter: 146, 
    rarity: 'common', 
    color: '#4a7c59', 
    scentProfile: 'Medicinal, fresh, cleansing',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'may-chang', 
    name: 'May Chang', 
    wholesalePerLiter: 160, 
    rarity: 'common', 
    color: '#FFD700', 
    scentProfile: 'Lemon-like, sweet, fresh',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'ginger', 
    name: 'Ginger', 
    wholesalePerLiter: 250, 
    rarity: 'premium', 
    color: '#D2691E', 
    scentProfile: 'Warm, spicy, energizing',
    collectionPrice5ml: 17.95,
    collectionPrice30ml: 32.95,
  },
  { 
    id: 'carrot-seed', 
    name: 'Carrot Seed', 
    wholesalePerLiter: 250, 
    rarity: 'premium', 
    color: '#DAA520', 
    scentProfile: 'Earthy, woody, rejuvenating',
    collectionPrice5ml: 17.95,
    collectionPrice30ml: 32.95,
  },
  { 
    id: 'lemon-myrtle', 
    name: 'Lemon Myrtle', 
    wholesalePerLiter: 250, 
    rarity: 'premium', 
    color: '#98FB98', 
    scentProfile: 'Intensely lemon, fresh, uplifting',
    collectionPrice5ml: 17.95,
    collectionPrice30ml: 32.95,
  },
  { 
    id: 'cinnamon-bark', 
    name: 'Cinnamon Bark', 
    wholesalePerLiter: 260, 
    rarity: 'premium', 
    color: '#A0522D', 
    scentProfile: 'Sweet, warm, spicy',
    collectionPrice5ml: 17.95,
    collectionPrice30ml: 33.95,
  },
  { 
    id: 'clary-sage', 
    name: 'Clary Sage', 
    wholesalePerLiter: 300, 
    rarity: 'premium', 
    color: '#9dc183', 
    scentProfile: 'Herbaceous, sweet, euphoric',
    collectionPrice5ml: 18.95,
    collectionPrice30ml: 35.95,
  },
  { 
    id: 'geranium-bourbon', 
    name: 'Geranium Bourbon', 
    wholesalePerLiter: 350, 
    rarity: 'premium', 
    color: '#db7093', 
    scentProfile: 'Floral, rose-like, balancing',
    collectionPrice5ml: 18.95,
    collectionPrice30ml: 38.95,
  },
  { 
    id: 'juniper-berry', 
    name: 'Juniper Berry', 
    wholesalePerLiter: 440, 
    rarity: 'luxury', 
    color: '#4B0082', 
    scentProfile: 'Fresh, woody, cleansing',
    collectionPrice5ml: 19.95,
    collectionPrice30ml: 43.95,
  },
  { 
    id: 'patchouli-dark', 
    name: 'Patchouli Dark', 
    wholesalePerLiter: 515, 
    rarity: 'luxury', 
    color: '#8b7355', 
    scentProfile: 'Earthy, musky, grounding',
    collectionPrice5ml: 20.95,
    collectionPrice30ml: 48.95,
  },
  { 
    id: 'myrrh', 
    name: 'Myrrh', 
    wholesalePerLiter: 1000, 
    rarity: 'luxury', 
    color: '#D4A574', 
    scentProfile: 'Resinous, smoky, spiritual',
    collectionPrice5ml: 25.95,
    collectionPrice30ml: 76.95,
  },
  
  // User-approved additions with full descriptions
  { 
    id: 'bergamot-fcf', 
    name: 'Bergamot (FCF) Organic', 
    wholesalePerLiter: 583, 
    rarity: 'premium', 
    color: '#9DC183', 
    scentProfile: 'Citrus, floral, uplifting, non-phototoxic',
    origin: 'Italy',
    certification: 'Certified Organic',
    botanicalName: 'Citrus bergamia',
    extractionMethod: 'Cold pressed + washed (bergapten-free)',
    collectionPrice5ml: 21.95,
    collectionPrice30ml: 52.95,
  },
  { 
    id: 'sweet-orange', 
    name: 'Sweet Orange', 
    wholesalePerLiter: 75, 
    rarity: 'common', 
    color: '#FF8C00', 
    scentProfile: 'Cheerful, sweet, bright, uplifting',
    origin: 'Australia',
    certification: 'Certified Organic',
    botanicalName: 'Citrus sinensis',
    extractionMethod: 'Cold pressed from peels',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 22.95,
  },
  { 
    id: 'frankincense', 
    name: 'Frankincense (Serrata)', 
    wholesalePerLiter: 137.5, 
    rarity: 'premium', 
    color: '#F5DEB3', 
    scentProfile: 'Resinous, woody, spiritual, grounding',
    origin: 'India',
    botanicalName: 'Boswellia serrata',
    extractionMethod: 'Steam distilled from resin',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 25.95,
  },
  { 
    id: 'peppermint', 
    name: 'Peppermint', 
    wholesalePerLiter: 350, 
    rarity: 'premium', 
    color: '#98FB98', 
    scentProfile: 'Cooling, sharp, refreshing, energizing',
    origin: 'India',
    certification: 'Certified Organic',
    botanicalName: 'Mentha piperita',
    extractionMethod: 'Steam distilled from whole plant',
    collectionPrice5ml: 18.95,
    collectionPrice30ml: 38.95,
  },
  { 
    id: 'grapefruit', 
    name: 'Pink Grapefruit', 
    wholesalePerLiter: 121, 
    rarity: 'common', 
    color: '#FF7F7F', 
    scentProfile: 'Tangy, sweet, energizing, fresh',
    botanicalName: 'Citrus paradisi',
    extractionMethod: 'Cold pressed from peels',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 24.95,
  },
  { 
    id: 'cedarwood', 
    name: 'Cedarwood Atlas', 
    wholesalePerLiter: 93.6, 
    rarity: 'common', 
    color: '#8B4513', 
    scentProfile: 'Warm, woody, balsamic, grounding',
    origin: 'Morocco',
    certification: 'Certified Organic',
    botanicalName: 'Cedrus atlantica',
    extractionMethod: 'Steam distilled from wood',
    collectionPrice5ml: 16.95,
    collectionPrice30ml: 23.95,
  },
  { 
    id: 'ylang-ylang', 
    name: 'Ylang Ylang', 
    wholesalePerLiter: 550, 
    rarity: 'premium', 
    color: '#FFD700', 
    scentProfile: 'Rich, sweet, floral, exotic, aphrodisiac',
    origin: 'Madagascar',
    certification: 'Certified Organic',
    botanicalName: 'Cananga odorata',
    extractionMethod: 'Steam distilled from fresh flowers',
    collectionPrice5ml: 20.95,
    collectionPrice30ml: 49.95,
  },
  { 
    id: 'rosemary', 
    name: 'Rosemary CT Cineole', 
    wholesalePerLiter: 300, 
    rarity: 'premium', 
    color: '#228B22', 
    scentProfile: 'Fresh, herbaceous, clearing, mentally stimulating',
    origin: 'Spain',
    certification: 'Certified Organic (ACO & USDA)',
    botanicalName: 'Rosmarinus officinalis',
    extractionMethod: 'Steam distilled from flowering tops and leaves',
    collectionPrice5ml: 18.95,
    collectionPrice30ml: 38.95,
  },
  { 
    id: 'camphor-white', 
    name: 'Camphor White', 
    wholesalePerLiter: 41.8, 
    rarity: 'common', 
    color: '#F5F5F5', 
    scentProfile: 'Intense, medicinal, penetrating, warming',
    origin: 'China',
    botanicalName: 'Cinnamomum camphora',
    extractionMethod: 'Steam distilled from leaves and branches',
    collectionPrice5ml: 15.95,
    collectionPrice30ml: 19.95,
  },
  { 
    id: 'vetiver', 
    name: 'Vetiver', 
    wholesalePerLiter: 605, 
    rarity: 'premium', 
    color: '#4A3728', 
    scentProfile: 'Deep, smoky, earthy, woody, grounding',
    botanicalName: 'Vetiveria zizanioides',
    extractionMethod: 'Steam distilled from roots',
    collectionPrice5ml: 21.95,
    collectionPrice30ml: 54.95,
  },
  { 
    id: 'ho-wood', 
    name: 'Ho Wood', 
    wholesalePerLiter: 170.5, 
    rarity: 'common', 
    color: '#D4A574', 
    scentProfile: 'Sweet, floral, woody, rose-like, gentle',
    origin: 'China',
    botanicalName: 'Cinnamomum camphora',
    extractionMethod: 'Steam distilled from wood',
    collectionPrice5ml: 17.95,
    collectionPrice30ml: 26.95,
  },
  { 
    id: 'wintergreen', 
    name: 'Wintergreen', 
    wholesalePerLiter: 429, 
    rarity: 'premium', 
    color: '#2E8B57', 
    scentProfile: 'Sweet, minty, fresh, penetrating, medicinal',
    origin: 'Nepal',
    certification: 'Certified Organic (ACO & USDA)',
    botanicalName: 'Gaultheria fragrantissima',
    extractionMethod: 'Steam distilled from leaves',
    collectionPrice5ml: 19.95,
    collectionPrice30ml: 42.95,
  },
  { 
    id: 'cypress', 
    name: 'Cypress', 
    wholesalePerLiter: 319, 
    rarity: 'premium', 
    color: '#556B2F', 
    scentProfile: 'Fresh, woody, balsamic, clean, coniferous',
    origin: 'Spain',
    certification: 'Certified Organic (ACO)',
    botanicalName: 'Cupressus sempervirens',
    extractionMethod: 'Steam distilled from needles and twigs',
    collectionPrice5ml: 18.95,
    collectionPrice30ml: 39.95,
  },
  { 
    id: 'basil-linalool', 
    name: 'Basil CT Linalool', 
    wholesalePerLiter: 418, 
    rarity: 'premium', 
    color: '#7CB342', 
    scentProfile: 'Sweet, herbaceous, anise-like, uplifting, calming',
    origin: 'Egypt',
    certification: 'Certified Organic (ACO & USDA)',
    botanicalName: 'Ocimum basilicum',
    extractionMethod: 'Steam distilled from flowering heads',
    collectionPrice5ml: 19.95,
    collectionPrice30ml: 41.95,
  },
  { 
    id: 'oregano', 
    name: 'Oregano', 
    wholesalePerLiter: 220, 
    rarity: 'premium', 
    color: '#8B4513', 
    scentProfile: 'Strong, herbaceous, spicy, warm, camphoraceous',
    origin: 'Spain',
    botanicalName: 'Origanum vulgare',
    extractionMethod: 'Steam distilled from dried herb',
    collectionPrice5ml: 18.95,
    collectionPrice30ml: 34.95,
  },
]

// ============================================================================
// CRYSTAL SELECTION - Same as Collection (all $0.25 each)
// ============================================================================

export interface AtelierCrystal {
  id: string
  name: string
  description: string
  properties: string[]
  chakra: string
  element: string
  color: string
}

export const ATELIER_CRYSTALS: AtelierCrystal[] = [
  {
    id: 'clear-quartz',
    name: 'Clear Quartz',
    description: 'Master healer, amplifies energy and intention',
    properties: ['amplification', 'clarity', 'healing'],
    chakra: 'crown',
    element: 'air',
    color: '#e8e8e8',
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    description: 'Spiritual wisdom, inner peace, stress relief',
    properties: ['spiritual', 'calming', 'protection'],
    chakra: 'crown',
    element: 'air',
    color: '#9966cc',
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    description: 'Unconditional love, compassion, emotional healing',
    properties: ['love', 'healing', 'harmony'],
    chakra: 'heart',
    element: 'water',
    color: '#f4c2c2',
  },
  {
    id: 'citrine',
    name: 'Citrine',
    description: 'Abundance, personal power, creativity',
    properties: ['abundance', 'confidence', 'energy'],
    chakra: 'solar-plexus',
    element: 'fire',
    color: '#e4d00a',
  },
  {
    id: 'black-tourmaline',
    name: 'Black Tourmaline',
    description: 'Ultimate protection, grounding, EMF shielding',
    properties: ['protection', 'grounding', 'cleansing'],
    chakra: 'root',
    element: 'earth',
    color: '#1a1a1a',
  },
  {
    id: 'carnelian',
    name: 'Carnelian',
    description: 'Vitality, creative passion, motivation',
    properties: ['creativity', 'courage', 'vitality'],
    chakra: 'sacral',
    element: 'fire',
    color: '#e35e38',
  },
  {
    id: 'aventurine',
    name: 'Green Aventurine',
    description: 'Heart-centered abundance, opportunity, growth',
    properties: ['luck', 'prosperity', 'heart-healing'],
    chakra: 'heart',
    element: 'earth',
    color: '#5c8a5c',
  },
  {
    id: 'lapis-lazuli',
    name: 'Lapis Lazuli',
    description: 'Truth, inner vision, spiritual insight',
    properties: ['intuition', 'wisdom', 'communication'],
    chakra: 'third-eye',
    element: 'air',
    color: '#26619c',
  },
  {
    id: 'tigers-eye',
    name: "Tiger's Eye",
    description: 'Courage, clear perception, confidence',
    properties: ['confidence', 'protection', 'clarity'],
    chakra: 'solar-plexus',
    element: 'earth',
    color: '#b86d29',
  },
  {
    id: 'moonstone',
    name: 'Moonstone',
    description: 'New beginnings, intuition, emotional balance',
    properties: ['feminine', 'cycles', 'balance'],
    chakra: 'sacral',
    element: 'water',
    color: '#e3e3e3',
  },
  {
    id: 'hematite',
    name: 'Hematite',
    description: 'Grounding, mental organization, focus',
    properties: ['focus', 'grounding', 'strength'],
    color: '#696969',
    chakra: 'root',
    element: 'earth',
  },
  {
    id: 'sodalite',
    name: 'Sodalite',
    description: 'Logic, communication, emotional balance',
    properties: ['communication', 'truth', 'expression'],
    chakra: 'throat',
    element: 'water',
    color: '#1e3a5f',
  },
  {
    id: 'red-jasper',
    name: 'Red Jasper',
    description: 'Endurance, stability, nurturing',
    properties: ['strength', 'grounding', 'courage'],
    chakra: 'root',
    element: 'earth',
    color: '#8b3a3a',
  },
  {
    id: 'howlite',
    name: 'Howlite',
    description: 'Patience, perspective, stress relief',
    properties: ['calm', 'patience', 'awareness'],
    chakra: 'crown',
    element: 'air',
    color: '#e8e8e8',
  },
  {
    id: 'green-aventurine',
    name: 'Green Aventurine',
    description: 'Heart healing, abundance, compassion',
    properties: ['heart-healing', 'luck', 'wellbeing'],
    chakra: 'heart',
    element: 'earth',
    color: '#6b8e6b',
  },
  {
    id: 'peridot',
    name: 'Peridot',
    description: 'Compassion, emotional cleansing, renewal',
    properties: ['compassion', 'release', 'heart'],
    chakra: 'heart',
    element: 'earth',
    color: '#90ee90',
  },
  {
    id: 'orange-calcite',
    name: 'Orange Calcite',
    description: 'Playfulness, emotional balance, optimism',
    properties: ['joy', 'balance', 'uplifting'],
    chakra: 'sacral',
    element: 'fire',
    color: '#ffa500',
  },
  {
    id: 'sunstone',
    name: 'Sunstone',
    description: 'Leadership, independence, good fortune',
    properties: ['empowerment', 'luck', 'radiance'],
    chakra: 'solar-plexus',
    element: 'fire',
    color: '#d4a574',
  },
  {
    id: 'fluorite',
    name: 'Fluorite',
    description: 'Mental order, clarity, focus',
    properties: ['clarity', 'focus', 'organization'],
    chakra: 'third-eye',
    element: 'air',
    color: '#7b68ee',
  },
  {
    id: 'yellow-jasper',
    name: 'Yellow Jasper',
    description: 'Endurance, positivity, protection',
    properties: ['stamina', 'optimism', 'safety'],
    chakra: 'solar-plexus',
    element: 'earth',
    color: '#f0e68c',
  },
  {
    id: 'peach-moonstone',
    name: 'Peach Moonstone',
    description: 'New beginnings, emotional balance, self-love',
    properties: ['renewal', 'balance', 'gentleness'],
    chakra: 'sacral',
    element: 'water',
    color: '#f4c2a1',
  },
  {
    id: 'smoky-quartz',
    name: 'Smoky Quartz',
    description: 'Stress transmutation, grounding, detoxification',
    properties: ['transmutation', 'grounding', 'release'],
    chakra: 'root',
    element: 'earth',
    color: '#6b5a4d',
  },
]

// Get all crystals for selection
export function getAllCrystals(): AtelierCrystal[] {
  return ATELIER_CRYSTALS
}

// Suggest crystals based on oil combination
export function suggestCrystals(oilIds: string[]): AtelierCrystal[] {
  if (oilIds.length === 0) return []
  
  // Default suggestions based on common blend intentions
  const calmingOils = ['lavender', 'clary-sage', 'frankincense', 'cedarwood']
  const energizingOils = ['lemon', 'peppermint', 'grapefruit', 'sweet-orange', 'bergamot-fcf', 'lemon-myrtle', 'may-chang']
  const groundingOils = ['patchouli-dark', 'cedarwood', 'frankincense', 'myrrh', 'vetiver']
  const upliftingOils = ['sweet-orange', 'bergamot-fcf', 'grapefruit', 'lemon', 'geranium-bourbon']
  
  const hasCalming = oilIds.some(id => calmingOils.includes(id))
  const hasEnergizing = oilIds.some(id => energizingOils.includes(id))
  const hasGrounding = oilIds.some(id => groundingOils.includes(id))
  const hasUplifting = oilIds.some(id => upliftingOils.includes(id))
  
  const suggestions: AtelierCrystal[] = []
  
  if (hasCalming) {
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'amethyst')!)
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'rose-quartz')!)
  }
  
  if (hasEnergizing) {
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'citrine')!)
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'sunstone')!)
  }
  
  if (hasGrounding) {
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'black-tourmaline')!)
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'hematite')!)
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'smoky-quartz')!)
  }
  
  if (hasUplifting) {
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'citrine')!)
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'orange-calcite')!)
  }
  
  // Default to clear quartz if no specific matches
  if (suggestions.length === 0) {
    suggestions.push(ATELIER_CRYSTALS.find(c => c.id === 'clear-quartz')!)
  }
  
  // Deduplicate by ID
  const seen = new Set<string>()
  return suggestions.filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  }).slice(0, 3)
}

// ============================================================================
// ATELIER PRICING - Custom blend pricing
// ============================================================================

export interface AtelierBlendConfig {
  name: string
  mode: 'pure' | 'carrier'
  bottleSize: 5 | 10 | 15 | 20 | 30
  components: { oilId: string; ml: number }[]
  strength?: number // For carrier mode (5-75)
  crystalId?: string
  cordId?: string
  safetyScore?: number
}

export function calculateAtelierPrice(config: AtelierBlendConfig) {
  const { mode, bottleSize, components, crystalId, cordId } = config
  
  // Count unique oils
  const oilCount = components.length
  
  // Calculate oil costs using WHOLESALE + MARGIN (same as collection)
  let oilCost = 0
  let componentPrices: { name: string; ml: number; cost: number; price: number }[] = []
  
  components.forEach(comp => {
    const oil = ATELIER_OILS.find(o => o.id === comp.oilId)
    if (oil) {
      // Calculate wholesale cost
      const wholesaleCost = (oil.wholesalePerLiter / 1000) * comp.ml
      // Apply margin (same as collection: wholesale / margin divisor)
      const price = wholesaleCost / MARGIN_DIVISORS[mode]
      
      oilCost += price
      componentPrices.push({
        name: oil.name,
        ml: comp.ml,
        cost: wholesaleCost,
        price
      })
    }
  })
  
  // Additional oil fee: $1 per oil after the first 2
  const additionalOilFee = oilCount > 2 ? (oilCount - 2) * 1.00 : 0
  
  // Crystal cost ($0.25 each) - always included based on bottle size
  const crystalCost = 0.25 * (CRYSTAL_COUNTS[`${bottleSize}ml`] || 12)
  
  // Cord cost (pass-through)
  const cordCost = 0 // Cords are added separately via cord selection
  
  // Labor cost
  const laborCost = mode === 'pure' ? FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure : FIXED_COSTS.laborCarrier / MARGIN_DIVISORS.carrier
  
  // Bottle cost
  const bottleCost = FIXED_COSTS.newBottleBuffer * 1.25
  
  // Calculate subtotal
  const subtotal = oilCost + additionalOilFee + crystalCost + laborCost + bottleCost
  
  // Round to .95
  const total = roundTo95(subtotal)
  
  const subtotalBeforeRounding = subtotal
  const roundingAdjustment = total - subtotal

  return {
    costs: {
      oils: componentPrices.map(c => ({
        name: c.name,
        ml: c.ml,
        wholesaleCost: c.cost,
        retailPrice: c.price,
      })),
      oilsSubtotal: oilCost,
      additionalOilFee,
      carrierOil: 0, // Carrier oil cost is built into pricing
      bottleCost: bottleCost,
      bottleType: mode === 'carrier' ? 'roller' : 'dropper',
      crystals: crystalCost,
      cord: cordCost,
      labor: laborCost,
      subtotalBeforeRounding,
      roundingAdjustment,
    },
    total,
    perDrop: total / (bottleSize * 20), // ~20 drops per ml
  }
}

// Format price for display
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}
