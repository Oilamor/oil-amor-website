'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Beaker } from 'lucide-react'
import type { BlendWithRating } from '@/lib/community-blends/data'

const EASE_LUXURY = [0.16, 1, 0.3, 1] as const

export function CommunityStrip() {
  const [blends, setBlends] = useState<BlendWithRating[]>([])

  useEffect(() => {
    fetch('/api/community-blends?sort=purchased&limit=6')
      .then((r) => r.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : data.blends || []
        const real = raw.filter((b: BlendWithRating) => !b.id.startsWith('demo-'))
        setBlends(real.slice(0, 6))
      })
      .catch(() => setBlends([]))
  }, [])

  return (
    <section className="relative overflow-hidden border-y border-[#f5f3ef]/5 bg-[#050505] py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE_LUXURY }}
            className="max-w-xl"
          >
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[#a69b8a]">
              From the Community
            </span>
            <h3 className="mt-2 font-display text-3xl text-[#f5f3ef] lg:text-4xl">
              Blend. Publish. Earn.
            </h3>
            <p className="mt-4 text-sm font-light leading-relaxed text-[#a69b8a]">
              When you create a blend in the Atelier and purchase it, you can
              choose to publish your formula to our Community Blends page.
              Every time someone buys your blend, you earn{' '}
              <span className="text-[#f5f3ef]">10% in store credit</span> —
              forever.
            </p>
          </motion.div>

          <Link
            href="/community-blends"
            className="group inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.15em] text-[#c9a227] transition-colors hover:text-[#f5f3ef]"
          >
            Explore All
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {blends.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {blends.map((blend, i) => (
              <motion.div
                key={blend.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, ease: EASE_LUXURY }}
              >
                <Link href={`/community-blends/${blend.slug}`}>
                  <div className="group flex items-center gap-4 border border-[#f5f3ef]/10 bg-[#050505]/40 px-5 py-3 transition-all hover:border-[#c9a227]/30 hover:bg-[#050505]/80">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9a227]/20 bg-[#c9a227]/10 text-xs font-medium text-[#c9a227]">
                      {blend.creatorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-[#f5f3ef] transition-colors group-hover:text-[#c9a227]">
                        {blend.name}
                      </p>
                      <p className="text-[10px] text-[#a69b8a]">
                        by {blend.creatorName} • {blend.recipe.oils.length} oils
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="border border-[#f5f3ef]/10 bg-[#050505]/40 p-12 text-center"
          >
            <Beaker className="mx-auto mb-4 h-8 w-8 text-[#c9a227]/50" />
            <p className="text-[#a69b8a]">
              The first community blends are brewing.
            </p>
            <Link
              href="/mixing-atelier"
              prefetch={false}
              className="mt-4 inline-block text-[0.7rem] uppercase tracking-[0.15em] text-[#c9a227] hover:text-[#f5f3ef]"
            >
              Be the First Creator
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
