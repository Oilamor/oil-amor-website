'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Shield,
  Sparkles,
  Droplets,
  Wind,
  ArrowRight,
  Check,
  Info,
  ShoppingBag,
  Leaf,
  Beaker,
  Crown,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStockBadgeState } from '@/lib/inventory/client'
import { useComponentStockStatuses } from '@/app/components/stock-status-badge'

// ============================================================================
// BOTTLE & CAP DATA
// ============================================================================

interface BottleProduct {
  id: string
  name: string
  description: string
  size?: string
  price: number
  features: string[]
  image: string
  type: 'bottle' | 'cap' | 'pipette'
}

const BOTTLE_PRODUCTS: BottleProduct[] = [
  {
    id: 'bottle-5ml',
    name: '5ml Orion MIRON Violetglass DIN18 Bottle',
    description: 'Compact Miron violet glass bottle. Perfect for samples, travel sizes, and precious blends.',
    size: '5ml',
    price: 4.95,
    features: ['Genuine Miron Violetglass', 'Blocks 100% of UV-A & UV-B rays', 'DIN18 neck finish', 'Preserves potency for years'],
    image: '/images/bottles/bottle-5ml.webp',
    type: 'bottle',
  },
  {
    id: 'bottle-10ml',
    name: '10ml Orion MIRON Violetglass DIN18 Bottle',
    description: 'The ideal size for roller applications and small custom blends.',
    size: '10ml',
    price: 5.95,
    features: ['Genuine Miron Violetglass', 'Blocks 100% of UV-A & UV-B rays', 'DIN18 neck finish', 'Preserves potency for years'],
    image: '/images/bottles/bottle-10ml.webp',
    type: 'bottle',
  },
  {
    id: 'bottle-15ml',
    name: '15ml Orion MIRON Violetglass DIN18 Bottle',
    description: 'A versatile mid-size bottle for everyday essential oil storage.',
    size: '15ml',
    price: 6.95,
    features: ['Genuine Miron Violetglass', 'Blocks 100% of UV-A & UV-B rays', 'DIN18 neck finish', 'Preserves potency for years'],
    image: '/images/bottles/bottle-15ml.webp',
    type: 'bottle',
  },
  {
    id: 'bottle-20ml',
    name: '20ml Orion MIRON Violetglass DIN18 Bottle',
    description: 'Generous capacity for custom blends while maintaining compact portability.',
    size: '20ml',
    price: 7.95,
    features: ['Genuine Miron Violetglass', 'Blocks 100% of UV-A & UV-B rays', 'DIN18 neck finish', 'Preserves potency for years'],
    image: '/images/bottles/bottle-20ml.webp',
    type: 'bottle',
  },
  {
    id: 'bottle-30ml',
    name: '30ml Orion MIRON Violetglass DIN18 Bottle',
    description: 'Our most popular bottle size for dedicated blends and daily use.',
    size: '30ml',
    price: 8.95,
    features: ['Genuine Miron Violetglass', 'Blocks 100% of UV-A & UV-B rays', 'DIN18 neck finish', 'Preserves potency for years'],
    image: '/images/bottles/bottle-30ml.webp',
    type: 'bottle',
  },
  {
    id: 'cap-rollon',
    name: 'Screw Cap Black with Glass Roll-On Fitment',
    description: 'Premium black screw cap with glass roll-on fitment for DIN18 bottles. Smooth, even application.',
    price: 2.95,
    features: ['Glass roll-on fitment', 'For DIN18 bottles', 'Smooth application', 'Leak-proof design'],
    image: '/images/bottles/cap-rollon.webp',
    type: 'cap',
  },
  {
    id: 'cap-dropper-ribbed',
    name: 'Screw Cap with Vertical Dropper 1.0mm — Ribbed Wall',
    description: 'Black tamper-evident screw cap with 1.0mm vertical dropper. Ribbed wall design.',
    price: 1.95,
    features: ['1.0mm vertical dropper', 'Tamper-evident', 'DIN18 black cap', 'Ribbed wall'],
    image: '/images/bottles/cap-dropper-ribbed.webp',
    type: 'cap',
  },
  {
    id: 'cap-dropper-smooth',
    name: 'Screw Cap with Vertical Dropper 2.0mm — Smooth Wall',
    description: 'Black tamper-evident screw cap with 2.0mm vertical dropper. Smooth wall design.',
    price: 1.95,
    features: ['2.0mm vertical dropper', 'Tamper-evident', 'DIN18 black cap', 'Smooth wall'],
    image: '/images/bottles/cap-dropper-smooth.webp',
    type: 'cap',
  },
  {
    id: 'cap-pourer-ribbed',
    name: 'Tamper Evident Screw Cap with Pourer — Ribbed Wall',
    description: 'Black tamper-evident screw cap III with integrated pourer for DIN18 bottles. Ribbed wall.',
    price: 2.45,
    features: ['Integrated pourer', 'Tamper-evident', 'DIN18 black cap', 'Ribbed wall'],
    image: '/images/bottles/cap-pourer-ribbed.webp',
    type: 'cap',
  },
  {
    id: 'cap-pourer-smooth',
    name: 'Tamper Evident Screw Cap with Pourer — Smooth Wall',
    description: 'Black tamper-evident screw cap III with integrated pourer for DIN18 bottles. Smooth wall.',
    price: 2.45,
    features: ['Integrated pourer', 'Tamper-evident', 'DIN18 black cap', 'Smooth wall'],
    image: '/images/bottles/cap-pourer-smooth.webp',
    type: 'cap',
  },
  {
    id: 'pipette-5ml',
    name: 'TE III Pipette Black — for 5ml Orion Bottle',
    description: 'Black TE III pipette with 0.7ml TPE bulb and glass stem. Fits 5ml Orion bottle.',
    size: '5ml',
    price: 1.95,
    features: ['0.7ml TPE bulb', 'Glass stem', 'TE III tamper-evident', 'For 5ml Orion'],
    image: '/images/bottles/pipette-5ml.webp',
    type: 'pipette',
  },
  {
    id: 'pipette-10ml',
    name: 'TE III Pipette Black — for 10ml Orion Bottle',
    description: 'Black TE III pipette with 0.7ml TPE bulb and glass stem. Fits 10ml Orion bottle.',
    size: '10ml',
    price: 2.10,
    features: ['0.7ml TPE bulb', 'Glass stem', 'TE III tamper-evident', 'For 10ml Orion'],
    image: '/images/bottles/pipette-10ml.webp',
    type: 'pipette',
  },
  {
    id: 'pipette-15ml',
    name: 'TE III Pipette Black — for 15ml Orion Bottle',
    description: 'Black TE III pipette with 0.7ml TPE bulb and glass stem. Fits 15ml Orion bottle.',
    size: '15ml',
    price: 2.25,
    features: ['0.7ml TPE bulb', 'Glass stem', 'TE III tamper-evident', 'For 15ml Orion'],
    image: '/images/bottles/pipette-15ml.webp',
    type: 'pipette',
  },
  {
    id: 'pipette-20ml',
    name: 'TE III Pipette Black — for 20ml Orion Bottle',
    description: 'Black TE III pipette with 0.7ml TPE bulb and glass stem. Fits 20ml Orion bottle.',
    size: '20ml',
    price: 2.40,
    features: ['0.7ml TPE bulb', 'Glass stem', 'TE III tamper-evident', 'For 20ml Orion'],
    image: '/images/bottles/pipette-20ml.webp',
    type: 'pipette',
  },
  {
    id: 'pipette-30ml',
    name: 'TE III Pipette Black — for 30ml Orion Bottle',
    description: 'Black TE III pipette with 0.7ml TPE bulb and glass stem. Fits 30ml Orion bottle.',
    size: '30ml',
    price: 2.55,
    features: ['0.7ml TPE bulb', 'Glass stem', 'TE III tamper-evident', 'For 30ml Orion'],
    image: '/images/bottles/pipette-30ml.webp',
    type: 'pipette',
  },
]

// ============================================================================
// SCIENTIFIC FACTS ABOUT MIRON GLASS
// ============================================================================

const MIRON_SCIENCE = [
  {
    title: 'Violet Light Protection',
    description: 'Miron glass blocks the complete spectrum of visible light except for violet and infrared rays, which have been shown to enhance the molecular structure of organic materials.',
    icon: Sparkles,
  },
  {
    title: 'UV Radiation Blocking',
    description: 'Unlike clear, amber, or green glass, Miron violet glass blocks 100% of UV-A and UV-B rays, preventing photo-oxidation and degradation of sensitive compounds.',
    icon: Shield,
  },
  {
    title: 'Natural Preservation',
    description: 'Studies demonstrate that rose water stored in Miron glass maintains its natural pH balance and active compounds for years, versus months in conventional glass.',
    icon: Leaf,
  },
  {
    title: 'Laboratory Grade',
    description: 'Developed in Europe and used by laboratories worldwide, Miron glass offers unmatched protection for sensitive organic materials like essential oils.',
    icon: Beaker,
  },
]

// ============================================================================
// COMPARISON DATA
// ============================================================================

const GLASS_COMPARISON = [
  { feature: 'UV-A Protection', clear: '0%', amber: '60%', miron: '100%' },
  { feature: 'UV-B Protection', clear: '0%', amber: '40%', miron: '100%' },
  { feature: 'Visible Light Blocking', clear: '0%', amber: '70%', miron: '99%' },
  { feature: 'Infrared Transmission', clear: 'Yes', amber: 'Partial', miron: 'Optimized' },
  { feature: 'Violet Light Entry', clear: 'Yes', amber: 'No', miron: 'Yes (Beneficial)' },
  { feature: 'Shelf Life Extension', clear: '3-6 months', amber: '6-12 months', miron: '24+ months' },
]

// ============================================================================
// COMPONENT: Science Card
// ============================================================================

function ScienceCard({ fact, index }: { fact: typeof MIRON_SCIENCE[0]; index: number }) {
  const Icon = fact.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#2d1b4e]/50 to-[#1a1033] p-6"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5CF6]/20">
        <Icon className="h-6 w-6 text-[#A855F7]" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-white">{fact.title}</h3>
      <p className="text-sm leading-relaxed text-[#c4b5fd]">{fact.description}</p>
    </motion.div>
  )
}

// ============================================================================
// COMPONENT: Product Card
// ============================================================================

function highlightName(name: string) {
  const parts = name.split(/(5ml|10ml|15ml|20ml|30ml|dropper|pourer|roll[- ]?on)/gi)
  return parts.map((part, i) => {
    if (/^(5ml|10ml|15ml|20ml|30ml|dropper|pourer|roll[- ]?on)$/i.test(part)) {
      return (
        <span key={i} className="text-[#c9a227]">
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function ProductCard({ product, index }: { product: BottleProduct; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const { components, loading } = useComponentStockStatuses()

  // Bottles are tracked per size in the component stock map. Caps and pipettes
  // share the single CAP-STANDARD SKU (not exposed per-product by the API) and
  // are preorder at launch, so they always show as pre-order. A missing entry
  // never claims in-stock.
  const status = loading
    ? ('loading' as const)
    : product.type === 'bottle'
      ? (components?.bottle?.[product.size ?? '']?.status ?? ('preorder' as const))
      : ('preorder' as const)
  const badge = getStockBadgeState(status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border transition-all duration-300',
          isHovered
            ? 'border-[#8B5CF6] bg-[#2d1b4e]/80 shadow-xl shadow-[#8B5CF6]/20'
            : 'border-[#f5f3ef]/10 bg-[#111]'
        )}
      >
        {/* Product Image */}
        <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-[#2d1b4e] to-[#1a1033] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#8B5CF6]/10 via-transparent to-transparent" />
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={cn(
              'object-contain p-6 transition-transform duration-500',
              isHovered && 'scale-110'
            )}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {product.size && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#8B5CF6] px-3 py-1 text-xs font-medium text-white">
              {product.size}
            </div>
          )}
          {status === 'out' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="rounded-full bg-[#f5f3ef]/10 px-4 py-2 text-sm font-medium text-[#f5f3ef]">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="font-serif text-base leading-snug text-[#f5f3ef]">
              {highlightName(product.name)}
            </h3>
            <span className="whitespace-nowrap font-display text-xl text-[#c9a227]">
              ${product.price.toFixed(2)}
            </span>
          </div>

          <p className="mb-4 line-clamp-2 text-sm text-[#a69b8a]">
            {product.description}
          </p>

          {/* Features Toggle */}
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="mb-3 flex items-center gap-1 text-xs text-[#8B5CF6] transition-colors hover:text-[#A855F7]"
          >
            {showFeatures ? (
              <>
                Hide features <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                View features <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>

          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4 overflow-hidden"
              >
                <ul className="space-y-2">
                  {product.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#a69b8a]">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#8B5CF6]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stock Status — standalone bottle purchases aren't supported at
              checkout, so this is display-only; everything ships as pre-order */}
          <div
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium',
              badge.variant === 'in-stock'
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : badge.variant === 'preorder'
                  ? 'border-[#c9a227]/30 bg-[#c9a227]/10 text-[#f5e6c8]'
                  : 'border-[#f5f3ef]/15 bg-[#f5f3ef]/5 text-[#a69b8a]'
            )}
          >
            {badge.variant === 'in-stock' ? (
              <Zap className="h-4 w-4" />
            ) : badge.variant === 'preorder' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            {badge.label}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BottlesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'bottle' | 'cap' | 'pipette'>('all')
  const [showComparison, setShowComparison] = useState(false)

  const filteredProducts = BOTTLE_PRODUCTS.filter(
    (product) => activeTab === 'all' || product.type === activeTab
  )

  return (
    <main className="min-h-screen bg-[#0a080c]">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-20 pt-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d1b4e]/30 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[#8B5CF6]/10 blur-[150px]" />

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-center gap-2"
          >
            <span className="flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/20 px-4 py-1.5 text-sm font-medium text-[#A855F7]">
              <Crown className="h-4 w-4" />
              Premium Collection
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-center font-serif text-4xl text-white md:text-6xl"
          >
            Miron Violet Glass
            <span className="block text-[#A855F7]">Bottles & Caps</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-center text-lg text-[#c4b5fd]"
          >
            The same laboratory-grade Orion MIRON violet glass and premium closures
            we use for our essential oils, now available for your own blends.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12 flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: Shield, text: 'UV Protection' },
              { icon: Sparkles, text: 'Preserves Potency' },
              { icon: Leaf, text: 'Natural Preservation' },
              { icon: Droplets, text: 'Laboratory Grade' },
            ].map((benefit, i) => (
              <span
                key={i}
                className="flex items-center gap-2 rounded-full border border-[#8B5CF6]/30 bg-[#1a1033] px-4 py-2 text-sm text-[#ddd6fe]"
              >
                <benefit.icon className="h-4 w-4 text-[#A855F7]" />
                {benefit.text}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <a
              href="#products"
              className="flex items-center gap-2 rounded-full bg-[#c9a227] px-8 py-4 font-medium text-[#0a080c] transition-colors hover:bg-[#f5f3ef]"
            >
              <ShoppingBag className="h-5 w-5" />
              Shop Bottles & Caps
            </a>
            <a
              href="#science"
              className="flex items-center gap-2 rounded-full border border-[#8B5CF6]/50 bg-[#2d1b4e] px-8 py-4 font-medium text-[#ddd6fe] transition-colors hover:bg-[#4c1d95]"
            >
              <Beaker className="h-5 w-5" />
              The Science
            </a>
          </motion.div>
        </div>
      </section>

      {/* Why Miron Glass Section */}
      <section
        id="science"
        className="border-t border-[#f5f3ef]/10 bg-gradient-to-b from-[#1a1033]/50 to-transparent px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-serif text-3xl text-white md:text-4xl">
              Why Miron Violet Glass?
            </h2>
            <p className="mx-auto max-w-2xl text-[#a69b8a]">
              Developed in Europe and backed by scientific research, Miron violet
              glass offers unmatched protection for sensitive organic materials.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {MIRON_SCIENCE.map((fact, index) => (
              <ScienceCard key={fact.title} fact={fact} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Glass Comparison Section */}
      <section className="border-t border-[#f5f3ef]/10 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="mb-4 font-serif text-3xl text-white">
              How Miron Compares
            </h2>
            <p className="text-[#a69b8a]">
              See the difference between conventional glass and Miron violet glass
            </p>
          </div>

          <button
            onClick={() => setShowComparison(!showComparison)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#f5f3ef]/10 bg-[#111] p-4 text-[#f5f3ef] transition-colors hover:border-[#8B5CF6]/50"
          >
            <span className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[#8B5CF6]" />
              View Glass Comparison Chart
            </span>
            {showComparison ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="overflow-hidden rounded-xl border border-[#f5f3ef]/10">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#2d1b4e]">
                        <th className="p-4 text-left font-medium text-[#f5f3ef]">
                          Feature
                        </th>
                        <th className="p-4 text-center text-[#a69b8a]">
                          Clear Glass
                        </th>
                        <th className="p-4 text-center text-[#a69b8a]">
                          Amber/Brown
                        </th>
                        <th className="p-4 text-center font-medium text-[#A855F7]">
                          Miron Violet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {GLASS_COMPARISON.map((row, i) => (
                        <tr
                          key={i}
                          className={cn(
                            'border-t border-[#f5f3ef]/10',
                            i % 2 === 0 ? 'bg-[#111]' : 'bg-[#0a080c]'
                          )}
                        >
                          <td className="p-4 text-sm text-[#f5f3ef]">
                            {row.feature}
                          </td>
                          <td className="p-4 text-center text-sm text-[#a69b8a]">
                            {row.clear}
                          </td>
                          <td className="p-4 text-center text-sm text-[#a69b8a]">
                            {row.amber}
                          </td>
                          <td className="p-4 text-center">
                            <span className="rounded-full bg-[#8B5CF6]/20 px-3 py-1 text-sm font-medium text-[#A855F7]">
                              {row.miron}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="border-t border-[#f5f3ef]/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-serif text-3xl text-white md:text-4xl">
              Bottles & Caps
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-[#a69b8a]">
              Genuine Orion MIRON violetglass bottles, precision caps, and TE III
              pipettes for your essential oil collection.
            </p>

            {/* Filter Tabs */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all',
                  activeTab === 'all'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'border border-[#f5f3ef]/10 bg-[#111] text-[#a69b8a] hover:border-[#8B5CF6]/50'
                )}
              >
                All Products
              </button>
              <button
                onClick={() => setActiveTab('bottle')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all',
                  activeTab === 'bottle'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'border border-[#f5f3ef]/10 bg-[#111] text-[#a69b8a] hover:border-[#8B5CF6]/50'
                )}
              >
                <Droplets className="h-4 w-4" />
                Bottles
              </button>
              <button
                onClick={() => setActiveTab('pipette')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all',
                  activeTab === 'pipette'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'border border-[#f5f3ef]/10 bg-[#111] text-[#a69b8a] hover:border-[#8B5CF6]/50'
                )}
              >
                <Droplets className="h-4 w-4" />
                Pipettes
              </button>
              <button
                onClick={() => setActiveTab('cap')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-all',
                  activeTab === 'cap'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'border border-[#f5f3ef]/10 bg-[#111] text-[#a69b8a] hover:border-[#8B5CF6]/50'
                )}
              >
                <Wind className="h-4 w-4" />
                Caps
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-[#f5f3ef]/10 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <Sparkles className="mx-auto mb-6 h-16 w-16 text-[#8B5CF6]" />
          <h2 className="mb-4 font-serif text-3xl text-white">
            Experience the Miron Difference
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-[#a69b8a]">
            Give your essential oils the protection they deserve with genuine Miron
            Violet Glass bottles, caps, and pipettes.
          </p>
          <a
            href="#products"
            className="inline-flex items-center gap-2 rounded-full bg-[#c9a227] px-8 py-4 font-medium text-[#0a080c] transition-colors hover:bg-[#f5f3ef]"
          >
            Shop Bottles & Caps
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>
    </main>
  )
}
