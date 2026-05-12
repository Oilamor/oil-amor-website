'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  getAllOils,
  type OilProfile,
  type Chakra,
  type Element
} from '@/lib/content/oil-crystal-synergies'
import {
  getOilPrices,
  formatPrice,
  OIL_PRICING,
} from '@/lib/content/pricing-engine-final'
import {
  Search,
  Sparkles,
  Droplets,
  ArrowUpRight,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { StockStatusBadge } from '@/app/components/stock-status-badge'

const EASE_LUXURY = [0.16, 1, 0.3, 1] as const

type PriceRange = 'all' | 'under15' | '15to25' | '25to40' | 'over40'
type SortOption = 'name' | 'price-low' | 'price-high' | 'chakra'

interface Filters {
  search: string
  priceRange: PriceRange
  chakras: Chakra[]
  elements: Element[]
  sort: SortOption
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_LUXURY },
  },
}

const ORGANIC_SHAPES = [
  'rounded-[2rem] rounded-tl-sm',
  'rounded-[2rem] rounded-tr-sm',
  'rounded-[2rem] rounded-bl-sm',
  'rounded-[2rem] rounded-br-sm',
]

function OilCard({ oil, index }: { oil: OilProfile; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const prices = getOilPrices(oil.id)
  const minPrice = Math.min(...Object.values(prices))
  const maxPrice = Math.max(...Object.values(prices))
  const oilData = OIL_PRICING.find((o) => o.id === oil.id)
  const chakras = Array.from(new Set(oil.crystalPairings.map((c) => c.chakra)))
  const shape = ORGANIC_SHAPES[index % ORGANIC_SHAPES.length]

  return (
    <motion.div
      variants={cardVariants}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/oil/${oil.handle || oil.id}`}>
        <div
          className={`relative aspect-[3/4] overflow-hidden border border-[#f5f3ef]/5 bg-[#0a080c] transition-all duration-500 ${shape} group-hover:border-[#c9a227]/30 group-hover:shadow-2xl group-hover:shadow-[#c9a227]/10`}
        >
          <Image
            src={oil.image}
            alt={oil.commonName}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a080c] via-[#0a080c]/40 to-transparent" />

          {/* Crystal preview */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="mb-2 flex items-center gap-1">
              {oil.crystalPairings.slice(0, 3).map((crystal, i) => (
                <motion.div
                  key={crystal.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.06 + i * 0.08 }}
                  className="h-5 w-5 rounded-full border border-[#f5f3ef]/30 shadow-lg sm:h-6 sm:w-6"
                  style={{ backgroundColor: crystal.color }}
                  title={crystal.name}
                />
              ))}
              <span className="ml-2 text-[10px] uppercase tracking-wider text-[#a69b8a]">
                3 crystals
              </span>
            </div>
          </div>

          {/* Hover overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a080c]/80 p-4 backdrop-blur-sm sm:p-6"
              >
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-2 text-xs uppercase tracking-[0.2em] text-[#c9a227]"
                >
                  {oil.origin}
                </motion.p>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="mb-4 line-clamp-3 text-center text-sm leading-relaxed text-[#f5f3ef]"
                >
                  {oil.description}
                </motion.p>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap justify-center gap-1"
                >
                  {oil.baseProperties.slice(0, 3).map((prop) => (
                    <span
                      key={prop}
                      className="rounded-full bg-[#c9a227]/20 px-2 py-0.5 text-[10px] text-[#c9a227]"
                    >
                      {prop}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rarity badge */}
          {oilData?.rarity !== 'common' && (
            <div className="absolute left-3 top-3">
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider ${
                  oilData?.rarity === 'luxury'
                    ? 'bg-[#c9a227] text-[#0a080c]'
                    : 'border border-[#f5f3ef]/20 bg-[#0a080c]/60 text-[#f5f3ef] backdrop-blur-sm'
                }`}
              >
                {oilData?.rarity}
              </span>
            </div>
          )}
        </div>

        {/* Info below card */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-lg text-[#f5f3ef] transition-colors group-hover:text-[#c9a227]">
                {oil.commonName}
              </h3>
              <p className="text-xs italic text-[#a69b8a]">{oil.technicalName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-display text-[#c9a227]">{formatPrice(minPrice)}</p>
              <p className="text-[10px] text-[#a69b8a]">
                {minPrice === maxPrice ? '' : `-${formatPrice(maxPrice)}`}
              </p>
            </div>
          </div>

          {/* Stock Status */}
          <StockStatusBadge oilId={oil.id} size="sm" />

          <div className="flex flex-wrap gap-2">
            {chakras.slice(0, 2).map((chakra) => (
              <span key={chakra} className="text-[10px] capitalize text-[#a69b8a]">
                {chakra.replace('-', ' ')}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 text-xs text-[#c9a227]">
              Configure
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function FilterBar({
  filters,
  onFilterChange,
  totalOils,
  filteredCount,
}: {
  filters: Filters
  onFilterChange: (filters: Filters) => void
  totalOils: number
  filteredCount: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const allChakras: Chakra[] = [
    'root',
    'sacral',
    'solar-plexus',
    'heart',
    'throat',
    'third-eye',
    'crown',
  ]
  const allElements: Element[] = ['earth', 'water', 'fire', 'air']

  const activeFiltersCount =
    (filters.priceRange !== 'all' ? 1 : 0) +
    filters.chakras.length +
    filters.elements.length

  return (
    <div className="sticky top-20 z-40 border-b border-[#f5f3ef]/5 bg-[#0a080c]/80 py-4 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a69b8a]" />
            <input
              type="text"
              placeholder="Search oils..."
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ ...filters, search: e.target.value })
              }
              className="w-full rounded-full border border-[#f5f3ef]/10 bg-[#0a080c]/60 py-2 pl-10 pr-4 text-sm text-[#f5f3ef] placeholder:text-[#a69b8a] focus:border-[#c9a227] focus:outline-none transition-colors"
            />
          </div>

          {/* Quick filters */}
          <div className="hidden items-center gap-2 md:flex">
            <select
              value={filters.priceRange}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  priceRange: e.target.value as PriceRange,
                })
              }
              className="rounded-full border border-[#f5f3ef]/10 bg-[#0a080c]/60 px-4 py-2 text-sm text-[#f5f3ef] focus:border-[#c9a227] focus:outline-none"
            >
              <option value="all">All Prices</option>
              <option value="under15">Under $15</option>
              <option value="15to25">$15 – $25</option>
              <option value="25to40">$25 – $40</option>
              <option value="over40">Over $40</option>
            </select>

            <select
              value={filters.sort}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  sort: e.target.value as SortOption,
                })
              }
              className="rounded-full border border-[#f5f3ef]/10 bg-[#0a080c]/60 px-4 py-2 text-sm text-[#f5f3ef] focus:border-[#c9a227] focus:outline-none"
            >
              <option value="name">Name A-Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="chakra">Chakra</option>
            </select>
          </div>

          {/* Expand filters */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
              activeFiltersCount > 0
                ? 'border-[#c9a227] bg-[#c9a227] text-[#0a080c]'
                : 'border-[#f5f3ef]/10 bg-[#0a080c]/60 text-[#f5f3ef] hover:border-[#c9a227]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-sm">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0a080c] text-xs text-[#c9a227]">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Results count */}
        <div className="mt-3 flex items-center justify-between text-xs text-[#a69b8a]">
          <span>
            Showing {filteredCount} of {totalOils} oils
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={() =>
                onFilterChange({
                  search: '',
                  priceRange: 'all',
                  chakras: [],
                  elements: [],
                  sort: 'name',
                })
              }
              className="flex items-center gap-1 text-[#c9a227] hover:underline"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-6 pb-2 pt-4 md:grid-cols-2">
                {/* Chakra filter */}
                <div>
                  <p className="mb-3 text-sm font-medium text-[#f5f3ef]">Chakra</p>
                  <div className="flex flex-wrap gap-2">
                    {allChakras.map((chakra) => (
                      <button
                        key={chakra}
                        onClick={() => {
                          const newChakras = filters.chakras.includes(chakra)
                            ? filters.chakras.filter((c) => c !== chakra)
                            : [...filters.chakras, chakra]
                          onFilterChange({ ...filters, chakras: newChakras })
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${
                          filters.chakras.includes(chakra)
                            ? 'bg-[#c9a227] text-[#0a080c]'
                            : 'border border-[#f5f3ef]/10 bg-[#0a080c]/60 text-[#a69b8a] hover:border-[#c9a227]'
                        }`}
                      >
                        {chakra.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Element filter */}
                <div>
                  <p className="mb-3 text-sm font-medium text-[#f5f3ef]">Element</p>
                  <div className="flex flex-wrap gap-2">
                    {allElements.map((element) => (
                      <button
                        key={element}
                        onClick={() => {
                          const newElements = filters.elements.includes(element)
                            ? filters.elements.filter((e) => e !== element)
                            : [...filters.elements, element]
                          onFilterChange({ ...filters, elements: newElements })
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs capitalize transition-colors ${
                          filters.elements.includes(element)
                            ? 'bg-[#c9a227] text-[#0a080c]'
                            : 'border border-[#f5f3ef]/10 bg-[#0a080c]/60 text-[#a69b8a] hover:border-[#c9a227]'
                        }`}
                      >
                        {element}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function OilsPage() {
  const allOils = getAllOils()

  const [filters, setFilters] = useState<Filters>({
    search: '',
    priceRange: 'all',
    chakras: [],
    elements: [],
    sort: 'name',
  })

  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 300], [0, 60])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])

  const filteredOils = useMemo(() => {
    let result = [...allOils]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (oil) =>
          oil.commonName.toLowerCase().includes(searchLower) ||
          oil.technicalName.toLowerCase().includes(searchLower) ||
          oil.baseProperties.some((p) =>
            p.toLowerCase().includes(searchLower)
          )
      )
    }

    if (filters.priceRange !== 'all') {
      result = result.filter((oil) => {
        const prices = getOilPrices(oil.id)
        const minPrice = Math.min(...Object.values(prices))
        switch (filters.priceRange) {
          case 'under15':
            return minPrice < 15
          case '15to25':
            return minPrice >= 15 && minPrice < 25
          case '25to40':
            return minPrice >= 25 && minPrice < 40
          case 'over40':
            return minPrice >= 40
          default:
            return true
        }
      })
    }

    if (filters.chakras.length > 0) {
      result = result.filter((oil) =>
        oil.crystalPairings.some((c) =>
          filters.chakras.includes(c.chakra)
        )
      )
    }

    if (filters.elements.length > 0) {
      result = result.filter((oil) =>
        oil.crystalPairings.some((c) =>
          filters.elements.includes(c.element)
        )
      )
    }

    result.sort((a, b) => {
      switch (filters.sort) {
        case 'price-low':
          return (
            Math.min(...Object.values(getOilPrices(a.id))) -
            Math.min(...Object.values(getOilPrices(b.id)))
          )
        case 'price-high':
          return (
            Math.max(...Object.values(getOilPrices(b.id))) -
            Math.max(...Object.values(getOilPrices(a.id)))
          )
        case 'chakra':
          return a.crystalPairings[0].chakra.localeCompare(
            b.crystalPairings[0].chakra
          )
        default:
          return a.commonName.localeCompare(b.commonName)
      }
    })

    return result
  }, [allOils, filters])

  return (
    <div className="min-h-screen bg-[#0a080c]">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-8 pt-28">
        {/* Atmospheric orbs */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -right-[10vw] top-[10vh] h-[50vw] w-[50vw] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(26,15,46,0.4) 0%, transparent 60%)',
            }}
            animate={{ scale: [1, 1.06, 1], rotate: [0, 6, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute -left-[10vw] bottom-[10vh] h-[40vw] w-[40vw] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 60%)',
            }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Background text */}
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ opacity: heroOpacity }}
        >
          <span className="whitespace-nowrap font-display text-[14vw] font-light tracking-[-0.04em] text-[#c9a227]/[0.03]">
            The Collection
          </span>
        </motion.div>

        <motion.div
          className="relative z-10 mx-auto max-w-7xl"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_LUXURY }}
              className="mb-4 block text-[0.625rem] uppercase tracking-[0.3em] text-[#c9a227]"
            >
              The Collection
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: EASE_LUXURY }}
              className="font-display text-4xl leading-[1.1] text-[#f5f3ef] sm:text-5xl lg:text-6xl"
            >
              Sacred Oils,
              <br />
              <span className="italic text-[#c9a227]">Crystal Infused</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE_LUXURY }}
              className="mt-6 leading-relaxed text-[#a69b8a]"
            >
              Thirty-three essential oils, each paired with three carefully
              selected crystals. Choose your format—pure essential oils or
              pre-diluted carrier blends.
            </motion.p>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE_LUXURY }}
            className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4"
          >
            {[
              { value: '33', label: 'Sacred Oils' },
              { value: '51', label: 'Crystal Pairings' },
              { value: '15', label: 'Premium Crystals' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`border border-[#f5f3ef]/10 bg-[#0a080c]/40 p-4 text-center backdrop-blur-sm ${
                  i === 0
                    ? 'rounded-[1.5rem] rounded-tl-sm'
                    : i === 1
                      ? 'rounded-[1.5rem] rounded-tr-sm'
                      : 'rounded-[1.5rem] rounded-br-sm'
                }`}
              >
                <p className="font-display text-2xl text-[#c9a227]">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-[#a69b8a]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        totalOils={allOils.length}
        filteredCount={filteredOils.length}
      />

      {/* Oil Grid */}
      <section className="px-6 py-12 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
          >
            {filteredOils.map((oil, index) => (
              <OilCard key={oil.id} oil={oil} index={index} />
            ))}
          </motion.div>

          {/* Empty State */}
          {filteredOils.length === 0 && (
            <div className="py-24 text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-[#c9a227]/30" />
              <h3 className="font-display text-xl text-[#f5f3ef]">No oils found</h3>
              <p className="mt-2 text-[#a69b8a]">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative overflow-hidden border-t border-[#f5f3ef]/10 px-6 py-20 lg:px-12 lg:py-28">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="h-full w-[2px]"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(201,162,39,0.2) 30%, rgba(201,162,39,0.2) 70%, transparent 100%)',
            }}
          />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="mb-4 block text-[0.625rem] uppercase tracking-[0.3em] text-[#a69b8a]">
            Begin Your Journey
          </span>
          <h2 className="font-display text-3xl text-[#f5f3ef] sm:text-4xl">
            New to <span className="italic text-[#c9a227]">Oil Amor</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-lg leading-relaxed text-[#a69b8a]">
            Start with our 5ml discovery sizes. Each oil unlocks its own refill
            program, saving you up to 50% on future purchases.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() =>
                setFilters({ ...filters, priceRange: 'under15' })
              }
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c9a227] px-8 py-4 text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#0a080c] transition-colors hover:bg-transparent hover:text-[#c9a227]"
            >
              <Sparkles className="h-4 w-4" />
              Browse Starter Sizes
            </button>
            <Link
              href="/refill"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#c9a227] px-8 py-4 text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#c9a227] transition-colors hover:bg-[#c9a227] hover:text-[#0a080c]"
            >
              <Droplets className="h-4 w-4" />
              Learn About Refills
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
