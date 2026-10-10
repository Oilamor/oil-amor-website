'use client'

import dynamic from 'next/dynamic'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'

// Bespoke WebGL oil-film shader — code-split (not in the initial bundle),
// no-JS fallback keeps the CSS gradient hero below.
const OilCanvas = dynamic(() => import('./oil-canvas').then((m) => m.OilCanvas), {
  ssr: false,
  loading: () => null,
})

export function HeroSection() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 400], [1, 0])
  const y = useTransform(scrollY, [0, 400], [0, -120])

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#050505]">
      {/* CSS gradient base — always present as the shader's no-JS/no-WebGL fallback */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(46,26,82,0.5) 0%, transparent 60%),' +
            'radial-gradient(ellipse 70% 55% at 82% 30%, rgba(201,162,39,0.14) 0%, transparent 55%),' +
            'radial-gradient(ellipse 90% 70% at 60% 85%, rgba(90,40,120,0.35) 0%, transparent 65%),' +
            'radial-gradient(circle at 50% 55%, rgba(201,162,39,0.10) 0%, transparent 45%)',
        }}
      />

      {/* Bespoke WebGL liquid-gold oil film */}
      <OilCanvas className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Copy plate — a soft dark disc behind the headline block guarantees
          legibility no matter what the shader does behind it */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[85vh] w-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(5,4,8,0.85) 0%, rgba(5,4,8,0.55) 45%, transparent 72%)',
        }}
      />

      {/* Grain texture overlay — subtle */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-20 text-center"
        style={{
          opacity,
          y,
          textShadow: '0 2px 18px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.85)',
        }}
      >
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-[0.6rem] uppercase tracking-[0.4em] text-[#a69b8a]"
        >
          Est. 2026 — Central Coast, NSW
        </motion.span>

        <div className="overflow-hidden">
          <motion.h1
            className="font-display text-[clamp(3.2rem,11vw,10rem)] leading-[0.85] tracking-[-0.04em] text-[#f5f3ef]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Essence
          </motion.h1>
        </div>
        <div className="overflow-hidden">
          <motion.h1
            className="font-display text-[clamp(3.2rem,11vw,10rem)] leading-[0.85] tracking-[-0.04em] text-[#c9a227]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.38 }}
          >
            <span className="italic">Transcended</span>
          </motion.h1>
        </div>

        <motion.p
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mt-12 max-w-md text-sm font-light leading-relaxed tracking-wide text-[#a69b8a]"
        >
          Australian organic essential oils. Paired with sacred crystals.
          Culminating in jewelry that carries intention.
        </motion.p>

        <motion.div
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, delay: 0.35 }}
          className="mt-14 flex flex-col gap-4 sm:flex-row sm:gap-6"
        >
          <Link
            href="/oils"
            className="group relative overflow-hidden border border-[#c9a227] bg-[#c9a227] px-12 py-4 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#050505] transition-all hover:bg-transparent hover:text-[#c9a227]"
          >
            Enter the Collection
          </Link>
          <Link
            href="/mixing-atelier"
            prefetch={false}
            className="group relative overflow-hidden border border-[#f5f3ef]/20 px-12 py-4 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#f5f3ef] transition-all hover:border-[#c9a227] hover:text-[#c9a227]"
          >
            Become the Alchemist
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        style={{ opacity }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <motion.div
          className="h-20 w-px bg-gradient-to-b from-[#c9a227] to-transparent"
          animate={{ scaleY: [1, 0.3, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  )
}
