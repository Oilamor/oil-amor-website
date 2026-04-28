'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Unlock, Droplets, ArrowRight, ShoppingBag, User, Beaker, Loader2 } from 'lucide-react'
import { CardImageZoom } from '@/app/components/image-zoom'
import { getAllOils } from '@/lib/content/oil-crystal-synergies'
import { formatPrice, getAllPrices } from '@/lib/content/pricing-engine-final'
import { useUser } from '@/lib/context/user-context'
import { useCart } from '@/app/hooks/use-cart'
import { ScaledRefillCard } from '@/app/components/refill/ScaledRefillCard'
import type { NormalizedRecipe, ScaledRefill } from '@/lib/refill/recipe-scaling'
import { generateId } from '@/lib/utils'

interface RefillOil {
  id: string
  handle: string
  name: string
  image: string
  origin: string
  isUnlocked: boolean
  unlockedType?: 'pure' | 'enhanced'
  prices: {
    original30ml: number
    refill50ml: number
    refill100ml: number
    savingsPercent: number
  }
}

interface ApiBlendRefill {
  id: string
  name: string
  originalSize: 5 | 10 | 15 | 20 | 30
  mode: 'pure' | 'carrier'
  normalizedRecipe: NormalizedRecipe
  availableSizes: {
    '50ml': ScaledRefill
    '100ml': ScaledRefill
  }
}

function OilCard({ oil, index }: { oil: RefillOil; index: number }) {
  const [selectedSize, setSelectedSize] = useState<'50ml' | '100ml'>('100ml')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { addItem, openCart } = useCart()
  
  const price = selectedSize === '50ml' ? oil.prices.refill50ml : oil.prices.refill100ml

  const handleAddToCart = async () => {
    if (!oil.isUnlocked) return
    
    setIsAddingToCart(true)
    try {
      await addItem({
        productId: `refill-${oil.id}-${selectedSize.toLowerCase()}`,
        quantity: 1,
        variantId: `refill-${oil.id}-${selectedSize.toLowerCase()}-variant`,
        configuration: {
          bottleSize: selectedSize,
          oilName: oil.name,
          type: 'refill',
        },
        properties: {
          type: 'refill-oil',
          oilId: oil.id,
          oilName: oil.name,
          size: selectedSize,
          originalPrice: String(oil.prices.original30ml),
          savingsPercent: String(oil.prices.savingsPercent),
        },
      })
      
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (!oil.isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group relative p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
      >
        <div className="absolute top-4 right-4">
          <div className="w-10 h-10 rounded-full bg-[#0a080c] border border-[#f5f3ef]/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#a69b8a]" />
          </div>
        </div>
        
        <div className="relative aspect-square rounded-xl overflow-hidden mb-4 opacity-50 grayscale">
          <CardImageZoom src={oil.image} alt={oil.name} className="w-full h-full" />
          <div className="absolute inset-0 bg-[#0a080c]/60 flex items-center justify-center">
            <Lock className="w-12 h-12 text-[#f5f3ef]/30" />
          </div>
        </div>
        
        <h3 className="font-serif text-xl text-[#a69b8a] mb-1">{oil.name}</h3>
        <p className="text-xs text-[#a69b8a]/70 mb-4">{oil.origin}</p>
        
        <div className="p-3 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/5 mb-4">
          <p className="text-xs text-[#a69b8a]">Refills from</p>
          <p className="text-xl font-serif text-[#2ecc71]">{formatPrice(oil.prices.refill100ml)}</p>
        </div>
        
        <Link
          href={`/oil/${oil.handle}`}
          className="block w-full py-3 rounded-xl bg-[#c9a227] text-[#0a080c] text-center font-medium hover:bg-[#f5f3ef] transition-colors"
        >
          Purchase to Unlock
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative p-6 rounded-2xl bg-[#111] border border-[#2ecc71]/30"
    >
      <div className="absolute top-4 right-4">
        <div className="px-3 py-1 rounded-full bg-[#2ecc71]/20 border border-[#2ecc71]/40 flex items-center gap-1.5">
          <Unlock className="w-3.5 h-3.5 text-[#2ecc71]" />
          <span className="text-xs text-[#2ecc71] font-medium">UNLOCKED</span>
        </div>
      </div>
      
      <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
        <Image src={oil.image} alt={oil.name} fill className="object-cover" />
      </div>
      
      <h3 className="font-serif text-xl text-[#f5f3ef] mb-1">{oil.name}</h3>
      <p className="text-xs text-[#a69b8a] mb-4">{oil.origin}</p>
      
      {/* Type indicator */}
      <div className="flex gap-2 mb-4">
        <div className={`px-3 py-1.5 rounded-lg text-xs ${
          oil.unlockedType === 'enhanced' 
            ? 'bg-[#c9a227]/20 text-[#c9a227] border border-[#c9a227]/30' 
            : 'bg-[#0a080c] text-[#a69b8a] border border-[#f5f3ef]/10'
        }`}>
          {oil.unlockedType === 'enhanced' ? 'Pure + Enhanced' : 'Pure Only'}
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        {(['50ml', '100ml'] as const).map((size) => (
          <button
            key={size}
            onClick={() => setSelectedSize(size)}
            className={`flex-1 py-2 rounded-lg text-sm transition-all ${
              selectedSize === size
                ? 'bg-[#2ecc71] text-[#0a080c]'
                : 'bg-[#0a080c] text-[#a69b8a] border border-[#f5f3ef]/10'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[#a69b8a]">{selectedSize} Refill</p>
          <p className="text-2xl font-serif text-[#f5f3ef]">{formatPrice(price)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#a69b8a]">Save</p>
          <p className="text-sm text-[#2ecc71]">{oil.prices.savingsPercent}%</p>
        </div>
      </div>
      
      <button 
        onClick={handleAddToCart}
        disabled={isAddingToCart}
        className="w-full py-3 rounded-xl bg-[#2ecc71] text-[#0a080c] font-medium hover:bg-[#27ae60] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isAddingToCart ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding...
          </>
        ) : (
          'Add to Cart'
        )}
      </button>
    </motion.div>
  )
}

export default function RefillStorePage() {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [isLoadingBlends, setIsLoadingBlends] = useState(false)
  const [blendRefills, setBlendRefills] = useState<ApiBlendRefill[]>([])
  const [blendError, setBlendError] = useState<string | null>(null)
  
  const { 
    isAuthenticated, 
    user,
    isOilUnlocked, 
    getUnlockedOilIds, 
    unlockedOils, 
    getUnlockedBlendRefills: getDemoBlendRefills,
  } = useUser()
  
  const { addItem, openCart } = useCart()

  // Fetch custom blend refills from API when authenticated
  useEffect(() => {
    const fetchBlendRefills = async () => {
      if (!isAuthenticated || !user?.id) {
        setBlendRefills([])
        return
      }

      setIsLoadingBlends(true)
      setBlendError(null)

      try {
        // Use Bearer token with user ID for authentication
        const response = await fetch('/api/refills', {
          headers: {
            'Authorization': `Bearer ${user.id}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch refill blends')
        }

        const data = await response.json()
        setBlendRefills(data.refills || [])
      } catch (error) {
        console.error('Failed to fetch blend refills:', error)
        setBlendError(error instanceof Error ? error.message : 'Failed to load blends')
        console.error('Failed to load custom blends:', error)
      } finally {
        setIsLoadingBlends(false)
      }
    }

    fetchBlendRefills()
  }, [isAuthenticated, user?.id])

  const oils = useMemo<RefillOil[]>(() => {
    const unlockedIds = getUnlockedOilIds()
    
    return getAllOils().map((oil) => {
      const prices = getAllPrices(oil.id)
      const unlockedOil = unlockedOils.find(u => u.oilId === oil.id)
      
      return {
        id: oil.id,
        handle: oil.handle || `${oil.id}-oil`,
        name: oil.commonName,
        image: oil.image,
        origin: oil.origin,
        isUnlocked: unlockedIds.includes(oil.id),
        unlockedType: unlockedOil?.type,
        prices: {
          original30ml: prices.pure['30ml'] || 0,
          refill50ml: prices.refill?.['50ml']?.pure || 0,
          refill100ml: prices.refill?.['100ml']?.pure || 0,
          savingsPercent: Math.round(
            (((prices.pure['30ml'] || 0) - (prices.refill?.['100ml']?.pure || 0) / 3.3) / (prices.pure['30ml'] || 1)) * 100
          ) || 0
        }
      }
    })
  }, [getUnlockedOilIds, unlockedOils])

  const filtered = useMemo(() => {
    if (filter === 'unlocked') return oils.filter(o => o.isUnlocked)
    if (filter === 'locked') return oils.filter(o => !o.isUnlocked)
    return oils
  }, [oils, filter])

  const unlockedCount = oils.filter(o => o.isUnlocked).length
  const hasBlendRefills = blendRefills.length > 0

  // Cart integration for custom blend refills
  const handleAddBlendToCart = useCallback(async (
    blend: ApiBlendRefill, 
    size: 50 | 100, 
    scaled: ScaledRefill
  ) => {
    const lineId = generateId()
    
    try {
      await addItem({
        id: lineId,
        productId: `refill-blend-${blend.id}-${size}ml`,
        variantId: `refill-blend-${blend.id}-${size}ml-variant`,
        quantity: 1,
        // Custom mix data for refill blends
        customMix: {
          recipeId: blend.id,
          recipeName: blend.name,
          mode: blend.mode,
          oils: scaled.oils.map(oil => ({
            oilId: oil.oilId,
            oilName: oil.oilName || '',
            ml: oil.ml,
            percentage: oil.percentage,
          })),
          carrierRatio: blend.normalizedRecipe.carrierRatio,
          totalVolume: size as 5 | 10 | 15 | 20 | 30 | 50 | 100,
          safetyScore: 0, // Refills maintain same safety as original
          safetyRating: 'Certified',
          safetyWarnings: [],
          labCertified: true,
        },
        configuration: {
          bottleSize: `${size}ml`,
          type: 'refill-blend',
          totalVolume: String(size),
          originalVolume: String(blend.originalSize),
          mode: blend.mode,
          oils: scaled.oils.map((o: { oilName?: string; oilId: string; ml: number }) => ({
            name: o.oilName || o.oilId,
            ml: o.ml,
          })),
          carrierAmount: scaled.carrierOilMl,
        },
        properties: {
          type: 'refill-blend',
          blendId: blend.id,
          blendName: blend.name,
          size: `${size}ml`,
          originalSize: String(blend.originalSize),
          mode: blend.mode,
          essentialOilMl: String(scaled.totalEssentialOilMl),
          carrierOilMl: String(scaled.carrierOilMl),
          totalMl: String(scaled.oils.reduce((sum: number, o: { ml: number }) => sum + o.ml, 0)),
          formula: scaled.formula,
          price: String(scaled.estimatedPrice),
        },
      })

    } catch (error) {
      console.error('Failed to add blend to cart:', error)
    }
  }, [addItem])

  return (
    <main className="min-h-screen bg-[#0a080c]">
      {/* Header */}
      <section className="pt-32 pb-16 px-6 border-b border-[#f5f3ef]/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-[#2ecc71]" />
            <span className="text-[#2ecc71] text-sm font-medium">Forever Bottle Program</span>
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl text-[#f5f3ef] mb-4">
            Refill Store
          </h1>
          
          <p className="text-[#a69b8a] max-w-xl mb-6">
            Purchase any essential oil to unlock exclusive refill pricing. 
            Your Forever Bottle is yours to keep—refills ship in premium Miron Violetglass.
          </p>

          {/* Login Banner */}
          {!isAuthenticated && (
            <div className="p-4 rounded-xl bg-[#c9a227]/10 border border-[#c9a227]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#c9a227]/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#c9a227]" />
                </div>
                <div>
                  <p className="text-sm text-[#f5f3ef] font-medium">View Your Unlocked Oils</p>
                  <p className="text-xs text-[#a69b8a]">Log in to see your refill availability and custom blends</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-full bg-[#c9a227] text-[#0a080c] text-sm font-medium hover:bg-[#f5f3ef] transition-colors whitespace-nowrap"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-6 border-b border-[#f5f3ef]/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Purchase', desc: 'Buy any 5-30ml oil bottle. Yours forever.' },
              { step: '2', title: 'Unlock', desc: 'That oil type unlocks for refill access.' },
              { step: '3', title: 'Refill', desc: 'Order 50ml or 100ml refills anytime.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#c9a227]/20 border border-[#c9a227]/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#c9a227] font-medium">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-[#f5f3ef] font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-[#a69b8a]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Blend Refills Section */}
      {isAuthenticated && (
        <section className="py-16 px-6 border-b border-[#f5f3ef]/10 bg-gradient-to-b from-[#c9a227]/5 to-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Beaker className="w-5 h-5 text-[#c9a227]" />
              <span className="text-[#c9a227] text-sm font-medium">Your Custom Blends</span>
            </div>
            
            <h2 className="font-serif text-2xl text-[#f5f3ef] mb-2">
              Your Formulas, Scaled to Any Size
            </h2>
            <p className="text-[#a69b8a] mb-8 max-w-2xl">
              These custom blends were created in the Mixing Atelier and are now available for refill. 
              Each formula is preserved exactly—just scaled to 50ml or 100ml.
            </p>

            {/* Loading State */}
            {isLoadingBlends && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#c9a227] animate-spin" />
                <span className="ml-3 text-[#a69b8a]">Loading your custom blends...</span>
              </div>
            )}

            {/* Error State */}
            {blendError && (
              <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                <p className="text-red-400 mb-2">Failed to load custom blends</p>
                <p className="text-sm text-red-400/70">{blendError}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Blend Cards */}
            {!isLoadingBlends && !blendError && hasBlendRefills && (
              <div className="grid md:grid-cols-2 gap-6">
                {blendRefills.map((blend, index) => (
                  <motion.div
                    key={blend.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ScaledRefillCard
                      recipeName={blend.name}
                      normalizedRecipe={blend.normalizedRecipe}
                      originalSize={blend.originalSize}
                      onAddToCart={(size, scaled) => handleAddBlendToCart(blend, size, scaled)}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoadingBlends && !blendError && !hasBlendRefills && (
              <div className="text-center py-12 border border-dashed border-[#f5f3ef]/20 rounded-2xl">
                <Beaker className="w-12 h-12 text-[#a69b8a] mx-auto mb-4" />
                <p className="text-[#f5f3ef] mb-2">No custom blends yet</p>
                <p className="text-sm text-[#a69b8a] mb-4">Create a custom blend in the Mixing Atelier to unlock refills</p>
                <Link
                  href="/mixing-atelier"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
                >
                  Create Your Blend
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Oils Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="font-serif text-2xl text-[#f5f3ef]">
                {filter === 'unlocked' ? 'Your Unlocked Oils' : 
                 filter === 'locked' ? 'Available to Unlock' : 
                 'All Oils'}
              </h2>
              <p className="text-sm text-[#a69b8a]">
                {unlockedCount} of {oils.length} unlocked
              </p>
            </div>
            
            <div className="flex gap-2">
              {(['all', 'unlocked', 'locked'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    filter === f
                      ? 'bg-[#f5f3ef] text-[#0a080c]'
                      : 'bg-[#111] text-[#a69b8a] border border-[#f5f3ef]/10'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((oil, index) => (
                <OilCard key={oil.id} oil={oil} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              {filter === 'unlocked' ? (
                <>
                  <Lock className="w-12 h-12 text-[#a69b8a] mx-auto mb-4" />
                  <p className="text-[#f5f3ef] mb-2">No oils unlocked yet</p>
                  <p className="text-sm text-[#a69b8a] mb-4">Purchase your first oil to unlock refill pricing</p>
                  <Link
                    href="/oils"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#c9a227] text-[#0a080c] font-medium"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Shop Oils
                  </Link>
                </>
              ) : (
                <p className="text-[#a69b8a]">No oils match this filter</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-[#f5f3ef]/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl text-[#f5f3ef] mb-4">
            Ready to Start Your Collection?
          </h2>
          <p className="text-[#a69b8a] mb-8">
            Explore our complete collection of essential oils and crystal synergies.
          </p>
          <Link
            href="/oils"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors"
          >
            Browse Collection
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  )
}
