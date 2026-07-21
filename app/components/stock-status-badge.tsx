'use client'

import { useEffect, useState } from 'react'
import { Clock, Info, Zap } from 'lucide-react'
import {
  extractOilIdFromName,
  fetchOilStockStatuses,
  getStockBadgeState,
  resolveBlendStockStatus,
  type OilStockStatusMap,
  type StockBadgeInput,
} from '@/lib/inventory/client'
import { cn } from '@/lib/utils'

interface StockStatusBadgeProps {
  oilId?: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Shared fetch of the server-driven stock status map.
 * De-duped across all badges on the page by the client-side cache.
 */
function useOilStockStatuses(): { statuses: OilStockStatusMap | null; loading: boolean } {
  const [statuses, setStatuses] = useState<OilStockStatusMap | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchOilStockStatuses().then((map) => {
      if (cancelled) return
      setStatuses(map)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { statuses, loading }
}

function statusForOil(
  oilId: string | undefined,
  statuses: OilStockStatusMap | null,
  loading: boolean
): StockBadgeInput {
  if (loading) return 'loading'
  if (!statuses) return 'error'
  if (!oilId) return 'error'
  return statuses[oilId]?.status ?? 'out'
}

function StockStatusBadgeView({
  input,
  className,
  size = 'md',
}: {
  input: StockBadgeInput
  className?: string
  size?: 'sm' | 'md'
}) {
  const { variant, label } = getStockBadgeState(input)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        'rounded-full border',
        variant === 'in-stock'
          ? 'bg-green-500/10 text-green-400 border-green-500/30'
          : variant === 'preorder'
            ? 'bg-[#c9a227]/10 text-[#f5e6c8] border-[#c9a227]/30'
            : 'bg-[#f5f3ef]/5 text-[#a69b8a] border-[#f5f3ef]/15',
        className
      )}
    >
      {variant === 'in-stock' ? (
        <Zap className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      ) : variant === 'preorder' ? (
        <Clock className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      ) : (
        <Info className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      )}
      {label}
    </span>
  )
}

export function StockStatusBadge({ oilId, className, size = 'md' }: StockStatusBadgeProps) {
  const { statuses, loading } = useOilStockStatuses()
  const input = statusForOil(oilId, statuses, loading)
  return <StockStatusBadgeView input={input} className={className} size={size} />
}

export function CartItemStockBadge({ item }: { item: any }) {
  const { statuses, loading } = useOilStockStatuses()

  // Extract oil IDs from cart item
  const customMix = item.customMix || {}
  const configuration = item.configuration || {}
  const blendOils = customMix.oils || configuration.oils || []

  let input: StockBadgeInput

  if (loading) {
    input = 'loading'
  } else if (!statuses) {
    input = 'error'
  } else if (blendOils.length > 0) {
    // For blends, show the least optimistic truthful status across all oils
    const oilIds: Array<string | undefined> = blendOils.map(
      (oil: any) => oil.oilId || extractOilIdFromName(oil.name || oil.oilName)
    )
    input = resolveBlendStockStatus(
      oilIds.map((id) => (id ? statuses[id]?.status : undefined))
    )
  } else {
    const oilId = item.unlocksOilId || extractOilIdFromName(item.name)
    input = statusForOil(oilId, statuses, loading)
  }

  return <StockStatusBadgeView input={input} size="sm" className="mt-1" />
}
