'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ArrowRight, Sparkles, Gem, Scroll } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import { getAllOils } from '@/lib/content/oil-crystal-synergies'
import { getOilPrices } from '@/lib/content/pricing-engine-final'
import { ATELIER_CRYSTALS } from '@/lib/atelier/atelier-engine'
import { SIMPLE_CORD_OPTIONS } from '@/lib/atelier/cord-data-simple'

// ============================================================================
// SEARCH INDEX
// ============================================================================

interface SearchResult {
  id: string
  title: string
  handle: string
  type: 'oil' | 'crystal' | 'cord'
  price: number
  image?: string
  description: string
  tags: string[]
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []

  // Index oils
  const oils = getAllOils()
  for (const oil of oils) {
    const prices = getOilPrices(oil.id)
    const priceValues = Object.values(prices)
    const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0

    results.push({
      id: oil.id,
      title: oil.commonName,
      handle: oil.handle || oil.id,
      type: 'oil',
      price: minPrice,
      image: oil.image,
      description: oil.description.slice(0, 120) + (oil.description.length > 120 ? '...' : ''),
      tags: [
        oil.commonName,
        oil.technicalName,
        oil.origin,
        oil.extractionMethod,
        oil.aroma,
        ...oil.baseProperties,
        ...oil.strengths,
        ...oil.crystalPairings.map(c => c.name),
        ...oil.crystalPairings.map(c => c.chakra),
        ...oil.crystalPairings.map(c => c.element),
        ...oil.crystalPairings.flatMap(c => c.benefits || []),
      ],
    })
  }

  // Index crystals (as accessories)
  for (const crystal of ATELIER_CRYSTALS) {
    results.push({
      id: crystal.id,
      title: crystal.name,
      handle: `crystal-${crystal.id}`,
      type: 'crystal',
      price: 0,
      description: crystal.description,
      tags: [crystal.name, crystal.description],
    })
  }

  // Index cords (as accessories)
  for (const cord of SIMPLE_CORD_OPTIONS) {
    results.push({
      id: cord.id,
      title: cord.name,
      handle: `cord-${cord.id}`,
      type: 'cord',
      price: 0,
      description: '',
      tags: [cord.name],
    })
  }

  return results
}

const SEARCH_INDEX = buildSearchIndex()

// Popular search terms derived from oil properties
const POPULAR_SEARCHES = [
  'Lavender', 'Sleep', 'Anxiety', 'Grounding', 'Energy',
  'Meditation', 'Rose', 'Frankincense', 'Citrus', 'Immunity',
]

// Trending = in-stock oils (fastest to ship)
const TRENDING_OILS = SEARCH_INDEX.filter(
  r => r.type === 'oil' && ['lavender', 'tea-tree', 'eucalyptus', 'lemongrass', 'clove-bud', 'jojoba'].includes(r.id)
)

// ============================================================================
// COMPONENT
// ============================================================================

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'all' | 'oils' | 'crystals' | 'cords'>('all')

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)

    const q = searchQuery.toLowerCase()
    let filtered = SEARCH_INDEX.filter(item => {
      const text = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase()
      return text.includes(q)
    })

    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => {
        if (activeCategory === 'oils') return item.type === 'oil'
        if (activeCategory === 'crystals') return item.type === 'crystal'
        if (activeCategory === 'cords') return item.type === 'cord'
        return true
      })
    }

    // Sort: oils first, then crystals, then cords
    filtered.sort((a, b) => {
      const typeOrder = { oil: 0, crystal: 1, cord: 2 }
      return typeOrder[a.type] - typeOrder[b.type]
    })

    setResults(filtered)
    setIsLoading(false)
  }, [activeCategory])

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 150)
    return () => clearTimeout(timeout)
  }, [query, search])

  const resultCounts = useMemo(() => {
    const oils = results.filter(r => r.type === 'oil').length
    const crystals = results.filter(r => r.type === 'crystal').length
    const cords = results.filter(r => r.type === 'cord').length
    return { oils, crystals, cords, total: results.length }
  }, [results])

  const getResultHref = (result: SearchResult) => {
    if (result.type === 'oil') return `/oil/${result.handle}`
    if (result.type === 'crystal') return `/crystals`
    if (result.type === 'cord') return `/oils`
    return '/'
  }

  const getTypeIcon = (type: SearchResult['type']) => {
    if (type === 'oil') return <Sparkles className="w-3 h-3" />
    if (type === 'crystal') return <Gem className="w-3 h-3" />
    return <Scroll className="w-3 h-3" />
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    if (type === 'oil') return 'Essential Oil'
    if (type === 'crystal') return 'Crystal'
    return 'Cord'
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded hover:border-miron-void hover:text-miron-void transition-colors"
        data-cursor="search"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
        <kbd className="hidden xl:inline-block px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">⌘K</kbd>
      </button>

      {/* Mobile Search Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden w-11 h-11 flex items-center justify-center text-miron-void"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-miron-void/60 backdrop-blur-sm z-[2001]"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed inset-x-4 top-[10vh] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl bg-white rounded-xl shadow-2xl z-[2002] overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search oils, crystals, collections..."
                  className="flex-1 text-lg outline-none placeholder:text-gray-400"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="hidden sm:block px-2 py-1 text-xs text-gray-400 border border-gray-200 rounded"
                >
                  ESC
                </button>
              </div>

              {/* Category Filters */}
              {query && (
                <div className="flex gap-2 px-4 pt-3 pb-1">
                  {([
                    { key: 'all', label: `All (${resultCounts.total})` },
                    { key: 'oils', label: `Oils (${resultCounts.oils})` },
                    { key: 'crystals', label: `Crystals (${resultCounts.crystals})` },
                    { key: 'cords', label: `Cords (${resultCounts.cords})` },
                  ] as const).map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        activeCategory === cat.key
                          ? 'bg-miron-void text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="w-8 h-8 border-2 border-gold-pure/20 border-t-gold-pure rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Searching...</p>
                  </div>
                ) : query && results.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p>No results found for &ldquo;{query}&rdquo;</p>
                    <p className="text-sm mt-2">Try searching for oils, crystals, or benefits</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-2">
                    {/* Oils section */}
                    {resultCounts.oils > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                          Essential Oils
                        </div>
                        {results.filter(r => r.type === 'oil').map((product) => (
                          <Link
                            key={product.id}
                            href={getResultHref(product)}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
                          >
                            <div className="w-12 h-12 bg-miron-mid/10 rounded overflow-hidden relative flex-shrink-0">
                              {product.image ? (
                                <Image
                                  src={product.image}
                                  alt={product.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-miron-void group-hover:text-gold-pure transition-colors truncate">
                                {product.title}
                              </h3>
                              <p className="text-sm text-gray-500 truncate">{product.description}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-xs text-gray-400">
                                From {formatPrice(product.price)}
                              </span>
                              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold-pure transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </>
                    )}

                    {/* Crystals section */}
                    {resultCounts.crystals > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-t border-gray-100">
                          Crystals
                        </div>
                        {results.filter(r => r.type === 'crystal').map((product) => (
                          <Link
                            key={product.id}
                            href={getResultHref(product)}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
                          >
                            <div className="w-12 h-12 bg-miron-mid/10 rounded flex items-center justify-center flex-shrink-0">
                              <Gem className="w-5 h-5 text-gray-300" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-miron-void group-hover:text-gold-pure transition-colors">
                                {product.title}
                              </h3>
                              <p className="text-sm text-gray-500">{product.description.slice(0, 60)}...</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold-pure transition-colors" />
                          </Link>
                        ))}
                      </>
                    )}

                    {/* Cords section */}
                    {resultCounts.cords > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-t border-gray-100">
                          Cords
                        </div>
                        {results.filter(r => r.type === 'cord').map((product) => (
                          <Link
                            key={product.id}
                            href={getResultHref(product)}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
                          >
                            <div className="w-12 h-12 bg-miron-mid/10 rounded flex items-center justify-center flex-shrink-0">
                              <Scroll className="w-5 h-5 text-gray-300" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-miron-void group-hover:text-gold-pure transition-colors">
                                {product.title}
                              </h3>
                              <p className="text-sm text-gray-500">Bottle Cord Accessory</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gold-pure transition-colors" />
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                      Popular Searches
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_SEARCHES.map((term) => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-miron-void hover:text-white rounded-full transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                        In Stock &mdash; Ships Tomorrow
                      </div>
                      <div className="space-y-2">
                        {TRENDING_OILS.slice(0, 5).map((product) => (
                          <Link
                            key={product.id}
                            href={`/oil/${product.handle}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
                          >
                            <div className="w-10 h-10 bg-miron-mid/10 rounded overflow-hidden relative flex-shrink-0">
                              {product.image && (
                                <Image
                                  src={product.image}
                                  alt={product.title}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-miron-void">{product.title}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                From {formatPrice(product.price)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
