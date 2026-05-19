/**
 * Oil Amor Inventory Management
 * Tracks stock levels and handles preorder logic
 */

import { db } from '@/lib/db'
import { inventoryItems, type InventoryItem } from '@/lib/db/schema-refill'
import { eq, sql } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

// Oils that are currently in stock and ship immediately
export const STOCKED_OIL_IDS = new Set([
  'tea-tree',
  'lavender',
  'jojoba',
  'lemongrass',
  'clove-bud',
  'eucalyptus',
])

export interface InventoryCheck {
  available: boolean
  missingItems: string[]
}

export interface OrderItemForInventory {
  type?: string
  customMix?: {
    oils?: Array<{ oilId: string; ml: number; oilName?: string; name?: string }>
    totalVolume?: number
    crystalId?: string
    cordId?: string
  }
  configuration?: {
    oils?: Array<{ name: string; ml: number }>
    bottleSize?: string
    crystalName?: string
    cord?: string
  }
  attachment?: {
    cordId?: string
  }
  quantity?: number
  unlocksOilId?: string
  productId?: string
  name?: string
}

/**
 * Check if a cart/order contains any preorder oils
 * Returns true if ANY oil in the cart is not in the stocked list
 */
export function hasPreorderItems(items: OrderItemForInventory[]): boolean {
  for (const item of items) {
    // Check custom blend oils
    const blendOils = item.customMix?.oils || item.configuration?.oils || []
    for (const oil of blendOils) {
      const oilId = (oil as any).oilId || extractOilIdFromName((oil as any).name || (oil as any).oilName)
      if (oilId && !STOCKED_OIL_IDS.has(oilId)) {
        return true
      }
    }

    // Check standard product oils
    const oilId = item.unlocksOilId || extractOilIdFromName(item.name)
    if (oilId && !STOCKED_OIL_IDS.has(oilId)) {
      return true
    }
  }

  return false
}

/**
 * Get a human-readable list of preorder oils in the cart
 */
export function getPreorderOils(items: OrderItemForInventory[]): string[] {
  const preorderOils = new Set<string>()

  for (const item of items) {
    const blendOils = item.customMix?.oils || item.configuration?.oils || []
    for (const oil of blendOils) {
      const oilId = (oil as any).oilId || extractOilIdFromName((oil as any).name || (oil as any).oilName)
      if (oilId && !STOCKED_OIL_IDS.has(oilId)) {
        preorderOils.add((oil as any).oilName || (oil as any).name || oilId)
      }
    }

    const oilId = item.unlocksOilId || extractOilIdFromName(item.name)
    if (oilId && !STOCKED_OIL_IDS.has(oilId)) {
      preorderOils.add(item.name || oilId)
    }
  }

  return Array.from(preorderOils)
}

function extractOilIdFromName(name?: string): string | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  if (lower.includes('lavender')) return 'lavender'
  if (lower.includes('tea tree')) return 'tea-tree'
  if (lower.includes('eucalyptus')) return 'eucalyptus'
  if (lower.includes('lemongrass')) return 'lemongrass'
  if (lower.includes('clove')) return 'clove-bud'
  if (lower.includes('jojoba')) return 'jojoba'
  return undefined
}

/**
 * Get SKU for an oil bottle based on oilId and size
 */
export function getOilSku(oilId: string, size: string = '30ml'): string {
  return `OIL-${oilId.toUpperCase().replace(/-/g, '')}-${size.toUpperCase().replace('ML', '')}ML`
}

/**
 * Get SKU for a bottle size
 */
export function getBottleSku(size: string): string {
  return `BOTTLE-${size.toUpperCase().replace('ML', '')}ML`
}

/**
 * Get SKU for a crystal
 */
export function getCrystalSku(crystalId: string): string {
  return `CRYSTAL-${crystalId.toUpperCase().replace(/-/g, '')}`
}

/**
 * Get SKU for a cord
 */
export function getCordSku(cordId: string): string {
  return `CORD-${cordId.toUpperCase().replace(/-/g, '')}`
}

/**
 * Check if inventory has sufficient stock for an order
 */
export async function checkInventory(items: OrderItemForInventory[]): Promise<InventoryCheck> {
  const skuMap = new Map<string, number>()

  for (const item of items) {
    const qty = item.quantity || 1

    // Bottles
    const bottleSize = item.customMix?.totalVolume
      ? `${item.customMix.totalVolume}ml`
      : item.configuration?.bottleSize || '30ml'
    const bottleSku = getBottleSku(bottleSize)
    skuMap.set(bottleSku, (skuMap.get(bottleSku) || 0) + qty)

    // Caps/pipettes (1 per bottle)
    const capSku = 'CAP-STANDARD'
    skuMap.set(capSku, (skuMap.get(capSku) || 0) + qty)

    // Oils
    const blendOils = item.customMix?.oils || item.configuration?.oils || []
    if (blendOils.length > 0) {
      for (const oil of blendOils) {
        const oilId = (oil as any).oilId || extractOilIdFromName((oil as any).name || (oil as any).oilName)
        if (oilId) {
          const oilSku = getOilSku(oilId, bottleSize)
          skuMap.set(oilSku, (skuMap.get(oilSku) || 0) + qty)
        }
      }
    } else {
      const oilId = item.unlocksOilId || extractOilIdFromName(item.name)
      if (oilId) {
        const oilSku = getOilSku(oilId, bottleSize)
        skuMap.set(oilSku, (skuMap.get(oilSku) || 0) + qty)
      }
    }

    // Crystals
    const crystalId = item.customMix?.crystalId
    if (crystalId) {
      const crystalSku = getCrystalSku(crystalId)
      skuMap.set(crystalSku, (skuMap.get(crystalSku) || 0) + qty)
    }

    // Cords
    const cordId = item.attachment?.cordId || item.customMix?.cordId || item.configuration?.cord
    if (cordId) {
      const cordSku = getCordSku(cordId)
      skuMap.set(cordSku, (skuMap.get(cordSku) || 0) + qty)
    }
  }

  const missingItems: string[] = []

  for (const [sku, requiredQty] of skuMap.entries()) {
    const inventoryItem = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.sku, sku),
    })

    const availableQty = (inventoryItem?.quantity || 0) - (inventoryItem?.reservedQuantity || 0)
    if (availableQty < requiredQty) {
      missingItems.push(
        `${inventoryItem?.name || sku} (need ${requiredQty}, have ${availableQty})`
      )
    }
  }

  return {
    available: missingItems.length === 0,
    missingItems,
  }
}

/**
 * Deduct inventory after a successful order
 */
export async function deductInventory(items: OrderItemForInventory[]): Promise<void> {
  const skuMap = new Map<string, { qty: number; name: string }>()

  for (const item of items) {
    const qty = item.quantity || 1

    const bottleSize = item.customMix?.totalVolume
      ? `${item.customMix.totalVolume}ml`
      : item.configuration?.bottleSize || '30ml'
    const bottleSku = getBottleSku(bottleSize)
    skuMap.set(bottleSku, { qty: (skuMap.get(bottleSku)?.qty || 0) + qty, name: `Bottle ${bottleSize}` })

    const capSku = 'CAP-STANDARD'
    skuMap.set(capSku, { qty: (skuMap.get(capSku)?.qty || 0) + qty, name: 'Cap' })

    const blendOils = item.customMix?.oils || item.configuration?.oils || []
    if (blendOils.length > 0) {
      for (const oil of blendOils) {
        const oilId = (oil as any).oilId || extractOilIdFromName((oil as any).name || (oil as any).oilName)
        if (oilId) {
          const oilSku = getOilSku(oilId, bottleSize)
          skuMap.set(oilSku, { qty: (skuMap.get(oilSku)?.qty || 0) + qty, name: (oil as any).oilName || (oil as any).name || oilId })
        }
      }
    } else {
      const oilId = item.unlocksOilId || extractOilIdFromName(item.name)
      if (oilId) {
        const oilSku = getOilSku(oilId, bottleSize)
        skuMap.set(oilSku, { qty: (skuMap.get(oilSku)?.qty || 0) + qty, name: item.name || oilId })
      }
    }

    const crystalId = item.customMix?.crystalId
    if (crystalId) {
      const crystalSku = getCrystalSku(crystalId)
      skuMap.set(crystalSku, { qty: (skuMap.get(crystalSku)?.qty || 0) + qty, name: `Crystal ${crystalId}` })
    }

    const cordId = item.attachment?.cordId || item.customMix?.cordId || item.configuration?.cord
    if (cordId) {
      const cordSku = getCordSku(cordId)
      skuMap.set(cordSku, { qty: (skuMap.get(cordSku)?.qty || 0) + qty, name: `Cord ${cordId}` })
    }
  }

  for (const [sku, { qty }] of skuMap.entries()) {
    try {
      await db.update(inventoryItems)
        .set({
          quantity: sql`${inventoryItems.quantity} - ${qty}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.sku, sku))
    } catch (err) {
      logger.error(`[Inventory] Failed to deduct ${sku} by ${qty}`, err instanceof Error ? err : new Error(String(err)))
    }
  }
}

/**
 * Initialize default inventory items if they don't exist
 */
export async function ensureInventoryItems(): Promise<void> {
  const defaults = [
    // Bottles
    { sku: 'BOTTLE-5ML', name: '5ml Bottle', category: 'bottle' },
    { sku: 'BOTTLE-10ML', name: '10ml Bottle', category: 'bottle' },
    { sku: 'BOTTLE-15ML', name: '15ml Bottle', category: 'bottle' },
    { sku: 'BOTTLE-20ML', name: '20ml Bottle', category: 'bottle' },
    { sku: 'BOTTLE-30ML', name: '30ml Bottle', category: 'bottle' },
    // Caps
    { sku: 'CAP-STANDARD', name: 'Standard Cap/Pipette', category: 'cap' },
  ]

  for (const item of defaults) {
    const existing = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.sku, item.sku),
    })
    if (!existing) {
      await db.insert(inventoryItems).values({
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: 0,
        reservedQuantity: 0,
        reorderPoint: 10,
      })
    }
  }
}
