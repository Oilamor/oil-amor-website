'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ArrowLeft, 
  MapPin, 
  Beaker, 
  Sparkles, 
  Wind,
  Flame,
  Gem,
  Check,
} from 'lucide-react'
import { StockStatusBadge } from '@/app/components/stock-status-badge'
import { CrystalSynergyExpandable } from '@/app/components/crystal-synergy-expandable'
import { ImageZoom } from '@/app/components/image-zoom'
import { ProductConfigurator } from '@/app/components/product-configurator'
import { AddToCartSection } from '@/app/components/add-to-cart-section'
import { RefillPricingSection } from '@/app/components/refill-pricing-section'
import { getOilByHandle, getOilById, type CrystalPairing } from '@/lib/content/oil-crystal-synergies'
import { BOTTLE_SIZES } from '@/lib/content/product-config'
import { calculatePurePrice, getAllPrices, formatPrice, CRYSTAL_COUNTS } from '@/lib/content/pricing-engine-final'
import type { ProductType } from '@/lib/content/product-config'
import type { RatioPreset } from '@/lib/content/ratio-engine'
interface OilPageClientProps {
  slug: string
}

// Element Badge Component
function ElementBadge({ element, size = 'md' }: { element?: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    fire: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    water: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    earth: 'bg-green-500/20 text-green-400 border-green-500/30',
    air: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }
  
  return (
    <span className={`px-2 py-1 rounded-full border text-xs font-medium ${colors[element || 'earth']} ${size === 'sm' ? 'text-[10px]' : ''}`}>
      {element || 'Earth'}
    </span>
  )
}

// Chakra Badge Component
function ChakraBadge({ chakra, size = 'md' }: { chakra?: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    root: 'bg-red-500/20 text-red-400 border-red-500/30',
    sacral: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'solar-plexus': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    heart: 'bg-green-500/20 text-green-400 border-green-500/30',
    throat: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'third-eye': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    crown: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }
  
  return (
    <span className={`px-2 py-1 rounded-full border text-xs font-medium ${colors[chakra || 'root']} ${size === 'sm' ? 'text-[10px]' : ''}`}>
      {chakra?.replace('-', ' ') || 'Root'}
    </span>
  )
}

export default function OilPageClient({ slug }: OilPageClientProps) {
  const oilData = getOilByHandle(slug)
  
  // Calculate pure 30ml price as base
  const pure30mlPrice = useMemo(() => {
    return calculatePurePrice(slug, 30)
  }, [slug])

  // Get all prices
  const prices = useMemo(() => {
    return getAllPrices(slug)
  }, [slug])

  // State for product configuration
  const [configuration, setConfiguration] = useState({
    type: 'pure' as ProductType,
    size: BOTTLE_SIZES[0], // 30ml
    carrier: undefined as string | undefined,
    ratio: undefined as RatioPreset | undefined,
    selectedCrystal: undefined as CrystalPairing | undefined,
    selectedCord: undefined as { id: string; name: string; price: number } | undefined,
    price: pure30mlPrice,
    breakdown: null as any,
    isValid: true,
    validationMessage: '',
  })
  
  // Configuration changes are handled by ProductConfigurator and local state

  if (!oilData) {
    return (
      <div className="min-h-screen bg-[#0a080c] flex items-center justify-center">
        <p className="text-[#a69b8a]">Oil not found</p>
      </div>
    )
  }

  const firstCrystal = oilData.crystalPairings[0]

  // MOBILE: Stack vertically - Image, Purchase Info, Details
  // DESKTOP: Side by side - Image+Details left, Purchase sticky right
  
  return (
    <div className="min-h-screen bg-[#0a080c]">
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* MOBILE LAYOUT: Custom order per user request */}
          <div className="lg:hidden space-y-6">
            {/* 1. Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a1618] to-[#0a080c] border border-[#f5f3ef]/10"
            >
              <ImageZoom
                src={oilData.image}
                alt={oilData.commonName}
                fill
                className="w-full h-full"
                zoomScale={2.5}
              />
            </motion.div>

            {/* 2. Back to Collection - RIGHT SIDE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <Link 
                href="/oils" 
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-400 hover:text-purple-300 hover:border-purple-400 hover:bg-purple-500/20 transition-all"
              >
                <span className="text-sm font-medium">Back to Collection</span>
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              </Link>
            </motion.div>

            {/* 3. Title & Meta */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap gap-2 mb-4">
                <ElementBadge element={firstCrystal?.element} size="sm" />
                <ChakraBadge chakra={firstCrystal?.chakra} size="sm" />
                <span className="px-3 py-1 rounded-full bg-[#111] text-[#a69b8a] text-xs border border-[#f5f3ef]/10">
                  {oilData.strengths[0]}
                </span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl text-[#f5f3ef] mb-2">
                {oilData.commonName}
              </h1>
              <p className="text-[#a69b8a] text-lg">{oilData.technicalName}</p>
            </motion.div>

            {/* 4. Price - DIRECTLY UNDER TITLE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-baseline gap-3"
            >
              {configuration.price > 0 ? (
                <span className="text-4xl font-light text-[#c9a227]">
                  {formatPrice(configuration.price)}
                </span>
              ) : (
                <span className="text-4xl font-light text-[#c9a227]">
                  {formatPrice(pure30mlPrice)}
                </span>
              )}
              <span className="text-[#a69b8a]">
                {configuration.price > 0 && configuration.type === 'carrier' && configuration.ratio
                  ? `${configuration.ratio.essentialOilPercent}% enhanced`
                  : '30ml pure'
                }
              </span>
            </motion.div>

            {/* Stock Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <StockStatusBadge oilId={oilData.id} />
            </motion.div>

            {/* 5. Description - UNDER PRICE */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#f5f3ef]/80 leading-relaxed"
            >
              {oilData.description}
            </motion.p>

            {/* 6. Benefits - UNDER DESCRIPTION */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              {oilData.baseProperties.slice(0, 4).map((benefit: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[#111] border border-[#f5f3ef]/5"
                >
                  <Sparkles className="w-4 h-4 text-[#c9a227] flex-shrink-0" />
                  <span className="text-[#f5f3ef]/80 text-sm">{benefit}</span>
                </div>
              ))}
            </motion.div>

            {/* 7. Quick Specs - SWAPPED WITH PRODUCT SPECIFICATIONS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-4 text-center"
            >
              <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/5">
                <Wind className="w-5 h-5 text-[#c9a227] mx-auto mb-2" />
                <p className="text-[10px] text-[#a69b8a] uppercase tracking-wider mb-1">Extraction</p>
                <p className="text-xs text-[#f5f3ef]">{oilData.extractionMethod}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/5">
                <Flame className="w-5 h-5 text-[#c9a227] mx-auto mb-2" />
                <p className="text-[10px] text-[#a69b8a] uppercase tracking-wider mb-1">Strength</p>
                <p className="text-xs text-[#f5f3ef]">{oilData.strengths[0]}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/5">
                <MapPin className="w-5 h-5 text-[#c9a227] mx-auto mb-2" />
                <p className="text-[10px] text-[#a69b8a] uppercase tracking-wider mb-1">Origin</p>
                <p className="text-xs text-[#f5f3ef]">{oilData.origin.split(',')[0]}</p>
              </div>
            </motion.div>

            {/* 8. Product Configurator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
            >
              <ProductConfigurator
                oil={{ id: slug, name: oilData.commonName }}
                selectedCrystal={configuration.selectedCrystal}
                externalConfig={{
                  type: configuration.type,
                  carrier: configuration.carrier,
                  ratio: configuration.ratio,
                  size: configuration.size,
                }}
                onConfigurationChange={(config: any) => {
                  setConfiguration((prev: any) => ({ ...prev, ...config }))
                }}
              />
            </motion.div>

            {/* 9. Select Your Crystal */}
            {oilData.crystalPairings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border-2 border-[#c9a227]/30 bg-[#c9a227]/5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#c9a227] flex items-center justify-center">
                    <Gem className="w-4 h-4 text-[#0a080c]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f5f3ef]">Select Your Crystal</h3>
                    <p className="text-xs text-[#a69b8a]">{CRYSTAL_COUNTS[configuration.size.id] || 12} chips included</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {oilData.crystalPairings.map((pairing: CrystalPairing) => (
                    <button
                      key={pairing.id}
                      onClick={() => setConfiguration((prev: any) => ({ ...prev, selectedCrystal: pairing }))}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        configuration.selectedCrystal?.id === pairing.id
                          ? 'border-[#c9a227] bg-[#c9a227]/20'
                          : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${configuration.selectedCrystal?.id === pairing.id ? 'text-[#c9a227]' : 'text-[#f5f3ef]'}`}>
                          {pairing.name}
                        </span>
                        {configuration.selectedCrystal?.id === pairing.id && (
                          <div className="w-5 h-5 bg-[#c9a227] rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#0a080c]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-[#a69b8a] capitalize">{pairing.chakra} • {pairing.element}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 10. Crystal Synergy - AFTER SELECT YOUR CRYSTAL */}
            {configuration.selectedCrystal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CrystalSynergyExpandable crystal={configuration.selectedCrystal} />
              </motion.div>
            )}

            {/* 11. Add to Cart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
            >
              <AddToCartSection
                variant={{
                  id: `${slug}-${configuration.size.id}-${configuration.type}`,
                  price: configuration.price || 25.00,
                  size: configuration.size.label,
                  type: configuration.type,
                  carrier: configuration.carrier,
                  ratio: configuration.ratio?.name,
                }}
                title={oilData.commonName}
                selectedCrystal={configuration.selectedCrystal}
                selectedCord={configuration.selectedCord}
                selectedSize={configuration.size}
                breakdown={configuration.breakdown}
                isValid={configuration.isValid}
                validationMessage={configuration.validationMessage}
                image={oilData.image}
                oilId={slug}
              />
            </motion.div>

            {/* 12. Product Specifications - SWAPPED WITH QUICK SPECS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-5 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
            >
              <h4 className="text-[#f5f3ef] font-medium mb-4 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-[#c9a227]" />
                Product Specifications
              </h4>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#a69b8a]">Botanical Name</dt>
                  <dd className="text-[#f5f3ef]">{oilData.technicalName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#a69b8a]">Full Origin</dt>
                  <dd className="text-[#f5f3ef] flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {oilData.origin}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#a69b8a]">Extraction Method</dt>
                  <dd className="text-[#f5f3ef]">{oilData.extractionMethod}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#a69b8a]">Aroma Profile</dt>
                  <dd className="text-[#f5f3ef]">{oilData.aroma}</dd>
                </div>
              </dl>
            </motion.div>

            {/* 14. Forever Bottle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <RefillPricingSection
                oilId={slug}
                oilName={oilData.commonName}
                selectedSizeId={configuration.size.id}
              />
            </motion.div>
          </div>

          {/* DESKTOP LAYOUT: Two columns */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left Column */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-[#1a1618] to-[#0a080c] border border-[#f5f3ef]/10"
              >
                <ImageZoom
                  src={oilData.image}
                  alt={oilData.commonName}
                  fill
                  className="w-full h-full"
                  zoomScale={2.5}
                />
              </motion.div>

              <DetailsSection 
                oilData={oilData} 
                configuration={configuration}
                setConfiguration={setConfiguration}
                slug={slug}
              />
            </div>

            {/* Right Column - Sticky */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
              <PurchaseSection 
                oilData={oilData} 
                configuration={configuration} 
                setConfiguration={setConfiguration}
                pure30mlPrice={pure30mlPrice}
                firstCrystal={firstCrystal}
                slug={slug}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Purchase Section Component
function PurchaseSection({ 
  oilData, 
  configuration, 
  setConfiguration, 
  pure30mlPrice, 
  firstCrystal,
  slug 
}: any) {
  return (
    <>
      {/* Title & Meta */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <ElementBadge element={firstCrystal?.element} size="sm" />
          <ChakraBadge chakra={firstCrystal?.chakra} size="sm" />
          <span className="px-3 py-1 rounded-full bg-[#111] text-[#a69b8a] text-xs border border-[#f5f3ef]/10">
            {oilData.strengths[0]}
          </span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl text-[#f5f3ef] mb-2">
          {oilData.commonName}
        </h1>
        <p className="text-[#a69b8a] text-lg">{oilData.technicalName}</p>
      </motion.div>

      {/* Back to Collection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex justify-end"
      >
        <Link 
          href="/oils" 
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-400 hover:text-purple-300 hover:border-purple-400 hover:bg-purple-500/20 transition-all"
        >
          <span className="text-sm font-medium">Back to Collection</span>
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>
      </motion.div>

      {/* Price Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-baseline gap-3"
      >
        {configuration.price > 0 ? (
          <span className="text-4xl font-light text-[#c9a227]">
            {formatPrice(configuration.price)}
          </span>
        ) : (
          <span className="text-4xl font-light text-[#c9a227]">
            {formatPrice(pure30mlPrice)}
          </span>
        )}
        <span className="text-[#a69b8a]">
          {configuration.price > 0 && configuration.type === 'carrier' && configuration.ratio
            ? `${configuration.ratio.essentialOilPercent}% enhanced`
            : '30ml pure'
          }
        </span>
      </motion.div>

      {/* Stock Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <StockStatusBadge oilId={oilData.id} />
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-[#f5f3ef]/80 leading-relaxed"
      >
        {oilData.description}
      </motion.p>

      {/* Product Configurator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
      >
        <ProductConfigurator
          oil={{ id: slug, name: oilData.commonName }}
          selectedCrystal={configuration.selectedCrystal}
          externalConfig={{
            type: configuration.type,
            carrier: configuration.carrier,
            ratio: configuration.ratio,
            size: configuration.size,
          }}
          onConfigurationChange={(config: any) => setConfiguration((prev: any) => ({ ...prev, ...config }))}
        />
      </motion.div>

      {/* Add to Cart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
      >
        <AddToCartSection
          variant={{
            id: `${slug}-${configuration.size.id}-${configuration.type}`,
            price: configuration.price || 25.00,
            size: configuration.size.label,
            type: configuration.type,
            carrier: configuration.carrier,
            ratio: configuration.ratio?.name,
          }}
          title={oilData.commonName}
          selectedCrystal={configuration.selectedCrystal}
          selectedCord={configuration.selectedCord}
          selectedSize={configuration.size}
          breakdown={configuration.breakdown}
          isValid={configuration.isValid}
          validationMessage={configuration.validationMessage}
          image={oilData.image}
          oilId={slug}
        />
      </motion.div>
    </>
  )
}

// Details Section Component  
function DetailsSection({ oilData, configuration, setConfiguration, slug }: any) {
  return (
    <>
      {/* Quick Specs Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 text-center"
      >
        <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/5">
          <Wind className="w-5 h-5 text-[#c9a227] mx-auto mb-2" />
          <p className="text-[10px] text-[#a69b8a] uppercase tracking-wider mb-1">Extraction</p>
          <p className="text-xs text-[#f5f3ef]">{oilData.extractionMethod}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/5">
          <Flame className="w-5 h-5 text-[#c9a227] mx-auto mb-2" />
          <p className="text-[10px] text-[#a69b8a] uppercase tracking-wider mb-1">Strength</p>
          <p className="text-xs text-[#f5f3ef]">{oilData.strengths[0]}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#111] border border-[#f5f3ef]/5">
          <MapPin className="w-5 h-5 text-[#c9a227] mx-auto mb-2" />
          <p className="text-[10px] text-[#a69b8a] uppercase tracking-wider mb-1">Origin</p>
          <p className="text-xs text-[#f5f3ef]">{oilData.origin.split(',')[0]}</p>
        </div>
      </motion.div>

      {/* Detailed Product Specifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-2xl bg-[#111] border border-[#f5f3ef]/10"
      >
        <h4 className="text-[#f5f3ef] font-medium mb-4 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-[#c9a227]" />
          Product Specifications
        </h4>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#a69b8a]">Botanical Name</dt>
            <dd className="text-[#f5f3ef]">{oilData.technicalName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#a69b8a]">Full Origin</dt>
            <dd className="text-[#f5f3ef] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {oilData.origin}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#a69b8a]">Extraction Method</dt>
            <dd className="text-[#f5f3ef]">{oilData.extractionMethod}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#a69b8a]">Aroma Profile</dt>
            <dd className="text-[#f5f3ef]">{oilData.aroma}</dd>
          </div>
        </dl>
      </motion.div>

      {/* Benefits Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-2 gap-3"
      >
        {oilData.baseProperties.slice(0, 4).map((benefit: string, i: number) => (
          <div
            key={i}
            className="flex items-center gap-2 p-3 rounded-lg bg-[#111] border border-[#f5f3ef]/5"
          >
            <Sparkles className="w-4 h-4 text-[#c9a227] flex-shrink-0" />
            <span className="text-[#f5f3ef]/80 text-sm">{benefit}</span>
          </div>
        ))}
      </motion.div>

      {/* Crystal Selector */}
      {oilData.crystalPairings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl border-2 border-[#c9a227]/30 bg-[#c9a227]/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#c9a227] flex items-center justify-center">
              <Gem className="w-4 h-4 text-[#0a080c]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f5f3ef]">Select Your Crystal</h3>
              <p className="text-xs text-[#a69b8a]">{CRYSTAL_COUNTS[configuration.size.id] || 12} chips included</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {oilData.crystalPairings.map((pairing: CrystalPairing) => (
              <button
                key={pairing.id}
                onClick={() => setConfiguration((prev: any) => ({ ...prev, selectedCrystal: pairing }))}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  configuration.selectedCrystal?.id === pairing.id
                    ? 'border-[#c9a227] bg-[#c9a227]/20'
                    : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${configuration.selectedCrystal?.id === pairing.id ? 'text-[#c9a227]' : 'text-[#f5f3ef]'}`}>
                    {pairing.name}
                  </span>
                  {configuration.selectedCrystal?.id === pairing.id && (
                    <div className="w-5 h-5 bg-[#c9a227] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#0a080c]" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-[#a69b8a] capitalize">{pairing.chakra} • {pairing.element}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Expandable Crystal Synergy Section */}
      {configuration.selectedCrystal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <CrystalSynergyExpandable crystal={configuration.selectedCrystal} />
        </motion.div>
      )}

      {/* FOREVER BOTTLE REFILL SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <RefillPricingSection
          oilId={slug}
          oilName={oilData.commonName}
          selectedSizeId={configuration.size.id}
        />
      </motion.div>
    </>
  )
}
