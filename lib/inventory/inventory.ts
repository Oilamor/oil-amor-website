/**
 * Oil Amor Inventory Management
 * Tracks stock levels and handles preorder logic
 */

import { db } from '@/lib/db'
import { inventoryItems, type InventoryItem } from '@/lib/db/schema-refill'
import { eq, sql } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'
import { STOCKED_OIL_IDS, extractOilIdFromName } from './client'

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
 *
 * Stock is floored at 0 (never drifts negative) and a warning is logged when a
 * deduction would exceed on-hand stock. Oil deductions also record the real ml
 * consumed in the row's jsonb metadata (`lastDeduction.ml`) — note that
 * `quantity` is still tracked in whole-bottle SKU units; full bulk-ml
 * accounting is out of scope.
 */
export async function deductInventory(items: OrderItemForInventory[]): Promise<void> {
  const skuMap = new Map<string, { qty: number; name: string; ml: number }>()

  for (const item of items) {
    const qty = item.quantity || 1

    const bottleSize = item.customMix?.totalVolume
      ? `${item.customMix.totalVolume}ml`
      : item.configuration?.bottleSize || '30ml'
    const bottleSku = getBottleSku(bottleSize)
    skuMap.set(bottleSku, { qty: (skuMap.get(bottleSku)?.qty || 0) + qty, name: `Bottle ${bottleSize}`, ml: 0 })

    const capSku = 'CAP-STANDARD'
    skuMap.set(capSku, { qty: (skuMap.get(capSku)?.qty || 0) + qty, name: 'Cap', ml: 0 })

    const blendOils = item.customMix?.oils || item.configuration?.oils || []
    if (blendOils.length > 0) {
      for (const oil of blendOils) {
        const oilId = (oil as any).oilId || extractOilIdFromName((oil as any).name || (oil as any).oilName)
        if (oilId) {
          const oilSku = getOilSku(oilId, bottleSize)
          const existing = skuMap.get(oilSku)
          // Real ml of this oil consumed by the blend
          const oilMl = ((oil as any).ml || 0) * qty
          skuMap.set(oilSku, {
            qty: (existing?.qty || 0) + qty,
            name: (oil as any).oilName || (oil as any).name || oilId,
            ml: (existing?.ml || 0) + oilMl,
          })
        }
      }
    } else {
      const oilId = item.unlocksOilId || extractOilIdFromName(item.name)
      if (oilId) {
        const oilSku = getOilSku(oilId, bottleSize)
        const existing = skuMap.get(oilSku)
        // Single-oil product: the full bottle volume is this oil
        const oilMl = (parseInt(bottleSize, 10) || 0) * qty
        skuMap.set(oilSku, {
          qty: (existing?.qty || 0) + qty,
          name: item.name || oilId,
          ml: (existing?.ml || 0) + oilMl,
        })
      }
    }

    const crystalId = item.customMix?.crystalId
    if (crystalId) {
      const crystalSku = getCrystalSku(crystalId)
      skuMap.set(crystalSku, { qty: (skuMap.get(crystalSku)?.qty || 0) + qty, name: `Crystal ${crystalId}`, ml: 0 })
    }

    const cordId = item.attachment?.cordId || item.customMix?.cordId || item.configuration?.cord
    if (cordId) {
      const cordSku = getCordSku(cordId)
      skuMap.set(cordSku, { qty: (skuMap.get(cordSku)?.qty || 0) + qty, name: `Cord ${cordId}`, ml: 0 })
    }
  }

  for (const [sku, { qty, ml }] of skuMap.entries()) {
    try {
      const existing = await db.query.inventoryItems.findFirst({
        where: eq(inventoryItems.sku, sku),
      })

      if (!existing) {
        logger.warn(`[Inventory] Skipping deduction for unknown SKU ${sku} (qty ${qty}) — no inventory record`, { sku, qty })
        continue
      }

      if (existing.quantity - qty < 0) {
        logger.warn(
          `[Inventory] Deduction of ${qty} unit(s) exceeds on-hand stock for ${sku} (have ${existing.quantity}) — flooring at 0`,
          { sku, qty, onHand: existing.quantity, reserved: existing.reservedQuantity }
        )
      }

      await db.update(inventoryItems)
        .set({
          // Floor at 0 so stock never drifts negative
          quantity: sql`GREATEST(${inventoryItems.quantity} - ${qty}, 0)`,
          ...(ml > 0 && {
            metadata: {
              ...(existing.metadata || {}),
              lastDeduction: { ml, units: qty, at: new Date().toISOString() },
            } as InventoryItem['metadata'],
          }),
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
