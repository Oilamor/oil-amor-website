'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Minus, Plus, Check, Gem, AlertCircle, Loader2 } from 'lucide-react'
import { useCart } from '@/app/hooks/use-cart'
import type { CrystalPairing } from '@/lib/content/oil-crystal-synergies'
import type { BottleSize } from '@/lib/content/product-config'
import { formatPrice } from '@/lib/content/pricing-engine-final'
import { CRYSTALS_AND_CORDS_AVAILABLE } from '@/lib/content/launch-pricing'

interface AddToCartSectionProps {
  variant: {
    id: string
    price: number
    size: string
    type: string
    carrier?: string
    ratio?: string
  }
  title: string
  selectedCrystal?: CrystalPairing
  selectedCord?: { id: string; name: string; price: number }
  selectedSize: BottleSize
  breakdown?: any
  isValid?: boolean
  validationMessage?: string
  image?: string
  oilId?: string
}

export function AddToCartSection({
  variant,
  title,
  selectedCrystal,
  selectedCord,
  selectedSize,
  breakdown,
  isValid = true,
  validationMessage,
  image,
  oilId,
}: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { addItem } = useCart()

  const handleAddToCart = async () => {
    if (!isValid) return
    
    // Build detailed configuration
    const config: any = {
      bottleSize: variant.size,
      bottleSizeId: selectedSize.id,
      bottleVolume: selectedSize.volume,
      // crystals/cords unavailable during launch — pure oil only
      crystalChips: CRYSTALS_AND_CORDS_AVAILABLE ? selectedSize.crystalChips : 0,
      type: variant.type,
      cord: CRYSTALS_AND_CORDS_AVAILABLE ? selectedCord?.name : undefined,
      cordId: CRYSTALS_AND_CORDS_AVAILABLE ? selectedCord?.id : undefined,
    }
    
    // Add crystal info
    if (selectedCrystal) {
      config.crystalName = selectedCrystal.name
      config.crystalId = selectedCrystal.id
      config.crystalChakra = selectedCrystal.chakra
      config.crystalElement = selectedCrystal.element
      config.crystals = [selectedCrystal.name]
    }
    
    // Add carrier/ratio info for carrier blends
    if (variant.type === 'carrier') {
      config.carrierOil = variant.carrier
      config.ratio = variant.ratio
      config.isCarrierBlend = true
    } else {
      config.isPure = true
    }
    
    setIsAdding(true)
    try {
      await addItem({
        productId: oilId || variant.id,
        variantId: variant.id,
        quantity,
        configuration: config,
        properties: {
          name: title,
          price: String(variant.price),
          image: image || '',
          oilId: oilId || '',
          size: variant.size,
          type: variant.type,
          carrier: variant.carrier || '',
          ratio: variant.ratio || '',
          crystalName: selectedCrystal?.name || '',
          crystalChakra: selectedCrystal?.chakra || '',
          cordName: selectedCord?.name || '',
        },
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {
      // Error is handled by the cart hook (sets store.error and logs it)
    } finally {
      setIsAdding(false)
    }
  }

  const increment = () => setQuantity((q) => Math.min(q + 1, 10))
  const decrement = () => setQuantity((q) => Math.max(q - 1, 1))

  return (
    <div className="space-y-4">
      {/* Price Display */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-light text-[#c9a227]">
          {formatPrice(variant.price)}
        </span>
        <span className="text-[#a69b8a] text-sm">AUD</span>

      </div>

      {/* Quantity + Selection Row */}
      <div className="flex items-center gap-4">
        {/* Quantity Selector */}
        <div className="flex items-center gap-1 bg-[#111] rounded-lg p-1 border border-[#f5f3ef]/10">
          <button
            onClick={decrement}
            disabled={quantity <= 1}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#f5f3ef] 
                     hover:bg-[#f5f3ef]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center text-[#f5f3ef] font-medium">{quantity}</span>
          <button
            onClick={increment}
            disabled={quantity >= 10}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#f5f3ef] 
                     hover:bg-[#f5f3ef]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Selection Confirmation Badges */}
        <div className="flex-1 flex flex-wrap gap-2">
          {/* Crystal Badge */}
          {selectedCrystal ? (
            <motion.div
              key={selectedCrystal.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#c9a227]/10 border border-[#c9a227]/30"
            >
              <Gem className="w-4 h-4 text-[#c9a227]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#a69b8a] uppercase tracking-wider">Crystal</span>
                <span className="text-xs text-[#f5f3ef] font-medium">{selectedCrystal.name}</span>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-red-400 uppercase tracking-wider">Required</span>
                <span className="text-xs text-red-300 font-medium">Select a crystal</span>
              </div>
            </div>
          )}
          
          {/* Size Badge */}
          <motion.div
            key={selectedSize.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#f5f3ef]/10"
          >
            <div className="flex flex-col">
              <span className="text-[10px] text-[#a69b8a] uppercase tracking-wider">Size</span>
              <span className="text-xs text-[#f5f3ef] font-medium">{selectedSize.volume}ml</span>
            </div>
          </motion.div>
          
          {/* Crystal Chips Badge — hidden while crystals are unavailable */}
          {CRYSTALS_AND_CORDS_AVAILABLE && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#f5f3ef]/10">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#a69b8a] uppercase tracking-wider">Crystals</span>
                <span className="text-xs text-[#f5f3ef] font-medium">{selectedSize.crystalChips} chips</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to Cart Button */}
      <motion.button
        onClick={handleAddToCart}
        disabled={added || !isValid || isAdding}
        className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
          added
            ? 'bg-[#2ecc71] text-white'
            : isValid && !isAdding
              ? 'bg-[#c9a227] text-[#0a080c] hover:bg-[#f5f3ef]'
              : 'bg-[#f5f3ef]/10 text-[#a69b8a] cursor-not-allowed'
        }`}
        whileTap={{ scale: isValid && !isAdding ? 0.98 : 1 }}
      >
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.span
              key="adding"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Adding...
            </motion.span>
          ) : added ? (
            <motion.span
              key="added"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Added to Cart
            </motion.span>
          ) : !isValid ? (
            <motion.span
              key="invalid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              {validationMessage || 'Complete all selections'}
            </motion.span>
          ) : (
            <motion.span
              key="add"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Cart — {formatPrice(variant.price * quantity)}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Shipping Notice */}
      <p className="text-center text-[#a69b8a] text-xs">
        Free shipping on orders over $75
      </p>
    </div>
  )
}
