'use client'

// ============================================================================
// SECTION: Crystal Selection - Always Visible
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import { Gem } from 'lucide-react'
import { ComponentStockBadge } from '@/app/components/stock-status-badge'
import { getAllCrystals } from '@/lib/atelier/atelier-engine'
import { cn } from '@/lib/utils'

export function CrystalSelector({
  selectedCrystalId,
  onSelectCrystal,
  showCrystalSelector,
  onToggleSelector,
}: {
  selectedCrystalId: string | undefined
  onSelectCrystal: (id: string) => void
  showCrystalSelector: boolean
  onToggleSelector: (show: boolean) => void
}) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0b0f] border border-[#c9a227]/30 shadow-lg shadow-[#c9a227]/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
            <Gem className="w-5 h-5 text-[#c9a227]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#f5f3ef]">Crystal Infusion</h3>
            <p className="text-xs text-[#a69b8a]">Select energy for your blend</p>
          </div>
        </div>
        <button
          onClick={() => onToggleSelector(!showCrystalSelector)}
          className={cn(
            'text-xs px-4 py-2 rounded-full transition-all font-medium',
            showCrystalSelector 
              ? 'bg-[#c9a227] text-[#0a080c]' 
              : 'bg-[#0a080c] text-[#c9a227] border border-[#c9a227]/30 hover:bg-[#c9a227]/10'
          )}
        >
          {showCrystalSelector ? 'Hide Options' : 'Change Crystal'}
        </button>
      </div>
      
      {/* Selected Crystal Display */}
      {(() => {
        const selectedCrystal = getAllCrystals().find(c => c.id === selectedCrystalId)
        return (
          <div className="p-4 rounded-xl bg-[#0a080c]/60 border border-[#f5f3ef]/5 mb-4">
            <div className="flex items-start gap-3">
              <div 
                className="w-12 h-12 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                style={{ backgroundColor: selectedCrystal?.color || '#e8e8e8' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[#f5f3ef] font-medium text-base">
                  {selectedCrystal?.name || 'Clear Quartz'}
                </p>
                <p className="text-sm text-[#a69b8a] leading-relaxed mt-1">
                  {selectedCrystal?.description || 'The master healer and energy amplifier'}
                </p>
              </div>
            </div>
          </div>
        )
      })()}
      
      <AnimatePresence>
        {showCrystalSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-[#a69b8a] mb-3 uppercase tracking-wider">All Available Crystals</p>
            <div className="grid grid-cols-3 gap-3 mb-3 max-h-72 overflow-y-auto pr-1">
              {getAllCrystals().map(crystal => (
                <button
                  key={crystal.id}
                  onClick={() => onSelectCrystal(crystal.id)}
                  className={cn(
                    'p-3 rounded-xl border transition-all text-left hover:scale-105',
                    selectedCrystalId === crystal.id
                      ? 'bg-[#c9a227]/20 border-[#c9a227] ring-1 ring-[#c9a227]/50'
                      : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#c9a227]/30'
                  )}
                  title={crystal.description}
                >
                  <div 
                    className="w-8 h-8 rounded-full mb-2 border border-white/20"
                    style={{ backgroundColor: crystal.color }}
                  />
                  <p className="text-xs text-[#a69b8a] leading-tight">{crystal.name}</p>
                  <div className="mt-1">
                    <ComponentStockBadge category="crystal" id={crystal.id} size="sm" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
