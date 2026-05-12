/**
 * Oil Amor - Final Pricing Engine V1
 * Precision pricing for all 17 oils
 * Margins: Pure 48-49%, Carrier 50-51%, Refill 45%/40%
 */

// ============================================================================
// SLUG TO OIL ID MAPPING
// ============================================================================

export const SLUG_TO_OIL_ID: Record<string, string> = {
  'lavender-essential-oil': 'lavender',
  'blue-mallee-eucalyptus': 'eucalyptus',
  'tea-tree-oil': 'tea-tree',
  'clove-bud-oil': 'clove-bud',
  'lemongrass-oil': 'lemongrass',
  'clary-sage-oil': 'clary-sage',
  'ginger-oil': 'ginger',
  'cinnamon-bark-oil': 'cinnamon-bark',
  'may-chang-oil': 'may-chang',
  'patchouli-dark-oil': 'patchouli-dark',
  'carrot-seed-oil': 'carrot-seed',
  'geranium-bourbon-oil': 'geranium-bourbon',
  'juniper-berry-oil': 'juniper-berry',
  'cinnamon-leaf-oil': 'cinnamon-leaf',
  'lemon-myrtle-oil': 'lemon-myrtle',
  'lemon-oil': 'lemon',
  'myrrh-oil': 'myrrh',
  'bergamot-fcf-organic': 'bergamot-fcf',
  'sweet-orange-oil': 'sweet-orange',
  'frankincense-oil': 'frankincense',
  'peppermint-oil': 'peppermint',
  'grapefruit-oil': 'grapefruit',
  'cedarwood-oil': 'cedarwood',
  'ylang-ylang-oil': 'ylang-ylang',
  'rosemary-oil': 'rosemary',
  'camphor-white-oil': 'camphor-white',
  'vetiver-oil': 'vetiver',
  'ho-wood-oil': 'ho-wood',
  'wintergreen-oil': 'wintergreen',
  'cypress-oil': 'cypress',
  'basil-linalool-oil': 'basil-linalool',
  'oregano-oil': 'oregano',
}

export function getOilIdFromSlug(slug: string): string {
  return SLUG_TO_OIL_ID[slug] || slug
}

// ============================================================================
// WHOLESALE COSTS (What You Pay)
// ============================================================================

export const WHOLESALE_OILS: Record<string, { name: string; pricePerLiter: number; rarity: string; origin?: string; organic?: boolean }> = {
  'lemongrass': { name: 'Lemongrass', pricePerLiter: 103, rarity: 'common' },
  'lavender': { name: 'Lavender', pricePerLiter: 115, rarity: 'common' },
  'eucalyptus': { name: 'Blue Mallee Eucalyptus', pricePerLiter: 115, rarity: 'common' },
  'cinnamon-leaf': { name: 'Cinnamon Leaf', pricePerLiter: 130, rarity: 'common' },
  'clove-bud': { name: 'Clove Bud', pricePerLiter: 130, rarity: 'common' },
  'tea-tree': { name: 'Tea Tree', pricePerLiter: 146, rarity: 'common' },
  'may-chang': { name: 'May Chang', pricePerLiter: 160, rarity: 'common' },
  'ginger': { name: 'Ginger', pricePerLiter: 250, rarity: 'premium' },
  'carrot-seed': { name: 'Carrot Seed', pricePerLiter: 250, rarity: 'premium' },
  'lemon-myrtle': { name: 'Lemon Myrtle', pricePerLiter: 250, rarity: 'premium' },
  'cinnamon-bark': { name: 'Cinnamon Bark', pricePerLiter: 260, rarity: 'premium' },
  'clary-sage': { name: 'Clary Sage', pricePerLiter: 300, rarity: 'premium' },
  'geranium-bourbon': { name: 'Geranium Bourbon', pricePerLiter: 350, rarity: 'premium' },
  'juniper-berry': { name: 'Juniper Berry', pricePerLiter: 440, rarity: 'luxury' },
  'patchouli-dark': { name: 'Patchouli Dark', pricePerLiter: 515, rarity: 'luxury' },
  'myrrh': { name: 'Myrrh', pricePerLiter: 1000, rarity: 'luxury' },
  'bergamot-fcf': { name: 'Bergamot (FCF) Organic', pricePerLiter: 583, rarity: 'premium', origin: 'Italy', organic: true },
  'sweet-orange': { name: 'Sweet Orange', pricePerLiter: 75, rarity: 'common', origin: 'Australia', organic: true },
  'frankincense': { name: 'Frankincense (Serrata)', pricePerLiter: 137.5, rarity: 'premium', origin: 'India' },
  'peppermint': { name: 'Peppermint', pricePerLiter: 350, rarity: 'premium', origin: 'India', organic: true },
  'lemon': { name: 'Lemon (Australian)', pricePerLiter: 99, rarity: 'common', origin: 'Australia' },
  'grapefruit': { name: 'Pink Grapefruit', pricePerLiter: 121, rarity: 'common' },
  'cedarwood': { name: 'Cedarwood Atlas', pricePerLiter: 93.6, rarity: 'common', origin: 'Morocco', organic: true },
  'ylang-ylang': { name: 'Ylang Ylang', pricePerLiter: 550, rarity: 'premium', origin: 'Madagascar', organic: true },
  'rosemary': { name: 'Rosemary CT Cineole', pricePerLiter: 300, rarity: 'premium', origin: 'Spain', organic: true },
  'camphor-white': { name: 'Camphor White', pricePerLiter: 41.8, rarity: 'common', origin: 'China' },
  'vetiver': { name: 'Vetiver', pricePerLiter: 605, rarity: 'premium' },
  'ho-wood': { name: 'Ho Wood', pricePerLiter: 170.5, rarity: 'common', origin: 'China' },
  'wintergreen': { name: 'Wintergreen', pricePerLiter: 429, rarity: 'premium', origin: 'Nepal', organic: true },
  'cypress': { name: 'Cypress', pricePerLiter: 319, rarity: 'premium', origin: 'Spain', organic: true },
  'basil-linalool': { name: 'Basil CT Linalool', pricePerLiter: 418, rarity: 'premium', origin: 'Egypt', organic: true },
  'oregano': { name: 'Oregano', pricePerLiter: 220, rarity: 'premium', origin: 'Spain' },
}

// ============================================================================
// FIXED COSTS
// ============================================================================

export const FIXED_COSTS = {
  carrierOilPerMl: 2.50 / 30, // $0.083/ml
  newBottleBuffer: 4.00,
  refillBottleBuffer: 6.00,
  crystalPerChip: 0.25,
  laborPure: 5.00,
  laborCarrier: 6.00,
  laborRefill: 2.50,
}

// ============================================================================
// CRYSTAL COUNTS (for new bottles only - refills don't include crystals)
// ============================================================================

export const CRYSTAL_COUNTS: Record<string, number> = {
  '5ml': 2,
  '10ml': 4,
  '15ml': 6,
  '20ml': 8,
  '30ml': 12,
}

// ============================================================================
// MARGIN DIVISORS
// ============================================================================

export const MARGIN_DIVISORS = {
  pure: 0.51,      // 49% margin
  carrier: 0.50,   // 50% margin
  refill50: 0.55,  // 45% margin
  refill100: 0.60, // 40% margin
}

// ============================================================================
// PRICE CALCULATION FUNCTIONS
// ============================================================================

export function roundTo95(price: number): number {
  return Math.ceil(price - 0.95) + 0.95
}

export function calculatePurePrice(
  slug: string,
  sizeMl: number,
  isRefill: boolean = false
): number {
  const oilId = getOilIdFromSlug(slug)
  const oil = WHOLESALE_OILS[oilId]
  
  if (!oil) {
    console.error(`Oil not found for slug: ${slug}, mapped to: ${oilId}`)
    return 0
  }
  
  const oilCost = (oil.pricePerLiter / 1000) * sizeMl
  
  if (isRefill) {
    // Refill: Oil with margin + bottle with 25% markup + labor with margin (NO crystals - forever bottles retain them)
    const marginDivisor = sizeMl === 50 ? MARGIN_DIVISORS.refill50 : MARGIN_DIVISORS.refill100
    const oilWithMargin = oilCost / marginDivisor
    const bottleWithMargin = FIXED_COSTS.refillBottleBuffer * 1.25
    const laborWithMargin = FIXED_COSTS.laborRefill / marginDivisor
    return roundTo95(oilWithMargin + bottleWithMargin + laborWithMargin)
  }
  
  const sizeKey = `${sizeMl}ml`
  const chipCount = CRYSTAL_COUNTS[sizeKey] || 12
  const crystalCost = chipCount * FIXED_COSTS.crystalPerChip
  // New bottle: Oil with 2x margin + bottle with 25% markup + crystals at cost + labor with margin
  const oilWithMargin = oilCost / MARGIN_DIVISORS.pure
  const bottleWithMargin = FIXED_COSTS.newBottleBuffer * 1.25
  const laborWithMargin = FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure
  return roundTo95(oilWithMargin + bottleWithMargin + crystalCost + laborWithMargin)
}

export function calculateCarrierPrice(
  slug: string,
  sizeMl: number,
  oilRatio: number, // 0.05, 0.10, 0.25, 0.50
  isRefill: boolean = false
): number {
  const oilId = getOilIdFromSlug(slug)
  const oil = WHOLESALE_OILS[oilId]
  
  if (!oil) {
    console.error(`Oil not found for slug: ${slug}, mapped to: ${oilId}`)
    return 0
  }
  
  const carrierRatio = 1 - oilRatio
  
  const oilVolume = sizeMl * oilRatio
  const carrierVolume = sizeMl * carrierRatio
  
  const oilCost = (oil.pricePerLiter / 1000) * oilVolume
  const carrierCost = FIXED_COSTS.carrierOilPerMl * carrierVolume
  
  if (isRefill) {
    // Refill: Oil with margin + carrier with margin + bottle with 25% markup + labor with margin (NO crystals)
    const marginDivisor = sizeMl === 50 ? MARGIN_DIVISORS.refill50 : MARGIN_DIVISORS.refill100
    const oilWithMargin = oilCost / marginDivisor
    const carrierWithMargin = carrierCost / marginDivisor
    const bottleWithMargin = FIXED_COSTS.refillBottleBuffer * 1.25
    const laborWithMargin = FIXED_COSTS.laborRefill / marginDivisor
    return roundTo95(oilWithMargin + carrierWithMargin + bottleWithMargin + laborWithMargin)
  }
  
  const sizeKey = `${sizeMl}ml`
  const chipCount = CRYSTAL_COUNTS[sizeKey] || 12
  const crystalCost = chipCount * FIXED_COSTS.crystalPerChip
  // New bottle: Oil with margin + carrier with margin + bottle with 25% markup + crystals at cost + labor with margin
  const oilWithMargin = oilCost / MARGIN_DIVISORS.carrier
  const carrierWithMargin = carrierCost / MARGIN_DIVISORS.carrier
  const bottleWithMargin = FIXED_COSTS.newBottleBuffer * 1.25
  const laborWithMargin = FIXED_COSTS.laborCarrier / MARGIN_DIVISORS.carrier
  return roundTo95(oilWithMargin + carrierWithMargin + bottleWithMargin + crystalCost + laborWithMargin)
}

// ============================================================================
// DYNAMIC PRICE BASED ON CONFIGURATION
// ============================================================================

export interface PricingConfig {
  oilId: string
  sizeMl: number
  type: 'pure' | 'carrier'
  ratio?: number // 0.05, 0.10, 0.25, 0.50 for carrier blends
  isRefill?: boolean
}

export function calculatePrice(config: PricingConfig): number {
  if (config.type === 'pure') {
    return calculatePurePrice(config.oilId, config.sizeMl, config.isRefill)
  }
  
  // Carrier blend
  const ratio = config.ratio || 0.25 // default to balanced
  return calculateCarrierPrice(config.oilId, config.sizeMl, ratio, config.isRefill)
}

export function getPriceBreakdown(config: PricingConfig) {
  const price = calculatePrice(config)
  const oilId = getOilIdFromSlug(config.oilId)
  const oil = WHOLESALE_OILS[oilId]
  
  if (!oil) return null
  
  const oilCost = config.type === 'pure' 
    ? (oil.pricePerLiter / 1000) * config.sizeMl
    : (oil.pricePerLiter / 1000) * config.sizeMl * (config.ratio || 0.25)
    
  const carrierCost = config.type === 'carrier' && !config.isRefill
    ? FIXED_COSTS.carrierOilPerMl * config.sizeMl * (1 - (config.ratio || 0.25))
    : 0
    
  const buffer = config.isRefill ? FIXED_COSTS.refillBottleBuffer : FIXED_COSTS.newBottleBuffer
  
  // Crystals only for new bottles, not refills
  const crystalCount = config.isRefill 
    ? 0
    : (CRYSTAL_COUNTS[`${config.sizeMl}ml`] || 12)
  const crystalCost = crystalCount * FIXED_COSTS.crystalPerChip
  
  const labor = config.isRefill 
    ? FIXED_COSTS.laborRefill 
    : config.type === 'carrier' 
      ? FIXED_COSTS.laborCarrier 
      : FIXED_COSTS.laborPure
  
  const totalCost = oilCost + carrierCost + buffer + crystalCost + labor
  
  return {
    price,
    costs: {
      oil: oilCost,
      carrier: carrierCost,
      buffer,
      crystals: crystalCost,
      labor,
      total: totalCost,
    },
    margin: ((price - totalCost) / price * 100).toFixed(1),
  }
}

// ============================================================================
// GET ALL PRICES FOR AN OIL
// ============================================================================

export function getAllPrices(slug: string) {
  return {
    pure: {
      '5ml': calculatePurePrice(slug, 5),
      '10ml': calculatePurePrice(slug, 10),
      '15ml': calculatePurePrice(slug, 15),
      '20ml': calculatePurePrice(slug, 20),
      '30ml': calculatePurePrice(slug, 30),
    },
    carrier: {
      '5ml': {
        '5%': calculateCarrierPrice(slug, 5, 0.05),
        '10%': calculateCarrierPrice(slug, 5, 0.10),
        '25%': calculateCarrierPrice(slug, 5, 0.25),
      },
      '10ml': {
        '5%': calculateCarrierPrice(slug, 10, 0.05),
        '10%': calculateCarrierPrice(slug, 10, 0.10),
        '25%': calculateCarrierPrice(slug, 10, 0.25),
      },
      '15ml': {
        '5%': calculateCarrierPrice(slug, 15, 0.05),
        '10%': calculateCarrierPrice(slug, 15, 0.10),
        '25%': calculateCarrierPrice(slug, 15, 0.25),
        '50%': calculateCarrierPrice(slug, 15, 0.50),
      },
      '20ml': {
        '5%': calculateCarrierPrice(slug, 20, 0.05),
        '10%': calculateCarrierPrice(slug, 20, 0.10),
        '25%': calculateCarrierPrice(slug, 20, 0.25),
        '50%': calculateCarrierPrice(slug, 20, 0.50),
      },
      '30ml': {
        '5%': calculateCarrierPrice(slug, 30, 0.05),
        '10%': calculateCarrierPrice(slug, 30, 0.10),
        '25%': calculateCarrierPrice(slug, 30, 0.25),
        '50%': calculateCarrierPrice(slug, 30, 0.50),
        '75%': calculateCarrierPrice(slug, 30, 0.75),
      },
    },
    refill: {
      '50ml': {
        pure: calculatePurePrice(slug, 50, true),
        '5%': calculateCarrierPrice(slug, 50, 0.05, true),
        '10%': calculateCarrierPrice(slug, 50, 0.10, true),
        '25%': calculateCarrierPrice(slug, 50, 0.25, true),
        '50%': calculateCarrierPrice(slug, 50, 0.50, true),
        '75%': calculateCarrierPrice(slug, 50, 0.75, true),
      },
      '100ml': {
        pure: calculatePurePrice(slug, 100, true),
        '5%': calculateCarrierPrice(slug, 100, 0.05, true),
        '10%': calculateCarrierPrice(slug, 100, 0.10, true),
        '25%': calculateCarrierPrice(slug, 100, 0.25, true),
        '50%': calculateCarrierPrice(slug, 100, 0.50, true),
        '75%': calculateCarrierPrice(slug, 100, 0.75, true),
      },
    },
  }
}

// ============================================================================
// OIL PRICING ARRAY (for collection page)
// ============================================================================

export interface OilPricing {
  id: string
  name: string
  rarity: string
  prices: {
    '5ml': number
    '10ml': number
    '15ml': number
    '20ml': number
    '30ml': number
  }
}

export const OIL_PRICING: OilPricing[] = Object.entries(WHOLESALE_OILS).map(([id, oil]) => ({
  id,
  name: oil.name,
  rarity: oil.rarity,
  prices: {
    '5ml': calculatePurePrice(id, 5),
    '10ml': calculatePurePrice(id, 10),
    '15ml': calculatePurePrice(id, 15),
    '20ml': calculatePurePrice(id, 20),
    '30ml': calculatePurePrice(id, 30),
  }
}))

// Get oil prices in a simpler format for the collection page
export function getOilPrices(oilId: string): { '5ml': number; '10ml': number; '15ml': number; '20ml': number; '30ml': number } {
  const oil = OIL_PRICING.find(o => o.id === oilId)
  if (!oil) {
    // Return default prices if oil not found
    return { '5ml': 16.95, '10ml': 19.95, '15ml': 22.95, '20ml': 24.95, '30ml': 29.95 }
  }
  return oil.prices
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

export function getSavingsPercentage(
  regularPrice: number,
  refillPrice: number,
  refillSize: number,
  regularSize: number
): number {
  const equivalentRegularPrice = regularPrice * (refillSize / regularSize)
  return Math.round(((equivalentRegularPrice - refillPrice) / equivalentRegularPrice) * 100)
}
