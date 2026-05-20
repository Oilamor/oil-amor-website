'use client'

import Image from 'next/image'
import { MapPin, Gem } from 'lucide-react'
import { ATELIER_OILS } from '@/lib/atelier/atelier-engine'
import type { OilProfile } from '@/lib/content/oil-crystal-synergies'

interface BottleCompositeProps {
  oilData: OilProfile
  className?: string
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round((255 - parseInt(hex.slice(1, 3), 16)) * amount))
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round((255 - parseInt(hex.slice(3, 5), 16)) * amount))
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round((255 - parseInt(hex.slice(5, 7), 16)) * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function BottleComposite({ oilData, className = '' }: BottleCompositeProps) {
  const atelierOil = ATELIER_OILS.find(o => o.id === oilData.id)
  const oilColor = atelierOil?.color || '#9b7cb6'
  const oilColorLight = lighten(oilColor, 0.3)
  const oilColorDark = oilColor

  const firstCrystal = oilData.crystalPairings[0]
  const properties = oilData.baseProperties.slice(0, 3)

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      {/* Ambient glow behind bottle */}
      <div
        className="absolute inset-0 rounded-full opacity-15 blur-3xl"
        style={{ background: `radial-gradient(circle at 50% 50%, ${oilColor}, transparent 70%)` }}
      />

      {/* Bottle + Label container — scaled to fit square */}
      <div className="relative w-[70%] max-w-[320px] aspect-[2/3]">
        {/* Bottle image */}
        <Image
          src="/images/bottles/bottle-30ml.webp"
          alt={`${oilData.commonName} bottle`}
          fill
          className="object-contain drop-shadow-2xl"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Label overlay */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[28%] w-[64%] rounded-sm overflow-hidden shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(oilColorLight, 0.12)}, ${hexToRgba(oilColor, 0.18)})`,
            border: `1px solid ${hexToRgba(oilColor, 0.25)}`,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="px-3 py-3 text-center">
            {/* Brand */}
            <div className="text-[8px] tracking-[0.25em] uppercase text-[#c9a227] font-medium mb-0.5">
              Oil Amor
            </div>

            {/* Divider */}
            <div
              className="w-8 h-[1px] mx-auto my-1"
              style={{ background: oilColor }}
            />

            {/* Oil Name */}
            <div
              className="font-serif text-sm font-bold tracking-wide uppercase"
              style={{ color: oilColorLight }}
            >
              {oilData.commonName}
            </div>

            {/* Botanical */}
            <div className="text-[7px] text-[#a69b8a] italic mt-0.5">
              {oilData.technicalName}
            </div>

            {/* Origin */}
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <MapPin className="w-2 h-2" style={{ color: oilColor }} />
              <span className="text-[7px] text-[#a69b8a]">{oilData.origin}</span>
            </div>

            {/* Properties */}
            {properties.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {properties.map((tag) => (
                  <span
                    key={tag}
                    className="text-[6px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      background: hexToRgba(oilColor, 0.15),
                      color: oilColorLight,
                      border: `1px solid ${hexToRgba(oilColor, 0.2)}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Crystal */}
            {firstCrystal && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Gem className="w-2 h-2" style={{ color: oilColor }} />
                <span className="text-[7px] text-[#a69b8a]">
                  {firstCrystal.name} • {oilData.sizeInfo['30ml'].crystals} chips
                </span>
              </div>
            )}

            {/* Size */}
            <div className="text-[8px] text-[#a69b8a] mt-2 font-medium">
              30ml
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
