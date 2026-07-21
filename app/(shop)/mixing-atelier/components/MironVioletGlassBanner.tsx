'use client'

// ============================================================================
// COMPONENT: Miron Violet Glass Banner
// ============================================================================
import { motion } from 'framer-motion'
import { Droplets, ExternalLink, Shield, Sparkles, Wind, Wine } from 'lucide-react'
import Link from 'next/link'
import { BlendMode } from '../atelier-utils'

export function MironVioletGlassBanner({ mode }: { mode: BlendMode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2d1b4e] via-[#4c1d95] to-[#2d1b4e] border border-[#8B5CF6]/50 shadow-xl"
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#8B5CF6]/20 via-transparent to-transparent" />
      
      <div className="relative p-5 flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
            <Wine className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              Handcrafted in Miron Violet Glass
              <span className="px-2 py-0.5 rounded-full bg-[#A855F7]/30 text-[#c4b5fd] text-xs border border-[#8B5CF6]/30">
                Premium Protection
              </span>
            </h3>
            <Link 
              href="/bottles#science"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs hover:bg-[#8B5CF6]/20 transition-colors whitespace-nowrap"
            >
              Learn more
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          
          <p className="text-[#c4b5fd] text-sm mb-3">
            Laboratory-grade Miron violet glass blocks 100% of UV-A and UV-B rays while allowing 
            beneficial violet and infrared light to penetrate. This unique combination naturally 
            preserves your oils&apos; potency, maintaining pH balance and active compounds for 2+ years—
            compared to just months in conventional glass.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs">
              {mode === 'pure' ? (
                <>
                  <Droplets className="w-3.5 h-3.5 text-[#A855F7]" />
                  Glass Dropper Included
                </>
              ) : (
                <>
                  <Wind className="w-3.5 h-3.5 text-[#A855F7]" />
                  Stainless Steel Roller Included
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs">
              <Shield className="w-3.5 h-3.5 text-[#A855F7]" />
              100% UV Protection
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1033]/60 border border-[#8B5CF6]/30 text-[#ddd6fe] text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
              2+ Year Potency Preservation
            </span>
            <Link 
              href="/bottles#science"
              className="sm:hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/30 border border-[#8B5CF6]/50 text-[#ddd6fe] text-xs"
            >
              Learn more
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#8B5CF6]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#A855F7]/10 to-transparent" />
    </motion.div>
  )
}
