/**
 * Oil Amor — Order Item Classifier
 * Determines the exact type of each order item from cart/checkout data
 */

import { OrderItemType, EnrichedOrderItem } from './types'
import { CartItem } from '@/lib/cart/types'
import { OrderCustomMix } from '@/lib/db/schema/orders'

// ============================================================================
// CLASSIFICATION LOGIC
// ============================================================================

export function classifyCartItem(item: CartItem): OrderItemType {
  // Check for custom mix first (highest priority)
  if (item.customMix) {
    return 'custom_blend'
  }

  // Check configuration for product type hints
  const config = item.configuration || {}

  // Refill detection
  if (config.isRefill || item.properties?.isRefill === 'true') {
    return 'refill'
  }

  // Forever bottle
  if (item.name?.toLowerCase().includes('forever bottle') || config.type === 'forever_bottle') {
    return 'forever_bottle'
  }

  // Crystal
  if (config.crystalName || config.crystals || item.name?.toLowerCase().includes('crystal')) {
    return 'crystal'
  }

  // Cord / Charm
  if (item.attachment?.type === 'cord' || item.attachment?.type === 'charm') {
    return 'cord_charm'
  }

  // Community blend
  if (config.communityBlendId || item.properties?.communityBlendId || item.properties?.blendId) {
    return 'community_blend'
  }

  // Collection blend
  if (config.collectionBlendId || item.properties?.collectionBlendId) {
    return 'collection_blend'
  }

  // Carrier oil
  if (config.carrierOil || item.name?.toLowerCase().includes('carrier') || item.name?.toLowerCase().includes('roller')) {
    return 'carrier_oil'
  }

  // Pure oil (default for oil products)
  if (config.oilName || config.oils || item.unlocksOilId) {
    return 'pure_oil'
  }

  // Gift card
  if (item.name?.toLowerCase().includes('gift card')) {
    return 'gift_card'
  }

  // Shipping
  if (item.name?.toLowerCase().includes('shipping') || item.name?.toLowerCase().includes('delivery')) {
    return 'shipping'
  }

  // Default fallback — try to infer from name
  const nameLower = item.name?.toLowerCase() || ''
  if (nameLower.includes('blend')) return 'collection_blend'
  if (nameLower.includes('oil')) return 'pure_oil'

  return 'pure_oil'
}

// ============================================================================
// ENRICH CART ITEM TO ORDER ITEM
// ============================================================================

export function enrichCartItem(item: CartItem): EnrichedOrderItem {
  const type = classifyCartItem(item)
  const basePrice = (item.unitPrice || item.price || 0) / 100 // Convert cents to dollars

  const base: EnrichedOrderItem = {
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: item.name || 'Unknown Item',
    type,
    unitPrice: basePrice,
    quantity: item.quantity || 1,
    totalPrice: basePrice * (item.quantity || 1),
    imageUrl: item.image,
    description: item.description,
    attachment: item.attachment,
    unlocksOilId: item.unlocksOilId,
  }

  // Enrich based on type
  switch (type) {
    case 'custom_blend':
      return enrichCustomBlend(base, item.customMix!)

    case 'community_blend':
      return enrichCommunityBlend(base, item)

    case 'collection_blend':
      return enrichCollectionBlend(base, item)

    case 'refill':
      return enrichRefill(base, item)

    case 'pure_oil':
      return enrichPureOil(base, item)

    case 'carrier_oil':
      return enrichCarrierOil(base, item)

    case 'crystal':
      return enrichCrystal(base, item)

    case 'cord_charm':
      return enrichCordCharm(base, item)

    case 'forever_bottle':
      return enrichForeverBottle(base, item)

    default:
      return base
  }
}

// ============================================================================
// TYPE-SPECIFIC ENRICHMENT
// ============================================================================

function enrichCustomBlend(base: EnrichedOrderItem, mix: OrderCustomMix): EnrichedOrderItem {
  return {
    ...base,
    type: 'custom_blend',
    customMix: {
      name: mix.recipeName || 'Custom Blend',
      mode: mix.mode,
      totalVolume: mix.totalVolume,
      strength: mix.intendedUse, // Using intendedUse as strength indicator
      oils: mix.oils.map(o => ({
        oilId: o.oilId,
        oilName: o.oilName,
        ml: o.ml,
        percentage: o.percentage,
        drops: o.drops,
      })),
      carrierOil: mix.carrierOilId,
      carrierPercentage: mix.carrierRatio,
      crystal: mix.crystalId,
      cord: mix.cordId,
      intendedUse: mix.intendedUse,
      safetyScore: mix.safetyScore,
      safetyRating: mix.safetyRating,
      safetyWarnings: mix.safetyWarnings || [],
      batchId: mix.batchId || `OA-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    },
    bottleSize: mix.totalVolume,
  }
}

function enrichCommunityBlend(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  const config = item.configuration || {}
  return {
    ...base,
    type: 'community_blend',
    communityBlendId: String(config.communityBlendId || item.properties?.communityBlendId || ''),
    communityBlendName: String(config.communityBlendName || item.name || ''),
    communityBlendCreatorId: String(config.creatorId || item.properties?.creatorId || ''),
    communityBlendCreatorName: String(config.creatorName || item.properties?.creatorName || ''),
    commissionRate: 10, // 10% default
    bottleSize: parseInt(String(config.bottleSize || '30')),
  }
}

function enrichCollectionBlend(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  const config = item.configuration || {}
  return {
    ...base,
    type: 'collection_blend',
    collectionBlendId: String(config.collectionBlendId || item.properties?.collectionBlendId || ''),
    collectionBlendName: String(config.collectionBlendName || item.name || ''),
    bottleSize: parseInt(String(config.bottleSize || '30')),
  }
}

function enrichRefill(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  const config = item.configuration || {}
  return {
    ...base,
    type: 'refill',
    isRefill: true,
    originalBatchId: String(config.originalBatchId || item.properties?.originalBatchId || ''),
    originalOrderId: String(config.originalOrderId || item.properties?.originalOrderId || ''),
    sourceVolume: parseInt(String(config.sourceVolume || '30')),
    targetVolume: parseInt(String(config.targetVolume || '100')),
    bottleSize: parseInt(String(config.targetVolume || '100')),
    // scaledRecipe will be populated during order creation
  }
}

function enrichPureOil(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  const config = item.configuration || {}
  return {
    ...base,
    type: 'pure_oil',
    productType: 'pure_oil',
    oilId: config.oilName || item.unlocksOilId || item.productId,
    bottleSize: parseInt(String(config.bottleSize || '30')),
  }
}

function enrichCarrierOil(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  const config = item.configuration || {}
  return {
    ...base,
    type: 'carrier_oil',
    productType: 'carrier_oil',
    oilId: config.carrierOil || config.oilName || item.productId,
    bottleSize: parseInt(String(config.bottleSize || '30')),
  }
}

function enrichCrystal(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  const config = item.configuration || {}
  return {
    ...base,
    type: 'crystal',
    productType: 'crystal',
    crystalId: config.crystalName || config.crystals?.[0] || item.productId,
  }
}

function enrichCordCharm(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  return {
    ...base,
    type: 'cord_charm',
    productType: 'attachment',
  }
}

function enrichForeverBottle(base: EnrichedOrderItem, item: CartItem): EnrichedOrderItem {
  return {
    ...base,
    type: 'forever_bottle',
    productType: 'forever_bottle',
  }
}

// ============================================================================
// BATCH ORDER ENRICHMENT
// ============================================================================

export function enrichCartItems(items: CartItem[]): EnrichedOrderItem[] {
  return items.map(enrichCartItem)
}

// ============================================================================
// ORDER TYPE DETECTION (for order-level flags)
// ============================================================================

export function orderRequiresBlending(items: EnrichedOrderItem[]): boolean {
  return items.some(item =>
    item.type === 'custom_blend' ||
    item.type === 'collection_blend' ||
    item.type === 'community_blend' ||
    item.type === 'refill'
  )
}

export function orderHasCommissions(items: EnrichedOrderItem[]): boolean {
  return items.some(item => item.type === 'community_blend')
}

export function orderHasRefills(items: EnrichedOrderItem[]): boolean {
  return items.some(item => item.type === 'refill')
}

export function getOrderTypeLabel(items: EnrichedOrderItem[]): string {
  const types = new Set(items.map(i => i.type))
  if (types.has('custom_blend')) return 'Custom Blend'
  if (types.has('community_blend')) return 'Community Blend'
  if (types.has('collection_blend')) return 'Collection Blend'
  if (types.has('refill')) return 'Refill'
  if (types.has('pure_oil') && types.size === 1) return 'Pure Oil'
  if (types.has('forever_bottle')) return 'Forever Bottle'
  return 'Mixed Order'
}
