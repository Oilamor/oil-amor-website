'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Beaker, Droplets, Check, AlertTriangle } from 'lucide-react'
import { formatPrice } from '@/lib/content/pricing-engine-final'
import type { ScaledRefill, NormalizedRecipe } from '@/lib/refill/recipe-scaling'
import { scaleToRefill, generateRefillBreakdown, validateScaledRecipe } from '@/lib/refill/recipe-scaling'

interface ScaledRefillCardProps {
  recipeName: string
  normalizedRecipe: NormalizedRecipe
  originalSize: number
  onAddToCart: (size: 50 | 100, scaled: ScaledRefill) => void
}

export function ScaledRefillCard({ 
  recipeName, 
  normalizedRecipe, 
  originalSize,
  onAddToCart 
}: ScaledRefillCardProps) {
  const [selectedSize, setSelectedSize] = useState<50 | 100 | null>(null)
  
  // Scale to both sizes
  const scaled50 = scaleToRefill(normalizedRecipe, 50)
  const scaled100 = scaleToRefill(normalizedRecipe, 100)
  
  const scaled = selectedSize === 50 ? scaled50 : selectedSize === 100 ? scaled100 : null
  const breakdown = scaled ? generateRefillBreakdown(scaled) : null
  const validation = scaled ? validateScaledRecipe(scaled) : null
  
  const isCarrier = normalizedRecipe.mode === 'carrier'
  
  return (
    <div className="bg-[#0a080c] border border-[#f5f3ef]/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#f5f3ef]/10">
        <h3 className="font-serif text-xl text-[#f5f3ef] mb-2">{recipeName}</h3>
        <p className="text-sm text-[#a69b8a]">
          Original: {originalSize}ml {isCarrier ? 'carrier dilution' : 'pure blend'} • 
          {' '}{normalizedRecipe.oils.length} oils
        </p>
      </div>
      
      {/* Size Selection */}
      <div className="p-6 grid grid-cols-2 gap-4">
        {/* 50ml Option */}
        <button
          onClick={() => setSelectedSize(50)}
          className={`p-4 rounded-xl border transition-all text-left ${
            selectedSize === 50
              ? 'border-[#c9a227] bg-[#c9a227]/10'
              : 'border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#f5f3ef] font-medium">50ml Refill</span>
            {selectedSize === 50 && <Check className="w-5 h-5 text-[#c9a227]" />}
          </div>
          <p className="text-2xl font-display text-[#c9a227]">
            {formatPrice(scaled50.estimatedPrice / 100)}
          </p>
          <p className="text-xs text-[#a69b8a] mt-1">
            {isCarrier 
              ? `${scaled50.totalEssentialOilMl}ml oils + ${scaled50.carrierOilMl}ml carrier`
              : '100% essential oils'
            }
          </p>
        </button>
        
        {/* 100ml Option */}
        <button
          onClick={() => setSelectedSize(100)}
          className={`p-4 rounded-xl border transition-all text-left ${
            selectedSize === 100
              ? 'border-[#c9a227] bg-[#c9a227]/10'
              : 'border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#f5f3ef] font-medium">100ml Refill</span>
            {selectedSize === 100 && <Check className="w-5 h-5 text-[#c9a227]" />}
          </div>
          <p className="text-2xl font-display text-[#c9a227]">
            {formatPrice(scaled100.estimatedPrice / 100)}
          </p>
          <p className="text-xs text-[#a69b8a] mt-1">
            {isCarrier 
              ? `${scaled100.totalEssentialOilMl}ml oils + ${scaled100.carrierOilMl}ml carrier`
              : '100% essential oils'
            }
          </p>
        </button>
      </div>
      
      {/* Formula Breakdown */}
      {scaled && breakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-6 pb-6"
        >
          <div className="p-4 rounded-xl bg-[#f5f3ef]/5 border border-[#f5f3ef]/10">
            <h4 className="text-sm font-medium text-[#f5f3ef] mb-3 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-[#c9a227]" />
              Exact Formula
            </h4>
            
            {/* Formula String */}
            <p className="text-xs text-[#a69b8a] mb-3 font-mono">
              {scaled.formula}
            </p>
            
            {/* Ingredients Table */}
            <div className="space-y-2">
              {breakdown.ingredients.map((ingredient, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-[#f5f3ef]/5 last:border-0"
                >
                  <span className="text-sm text-[#f5f3ef]">{ingredient.name}</span>
                  <div className="text-right">
                    <span className="text-sm text-[#c9a227] font-medium">{ingredient.amount}</span>
                    <span className="text-xs text-[#a69b8a] ml-2">({ingredient.percentage})</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total */}
            <div className="mt-3 pt-3 border-t border-[#f5f3ef]/10 flex items-center justify-between">
              <span className="text-sm text-[#a69b8a]">Total Volume</span>
              <span className="text-sm font-medium text-[#f5f3ef]">{breakdown.total}</span>
            </div>
            
            {/* Warnings */}
            {validation && validation.warnings.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-200/80">
                    {validation.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Add to Cart Button */}
          <button
            onClick={() => selectedSize && onAddToCart(selectedSize, scaled)}
            className="w-full mt-4 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors flex items-center justify-center gap-2"
          >
            <Droplets className="w-4 h-4" />
            Add {selectedSize}ml Refill to Cart
          </button>
        </motion.div>
      )}
    </div>
  )
}
