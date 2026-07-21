'use client'

// ============================================================================
// SECTION: Blend Revelation Button
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlendMode } from '../atelier-utils'

export function RevelationCard({
  visible,
  mode,
  carrierRatio,
  isGeneratingRevelation,
  revelationFact,
  onReveal,
}: {
  visible: boolean
  mode: BlendMode
  carrierRatio: number
  isGeneratingRevelation: boolean
  revelationFact: string
  onReveal: () => void
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-[#c9a227]/20 via-purple-500/10 to-[#0a080c] border border-[#c9a227]/30"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#c9a227]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-[#c9a227]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-[#f5f3ef] mb-1">
                Unlock Your Blend&apos;s Hidden Wisdom
              </h3>
              <p className="text-sm text-[#a69b8a] mb-4">
                Our AI analyzes your {mode === 'pure' ? 'pure essential' : `${carrierRatio}% dilution`} blend 
                to reveal its archetype, elemental composition, and personalized guidance.
              </p>
              <button
                onClick={onReveal}
                disabled={isGeneratingRevelation}
                className={cn(
                  'w-full py-3 rounded-xl font-medium transition-all',
                  'bg-gradient-to-r from-[#c9a227] to-amber-500 text-[#0a080c]',
                  'hover:from-[#f5f3ef] hover:to-[#c9a227]',
                  'flex items-center justify-center gap-2',
                  'hover:shadow-lg hover:shadow-[#c9a227]/20',
                  isGeneratingRevelation && 'opacity-70 cursor-wait'
                )}
              >
                {isGeneratingRevelation ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#0a080c]/30 border-t-[#0a080c] rounded-full animate-spin" />
                    Analyzing Blend DNA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Reveal Blend Secrets
                  </>
                )}
              </button>
              
              {/* Loading Fact */}
              <AnimatePresence>
                {isGeneratingRevelation && revelationFact && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 p-3 rounded-lg bg-[#0a080c]/50 border border-[#c9a227]/20"
                  >
                    <p className="text-xs text-[#a69b8a] italic">
                      <Lightbulb className="w-3 h-3 inline mr-1 text-[#c9a227]" />
                      Did you know? {revelationFact}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
