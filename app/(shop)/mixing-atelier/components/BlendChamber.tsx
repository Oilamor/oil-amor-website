'use client'

// ============================================================================
// COMPONENT: Revolutionary Blend Chamber with Real-time Pouring Animation
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Droplets, FlaskConical, RotateCcw, X } from 'lucide-react'
import { ATELIER_OILS } from '@/lib/atelier/atelier-engine'
import { cn } from '@/lib/utils'
import { BlendMode, formatDrops, getMlDecimals } from '../atelier-utils'
import { OilAmountControl } from './OilAmountControl'
import { BottleVisual, type BottleLayer } from './BottleVisual'

export function BlendChamber({
  selectedOils,
  bottleSize,
  mode,
  carrierRatio,
  carrierOilName,
  onAdjustOil,
  onRemoveOil,
  maxEssentialOilMl,
  currentEssentialOilMl,
  isBottleComplete,
}: {
  selectedOils: { oilId: string; ml: number }[]
  bottleSize: number
  mode: BlendMode
  carrierRatio: number
  carrierOilName?: string
  onAdjustOil: (oilId: string, delta: number) => void
  onRemoveOil: (oilId: string) => void
  maxEssentialOilMl: number
  currentEssentialOilMl: number
  isBottleComplete: boolean
}) {
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null)
  const [pourAnimation, setPourAnimation] = useState<{ oilId: string; color: string } | null>(null)
  
  // Track when oils are added for animation
  const prevOilsRef = useRef<string[]>([])
  
  useEffect(() => {
    const currentOilIds = selectedOils.map(o => o.oilId)
    const newOilId = currentOilIds.find(id => !prevOilsRef.current.includes(id))
    
    if (newOilId) {
      const oil = ATELIER_OILS.find(o => o.id === newOilId)
      if (oil) {
        setRecentlyAdded(newOilId)
        setPourAnimation({ oilId: newOilId, color: oil.color })
        
        // Clear animations after they complete
        setTimeout(() => setPourAnimation(null), 1500)
        setTimeout(() => setRecentlyAdded(null), 3000)
      }
    }
    
    prevOilsRef.current = currentOilIds
  }, [selectedOils])
  
  // Deduplicate selected oils to prevent duplicate key errors
  const uniqueSelectedOils = useMemo(() => {
    const seen = new Set<string>()
    return selectedOils.filter(oil => {
      if (seen.has(oil.oilId)) return false
      seen.add(oil.oilId)
      return true
    })
  }, [selectedOils])

  // Calculate oil layers for the chamber - fills from BOTTOM to TOP
  const oilLayers = useMemo(() => {
    if (uniqueSelectedOils.length === 0) return []
    
    // Calculate cumulative heights from bottom
    let cumulativeHeight = 0
    const layersWithHeights = uniqueSelectedOils.map(oil => {
      const oilInfo = ATELIER_OILS.find(o => o.id === oil.oilId)
      const height = (oil.ml / bottleSize) * 100
      const layer = {
        ...oil,
        name: oilInfo?.name || oil.oilId,
        color: oilInfo?.color || '#888888',
        height,
        isNew: recentlyAdded === oil.oilId
      }
      cumulativeHeight += height
      return layer
    })
    
    // Now position from bottom up (reverse order for rendering)
    let currentBottom = 0
    return layersWithHeights.slice().reverse().map(layer => {
      const positionedLayer = {
        ...layer,
        bottom: currentBottom,
      }
      currentBottom += layer.height
      return positionedLayer
    }).reverse() // Reverse back to maintain z-order (first added at bottom)
  }, [uniqueSelectedOils, bottleSize, recentlyAdded])
  
  // Calculate carrier layer
  const carrierHeight = mode === 'carrier'
    ? ((bottleSize - currentEssentialOilMl) / bottleSize) * 100
    : 0

  // Combined layers for the bottle visual: carrier at the bottom, oils stacked above
  const visualLayers = useMemo<BottleLayer[]>(() => {
    const shift = mode === 'carrier' ? carrierHeight : 0
    const carrier: BottleLayer[] =
      mode === 'carrier' && carrierHeight > 0
        ? [{
            oilId: '__carrier',
            color: '#e8dcc0',
            ml: bottleSize - currentEssentialOilMl,
            bottom: 0,
            height: carrierHeight,
          }]
        : []
    return [...carrier, ...oilLayers.map((l) => ({ ...l, bottom: l.bottom + shift }))]
  }, [oilLayers, carrierHeight, mode, bottleSize, currentEssentialOilMl])
  
  if (selectedOils.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-gradient-to-b from-[#1a1a2e] to-[#0a080c] border border-[#f5f3ef]/10 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#c9a227]/5 blur-3xl rounded-full" />
        
        <div className="relative text-center py-8">
          {/* Real MIRON bottle — empty */}
          <div className="mx-auto mb-6 w-fit">
            <BottleVisual bottleSize={bottleSize} mode={mode} layers={[]} empty />
          </div>

          <h3 className="text-xl font-serif text-[#f5f3ef] mb-2">The Blend Chamber</h3>
          <p className="text-sm text-[#a69b8a] max-w-xs mx-auto">
            Add oils from below to see them blend in real-time
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#a69b8a]/60">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#c9a227]" />
              {mode === 'carrier' ? 'from 0.01ml per addition' : 'from 0.1ml per addition'}
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {maxEssentialOilMl}ml capacity
            </span>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-[#1a1a2e] to-[#0a080c] border border-[#c9a227]/30 relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#c9a227]/10 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a227]/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[#c9a227]" />
          </div>
          <div>
            <h3 className="text-lg font-serif text-[#f5f3ef]">Blend Chamber</h3>
            <p className="text-xs text-[#a69b8a]">
              {selectedOils.length} oil{selectedOils.length !== 1 ? 's' : ''} • {currentEssentialOilMl.toFixed(getMlDecimals(mode))}ml / {maxEssentialOilMl}ml
            </p>
          </div>
        </div>
        
        {isBottleComplete && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-3 py-1.5 rounded-full bg-[#2ecc71]/20 border border-[#2ecc71]/40"
          >
            <span className="text-xs text-[#2ecc71] font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Complete
            </span>
          </motion.div>
        )}
      </div>
      
      <div className="relative flex gap-6">
        {/* The Chamber — real MIRON bottle with the blend inside */}
        <div className="relative flex-shrink-0">
          {/* Pouring animation overlay */}
          <AnimatePresence>
            {pourAnimation && (
              <motion.div
                initial={{ y: -40, opacity: 1, height: 0 }}
                animate={{ y: 0, opacity: 1, height: 60 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.8, ease: "easeIn" }}
                className="absolute left-1/2 -translate-x-1/2 w-4 rounded-full z-30"
                style={{ backgroundColor: pourAnimation.color, top: -20 }}
              />
            )}
          </AnimatePresence>

          <BottleVisual bottleSize={bottleSize} mode={mode} layers={visualLayers} />

          {/* Fill level indicator */}
          <div
            className="absolute left-[8%] right-[8%] h-px bg-[#c9a227]/50 z-30 pointer-events-none"
            style={{ bottom: `${12 + (currentEssentialOilMl / bottleSize) * 76}%` }}
          >
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[#c9a227]" />
          </div>
        </div>
        
        {/* Oil Controls Panel */}
        <div className="flex-1 space-y-2 max-h-64 overflow-y-auto pr-1">
          {uniqueSelectedOils.map((oil) => {
            const oilInfo = ATELIER_OILS.find(o => o.id === oil.oilId)
            const percentage = ((oil.ml / bottleSize) * 100).toFixed(1)
            const isNew = recentlyAdded === oil.oilId
            
            return (
              <motion.div
                key={oil.oilId}
                layout
                initial={isNew ? { x: -20, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  isNew 
                    ? "bg-[#c9a227]/10 border-[#c9a227]/50 shadow-lg shadow-[#c9a227]/10" 
                    : "bg-[#0a080c]/60 border-[#f5f3ef]/10 hover:border-[#f5f3ef]/20"
                )}
              >
                {/* Color indicator */}
                <motion.div 
                  animate={isNew ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-lg border border-white/20 flex-shrink-0 relative overflow-hidden"
                  style={{ backgroundColor: oilInfo?.color || '#666' }}
                >
                  {isNew && (
                    <motion.div
                      initial={{ y: '-100%' }}
                      animate={{ y: '100%' }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-white/40"
                    />
                  )}
                </motion.div>
                
                {/* Oil info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f5f3ef] truncate">{oilInfo?.name}</p>
                  <p className="text-xs text-[#a69b8a]">{percentage}% · {formatDrops(oil.ml)}</p>
                </div>
                
                {/* Amount controls with editable input and hold-to-adjust */}
                <OilAmountControl
                  oilId={oil.oilId}
                  ml={oil.ml}
                  onAdjust={onAdjustOil}
                  currentEssentialOilMl={currentEssentialOilMl}
                  maxEssentialOilMl={maxEssentialOilMl}
                  bottleSize={bottleSize}
                  mode={mode}
                />
                
                {/* Remove button */}
                <button
                  onClick={() => onRemoveOil(oil.oilId)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )
          })}
          
          {/* Capacity indicator */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-[#a69b8a] mb-1">
              <span>Chamber Capacity</span>
              <span>{((currentEssentialOilMl / maxEssentialOilMl) * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#0a080c] border border-[#f5f3ef]/10 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isBottleComplete ? "bg-[#2ecc71]" : "bg-gradient-to-r from-[#c9a227] to-[#f5d547]"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${(currentEssentialOilMl / maxEssentialOilMl) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      {selectedOils.length > 0 && (
        <div className="relative mt-4 pt-4 border-t border-[#f5f3ef]/10 flex items-center justify-between">
          <button
            onClick={() => selectedOils.forEach(o => onRemoveOil(o.oilId))}
            className="flex items-center gap-1.5 text-xs text-[#a69b8a] hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All
          </button>
          
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#a69b8a]">
              Total: <span className="text-[#f5f3ef] font-medium">{currentEssentialOilMl.toFixed(getMlDecimals(mode))}ml</span>
            </span>
            {mode === 'carrier' && (
              <span className="text-[#a69b8a]">
                Carrier: <span className="text-[#f5e6c8] font-medium">{(bottleSize - currentEssentialOilMl).toFixed(getMlDecimals(mode))}ml</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
