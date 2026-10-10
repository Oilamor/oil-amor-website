'use client'

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const EASE_LUXURY = [0.16, 1, 0.3, 1] as const

// Abstract constellation of glowing spheres
function OrbitalConstellation() {
  const orbs = [
    { size: 80, delay: 0, duration: 20, color: 'rgba(201,162,39,0.35)', orbit: 140 },
    { size: 60, delay: 2, duration: 26, color: 'rgba(232,213,163,0.25)', orbit: 180 },
    { size: 45, delay: 4, duration: 18, color: 'rgba(139,115,85,0.4)', orbit: 100 },
    { size: 30, delay: 1, duration: 14, color: 'rgba(201,162,39,0.5)', orbit: 220 },
    { size: 20, delay: 3, duration: 22, color: 'rgba(232,213,163,0.35)', orbit: 60 },
    { size: 14, delay: 5, duration: 16, color: 'rgba(201,162,39,0.45)', orbit: 260 },
    { size: 10, delay: 0.5, duration: 12, color: 'rgba(139,115,85,0.5)', orbit: 40 },
  ]

  return (
    <div className="relative mx-auto h-[380px] w-[380px] sm:h-[460px] sm:w-[460px]">
      {/* Central core */}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9a227] shadow-[0_0_40px_rgba(201,162,39,0.6)]" />

      {/* Orbits */}
      {[140, 180, 220, 260].map((r) => (
        <div
          key={r}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f5f3ef]/[0.04]"
          style={{ width: r * 2, height: r * 2 }}
        />
      ))}

      {/* Orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            marginLeft: -orb.size / 2,
            marginTop: -orb.size / 2,
            background: `radial-gradient(circle at 35% 35%, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(1px)',
          }}
          animate={{
            x: [0, orb.orbit, 0, -orb.orbit, 0],
            y: [-orb.orbit, 0, orb.orbit, 0, -orb.orbit],
            scale: [1, 1.1, 1, 0.95, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}

export function LaboratorySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const leftY = useTransform(scrollYProgress, [0, 1], [60, -60])
  const rightY = useTransform(scrollYProgress, [0, 1], [40, -40])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#050505] py-32 lg:py-40"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute right-0 top-1/2 h-[80vh] w-[80vh] -translate-y-1/2 rounded-full opacity-20">
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(26,15,46,0.6) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left: Typography */}
          <motion.div style={{ y: leftY }}>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: EASE_LUXURY }}
              className="mb-6 block text-[0.6rem] uppercase tracking-[0.3em] text-[#a69b8a]"
            >
              The Laboratory
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.1, ease: EASE_LUXURY }}
              className="font-display text-4xl leading-[1.05] tracking-tight text-[#f5f3ef] sm:text-5xl lg:text-6xl"
            >
              Become the
              <br />
              <span className="italic text-[#c9a227]">Alchemist</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.25, ease: EASE_LUXURY }}
              className="mx-auto mt-8 max-w-md text-base font-light leading-relaxed text-[#a69b8a] lg:mx-0"
            >
              Step into the Mixing Atelier and compose your own signature
              formula. Select from thirty-three sacred oils and adjust every
              ingredient down to <span className="text-[#f5f3ef]">0.1ml</span>.
              Choose your bottle size, carrier oil, dilution ratio, and the
              crystal that will accompany your blend.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.35, ease: EASE_LUXURY }}
              className="mx-auto mt-5 max-w-md text-base font-light leading-relaxed text-[#a69b8a] lg:mx-0"
            >
              Our <span className="text-[#f5f3ef]">safety engine</span> works in
              real time — flagging contraindications, enforcing maximum safe
              dilutions, and blocking incompatible pairings before they reach
              your bottle. Every creation is validated. Nothing is left to
              chance.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.45, ease: EASE_LUXURY }}
              className="mx-auto mt-5 max-w-md text-base font-light leading-relaxed text-[#a69b8a] lg:mx-0"
            >
              Once your formula is perfect, name it, purchase it, and decide
              its fate — keep it private, or publish it to the Community
              Blends gallery and begin earning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.55, ease: EASE_LUXURY }}
              className="mt-10 flex flex-col gap-4 sm:flex-row"
            >
              <Link
                href="/mixing-atelier"
                prefetch={false}
                className="group inline-flex items-center justify-center gap-2 border border-[#c9a227] bg-[#c9a227] px-10 py-4 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#050505] transition-all hover:bg-transparent hover:text-[#c9a227]"
              >
                Enter the Atelier
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/community-blends"
                className="group inline-flex items-center justify-center gap-2 border border-[#f5f3ef]/20 px-10 py-4 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#f5f3ef] transition-all hover:border-[#c9a227] hover:text-[#c9a227]"
              >
                Explore Creations
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: Constellation */}
          <motion.div style={{ y: rightY }} className="flex justify-center">
            <OrbitalConstellation />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
