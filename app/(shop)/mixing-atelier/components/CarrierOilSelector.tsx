'use client'

// ============================================================================
// SECTION: Carrier Oil Selection - Collapsible
// ============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARRIER_COMPARISON, CARRIER_EDUCATION, CARRIER_OILS } from '../atelier-utils'

export function CarrierOilSelector({
  selectedCarrierOilId,
  onSelect,
  showCarrierSelector,
  onToggle,
}: {
  selectedCarrierOilId: string
  onSelect: (id: string) => void
  showCarrierSelector: boolean
  onToggle: (show: boolean) => void
}) {
  return (
    <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-[#c9a227]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[#f5f3ef]">Carrier Oil</h3>
            <p className="text-xs text-[#a69b8a]">
              {(() => {
                const selected = CARRIER_OILS.find(c => c.id === selectedCarrierOilId)
                return selected ? `${selected.name} selected` : 'Select a carrier oil'
              })()}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!showCarrierSelector)}
          className={cn(
            'text-xs px-4 py-2 rounded-full transition-all font-medium',
            showCarrierSelector 
              ? 'bg-[#c9a227] text-[#0a080c]' 
              : 'bg-[#0a080c] text-[#c9a227] border border-[#c9a227]/30 hover:bg-[#c9a227]/10'
          )}
        >
          {showCarrierSelector ? 'Hide' : 'Change'}
        </button>
      </div>
      
      {/* Selected Carrier Display */}
      {!showCarrierSelector && selectedCarrierOilId && (
        <div className="p-4 rounded-xl bg-[#0a080c]/60 border border-[#f5f3ef]/5">
          <div className="flex items-start gap-3">
            <div 
              className="w-14 h-14 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
              style={{ backgroundColor: CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.color || '#d4a574' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[#f5f3ef] font-medium">
                {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name}
              </p>
              
              {/* Educational highlight */}
              <div className="mt-2 p-2 rounded-lg bg-[#c9a227]/10 border border-[#c9a227]/20">
                <p className="text-xs text-[#c9a227] italic">
                  {CARRIER_EDUCATION[selectedCarrierOilId]?.highlight}
                </p>
              </div>
              
              <p className="text-sm text-[#a69b8a] leading-relaxed mt-2">
                {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.description}
              </p>
              
              {/* Scientific fact */}
              <p className="text-xs text-[#a69b8a]/70 mt-2">
                <span className="text-[#c9a227]">Science:</span> {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.scientificFact}
              </p>
              
              {/* Best for tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.bestFor.map(use => (
                  <span key={use} className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                    {use}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <AnimatePresence>
        {showCarrierSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Educational Header */}
            <div className="p-4 rounded-xl bg-[#c9a227]/5 border border-[#c9a227]/20 mb-4">
              <h4 className="text-sm font-medium text-[#c9a227] mb-2">Why These Two Carriers?</h4>
              <p className="text-xs text-[#a69b8a] leading-relaxed">
                After extensive testing, we selected only the two finest carriers. 
                <strong className="text-[#f5f3ef]"> Jojoba</strong> is a liquid wax ester (not an oil) that mimics human sebum. 
                <strong className="text-[#f5f3ef]"> Fractionated Coconut</strong> stays liquid at any temperature and is completely odorless.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {CARRIER_OILS.map(carrier => (
                <button
                  key={carrier.id}
                  onClick={() => {
                    onSelect(carrier.id)
                    onToggle(false)
                  }}
                  className={cn(
                    'w-full p-4 rounded-xl border transition-all text-left hover:scale-[1.01]',
                    selectedCarrierOilId === carrier.id
                      ? 'bg-[#c9a227]/10 border-[#c9a227]'
                      : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                      style={{ backgroundColor: carrier.color }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn(
                          'font-medium',
                          selectedCarrierOilId === carrier.id ? 'text-[#f5f3ef]' : 'text-[#a69b8a]'
                        )}>
                          {carrier.name}
                        </h4>
                        {selectedCarrierOilId === carrier.id && (
                          <CheckCircle className="w-4 h-4 text-[#c9a227]" />
                        )}
                      </div>
                      
                      <p className="text-sm text-[#a69b8a] mt-1">{carrier.shortDescription}</p>
                      
                      {/* Scientific Fact */}
                      <p className="text-xs text-[#c9a227]/80 mt-2 italic">
                        {carrier.scientificFact}
                      </p>
                      
                      {/* Best For */}
                      <div className="mt-3">
                        <span className="text-[10px] text-[#a69b8a]/70 uppercase tracking-wider">Best For:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {carrier.bestFor.map(use => (
                            <span key={use} className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227]">
                              {use}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Skin Type */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-[#a69b8a]/70">Skin:</span>
                        <span className="text-[10px] text-[#f5f3ef]">{carrier.skinType}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Comparison Table */}
            <div className="mt-4 p-4 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
              <h5 className="text-xs font-medium text-[#a69b8a] mb-3 uppercase tracking-wider">Quick Comparison</h5>
              <div className="space-y-2">
                {CARRIER_COMPARISON.map(row => (
                  <div key={row.feature} className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-[#a69b8a]">{row.feature}</span>
                    <span className={cn(
                      "text-[#f5f3ef]",
                      row.winner === 'jojoba' && "text-[#c9a227] font-medium"
                    )}>{row.jojoba}</span>
                    <span className={cn(
                      "text-[#f5f3ef]",
                      row.winner === 'coconut' && "text-[#c9a227] font-medium"
                    )}>{row.coconut}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
