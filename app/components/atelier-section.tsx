'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { getAllOils, OilProfile } from '@/lib/content/oil-crystal-synergies'
import { calculatePurePrice } from '@/lib/content/pricing-engine-final'
import { logger } from '@/lib/logging/logger'

const EASE = {
  luxury: [0.16, 1, 0.3, 1],
}

// Editorial Oil Card — Art Piece Treatment
function OilCard({ oil, index }: { oil: OilProfile; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, margin: "-100px" })

  const crystalName = oil.crystalPairings[0]?.name || ''
  const origin = oil.origin || ''
  const price = calculatePurePrice(oil.id, 30)
  const priceDisplay = price > 0 ? `$${price.toFixed(0)}` : ''

  // Alternate layout for editorial feel
  const isLarge = index === 0 || index === 3

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 1,
        ease: EASE.luxury,
        delay: index * 0.15
      }}
      className={`group ${isLarge ? 'md:col-span-2' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/oil/${oil.handle || oil.id}`} className="block">
        {/* Image Container — Large, editorial */}
        <div className={`relative overflow-hidden bg-[#141218] ${isLarge ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}>
          <motion.div
            className="absolute inset-0"
            animate={{
              scale: isHovered ? 1.05 : 1,
            }}
            transition={{ duration: 1.2, ease: EASE.luxury }}
          >
            {oil.image ? (
              <Image
                src={oil.image}
                alt={oil.commonName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#262228] to-[#0a080c] flex items-center justify-center">
                <span className="text-[#c9a227]/20 font-display text-8xl italic">
                  {oil.commonName.charAt(0)}
                </span>
              </div>
            )}
          </motion.div>

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a080c]/60 via-transparent to-transparent" />

          {/* Origin badge — minimal */}
          {origin && (
            <div className="absolute top-6 left-6">
              <span className="text-[0.625rem] uppercase tracking-[0.25em] text-[#f5f3ef]/80">
                {origin}
              </span>
            </div>
          )}

          {/* Crystal badge — if large card */}
          {isLarge && crystalName && (
            <div className="absolute top-6 right-6">
              <span className="text-[0.625rem] uppercase tracking-[0.25em] text-[#c9a227]">
                {crystalName}
              </span>
            </div>
          )}
        </div>

        {/* Oil Info — Minimal, elegant */}
        <div className="mt-6 flex items-start justify-between">
          <div>
            <h3 className="font-display text-2xl lg:text-3xl text-[#f5f3ef] font-light tracking-tight">
              {oil.commonName}
            </h3>
            {crystalName && (
              <p className="mt-1 text-[0.75rem] text-[#a69b8a] uppercase tracking-[0.15em]">
                {crystalName} Infusion
              </p>
            )}
          </div>
          {priceDisplay && (
            <span className="font-display text-xl text-[#c9a227]">
              {priceDisplay}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

// Section Header — Editorial
function SectionHeader() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      className="max-w-3xl mb-20 lg:mb-32"
    >
      {/* Eyebrow */}
      <motion.p
        className="text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a] mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE.luxury }}
      >
        The Collection
      </motion.p>

      {/* Title */}
      <motion.h2
        className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#f5f3ef] leading-[1.05] tracking-tight"
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, ease: EASE.luxury, delay: 0.1 }}
      >
        Sacred Oils,
        <br />
        <span className="italic text-[#c9a227]">Crystal Infused</span>
      </motion.h2>

      {/* Description */}
      <motion.p
        className="mt-6 text-[#a69b8a] text-base max-w-lg leading-relaxed"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE.luxury, delay: 0.2 }}
      >
        Each oil is paired with a complementary crystal — chosen not by trend,
        but by energetic resonance. Every bottle becomes a vessel of intention.
      </motion.p>
    </motion.div>
  )
}

// Main Section
export function AtelierSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [oils, setOils] = useState<OilProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load oils from local catalog (client-side for hydration safety)
    try {
      const allOils = getAllOils()
      // Shuffle and take first 3 for variety
      const shuffled = [...allOils].sort(() => Math.random() - 0.5)
      setOils(shuffled.slice(0, 3))
    } catch (error) {
      logger.error('Failed to load oils', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <section id="collection" className="py-32 lg:py-48 bg-[#0a080c]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-[#141218] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const featuredOils = oils.slice(0, 3)

  return (
    <section
      ref={sectionRef}
      id="collection"
      className="relative py-32 lg:py-48 bg-[#0a080c]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <SectionHeader />

        {/* Editorial Grid — Asymmetric, magazine-style */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-16">
          {/* First oil — Large, takes up 7 columns */}
          {featuredOils[0] && (
            <div className="lg:col-span-7">
              <OilCard oil={featuredOils[0]} index={0} />
            </div>
          )}

          {/* Second oil — Smaller, offset, takes up 5 columns */}
          {featuredOils[1] && (
            <div className="lg:col-span-5 lg:mt-32">
              <OilCard oil={featuredOils[1]} index={1} />
            </div>
          )}

          {/* Third oil — Full width, dramatic */}
          {featuredOils[2] && (
            <div className="lg:col-span-12 mt-8">
              <OilCard oil={featuredOils[2]} index={2} />
            </div>
          )}
        </div>

        {/* View All CTA — Minimal */}
        <motion.div
          className="mt-24 flex justify-center"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE.luxury }}
        >
          <Link
            href="/oils"
            className="btn-luxury-dark"
          >
            View Complete Collection
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
