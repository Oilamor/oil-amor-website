'use client'

// ============================================================================
// COMPONENT: Oil Amount Control with Editable Input and Hold-to-Adjust
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { BlendMode, formatDrops, getMlDecimals, getMlPrecision } from '../atelier-utils'

export function OilAmountControl({
  oilId,
  ml,
  onAdjust,
  currentEssentialOilMl,
  maxEssentialOilMl,
  bottleSize,
  mode,
}: {
  oilId: string
  ml: number
  onAdjust: (oilId: string, delta: number) => void
  currentEssentialOilMl: number
  maxEssentialOilMl: number
  bottleSize: number
  mode: BlendMode
}) {
  const precision = getMlPrecision(mode)
  const decimals = getMlDecimals(mode)
  
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(ml.toFixed(decimals))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Use refs to track current values for closure-stale fix
  const currentMlRef = useRef(currentEssentialOilMl)
  const maxMlRef = useRef(maxEssentialOilMl)
  
  // Keep refs updated with latest props
  useEffect(() => {
    currentMlRef.current = currentEssentialOilMl
    maxMlRef.current = maxEssentialOilMl
  }, [currentEssentialOilMl, maxEssentialOilMl])
  
  useEffect(() => {
    setEditValue(ml.toFixed(decimals))
  }, [ml, decimals])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  
  const handleStartDecrement = () => {
    onAdjust(oilId, -precision)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onAdjust(oilId, -precision)
      }, 100)
    }, 400)
  }
  
  const handleStartIncrement = () => {
    // Check using ref for current value
    if (currentMlRef.current >= maxMlRef.current) return
    onAdjust(oilId, precision)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        // Use refs to get current values (not stale closure)
        if (currentMlRef.current < maxMlRef.current) {
          onAdjust(oilId, precision)
        } else {
          // Stop interval when at capacity
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, 100)
    }, 400)
  }
  
  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }
  
  const handleInputSubmit = () => {
    const newValue = parseFloat(editValue)
    if (!isNaN(newValue) && newValue >= precision && newValue <= bottleSize) {
      const delta = newValue - ml
      const newTotal = currentEssentialOilMl + delta
      if (newTotal <= maxEssentialOilMl) {
        onAdjust(oilId, delta)
      } else {
        // If would exceed max, set to max allowed for this oil
        const maxForThisOil = ml + (maxEssentialOilMl - currentEssentialOilMl)
        onAdjust(oilId, maxForThisOil - ml)
      }
    }
    setIsEditing(false)
    setEditValue(ml.toFixed(decimals))
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(ml.toFixed(decimals))
    }
  }
  
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <button
          onMouseDown={handleStartDecrement}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          onTouchStart={(e) => { e.preventDefault(); handleStartDecrement() }}
          onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
          className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors active:scale-95 select-none"
        >
          <Minus className="w-3 h-3" />
        </button>
        
        <div className="w-16 text-center">
          {isEditing ? (
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleInputSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
              step={precision}
              min={precision}
              max={bottleSize}
              className="w-full px-1 py-0.5 text-sm font-medium text-[#f5f3ef] bg-[#111] border border-[#c9a227] rounded text-center focus:outline-none focus:ring-1 focus:ring-[#c9a227]"
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-1 py-0.5 text-sm font-medium text-[#f5f3ef] hover:bg-[#f5f3ef]/10 rounded transition-colors"
              title="Click to edit"
            >
              {ml.toFixed(decimals)}
              <span className="text-xs text-[#a69b8a] ml-0.5">ml</span>
            </button>
          )}
        </div>
        
        <button
          onMouseDown={handleStartIncrement}
          onMouseUp={handleStop}
          onMouseLeave={handleStop}
          onTouchStart={(e) => { e.preventDefault(); handleStartIncrement() }}
          onTouchEnd={(e) => { e.preventDefault(); handleStop() }}
          disabled={currentEssentialOilMl >= maxEssentialOilMl}
          className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors disabled:opacity-50 active:scale-95 select-none"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <span className="text-[10px] text-[#a69b8a]/70 leading-none">
        {formatDrops(ml)}
      </span>
    </div>
  )
}
