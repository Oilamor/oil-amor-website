'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Beaker, 
  Droplets, 
  Package, 
  Info, 
  Check, 
  ChevronDown, 
  Sparkles, 
  Gem,
  Zap,
  FlaskConical,
  Eye,
  Droplet,
  CircleDot,
  AlertCircle
} from 'lucide-react'
import {
  BOTTLE_SIZES,
  CARRIER_OILS,
  CORD_OPTIONS,
  type BottleSize,
  type ProductType,
  type CordOption,
} from '@/lib/content/product-config'
import { CARRIER_RATIOS, type RatioPreset } from '@/lib/content/ratio-engine'
import { 
  calculatePrice, 
  getPriceBreakdown, 
  formatPrice, 
  getOilIdFromSlug, 
  CRYSTAL_COUNTS,
  type PricingConfig
} from '@/lib/content/pricing-engine-final'
import type { CrystalPairing } from '@/lib/content/oil-crystal-synergies'

interface ProductConfiguratorProps {
  oil: {
    id: string
    name: string
  }
  selectedCrystal: CrystalPairing | undefined
  externalConfig?: {
    type?: ProductType
    carrier?: string
    ratio?: RatioPreset
    size?: BottleSize
  }
  onConfigurationChange: (config: {
    size: BottleSize
    type: ProductType
    carrier: string
    ratio: RatioPreset | undefined
    selectedCord: CordOption
    price: number
    breakdown: any
    isValid: boolean
    validationMessage?: string
  }) => void
}

// Carrier synergy descriptions
const CARRIER_SYNERGIES: Record<string, Record<string, string>> = {
  'lavender': {
    'jojoba': 'Jojoba extends lavender calming effects for hours—perfect for sleep and anxiety relief',
    'fractionated-coconut': 'Light absorption for quick anxiety relief and pillow mists',
  },
  'eucalyptus': {
    'fractionated-coconut': 'Rapid penetration delivers quick respiratory relief',
    'jojoba': 'Slower release sustains decongestant effects throughout the day',
  },
  'tea-tree': {
    'jojoba': 'Non-comedogenic base enhances acne-fighting power—ideal for problematic skin',
    'fractionated-coconut': 'Odorless carrier lets pure tea tree scent shine through',
  },
  'clove-bud': {
    'jojoba': 'Buffered delivery makes clove safe for sensitive skin application',
    'fractionated-coconut': 'Quick absorption for rapid comfort',
  },
  'lemongrass': {
    'jojoba': 'Balances oil production while delivering lemongrass energizing properties',
    'fractionated-coconut': 'Lightweight for all-over body application',
  },
  'lemon': {
    'jojoba': 'Balances lemon photosensitivity with deep hydration for safe daytime use',
    'fractionated-coconut': 'Clean, odorless base perfect for citrus-forward blends',
  },
  'clary-sage': {
    'jojoba': 'Balances and extends clary sage effects for women wellness',
    'fractionated-coconut': 'Light application for hormone-balancing routines',
  },
  'ginger': {
    'jojoba': 'Extended release perfect for nausea relief throughout the day',
    'fractionated-coconut': 'Quick warming sensation for immediate comfort',
  },
  'cinnamon-bark': {
    'jojoba': 'Gentle buffering allows safe topical application of cinnamon potency',
    'fractionated-coconut': 'Fast absorption for warming comfort',
  },
  'may-chang': {
    'fractionated-coconut': 'Quick absorption delivers uplifting aroma rapidly on-the-go',
    'jojoba': 'Balances may chang intense citrus for all-day wearability',
  },
  'patchouli-dark': {
    'jojoba': 'Earthy synergy creates a grounding, long-lasting scent for meditation',
    'fractionated-coconut': 'Lightweight for layering with other scents',
  },
  'carrot-seed': {
    'jojoba': 'Youthful glow enhancement for aging skin rejuvenation',
    'fractionated-coconut': 'Quick absorption for daily skin routines',
  },
  'geranium-bourbon': {
    'jojoba': 'Balancing harmony enhances geranium hormone-equilibrium effects',
    'fractionated-coconut': 'Light texture perfect for all-over application',
  },
  'juniper-berry': {
    'jojoba': 'Deep cleansing action for congested and problematic skin',
    'fractionated-coconut': 'Lightweight for lymphatic massage',
  },
  'cinnamon-leaf': {
    'jojoba': 'Mild delivery for sensitive individuals seeking comfort',
    'fractionated-coconut': 'Quick warming for immediate sensation',
  },
  'lemon-myrtle': {
    'fractionated-coconut': 'Clean canvas lets lemon myrtle intense citrus profile dominate',
    'jojoba': 'Balances potency for safe daily antimicrobial use',
  },
  'myrrh': {
    'jojoba': 'Sacred ancient pairing for spiritual anointing and meditation practice',
    'fractionated-coconut': 'Light application for modern spiritual use',
  },
  'ylang-ylang': {
    'jojoba': 'Wax esters extend ylang ylang aphrodisiac effects—ideal for massage and intimacy',
    'fractionated-coconut': 'Light, odorless base lets the exotic floral notes shine through',
  },
  'rosemary': {
    'jojoba': 'Extended release sustains rosemary cognitive enhancement throughout study or work sessions',
    'fractionated-coconut': 'Quick absorption for immediate mental clarity and focus',
  },
  'camphor-white': {
    'jojoba': 'Intense warming sensation sustained for deep muscle relief and respiratory support',
    'fractionated-coconut': 'Rapid penetration delivers quick heating effect for congestion relief',
  },
  'vetiver': {
    'jojoba': 'Wax esters extend vetiver deep grounding for hours—ideal for meditation and sleep',
    'fractionated-coconut': 'Light base lets vetiver smoky earthiness shine for daily grounding',
  },
  'ho-wood': {
    'jojoba': 'Wax esters extend ho wood gentle rose-like aroma for prolonged skin healing',
    'fractionated-coconut': 'Light base lets ho wood sweet floral notes shine for daily wear',
  },
  'wintergreen': {
    'jojoba': 'Extended release provides prolonged warming relief for deep muscle and joint comfort',
    'fractionated-coconut': 'Quick absorption delivers rapid penetration for immediate pain relief',
  },
  'cypress': {
    'jojoba': 'Wax esters extend cypress toning effects for prolonged circulatory and lymphatic support',
    'fractionated-coconut': 'Light penetration delivers quick absorption for immediate toning and refreshing',
  },
  'basil-linalool': {
    'jojoba': 'Wax esters extend basil calming properties for sustained emotional balance and mental clarity',
    'fractionated-coconut': 'Quick absorption delivers immediate uplifting and clarifying effects',
  },
  'oregano': {
    'jojoba': 'Wax esters moderate oregano intensity for sustained antimicrobial protection',
    'fractionated-coconut': 'Light base allows rapid absorption for quick immune support',
  },
}

// Recommended carriers
const RECOMMENDED_CARRIERS: Record<string, string> = {
  'lavender': 'jojoba',
  'eucalyptus': 'fractionated-coconut',
  'tea-tree': 'jojoba',
  'clove-bud': 'jojoba',
  'lemongrass': 'jojoba',
  'lemon': 'jojoba',
  'clary-sage': 'jojoba',
  'ginger': 'fractionated-coconut',
  'cinnamon-bark': 'jojoba',
  'may-chang': 'fractionated-coconut',
  'patchouli-dark': 'jojoba',
  'ylang-ylang': 'jojoba',
  'carrot-seed': 'jojoba',
  'geranium-bourbon': 'jojoba',
  'juniper-berry': 'jojoba',
  'cinnamon-leaf': 'jojoba',
  'lemon-myrtle': 'fractionated-coconut',
  'myrrh': 'jojoba',
}

// Detailed carrier education
const CARRIER_EDUCATION = {
  'jojoba': {
    title: 'Jojoba Oil',
    subtitle: 'Liquid Wax Ester',
    description: 'The only plant source of liquid wax esters. Molecularly 98% identical to human sebum, making it uniquely balancing for all skin types.',
    benefits: ['Balances sebum production', 'Non-comedogenic', 'Indefinite shelf life', 'Superior for facial care'],
    science: 'Simmondsia chinensis - a wax ester, not a true oil. Contains straight-chain wax esters and small amounts of triglycerides.',
    bestFor: 'Facial serums, acne-prone skin, mature skin, daily face oils, regulating oil production',
    texture: 'Silky, medium absorption with sustained release',
    skinTypes: 'All skin types - especially oily, acne-prone, and mature skin',
  },
  'fractionated-coconut': {
    title: 'Fractionated Coconut Oil',
    subtitle: 'Caprylic/Capric Triglycerides',
    description: 'Long-chain fatty acids removed through fractionation, leaving only medium-chain triglycerides. Never solidifies, completely odorless.',
    benefits: ['Never solidifies (-20°C to 100°C)', 'Completely odorless', 'Fast absorption', 'Won\'t stain fabrics'],
    science: 'Cocos nucifera - fractionated to remove C12-C18 fatty acids. Contains only Caprylic (C8) and Capric (C10) triglycerides.',
    bestFor: 'Full body massage, sensitive skin, hot climates, large area application, beginners',
    texture: 'Featherlight, fast absorption with dry finish',
    skinTypes: 'All skin types - especially sensitive and those avoiding nut oils',
  },
}

// Miron Violetglass benefits
const MIRON_BENEFITS = [
  { icon: Eye, title: 'UV Protection', desc: 'Violet glass blocks harmful light while allowing beneficial violet rays' },
  { icon: Droplet, title: 'Preserves Potency', desc: 'Maintains oil integrity and extends shelf life naturally' },
  { icon: CircleDot, title: 'Energetic Quality', desc: 'Ancient Egyptians used violet glass for sacred preservation' },
]

export function ProductConfigurator({
  oil,
  selectedCrystal,
  externalConfig,
  onConfigurationChange,
}: ProductConfiguratorProps) {
  const oilId = getOilIdFromSlug(oil.id)
  const recommendedCarrierId = RECOMMENDED_CARRIERS[oilId]
  const defaultCarrierId = recommendedCarrierId || 'jojoba'
  
  const [selectedSize, setSelectedSize] = useState<BottleSize>(externalConfig?.size || BOTTLE_SIZES[0])
  const [selectedType, setSelectedType] = useState<ProductType>(externalConfig?.type || 'pure')
  const [selectedCarrier, setSelectedCarrier] = useState(externalConfig?.carrier || defaultCarrierId)
  const [selectedRatio, setSelectedRatio] = useState<RatioPreset>(externalConfig?.ratio || CARRIER_RATIOS[2])
  const [selectedCord, setSelectedCord] = useState<CordOption>(CORD_OPTIONS[0])
  const [showDilutionInfo, setShowDilutionInfo] = useState(false)
  const [showCordOptions, setShowCordOptions] = useState(false)
  const [showMironInfo, setShowMironInfo] = useState(false)
  
  // Sync with external config when it changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (externalConfig?.type && externalConfig.type !== selectedType) {
      setSelectedType(externalConfig.type)
    }
    if (externalConfig?.carrier && externalConfig.carrier !== selectedCarrier) {
      setSelectedCarrier(externalConfig.carrier)
    }
    if (externalConfig?.ratio && externalConfig.ratio.id !== selectedRatio.id) {
      setSelectedRatio(externalConfig.ratio)
    }
    if (externalConfig?.size && externalConfig.size.id !== selectedSize.id) {
      setSelectedSize(externalConfig.size)
    }
  }, [externalConfig])

  const crystalCount = selectedSize ? CRYSTAL_COUNTS[selectedSize.id] || 12 : 12
  const carrierOptions = CARRIER_OILS.filter(c => c.id !== 'pure')

  // Validation - check if all required selections are made
  const isValid = useMemo(() => {
    if (!selectedCrystal) return false
    if (selectedType === 'carrier' && !selectedCarrier) return false
    return true
  }, [selectedCrystal, selectedType, selectedCarrier])

  const validationMessage = useMemo(() => {
    if (!selectedCrystal) return 'Please select a crystal to continue'
    if (selectedType === 'carrier' && !selectedCarrier) return 'Please select a carrier oil'
    return undefined
  }, [selectedCrystal, selectedType, selectedCarrier])

  const { price, breakdown } = useMemo(() => {
    const ratioDecimal = selectedRatio.essentialOilPercent / 100
    
    const config: PricingConfig = {
      oilId: oil.id,
      sizeMl: selectedSize.volume,
      type: selectedType,
      ratio: selectedType === 'carrier' ? ratioDecimal : 1.0,
    }
    
    const basePrice = calculatePrice(config)
    const bd = getPriceBreakdown(config)
    
    const totalPrice = basePrice + selectedCord.price
    
    return {
      price: totalPrice,
      breakdown: bd || {
        bottle: 4,
        oil: 0,
        carrier: 0,
        crystals: crystalCount * 0.25,
        labor: selectedType === 'pure' ? 5 : 6,
        total: totalPrice,
      }
    }
  }, [oil.id, selectedSize.volume, selectedType, selectedRatio.essentialOilPercent, selectedCord.price, crystalCount])

  const prevConfigRef = useRef('')
  
  useEffect(() => {
    const configKey = `${selectedSize.id}-${selectedType}-${selectedCarrier}-${selectedRatio.id}-${selectedCord.id}-${price}-${isValid}`
    
    if (prevConfigRef.current !== configKey) {
      prevConfigRef.current = configKey
      onConfigurationChange({
        size: selectedSize,
        type: selectedType,
        carrier: selectedCarrier,
        ratio: selectedType === 'carrier' ? selectedRatio : undefined,
        selectedCord,
        price: price > 0 ? price : 25.00,
        breakdown,
        isValid,
        validationMessage,
      })
    }
  }, [selectedSize, selectedType, selectedCarrier, selectedRatio, selectedCord, price, breakdown, isValid, validationMessage, onConfigurationChange])

  useEffect(() => {
    if (selectedType === 'carrier') {
      setSelectedCarrier(defaultCarrierId)
      setSelectedRatio(CARRIER_RATIOS[2])
    }
  }, [selectedType, defaultCarrierId])

  const getCarrierSynergy = (carrierId: string) => {
    return CARRIER_SYNERGIES[oilId]?.[carrierId] || null
  }

  const currentSynergy = getCarrierSynergy(selectedCarrier)
  const isRecommendedCarrier = recommendedCarrierId === selectedCarrier

  const getRatioColor = (percent: number) => {
    if (percent <= 5) return { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Gentle' }
    if (percent <= 10) return { bg: 'bg-blue-500', text: 'text-blue-400', label: 'Mild' }
    if (percent <= 25) return { bg: 'bg-[#c9a227]', text: 'text-[#c9a227]', label: 'Balanced' }
    if (percent <= 50) return { bg: 'bg-orange-500', text: 'text-orange-400', label: 'Strong' }
    return { bg: 'bg-red-500', text: 'text-red-400', label: 'Intense' }
  }

  const ratioColors = getRatioColor(selectedRatio.essentialOilPercent)

  return (
    <div className="space-y-6">
      
      {/* PRODUCT TYPE */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-[#c9a227]" />
          <h3 className="text-sm font-medium text-[#f5f3ef]">Product Type</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedType('pure')}
            className={`group relative p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${
              selectedType === 'pure'
                ? 'border-[#c9a227] bg-[#c9a227]/10'
                : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#f5f3ef]">Pure Essential Oil</span>
                {selectedType === 'pure' && (
                  <div className="w-6 h-6 rounded-full bg-[#c9a227] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#0a080c]" />
                  </div>
                )}
              </div>
              <p className="text-xs text-[#a69b8a] mb-2">Concentrated therapeutic grade</p>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-1 rounded bg-[#c9a227]/20 text-[#c9a227]">Glass Dropper</span>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedType('carrier')}
            className={`group relative p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${
              selectedType === 'carrier'
                ? 'border-[#c9a227] bg-[#c9a227]/10'
                : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#f5f3ef]">Carrier Enhanced</span>
                {selectedType === 'carrier' && (
                  <div className="w-6 h-6 rounded-full bg-[#c9a227] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#0a080c]" />
                  </div>
                )}
              </div>
              <p className="text-xs text-[#a69b8a] mb-2">Pre-diluted for safe application</p>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-1 rounded bg-[#c9a227]/20 text-[#c9a227]">Roller Ball</span>
              </div>
            </div>
          </button>
        </div>

        {/* Miron Violetglass Info */}
        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
          <button 
            onClick={() => setShowMironInfo(!showMironInfo)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
                <Eye className="w-3 h-3 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-purple-300">Miron Violetglass Bottle</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${showMironInfo ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showMironInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-purple-500/20 space-y-2"
              >
                {MIRON_BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-2">
                    <benefit.icon className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-purple-200">{benefit.title}</p>
                      <p className="text-[10px] text-purple-400/70">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* CARRIER ENHANCED ONLY - CARRIER OIL SELECTION (MOVED TO TOP) */}
      {selectedType === 'carrier' && (
        <>
          {/* Carrier Oil - NOW FIRST */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#c9a227]" />
              <h3 className="text-sm font-medium text-[#f5f3ef]">Select Carrier Oil</h3>
              {isRecommendedCarrier && (
                <span className="px-2 py-0.5 bg-[#c9a227]/20 text-[#c9a227] text-[10px] font-medium rounded-full">Recommended for {oil.name}</span>
              )}
            </div>
            
            {/* Educational Intro */}
            <div className="p-3 rounded-xl bg-[#c9a227]/5 border border-[#c9a227]/20">
              <p className="text-xs text-[#a69b8a] leading-relaxed">
                Both carriers are premium quality with indefinite shelf life. 
                <strong className="text-[#f5f3ef]"> Jojoba</strong> is a liquid wax ester (98% similar to skin sebum) - superior for facial care. 
                <strong className="text-[#f5f3ef]"> Fractionated Coconut</strong> stays liquid at any temperature and is completely odorless.
              </p>
            </div>
            
            {/* Horizontal Scrolling Carrier Selector - WIDER CARDS */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {carrierOptions.map((carrier) => {
                const education = CARRIER_EDUCATION[carrier.id as keyof typeof CARRIER_EDUCATION]
                const isSelected = selectedCarrier === carrier.id
                const isRecommended = recommendedCarrierId === carrier.id
                
                return (
                  <button
                    key={carrier.id}
                    onClick={() => setSelectedCarrier(carrier.id)}
                    className={`flex-shrink-0 p-4 rounded-xl border-2 transition-all text-left w-56 ${
                      isSelected
                        ? 'border-[#c9a227] bg-[#c9a227]/10'
                        : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                        style={{ backgroundColor: carrier.color }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#f5f3ef]' : 'text-[#a69b8a]'}`}>
                            {carrier.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#c9a227]" />}
                        </div>
                        {isRecommended && (
                          <span className="text-[9px] text-[#c9a227]">Recommended</span>
                        )}
                        <p className="text-[11px] text-[#a69b8a] mt-1 leading-relaxed">{education.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Selected Carrier Education Panel */}
            {selectedCarrier && (
              <div className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#c9a227] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-[#f5f3ef]">
                      <span className="text-[#c9a227] font-medium">{CARRIER_EDUCATION[selectedCarrier as keyof typeof CARRIER_EDUCATION].subtitle}:</span>{' '}
                      {CARRIER_EDUCATION[selectedCarrier as keyof typeof CARRIER_EDUCATION].science}
                    </p>
                    <p className="text-[10px] text-[#a69b8a] mt-1">
                      Best for: {CARRIER_EDUCATION[selectedCarrier as keyof typeof CARRIER_EDUCATION].bestFor}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Synergy Display */}
            {currentSynergy && (
              <div className={`p-4 rounded-xl border-l-4 ${isRecommendedCarrier ? 'bg-[#c9a227]/10 border-[#c9a227]' : 'bg-[#111] border-[#f5f3ef]/30'}`}>
                <p className="text-xs text-[#a69b8a] leading-relaxed">
                  <span className={isRecommendedCarrier ? 'text-[#c9a227] font-bold' : 'text-[#f5f3ef] font-bold'}>
                    {isRecommendedCarrier ? '✦ Recommended Pairing: ' : 'Synergy: '}
                  </span>
                  {currentSynergy}
                </p>
              </div>
            )}
          </section>

          {/* Enhancement Strength */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#c9a227]" />
                <h3 className="text-sm font-medium text-[#f5f3ef]">Enhancement Strength</h3>
              </div>
              <button
                onClick={() => setShowDilutionInfo(!showDilutionInfo)}
                className="flex items-center gap-1 text-xs text-[#a69b8a] hover:text-[#c9a227]"
              >
                <Info className="w-3 h-3" />
                <span>Guide</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDilutionInfo ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Visual Bar */}
            <div className="relative h-14 bg-[#111] rounded-xl border border-[#f5f3ef]/10 overflow-hidden">
              <motion.div
                className={`absolute left-0 top-0 bottom-0 ${ratioColors.bg} flex items-center justify-center`}
                animate={{ width: `${selectedRatio.essentialOilPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {selectedRatio.essentialOilPercent >= 12 && (
                  <span className="text-[#0a080c] font-bold text-lg">{selectedRatio.essentialOilPercent}%</span>
                )}
              </motion.div>
              <motion.div
                className="absolute right-0 top-0 bottom-0 bg-[#1a1a1a] flex items-center justify-center"
                animate={{ width: `${100 - selectedRatio.essentialOilPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {selectedRatio.carrierOilPercent >= 35 && (
                  <span className="text-[#a69b8a] text-xs font-medium">{selectedRatio.carrierOilPercent}% Carrier</span>
                )}
              </motion.div>
            </div>

            {/* Ratio Selector */}
            <div className="grid grid-cols-5 gap-2">
              {CARRIER_RATIOS.filter(r => r.essentialOilPercent <= 75).map((ratio) => {
                const colors = getRatioColor(ratio.essentialOilPercent)
                return (
                  <button
                    key={ratio.id}
                    onClick={() => setSelectedRatio(ratio)}
                    className={`relative p-2 rounded-lg border-2 transition-all ${
                      selectedRatio.id === ratio.id
                        ? `border-[#c9a227] bg-[#c9a227]/10`
                        : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
                    }`}
                  >
                    <div className={`text-lg font-bold text-center ${selectedRatio.id === ratio.id ? colors.text : 'text-[#f5f3ef]'}`}>
                      {ratio.essentialOilPercent}%
                    </div>
                    <div className={`text-[9px] text-center uppercase font-medium ${selectedRatio.id === ratio.id ? colors.text : 'text-[#a69b8a]'}`}>
                      {colors.label}
                    </div>
                    {selectedRatio.id === ratio.id && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#c9a227] rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected Info */}
            <div className="p-3 rounded-xl bg-[#111] border border-[#f5f3ef]/10">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-bold ${ratioColors.text}`}>{selectedRatio.name}</span>
                <span className="text-xs text-[#a69b8a]">• {selectedRatio.essentialOilPercent}% Essential / {selectedRatio.carrierOilPercent}% {CARRIER_OILS.find(c => c.id === selectedCarrier)?.name || 'Carrier'}</span>
              </div>
              <p className="text-xs text-[#a69b8a]">{selectedRatio.description}</p>
            </div>

            {showDilutionInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-[#111] border border-[#f5f3ef]/10 text-xs space-y-2"
              >
                <p className="text-emerald-400"><strong className="text-emerald-300">5% Gentle:</strong> Facial, children, sensitive skin</p>
                <p className="text-blue-400"><strong className="text-blue-300">10% Mild:</strong> Daily use, bath, maintenance</p>
                <p className="text-[#c9a227]"><strong className="text-[#c9a227]">25% Balanced:</strong> Standard therapeutic</p>
                <p className="text-orange-400"><strong className="text-orange-300">50% Strong:</strong> Targeted, short-term</p>
                <p className="text-red-400"><strong className="text-red-300">75% Intense:</strong> Maximum strength</p>
              </motion.div>
            )}
          </section>
        </>
      )}

      {/* BOTTLE SIZE - NOW AFTER CARRIER FOR CARRIER ENHANCED */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-[#c9a227]" />
            <h3 className="text-sm font-medium text-[#f5f3ef]">Bottle Size</h3>
          </div>
          <span className="text-[10px] text-[#a69b8a]">{selectedSize.crystalChips} crystal chips included</span>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {BOTTLE_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => setSelectedSize(size)}
              className={`relative py-2 px-1 rounded-lg border transition-all ${
                selectedSize.id === size.id
                  ? 'border-[#c9a227] bg-[#c9a227]/10'
                  : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
              }`}
            >
              <div className="text-center">
                <div className={`text-sm font-bold ${selectedSize.id === size.id ? 'text-[#c9a227]' : 'text-[#f5f3ef]'}`}>
                  {size.label}
                </div>
                <div className="text-[9px] text-[#a69b8a] mt-0.5 leading-tight">{size.crystalChips} chips</div>
              </div>
              {size.id === '30ml' && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0 bg-[#c9a227] text-[#0a080c] text-[8px] font-bold rounded-full">
                  Value
                </span>
              )}
            </button>
          ))}
        </div>
        
        <p className="text-[10px] text-[#a69b8a] text-center leading-tight">
          Pre-drilled crystal chips thread onto your cord to create custom jewelry
        </p>
      </section>

      {/* CORD SELECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#c9a227]" />
            <h3 className="text-sm font-medium text-[#f5f3ef]">Your Cord or Pendant</h3>
          </div>
          <span className="text-xs text-[#a69b8a]">Free with every order</span>
        </div>
        
        <p className="text-xs text-[#a69b8a]">
          Thread your {crystalCount} pre-drilled crystal chips to create custom jewelry, or choose a mystery pendant
        </p>
        
        {/* Selected Display */}
        <button
          onClick={() => setShowCordOptions(!showCordOptions)}
          className={`w-full p-4 rounded-xl border-2 transition-all ${
            selectedCord.id === 'mystery-pendant'
              ? 'border-purple-500/50 bg-purple-500/10'
              : 'border-[#c9a227]/50 bg-[#c9a227]/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedCord.id === 'mystery-pendant' ? 'bg-purple-500/20' : 'bg-[#c9a227]/20'
                }`}
                style={selectedCord.id !== 'mystery-pendant' ? { backgroundColor: selectedCord.color + '30' } : {}}
              >
                {selectedCord.id === 'mystery-pendant' ? (
                  <Sparkles className="w-5 h-5 text-purple-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedCord.color }} />
                )}
              </div>
              <div className="text-left">
                <span className={`text-sm font-bold ${selectedCord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'}`}>
                  {selectedCord.name}
                </span>
                <p className="text-xs text-[#a69b8a]">{selectedCord.material}</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-[#a69b8a] transition-transform ${showCordOptions ? 'rotate-180' : ''}`} />
          </div>
          
          {selectedCord.synergy && (
            <p className="mt-2 pt-2 border-t border-[#f5f3ef]/10 text-xs text-[#a69b8a] italic">
              &ldquo;{selectedCord.synergy}&rdquo;
            </p>
          )}
        </button>
        
        <AnimatePresence>
          {showCordOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {CORD_OPTIONS.filter(c => c.id !== selectedCord.id).map((cord) => (
                <button
                  key={cord.id}
                  onClick={() => {
                    setSelectedCord(cord)
                    setShowCordOptions(false)
                  }}
                  className={`w-full p-3 rounded-xl border transition-all text-left ${
                    cord.id === 'mystery-pendant'
                      ? 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50'
                      : 'border-[#f5f3ef]/10 bg-[#111] hover:border-[#f5f3ef]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        cord.id === 'mystery-pendant' ? 'bg-purple-500/20' : ''
                      }`}
                      style={cord.id !== 'mystery-pendant' ? { backgroundColor: cord.color + '30' } : {}}
                    >
                      {cord.id === 'mystery-pendant' ? (
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      ) : (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cord.color }} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${cord.id === 'mystery-pendant' ? 'text-purple-300' : 'text-[#f5f3ef]'}`}>
                          {cord.name}
                        </span>
                        {cord.id === 'mystery-pendant' && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[9px] rounded">No Cord</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#a69b8a]">{cord.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Validation Warning */}
      {!isValid && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{validationMessage}</p>
        </motion.div>
      )}

      {/* TOTAL */}
      <section className="pt-4 border-t border-[#f5f3ef]/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[#a69b8a] text-sm">Total Investment</span>
            <p className="text-xs text-[#a69b8a]/70">Includes Miron bottle & {crystalCount} crystal chips</p>
          </div>
          <span className="text-4xl font-light text-[#f5f3ef]">{formatPrice(price > 0 ? price : 25)}</span>
        </div>

        <div className="flex items-center justify-center gap-6 text-[10px] text-[#a69b8a]">
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#c9a227]" /> Free Shipping AU</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#c9a227]" /> 30-Day Returns</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#c9a227]" /> Handcrafted</span>
        </div>
      </section>
    </div>
  )
}

export default ProductConfigurator