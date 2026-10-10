'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { OIL_DATABASE } from '@/lib/content/oil-crystal-synergies'

const EASE_LUXURY = [0.16, 1, 0.3, 1] as const

// Distribute 33 oils across 3 rings
const RINGS = [
  { radius: 130, duration: 120, oils: OIL_DATABASE.slice(0, 11) },
  { radius: 220, duration: 180, oils: OIL_DATABASE.slice(11, 22) },
  { radius: 310, duration: 240, oils: OIL_DATABASE.slice(22, 33) },
]

function OilNode({
  oil,
  angle,
  radius,
  isHovered,
  setHoveredOil,
  isMobile,
}: {
  oil: (typeof OIL_DATABASE)[0]
  angle: number
  radius: number
  isHovered: boolean
  setHoveredOil: (id: string | null) => void
  isMobile: boolean
}) {
  const router = useRouter()
  const href = `/oil/${oil.handle || oil.id}`
  const mainCrystal = oil.crystalPairings[0]

  const content = (
    <>
      <span
        className={`whitespace-nowrap text-[10px] uppercase tracking-[0.2em] transition-all duration-300 lg:text-[11px] ${
          isHovered
            ? 'scale-110 text-[#f5f3ef]'
            : 'text-[#a69b8a]/80 hover:text-[#f5f3ef]'
        }`}
      >
        {oil.commonName}
      </span>
      {isHovered && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 whitespace-nowrap text-[9px] tracking-[0.15em] text-[#c9a227]"
        >
          {mainCrystal?.name}
        </motion.span>
      )}
      <span
        className={`mt-1.5 h-1 w-1 rounded-full transition-all duration-300 ${
          isHovered
            ? 'scale-150 bg-[#c9a227] shadow-[0_0_8px_rgba(201,162,39,0.8)]'
            : 'bg-[#a69b8a]/30'
        }`}
      />
    </>
  )

  const style = {
    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)`,
  } as React.CSSProperties

  if (isMobile) {
    return (
      <button
        key={oil.id}
        onClick={() => {
          if (isHovered) {
            router.push(href)
          } else {
            setHoveredOil(oil.id)
          }
        }}
        className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center bg-transparent p-2"
        style={style}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      key={oil.id}
      href={href}
      onMouseEnter={() => setHoveredOil(oil.id)}
      onMouseLeave={() => setHoveredOil(null)}
      className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center p-2"
      style={style}
    >
      {content}
    </Link>
  )
}

function OrbitalRing({
  ring,
  ringIndex,
  hoveredOil,
  setHoveredOil,
  radius,
  isMobile,
}: {
  ring: (typeof RINGS)[0]
  ringIndex: number
  hoveredOil: string | null
  setHoveredOil: (id: string | null) => void
  radius: number
  isMobile: boolean
}) {
  const direction = ringIndex % 2 === 0 ? 1 : -1

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ marginLeft: 0, marginTop: 0 }}
      animate={{ rotate: direction * 360 }}
      transition={{ duration: ring.duration, repeat: Infinity, ease: 'linear' }}
    >
      {ring.oils.map((oil, i) => {
        const angle = (360 / ring.oils.length) * i
        return (
          <OilNode
            key={oil.id}
            oil={oil}
            angle={angle}
            radius={radius}
            isHovered={hoveredOil === oil.id}
            setHoveredOil={setHoveredOil}
            isMobile={isMobile}
          />
        )
      })}
    </motion.div>
  )
}

export function CodexSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [hoveredOil, setHoveredOil] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(1024)

  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const isMobile = windowWidth < 1024
  const radii = isMobile ? [85, 145, 205] : [130, 220, 310]

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#050505] py-24 lg:py-40">
      {/* Radial glow behind mandala */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(26,15,46,0.4) 0%, transparent 60%)',
        }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 2, ease: EASE_LUXURY }}
      />

      {/* Header */}
      <div className="relative z-10 mb-12 px-6 text-center lg:mb-0 lg:absolute lg:left-0 lg:right-0 lg:top-14">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: EASE_LUXURY }}
          className="mb-4 block text-[0.6rem] uppercase tracking-[0.3em] text-[#a69b8a]"
        >
          The Codex
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.1, ease: EASE_LUXURY }}
          className="font-display text-4xl leading-[1.05] tracking-tight text-[#f5f3ef] sm:text-5xl lg:text-6xl"
        >
          Thirty-Three
          <br />
          <span className="italic text-[#c9a227]">Sacred Oils</span>
        </motion.h2>
      </div>

      {/* Rotating constellation — all screen sizes */}
      <div className="relative mx-auto h-[480px] w-full max-w-5xl lg:h-[700px]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Center core */}
          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#c9a227]/20 bg-[#050505]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: EASE_LUXURY }}
          >
            <div className="h-2 w-2 rounded-full bg-[#c9a227] shadow-[0_0_30px_rgba(201,162,39,0.6)]" />
          </motion.div>

          {/* Rings */}
          {RINGS.map((ring, i) => (
            <OrbitalRing
              key={i}
              ring={ring}
              ringIndex={i}
              hoveredOil={hoveredOil}
              setHoveredOil={setHoveredOil}
              radius={radii[i]}
              isMobile={isMobile}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6, ease: EASE_LUXURY }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center lg:bottom-8"
        >
          <p className="mb-4 text-xs tracking-wide text-[#a69b8a]/60">
            {isMobile ? 'Tap an oil to reveal its crystal pairing' : 'Hover to reveal crystal pairings'}
          </p>
          <Link
            href="/oils"
            className="group inline-flex items-center gap-2 border border-[#c9a227] bg-[#c9a227] px-8 py-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#050505] transition-all hover:bg-transparent hover:text-[#c9a227]"
          >
            Explore the Collection
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
