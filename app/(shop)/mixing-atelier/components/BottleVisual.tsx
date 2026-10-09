'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export interface BottleLayer {
  oilId: string
  color: string
  ml: number
  bottom: number // percent of fillable volume, from the bottom
  height: number // percent of fillable volume
  isNew?: boolean
}

interface BottleVisualProps {
  bottleSize: number // 5 | 10 | 15 | 20 | 30
  mode: 'pure' | 'carrier'
  layers: BottleLayer[]
  empty?: boolean
  showMeasurement?: boolean
}

/**
 * Real MIRON Violetglass bottle renders with the blend's oil layers filled
 * inside the glass. Fill geometry is tuned per bottle size against the
 * product photography in public/images/bottles/ (all regenerated with
 * transparent backgrounds). Carrier mode gets the pourer closure, pure mode
 * the vertical dropper — matching the real fulfilment configuration.
 */

// Fillable-body geometry per size, as fractions of the bottle image.
// Inner bounds derive from the transparent product shots' silhouettes so the
// liquid spans the full glass interior (bbox minus wall thickness):
// [body top y (fill top limit), base y, inner left x, inner right x]
const GEOMETRY: Record<number, { shoulder: number; base: number; innerL: number; innerR: number }> = {
  5: { shoulder: 0.70, base: 0.875, innerL: 0.45, innerR: 0.60 },
  10: { shoulder: 0.65, base: 0.875, innerL: 0.45, innerR: 0.615 },
  15: { shoulder: 0.60, base: 0.875, innerL: 0.44, innerR: 0.615 },
  20: { shoulder: 0.57, base: 0.875, innerL: 0.44, innerR: 0.62 },
  30: { shoulder: 0.54, base: 0.875, innerL: 0.43, innerR: 0.64 },
}

// Display height by real-world bottle proportions (Orion DIN18 heights)
const HEIGHT_CLASS: Record<number, string> = {
  5: 'h-40',
  10: 'h-48',
  15: 'h-52',
  20: 'h-56',
  30: 'h-64',
}

const CAP_SRC: Record<'pure' | 'carrier', string> = {
  pure: '/images/bottles/cap-dropper-ribbed.webp',
  carrier: '/images/bottles/cap-pourer-ribbed.webp',
}

/** Darken a #rrggbb colour for the depth gradient at the bottom of each oil layer */
function shade(color: string, factor: number): string {
  const m = color.replace('#', '')
  if (m.length !== 6) return color
  const n = (i: number) => Math.max(0, Math.min(255, Math.round(parseInt(m.slice(i, i + 2), 16) * factor)))
  return `#${n(0).toString(16).padStart(2, '0')}${n(2).toString(16).padStart(2, '0')}${n(4).toString(16).padStart(2, '0')}`
}

export function BottleVisual({
  bottleSize,
  mode,
  layers,
  empty = false,
  showMeasurement = true,
}: BottleVisualProps) {
  const geo = GEOMETRY[bottleSize] ?? GEOMETRY[10]
  const size = (GEOMETRY[bottleSize] ? bottleSize : 10) as 5 | 10 | 15 | 20 | 30
  const fillTop = geo.shoulder * 100
  const fillHeight = (geo.base - geo.shoulder) * 100

  return (
    <div className="relative flex flex-col items-center">
      {/* Bottle + liquid (single coordinate system) */}
      <div className={`relative ${HEIGHT_CLASS[size]} aspect-square`}>
        {/* Bottle photography — the base layer */}
        <Image
          src={`/images/bottles/bottle-${size}ml.webp`}
          alt={`${bottleSize}ml MIRON Violetglass bottle`}
          width={480}
          height={480}
          className="relative z-10 h-full w-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)]"
          priority={false}
        />

        {/* Oil fill — ABOVE the photo, screen-blended so the liquid glows
            through the violet glass. Spans the full glass interior; each
            layer is a vertical oil gradient (lit surface → deep body), and
            only the top surface carries the meniscus highlight. */}
        <div
          className="absolute z-20 overflow-hidden pointer-events-none"
          style={{
            left: `${geo.innerL * 100}%`,
            right: `${(1 - geo.innerR) * 100}%`,
            top: `${fillTop}%`,
            height: `${fillHeight}%`,
            borderRadius: '10% 10% 8% 8% / 4% 4% 3% 3%',
          }}
        >
          {(() => {
            const topSurfaceBottom = Math.max(...layers.map((l) => l.bottom + l.height), 0)
            return layers.map((layer) => {
              const isTop = layer.bottom + layer.height >= topSurfaceBottom - 0.001
              return (
                <motion.div
                  key={layer.oilId}
                  layout
                  initial={layer.isNew ? { height: 0, opacity: 0 } : false}
                  animate={{ height: `${layer.height}%`, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    delay: layer.isNew ? 0.3 : 0,
                  }}
                  className="absolute left-0 right-0"
                  style={{
                    background: `linear-gradient(180deg, ${shade(layer.color, 1.15)} 0%, ${layer.color} 45%, ${shade(layer.color, 0.72)} 100%)`,
                    bottom: `${layer.bottom}%`,
                    mixBlendMode: 'screen',
                    opacity: 0.85,
                    boxShadow: 'inset 0 -6px 10px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.10)',
                  }}
                >
                  {/* meniscus — only the uppermost surface */}
                  {isTop && (
                    <div
                      className="absolute -top-px left-0 right-0 h-[3px]"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                      }}
                    />
                  )}
                  {layer.isNew && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 1 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `0 0 24px 8px ${layer.color}` }}
                    />
                  )}
                </motion.div>
              )
            })
          })()}
        </div>

        {/* Cap — absolutely positioned over the neck. The cap product shots
            frame the cap much larger than the bottle shots frame the bottle,
            so it scales down hard. Dropper for pure, pourer for carrier. */}
        <div
          className="absolute left-1/2 z-40 w-[26%] -translate-x-1/2"
          style={{ top: '30%' }}
        >
          <Image
            src={CAP_SRC[mode]}
            alt=""
            width={400}
            height={400}
            className="h-auto w-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
            priority={false}
          />
        </div>

        {/* Measurement ticks */}
        {showMeasurement && (
          <div className="absolute right-[2%] top-[50%] bottom-[12%] z-30 w-6">
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute right-0 flex items-center justify-end gap-1"
                style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
              >
                <span className="text-[8px] text-[#a69b8a]/50">{pct}%</span>
                <div className="w-2 h-px bg-[#a69b8a]/40" />
              </div>
            ))}
          </div>
        )}
      </div>

      {empty && (
        <p className="mt-3 text-[11px] text-[#a69b8a]/70 text-center max-w-[140px]">
          Your blend will fill this {bottleSize}ml violetglass bottle
        </p>
      )}
    </div>
  )
}
