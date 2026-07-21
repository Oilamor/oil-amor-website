/**
 * Refill Pricing — single source of truth
 *
 * 2026-07-21: algorithm-driven refill pricing (business directive: there is
 * NO flat-fee refill price anywhere). Every refill price is computed by the
 * cost-based pricing engine (lib/content/pricing-engine-final) from actual
 * wholesale oil cost, margin divisors, bottle buffer, and labor.
 *
 * UNITS: ALL prices returned from this module are integer cents (AUD).
 * Convert to dollars only at display boundaries (divide by 100).
 */

import {
  WHOLESALE_OILS,
  FIXED_COSTS,
  MARGIN_DIVISORS,
  roundTo95,
  calculatePurePrice,
  getOilIdFromSlug,
  getRefillBottleBuffer,
} from '@/lib/content/pricing-engine-final'

// ============================================================================
// SINGLE-OIL REFILLS (Forever Bottle program)
// ============================================================================

/**
 * Engine-computed refill price for a single oil, in integer cents.
 * Wraps calculatePurePrice(oilId, volumeMl, isRefill=true).
 *
 * Throws on unknown oil — a refill must never be priced at 0 or flat-rated.
 */
export function getOilRefillPriceCents(oilId: string, volumeMl: number = 100): number {
  const id = getOilIdFromSlug(oilId)
  if (!WHOLESALE_OILS[id]) {
    throw new Error(`Cannot price refill: unknown oil "${oilId}"`)
  }
  return Math.round(calculatePurePrice(id, volumeMl, true) * 100)
}

/**
 * Cheapest engine-computed refill price across the whole catalog — used for
 * generic "from $X" previews where no specific bottle/oil is known. This is a
 * computed minimum over WHOLESALE_OILS, not a constant.
 */
export function getCheapestOilRefillPriceCents(volumeMl: number = 100): {
  oilId: string
  priceCents: number
} {
  let cheapest: { oilId: string; priceCents: number } | null = null
  for (const oilId of Object.keys(WHOLESALE_OILS)) {
    const priceCents = getOilRefillPriceCents(oilId, volumeMl)
    if (!cheapest || priceCents < cheapest.priceCents) {
      cheapest = { oilId, priceCents }
    }
  }
  // WHOLESALE_OILS is never empty; guard anyway so we never return 0
  if (!cheapest) {
    throw new Error('Cannot price refill: wholesale catalog is empty')
  }
  return cheapest
}

// ============================================================================
// BLEND / RECIPE REFILLS (Mixing Atelier unlocked refills)
// ============================================================================

export interface RefillBlendRecipe {
  oils: Array<{ oilId: string; ml: number }>
  mode: 'pure' | 'carrier'
  carrierRatio?: number
}

/**
 * Engine-computed refill price for a blend recipe, in integer cents.
 * Mirrors the engine's refill formula:
 *   (Σ per-oil wholesale cost + carrier cost) / marginDivisor
 *   + getRefillBottleBuffer(volumeMl)   // volume-scaled buffer
 *   + laborRefill / marginDivisor
 * then roundTo95. Carrier ml is the remainder of the target volume not
 * occupied by essential oils (carrier mode only).
 *
 * Throws on unknown oil — a blend must never be priced at 0 or flat-rated.
 */
export function getBlendRefillPriceCents(
  recipe: RefillBlendRecipe,
  volumeMl: 50 | 100
): number {
  const marginDivisor = volumeMl === 50 ? MARGIN_DIVISORS.refill50 : MARGIN_DIVISORS.refill100

  let oilCost = 0
  for (const oil of recipe.oils) {
    const id = getOilIdFromSlug(oil.oilId)
    const wholesale = WHOLESALE_OILS[id]
    if (!wholesale) {
      throw new Error(`Cannot price refill blend: unknown oil "${oil.oilId}"`)
    }
    oilCost += (wholesale.pricePerLiter / 1000) * oil.ml
  }

  let carrierCost = 0
  if (recipe.mode === 'carrier') {
    const totalOilMl = recipe.oils.reduce((sum, o) => sum + o.ml, 0)
    const carrierMl = Math.max(0, volumeMl - totalOilMl)
    carrierCost = carrierMl * FIXED_COSTS.carrierOilPerMl
  }

  const contentsWithMargin = (oilCost + carrierCost) / marginDivisor
  const bottleWithMargin = getRefillBottleBuffer(volumeMl)
  const laborWithMargin = FIXED_COSTS.laborRefill / marginDivisor

  return Math.round(roundTo95(contentsWithMargin + bottleWithMargin + laborWithMargin) * 100)
}
