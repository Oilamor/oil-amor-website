/**
 * Cart Hook
 * React hook for cart state management with real-time sync
 */

'use client'

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Cart, CartItem, AddToCartInput, UpdateCartItemInput } from '@/lib/cart/types'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// CART API CLIENT
// ============================================================================

interface CartApiResponse {
  success: boolean
  cart: Cart
  item?: CartItem
  error?: string
}

async function fetchCart(cartId?: string): Promise<Cart> {
  const url = cartId ? `/api/cart?cartId=${cartId}` : '/api/cart'
  
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch cart')
  }
  
  const data: CartApiResponse = await response.json()
  return data.cart
}

async function addToCartApi(
  cartId: string,
  input: AddToCartInput
): Promise<{ cart: Cart; item: CartItem }> {
  const response = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'add',
      cartId,
      product: {
        id: input.productId,
        variantId: input.variantId,
        name: input.properties?.name || 'Product',
        price: Number(input.properties?.price) || 0,
        image: input.properties?.image,
        sku: input.properties?.sku,
      },
      quantity: input.quantity,
      configuration: input.configuration,
      customMix: input.customMix,
      attachment: input.attachment,
      properties: input.properties,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || error.message || 'Failed to add item')
  }
  
  const data: CartApiResponse = await response.json()
  return { cart: data.cart, item: data.item! }
}

async function updateCartItemApi(
  cartId: string,
  input: UpdateCartItemInput
): Promise<Cart> {
  const response = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'update',
      cartId,
      lineId: input.lineId,
      quantity: input.quantity,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update item')
  }
  
  const data: CartApiResponse = await response.json()
  return data.cart
}

async function removeFromCartApi(cartId: string, lineId: string): Promise<Cart & { _isNewCart?: boolean }> {
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'remove',
        cartId,
        lineId,
      }),
    })
    
    const data = await response.json().catch(() => ({ error: 'Failed to parse response' }))
    
    if (!response.ok) {
      if (data.cart) {
        return data.cart
      }
      throw new Error(data.error || data.message || `Server error: ${response.status}`)
    }
    
    // Mark if this is a new cart (old one expired)
    if (data.warning && data.warning.includes('new cart') || data.warning?.includes('expired')) {
      ;(data.cart as any)._isNewCart = true
    }
    
    return data.cart
  } catch (error) {
    logger.error('[removeFromCartApi] Fetch error', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

async function clearCartApi(cartId: string): Promise<Cart> {
  // Create new empty cart instead of clearing
  const response = await fetch('/api/cart', {
    method: 'GET',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to clear cart')
  }
  
  const data: CartApiResponse = await response.json()
  return data.cart
}

async function mergeCartsApi(guestCartId: string, userCartId: string): Promise<Cart> {
  const response = await fetch('/api/cart/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestCartId, userCartId }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to merge carts')
  }
  
  const data: CartApiResponse = await response.json()
  return data.cart
}

// ============================================================================
// CART STORE
// ============================================================================

interface CartState {
  cart: Cart | null
  isLoading: boolean
  isOpen: boolean
  error: string | null
  
  // Actions
  setCart: (cart: Cart) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  clearError: () => void
}

// Global flag to track hydration
let hasHydrated = false
let hydrationListeners: Array<(state: CartState) => void> = []

const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      isLoading: true, // Start as loading to prevent flash of empty cart
      isOpen: false,
      error: null,
      
      setCart: (cart) => set({ cart }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'oil-amor-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
      version: 1,
      migrate: (persistedState: any, version) => {
        // Clear any persisted mock data - always start fresh
        if (version !== 1) {
          return { cart: null } as any
        }
        // Validate that cart items are real, not mock
        if (persistedState?.cart?.items) {
          const hasMockItems = persistedState.cart.items.some((item: any) => 
            item.id?.includes('mock') || 
            item.productId?.includes('mock') ||
            item.name?.includes('Mock')
          )
          if (hasMockItems) {
            return { cart: null } as any
          }
          // Also clear if items array is empty (stale data)
          if (persistedState.cart.items.length === 0) {
            return { cart: null } as any
          }
        }
        return persistedState
      },
      onRehydrateStorage: () => (state) => {
        hasHydrated = true
        // Notify all listeners
        hydrationListeners.forEach(listener => listener(state as CartState))
        hydrationListeners = []
        // Cart hydration complete
      },
    }
  )
)

// ============================================================================
// CART HOOK
// ============================================================================

export function useCart() {
  const store = useCartStore()
  const initialized = useRef(false)
  
  // Initialize cart on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    
    const initCart = async () => {
      store.setError(null)
      
      // Wait for hydration from localStorage
      if (!hasHydrated) {
        await new Promise<void>((resolve) => {
          hydrationListeners.push(() => resolve())
          // Timeout after 500ms in case hydration never fires
          setTimeout(resolve, 500)
        })
      }
      
      // After hydration, check if we have a cart with items
      const currentCart = useCartStore.getState().cart
      if (currentCart && currentCart.items && currentCart.items.length > 0) {
        // Validate cart exists on server (it may have expired)
        try {
          const serverCart = await fetchCart(currentCart.id)
          if (!serverCart || serverCart.id !== currentCart.id) {
            localStorage.removeItem('oil-amor-cart')
            store.setCart(serverCart)
          }
        } catch (e) {
          // Continue with local cart if validation fails
        }
        
        store.setLoading(false)
        return
      }
      
      // No cart in localStorage, create a new one via API
      try {
        const cart = await fetchCart()
        store.setCart(cart)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load cart'
        store.setError(message)
        logger.error('Cart initialization error', error as Error)
        // Create a new empty cart on error
        store.setCart({
          id: `cart_${Date.now()}`,
          items: [],
          subtotal: 0,
          taxTotal: 0,
          shippingEstimate: 0,
          discountTotal: 0,
          total: 0,
          currency: 'AUD',
          itemCount: 0,
          totalQuantity: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      } finally {
        store.setLoading(false)
      }
    }
    
    initCart()
    // store is stable (Zustand) and this effect must only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Add item to cart
  const addItem = useCallback(async (input: AddToCartInput) => {
    if (!store.cart) {
      store.setError('Cart not initialized')
      return
    }
    
    store.setLoading(true)
    store.setError(null)
    
    try {
      const { cart, item } = await addToCartApi(store.cart.id, input)
      store.setCart(cart)
      store.openCart()
      return item
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item'
      store.setError(message)
      logger.error('Add to cart error', error as Error)
      throw error
    } finally {
      store.setLoading(false)
    }
  }, [store])
  
  // Update item quantity
  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!store.cart) {
      store.setError('Cart not initialized')
      return
    }
    
    store.setLoading(true)
    store.setError(null)
    
    try {
      const cart = await updateCartItemApi(store.cart.id, { lineId, quantity })
      store.setCart(cart)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item'
      store.setError(message)
      logger.error('Update cart item error', error as Error)
      throw error
    } finally {
      store.setLoading(false)
    }
  }, [store])
  
  // Remove item from cart
  const removeItem = useCallback(async (lineId: string) => {
    if (!store.cart) {
      store.setError('Cart not initialized')
      return
    }
    
    store.setLoading(true)
    store.setError(null)
    
    try {
      const cart = await removeFromCartApi(store.cart.id, lineId)
      store.setCart(cart)
      
      // If server created a new cart (old one expired), clear localStorage
      if ((cart as any)._isNewCart) {
        localStorage.removeItem('oil-amor-cart')
      }
      
      // If cart is now empty, clear localStorage
      if (!cart.items || cart.items.length === 0) {
        localStorage.removeItem('oil-amor-cart')
      }
    } catch (error) {
      logger.error('Cart remove item failed', error as Error)
      
      // LOCAL FALLBACK: Remove item from local cart state
      const currentCart = store.cart
      if (currentCart) {
        const newItems = currentCart.items.filter(item => item.id !== lineId)
        const newCart = { ...currentCart, items: newItems }
        
        // Recalculate totals
        let subtotal = 0
        let totalQuantity = 0
        for (const item of newItems) {
          subtotal += item.unitPrice * item.quantity
          totalQuantity += item.quantity
        }
        newCart.subtotal = Math.round(subtotal * 100) / 100
        newCart.total = newCart.subtotal + newCart.taxTotal + newCart.shippingEstimate - newCart.discountTotal
        newCart.itemCount = newItems.length
        newCart.totalQuantity = totalQuantity
        
        store.setCart(newCart)
        
        // If empty, clear localStorage
        if (newItems.length === 0) {
          localStorage.removeItem('oil-amor-cart')
        }
      }
    } finally {
      store.setLoading(false)
    }
  }, [store])
  
  // Clear cart
  const clearCart = useCallback(async () => {
    if (!store.cart) {
      store.setError('Cart not initialized')
      return
    }
    
    store.setLoading(true)
    store.setError(null)
    
    try {
      const cart = await clearCartApi(store.cart.id)
      store.setCart(cart)
      // Clear localStorage to prevent stale data
      localStorage.removeItem('oil-amor-cart')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear cart'
      store.setError(message)
      logger.error('Clear cart error', error as Error)
      throw error
    } finally {
      store.setLoading(false)
    }
  }, [store])
  
  // Merge guest cart with user cart
  const mergeCarts = useCallback(async (guestCartId: string) => {
    if (!store.cart) {
      store.setError('Cart not initialized')
      return
    }
    
    store.setLoading(true)
    store.setError(null)
    
    try {
      const cart = await mergeCartsApi(guestCartId, store.cart.id)
      store.setCart(cart)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to merge carts'
      store.setError(message)
      logger.error('Merge carts error', error as Error)
      throw error
    } finally {
      store.setLoading(false)
    }
  }, [store])
  
  // Refresh cart from server
  const refreshCart = useCallback(async () => {
    if (!store.cart) return
    
    store.setLoading(true)
    store.setError(null)
    
    try {
      const cart = await fetchCart(store.cart.id)
      store.setCart(cart)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh cart'
      store.setError(message)
      logger.error('Refresh cart error', error as Error)
    } finally {
      store.setLoading(false)
    }
  }, [store])
  
  return {
    // State
    cart: store.cart,
    isLoading: store.isLoading,
    isOpen: store.isOpen,
    error: store.error,
    itemCount: store.cart?.summary?.itemCount || store.cart?.itemCount || 0,
    totalItems: store.cart?.summary?.itemCount || store.cart?.itemCount || 0,
    total: store.cart?.summary?.total || store.cart?.total || 0,
    checkoutUrl: store.cart?.checkoutUrl,
    cartId: store.cart?.id,
    
    // Actions
    addItem,
    updateItem,
    removeItem,
    clearCart,
    mergeCarts,
    refreshCart,
    openCart: store.openCart,
    closeCart: store.closeCart,
    toggleCart: store.toggleCart,
    clearError: store.clearError,
  }
}

// ============================================================================
// CART CONTEXT PROVIDER (for SSR compatibility)
// ============================================================================

// Note: CartProvider is not needed for Zustand-based cart
// The cart state is managed globally by the Zustand store
// Use useCart() hook directly in any component