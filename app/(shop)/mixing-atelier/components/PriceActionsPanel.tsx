'use client'

// ============================================================================
// SECTION: Price & Actions Panel
// ============================================================================
import { Dispatch, SetStateAction } from 'react'
import {
  AlertCircle,
  AlertOctagon,
  CheckCircle,
  FileText,
  Info,
  Minus,
  Plus,
  Save,
  Share2,
  ShoppingCart,
  Tag,
  X,
} from 'lucide-react'
import { Tooltip } from '@/app/components/tooltip'
import { calculateAtelierPrice, formatPrice as formatAtelierPrice } from '@/lib/atelier/atelier-engine'
import { getSimpleCordById } from '@/lib/atelier/cord-data-simple'
import { CRYSTAL_COUNTS } from '@/lib/content/pricing-engine-final'
import { SafetyValidationResult } from '@/lib/safety/comprehensive-safety-v2'
import { cn } from '@/lib/utils'
import {
  BlendMode,
  CARRIER_OILS,
  getMlDecimals,
  INTENDED_USES,
} from '../atelier-utils'

type PriceBreakdown = ReturnType<typeof calculateAtelierPrice>

interface BlendRarity {
  score: number
  rarity: string
  luxuryCount: number
  premiumCount: number
}

export function PriceActionsPanel({
  estimatedPrice,
  blendRarity,
  priceBreakdown,
  selectedOils,
  selectedCarrierOilId,
  selectedCordId,
  selectedCrystalId,
  bottleSize,
  mode,
  isBottleComplete,
  isOverfilled,
  currentEssentialOilMl,
  maxEssentialOilMl,
  remainingCapacity,
  unacknowledgedCriticalCount,
  recipeName,
  recipeNameError,
  onRecipeNameChange,
  intendedUse,
  setIntendedUse,
  blendDescription,
  setBlendDescription,
  blendStory,
  setBlendStory,
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  comprehensiveSafety,
  acknowledgedWarningIds,
  consentToShare,
  setConsentToShare,
  onSaveRecipe,
  isSaving,
  onShareBlend,
  onSaveDraftClick,
  cartQuantity,
  setCartQuantity,
  onAddToCart,
  canAddToCart,
  isCartLoading,
}: {
  estimatedPrice: number
  blendRarity: BlendRarity | null
  priceBreakdown: PriceBreakdown | null
  selectedOils: { oilId: string; ml: number }[]
  selectedCarrierOilId: string
  selectedCordId: string
  selectedCrystalId: string | undefined
  bottleSize: number
  mode: BlendMode
  isBottleComplete: boolean
  isOverfilled: boolean
  currentEssentialOilMl: number
  maxEssentialOilMl: number
  remainingCapacity: number
  unacknowledgedCriticalCount: number
  recipeName: string
  recipeNameError: string | null
  onRecipeNameChange: (value: string) => void
  intendedUse: string
  setIntendedUse: (use: string) => void
  blendDescription: string
  setBlendDescription: (value: string) => void
  blendStory: string
  setBlendStory: (value: string) => void
  tags: string[]
  tagInput: string
  setTagInput: (value: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  comprehensiveSafety: SafetyValidationResult | null
  acknowledgedWarningIds: string[]
  consentToShare: boolean
  setConsentToShare: (consent: boolean) => void
  onSaveRecipe: () => void
  isSaving: boolean
  onShareBlend: () => void
  onSaveDraftClick: () => void
  cartQuantity: number
  setCartQuantity: Dispatch<SetStateAction<number>>
  onAddToCart: () => void
  canAddToCart: boolean | undefined
  isCartLoading: boolean
}) {
  return (
    <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#a69b8a]">Estimated Price</span>
        <div className="text-right">
          <span className="text-2xl font-serif text-[#c9a227]">{formatAtelierPrice(estimatedPrice)}</span>
          {blendRarity && blendRarity.score >= 60 && (
            <Tooltip content={`Rarity Score: ${blendRarity.score}/100`}>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#c9a227] cursor-help">
                {blendRarity.rarity}
              </span>
            </Tooltip>
          )}
        </div>
      </div>
      
      {priceBreakdown && (
        <div className="mb-4 p-3 rounded-xl bg-[#0a080c] text-sm space-y-2">
          {/* Oils */}
          <div className="space-y-1">
            {priceBreakdown.costs.oils.map((oil, i) => (
              <div key={i} className="flex justify-between text-[#a69b8a] text-xs group">
                <Tooltip content={`Wholesale: $${oil.wholesaleCost.toFixed(2)}`}>
                  <span className="truncate pr-2 cursor-help">
                    {oil.name} <span className="text-[#a69b8a]/50">({oil.ml}ml)</span>
                  </span>
                </Tooltip>
                <span className="flex-shrink-0 text-[#c9a227]">${oil.retailPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-[#f5f3ef]/10 pt-2 space-y-1">
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <span>Oils Subtotal</span>
              <span className="text-[#c9a227]">${priceBreakdown.costs.oilsSubtotal.toFixed(2)}</span>
            </div>
            {priceBreakdown.costs.additionalOilFee > 0 && (
              <div className="flex justify-between text-[#a69b8a] text-xs">
                <Tooltip content="$1 per additional oil after the first 2">
                  <span className="cursor-help flex items-center gap-1">
                    Multi-Oil Fee ({selectedOils.length} oils) <Info className="w-3 h-3" />
                  </span>
                </Tooltip>
                <span className="text-[#c9a227]">${priceBreakdown.costs.additionalOilFee.toFixed(2)}</span>
              </div>
            )}
            {mode === 'carrier' && priceBreakdown.costs.carrierOil > 0 && (
              <div className="flex justify-between text-[#a69b8a] text-xs">
                <Tooltip content={CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.description || 'Carrier oil for dilution'}>
                  <span className="cursor-help flex items-center gap-1">
                    {CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name || 'Carrier Oil'} <Info className="w-3 h-3" />
                  </span>
                </Tooltip>
                <span className="text-[#c9a227]">${priceBreakdown.costs.carrierOil.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <Tooltip content={`${priceBreakdown.costs.bottleType === 'roller' ? 'Rollerball' : 'Dropper'} bottle included`}>
                <span className="cursor-help flex items-center gap-1">
                  Miron Violet Glass Bottle <Info className="w-3 h-3" />
                </span>
              </Tooltip>
              <span className="text-[#f5f3ef]/70">${priceBreakdown.costs.bottleCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <Tooltip content={`${priceBreakdown.costs.bottleType === 'roller' ? 'Stainless Steel Roller' : 'Glass Dropper'} included`}>
                <span className="cursor-help flex items-center gap-1">
                  {priceBreakdown.costs.bottleType === 'roller' ? 'Steel Roller' : 'Glass Dropper'} <Info className="w-3 h-3" />
                </span>
              </Tooltip>
              <span className="text-[#8B5CF6]/70 text-[10px]">Included</span>
            </div>
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <Tooltip content={`${CRYSTAL_COUNTS[`${bottleSize}ml`] || 12} crystal chips at $0.25 each = $${((CRYSTAL_COUNTS[`${bottleSize}ml`] || 12) * 0.25).toFixed(2)}`}>
                <span className="cursor-help flex items-center gap-1">
                  Crystals ({CRYSTAL_COUNTS[`${bottleSize}ml`] || 12} × $0.25) <Info className="w-3 h-3" />
                </span>
              </Tooltip>
              <span className="text-[#f5f3ef]/70">${priceBreakdown.costs.crystals.toFixed(2)}</span>
            </div>
            {priceBreakdown.costs.cord > 0 && (
              <div className="flex justify-between text-[#a69b8a] text-xs">
                <span>
                  Cord Upgrade
                  <span className="text-[#c9a227]/70 text-[10px] ml-1">
                    ({getSimpleCordById(selectedCordId).name})
                  </span>
                </span>
                <span className="text-[#c9a227]">${priceBreakdown.costs.cord.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <Tooltip content="Hand-blended with care in small batches">
                <span className="cursor-help flex items-center gap-1">
                  Blending Labor <Info className="w-3 h-3" />
                </span>
              </Tooltip>
              <span className="text-[#c9a227]">${priceBreakdown.costs.labor.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="border-t border-[#f5f3ef]/10 pt-2">
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <span>Subtotal</span>
              <span className="text-[#f5f3ef]/70">${priceBreakdown.costs.subtotalBeforeRounding.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#a69b8a] text-xs">
              <span className="text-[10px]">Round to .95</span>
              <span className={priceBreakdown.costs.roundingAdjustment >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}>
                {priceBreakdown.costs.roundingAdjustment >= 0 ? '+' : ''}${priceBreakdown.costs.roundingAdjustment.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="border-t border-[#f5f3ef]/10 pt-2">
            <div className="flex justify-between text-[#f5f3ef] font-medium">
              <span>Total</span>
              <span>${priceBreakdown.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottle Status */}
      {!isBottleComplete ? (
        <div className={cn(
          "p-4 rounded-xl mb-4 flex items-center gap-3",
          isOverfilled ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"
        )}>
          <AlertCircle className={cn("w-5 h-5", isOverfilled ? "text-red-400" : "text-yellow-400")} />
          <div>
            <p className={cn("text-sm font-medium", isOverfilled ? "text-red-400" : "text-yellow-400")}>
              {isOverfilled ? 'Bottle Overfilled' : 'Bottle Incomplete'}
            </p>
            <p className="text-xs text-[#a69b8a]">
              {isOverfilled 
                ? `Please reduce by ${(currentEssentialOilMl - maxEssentialOilMl).toFixed(getMlDecimals(mode))}ml`
                : `Add ${remainingCapacity.toFixed(getMlDecimals(mode))}ml more essential oil${remainingCapacity !== 1 ? 's' : ''} to proceed`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#2ecc71]/10 border border-[#2ecc71]/30 mb-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-[#2ecc71]" />
          <div>
            <p className="text-sm font-medium text-[#2ecc71]">Ready to Order</p>
            <p className="text-xs text-[#a69b8a]">Your bottle is perfectly filled</p>
          </div>
        </div>
      )}
      
      {/* Critical Acknowledgment Warning */}
      {isBottleComplete && unacknowledgedCriticalCount > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">
                Critical Safety Acknowledgment Required
              </p>
              <p className="text-xs text-[#a69b8a] mt-1">
                {unacknowledgedCriticalCount} critical warning{unacknowledgedCriticalCount !== 1 ? 's' : ''} must be acknowledged before checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Form - Always Visible */}
      <input
        type="text"
        value={recipeName}
        onChange={(e) => onRecipeNameChange(e.target.value)}
        placeholder="Name your blend..."
        className={cn(
          "w-full px-4 py-3 rounded-xl bg-[#0a080c] border text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none mb-3",
          recipeNameError ? "border-red-500/50" : "border-[#f5f3ef]/10"
        )}
      />
      {recipeNameError && (
        <p className="text-xs text-red-400 mb-3">{recipeNameError}</p>
      )}
      
      {/* Intended Use */}
      <div className="mb-3">
        <label className="text-xs text-[#a69b8a] mb-2 block">Intended Use</label>
        <div className="grid grid-cols-2 gap-2">
          {INTENDED_USES.slice(0, 6).map(use => (
            <button
              key={use.id}
              onClick={() => setIntendedUse(use.id)}
              disabled={!isBottleComplete}
              className={cn(
                'px-2 py-2 rounded-lg text-xs transition-all text-left flex items-center gap-2',
                intendedUse === use.id
                  ? 'bg-[#c9a227]/20 border border-[#c9a227] text-[#f5f3ef]'
                  : 'bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:border-[#f5f3ef]/30',
                !isBottleComplete && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span>{use.icon}</span>
              <span className="truncate">{use.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <textarea
        value={blendDescription}
        onChange={(e) => setBlendDescription(e.target.value)}
        placeholder="Describe your blend... What makes it special? (Optional)"
        rows={3}
        disabled={!isBottleComplete}
        className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none mb-3 resize-none text-sm disabled:opacity-50"
      />

      <textarea
        value={blendStory}
        onChange={(e) => setBlendStory(e.target.value)}
        placeholder="The story behind this blend... Why did you create it? (Optional)"
        rows={2}
        disabled={!isBottleComplete}
        className="w-full px-4 py-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 focus:border-[#c9a227] focus:outline-none mb-3 resize-none text-sm disabled:opacity-50"
      />
      
      {/* Tags Input */}
      <div className="mb-4">
        <label className="text-xs text-[#a69b8a] mb-2 block flex items-center gap-1">
          <Tag className="w-3 h-3" />
          Tags (max 5)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <span 
              key={tag} 
              className="px-2 py-1 rounded-full bg-[#c9a227]/20 text-[#c9a227] text-xs flex items-center gap-1"
            >
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {tags.length < 5 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
              placeholder="Add tag..."
              disabled={!isBottleComplete}
              className="flex-1 px-3 py-2 rounded-lg bg-[#0a080c] border border-[#f5f3ef]/10 text-[#f5f3ef] placeholder:text-[#a69b8a]/50 text-xs focus:border-[#c9a227] focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={onAddTag}
              disabled={!tagInput.trim() || !isBottleComplete}
              className="px-3 py-2 rounded-lg bg-[#c9a227] text-[#0a080c] text-xs font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>
      
      {/* Final Safety Acknowledgment Checkbox */}
      {comprehensiveSafety && comprehensiveSafety.warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgedWarningIds.length >= comprehensiveSafety.warnings.filter(w => w.requiresAcknowledgment).length}
              onChange={() => {}}
              disabled={!isBottleComplete}
              className="mt-0.5 w-4 h-4 rounded border-red-500/30 bg-transparent text-red-500 focus:ring-red-500 focus:ring-offset-0 disabled:opacity-50"
            />
            <div className="text-xs text-[#a69b8a]">
              <span className="text-red-400 font-medium block mb-1">
                I understand the risks and have consulted appropriate professionals
              </span>
              I acknowledge that I have read all safety warnings and understand the potential risks associated with this blend. I take full responsibility for the safe use of this product.
            </div>
          </label>
        </div>
      )}
      
      <div className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 mb-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentToShare}
            onChange={(e) => setConsentToShare(e.target.checked)}
            disabled={!isBottleComplete}
            className="mt-0.5 w-4 h-4 rounded border-[#f5f3ef]/30 bg-transparent text-[#c9a227] focus:ring-[#c9a227] focus:ring-offset-0 disabled:opacity-50"
          />
          <div className="text-xs text-[#a69b8a]">
            <span className="text-[#f5f3ef] font-medium block mb-1">
              Share to Community Blends
            </span>
            After you complete your purchase, this blend will be automatically 
            shared on the Community Blends page. Other users can discover, 
            rate, and purchase your creation. You&apos;ll be credited as the creator.
          </div>
        </label>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onSaveRecipe}
          disabled={!recipeName.trim() || !!recipeNameError || isSaving || !isBottleComplete}
          className="flex-1 py-3 rounded-xl bg-[#c9a227] text-[#0a080c] font-medium hover:bg-[#f5f3ef] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#c9a227]/20"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Recipe'}
        </button>
        <button
          onClick={onShareBlend}
          disabled={!isBottleComplete}
          className="p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#f5f3ef]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Share private link"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Save Draft Button */}
      <button
        onClick={onSaveDraftClick}
        disabled={!isBottleComplete}
        className="w-full mt-2 py-2.5 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10 text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/50 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText className="w-4 h-4" />
        Save as Draft
      </button>

      {/* Quantity Selector */}
      <div className="flex items-center justify-between mt-3 p-3 rounded-xl bg-[#0a080c] border border-[#f5f3ef]/10">
        <span className="text-sm text-[#a69b8a]">Quantity</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCartQuantity(Math.max(1, cartQuantity - 1))}
            disabled={!isBottleComplete}
            className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors disabled:opacity-50"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-[#f5f3ef] font-medium w-8 text-center">{cartQuantity}</span>
          <button
            onClick={() => setCartQuantity(cartQuantity + 1)}
            disabled={!isBottleComplete}
            className="w-8 h-8 rounded-lg bg-[#111] border border-[#f5f3ef]/10 flex items-center justify-center text-[#a69b8a] hover:text-[#f5f3ef] hover:border-[#c9a227]/30 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button 
        onClick={onAddToCart}
        disabled={!canAddToCart || isCartLoading}
        className="w-full mt-3 py-3 rounded-xl bg-[#2ecc71] text-[#0a080c] font-medium hover:bg-[#27ae60] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#2ecc71]/20"
      >
        {isCartLoading ? (
          <div className="w-5 h-5 border-2 border-[#0a080c]/30 border-t-[#0a080c] rounded-full animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {isCartLoading ? 'Adding...' : `Add ${cartQuantity} to Cart`}
        <span className="text-xs opacity-70">({formatAtelierPrice(estimatedPrice * cartQuantity)})</span>
      </button>
      
      {/* Missing Crystal/Cord Warning */}
      {isBottleComplete && (!selectedCrystalId || !selectedCordId) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-3">
          <p className="text-xs text-amber-400 text-center">
            {!selectedCrystalId && !selectedCordId 
              ? "Please select a crystal and cord to proceed"
              : !selectedCrystalId 
                ? "Please select a crystal to proceed"
                : "Please select a cord to proceed"
            }
          </p>
        </div>
      )}
      
      {!canAddToCart && unacknowledgedCriticalCount > 0 && (
        <p className="text-xs text-red-400 mt-2 text-center">
          Acknowledge all critical warnings to enable checkout
        </p>
      )}
    </div>
  )
}
