'use client'

// ============================================================================
// SECTION: Mode Selection, Bottle Size & Dilution Configuration
// ============================================================================
import { motion } from 'framer-motion'
import { Beaker, Droplets, Info, Wine } from 'lucide-react'
import { Tooltip } from '@/app/components/tooltip'
import { ComponentStockBadge } from '@/app/components/stock-status-badge'
import { CRYSTAL_COUNTS } from '@/lib/content/pricing-engine-final'
import { cn } from '@/lib/utils'
import {
  BlendMode,
  BOTTLE_SIZES,
  CARRIER_RATIOS,
  getMlDecimals,
  RATIO_GUIDANCE,
} from '../atelier-utils'
import { StrengthInfoButton } from './StrengthInfoButton'

export function ModeBottleConfig({
  mode,
  onModeChange,
  bottleSize,
  onBottleSizeChange,
  carrierRatio,
  onCarrierRatioChange,
  currentEssentialOilMl,
  maxEssentialOilMl,
  carrierOilMl,
  isOverfilled,
  isBottleComplete,
}: {
  mode: BlendMode
  onModeChange: (mode: BlendMode) => void
  bottleSize: number
  onBottleSizeChange: (size: number) => void
  carrierRatio: number
  onCarrierRatioChange: (ratio: number) => void
  currentEssentialOilMl: number
  maxEssentialOilMl: number
  carrierOilMl: number
  isOverfilled: boolean
  isBottleComplete: boolean
}) {
  return (
    <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onModeChange('pure')}
          className={cn(
            'flex-1 p-4 rounded-xl border transition-all text-left hover:scale-[1.02]',
            mode === 'pure'
              ? 'bg-[#c9a227]/10 border-[#c9a227]'
              : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <Droplets className="w-5 h-5 text-[#c9a227]" />
            <span className="font-medium text-[#f5f3ef]">Pure Essential</span>
          </div>
          <p className="text-xs text-[#a69b8a]">100% essential oils with glass dropper</p>
        </button>
        
        <button
          onClick={() => onModeChange('carrier')}
          className={cn(
            'flex-1 p-4 rounded-xl border transition-all text-left hover:scale-[1.02]',
            mode === 'carrier'
              ? 'bg-[#c9a227]/10 border-[#c9a227]'
              : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <Beaker className="w-5 h-5 text-[#c9a227]" />
            <span className="font-medium text-[#f5f3ef]">With Carrier</span>
          </div>
          <p className="text-xs text-[#a69b8a]">Diluted in jojoba or other carrier</p>
        </button>
      </div>
      
      {/* Alternative Caps Note */}
      <div className="mt-4 pt-4 border-t border-[#f5f3ef]/10">
        <p className="text-xs text-[#a69b8a] flex items-center gap-2">
          <Info className="w-3 h-3 text-[#c9a227]" />
          Alternative caps (droppers, rollers, pour caps) available in <a href="/bottles" className="text-[#c9a227] hover:underline">Bottles & Accessories</a>
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 mt-6">
        <div>
          <label className="text-sm text-[#a69b8a] mb-2 block">Bottle Size</label>
          
          {/* Visual Bottle Selector */}
          <div className="flex items-end justify-center gap-4 py-5 px-4 bg-[#0a080c] rounded-xl border border-[#f5f3ef]/10">
            {BOTTLE_SIZES.map(size => {
              const chipCount = CRYSTAL_COUNTS[`${size}ml`] || Math.round(size * 0.4)
              const isSelected = bottleSize === size
              // Proportional scaling: width and height both scale with size
              const scale = (size - 5) / 25 // 0 to 1
              const widthPx = 18 + scale * 14 // 18px to 32px
              const heightPx = 45 + scale * 55 // 45px to 100px
              
              return (
                <Tooltip
                  key={size}
                  content={`${size}ml ${mode === 'pure' ? 'dropper' : 'rollerball'} bottle`}
                >
                  <button
                    onClick={() => onBottleSizeChange(size)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    {/* Bottle Container */}
                    <div className="relative">
                      {/* Bottle Cap - Dropper or Rollerball based on mode */}
                      {mode === 'pure' ? (
                        /* Dropper Cap */
                        <div 
                          className={cn(
                            'absolute -top-2 left-1/2 -translate-x-1/2 rounded-t-sm transition-all',
                            isSelected ? 'bg-[#1a1a1a]' : 'bg-[#2a2a2a]'
                          )}
                          style={{ 
                            width: `${widthPx * 0.5}px`, 
                            height: '8px' 
                          }}
                        >
                          {/* Dropper bulb */}
                          <div 
                            className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#1a1a1a]"
                            style={{ width: `${widthPx * 0.4}px`, height: '6px' }}
                          />
                        </div>
                      ) : (
                        /* Rollerball Cap */
                        <div 
                          className={cn(
                            'absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full transition-all',
                            isSelected ? 'bg-[#c9a227]' : 'bg-[#a69b8a]'
                          )}
                          style={{ 
                            width: `${widthPx * 0.6}px`, 
                            height: `${widthPx * 0.6}px` 
                          }}
                        >
                          {/* Metallic ball shine */}
                          <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white/60" />
                        </div>
                      )}
                      
                      {/* Bottle Body */}
                      <div 
                        className={cn(
                          'relative rounded-2xl transition-all duration-300',
                          isSelected 
                            ? 'ring-2 ring-[#c9a227] ring-offset-2 ring-offset-[#0a080c]' 
                            : 'opacity-70 group-hover:opacity-100'
                        )}
                        style={{ 
                          width: `${widthPx}px`,
                          height: `${heightPx}px`,
                          background: isSelected 
                            ? 'linear-gradient(180deg, #4c1d95 0%, #2e1065 40%, #1e1b4b 100%)'
                            : 'linear-gradient(180deg, #2e1065 0%, #1e1b4b 50%, #0f0d1c 100%)',
                          boxShadow: isSelected 
                            ? '0 4px 20px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(255,255,255,0.15)' 
                            : '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)'
                        }}
                      >
                        {/* Violet glass sheen */}
                        <div 
                          className="absolute left-1 top-3 bottom-3 rounded-full bg-gradient-to-b from-white/15 to-transparent"
                          style={{ width: `${widthPx * 0.25}px` }}
                        />
                        
                        {/* Glass Pipette (pure mode only) */}
                        {mode === 'pure' && (
                          <div 
                            className="absolute left-1/2 -translate-x-1/2 top-0"
                            style={{ 
                              width: `${widthPx * 0.25}px`,
                              height: `${heightPx * 0.85}px`
                            }}
                          >
                            {/* Pipette tube */}
                            <div 
                              className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-white/20 via-white/40 to-white/20"
                              style={{ 
                                width: `${Math.max(2, widthPx * 0.08)}px`,
                                height: `${heightPx * 0.7}px`
                              }}
                            />
                            {/* Pipette bulb connection */}
                            <div 
                              className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-white/30 to-white/50 rounded-full"
                              style={{ 
                                width: `${widthPx * 0.25}px`,
                                height: `${Math.max(3, widthPx * 0.12)}px`
                              }}
                            />
                            {/* Pipette tip */}
                            <div 
                              className="absolute bottom-0 left-1/2 -translate-x-1/2"
                              style={{
                                width: 0,
                                height: 0,
                                borderLeft: `${Math.max(1, widthPx * 0.06)}px solid transparent`,
                                borderRight: `${Math.max(1, widthPx * 0.06)}px solid transparent`,
                                borderTop: `${Math.max(4, widthPx * 0.15)}px solid rgba(255,255,255,0.3)`
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Crystal chips settled at bottom */}
                        <div 
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-[2px]"
                          style={{ width: `${widthPx * 0.8}px` }}
                        >
                          {Array.from({ length: Math.min(chipCount, 8) }).map((_, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                'rounded-sm',
                                isSelected ? 'bg-[#c9a227]' : 'bg-[#a69b8a]/60'
                              )}
                              style={{ 
                                width: `${Math.max(3, widthPx * 0.12)}px`,
                                height: `${Math.max(2, widthPx * 0.08)}px`
                              }}
                            />
                          ))}
                          {chipCount > 8 && (
                            <span className={cn('text-[5px] leading-none', isSelected ? 'text-[#c9a227]' : 'text-[#a69b8a]')}>+</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Size Label */}
                    <span className={cn(
                      'text-xs font-medium transition-colors',
                      isSelected ? 'text-[#c9a227]' : 'text-[#a69b8a] group-hover:text-[#f5f3ef]'
                    )}>
                      {size}ml
                    </span>
                    
                    {/* Chip count */}
                    <span className="text-[10px] text-[#a69b8a]/60">{chipCount} chips</span>

                    <ComponentStockBadge category="bottle" id={`${size}ml`} size="sm" />
                  </button>
                </Tooltip>
              )
            })}
          </div>
          
          <p className="text-xs text-[#8B5CF6] mt-2 flex items-center gap-1">
            <Wine className="w-3 h-3" />
            Handcrafted in Miron Violet Glass
          </p>
          <p className="text-xs text-[#a69b8a]/70 mt-1">
            Includes {CRYSTAL_COUNTS[`${bottleSize}ml`] || Math.round(bottleSize * 0.4)} pre-drilled crystal chips imbued in your oil for jewellery crafting
          </p>
        </div>
        
        {mode === 'carrier' && (
          <div className="flex-1">
            {/* Visual Dilution Chamber */}
            <div className="relative bg-[#0a080c] rounded-2xl border border-[#f5f3ef]/10 p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[#a69b8a]">Essential Oil Strength</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-light text-[#c9a227]">{carrierRatio}%</span>
                  <span className="text-xs text-[#a69b8a]/60 uppercase tracking-wider">{RATIO_GUIDANCE[carrierRatio].label}</span>
                </div>
              </div>
              
              {/* Visual Cylinder */}
              <div className="relative h-32 flex gap-4">
                {/* The Cylinder */}
                <div className="relative w-16 h-full mx-auto">
                  {/* Glass tube */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#f5f3ef]/20 bg-gradient-to-r from-[#f5f3ef]/5 to-transparent overflow-hidden">
                    {/* Measurement ticks */}
                    {[0, 25, 50, 75, 100].map(tick => (
                      <div 
                        key={tick}
                        className="absolute left-0 right-0 border-t border-[#f5f3ef]/10"
                        style={{ bottom: `${tick}%` }}
                      >
                        <span className="absolute -right-6 text-[8px] text-[#a69b8a]/40">{tick}%</span>
                      </div>
                    ))}
                    
                    {/* Essential Oil Layer (top) */}
                    <motion.div 
                      className="absolute left-0 right-0 bg-gradient-to-b from-amber-600/90 to-amber-700/80"
                      initial={false}
                      animate={{ 
                        top: `${100 - carrierRatio}%`,
                        bottom: 0
                      }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {/* Oil shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-pulse" />
                    </motion.div>
                    
                    {/* Carrier Oil Layer (bottom) */}
                    <motion.div 
                      className="absolute left-0 right-0 bg-gradient-to-b from-[#d4a574]/60 to-[#c49a6c]/70"
                      initial={false}
                      animate={{ 
                        top: '0%',
                        bottom: `${carrierRatio}%`
                      }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    />
                    
                    {/* Interface line */}
                    <motion.div 
                      className="absolute left-0 right-0 h-0.5 bg-[#f5f3ef]/30 shadow-[0_0_8px_rgba(245,243,239,0.3)]"
                      initial={false}
                      animate={{ bottom: `${carrierRatio}%` }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  
                  {/* Cylinder cap */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full bg-[#f5f3ef]/10 border border-[#f5f3ef]/20" />
                </div>
                
                {/* Legend */}
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-600 to-amber-700" />
                    <span className="text-xs text-[#a69b8a]">Essential Oil</span>
                    <span className="text-xs text-[#c9a227] font-medium">{carrierRatio}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-[#d4a574] to-[#c49a6c]" />
                    <span className="text-xs text-[#a69b8a]">Carrier Oil</span>
                    <span className="text-xs text-[#f5f3ef]/70">{100 - carrierRatio}%</span>
                  </div>
                  <p className="text-[11px] text-[#a69b8a]/60 leading-relaxed mt-1">
                    {RATIO_GUIDANCE[carrierRatio].description}
                  </p>
                </div>
              </div>
              
              {/* Strength Selector with Info */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex-1 flex gap-1">
                  {CARRIER_RATIOS.map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => onCarrierRatioChange(ratio)}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
                        carrierRatio === ratio
                          ? 'bg-[#c9a227] text-[#0a080c]'
                          : 'bg-[#f5f3ef]/5 text-[#a69b8a] hover:bg-[#f5f3ef]/10'
                      )}
                    >
                    {ratio}%
                  </button>
                ))}
                </div>
                <StrengthInfoButton ratio={carrierRatio} />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 rounded-xl bg-[#0a080c]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#a69b8a]">Essential Oil Capacity</span>
          <span className="text-[#f5f3ef] font-medium">{currentEssentialOilMl.toFixed(getMlDecimals(mode))} / {maxEssentialOilMl.toFixed(getMlDecimals(mode))} ml</span>
        </div>
        {mode === 'carrier' && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-[#a69b8a]">Carrier Oil</span>
            <span className="text-[#f5f3ef] font-medium">{carrierOilMl.toFixed(getMlDecimals(mode))} ml</span>
          </div>
        )}
        <div className="h-2 rounded-full bg-[#f5f3ef]/10 mt-3 overflow-hidden">
          <motion.div 
            className={cn(
              'h-full rounded-full',
              isOverfilled ? 'bg-red-500' : isBottleComplete ? 'bg-[#2ecc71]' : 'bg-[#c9a227]'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((currentEssentialOilMl / maxEssentialOilMl) * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}
