'use client'

import Image from 'next/image'
import { Sparkles, Gem, Droplets } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RichTooltip } from '../../components/ui/Tooltip'

export interface SynergyBadgeProps {
  oilName: string
  crystalName: string
  crystalImage?: string
  synergy: string
  effect: string
  element?: string
  chakra?: string
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export function SynergyBadge({
  oilName,
  crystalName,
  crystalImage,
  synergy,
  effect,
  element,
  chakra,
  variant = 'default',
  className,
}: SynergyBadgeProps) {
  if (variant === 'compact') {
    return (
      <RichTooltip
        title={crystalName}
        description={`Paired with ${oilName} for ${synergy.toLowerCase()}`}
        image={crystalImage}
        properties={[
          { label: 'Effect', value: effect },
          element && { label: 'Element', value: element },
          chakra && { label: 'Chakra', value: chakra },
        ].filter(Boolean) as { label: string; value: string }[]}
      >
        <button
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
            'bg-gold-pure/10 text-gold-dark text-xs font-medium',
            'hover:bg-gold-pure/20 transition-colors',
            className
          )}
          aria-label={`Synergy: ${crystalName}`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{crystalName}</span>
        </button>
      </RichTooltip>
    )
  }

  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'p-4 rounded-xl bg-gradient-to-br from-gold-pure/10 to-transparent',
          'border border-gold-pure/20',
          className
        )}
      >
        <div className="flex items-start gap-4">
          {crystalImage && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={crystalImage}
                alt={crystalName}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-gold-dark" />
              <span className="text-xs uppercase tracking-wider text-gold-dark font-medium">
                Sacred Synergy
              </span>
            </div>
            <h4 className="font-display text-lg text-miron-dark mb-1">
              {oilName} + {crystalName}
            </h4>
            <p className="text-sm text-miron-dark/70 mb-3">{synergy}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-cream-pure rounded-full text-miron-dark/70">
                <Droplets className="w-3 h-3" />
                {effect}
              </span>
              {element && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-cream-pure rounded-full text-miron-dark/70">
                  <Gem className="w-3 h-3" />
                  {element} Element
                </span>
              )}
              {chakra && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-cream-pure rounded-full text-miron-dark/70">
                  <Sparkles className="w-3 h-3" />
                  {chakra} Chakra
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <RichTooltip
      title={crystalName}
      description={`${oilName} and ${crystalName} create a synergy of ${synergy.toLowerCase()}. ${effect}`}
      image={crystalImage}
      properties={[
        { label: 'Synergy', value: synergy },
        { label: 'Effect', value: effect },
        element && { label: 'Element', value: element },
        chakra && { label: 'Chakra', value: chakra },
      ].filter(Boolean) as { label: string; value: string }[]}
    >
      <button
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
          'bg-gold-pure/10 text-gold-dark text-sm font-medium',
          'hover:bg-gold-pure/20 transition-colors group',
          className
        )}
        aria-label={`Crystal synergy: ${crystalName}`}
      >
        <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
        <span>Paired with {crystalName}</span>
      </button>
    </RichTooltip>
  )
}

export default SynergyBadge
