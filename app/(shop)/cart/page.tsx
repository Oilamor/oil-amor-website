'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Minus, 
  Plus, 
  Trash2, 
  ArrowRight,
  Sparkles,
  Beaker,
  Gem,
  Scroll,
  Crown,
  Shield,
  Truck,
  Lock,
  Droplets,
  Thermometer,
  Info
} from 'lucide-react'
import { formatPrice } from '@/lib/content/pricing-engine-final'
import { useCart } from '@/app/hooks/use-cart'
import { cn } from '@/lib/utils'
import { ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'
import { SIMPLE_CORD_OPTIONS } from '@/lib/atelier/cord-data-simple'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@radix-ui/react-tooltip'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// COMPONENT: Atelier Blend Detail Modal
// ============================================================================
function AtelierDetailModal({ 
  isOpen, 
  onClose, 
  item 
}: { 
  isOpen: boolean
  onClose: () => void
  item: any
}) {
  const customMix = item.customMix || {}
  const configuration = item.configuration || {}
  
  const crystalId = customMix.crystalId || configuration?.crystals?.[0]
  const crystal = crystalId 
    ? ATELIER_CRYSTALS.find(c => c.id === crystalId)
    : null
  
  const cordId = item.attachment?.cordId || customMix.cordId || configuration?.cord
  const cord = cordId
    ? SIMPLE_CORD_OPTIONS.find(c => c.id === cordId)
    : null
  
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-[#0a080c] border border-[#f5f3ef]/10 rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#c9a227]/10 flex items-center justify-center">
            <Beaker className="w-6 h-6 text-[#c9a227]" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-[#f5f3ef]">{item.name}</h3>
            <p className="text-sm text-[#a69b8a]">Custom Atelier Blend</p>
          </div>
        </div>

        {/* Oil Composition */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[#f5e6c8] mb-3 flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            Oil Composition
          </h4>
          <div className="space-y-2">
            {customMix.oils?.map((oil: any, idx: number) => {
              // Calculate ml from drops (20 drops = 1ml)
              const ml = oil.drops ? oil.drops / 20 : oil.ml || 0
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#111]"
                >
                  <span className="text-[#f5f3ef]">{oil.oilName || oil.name}</span>
                  <span className="text-[#c9a227] font-medium">{ml.toFixed(2)}ml</span>
                </div>
              )
            })}
          </div>
          {customMix.carrierRatio && (
            <div className="mt-3 p-3 rounded-lg bg-[#c9a227]/5 border border-[#c9a227]/20">
              <div className="flex items-center gap-2 text-sm text-[#a69b8a]">
                <Thermometer className="w-4 h-4" />
                Carrier Ratio: {customMix.carrierRatio}%
              </div>
              <p className="text-xs text-[#a69b8a]/70 mt-1">
                {customMix.carrierRatio < 5 ? 'Pure essential oil blend' : 
                 customMix.carrierRatio < 20 ? 'Therapeutic strength' :
                 customMix.carrierRatio < 50 ? 'Balanced dilution' : 'Gentle application'}
              </p>
            </div>
          )}
        </div>

        {/* Crystal */}
        {crystal && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[#f5e6c8] mb-3 flex items-center gap-2">
              <Gem className="w-4 h-4" />
              Crystal Infusion
            </h4>
            <div className="p-4 rounded-lg bg-[#111] flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#c9a227]/10 flex items-center justify-center">
                <Gem className="w-6 h-6 text-[#c9a227]" />
              </div>
              <div>
                <p className="text-[#f5f3ef] font-medium">{crystal.name}</p>
                <p className="text-xs text-[#a69b8a]">{crystal.description}</p>
                <div className="flex gap-2 mt-1">
                  {crystal.properties.slice(0, 3).map((prop: string, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a]">
                      {prop}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cord */}
        {cord && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[#f5e6c8] mb-3 flex items-center gap-2">
              <Scroll className="w-4 h-4" />
              Cord Talisman
            </h4>
            <div className="p-4 rounded-lg bg-[#111] flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: cord.colorCode + '20' }}
              >
                <div 
                  className="w-6 h-6 rounded-full border-2"
                  style={{ backgroundColor: cord.colorCode, borderColor: cord.colorCode }}
                />
              </div>
              <div>
                <p className="text-[#f5f3ef] font-medium">{cord.name}</p>
                <p className="text-xs text-[#a69b8a]">{cord.description}</p>
                {cord.energy && (
                  <p className="text-xs text-[#c9a227] mt-1">{cord.energy}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottle Info */}
        <div className="p-4 rounded-lg bg-[#111] mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#a69b8a]">Bottle Size</span>
            <span className="text-[#f5f3ef]">{customMix.totalVolume || configuration.bottleSize || '10ml'}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-[#a69b8a]">Safety Score</span>
            <span className={cn(
              "font-medium",
              customMix.safetyScore >= 4 ? "text-[#2ecc71]" :
              customMix.safetyScore >= 3 ? "text-[#c9a227]" : "text-[#e74c3c]"
            )}>
              {customMix.safetyScore?.toFixed(1) || 'N/A'}/5
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#f5f3ef]/5 hover:bg-[#f5f3ef]/10 text-[#f5f3ef] transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// COMPONENT: Cart Item
// ============================================================================
function CartItemCard({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}: { 
  item: any
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  
  const customMix = item.customMix || {}
  const configuration = item.configuration || {}
  
  // Check if this is an atelier blend
  const isAtelierBlend = customMix.oils?.length > 0 || (configuration.oils?.length > 0)
  
  // Crystal can be in customMix.crystalId or configuration.crystals array
  const crystalId = customMix.crystalId || configuration?.crystals?.[0]
  const crystal = crystalId 
    ? ATELIER_CRYSTALS.find(c => c.id === crystalId)
    : null
  
  // Cord can be in attachment (OrderAttachment), customMix.cordId, or configuration.cord
  const cordId = item.attachment?.cordId || customMix.cordId || configuration?.cord
  const cord = cordId
    ? SIMPLE_CORD_OPTIONS.find(c => c.id === cordId)
    : null

  const handleRemove = async () => {
    setIsRemoving(true)
    // Wait for animation then remove
    setTimeout(async () => {
      try {
        await onRemove(item.id)
      } catch (error) {
        logger.error('[CartItemCard] Remove failed', error instanceof Error ? error : new Error(String(error)))
        setIsRemoving(false) // Reset if failed
      }
    }, 300)
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isRemoving ? 0 : 1, y: isRemoving ? -20 : 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={cn(
          "group p-4 rounded-2xl border transition-all",
          isAtelierBlend 
            ? "bg-[#c9a227]/5 border-[#c9a227]/20 hover:border-[#c9a227]/40"
            : "bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/20"
        )}
      >
        <div className="flex gap-4">
          {/* Product Image/Icon */}
          <div className={cn(
            "w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0",
            isAtelierBlend ? "bg-[#c9a227]/10" : "bg-[#111]"
          )}>
            {isAtelierBlend ? (
              <Beaker className="w-8 h-8 text-[#c9a227]" />
            ) : item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Sparkles className="w-8 h-8 text-[#a69b8a]" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={cn(
                  "font-medium truncate pr-2",
                  isAtelierBlend ? "text-[#f5e6c8]" : "text-[#f5f3ef]"
                )}>
                  {item.name}
                </h3>
                <p className="text-sm text-[#a69b8a] mt-0.5">
                  {isAtelierBlend ? 'Custom Atelier Blend' : item.description}
                </p>
              </div>
              <p className={cn(
                "font-medium whitespace-nowrap",
                isAtelierBlend ? "text-[#c9a227]" : "text-[#f5f3ef]"
              )}>
                {formatPrice(item.unitPrice * item.quantity)}
              </p>
            </div>

            {/* Oil Product Details (Non-Atelier) */}
            {!isAtelierBlend && (
              <div className="mt-3">
                {/* Product Configuration Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {/* Bottle Size */}
                  {configuration.bottleSize && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      <Beaker className="w-3 h-3" />
                      {configuration.bottleSize}
                    </span>
                  )}
                  
                  {/* Crystal Chips Count */}
                  {configuration.crystalChips && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      <Gem className="w-3 h-3" />
                      {configuration.crystalChips} chips
                    </span>
                  )}
                  
                  {/* Type: Pure or Carrier */}
                  {configuration.type === 'pure' || configuration.isPure ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#c9a227]/10 text-[#c9a227] text-xs">
                      <Sparkles className="w-3 h-3" />
                      Pure Essential Oil
                    </span>
                  ) : configuration.isCarrierBlend || configuration.carrierOil ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs">
                      <Droplets className="w-3 h-3" />
                      Carrier Blend
                    </span>
                  ) : null}
                  
                  {/* Carrier Oil */}
                  {configuration.carrierOil && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      {configuration.carrierOil}
                    </span>
                  )}
                  
                  {/* Ratio */}
                  {configuration.ratio && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      {configuration.ratio}
                    </span>
                  )}
                  
                  {/* Crystal Name */}
                  {configuration.crystalName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#c9a227]/10 text-[#c9a227] text-xs">
                      <Gem className="w-3 h-3" />
                      {configuration.crystalName}
                      {configuration.crystalChakra && (
                        <span className="text-[10px] opacity-70">({configuration.crystalChakra})</span>
                      )}
                    </span>
                  )}
                  
                  {/* Cord */}
                  {configuration.cord && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      <Scroll className="w-3 h-3" />
                      {configuration.cord}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Atelier Blend Details */}
            {isAtelierBlend && (
              <div className="mt-3">
                {/* Oil Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(customMix.oils || configuration.oils || []).slice(0, 3).map((oil: any, idx: number) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs"
                    >
                      {oil.oilName || oil.name}
                    </span>
                  ))}
                  {(customMix.oils?.length || configuration.oils?.length || 0) > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      +{(customMix.oils?.length || configuration.oils?.length || 0) - 3} more
                    </span>
                  )}
                </div>

                {/* Crystal & Cord Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {crystal && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#c9a227]/10 text-[#c9a227] text-xs">
                      <Gem className="w-3 h-3" />
                      {crystal.name}
                    </span>
                  )}
                  {cord && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      <Scroll className="w-3 h-3" />
                      {cord.name}
                    </span>
                  )}
                  {customMix.totalVolume && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-xs">
                      <Beaker className="w-3 h-3" />
                      {customMix.totalVolume}ml
                    </span>
                  )}
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => setShowDetails(true)}
                  className="mt-2 text-xs text-[#c9a227] hover:text-[#f5e6c8] flex items-center gap-1 transition-colors"
                >
                  <Info className="w-3 h-3" />
                  View blend details
                </button>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f5f3ef]/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  disabled={item.quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-[#f5f3ef]/5 hover:bg-[#f5f3ef]/10 disabled:opacity-30 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-[#f5f3ef]" />
                </button>
                <span className="w-8 text-center text-[#f5f3ef] font-medium">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-[#f5f3ef]/5 hover:bg-[#f5f3ef]/10 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#f5f3ef]" />
                </button>
              </div>

              <button
                onClick={handleRemove}
                className="p-2 rounded-lg text-[#a69b8a] hover:text-[#e74c3c] hover:bg-[#e74c3c]/10 transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDetails && (
          <AtelierDetailModal
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            item={item}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// COMPONENT: Empty Cart
// ============================================================================
function EmptyCart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-24 h-24 rounded-full bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center mb-6">
        <Beaker className="w-10 h-10 text-[#a69b8a]" />
      </div>
      <h2 className="font-serif text-2xl text-[#f5f3ef] mb-2">Your Cart is Empty</h2>
      <p className="text-[#a69b8a] text-center max-w-sm mb-8">
        Begin your aromatic journey by exploring our collection or creating your own custom blend
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/oils"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Browse Collection
        </Link>
        <Link
          href="/mixing-atelier"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5e6c8] transition-colors"
        >
          <Beaker className="w-4 h-4" />
          Create Custom Blend
        </Link>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN CART PAGE
// ============================================================================
export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Get items from cart - filter out any null/undefined items
  const items = useMemo(() => {
    const rawItems = cart?.items || []
    // Filter out any invalid items
    return rawItems.filter((item: any) => item && item.id && item.quantity > 0)
  }, [cart?.items])

  // Cart state is managed by useCart hook

  // Calculate totals
  const { subtotal, shipping, total, itemCount, atelierCount } = useMemo(() => {
    const sub = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0)
    const ship = sub > 150 ? 0 : 10
    const atelierItems = items.filter((item: any) => item.customMix || item.configuration?.oils).length
    return {
      subtotal: sub,
      shipping: ship,
      total: sub + ship,
      itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      atelierCount: atelierItems
    }
  }, [items])

  // Show loading state while cart initializes
  if (isLoading && !cart) {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#c9a227]/30 border-t-[#c9a227] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#a69b8a]">Loading your cart...</p>
          </div>
        </div>
      </main>
    )
  }

  const handleCheckout = () => {
    setIsCheckingOut(true)
    // Navigate to checkout
    window.location.href = '/checkout'
  }

  return (
    <main className="min-h-screen bg-[#0a080c] pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-serif text-4xl text-[#f5f3ef]">Your Cart</h1>
            <p className="text-[#a69b8a] mt-1">
              {items.length === 0 ? (
                '0 items'
              ) : (
                <>
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                  {atelierCount > 0 && ` • ${atelierCount} custom blend${atelierCount !== 1 ? 's' : ''}`}
                </>
              )}
            </p>
          </div>
          <Link
            href="/mixing-atelier"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#111] border border-[#f5f3ef]/10 text-[#f5f3ef] hover:bg-[#f5f3ef]/5 transition-colors"
          >
            <Beaker className="w-4 h-4" />
            Create Another Blend
          </Link>
        </motion.div>

        {items.length === 0 || itemCount === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8" key={cart?.id || 'empty'}>
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <TooltipProvider>
                <AnimatePresence mode="popLayout">
                  {items.map((item: any) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateItem}
                      onRemove={removeItem}
                    />
                  ))}
                </AnimatePresence>
              </TooltipProvider>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap justify-center gap-6 py-6 mt-6 border-t border-[#f5f3ef]/10"
              >
                <div className="flex items-center gap-2 text-xs text-[#a69b8a]">
                  <Shield className="w-4 h-4 text-[#c9a227]" />
                  Pure Organic Oils
                </div>
                <div className="flex items-center gap-2 text-xs text-[#a69b8a]">
                  <Lock className="w-4 h-4 text-[#c9a227]" />
                  Secure Checkout
                </div>
                <div className="flex items-center gap-2 text-xs text-[#a69b8a]">
                  <Truck className="w-4 h-4 text-[#c9a227]" />
                  Free Shipping over $150
                </div>
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-[#111] to-[#0a080c] border border-[#f5f3ef]/10 sticky top-28"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Crown className="w-5 h-5 text-[#c9a227]" />
                  <h2 className="font-serif text-xl text-[#f5f3ef]">Order Summary</h2>
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[#a69b8a]">
                    <span>Subtotal</span>
                    <span className="text-[#f5f3ef]">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#a69b8a]">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? "text-[#2ecc71]" : "text-[#f5f3ef]"}>
                      {shipping === 0 ? 'Free' : formatPrice(shipping)}
                    </span>
                  </div>
                  {atelierCount > 0 && (
                    <div className="flex justify-between text-[#c9a227]">
                      <span>Custom Blends</span>
                      <span>{atelierCount}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-[#f5f3ef]/10">
                    <div className="flex justify-between items-center">
                      <span className="text-[#f5f3ef] font-medium">Total</span>
                      <span className="font-serif text-3xl text-[#c9a227]">{formatPrice(total)}</span>
                    </div>
                    <p className="text-xs text-[#a69b8a] mt-1 text-right">
                      Incl. GST
                    </p>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#d4af37] text-[#0a080c] font-medium hover:from-[#f5e6c8] hover:to-[#c9a227] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0a080c]/30 border-t-[#0a080c] rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Payment Icons */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[10px] text-[#a69b8a]">
                    Visa
                  </div>
                  <div className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[10px] text-[#a69b8a]">
                    Mastercard
                  </div>
                  <div className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[10px] text-[#a69b8a]">
                    PayPal
                  </div>
                  <div className="px-2 py-1 rounded bg-[#f5f3ef]/5 text-[10px] text-[#a69b8a]">
                    Afterpay
                  </div>
                </div>

                {/* Security Note */}
                <p className="text-xs text-[#a69b8a] text-center mt-4">
                  Your payment information is encrypted and secure
                </p>
              </motion.div>

              {/* Continue Shopping */}
              <Link
                href="/oils"
                className="mt-4 flex items-center justify-center gap-2 text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
