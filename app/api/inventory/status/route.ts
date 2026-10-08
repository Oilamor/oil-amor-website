/**
 * Inventory Status API
 * Single source of truth for stock badges.
 *
 * GET /api/inventory/status                       → statuses for every sellable oil
 * GET /api/inventory/status?oils=a,b              → statuses for the requested oils only
 * GET /api/inventory/status?bottles=5ml,10ml
 *                          &crystals=amethyst,...
 *                          &cords=hemp,...        → component statuses (bottles, crystals, cords)
 *
 * Response: {
 *   oils: Record<oilId, { status, available }>,
 *   components?: { bottle: {}, crystal: {}, cord: {} },
 *   generatedAt: string
 * }
 * Cached briefly (60s) at the CDN edge; stock truth comes from inventory_items.
 */

import { NextRequest, NextResponse } from 'next/server'
import { WHOLESALE_OILS } from '@/lib/content/pricing-engine-final'
import { getOilStockStatuses, getComponentStockStatuses } from '@/lib/inventory/availability'
import { getBottleSku, getCrystalSku, getCordSku } from '@/lib/inventory/inventory'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

function parseList(param: string | null): string[] | null {
  if (param === null) return null
  return param.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const oilsParam = searchParams.get('oils')
    const oilIds = oilsParam
      ? oilsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : Object.keys(WHOLESALE_OILS)

    const oils = await getOilStockStatuses(oilIds)

    const bottles = parseList(searchParams.get('bottles'))
    const crystals = parseList(searchParams.get('crystals'))
    const cords = parseList(searchParams.get('cords'))
    const componentsAll = searchParams.get('components') === 'all'

    const response: Record<string, unknown> = { oils, generatedAt: new Date().toISOString() }

    if (bottles !== null || crystals !== null || cords !== null || componentsAll) {
      // Canonical id lists come from the same constants the atelier UI renders,
      // so badges always match the selections customers can actually make.
      const { getAllCrystals } = await import('@/lib/atelier/atelier-engine')
      const { SIMPLE_CORD_OPTIONS } = await import('@/lib/atelier/cord-data-simple')
      const { BOTTLE_SIZES } = await import('@/lib/content/product-config')

      const components = await getComponentStockStatuses(
        {
          bottle: bottles ?? (componentsAll ? BOTTLE_SIZES.map((b) => b.id) : []),
          cap: [],
          crystal: crystals ?? (componentsAll ? getAllCrystals().map((c) => c.id) : []),
          cord: cords ?? (componentsAll ? SIMPLE_CORD_OPTIONS.map((c) => c.id) : []),
        },
        (category, id) => {
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
      )
      response.components = components
    }

    return NextResponse.json(response, { headers: CACHE_HEADERS })
  } catch (err) {
    logger.error(
      '[Inventory] Failed to load stock status',
      err instanceof Error ? err : new Error(String(err))
    )
    return NextResponse.json(
      { error: 'Failed to load stock status' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
