'use client'

// ============================================================================
// COMPONENT: Cord Selector with Collapse and Info Modal
// ============================================================================
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Scroll, Sparkles } from 'lucide-react'
import { Tooltip } from '@/app/components/tooltip'
import { ComponentStockBadge } from '@/app/components/stock-status-badge'
import {
  SIMPLE_CORD_OPTIONS,
  SimpleCordOption,
} from '@/lib/atelier/cord-data-simple'
import { cn } from '@/lib/utils'

export function CordSelector({ 
  selectedCordId, 
  onSelect 
}: { 
  selectedCordId: string
  onSelect: (id: string) => void 
}) {
  const [showAll, setShowAll] = useState(false)
  const [infoCord, setInfoCord] = useState<SimpleCordOption | null>(null)
  const selectedCord = SIMPLE_CORD_OPTIONS.find(c => c.id === selectedCordId) || SIMPLE_CORD_OPTIONS[0]
  
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scroll className="w-5 h-5 text-[#c9a227]" />
          <h3 className="text-lg font-medium text-[#f5f3ef]">Cord & Closure</h3>
        </div>
        <Tooltip content="Cord pricing is passed through at cost, same as our Collection products">
          <Info className="w-4 h-4 text-[#a69b8a] cursor-help" />
        </Tooltip>
      </div>
      
      {showAll ? (
        /* Expanded List */
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {SIMPLE_CORD_OPTIONS.map(cord => (
            <div key={cord.id} className="flex gap-2">
              <button
                onClick={() => { onSelect(cord.id); setShowAll(false); }}
                className={cn(
                  'flex-1 p-4 rounded-xl border transition-all text-left flex items-center gap-4 hover:scale-[1.02]',
                  selectedCordId === cord.id
                    ? cord.id === 'mystery-pendant' 
                      ? 'bg-purple-500/10 border-purple-500'
                      : 'bg-[#c9a227]/10 border-[#c9a227]'
                    : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                )}
              >
                {/* Cord Preview */}
                {cord.id === 'mystery-pendant' ? (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-white/10 shadow-inner"
                    style={{ backgroundColor: cord.colorCode }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'font-medium',
                    selectedCordId === cord.id 
                      ? cord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'
                      : 'text-[#a69b8a]'
                  )}>
                    {cord.name}
                  </h4>
                </div>
                
                <div className="text-right flex flex-col items-end gap-1">
                  <ComponentStockBadge category="cord" id={cord.id} size="sm" />
                  {cord.price === 0 ? (
                    <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Free</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs font-medium">+${cord.price.toFixed(2)}</span>
                  )}
                </div>
              </button>
              
              {/* Info Button */}
              <button
                onClick={() => setInfoCord(cord)}
                className="px-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 text-[#a69b8a] hover:text-[#c9a227] transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => setShowAll(false)}
            className="w-full py-2 text-xs text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
          >
            Collapse
          </button>
        </div>
      ) : (
        /* Collapsed - Show Selected Only */
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
          {selectedCord.id === 'mystery-pendant' ? (
            <div className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
          ) : (
            <div 
              className="w-12 h-12 rounded-lg flex-shrink-0 border-2 border-white/10 shadow-inner"
              style={{ backgroundColor: selectedCord.colorCode }}
            />
          )}
          
          <div className="flex-1">
            <h4 className={cn(
              'font-medium',
              selectedCord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'
            )}>
              {selectedCord.name}
            </h4>
            <p className="text-xs text-[#a69b8a]">{selectedCord.bestFor?.[0] || 'Cord selection'}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setInfoCord(selectedCord)}
              className="px-3 py-2 rounded-lg bg-[#111] border border-[#f5f3ef]/10 hover:border-[#c9a227]/30 text-[#a69b8a] hover:text-[#c9a227] transition-colors text-xs"
            >
              Info
            </button>
            <button
              onClick={() => setShowAll(true)}
              className="px-3 py-2 rounded-lg bg-[#c9a227]/10 border border-[#c9a227]/30 text-[#c9a227] hover:bg-[#c9a227]/20 transition-colors text-xs"
            >
              Change
            </button>
          </div>
        </div>
      )}
      
      {/* Cord Info Modal */}
      <AnimatePresence>
        {infoCord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setInfoCord(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-[#f5f3ef]/20 rounded-2xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {infoCord.id === 'mystery-pendant' ? (
                  <div className="w-12 h-12 rounded-lg border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-white/10"
                    style={{ backgroundColor: infoCord.colorCode }}
                  />
                )}
                <div>
                  <h3 className={cn(
                    'text-lg font-medium',
                    infoCord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'
                  )}>
                    {infoCord.name}
                  </h3>
                  <p className="text-xs text-[#a69b8a]">{infoCord.material}</p>
                </div>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="text-[#c9a227] font-medium mb-1">Description</h4>
                  <p className="text-[#a69b8a]">{infoCord.description}</p>
                </div>
                
                {infoCord.bestFor && (
                  <div>
                    <h4 className="text-[#c9a227] font-medium mb-1">Best For</h4>
                    <div className="flex flex-wrap gap-2">
                      {infoCord.bestFor.map((use, i) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-[#f5f3ef]/10 text-[#a69b8a] text-xs">
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {infoCord.energy && (
                  <div>
                    <h4 className="text-[#c9a227] font-medium mb-1">Energy & Meaning</h4>
                    <p className="text-[#a69b8a]">{infoCord.energy}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-[#f5f3ef]/10">
                  <p className="text-xs text-[#a69b8a]/60">
                    When imbued with your oil and crystals, this cord carries the energetic signature 
                    of your blend throughout your day.
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setInfoCord(null)}
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
