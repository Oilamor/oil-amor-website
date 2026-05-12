'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, Trash2, Sparkles, Beaker, Gem, Scroll } from 'lucide-react'
import { useCart } from '../hooks/use-cart'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import { ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'
import { SIMPLE_CORD_OPTIONS } from '@/lib/atelier/cord-data-simple'
import { CartItemStockBadge } from '@/app/components/stock-status-badge'

export function CartSidebar() {
  const { cart, isOpen, closeCart, updateItem, removeItem, isLoading, itemCount, total } = useCart()

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, closeCart])

  // Use items from cart (our custom structure, not Shopify's)
  const items = cart?.items || []
  const subtotal = cart?.subtotal || 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1999]"
            onClick={closeCart}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 w-full max-w-md h-screen h-dvh bg-[#0a080c] z-[2000] flex flex-col shadow-2xl border-l border-[#f5f3ef]/10"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#f5f3ef]/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#c9a227]" />
                <h2 className="font-serif text-xl text-[#f5f3ef]">Your Cart</h2>
                {itemCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs">
                    {itemCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="w-10 h-10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] transition-colors rounded-full hover:bg-[#f5f3ef]/5"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center mb-6">
                    <Beaker className="w-8 h-8 text-[#a69b8a]" />
                  </div>
                  <p className="text-[#f5f3ef] font-medium mb-2">Your cart is empty</p>
                  <p className="text-sm text-[#a69b8a] mb-6">Begin your aromatic journey</p>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5e6c8] transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((item: any) => {
                      const customMix = item.customMix || {}
                      const configuration = item.configuration || {}
                      const isAtelierBlend = customMix.oils?.length > 0 || (configuration.oils?.length > 0)
                      
                      const crystalId = customMix.crystalId || configuration?.crystals?.[0]
                      const crystal = crystalId 
                        ? ATELIER_CRYSTALS.find(c => c.id === crystalId)
                        : null
                      
                      const cordId = item.attachment?.cordId || customMix.cordId || configuration?.cord
                      const cord = cordId
                        ? SIMPLE_CORD_OPTIONS.find(c => c.id === cordId)
                        : null

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className={`p-4 rounded-xl border ${
                            isAtelierBlend 
                              ? 'bg-[#c9a227]/5 border-[#c9a227]/20' 
                              : 'bg-[#111] border-[#f5f3ef]/10'
                          }`}
                        >
                          <div className="flex gap-4">
                            {/* Image */}
                            <div className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center ${
                              isAtelierBlend ? 'bg-[#c9a227]/10' : 'bg-[#0a080c]'
                            }`}>
                              {isAtelierBlend ? (
                                <Beaker className="w-6 h-6 text-[#c9a227]" />
                              ) : item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Sparkles className="w-6 h-6 text-[#a69b8a]" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className={`font-medium truncate pr-2 text-sm ${
                                    isAtelierBlend ? 'text-[#f5e6c8]' : 'text-[#f5f3ef]'
                                  }`}>
                                    {item.name}
                                  </h3>
                                  <p className="text-xs text-[#a69b8a] mt-0.5">
                                    {isAtelierBlend ? 'Custom Atelier Blend' : item.sku}
                                  </p>
                                </div>
                                <p className={`font-medium whitespace-nowrap text-sm ${
                                  isAtelierBlend ? 'text-[#c9a227]' : 'text-[#f5f3ef]'
                                }`}>
                                  {formatPrice(item.unitPrice * item.quantity)}
                                </p>
                              </div>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {crystal && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#c9a227]/10 text-[#c9a227] text-[10px]">
                                    <Gem className="w-2.5 h-2.5" />
                                    {crystal.name}
                                  </span>
                                )}
                                {cord && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                                    <Scroll className="w-2.5 h-2.5" />
                                    {cord.name}
                                  </span>
                                )}
                                {configuration.bottleSize && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f3ef]/5 text-[#a69b8a] text-[10px]">
                                    {configuration.bottleSize}
                                  </span>
                                )}
                              </div>
                              <CartItemStockBadge item={item} />

                              {/* Quantity & Remove */}
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateItem(item.id, item.quantity - 1)}
                                    disabled={isLoading || item.quantity <= 1}
                                    className="w-7 h-7 rounded-lg bg-[#f5f3ef]/5 hover:bg-[#f5f3ef]/10 disabled:opacity-30 flex items-center justify-center transition-colors"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-3 h-3 text-[#f5f3ef]" />
                                  </button>
                                  <span className="w-6 text-center text-[#f5f3ef] text-sm">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateItem(item.id, item.quantity + 1)}
                                    disabled={isLoading}
                                    className="w-7 h-7 rounded-lg bg-[#f5f3ef]/5 hover:bg-[#f5f3ef]/10 flex items-center justify-center transition-colors"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-3 h-3 text-[#f5f3ef]" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  disabled={isLoading}
                                  className="p-1.5 rounded-lg text-[#a69b8a] hover:text-[#e74c3c] hover:bg-[#e74c3c]/10 transition-colors"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-[#f5f3ef]/10 flex-shrink-0 bg-[#0a080c]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#a69b8a]">Subtotal</span>
                  <span className="font-serif text-2xl text-[#c9a227]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="text-xs text-[#a69b8a] mb-4 text-center">
                  Shipping & taxes calculated at checkout
                </p>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="block w-full py-4 bg-gradient-to-r from-[#c9a227] to-[#d4af37] text-[#0a080c] text-center font-medium rounded-xl hover:from-[#f5e6c8] hover:to-[#c9a227] transition-colors"
                >
                  Proceed to Checkout
                </Link>
                <button
                  onClick={closeCart}
                  className="w-full mt-3 text-sm text-[#a69b8a] hover:text-[#f5f3ef] transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
