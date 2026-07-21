'use client'

// ============================================================================
// SECTION: Oil Catalog — Category Filters, Recommendations, Search, Oil Grid
// ============================================================================
import { Dispatch, SetStateAction } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Beaker,
  ChevronDown,
  ChevronUp,
  Crown,
  Lightbulb,
  Search,
  Star,
  X,
} from 'lucide-react'
import { AtelierOil } from '@/lib/atelier/atelier-engine'
import { getOilWisdom, OIL_CATEGORIES, OilCategory } from '@/lib/atelier/oil-wisdom'
import { SafetyValidationResult } from '@/lib/safety/comprehensive-safety-v2'
import { cn } from '@/lib/utils'
import { AVAILABLE_OILS, BlendMode } from '../atelier-utils'
import { OilAmountControl } from './OilAmountControl'

export function OilCatalogSection({
  selectedCategories,
  setSelectedCategories,
  showAllCategories,
  setShowAllCategories,
  suggestedOils,
  oilSearchQuery,
  setOilSearchQuery,
  filteredOils,
  selectedOils,
  currentEssentialOilMl,
  maxEssentialOilMl,
  bottleSize,
  mode,
  comprehensiveSafety,
  onAddOil,
  onRemoveOil,
  onAdjustOil,
  onShowOilDetail,
}: {
  selectedCategories: OilCategory[]
  setSelectedCategories: Dispatch<SetStateAction<OilCategory[]>>
  showAllCategories: boolean
  setShowAllCategories: Dispatch<SetStateAction<boolean>>
  suggestedOils: AtelierOil[]
  oilSearchQuery: string
  setOilSearchQuery: (query: string) => void
  filteredOils: AtelierOil[]
  selectedOils: { oilId: string; ml: number }[]
  currentEssentialOilMl: number
  maxEssentialOilMl: number
  bottleSize: number
  mode: BlendMode
  comprehensiveSafety: SafetyValidationResult | null
  onAddOil: (oilId: string) => void
  onRemoveOil: (oilId: string) => void
  onAdjustOil: (oilId: string, delta: number) => void
  onShowOilDetail: (oil: AtelierOil) => void
}) {
  return (
    <>
      {/* Category Filters */}
      <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#a69b8a]">Filter by Category</h3>
          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="text-xs text-[#c9a227] hover:text-[#f5f3ef] flex items-center gap-1 transition-colors"
          >
            {showAllCategories ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
        <div className={cn(
          "flex flex-wrap gap-2 overflow-hidden transition-all duration-300",
          showAllCategories ? "max-h-[500px]" : "max-h-[72px]"
        )}>
          {Object.entries(OIL_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedCategories(prev => 
                  prev.includes(key as OilCategory)
                    ? prev.filter(c => c !== key)
                    : [...prev, key as OilCategory]
                )
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1.5 hover:scale-105',
                selectedCategories.includes(key as OilCategory)
                  ? 'bg-[#c9a227] text-[#0a080c]'
                  : 'bg-[#0a080c] text-[#a69b8a] border border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
        {selectedCategories.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#f5f3ef]/10">
            <button
              onClick={() => setSelectedCategories([])}
              className="text-xs text-[#a69b8a] hover:text-[#f5f3ef] underline"
            >
              Clear {selectedCategories.length} filter{selectedCategories.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Recommended Oils */}
      {suggestedOils.length > 0 && !oilSearchQuery && selectedCategories.length === 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#c9a227]/10 to-transparent border border-[#c9a227]/20">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-[#c9a227]" />
            <h3 className="text-sm font-medium text-[#c9a227]">Recommended for Your Profile</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedOils.map(oil => (
              <button
                key={`rec-${oil.id}`}
                onClick={() => onAddOil(oil.id)}
                disabled={currentEssentialOilMl >= maxEssentialOilMl}
                className="px-3 py-1.5 rounded-full text-xs bg-[#0a080c] border border-[#c9a227]/30 text-[#f5f3ef] hover:bg-[#c9a227]/20 transition-colors disabled:opacity-50"
              >
                + {oil.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Oils - Moved below Blend Chamber */}
      <div className="p-4 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a69b8a]" />
          <input
            type="text"
            value={oilSearchQuery}
            onChange={(e) => setOilSearchQuery(e.target.value)}
            placeholder="Search oils by name or scent profile..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none"
          />
          {oilSearchQuery && (
            <button
              onClick={() => setOilSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a69b8a] hover:text-[#f5f3ef]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Available Oils */}
      <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-[#f5f3ef] flex items-center gap-2">
            <Beaker className="w-5 h-5 text-[#c9a227]" />
            Available Oils
          </h3>
          <div className="flex items-center gap-3">
            {filteredOils.length !== AVAILABLE_OILS.length && (
              <span className="text-xs text-[#a69b8a]">
                {filteredOils.length} of {AVAILABLE_OILS.length} oils
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOils.map(oil => {
            const isSelected = selectedOils.some(o => o.oilId === oil.id)
            const currentMl = selectedOils.find(o => o.oilId === oil.id)?.ml || 0
            const wisdom = getOilWisdom(oil.id)
            const hasSafetyWarning = comprehensiveSafety?.warnings.some(w => 
              w.affectedOils?.includes(oil.id) && (w.riskLevel === 'high' || w.riskLevel === 'critical')
            )
            
            return (
              <motion.div
                key={oil.id}
                layout
                className={cn(
                  'p-3 rounded-xl border transition-all hover:shadow-lg',
                  isSelected
                    ? 'bg-[#c9a227]/10 border-[#c9a227]'
                    : 'bg-[#0a080c] border-[#f5f3ef]/10 hover:border-[#f5f3ef]/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-10 h-10 rounded-lg flex-shrink-0 border border-white/10 cursor-pointer relative"
                    style={{ backgroundColor: oil.color }}
                    onClick={() => onShowOilDetail(oil)}
                    title="Click for detailed oil information"
                  >
                    {hasSafetyWarning && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 
                        className="font-medium text-[#f5f3ef] text-sm truncate cursor-pointer hover:text-[#c9a227] transition-colors"
                        onClick={() => onShowOilDetail(oil)}
                      >{oil.name}</h4>
                      {oil.rarity === 'luxury' && (
                        <span title="Luxury oil"><Crown className="w-3 h-3 text-[#c9a227]" /></span>
                      )}
                      {oil.rarity === 'premium' && (
                        <span title="Premium oil"><Star className="w-3 h-3 text-[#c9a227]" /></span>
                      )}
                    </div>
                    <p className="text-xs text-[#a69b8a]">{oil.scentProfile}</p>
                    
                    {/* Price per ml and categories */}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[#c9a227]">${(oil.collectionPrice30ml / 30).toFixed(2)}/ml</span>
                      {wisdom && (
                        <div className="flex flex-wrap gap-1">
                          {wisdom.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f3ef]/10 text-[#a69b8a]/70">
                              {OIL_CATEGORIES[cat]?.icon}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {isSelected ? (
                  <div className="flex items-center justify-between mt-3">
                    <OilAmountControl
                      oilId={oil.id}
                      ml={currentMl}
                      onAdjust={onAdjustOil}
                      currentEssentialOilMl={currentEssentialOilMl}
                      maxEssentialOilMl={maxEssentialOilMl}
                      bottleSize={bottleSize}
                      mode={mode}
                    />
                    <button
                      onClick={() => onRemoveOil(oil.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddOil(oil.id)}
                    disabled={currentEssentialOilMl >= maxEssentialOilMl}
                    className="w-full mt-3 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-all text-sm disabled:opacity-50 hover:shadow-md"
                  >
                    Add Oil
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
        
        {filteredOils.length === 0 && (
          <div className="text-center py-8 text-[#a69b8a]">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No oils match your search.</p>
            <button 
              onClick={() => { setOilSearchQuery(''); setSelectedCategories([]); }}
              className="mt-2 text-[#c9a227] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </>
  )
}
