/**
 * User Blends Hook
 * Manages user's personal blend library
 * Enables re-purchasing and brand ambassador sharing
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/lib/context/toast-context'
import { generateShareUrl, recordBlendShare } from '@/lib/brand-ambassador'
import type { UserBlend } from '@/lib/db/schema/user-blends'
import { logger } from '@/lib/logging/logger'

export interface UseUserBlendsOptions {
  userId?: string
}

export interface ShareBlendResult {
  success: boolean
  shareUrl?: string
  shareCode?: string
  message?: string
}

/**
 * Hook for managing user's blend library
 */
export function useUserBlends(options: UseUserBlendsOptions = {}) {
  const [blends, setBlends] = useState<UserBlend[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  /**
   * Load user's blends from the server
   */
  const loadBlends = useCallback(async () => {
    if (!options.userId) {
      setBlends([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/user-blends?userId=${options.userId}`)
      if (!response.ok) throw new Error('Failed to load blends')
      
      const data = await response.json()
      setBlends(data.blends || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blends')
      logger.error('Error loading blends', err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [options.userId])

  /**
   * Share a blend and get shareable URL
   */
  const shareBlend = useCallback(async (blendId: string): Promise<ShareBlendResult> => {
    try {
      const blend = blends.find(b => b.id === blendId)
      if (!blend) {
        return { success: false, message: 'Blend not found' }
      }

      // Record the share in database
      await fetch('/api/user-blends/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blendId }),
      })

      // Generate share URL
      const shareUrl = generateShareUrl(blend.shareCode)

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)

      addToast('Share link copied to clipboard!', 'success')

      return {
        success: true,
        shareUrl,
        shareCode: blend.shareCode,
        message: `Share link for "${blend.name}" copied!`,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share blend'
      addToast(message, 'error')
      return { success: false, message }
    }
  }, [blends, addToast])

  /**
   * Delete a blend from user's library
   */
  const deleteBlend = useCallback(async (blendId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/user-blends/${blendId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete blend')

      setBlends(prev => prev.filter(b => b.id !== blendId))
      addToast('Blend removed from your library', 'success')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete blend'
      addToast(message, 'error')
      return false
    }
  }, [addToast])

  /**
   * Load a blend into the atelier for re-purchase
   */
  const loadBlendForRepurchase = useCallback((blendId: string) => {
    const blend = blends.find(b => b.id === blendId)
    if (!blend) return null

    return {
      name: blend.name,
      mode: blend.recipe.mode,
      oils: blend.recipe.oils.map(o => ({
        oilId: o.oilId,
        ml: o.drops / 20, // Convert drops back to ml
      })),
      carrierRatio: blend.recipe.carrierRatio,
      totalVolume: blend.recipe.totalVolume,
      description: blend.description,
      intendedUse: blend.intendedUse,
    }
  }, [blends])

  /**
   * Get brand ambassador stats for the user
   */
  const getBrandAmbassadorStats = useCallback(async () => {
    if (!options.userId) return null

    try {
      const response = await fetch(`/api/user-blends/stats?userId=${options.userId}`)
      if (!response.ok) throw new Error('Failed to load stats')
      
      return await response.json()
    } catch (err) {
      logger.error('Error loading brand ambassador stats', err instanceof Error ? err : new Error(String(err)))
      return null
    }
  }, [options.userId])

  // Load blends on mount and when userId changes
  useEffect(() => {
    loadBlends()
  }, [loadBlends])

  return {
    blends,
    isLoading,
    error,
    refresh: loadBlends,
    shareBlend,
    deleteBlend,
    loadBlendForRepurchase,
    getBrandAmbassadorStats,
  }
}

/**
 * Hook for loading a blend from a share code (for visitors)
 */
export function useSharedBlend() {
  const [blend, setBlend] = useState<UserBlend | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  /**
   * Load a blend by share code
   */
  const loadSharedBlend = useCallback(async (shareCode: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Record the view
      await fetch('/api/user-blends/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode }),
      })

      // Load the blend
      const response = await fetch(`/api/user-blends/by-code?code=${shareCode}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Blend not found or no longer available')
        }
        throw new Error('Failed to load blend')
      }

      const data = await response.json()
      setBlend(data.blend)
      return data.blend
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load blend'
      setError(message)
      addToast(message, 'error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  /**
   * Purchase the shared blend
   */
  const purchaseSharedBlend = useCallback(async (shareCode: string, userId?: string) => {
    try {
      const response = await fetch('/api/user-blends/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode, userId }),
      })

      if (!response.ok) throw new Error('Failed to add to cart')

      addToast('Blend added to your cart!', 'success')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to cart'
      addToast(message, 'error')
      return false
    }
  }, [addToast])

  return {
    blend,
    isLoading,
    error,
    loadSharedBlend,
    purchaseSharedBlend,
  }
}
