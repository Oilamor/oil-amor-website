'use client'

// ============================================================================
// MIXING ATELIER — ORCHESTRATION SHELL
// State and behavior live in ./hooks/useAtelierState; UI lives in ./components.
// ============================================================================

import dynamic from 'next/dynamic'
import { AnimatePresence } from 'framer-motion'
import { Toast } from '@/app/components/toast'

import { CARRIER_OILS } from './atelier-utils'
import { useAtelierState } from './hooks/useAtelierState'
import { AtelierHeader } from './components/AtelierHeader'
import { BlendChamber } from './components/BlendChamber'
import { CarrierOilSelector } from './components/CarrierOilSelector'
import { CordSelector } from './components/CordSelector'
import { CrystalSelector } from './components/CrystalSelector'
import { EnhancedSafetySummary } from './components/EnhancedSafetySummary'
import { MironVioletGlassBanner } from './components/MironVioletGlassBanner'
import { ModeBottleConfig } from './components/ModeBottleConfig'
import { OilCatalogSection } from './components/OilCatalogSection'
import { OilInteractionWarnings } from './components/OilInteractionWarnings'
import { PriceActionsPanel } from './components/PriceActionsPanel'
import { QuickActionsPanel } from './components/QuickActionsPanel'
import { RevelationCard } from './components/RevelationCard'

// Conditional modals/overlays — code-split out of the initial bundle.
// All render only behind a boolean state flag, so a null fallback preserves
// the closed-state (hidden) behavior.
const HealthProfileForm = dynamic(
  () => import('@/components/mixing/HealthProfileForm').then(m => m.HealthProfileForm),
  { ssr: false, loading: () => null }
)
const LivingBlendCodexModal = dynamic(
  () => import('@/components/mixing/LivingBlendCodex').then(m => m.LivingBlendCodex),
  { ssr: false, loading: () => null }
)
const ShareModal = dynamic(
  () => import('./components/ShareModal').then(m => m.ShareModal),
  { ssr: false, loading: () => null }
)
const CertificateModal = dynamic(
  () => import('./components/CertificateModal').then(m => m.CertificateModal),
  { ssr: false, loading: () => null }
)
const SaveDraftDialog = dynamic(
  () => import('./components/SaveDraftDialog').then(m => m.SaveDraftDialog),
  { ssr: false, loading: () => null }
)
const OilDetailModal = dynamic(
  () => import('./components/OilDetailModal').then(m => m.OilDetailModal),
  { ssr: false, loading: () => null }
)

export default function MixingAtelierPage() {
  const {
    // Profile form gate
    showProfileForm,
    setShowProfileForm,
    // Toasts
    toasts,
    addToast,
    removeToast,
    // Core blend state
    mode,
    handleModeChange,
    selectedOils,
    carrierRatio,
    handleCarrierRatioChange,
    selectedCarrierOilId,
    setSelectedCarrierOilId,
    bottleSize,
    handleBottleSizeChange,
    showCarrierSelector,
    setShowCarrierSelector,
    // Derived capacity data
    carrierOilMl,
    currentEssentialOilMl,
    maxEssentialOilMl,
    remainingCapacity,
    isBottleComplete,
    isOverfilled,
    // Catalog
    selectedCategories,
    setSelectedCategories,
    showAllCategories,
    setShowAllCategories,
    suggestedOils,
    oilSearchQuery,
    setOilSearchQuery,
    filteredOils,
    // Safety
    validation,
    comprehensiveSafety,
    handleSafetyAcknowledge,
    acknowledgedWarningIds,
    unacknowledgedCriticalCount,
    canAddToCart,
    healthProfile,
    acknowledgedInteractions,
    handleAcknowledgeInteraction,
    // Crystal / cord
    selectedCrystalId,
    setSelectedCrystalId,
    showCrystalSelector,
    setShowCrystalSelector,
    selectedCordId,
    setSelectedCordId,
    // Revelation
    isGeneratingRevelation,
    revelationFact,
    handleRevealBlend,
    blendCodex,
    showRevelationModal,
    setShowRevelationModal,
    // Pricing
    estimatedPrice,
    blendRarity,
    priceBreakdown,
    // Blend metadata & actions
    recipeName,
    recipeNameError,
    handleRecipeNameChange,
    intendedUse,
    setIntendedUse,
    blendDescription,
    setBlendDescription,
    blendStory,
    setBlendStory,
    tags,
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    consentToShare,
    setConsentToShare,
    handleSaveRecipe,
    isSaving,
    handleShareBlend,
    showSaveDraftDialog,
    setShowSaveDraftDialog,
    handleSaveDraft,
    cartQuantity,
    setCartQuantity,
    handleAddToCart,
    isCartLoading,
    // Navigation
    myRecipes,
    handleNavigateToMyRecipes,
    handleNavigateToCommunity,
    // Share / certificate modals
    showShareModal,
    setShowShareModal,
    shareUrl,
    showCertificateModal,
    setShowCertificateModal,
    handleDownloadCertificate,
    // Oil detail modal
    selectedOilForDetail,
    isOilDetailModalOpen,
    setIsOilDetailModalOpen,
    handleShowOilDetail,
    // Oil handlers
    handleAddOil,
    handleRemoveOil,
    handleAdjustOil,
  } = useAtelierState()

  // Render profile form or main atelier
  if (showProfileForm) {
    return (
      <main className="min-h-screen bg-[#0a080c] pt-32 pb-16">
        <div className="max-w-2xl mx-auto px-6">
          <HealthProfileForm onComplete={() => setShowProfileForm(false)} onSkip={() => setShowProfileForm(false)} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a080c] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <AtelierHeader onEditProfile={() => setShowProfileForm(true)} />

        {/* Miron Violet Glass Banner */}
        <div className="mb-8">
          <MironVioletGlassBanner mode={mode} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN - Oil Selection */}
          {/* min-w-0 lets the column shrink below its content's intrinsic
              width on phones instead of stretching the grid track */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Mode Selection, Bottle Size & Dilution */}
            <ModeBottleConfig
              mode={mode}
              onModeChange={handleModeChange}
              bottleSize={bottleSize}
              onBottleSizeChange={handleBottleSizeChange}
              carrierRatio={carrierRatio}
              onCarrierRatioChange={handleCarrierRatioChange}
              currentEssentialOilMl={currentEssentialOilMl}
              maxEssentialOilMl={maxEssentialOilMl}
              carrierOilMl={carrierOilMl}
              isOverfilled={isOverfilled}
              isBottleComplete={isBottleComplete}
            />

            {/* Carrier Oil Selection - Collapsible */}
            {mode === 'carrier' && (
              <CarrierOilSelector
                selectedCarrierOilId={selectedCarrierOilId}
                onSelect={setSelectedCarrierOilId}
                showCarrierSelector={showCarrierSelector}
                onToggle={setShowCarrierSelector}
              />
            )}

            {/* Revolutionary Blend Chamber - Real-time Visualization */}
            <BlendChamber
              selectedOils={selectedOils}
              bottleSize={bottleSize}
              mode={mode}
              carrierRatio={carrierRatio}
              carrierOilName={mode === 'carrier' ? CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name : undefined}
              onAdjustOil={handleAdjustOil}
              onRemoveOil={handleRemoveOil}
              maxEssentialOilMl={maxEssentialOilMl}
              currentEssentialOilMl={currentEssentialOilMl}
              isBottleComplete={isBottleComplete}
            />

            {/* Category Filters, Recommendations, Search & Available Oils */}
            <OilCatalogSection
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              showAllCategories={showAllCategories}
              setShowAllCategories={setShowAllCategories}
              suggestedOils={suggestedOils}
              oilSearchQuery={oilSearchQuery}
              setOilSearchQuery={setOilSearchQuery}
              filteredOils={filteredOils}
              selectedOils={selectedOils}
              currentEssentialOilMl={currentEssentialOilMl}
              maxEssentialOilMl={maxEssentialOilMl}
              bottleSize={bottleSize}
              mode={mode}
              comprehensiveSafety={comprehensiveSafety}
              onAddOil={handleAddOil}
              onRemoveOil={handleRemoveOil}
              onAdjustOil={handleAdjustOil}
              onShowOilDetail={handleShowOilDetail}
            />

          </div>

          {/* RIGHT COLUMN - Safety & Actions */}
          <div className="space-y-6 min-w-0">
            {/* Enhanced Safety Summary with Acknowledgment */}
            <EnhancedSafetySummary
              validation={validation}
              comprehensiveSafety={comprehensiveSafety}
              onAcknowledge={handleSafetyAcknowledge}
              acknowledgedIds={acknowledgedWarningIds}
              healthProfile={healthProfile}
            />

            {/* Oil Interaction Warnings */}
            {selectedOils.length > 1 && (
              <OilInteractionWarnings 
                selectedOils={selectedOils} 
                userProfile={{
                  isPregnant: healthProfile?.isPregnant,
                  isTryingToConceive: healthProfile?.isTryingToConceive,
                  onBloodThinners: healthProfile?.medications?.some((m: any) => 
                    ['warfarin', 'apixaban', 'rivaroxaban', 'eliquis', 'xarelto'].some(d => 
                      m.name.toLowerCase().includes(d)
                    )
                  ),
                  hasEpilepsy: healthProfile?.healthConditions?.some((c: string) => 
                    c.toLowerCase().includes('epilepsy') || c.toLowerCase().includes('seizure')
                  ),
                  hasBleedingDisorder: healthProfile?.healthConditions?.some((c: string) => 
                    c.toLowerCase().includes('hemophilia') || c.toLowerCase().includes('bleeding')
                  ),
                  age: healthProfile?.age,
                }}
                acknowledgedInteractions={acknowledgedInteractions}
                onAcknowledgeInteraction={handleAcknowledgeInteraction}
              />
            )}

            {/* Crystal Selection - Always Visible */}
            <CrystalSelector
              selectedCrystalId={selectedCrystalId}
              onSelectCrystal={setSelectedCrystalId}
              showCrystalSelector={showCrystalSelector}
              onToggleSelector={setShowCrystalSelector}
            />

            {/* Cord Selection */}
            <div className="p-6 rounded-2xl bg-[#111] border border-[#f5f3ef]/10">
              <CordSelector 
                selectedCordId={selectedCordId}
                onSelect={setSelectedCordId}
              />
              </div>

            {/* Blend Revelation Button */}
            <RevelationCard
              visible={selectedOils.length > 0 && isBottleComplete}
              mode={mode}
              carrierRatio={carrierRatio}
              isGeneratingRevelation={isGeneratingRevelation}
              revelationFact={revelationFact}
              onReveal={handleRevealBlend}
            />

            {/* Price & Actions */}
            <PriceActionsPanel
              estimatedPrice={estimatedPrice}
              blendRarity={blendRarity}
              priceBreakdown={priceBreakdown}
              selectedOils={selectedOils}
              selectedCarrierOilId={selectedCarrierOilId}
              selectedCordId={selectedCordId}
              selectedCrystalId={selectedCrystalId}
              bottleSize={bottleSize}
              mode={mode}
              isBottleComplete={isBottleComplete}
              isOverfilled={isOverfilled}
              currentEssentialOilMl={currentEssentialOilMl}
              maxEssentialOilMl={maxEssentialOilMl}
              remainingCapacity={remainingCapacity}
              unacknowledgedCriticalCount={unacknowledgedCriticalCount}
              recipeName={recipeName}
              recipeNameError={recipeNameError}
              onRecipeNameChange={handleRecipeNameChange}
              intendedUse={intendedUse}
              setIntendedUse={setIntendedUse}
              blendDescription={blendDescription}
              setBlendDescription={setBlendDescription}
              blendStory={blendStory}
              setBlendStory={setBlendStory}
              tags={tags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              comprehensiveSafety={comprehensiveSafety}
              acknowledgedWarningIds={acknowledgedWarningIds}
              consentToShare={consentToShare}
              setConsentToShare={setConsentToShare}
              onSaveRecipe={handleSaveRecipe}
              isSaving={isSaving}
              onShareBlend={handleShareBlend}
              onSaveDraftClick={() => setShowSaveDraftDialog(true)}
              cartQuantity={cartQuantity}
              setCartQuantity={setCartQuantity}
              onAddToCart={handleAddToCart}
              canAddToCart={canAddToCart}
              isCartLoading={isCartLoading}
            />

            {/* Quick Links */}
            <QuickActionsPanel
              recipeCount={myRecipes.length}
              onNavigateToMyRecipes={handleNavigateToMyRecipes}
              onNavigateToCommunity={handleNavigateToCommunity}
            />
          </div>
        </div>
      </div>

      {/* Living Blend Codex Modal */}
      <LivingBlendCodexModal
        codex={blendCodex}
        isOpen={showRevelationModal}
        onClose={() => setShowRevelationModal(false)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        recipeName={recipeName}
        addToast={addToast}
      />

      {/* Certificate Download Modal */}
      <CertificateModal
        isOpen={showCertificateModal}
        blendCodex={blendCodex}
        onClose={() => setShowCertificateModal(false)}
        onDownload={handleDownloadCertificate}
      />

      {/* Save Draft Dialog */}
      <SaveDraftDialog
        isOpen={showSaveDraftDialog}
        onClose={() => setShowSaveDraftDialog(false)}
        onSave={handleSaveDraft}
        recipeName={recipeName}
        selectedOils={selectedOils}
        mode={mode}
        bottleSize={bottleSize}
      />

      {/* Oil Detail Modal */}
      <OilDetailModal
        oil={selectedOilForDetail}
        isOpen={isOilDetailModalOpen}
        onClose={() => setIsOilDetailModalOpen(false)}
        onAddOil={handleAddOil}
        isAdded={selectedOilForDetail ? selectedOils.some(o => o.oilId === selectedOilForDetail.id) : false}
        currentMl={selectedOilForDetail ? selectedOils.find(o => o.oilId === selectedOilForDetail.id)?.ml || 0 : 0}
        mode={mode}
      />

      {/* Toast Notifications */}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </main>
  )
}
