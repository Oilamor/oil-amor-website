/**
 * Order Completion Hook
 * Handles order completion with community blend sharing
 * Shows user feedback when blends are shared to community
 */

'use client'

import { useCallback } from 'react'
import { Order } from '@/lib/context/user-context'
import { processCommunityBlendShares, CommunityShareResult } from '@/lib/orders/order-completion'
import { createCommunityBlend, publishBlend } from '@/lib/community-blends/actions'

export interface UseOrderCompletionOptions {
  onSuccess?: (results: CommunityShareResult[]) => void
  onError?: (error: Error) => void
}

export interface OrderCompletionSummary {
  orderId: string
  sharedBlends: {
    name: string
    blendId?: string
  }[]
  errors: string[]
}

/**
 * Hook for completing orders with community blend sharing
 * 
 * Usage:
 * const { completeOrder, isProcessing } = useOrderCompletion({
 * })
 */
export function useOrderCompletion(options: UseOrderCompletionOptions = {}) {
  const completeOrder = useCallback(async (
    order: Order,
    addOrderFn: (order: Order) => void
  ): Promise<OrderCompletionSummary> => {
    // First, add the order to user's history
    addOrderFn(order)

    // Then process community blend shares
    const shareResults = await processCommunityBlendShares(
      order,
      createCommunityBlend as unknown as (input: Record<string, unknown>) => Promise<{ success: boolean; blendId?: string; error?: string }>,
      publishBlend as unknown as (input: { blendId: string; creatorId: string; orderId: string; consentToShare: boolean }) => Promise<{ success: boolean; slug?: string; error?: string }>
    )

    // Build summary
    const summary: OrderCompletionSummary = {
      orderId: order.id,
      sharedBlends: shareResults
        .filter(r => r.success)
        .map(r => ({ name: r.blendName, blendId: r.blendId })),
      errors: shareResults
        .filter(r => !r.success)
        .map(r => `Failed to share "${r.blendName}": ${r.error}`),
    }

    // Call success callback if any blends were shared
    if (shareResults.some(r => r.success)) {
      options.onSuccess?.(shareResults)
    }

    // Call error callback if there were errors
    const firstError = shareResults.find(r => !r.success)?.error
    if (firstError && options.onError) {
      options.onError(new Error(firstError))
    }

    return summary
  }, [options])

  return {
    completeOrder,
  }
}

/**
 * Simple toast message generator for community share results
 */
export function getCommunityShareToastMessage(results: CommunityShareResult[]): {
  message: string
  type: 'success' | 'error' | 'info'
} {
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  if (successful.length > 0 && failed.length === 0) {
    return {
      message: `🎉 Your blend "${successful[0].blendName}" has been shared to the Community Blends!`,
      type: 'success',
    }
  }

  if (successful.length > 0 && failed.length > 0) {
    return {
      message: `✅ Shared "${successful[0].blendName}" to community. ⚠️ ${failed.length} blend(s) failed to share.`,
      type: 'info',
    }
  }

  if (failed.length > 0) {
    return {
      message: `❌ Failed to share blend: ${failed[0].error}`,
      type: 'error',
    }
  }

  return {
    message: '',
    type: 'info',
  }
}
