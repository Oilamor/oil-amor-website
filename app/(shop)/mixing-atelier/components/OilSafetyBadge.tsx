'use client'

// ============================================================================
// COMPONENT: Oil Safety Badge
// ============================================================================
import { AlertCircle, Baby, Sun, Wind } from 'lucide-react'
import { Tooltip } from '@/app/components/tooltip'
import { OIL_SAFETY_PROFILES } from '../atelier-utils'

export function OilSafetyBadge({ oilId }: { oilId: string }) {
  const profile = OIL_SAFETY_PROFILES[oilId]
  if (!profile) return null

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {!profile.pregnancySafe && (
        <Tooltip content="Not recommended during pregnancy. May stimulate uterine contractions.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px]">
            <Baby className="w-3 h-3" />
            Pregnancy
          </span>
        </Tooltip>
      )}
      {profile.photosensitive && (
        <Tooltip content={`Photosensitive: ${profile.photosensitiveNote || 'Avoid sun exposure after topical use'}`}>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px]">
            <Sun className="w-3 h-3" />
            Sun
          </span>
        </Tooltip>
      )}
      {profile.skinSensitizer && (
        <Tooltip content="May cause skin irritation. Patch test recommended.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px]">
            <AlertCircle className="w-3 h-3" />
            Skin
          </span>
        </Tooltip>
      )}
      {profile.respiratoryCaution && (
        <Tooltip content="Use with caution around respiratory conditions.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px]">
            <Wind className="w-3 h-3" />
            Respiratory
          </span>
        </Tooltip>
      )}
      {profile.childrenCaution && (
        <Tooltip content="Use reduced dilution for children under 12.">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px]">
            <Baby className="w-3 h-3" />
            Children
          </span>
        </Tooltip>
      )}
    </div>
  )
}
