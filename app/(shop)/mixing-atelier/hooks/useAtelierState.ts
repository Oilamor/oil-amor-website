'use client'

// ============================================================================
// HOOK: useAtelierState
// All Mixing Atelier page state, derived data, effects, and handlers.
// Extracted verbatim from page.tsx (structural refactor, no behavior change).
// ============================================================================

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Context
import { useHealthProfile } from '@/lib/context/health-profile-context'
import { useRecipes } from '@/lib/context/recipe-context'
import { useUser } from '@/lib/context/user-context'
import { useCart } from '@/app/hooks/use-cart'

// Safety System
import { 
  validateOilMix, 
  MixValidationResult, 
  MixComponent,
} from '@/lib/safety'
import { 
  validateMixSafety,
  SafetyValidationResult,
  OilComponent,
  ExperienceLevel,
  UserSafetyProfile,
} from '@/lib/safety/comprehensive-safety-v2'
import { AGE_DOSAGE_LIMITS } from '@/lib/safety/medication-database'
import { getInteractionsForMix } from '@/lib/safety/oil-interactions'

import { logger } from '@/lib/logging/logger'

// Atelier data - all 17 collection oils
import { 
  ATELIER_OILS, 
  calculateAtelierPrice,
  getAllCrystals,
  AtelierOil,
} from '@/lib/atelier/atelier-engine'

// Cord & Revelation Systems
import { 
  DEFAULT_SIMPLE_CORD, 
  getSimpleCordById,
} from '@/lib/atelier/cord-data-simple'

// Living Blend Codex
import { LivingBlendCodex, BlendCodex } from '@/lib/atelier/living-blend-codex'

// Oil Wisdom
import { 
  getOilWisdom, 
  OilCategory,
} from '@/lib/atelier/oil-wisdom'

// Types
import { AddToCartInput } from '@/lib/cart/types'

import {
  AVAILABLE_OILS,
  BLEND_FACTS,
  BlendMode,
  CARRIER_DEFAULT_ML,
  CARRIER_OILS,
  getMlDecimals,
  getMlPrecision,
  INTENDED_USES,
  PROFANITY_LIST,
  PURE_DEFAULT_ML,
} from '../atelier-utils'

export function useAtelierState() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeProfile, isProfileComplete } = useHealthProfile()
  const healthProfile = activeProfile?.data
  const { createRecipe, myRecipes } = useRecipes()
  const { isAuthenticated, user } = useUser()
  const { addItem, isLoading: isCartLoading, openCart } = useCart()
  
  // Safety check: Show profile form by default (safety first), hide only if profile is complete
  const [showProfileForm, setShowProfileForm] = useState(!isProfileComplete)
  const [mode, setMode] = useState<BlendMode>('pure')
  
  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([])
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])
  
  // Update showProfileForm when isProfileComplete changes (e.g., after context loads)
  useEffect(() => {
    setShowProfileForm(!isProfileComplete)
  }, [isProfileComplete])

  const [selectedOils, setSelectedOils] = useState<{ oilId: string; ml: number }[]>([])
  const [carrierRatio, setCarrierRatio] = useState<number>(25)
  const [selectedCarrierOilId, setSelectedCarrierOilId] = useState<string>('jojoba')
  const [bottleSize, setBottleSize] = useState<number>(30)
  const [recipeName, setRecipeName] = useState('')
  const [blendDescription, setBlendDescription] = useState('')
  const [blendStory, setBlendStory] = useState('')
  const [sourceBlendId, setSourceBlendId] = useState<string | null>(null)
  const [consentToShare, setConsentToShare] = useState(false)
  const [cartQuantity, setCartQuantity] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCrystalId, setSelectedCrystalId] = useState<string | undefined>('clear-quartz')
  const [showCrystalSelector, setShowCrystalSelector] = useState(false)
  const [showCarrierSelector, setShowCarrierSelector] = useState(false)
  
  // New state for enhancements
  const [intendedUse, setIntendedUse] = useState<string>('other')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [oilSearchQuery, setOilSearchQuery] = useState('')
  const [acknowledgedWarningIds, setAcknowledgedWarningIds] = useState<string[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [showCertificateModal, setShowCertificateModal] = useState(false)

  const hasLoadedDraftRef = useRef(false)

  // Load draft: URL param takes precedence, otherwise localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hasLoadedDraftRef.current) return
    hasLoadedDraftRef.current = true
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('blend')
    if (encoded) {
      try {
        const json = atob(encoded)
        const data = JSON.parse(json)
        if (data.oils && Array.isArray(data.oils)) {
          setSelectedOils(data.oils.map((o: any) => ({ oilId: o.oilId, ml: o.ml })))
        }
        if (data.mode === 'pure' || data.mode === 'carrier') {
          setMode(data.mode)
        }
        if (typeof data.bottleSize === 'number') {
          setBottleSize(data.bottleSize)
        }
        if (typeof data.carrierRatio === 'number') {
          setCarrierRatio(data.carrierRatio)
        }
        if (data.carrierOilId) {
          setSelectedCarrierOilId(data.carrierOilId)
        }
        if (data.crystalId) {
          setSelectedCrystalId(data.crystalId)
        }
        if (data.cordId) {
          setSelectedCordId(data.cordId)
        }
        if (data.name) {
          setRecipeName(data.name)
        }
        if (data.blendId) {
          setSourceBlendId(data.blendId)
        }
        // Also persist this shared blend to localStorage so it survives refresh
        localStorage.setItem('oil-amor-atelier-draft', json)
      } catch {
        // ignore invalid blend param
      }
      return
    }

    // No URL param: try to restore from localStorage
    const saved = localStorage.getItem('oil-amor-atelier-draft')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.oils && Array.isArray(data.oils)) {
          setSelectedOils(data.oils.map((o: any) => ({ oilId: o.oilId, ml: o.ml })))
        }
        if (data.mode === 'pure' || data.mode === 'carrier') {
          setMode(data.mode)
        }
        if (typeof data.bottleSize === 'number') {
          setBottleSize(data.bottleSize)
        }
        if (typeof data.carrierRatio === 'number') {
          setCarrierRatio(data.carrierRatio)
        }
        if (data.carrierOilId) {
          setSelectedCarrierOilId(data.carrierOilId)
        }
        if (data.crystalId) {
          setSelectedCrystalId(data.crystalId)
        }
        if (data.cordId) {
          setSelectedCordId(data.cordId)
        }
        if (data.name || data.recipeName) {
          setRecipeName(data.name || data.recipeName || '')
        }
        if (data.blendDescription || data.description) {
          setBlendDescription(data.blendDescription || data.description || '')
        }
        if (data.blendStory || data.story) {
          setBlendStory(data.blendStory || data.story || '')
        }
        if (data.intendedUse) {
          setIntendedUse(data.intendedUse)
        }
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags)
        }
        if (typeof data.consentToShare === 'boolean') {
          setConsentToShare(data.consentToShare)
        }
      } catch {
        // ignore corrupted draft
      }
    }
  }, [searchParams])


  // Cord & Revelation State
  const [selectedCordId, setSelectedCordId] = useState<string>(DEFAULT_SIMPLE_CORD.id)
  const [showRevelationModal, setShowRevelationModal] = useState(false)
  const [blendCodex, setBlendCodex] = useState<BlendCodex | null>(null)
  const [isGeneratingRevelation, setIsGeneratingRevelation] = useState(false)
  const [revelationFact, setRevelationFact] = useState('')
  
  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState<OilCategory[]>([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [selectedOilForWisdom, setSelectedOilForWisdom] = useState<string | null>(null)
  const [selectedOilForDetail, setSelectedOilForDetail] = useState<AtelierOil | null>(null)
  const [isOilDetailModalOpen, setIsOilDetailModalOpen] = useState(false)
  
  // Draft saving state
  const [savedDrafts, setSavedDrafts] = useState<Array<{
    id: string
    name: string
    notes: string
    oils: { oilId: string; ml: number }[]
    mode: BlendMode
    bottleSize: number
    createdAt: string
  }>>([])
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false)
  
  // Acknowledged oil-oil interactions (for consent tracking)
  const [acknowledgedInteractions, setAcknowledgedInteractions] = useState<string[]>([])
  
  // Recipe name validation
  const [recipeNameError, setRecipeNameError] = useState<string | null>(null)
  
  // Persist atelier state to localStorage so refresh doesn't lose work
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft = {
      oils: selectedOils,
      mode,
      bottleSize,
      carrierRatio,
      carrierOilId: selectedCarrierOilId,
      crystalId: selectedCrystalId,
      cordId: selectedCordId,
      name: recipeName,
      blendDescription,
      blendStory,
      intendedUse,
      tags,
      consentToShare,
    }
    localStorage.setItem('oil-amor-atelier-draft', JSON.stringify(draft))
  }, [selectedOils, mode, bottleSize, carrierRatio, selectedCarrierOilId, selectedCrystalId, selectedCordId, recipeName, blendDescription, blendStory, intendedUse, tags, consentToShare])
  
  // Calculate maximum essential oil capacity
  const maxEssentialOilMl = useMemo(() => {
    if (mode === 'pure') {
      return bottleSize
    } else {
      return Math.round((bottleSize * carrierRatio) / 100 * 10) / 10
    }
  }, [mode, bottleSize, carrierRatio])
  
  const carrierOilMl = useMemo(() => {
    if (mode === 'pure') return 0
    return Math.round((bottleSize - maxEssentialOilMl) * 10) / 10
  }, [mode, bottleSize, maxEssentialOilMl])
  
  // Deduplicate and calculate total (keep last occurrence if duplicates exist)
  const currentEssentialOilMl = useMemo(() => {
    const uniqueOils = new Map<string, number>()
    // Process in reverse to keep last occurrence
    for (let i = selectedOils.length - 1; i >= 0; i--) {
      const o = selectedOils[i]
      if (!uniqueOils.has(o.oilId)) {
        uniqueOils.set(o.oilId, o.ml)
      }
    }
    return parseFloat(Array.from(uniqueOils.values()).reduce((sum, ml) => sum + ml, 0).toFixed(2))
  }, [selectedOils])
  
  const remainingCapacity = useMemo(() => {
    return parseFloat((maxEssentialOilMl - currentEssentialOilMl).toFixed(2))
  }, [maxEssentialOilMl, currentEssentialOilMl])
  
  const isBottleComplete = useMemo(() => {
    // Use small epsilon for floating point comparison
    return remainingCapacity < 0.05 && currentEssentialOilMl > 0
  }, [remainingCapacity, currentEssentialOilMl])
  
  const isOverfilled = useMemo(() => {
    return currentEssentialOilMl > maxEssentialOilMl
  }, [currentEssentialOilMl, maxEssentialOilMl])
  
  // Calculate oil percentages
  const oilPercentages = useMemo(() => {
    if (currentEssentialOilMl === 0) return {}
    const percentages: Record<string, number> = {}
    selectedOils.forEach(o => {
      percentages[o.oilId] = Math.round((o.ml / currentEssentialOilMl) * 100)
    })
    return percentages
  }, [selectedOils, currentEssentialOilMl])
  
  const mixComponentsForValidation = useMemo<MixComponent[]>(() => {
    return selectedOils.map(o => ({
      oilId: o.oilId,
      ml: Math.round(o.ml * 10) / 10
    }))
  }, [selectedOils])
  
  const validation = useMemo<MixValidationResult | null>(() => {
    if (!healthProfile || selectedOils.length === 0) return null
    return validateOilMix({
      oils: mixComponentsForValidation,
      userProfile: healthProfile,
      totalVolumeMl: bottleSize,
      mode,
      intendedUse: healthProfile.intendedUse,
    })
  }, [mixComponentsForValidation, healthProfile, bottleSize, mode, selectedOils.length])

  // Comprehensive safety validation
  const comprehensiveSafety = useMemo<SafetyValidationResult | null>(() => {
    if (!healthProfile || selectedOils.length === 0) return null
    
    const oilComponents: OilComponent[] = selectedOils.map(o => ({
      oilId: o.oilId,
      name: ATELIER_OILS.find(ao => ao.id === o.oilId)?.name || o.oilId,
      ml: o.ml,
      drops: Math.round(o.ml * 20) // Keep for backwards compatibility with safety validation
    }))
    
    // Determine age group based on age
    const ageGroup: keyof typeof AGE_DOSAGE_LIMITS = 
      healthProfile.age < 0.25 ? 'infant_0_3mo' :
      healthProfile.age < 0.5 ? 'infant_3_6mo' :
      healthProfile.age < 1 ? 'infant_6_12mo' :
      healthProfile.age < 2 ? 'child_1_2yr' :
      healthProfile.age < 6 ? 'child_2_6yr' :
      healthProfile.age < 12 ? 'child_6_12yr' :
      healthProfile.age < 15 ? 'teen_12_15yr' :
      healthProfile.age < 65 ? 'adult' : 'elderly'
    
    const userProfile: UserSafetyProfile = {
      age: healthProfile.age,
      ageGroup,
      isPregnant: healthProfile.isPregnant,
      isBreastfeeding: healthProfile.isBreastfeeding,
      isTryingToConceive: healthProfile.isTryingToConceive,
      medications: healthProfile.medications.map((m: string) => ({ id: m, name: m, isActive: true })),
      healthConditions: healthProfile.conditions,
      knownAllergies: healthProfile.knownAllergies,
      hasSensitiveSkin: healthProfile.skinSensitivity !== 'normal',
      respiratorySensitivity: healthProfile.respiratorySensitivity,
      experienceLevel: (healthProfile.aromatherapyExperience as ExperienceLevel) || 'beginner',
    }
    
    return validateMixSafety(oilComponents, userProfile, mode === 'pure' ? 'inhalation' : 'topical')
  }, [selectedOils, healthProfile, mode])
  
  // Check if all critical warnings are acknowledged
  const allCriticalAcknowledged = useMemo(() => {
    if (!comprehensiveSafety?.requiresAcknowledgment) return true
    const criticalWarnings = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'critical' && w.requiresAcknowledgment)
    if (criticalWarnings.length === 0) return true
    return criticalWarnings.every(w => acknowledgedWarningIds.includes(w.id))
  }, [comprehensiveSafety, acknowledgedWarningIds])
  
  // Count unacknowledged critical warnings
  const unacknowledgedCriticalCount = useMemo(() => {
    if (!comprehensiveSafety) return 0
    const criticalWarnings = comprehensiveSafety.warnings.filter(w => w.riskLevel === 'critical' && w.requiresAcknowledgment)
    return criticalWarnings.filter(w => !acknowledgedWarningIds.includes(w.id)).length
  }, [comprehensiveSafety, acknowledgedWarningIds])
  
  // Check if all critical oil-oil interactions are acknowledged
  const allInteractionsAcknowledged = useMemo(() => {
    if (selectedOils.length < 2) return true
    const interactions = getInteractionsForMix(selectedOils.map(o => o.oilId))
    const criticalInteractions = interactions.filter(i => i.severity === 'critical')
    if (criticalInteractions.length === 0) return true
    return criticalInteractions.every(i => 
      acknowledgedInteractions.includes(`${i.oilId1}-${i.oilId2}`)
    )
  }, [selectedOils, acknowledgedInteractions])
  
  const canAddToCart = useMemo(() => {
    return isBottleComplete && 
           validation?.canProceed && 
           allCriticalAcknowledged && 
           allInteractionsAcknowledged &&
           recipeName.trim().length >= 2 &&
           selectedCrystalId !== undefined &&
           selectedCordId !== undefined
  }, [isBottleComplete, validation?.canProceed, allCriticalAcknowledged, allInteractionsAcknowledged, recipeName, selectedCrystalId, selectedCordId])
  
  const priceBreakdown = useMemo(() => {
    if (selectedOils.length === 0) return null
    
    try {
      return calculateAtelierPrice({
        name: recipeName || 'Custom Blend',
        mode,
        bottleSize: bottleSize as 5 | 10 | 15 | 20 | 30,
        components: selectedOils,
        strength: mode === 'pure' ? 100 : carrierRatio,
        crystalId: selectedCrystalId,
        cordId: selectedCordId,
        safetyScore: validation?.safetyScore,
      })
    } catch {
      // Unknown oil in a shared/loaded recipe — nothing valid to price
      return null
    }
  }, [selectedOils, bottleSize, mode, carrierRatio, selectedCrystalId, selectedCordId, recipeName, validation?.safetyScore])
  
  const estimatedPrice = priceBreakdown?.total || 0
  
  // Calculate blend rarity score
  const blendRarity = useMemo(() => {
    if (selectedOils.length === 0) return null
    
    let score = 0
    let luxuryCount = 0
    let premiumCount = 0
    
    selectedOils.forEach(o => {
      const oil = ATELIER_OILS.find(ao => ao.id === o.oilId)
      if (!oil) return
      
      if (oil.rarity === 'luxury') {
        score += 30
        luxuryCount++
      } else if (oil.rarity === 'premium') {
        score += 15
        premiumCount++
      } else {
        score += 5
      }
    })
    
    // Bonus for complexity
    score += selectedOils.length * 5
    
    // Bonus for crystal
    if (selectedCrystalId) score += 10
    
    // Cap at 100
    score = Math.min(score, 100)
    
    let rarity = 'Common'
    if (score >= 80) rarity = 'Legendary'
    else if (score >= 60) rarity = 'Epic'
    else if (score >= 40) rarity = 'Rare'
    else if (score >= 20) rarity = 'Uncommon'
    
    return { score, rarity, luxuryCount, premiumCount }
  }, [selectedOils, selectedCrystalId])
  
  // Get suggested oils based on health profile
  const suggestedOils = useMemo(() => {
    if (!healthProfile?.intendedUse) return []
    
    const useToCategories: Record<string, OilCategory[]> = {
      'sleep': ['stress-relief', 'grounding'],
      'energy': ['mood-uplifting', 'circulation'],
      'focus': ['mental-clarity', 'mood-uplifting'],
      'immunity': ['immune-support', 'antimicrobial'],
      'pain-relief': ['pain-relief', 'anti-inflammatory'],
      'stress-relief': ['stress-relief', 'grounding'],
    }
    
    const intendedUseKey = String(healthProfile.intendedUse || '')
    const categories = useToCategories[intendedUseKey] || []
    return AVAILABLE_OILS.filter(oil => {
      const wisdom = getOilWisdom(oil.id)
      if (!wisdom) return false
      return categories.some((cat: OilCategory) => wisdom.categories.includes(cat))
    }).slice(0, 4)
  }, [healthProfile])
  
  // Handle acknowledgment from SafetySummary
  const handleSafetyAcknowledge = useCallback((warningIds: string[]) => {
    setAcknowledgedWarningIds(warningIds)
  }, [])
  
  // Recipe name validation
  const validateRecipeName = useCallback((name: string): string | null => {
    if (name.length < 2) return 'Name must be at least 2 characters'
    if (name.length > 50) return 'Name must be less than 50 characters'
    const lowerName = name.toLowerCase()
    for (const word of PROFANITY_LIST) {
      if (lowerName.includes(word)) return 'Please use appropriate language'
    }
    return null
  }, [])
  
  const handleRecipeNameChange = useCallback((value: string) => {
    setRecipeName(value)
    setRecipeNameError(validateRecipeName(value))
  }, [validateRecipeName])
  
  const handleAddOil = useCallback((oilId: string) => {
    // Prevent adding oil if bottle is at capacity
    if (currentEssentialOilMl >= maxEssentialOilMl) return
    
    const oil = ATELIER_OILS.find(o => o.id === oilId)
    if (!oil) return
    
    const existing = selectedOils.find(o => o.oilId === oilId)
    const precision = getMlPrecision(mode)
    const decimals = getMlDecimals(mode)
    
    // Dynamic default: scale down for small carrier blends so multiple oils fit
    const rawDefault = mode === 'pure' 
      ? PURE_DEFAULT_ML 
      : Math.min(CARRIER_DEFAULT_ML, Math.max(precision, maxEssentialOilMl / 5))
    const defaultAmount = parseFloat(rawDefault.toFixed(decimals))
    
    if (existing) {
      // Only add precision increment if we have room
      if (currentEssentialOilMl + precision > maxEssentialOilMl) return
      setSelectedOils(prev => prev.map(o => 
        o.oilId === oilId 
          ? { ...o, ml: parseFloat(Math.min(o.ml + precision, maxEssentialOilMl).toFixed(decimals)) }
          : o
      ))
    } else {
      // For new oils: use default if it fits, otherwise use remaining capacity (min 1 precision unit)
      const remaining = maxEssentialOilMl - currentEssentialOilMl
      if (remaining < precision) return
      const addAmount = Math.min(defaultAmount, remaining)
      setSelectedOils(prev => [...prev, { oilId, ml: parseFloat(addAmount.toFixed(decimals)) }])
    }
  }, [selectedOils, maxEssentialOilMl, mode, currentEssentialOilMl])
  
  const handleRemoveOil = useCallback((oilId: string) => {
    setSelectedOils(prev => prev.filter(o => o.oilId !== oilId))
  }, [])
  
  const handleAdjustOil = useCallback((oilId: string, delta: number) => {
    setSelectedOils(prev => {
      // Calculate current total essential oil ml from previous state
      const prevTotal = prev.reduce((sum, o) => sum + o.ml, 0)
      
      return prev.map(o => {
        if (o.oilId !== oilId) return o
        
        // Calculate what the new amount would be
        const proposedMl = o.ml + delta
        
        // Calculate what the new total would be (subtract old amount, add new amount)
        const newTotal = prevTotal - o.ml + proposedMl
        
        // ENFORCE CAPACITY LIMIT: Don't allow exceeding maxEssentialOilMl
        if (delta > 0 && newTotal > maxEssentialOilMl) {
          // Only add what we can up to the max
          const maxAllowedForThisOil = o.ml + (maxEssentialOilMl - prevTotal)
          const cappedMl = Math.max(0, parseFloat(maxAllowedForThisOil.toFixed(2)))
          return cappedMl <= 0 ? null : { ...o, ml: cappedMl }
        }
        
        // Normal case: apply delta with lower bound of 0
        const newMl = Math.max(0, parseFloat(proposedMl.toFixed(2)))
        return newMl <= 0 ? null : { ...o, ml: newMl }
      }).filter(Boolean) as typeof prev
    })
  }, [maxEssentialOilMl])
  
  const handleSaveRecipe = useCallback(async () => {
    if (!recipeName.trim() || recipeNameError) {
      addToast('Please enter a valid recipe name', 'error')
      return
    }
    
    setIsSaving(true)
    try {
      await createRecipe({
        name: recipeName,
        description: blendDescription,
        mode,
        oils: selectedOils.map(o => ({ 
          oilId: o.oilId, 
          ml: Math.round(o.ml * 10) / 10,
          percentage: oilPercentages[o.oilId] || 0
        })),
        carrierRatio: mode === 'carrier' ? carrierRatio : undefined,
        carrierOilId: mode === 'carrier' ? selectedCarrierOilId : undefined,
        totalVolume: bottleSize as 5 | 10 | 15 | 20 | 30 | 50 | 100,
        isPublic: consentToShare,
        tags: [...tags, intendedUse as any],
        intendedUse: intendedUse as any,
      })
      addToast('Recipe saved successfully!', 'success')
    } catch (error) {
      logger.error('Failed to save recipe', error instanceof Error ? error : new Error(String(error)))
      addToast('Failed to save recipe. Please try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [recipeName, recipeNameError, blendDescription, mode, bottleSize, carrierRatio, selectedCarrierOilId, selectedOils, oilPercentages, consentToShare, tags, intendedUse, createRecipe, addToast])
  
  // Save draft functionality
  const handleSaveDraft = useCallback((name: string, notes: string) => {
    const newDraft = {
      id: `draft-${Date.now()}`,
      name,
      notes,
      oils: [...selectedOils],
      mode,
      bottleSize,
      createdAt: new Date().toISOString(),
    }
    setSavedDrafts(prev => [newDraft, ...prev])
    addToast('Draft saved successfully!', 'success')
  }, [selectedOils, mode, bottleSize, addToast])
  
  // Add to Cart functionality
  const handleAddToCart = useCallback(async () => {
    if (!canAddToCart) return
    
    try {
      const cord = getSimpleCordById(selectedCordId)
      const crystal = selectedCrystalId 
        ? getAllCrystals().find(c => c.id === selectedCrystalId)
        : undefined
      
      const cartInput: AddToCartInput = {
        productId: 'custom-mix',
        quantity: cartQuantity,
        customMix: {
          recipeName: recipeName.trim(),
          mode,
          oils: selectedOils.map(o => ({
            oilId: o.oilId,
            oilName: ATELIER_OILS.find(ao => ao.id === o.oilId)?.name || o.oilId,
            ml: Math.round(o.ml * 10) / 10,
            percentage: oilPercentages[o.oilId] || 0,
          })),
          carrierRatio: mode === 'carrier' ? carrierRatio : undefined,
          carrierOilId: mode === 'carrier' ? selectedCarrierOilId : undefined,
          totalVolume: bottleSize as 5 | 10 | 15 | 20 | 30 | 50 | 100,
          intendedUse: intendedUse,
          tags: tags,
          safetyScore: comprehensiveSafety?.safetyScore || 100,
          safetyRating: (comprehensiveSafety?.safetyScore || 100) >= 90 ? 'excellent' : 
                        (comprehensiveSafety?.safetyScore || 100) >= 75 ? 'good' :
                        (comprehensiveSafety?.safetyScore || 100) >= 60 ? 'acceptable' :
                        (comprehensiveSafety?.safetyScore || 100) >= 40 ? 'caution' : 'dangerous',
          safetyWarnings: comprehensiveSafety?.warnings.map(w => w.title) || [],
          labCertified: true,
          revelationData: blendCodex ? JSON.parse(JSON.stringify(blendCodex)) : undefined,
          // Community sharing - only include if user consented
          ...(consentToShare && {
            shareToCommunity: true,
            creatorId: user?.id,
            creatorName: user?.name || user?.firstName || 'Anonymous Alchemist',
          }),
        },
        attachment: {
          type: 'cord',
          cordId: selectedCordId,
          cordName: cord.name,
          isMysteryCharm: false,
        },
        configuration: {
          bottleSize: `${bottleSize}ml`,
          mode: mode,
          ...(sourceBlendId && { communityBlendId: sourceBlendId }),
        },
        properties: {
          name: recipeName.trim() || 'Custom Blend',
          price: String(estimatedPrice),
          blendName: recipeName.trim(),
          bottleSize: `${bottleSize}ml`,
          mode: mode,
          carrierOil: mode === 'carrier' ? (CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name || 'Jojoba Oil') : 'None',
          crystal: crystal?.name || 'None',
          cord: cord.name,
          intendedUse: INTENDED_USES.find(u => u.id === intendedUse)?.label || 'Other',
          rarity: blendRarity?.rarity || 'Common',
          ...(sourceBlendId && { blendId: sourceBlendId }),
        },
      }
      
      await addItem(cartInput)
      addToast('Blend added to cart!', 'success')
    } catch (error) {
      logger.error('Failed to add to cart', error instanceof Error ? error : new Error(String(error)))
      addToast('Failed to add to cart. Please try again.', 'error')
    }
  }, [canAddToCart, selectedOils, recipeName, mode, carrierRatio, selectedCarrierOilId, bottleSize, selectedCordId, selectedCrystalId, oilPercentages, comprehensiveSafety, intendedUse, blendRarity, addItem, addToast, consentToShare, user, cartQuantity, sourceBlendId, blendCodex, tags, estimatedPrice])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (canAddToCart) {
          handleSaveRecipe()
        }
      }
      // Ctrl/Cmd + Enter to add to cart
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canAddToCart) {
          handleAddToCart()
        }
      }
      // +/- to adjust last added oil
      if (e.key === '+' || e.key === '=') {
        const lastOil = selectedOils[selectedOils.length - 1]
        const precision = getMlPrecision(mode)
        if (lastOil && currentEssentialOilMl < maxEssentialOilMl) {
          handleAdjustOil(lastOil.oilId, precision)
        }
      }
      if (e.key === '-') {
        const lastOil = selectedOils[selectedOils.length - 1]
        const precision = getMlPrecision(mode)
        if (lastOil) {
          handleAdjustOil(lastOil.oilId, -precision)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canAddToCart, handleSaveRecipe, handleAddToCart, handleAdjustOil, selectedOils, mode, currentEssentialOilMl, maxEssentialOilMl])
  
  // Share blend functionality
  const handleShareBlend = useCallback(() => {
    const blendData = {
      oils: selectedOils,
      mode,
      bottleSize,
      carrierRatio: mode === 'carrier' ? carrierRatio : undefined,
      carrierOilId: mode === 'carrier' ? selectedCarrierOilId : undefined,
      crystalId: selectedCrystalId,
      cordId: selectedCordId,
    }
    
    const encoded = btoa(JSON.stringify(blendData))
    const url = `${window.location.origin}/mixing-atelier?blend=${encoded}`
    
    setShareUrl(url)
    setShowShareModal(true)
    
    navigator.clipboard.writeText(url).then(() => {
      addToast('Blend link copied to clipboard!', 'success')
    }).catch(() => {
      addToast('Failed to copy link', 'error')
    })
  }, [selectedOils, mode, bottleSize, carrierRatio, selectedCarrierOilId, selectedCrystalId, selectedCordId, addToast])
  
  // Navigate to recipes
  const handleNavigateToMyRecipes = useCallback(() => {
    router.push('/account?tab=recipes')
  }, [router])
  
  const handleNavigateToCommunity = useCallback(() => {
    router.push('/community-blends')
  }, [router])
  
  // Generate blend revelation using the Living Blend Codex
  const handleRevealBlend = useCallback(async () => {
    if (selectedOils.length === 0) return
    
    setIsGeneratingRevelation(true)
    setRevelationFact(BLEND_FACTS[Math.floor(Math.random() * BLEND_FACTS.length)])
    
    try {
      const totalMl = selectedOils.reduce((sum, o) => sum + o.ml, 0)
      const totalEssentialOilMl = selectedOils.reduce((sum, o) => sum + o.ml, 0)
      
      // Build the Living Codex Input
      const codexInput = {
        oils: selectedOils.map(o => {
          return {
            id: o.oilId,
            ml: o.ml,
            percentage: (o.ml / totalEssentialOilMl) * 100,
          }
        }),
        crystalId: selectedCrystalId || 'clear-quartz',
        cordId: selectedCordId,
        carrierId: mode === 'pure' ? 'pure' : (selectedCarrierOilId || 'jojoba'),
        bottleSize,
        mode: mode as 'pure' | 'carrier',
        carrierRatio: mode === 'carrier' ? carrierRatio : undefined
      }
      
      // Generate the Living Codex
      const codex = LivingBlendCodex.generate(codexInput)
      if (comprehensiveSafety) {
        codex.safetyValidation = comprehensiveSafety
      }
      setBlendCodex(codex)
      
      setTimeout(() => {
        setShowRevelationModal(true)
        setIsGeneratingRevelation(false)
      }, 1200)
    } catch (error) {
      logger.error('Failed to generate codex', error instanceof Error ? error : new Error(String(error)))
      addToast('Failed to generate blend codex. Please try again.', 'error')
      setIsGeneratingRevelation(false)
    }
  }, [selectedOils, selectedCordId, selectedCrystalId, mode, carrierRatio, selectedCarrierOilId, bottleSize, addToast, comprehensiveSafety])
  
  // Download blend certificate
  const handleDownloadCertificate = useCallback(() => {
    if (!blendCodex) return
    
    const certificateData = {
      blendName: recipeName || blendCodex.name || 'Unnamed Blend',
      soulHash: blendCodex.soulHash,
      uniquenessScore: blendCodex.uniquenessScore,
      essence: blendCodex.essence,
      vibrationalFrequency: blendCodex.composition.vibrationalFrequency,
      elemental: blendCodex.composition.elemental,
      oils: selectedOils.map(o => ({
        name: ATELIER_OILS.find(ao => ao.id === o.oilId)?.name,
        ml: o.ml,
        percentage: oilPercentages[o.oilId],
      })),
      crystal: blendCodex.crystal,
      cord: blendCodex.cord,
      carrier: blendCodex.carrier,
      therapeuticScores: blendCodex.therapeuticScores,
      bestFor: blendCodex.bestFor,
      timing: blendCodex.timing,
      safety: blendCodex.safety,
      ritual: blendCodex.ritual,
      carrierOil: mode === 'carrier' ? CARRIER_OILS.find(c => c.id === selectedCarrierOilId)?.name : null,
      carrierRatio: mode === 'carrier' ? carrierRatio : null,
      createdAt: new Date().toISOString(),
      rarity: blendRarity,
    }
    
    const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recipeName || blendCodex.name || 'blend'}-certificate.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    addToast('Certificate downloaded!', 'success')
  }, [blendCodex, recipeName, selectedOils, oilPercentages, mode, selectedCarrierOilId, carrierRatio, blendRarity, addToast])
  
  // Filter oils by category and search query
  const filteredOils = useMemo(() => {
    let oils = AVAILABLE_OILS
    
    // Category filter
    if (selectedCategories.length > 0) {
      oils = oils.filter(oil => {
        const wisdom = getOilWisdom(oil.id)
        if (!wisdom) return false
        return selectedCategories.some(cat => wisdom.categories.includes(cat))
      })
    }
    
    // Search filter
    if (oilSearchQuery.trim()) {
      const query = oilSearchQuery.toLowerCase()
      oils = oils.filter(oil => 
        oil.name.toLowerCase().includes(query) ||
        oil.scentProfile.toLowerCase().includes(query)
      )
    }
    
    // Sort alphabetically by name
    return oils.sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedCategories, oilSearchQuery])
  
  // Get dominant scent notes from selected oils
  const dominantScentNotes = useMemo(() => {
    if (selectedOils.length === 0) return []
    
    const notes: Record<string, number> = {}
    selectedOils.forEach(o => {
      const oil = ATELIER_OILS.find(ao => ao.id === o.oilId)
      if (!oil) return
      
      const profile = oil.scentProfile.toLowerCase()
      if (profile.includes('citrus')) notes['Citrus'] = (notes['Citrus'] || 0) + o.ml
      if (profile.includes('floral')) notes['Floral'] = (notes['Floral'] || 0) + o.ml
      if (profile.includes('woody')) notes['Woody'] = (notes['Woody'] || 0) + o.ml
      if (profile.includes('herbaceous')) notes['Herbaceous'] = (notes['Herbaceous'] || 0) + o.ml
      if (profile.includes('spicy')) notes['Spicy'] = (notes['Spicy'] || 0) + o.ml
      if (profile.includes('earthy')) notes['Earthy'] = (notes['Earthy'] || 0) + o.ml
      if (profile.includes('fresh')) notes['Fresh'] = (notes['Fresh'] || 0) + o.ml
      if (profile.includes('sweet')) notes['Sweet'] = (notes['Sweet'] || 0) + o.ml
    })
    
    return Object.entries(notes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([note]) => note)
  }, [selectedOils])
  
  // Handle tag input
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }, [tagInput, tags])
  
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }, [tags])

  // Mode / bottle size / carrier ratio changes reset the blend + acknowledgments
  // (verbatim of the inline JSX handlers)
  const handleModeChange = useCallback((newMode: BlendMode) => {
    setMode(newMode)
    setSelectedOils([])
    setAcknowledgedWarningIds([])
  }, [])

  const handleBottleSizeChange = useCallback((size: number) => {
    setBottleSize(size)
    setSelectedOils([])
    setAcknowledgedWarningIds([])
  }, [])

  const handleCarrierRatioChange = useCallback((ratio: number) => {
    setCarrierRatio(ratio)
    setSelectedOils([])
    setAcknowledgedWarningIds([])
  }, [])

  // Open the oil detail modal for a given oil (verbatim of the inline JSX handlers)
  const handleShowOilDetail = useCallback((oil: AtelierOil) => {
    setSelectedOilForDetail(oil)
    setIsOilDetailModalOpen(true)
  }, [])

  // Toggle an oil-oil interaction acknowledgment (verbatim of the inline JSX handler)
  const handleAcknowledgeInteraction = useCallback((key: string) => {
    setAcknowledgedInteractions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }, [])

  return {
    // Context passthroughs
    router,
    healthProfile,
    isProfileComplete,
    createRecipe,
    myRecipes,
    isAuthenticated,
    user,
    isCartLoading,
    openCart,
    // Profile form gate
    showProfileForm,
    setShowProfileForm,
    // Toasts
    toasts,
    addToast,
    removeToast,
    // Core blend state
    mode,
    setMode,
    handleModeChange,
    selectedOils,
    setSelectedOils,
    carrierRatio,
    setCarrierRatio,
    handleCarrierRatioChange,
    selectedCarrierOilId,
    setSelectedCarrierOilId,
    bottleSize,
    setBottleSize,
    handleBottleSizeChange,
    // Blend metadata
    recipeName,
    recipeNameError,
    handleRecipeNameChange,
    blendDescription,
    setBlendDescription,
    blendStory,
    setBlendStory,
    sourceBlendId,
    consentToShare,
    setConsentToShare,
    cartQuantity,
    setCartQuantity,
    isSaving,
    // Crystal / carrier selectors
    selectedCrystalId,
    setSelectedCrystalId,
    showCrystalSelector,
    setShowCrystalSelector,
    showCarrierSelector,
    setShowCarrierSelector,
    // Enhancements
    intendedUse,
    setIntendedUse,
    tags,
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    oilSearchQuery,
    setOilSearchQuery,
    // Safety acknowledgment
    acknowledgedWarningIds,
    handleSafetyAcknowledge,
    acknowledgedInteractions,
    handleAcknowledgeInteraction,
    // Share / certificate modals
    showShareModal,
    setShowShareModal,
    shareUrl,
    showCertificateModal,
    setShowCertificateModal,
    // Cord & revelation
    selectedCordId,
    setSelectedCordId,
    showRevelationModal,
    setShowRevelationModal,
    blendCodex,
    isGeneratingRevelation,
    revelationFact,
    // Category filter & oil detail
    selectedCategories,
    setSelectedCategories,
    showAllCategories,
    setShowAllCategories,
    selectedOilForWisdom,
    setSelectedOilForWisdom,
    selectedOilForDetail,
    isOilDetailModalOpen,
    setIsOilDetailModalOpen,
    handleShowOilDetail,
    // Drafts
    savedDrafts,
    showSaveDraftDialog,
    setShowSaveDraftDialog,
    handleSaveDraft,
    // Derived capacity data
    maxEssentialOilMl,
    carrierOilMl,
    currentEssentialOilMl,
    remainingCapacity,
    isBottleComplete,
    isOverfilled,
    oilPercentages,
    mixComponentsForValidation,
    // Safety
    validation,
    comprehensiveSafety,
    allCriticalAcknowledged,
    unacknowledgedCriticalCount,
    allInteractionsAcknowledged,
    canAddToCart,
    // Pricing
    priceBreakdown,
    estimatedPrice,
    blendRarity,
    // Catalog
    suggestedOils,
    filteredOils,
    dominantScentNotes,
    // Handlers
    handleAddOil,
    handleRemoveOil,
    handleAdjustOil,
    handleSaveRecipe,
    handleAddToCart,
    handleShareBlend,
    handleNavigateToMyRecipes,
    handleNavigateToCommunity,
    handleRevealBlend,
    handleDownloadCertificate,
  }
}

export type AtelierState = ReturnType<typeof useAtelierState>
