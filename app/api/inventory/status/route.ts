/**
 * Inventory Status API
 * Single source of truth for per-oil stock badges.
 *
 * GET /api/inventory/status            → statuses for every sellable oil
 * GET /api/inventory/status?oils=a,b   → statuses for the requested oils only
 *
 * Response: { oils: Record<oilId, { status: 'in-stock' | 'preorder' | 'out', available: number }>, generatedAt: string }
 * Cached briefly (60s) at the CDN edge; stock truth comes from inventory_items.
 */

import { NextRequest, NextResponse } from 'next/server'
import { WHOLESALE_OILS } from '@/lib/content/pricing-engine-final'
import { getOilStockStatuses } from '@/lib/inventory/availability'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const oilsParam = searchParams.get('oils')
    const oilIds = oilsParam
      ? oilsParam.split(',').map((id) => id.trim()).filter(Boolean)
      : Object.keys(WHOLESALE_OILS)

    const oils = await getOilStockStatuses(oilIds)

    return NextResponse.json(
      { oils, generatedAt: new Date().toISOString() },
      { headers: CACHE_HEADERS }
    )
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
