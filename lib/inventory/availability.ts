/**
 * Oil Amor — Inventory Availability (server-side source of truth)
 *
 * Reads the real `inventory_items` table via Drizzle and answers two questions:
 *
 *  1. `checkInventoryAvailability` — can this set of order items be fulfilled?
 *     Called from the Stripe checkout route. Classification per item:
 *       - stocked:   row exists, available (quantity - reserved) >= requested → ok
 *       - preorder:  row exists, available <= 0 → ok (preorder oils are seeded
 *                    at 0 and sold as preorders; "no stock" never blocks them)
 *       - unknown:   no inventory row at all → FAIL CLOSED (untracked items are
 *                    not sellable — e.g. 'jojoba' is not in the sellable catalog)
 *       - insufficient: row exists, 0 < available < requested → fail. A partially
 *                    stocked oil cannot silently downgrade to preorder while the
 *                    badge still promises "Ships Tomorrow".
 *       - invalid quantity (<= 0 / non-finite) → fail closed.
 *
 *  2. `getOilStockStatuses` — per-oil badge status for /api/inventory/status.
 *       - 'in-stock': any bottle size has available > 0
 *       - 'preorder': inventory rows exist but nothing available (made to order)
 *       - 'out':      no inventory rows at all (unknown / not sellable)
 */

import { db } from '@/lib/db'
import { inventoryItems } from '@/lib/db/schema-refill'
import { inArray } from 'drizzle-orm'
import { getOilSku, getBottleSku, getCrystalSku, getCordSku } from './inventory'
import type { OilStockStatus, OilStockStatusMap } from './client'

export const DEFAULT_OIL_SIZE = '30ml'

// Bottle sizes probed when aggregating a per-oil badge status
export const OIL_STOCK_SIZES = ['5ml', '10ml', '15ml', '20ml', '30ml']

export interface InventoryAvailabilityItem {
  oilId: string
  size?: string
  quantity: number
}

export interface InventoryAvailabilityFailure {
  id: string
  reason: string
}

export interface InventoryAvailabilityResult {
  ok: boolean
  failures: InventoryAvailabilityFailure[]
}

/**
 * Check whether the requested oils can be fulfilled against real inventory.
 * Preorder-eligible oils (known, zero stock) pass; unknown items fail closed.
 */
export async function checkInventoryAvailability(
  items: Array<{ oilId: string; size?: string; quantity: number }>
): Promise<{ ok: boolean; failures: Array<{ id: string; reason: string }> }> {
  const failures: InventoryAvailabilityFailure[] = []

  // Aggregate requested quantities per SKU so duplicate cart lines for the
  // same oil+size are checked against stock as a single total.
  const requiredBySku = new Map<string, { oilId: string; size: string; quantity: number }>()

  for (const item of items) {
    const oilId = item.oilId
    const size = item.size || DEFAULT_OIL_SIZE
    const quantity = item.quantity

    if (!oilId) {
      failures.push({ id: oilId || '(missing)', reason: 'missing oilId' })
      continue
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      failures.push({
        id: oilId,
        reason: `invalid quantity ${quantity} for oil '${oilId}' — must be a positive number`,
      })
      continue
    }

    const sku = getOilSku(oilId, size)
    const existing = requiredBySku.get(sku)
    if (existing) {
      existing.quantity += quantity
    } else {
      requiredBySku.set(sku, { oilId, size, quantity })
    }
  }

  if (requiredBySku.size > 0) {
    const rows = await db.query.inventoryItems.findMany({
      where: inArray(inventoryItems.sku, Array.from(requiredBySku.keys())),
    })
    const rowBySku = new Map(rows.map((row) => [row.sku, row] as const))

    for (const [sku, { oilId, size, quantity }] of requiredBySku.entries()) {
      const row = rowBySku.get(sku)

      if (!row) {
        // Fail closed: untracked items are not sellable
        failures.push({
          id: oilId,
          reason: `unknown oil '${oilId}' (${size}): no inventory record for SKU ${sku}`,
        })
        continue
      }

      const available = row.quantity - row.reservedQuantity

      if (available >= quantity) {
        // Stocked — ships immediately
        continue
      }

      if (available <= 0) {
        // Preorder — known oil, made to order, never blocked by zero stock
        continue
      }

      // Partially stocked — cannot honour the "Ships Tomorrow" promise
      failures.push({
        id: oilId,
        reason: `insufficient stock for '${row.name}' (${size}): need ${quantity}, have ${available}`,
      })
    }
  }

  return { ok: failures.length === 0, failures }
}

/**
 * Aggregate per-oil stock status for badges, across all bottle sizes.
 * Oils with no inventory rows at all are reported as 'out'.
 */
export async function getOilStockStatuses(oilIds: string[]): Promise<OilStockStatusMap> {
  const statuses: OilStockStatusMap = {}
  if (oilIds.length === 0) return statuses

  const skuToOilId = new Map<string, string>()
  for (const oilId of oilIds) {
    for (const size of OIL_STOCK_SIZES) {
      skuToOilId.set(getOilSku(oilId, size), oilId)
    }
  }

  const rows = await db.query.inventoryItems.findMany({
    where: inArray(inventoryItems.sku, Array.from(skuToOilId.keys())),
  })

  const availableByOilId = new Map<string, number>()
  const seenOilIds = new Set<string>()

  for (const row of rows) {
    const oilId = skuToOilId.get(row.sku)
    if (!oilId) continue
    seenOilIds.add(oilId)
    const available = Math.max(0, row.quantity - row.reservedQuantity)
    availableByOilId.set(oilId, (availableByOilId.get(oilId) || 0) + available)
  }

  for (const oilId of oilIds) {
    const available = availableByOilId.get(oilId) || 0
    let status: OilStockStatus
    if (available > 0) {
      status = 'in-stock'
    } else if (seenOilIds.has(oilId)) {
      status = 'preorder'
    } else {
      status = 'out'
    }
    statuses[oilId] = { status, available }
  }

  return statuses
}

export type ComponentCategory = 'bottle' | 'cap' | 'crystal' | 'cord'

export type ComponentStockStatusMap = Record<
  ComponentCategory,
  Record<string, { status: OilStockStatus; available: number }>
>

/**
 * Aggregate stock status for non-oil components (bottles, caps, crystals,
 * cords). Same status vocabulary as oils: 'in-stock' (>0 available),
 * 'preorder' (row exists, zero stock), 'out' (no row — not sellable).
 */
export async function getComponentStockStatuses(
  idsByCategory: Record<ComponentCategory, string[]>,
  skuFor: (category: ComponentCategory, id: string) => string
): Promise<ComponentStockStatusMap> {
  const result = {} as ComponentStockStatusMap
  const skuToKey = new Map<string, { category: ComponentCategory; id: string }>()

  for (const category of Object.keys(idsByCategory) as ComponentCategory[]) {
    result[category] = {}
    for (const id of idsByCategory[category]) {
      skuToKey.set(skuFor(category, id), { category, id })
    }
  }

  const rows = await db.query.inventoryItems.findMany({
    where: inArray(inventoryItems.sku, Array.from(skuToKey.keys())),
  })

  for (const [category, ids] of Object.entries(idsByCategory) as [ComponentCategory, string[]][]) {
    for (const id of ids) {
      const row = rows.find((r) => skuToKey.get(r.sku)?.id === id && skuToKey.get(r.sku)?.category === category)
      if (!row) {
        result[category][id] = { status: 'out', available: 0 }
      } else {
        const available = Math.max(0, row.quantity - row.reservedQuantity)
        result[category][id] = { status: available > 0 ? 'in-stock' : 'preorder', available }
      }
    }
  }

  return result
}

/**
 * Whether any line of a checkout order contains a component that is not
 * in stock (i.e. made-to-order / preorder). Used to set expectations in the
 * order confirmation email. Metadata shape matches cartItemsToCheckoutItems
 * output: { oilId, size, type, customMix (JSON string) }.
 */
export async function orderContainsPreorder(
  items: Array<{ metadata?: Record<string, string | undefined> }>
): Promise<boolean> {
  const oilIds = new Set<string>()
  const crystalIds = new Set<string>()
  const cordIds = new Set<string>()
  const bottleSizes = new Set<string>()

  for (const item of items) {
    const md = item.metadata || {}
    if (md.type === 'gift-card') continue
    if (md.oilId) oilIds.add(md.oilId)
    if (md.size) bottleSizes.add(md.size)
    if (md.customMix) {
      try {
        const mix = JSON.parse(md.customMix)
        for (const o of mix.oils || []) {
          if (o?.oilId) oilIds.add(String(o.oilId))
        }
        if (mix.crystalId) crystalIds.add(String(mix.crystalId))
        if (mix.cordId) cordIds.add(String(mix.cordId))
        if (mix.bottleSize) bottleSizes.add(String(mix.bottleSize))
      } catch {
        // Unparseable mix — the availability check has already gated the order
      }
    }
  }

  const skuFor = (category: ComponentCategory, id: string): string => {
    switch (category) {
      case 'bottle':
        return getBottleSku(id)
      case 'crystal':
        return getCrystalSku(id)
      case 'cord':
        return getCordSku(id)
      default:
        return 'CAP-STANDARD'
    }
  }

  const [oils, components] = await Promise.all([
    oilIds.size > 0
      ? getOilStockStatuses(Array.from(oilIds))
      : Promise.resolve({} as OilStockStatusMap),
    getComponentStockStatuses(
      { bottle: Array.from(bottleSizes), cap: [], crystal: Array.from(crystalIds), cord: Array.from(cordIds) },
      skuFor
    ),
  ])

  const notInStock = (entry: { status: OilStockStatus } | undefined): boolean =>
    !entry || entry.status !== 'in-stock'

  if (Object.values(oils).some(notInStock)) return true
  for (const map of Object.values(components)) {
    if (Object.values(map).some(notInStock)) return true
  }
  return false
}
