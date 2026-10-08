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

// Fillable-body geometry per size, as fractions of the bottle image:
// [body top y (fill top limit — where the glass reaches full width), base y,
//  inner left x, inner right x]
const GEOMETRY: Record<number, { shoulder: number; base: number; innerL: number; innerR: number }> = {
  5: { shoulder: 0.70, base: 0.87, innerL: 0.465, innerR: 0.575 },
  10: { shoulder: 0.65, base: 0.87, innerL: 0.465, innerR: 0.585 },
  15: { shoulder: 0.60, base: 0.87, innerL: 0.455, innerR: 0.595 },
  20: { shoulder: 0.57, base: 0.87, innerL: 0.45, innerR: 0.60 },
  30: { shoulder: 0.54, base: 0.87, innerL: 0.445, innerR: 0.615 },
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
            through the violet glass instead of hiding behind an opaque photo.
            Geometry keeps every edge inside the glass silhouette. */}
        <div
          className="absolute z-20 overflow-hidden pointer-events-none"
          style={{
            left: `${geo.innerL * 100}%`,
            right: `${(1 - geo.innerR) * 100}%`,
            top: `${fillTop}%`,
            height: `${fillHeight}%`,
            borderRadius: '14% 14% 10% 10% / 5% 5% 4% 4%',
          }}
        >
          {layers.map((layer) => (
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
                backgroundColor: layer.color,
                bottom: `${layer.bottom}%`,
                mixBlendMode: 'screen',
                opacity: 0.55,
              }}
            >
              {/* meniscus shimmer */}
              <div
                className="absolute -top-px left-0 right-0 h-[3px]"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                }}
              />
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
          ))}
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
