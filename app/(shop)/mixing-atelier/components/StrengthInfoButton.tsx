'use client'

// ============================================================================
// COMPONENT: Strength Info Button & Modal
// ============================================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Baby, Heart, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RATIO_GUIDANCE } from '../atelier-utils'

export function StrengthInfoButton({ ratio }: { ratio: number }) {
  const [showInfo, setShowInfo] = useState(false)
  const guidance = RATIO_GUIDANCE[ratio]
  
  return (
    <>
      <button
        onClick={() => setShowInfo(true)}
        className="px-3 py-2 rounded-lg bg-[#f5f3ef]/5 border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 text-[#a69b8a] hover:text-[#c9a227] transition-colors"
        title="View strength details"
      >
        <Info className="w-4 h-4" />
      </button>
      
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-[#f5f3ef]/20 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold',
                  guidance.experience === 'beginner' && 'bg-green-500/20 text-green-400',
                  guidance.experience === 'intermediate' && 'bg-[#c9a227]/20 text-[#c9a227]',
                  guidance.experience === 'advanced' && 'bg-amber-500/20 text-amber-400'
                )}>
                  {ratio}%
                </div>
                <div>
                  <h3 className="text-xl font-medium text-[#f5f3ef]">{guidance.label}</h3>
                  <span className={cn(
                    'text-xs uppercase tracking-wider',
                    guidance.experience === 'beginner' && 'text-green-400',
                    guidance.experience === 'intermediate' && 'text-[#c9a227]',
                    guidance.experience === 'advanced' && 'text-amber-400'
                  )}>
                    {guidance.experience} level
                  </span>
                </div>
              </div>
              
              <div className="space-y-5 text-sm">
                {/* Description */}
                <div>
                  <h4 className="text-[#c9a227] font-medium mb-1">About this Strength</h4>
                  <p className="text-[#a69b8a]">{guidance.description}</p>
                </div>
                
                {/* Typical Uses */}
                <div>
                  <h4 className="text-[#c9a227] font-medium mb-2">Typical Uses</h4>
                  <ul className="space-y-1">
                    {guidance.typicalUses.map((use, i) => (
                      <li key={i} className="text-[#a69b8a] flex items-start gap-2">
                        <span className="text-[#c9a227] mt-1">•</span>
                        {use}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Safety Advice */}
                <div className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
                  <h4 className="text-amber-400 font-medium mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Safety Guidelines
                  </h4>
                  <p className="text-[#a69b8a] text-xs">{guidance.safetyAdvice}</p>
                </div>
                
                {/* Safety Icons */}
                <div className="flex gap-4">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                    guidance.childrenSafe ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  )}>
                    <Baby className="w-4 h-4" />
                    {guidance.childrenSafe ? 'Children 6+' : 'Adults only'}
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                    guidance.pregnancySafe ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                  )}>
                    <Heart className="w-4 h-4" />
                    {guidance.pregnancySafe ? 'Pregnancy safe' : 'Consult provider'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-6 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/20 text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
