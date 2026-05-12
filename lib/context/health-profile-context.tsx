'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { UserHealthProfile, UsageContext, MedicalCondition } from '@/lib/safety'

// ============================================================================
// TYPES
// ============================================================================

export interface HealthProfile {
  id: string
  name: string
  isDefault: boolean
  data: UserHealthProfile
  lastUpdated: string
  /** ISO timestamp set when user explicitly completes the HealthProfileForm */
  completedAt?: string
}

export interface HealthProfileManagerState {
  profiles: HealthProfile[]
  activeProfileId: string | null
}

interface HealthProfileContextType extends HealthProfileManagerState {
  // Profile management
  activeProfile: HealthProfile | null
  createProfile: (name: string, data?: Partial<UserHealthProfile>) => HealthProfile
  updateProfile: (profileId: string, updates: Partial<UserHealthProfile>) => void
  deleteProfile: (profileId: string) => void
  setActiveProfile: (profileId: string) => void
  duplicateProfile: (profileId: string, newName: string) => HealthProfile
  
  // Profile data getters (for active profile)
  isProfileComplete: boolean
  
  // Profile data updaters (for active profile)
  updateUsageContext: (context: UsageContext) => void
  addCondition: (condition: MedicalCondition) => void
  removeCondition: (condition: MedicalCondition) => void
  addMedication: (medication: string) => void
  removeMedication: (medication: string) => void
  addAllergy: (allergy: string) => void
  removeAllergy: (allergy: string) => void
  
  // Legacy support
  completeProfile: () => void
  resetActiveProfile: () => void
}

// ============================================================================
// DEFAULT PROFILE DATA
// ============================================================================

const createDefaultProfileData = (): UserHealthProfile => ({
  age: 25,
  isPregnant: false,
  isBreastfeeding: false,
  isTryingToConceive: false,
  isChild: false,
  conditions: [],
  medications: [],
  knownAllergies: [],
  skinSensitivity: 'normal',
  respiratorySensitivity: false,
  intendedUse: {
    method: 'topical',
    area: 'small-area',
    frequency: 'daily',
    duration: 'short-term',
  },
  aromatherapyExperience: 'beginner',
})

const createNewProfile = (name: string, isDefault = false, data?: Partial<UserHealthProfile>): HealthProfile => ({
  id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  isDefault,
  data: { ...createDefaultProfileData(), ...data },
  lastUpdated: new Date().toISOString(),
  // Note: completedAt is intentionally NOT set here — auto-created profiles
  // are incomplete until the user explicitly fills out the form.
})

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'oil_amor_health_profiles_v2'

function loadProfilesFromStorage(): HealthProfileManagerState | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load health profiles:', e)
  }
  return null
}

function saveProfilesToStorage(state: HealthProfileManagerState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save health profiles:', e)
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const HealthProfileContext = createContext<HealthProfileContextType | undefined>(undefined)

export function HealthProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthProfileManagerState>({
    profiles: [],
    activeProfileId: null,
  })

  // Load from storage on mount
  useEffect(() => {
    const stored = loadProfilesFromStorage()
    if (stored && stored.profiles.length > 0) {
      setState(stored)
    } else {
      // Create default "Me" profile on first load
      const defaultProfile = createNewProfile('Me', true)
      setState({
        profiles: [defaultProfile],
        activeProfileId: defaultProfile.id,
      })
    }
  }, [])

  // Save to storage on change
  useEffect(() => {
    if (state.profiles.length > 0) {
      saveProfilesToStorage(state)
    }
  }, [state])

  // Get active profile
  const activeProfile = state.profiles.find(p => p.id === state.activeProfileId) || null
  
  const isProfileComplete = activeProfile?.completedAt != null

  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================

  const createProfile = useCallback((name: string, data?: Partial<UserHealthProfile>) => {
    const newProfile = createNewProfile(name, false, data)
    setState(prev => ({
      ...prev,
      profiles: [...prev.profiles, newProfile],
    }))
    return newProfile
  }, [])

  const updateProfile = useCallback((profileId: string, updates: Partial<UserHealthProfile>) => {
    setState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => 
        p.id === profileId 
          ? { ...p, data: { ...p.data, ...updates }, lastUpdated: new Date().toISOString() }
          : p
      ),
    }))
  }, [])

  const deleteProfile = useCallback((profileId: string) => {
    setState(prev => {
      const remaining = prev.profiles.filter(p => p.id !== profileId)
      // If deleting active profile, switch to first available
      let newActiveId = prev.activeProfileId
      if (prev.activeProfileId === profileId) {
        newActiveId = remaining.length > 0 ? remaining[0].id : null
      }
      return {
        profiles: remaining,
        activeProfileId: newActiveId,
      }
    })
  }, [])

  const setActiveProfile = useCallback((profileId: string) => {
    setState(prev => ({
      ...prev,
      activeProfileId: profileId,
    }))
  }, [])

  const duplicateProfile = useCallback((profileId: string, newName: string) => {
    const profileToCopy = state.profiles.find(p => p.id === profileId)
    if (!profileToCopy) throw new Error('Profile not found')
    
    const duplicated = createNewProfile(newName, false, profileToCopy.data)
    setState(prev => ({
      ...prev,
      profiles: [...prev.profiles, duplicated],
    }))
    return duplicated
  }, [state.profiles])

  // ==========================================================================
  // ACTIVE PROFILE UPDATERS
  // ==========================================================================

  const updateActiveProfileData = useCallback((updates: Partial<UserHealthProfile>) => {
    if (!state.activeProfileId) return
    updateProfile(state.activeProfileId, updates)
  }, [state.activeProfileId, updateProfile])

  const updateUsageContext = useCallback((context: UsageContext) => {
    updateActiveProfileData({ intendedUse: context })
  }, [updateActiveProfileData])

  const addCondition = useCallback((condition: MedicalCondition) => {
    if (!activeProfile) return
    updateActiveProfileData({ 
      conditions: Array.from(new Set([...activeProfile.data.conditions, condition])) 
    })
  }, [activeProfile, updateActiveProfileData])

  const removeCondition = useCallback((condition: MedicalCondition) => {
    if (!activeProfile) return
    updateActiveProfileData({ 
      conditions: activeProfile.data.conditions.filter(c => c !== condition) 
    })
  }, [activeProfile, updateActiveProfileData])

  const addMedication = useCallback((medication: string) => {
    if (!activeProfile) return
    updateActiveProfileData({ 
      medications: Array.from(new Set([...activeProfile.data.medications, medication])) 
    })
  }, [activeProfile, updateActiveProfileData])

  const removeMedication = useCallback((medication: string) => {
    if (!activeProfile) return
    updateActiveProfileData({ 
      medications: activeProfile.data.medications.filter(m => m !== medication) 
    })
  }, [activeProfile, updateActiveProfileData])

  const addAllergy = useCallback((allergy: string) => {
    if (!activeProfile) return
    updateActiveProfileData({ 
      knownAllergies: Array.from(new Set([...activeProfile.data.knownAllergies, allergy])) 
    })
  }, [activeProfile, updateActiveProfileData])

  const removeAllergy = useCallback((allergy: string) => {
    if (!activeProfile) return
    updateActiveProfileData({ 
      knownAllergies: activeProfile.data.knownAllergies.filter(a => a !== allergy) 
    })
  }, [activeProfile, updateActiveProfileData])

  const completeProfile = useCallback(() => {
    if (!state.activeProfileId) return
    setState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p =>
        p.id === state.activeProfileId
          ? { ...p, completedAt: new Date().toISOString(), lastUpdated: new Date().toISOString() }
          : p
      ),
    }))
  }, [state.activeProfileId])

  const resetActiveProfile = useCallback(() => {
    if (!state.activeProfileId) return
    updateProfile(state.activeProfileId, createDefaultProfileData())
  }, [state.activeProfileId, updateProfile])

  return (
    <HealthProfileContext.Provider
      value={{
        ...state,
        activeProfile,
        isProfileComplete,
        createProfile,
        updateProfile,
        deleteProfile,
        setActiveProfile,
        duplicateProfile,
        updateUsageContext,
        addCondition,
        removeCondition,
        addMedication,
        removeMedication,
        addAllergy,
        removeAllergy,
        completeProfile,
        resetActiveProfile,
      }}
    >
      {children}
    </HealthProfileContext.Provider>
  )
}

export function useHealthProfile(): HealthProfileContextType {
  const context = useContext(HealthProfileContext)
  if (context === undefined) {
    throw new Error('useHealthProfile must be used within a HealthProfileProvider')
  }
  return context
}

// Quick check hooks
export function useIsHealthProfileComplete(): boolean {
  const context = useContext(HealthProfileContext)
  return context?.isProfileComplete ?? false
}

export function useActiveProfile(): HealthProfile | null {
  const context = useContext(HealthProfileContext)
  return context?.activeProfile ?? null
}
