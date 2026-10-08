/**
 * Client-Safe Inventory Helpers
 *
 * - Fetches real per-oil stock status from /api/inventory/status (backed by the
 *   inventory_items table) with a small in-memory TTL cache.
 * - Pure badge-state mapping so badges never claim "Ships Tomorrow" without
 *   server-confirmed stock.
 * - Legacy synchronous preorder helpers below are kept for the checkout flow;
 *   they still use the deprecated hardcoded STOCKED_OIL_IDS fallback.
 */

// ============================================================================
// SERVER-DRIVEN STOCK STATUS
// ============================================================================

import { LAUNCH_MODE } from '@/lib/content/launch-pricing'

export type OilStockStatus = 'in-stock' | 'preorder' | 'out'

export interface OilStockStatusEntry {
  status: OilStockStatus
  available: number
}

export type OilStockStatusMap = Record<string, OilStockStatusEntry>

interface OilStockStatusResponse {
  oils: OilStockStatusMap
  components?: ComponentStockStatusResponse
  generatedAt: string
}

export interface ComponentStatusEntry {
  status: OilStockStatus
  available: number
}

export type ComponentStatusMap = Record<string, ComponentStatusEntry>

export interface ComponentStockStatusResponse {
  bottle: ComponentStatusMap
  cap: ComponentStatusMap
  crystal: ComponentStatusMap
  cord: ComponentStatusMap
}

const STATUS_CACHE_TTL_MS = 60_000

let statusCache: { data: OilStockStatusMap; fetchedAt: number } | null = null
let statusPromise: Promise<OilStockStatusMap | null> | null = null

/**
 * Fetch the per-oil stock status map from the server.
 * Cached for 60s and de-dupes concurrent callers. Returns null on error —
 * callers must treat null as "unknown", never as "in stock".
 */
export async function fetchOilStockStatuses(): Promise<OilStockStatusMap | null> {
  if (statusCache && Date.now() - statusCache.fetchedAt < STATUS_CACHE_TTL_MS) {
    return statusCache.data
  }

  if (!statusPromise) {
    statusPromise = (async () => {
      try {
        const res = await fetch('/api/inventory/status')
        if (!res.ok) return null
        const body = (await res.json()) as OilStockStatusResponse
        if (!body || typeof body !== 'object' || !body.oils) return null
        statusCache = { data: body.oils, fetchedAt: Date.now() }
        return body.oils
      } catch {
        return null
      } finally {
        statusPromise = null
      }
    })()
  }

  return statusPromise
}

/** Test helper — clears the module-level status cache. */
export function _resetOilStockStatusCache(): void {
  statusCache = null
  statusPromise = null
}

// ============================================================================
// COMPONENT (BOTTLE / CRYSTAL / CORD) STOCK STATUS
// ============================================================================

let componentCache: { data: ComponentStockStatusResponse; fetchedAt: number } | null = null
let componentPromise: Promise<ComponentStockStatusResponse | null> | null = null

export interface ComponentStockQuery {
  bottles?: string[] // e.g. ['5ml', '10ml']
  crystals?: string[] // e.g. ['amethyst']
  cords?: string[] // e.g. ['hemp']
}

/**
 * Fetch stock status for non-oil components. Cached 60s and keyed implicitly —
 * callers across the app request the same full sets, so one fetch serves all.
 * Returns null on error; treat null as "unknown", never as in stock.
 */
export async function fetchComponentStockStatuses(): Promise<ComponentStockStatusResponse | null> {
  if (componentCache && Date.now() - componentCache.fetchedAt < STATUS_CACHE_TTL_MS) {
    return componentCache.data
  }

  if (!componentPromise) {
    componentPromise = (async () => {
      try {
        const res = await fetch('/api/inventory/status?components=all')
        if (!res.ok) return null
        const body = (await res.json()) as OilStockStatusResponse
        if (!body?.components) return null
        componentCache = { data: body.components, fetchedAt: Date.now() }
        return body.components
      } catch {
        return null
      } finally {
        componentPromise = null
      }
    })()
  }

  return componentPromise
}

/** Test helper — clears the component status cache. */
export function _resetComponentStockStatusCache(): void {
  componentCache = null
  componentPromise = null
}

// ============================================================================
// BADGE STATE MAPPING
// ============================================================================

// 'loading' = first fetch in flight, 'error' = fetch failed, undefined = unknown oil
export type StockBadgeInput = OilStockStatus | 'loading' | 'error' | undefined

export type StockBadgeVariant = 'in-stock' | 'preorder' | 'neutral'

export interface StockBadgeState {
  variant: StockBadgeVariant
  label: string
}

/**
 * Map a stock status to badge presentation. Anything that is not positively
 * confirmed in-stock by the server maps to a neutral or preorder badge —
 * never to a false "Ships Tomorrow".
 */
export function getStockBadgeState(status: StockBadgeInput): StockBadgeState {
  switch (status) {
    case 'in-stock':
      // Launch reality: bottles/caps are preorder, so even stocked oils cannot
      // ship tomorrow. Off-mode copy restores the full promise.
      return LAUNCH_MODE
        ? { variant: 'in-stock', label: 'In Stock' }
        : { variant: 'in-stock', label: 'In Stock — Ships Tomorrow' }
    case 'preorder':
      return { variant: 'preorder', label: 'Pre-Order — Ships in 2-4 Weeks' }
    case 'out':
      return { variant: 'neutral', label: 'Out of Stock' }
    case 'loading':
      return { variant: 'neutral', label: 'Checking availability…' }
    case 'error':
    default:
      return { variant: 'neutral', label: 'Stock status unavailable' }
  }
}

/**
 * Badge state for a non-oil component (bottle size, crystal, cord) from the
 * components map. `undefined` = not fetched yet or missing from the map.
 */
export function getComponentBadgeState(
  entry: ComponentStatusEntry | undefined
): StockBadgeState {
  if (!entry) return { variant: 'neutral', label: 'Checking availability…' }
  return getStockBadgeState(entry.status)
}

/**
 * Resolve a single badge status for a multi-oil item (blend).
 * Unknown/out oils win over preorder, preorder wins over in-stock —
 * the least optimistic truthful status is shown.
 */
export function resolveBlendStockStatus(
  statuses: Array<OilStockStatus | undefined>
): StockBadgeInput {
  if (statuses.length === 0 || statuses.some((s) => s === undefined || s === 'out')) {
    return 'out'
  }
  if (statuses.some((s) => s === 'preorder')) {
    return 'preorder'
  }
  return 'in-stock'
}

// ============================================================================
// LEGACY PREORDER HELPERS (synchronous fallback — kept for checkout flow)
// ============================================================================

/**
 * @deprecated Hardcoded fallback list — the server-driven status from
 * /api/inventory/status is the source of truth. Kept for the synchronous
 * checkout helpers and cart validation. 'jojoba' was removed: it is not in
 * the sellable catalog (WHOLESALE_OILS).
 */
export const STOCKED_OIL_IDS = new Set([
  'tea-tree',
  'lavender',
  'lemongrass',
  'clove-bud',
  'eucalyptus',
])

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

export function extractOilIdFromName(name?: string): string | undefined {
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
