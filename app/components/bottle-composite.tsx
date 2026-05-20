'use client'

import Image from 'next/image'
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

        {/* Label overlay — minimal: brand + name only */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-[28%] w-[62%] rounded-sm overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(oilColorLight, 0.2)}, ${hexToRgba(oilColor, 0.3)})`,
            border: `1px solid ${hexToRgba(oilColor, 0.5)}`,
          }}
        >
          <div className="px-1.5 py-1.5 text-center">
            {/* Brand */}
            <div className="text-[6px] tracking-[0.2em] uppercase text-[#c9a227] font-medium">
              Oil Amor
            </div>

            {/* Divider */}
            <div
              className="w-4 h-[1px] mx-auto my-0.5"
              style={{ background: oilColor }}
            />

            {/* Oil Name */}
            <div
              className="font-serif text-[10px] font-bold tracking-wide uppercase"
              style={{ color: oilColorLight }}
            >
              {oilData.commonName}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
