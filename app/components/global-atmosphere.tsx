'use client'

import { useEffect, useState } from 'react'

/**
 * Site-wide atmosphere: film grain, light leaks, vignette.
 *
 * Pure CSS animations (transform/opacity only) — the previous framer-motion
 * version kept a JS animation loop + large blurred layers running on every
 * page and put framer-motion in the shared root chunk. This renders nothing
 * until mounted and honours prefers-reduced-motion.
 */
export function GlobalAtmosphere() {
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setMounted(true)
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  if (!mounted || reducedMotion) return null

  return (
    <>
      {/* Film Grain */}
      <div
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Animated grain shift overlay */}
      <div
        className="atmosphere-grain fixed inset-0 pointer-events-none z-[9997]"
        style={{
          opacity: 0.02,
          animation: 'atmosphere-grain 1s linear infinite',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n2)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Light Leaks — Top Right */}
      <div
        className="atmosphere-leak fixed -top-[20vh] -right-[20vh] h-[60vh] w-[60vh] rounded-full pointer-events-none z-[9996]"
        style={{
          background: 'radial-gradient(circle, rgba(201, 162, 39, 0.12) 0%, transparent 60%)',
          filter: 'blur(60px)',
          animation: 'atmosphere-leak-tr 12s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* Light Leaks — Bottom Left */}
      <div
        className="atmosphere-leak fixed -bottom-[10vh] -left-[10vh] h-[50vh] w-[50vh] rounded-full pointer-events-none z-[9996]"
        style={{
          background: 'radial-gradient(circle, rgba(139, 115, 85, 0.1) 0%, transparent 60%)',
          filter: 'blur(50px)',
          animation: 'atmosphere-leak-bl 15s ease-in-out infinite',
          animationDelay: '3s',
        }}
        aria-hidden="true"
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-[9995]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(10, 8, 12, 0.4) 100%)',
        }}
        aria-hidden="true"
      />
    </>
  )
}
