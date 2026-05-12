'use client'

import { Clock, Zap } from 'lucide-react'
import { STOCKED_OIL_IDS } from '@/lib/inventory/client'
import { cn } from '@/lib/utils'

interface StockStatusBadgeProps {
  oilId?: string
  className?: string
  size?: 'sm' | 'md'
}

export function isOilInStock(oilId?: string): boolean {
  if (!oilId) return false
  return STOCKED_OIL_IDS.has(oilId)
}

export function StockStatusBadge({ oilId, className, size = 'md' }: StockStatusBadgeProps) {
  const inStock = isOilInStock(oilId)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        'rounded-full border',
        inStock
          ? 'bg-green-500/10 text-green-400 border-green-500/30'
          : 'bg-[#c9a227]/10 text-[#f5e6c8] border-[#c9a227]/30',
        className
      )}
    >
      {inStock ? (
        <>
          <Zap className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          In Stock &mdash; Ships Tomorrow
        </>
      ) : (
        <>
          <Clock className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          Pre-Order &mdash; Ships in 2-4 Weeks
        </>
      )}
    </span>
  )
}

export function CartItemStockBadge({ item }: { item: any }) {
  // Extract oil IDs from cart item
  const customMix = item.customMix || {}
  const configuration = item.configuration || {}
  const blendOils = customMix.oils || configuration.oils || []

  let oilId: string | undefined

  if (blendOils.length > 0) {
    // For blends, if ANY oil is preorder, show preorder
    const allInStock = blendOils.every((oil: any) => {
      const id = oil.oilId || extractOilIdFromName(oil.name || oil.oilName)
      return id ? STOCKED_OIL_IDS.has(id) : false
    })
    if (!allInStock) {
      return <StockStatusBadge size="sm" className="mt-1" />
    }
    oilId = blendOils[0]?.oilId || extractOilIdFromName(blendOils[0]?.name || blendOils[0]?.oilName)
  } else {
    oilId = item.unlocksOilId || extractOilIdFromName(item.name)
  }

  return <StockStatusBadge oilId={oilId} size="sm" className="mt-1" />
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
