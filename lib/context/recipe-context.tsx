'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logging/logger'
import { MixRecipe, CreateRecipeInput, UserRecipeState, SharedRecipe } from '@/lib/mixing/recipe-types'
import { useUser } from './user-context'

// ============================================================================
// MOCK DATA - Replace with API calls
// ============================================================================

const MOCK_RECIPES: MixRecipe[] = [
  {
    id: 'recipe-001',
    name: 'Midnight Calm',
    description: 'A soothing blend for deep, restful sleep',
    createdBy: 'user-system',
    creatorName: 'Oil Amor Alchemist',
    isPublic: true,
    mode: 'pure',
    oils: [
      { oilId: 'lavender', oilName: 'Lavender', drops: 10 },
      { oilId: 'chamomile-roman', oilName: 'Chamomile Roman', drops: 5 },
      { oilId: 'cedarwood', oilName: 'Cedarwood', drops: 3 },
    ],
    totalVolume: 30,
    safetyScore: 95,
    safetyRating: 'excellent',
    warnings: [],
    tags: ['sleep-aid', 'beginner-friendly', 'pregnancy-safe'],
    intendedUse: 'sleep',
    timesOrdered: 234,
    timesFavorited: 189,
    averageRating: 4.8,
    reviewCount: 45,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'recipe-002',
    name: 'Morning Clarity',
    description: 'Energizing blend to start your day focused',
    createdBy: 'user-system',
    creatorName: 'Oil Amor Alchemist',
    isPublic: true,
    mode: 'carrier',
    oils: [
      { oilId: 'peppermint', oilName: 'Peppermint', drops: 4 },
      { oilId: 'rosemary', oilName: 'Rosemary', drops: 3 },
      { oilId: 'lemon', oilName: 'Lemon', drops: 6 },
    ],
    carrierRatio: 25,
    totalVolume: 30,
    safetyScore: 78,
    safetyRating: 'good',
    warnings: ['phototoxic-stack', 'high-dilution'],
    tags: ['focus', 'energy-boost'],
    intendedUse: 'focus',
    timesOrdered: 156,
    timesFavorited: 98,
    averageRating: 4.5,
    reviewCount: 32,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
]

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface RecipeContextType extends UserRecipeState {
  publicRecipes: MixRecipe[]
  isLoading: boolean
  
  // CRUD
  createRecipe: (input: CreateRecipeInput) => Promise<MixRecipe>
  updateRecipe: (id: string, updates: Partial<CreateRecipeInput>) => Promise<MixRecipe>
  deleteRecipe: (id: string) => Promise<void>
  
  // Favorites
  toggleFavorite: (recipeId: string) => void
  isFavorite: (recipeId: string) => boolean
  
  // Sharing
  shareRecipe: (recipeId: string, email: string, message?: string) => Promise<void>
  
  // Discovery
  searchRecipes: (query: string, filters: RecipeFilters) => MixRecipe[]
  getRecipeById: (id: string) => MixRecipe | undefined
  getSuggestedRecipes: (goal: string) => MixRecipe[]
  
  // Stats
  getTopRatedRecipes: (limit?: number) => MixRecipe[]
  getMostPopularRecipes: (limit?: number) => MixRecipe[]
  
  // Recent
  addToRecentlyViewed: (recipeId: string) => void
}

interface RecipeFilters {
  mode?: 'pure' | 'carrier'
  intendedUse?: MixRecipe['intendedUse']
  tags?: string[]
  minSafetyScore?: number
  maxPrice?: number
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const STORAGE_KEY = 'oil_amor_recipes'

function loadRecipesFromStorage(): Partial<UserRecipeState> | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    logger.error('Failed to load recipes', e instanceof Error ? e : new Error(String(e)))
  }
  return null
}

function saveRecipesToStorage(state: UserRecipeState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      myRecipes: state.myRecipes,
      favoriteRecipeIds: state.favoriteRecipeIds,
      recentlyViewed: state.recentlyViewed,
    }))
  } catch (e) {
    logger.error('Failed to save recipes', e instanceof Error ? e : new Error(String(e)))
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const RecipeContext = createContext<RecipeContextType | undefined>(undefined)

export function RecipeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  
  const [state, setState] = useState<UserRecipeState>({
    myRecipes: [],
    favoriteRecipeIds: [],
    recentlyViewed: [],
    sharedWithMe: [],
  })
  
  const [publicRecipes, setPublicRecipes] = useState<MixRecipe[]>(MOCK_RECIPES)

  // Load from storage
  useEffect(() => {
    const stored = loadRecipesFromStorage()
    if (stored) {
      setState(prev => ({
        ...prev,
        ...stored,
      }))
    }
  }, [])

  // Save to storage
  useEffect(() => {
    saveRecipesToStorage(state)
  }, [state])

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  const createRecipe = useCallback(async (input: CreateRecipeInput): Promise<MixRecipe> => {
    const newRecipe: MixRecipe = {
      id: `recipe-${Date.now()}`,
      ...input,
      createdBy: user?.id || 'anonymous',
      creatorName: user?.name || 'Anonymous',
      safetyScore: 100, // Would be calculated
      safetyRating: 'excellent',
      warnings: [],
      timesOrdered: 0,
      timesFavorited: 0,
      averageRating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      oils: input.oils.map(o => ({
        oilId: o.oilId,
        oilName: o.oilId, // Would look up actual name
        drops: Math.round((o.ml || 0) * 20), // Approximate conversion: 1ml ≈ 20 drops
        percentage: 0, // Would calculate
      })),
    }

    setState(prev => ({
      ...prev,
      myRecipes: [newRecipe, ...prev.myRecipes],
    }))

    if (input.isPublic) {
      setPublicRecipes(prev => [newRecipe, ...prev])
    }

    return newRecipe
  }, [user])

  const updateRecipe = useCallback(async (id: string, updates: Partial<CreateRecipeInput>): Promise<MixRecipe> => {
    let updatedRecipe: MixRecipe | undefined

    setState(prev => ({
      ...prev,
      myRecipes: prev.myRecipes.map(recipe => {
        if (recipe.id === id) {
          updatedRecipe = {
            ...recipe,
            ...updates,
            updatedAt: new Date().toISOString(),
          } as MixRecipe
          return updatedRecipe
        }
        return recipe
      }),
    }))

    if (updatedRecipe?.isPublic) {
      setPublicRecipes(prev => prev.map(r => r.id === id ? updatedRecipe! : r))
    }

    return updatedRecipe!
  }, [])

  const deleteRecipe = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({
      ...prev,
      myRecipes: prev.myRecipes.filter(r => r.id !== id),
      favoriteRecipeIds: prev.favoriteRecipeIds.filter(fid => fid !== id),
    }))
    setPublicRecipes(prev => prev.filter(r => r.id !== id))
  }, [])

  // ==========================================================================
  // FAVORITES
  // ==========================================================================

  const toggleFavorite = useCallback((recipeId: string) => {
    setState(prev => ({
      ...prev,
      favoriteRecipeIds: prev.favoriteRecipeIds.includes(recipeId)
        ? prev.favoriteRecipeIds.filter(id => id !== recipeId)
        : [...prev.favoriteRecipeIds, recipeId],
    }))
  }, [])

  const isFavorite = useCallback((recipeId: string): boolean => {
    return state.favoriteRecipeIds.includes(recipeId)
  }, [state.favoriteRecipeIds])

  // ==========================================================================
  // SHARING
  // ==========================================================================

  const shareRecipe = useCallback(async (recipeId: string, email: string, message?: string): Promise<void> => {
    // Would send API request to share
  }, [])

  // ==========================================================================
  // DISCOVERY
  // ==========================================================================

  const searchRecipes = useCallback((query: string, filters: RecipeFilters): MixRecipe[] => {
    let results = [...publicRecipes, ...state.myRecipes]
    
    // Text search
    if (query) {
      const q = query.toLowerCase()
      results = results.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    
    // Filters
    if (filters.mode) {
      results = results.filter(r => r.mode === filters.mode)
    }
    if (filters.intendedUse) {
      results = results.filter(r => r.intendedUse === filters.intendedUse)
    }
    if (filters.tags?.length) {
      results = results.filter(r => filters.tags!.some(t => r.tags.includes(t as any)))
    }
    if (filters.minSafetyScore) {
      results = results.filter(r => r.safetyScore >= filters.minSafetyScore!)
    }
    
    return results
  }, [publicRecipes, state.myRecipes])

  const getRecipeById = useCallback((id: string): MixRecipe | undefined => {
    return [...publicRecipes, ...state.myRecipes].find(r => r.id === id)
  }, [publicRecipes, state.myRecipes])

  const getSuggestedRecipes = useCallback((goal: string): MixRecipe[] => {
    const goalMap: Record<string, MixRecipe['intendedUse']> = {
      'sleep': 'sleep',
      'energy': 'focus',
      'relax': 'relaxation',
      'focus': 'focus',
      'immunity': 'immunity',
      'pain': 'pain-relief',
    }
    
    const intendedUse = goalMap[goal.toLowerCase()]
    if (!intendedUse) return []
    
    return publicRecipes
      .filter(r => r.intendedUse === intendedUse)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 3)
  }, [publicRecipes])

  // ==========================================================================
  // STATS
  // ==========================================================================

  const getTopRatedRecipes = useCallback((limit = 10): MixRecipe[] => {
    return [...publicRecipes]
      .filter(r => r.reviewCount >= 5)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, limit)
  }, [publicRecipes])

  const getMostPopularRecipes = useCallback((limit = 10): MixRecipe[] => {
    return [...publicRecipes]
      .sort((a, b) => b.timesOrdered - a.timesOrdered)
      .slice(0, limit)
  }, [publicRecipes])

  // ==========================================================================
  // RECENT
  // ==========================================================================

  const addToRecentlyViewed = useCallback((recipeId: string) => {
    setState(prev => ({
      ...prev,
      recentlyViewed: [
        recipeId,
        ...prev.recentlyViewed.filter(id => id !== recipeId),
      ].slice(0, 20),
    }))
  }, [])

  return (
    <RecipeContext.Provider
      value={{
        ...state,
        publicRecipes,
        isLoading,
        createRecipe,
        updateRecipe,
        deleteRecipe,
        toggleFavorite,
        isFavorite,
        shareRecipe,
        searchRecipes,
        getRecipeById,
        getSuggestedRecipes,
        getTopRatedRecipes,
        getMostPopularRecipes,
        addToRecentlyViewed,
      }}
    >
      {children}
    </RecipeContext.Provider>
  )
}

export function useRecipes(): RecipeContextType {
  const context = useContext(RecipeContext)
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider')
  }
  return context
}
