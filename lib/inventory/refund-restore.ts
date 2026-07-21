/**
 * Inventory Refund Restore
 * Restores stock levels when an order is refunded — reverses deductInventory
 *
 * Idempotency: this function is NOT internally idempotent. Callers must guard
 * via order status (only run the restore once, when marking the order refunded).
 */

import { db } from '@/lib/db'
import { inventoryItems, orders } from '@/lib/db/schema-refill'
import { eq, sql } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'
import {
  getOilSku,
  getBottleSku,
  getCrystalSku,
  getCordSku,
  type OrderItemForInventory,
} from './inventory'

/**
 * Local copy of the oil-id heuristic used by deductInventory so the restore
 * computes the exact same SKUs that were deducted.
 */
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
 * Restore inventory for a refunded order
 * Adds back every SKU/quantity that deductInventory subtracted for this order
 */
export async function restoreOrderInventory(orderId: string): Promise<void> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })

  if (!order) {
    logger.warn(`[Inventory] Refund restore skipped — order ${orderId} not found`)
    return
  }

  const items = (order.items || []) as OrderItemForInventory[]
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
        const oilId = (oil as { oilId?: string; name?: string; oilName?: string }).oilId
          || extractOilIdFromName((oil as { name?: string; oilName?: string }).name || (oil as { oilName?: string }).oilName)
        if (oilId) {
          const oilSku = getOilSku(oilId, bottleSize)
          skuMap.set(oilSku, {
            qty: (skuMap.get(oilSku)?.qty || 0) + qty,
            name: (oil as { oilName?: string; name?: string }).oilName || (oil as { name?: string }).name || oilId,
          })
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
          quantity: sql`${inventoryItems.quantity} + ${qty}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.sku, sku))
    } catch (err) {
      logger.error(`[Inventory] Failed to restore ${sku} by ${qty} for refunded order ${orderId}`, err instanceof Error ? err : new Error(String(err)))
    }
  }
}
