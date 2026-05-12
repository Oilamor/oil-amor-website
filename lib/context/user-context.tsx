'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  name: string
  memberSince: string
  collectorLevel: number
  totalXP: number
  nextLevelXP: number
  streakDays: number
}

export interface Order {
  id: string
  customerId?: string
  date: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]
  total: number
  shipping?: {
    carrier?: string
    trackingNumber?: string
    trackingUrl?: string
  }
  shippingAddress?: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    province: string
    zip: string
    country: string
  }
}

export interface OrderItem {
  oilId: string
  name: string
  size: string
  type: 'pure' | 'enhanced'
  ratio?: number
  price: number
  quantity?: number
  itemType?: 'standard-oil' | 'refill-oil' | 'custom-mix' | 'accessory' | 'gift-card' | 'shipping'
  customMix?: import('@/lib/db/schema/orders').OrderCustomMix
  blendId?: string
}

export interface UnlockedBlendRefill {
  blendId: string
  name: string
  description?: string
  normalizedRecipe: {
    mode: 'pure' | 'carrier'
    oils: Array<{ oilId: string; percentage: number }>
    carrierRatio?: number
  }
  originalVolume: number
  unlockedAt: string
  unlockedBy: string
  shareCode?: string
}

export interface UnlockedOil {
  oilId: string
  unlockedAt: string
  unlockedBy: string
  type: 'pure' | 'enhanced'
}

export interface UserState {
  user: User | null
  orders: Order[]
  unlockedOils: UnlockedOil[]
  unlockedBlendRefills: UnlockedBlendRefill[]
  isAuthenticated: boolean
  isDemo: boolean
  isLoading: boolean
}

interface UserContextType extends UserState {
  login: (email: string, password: string) => Promise<void>
  loginDemo: () => void
  logout: () => void
  unlockOil: (oilId: string, orderId: string, type: 'pure' | 'enhanced') => void
  isOilUnlocked: (oilId: string, type?: 'pure' | 'enhanced') => boolean
  getUnlockedOilIds: () => string[]
  addOrder: (order: Order) => void
  unlockBlendRefill: (blend: UnlockedBlendRefill) => void
  getUnlockedBlendRefills: () => UnlockedBlendRefill[]
  totalSavings: number
  refreshUserData: () => Promise<void>
}

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@oilamor.com',
  firstName: 'Alexandra',
  lastName: 'Rose',
  name: 'Alexandra',
  memberSince: '2026-01-15',
  collectorLevel: 3,
  totalXP: 875,
  nextLevelXP: 1000,
  streakDays: 12,
}

const DEMO_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    date: '2026-03-15',
    status: 'delivered',
    items: [
      { oilId: 'lavender', name: 'Lavender', size: '30ml', type: 'pure', price: 30.95, quantity: 1, itemType: 'standard-oil' },
      { oilId: 'eucalyptus', name: 'Blue Mallee Eucalyptus', size: '30ml', type: 'pure', price: 28.95, quantity: 1, itemType: 'standard-oil' },
    ],
    total: 59.90,
    shipping: {
      carrier: 'auspost',
      trackingNumber: '33U000050001',
    },
    shippingAddress: {
      firstName: 'Alexandra',
      lastName: 'Rose',
      address1: '123 Lavender Lane',
      city: 'Melbourne',
      province: 'VIC',
      zip: '3000',
      country: 'Australia',
    },
  },
  {
    id: 'ORD-002',
    date: '2026-02-28',
    status: 'delivered',
    items: [
      { oilId: 'tea-tree', name: 'Tea Tree', size: '30ml', type: 'enhanced', ratio: 25, price: 24.95, quantity: 1, itemType: 'standard-oil' },
    ],
    total: 24.95,
    shipping: {
      carrier: 'auspost',
      trackingNumber: '33U000050002',
    },
    shippingAddress: {
      firstName: 'Alexandra',
      lastName: 'Rose',
      address1: '123 Lavender Lane',
      city: 'Melbourne',
      province: 'VIC',
      zip: '3000',
      country: 'Australia',
    },
  },
]

const DEMO_UNLOCKED_OILS: UnlockedOil[] = [
  { oilId: 'lavender', unlockedAt: '2026-03-15', unlockedBy: 'ORD-001', type: 'pure' },
  { oilId: 'eucalyptus', unlockedAt: '2026-03-15', unlockedBy: 'ORD-001', type: 'pure' },
  { oilId: 'tea-tree', unlockedAt: '2026-02-28', unlockedBy: 'ORD-002', type: 'enhanced' },
]

const STORAGE_KEY = 'oil_amor_user_state_v2'
const BLEND_REFILLS_KEY = 'oil_amor_blend_refills_v2'

// LocalStorage persistence removed for security — user data is fetched from server
function loadStateFromStorage(): Partial<UserState> | null {
  return null
}

function saveStateToStorage(state: UserState) {
  // No-op: we do not persist PII to localStorage
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const DEMO_BLEND_REFILLS: UnlockedBlendRefill[] = [
  {
    blendId: 'blend-001',
    name: 'My Sleep Potion',
    description: 'A calming blend for restful sleep',
    normalizedRecipe: {
      mode: 'carrier',
      oils: [
        { oilId: 'lavender', percentage: 0.5 },
        { oilId: 'chamomile', percentage: 0.25 },
        { oilId: 'cedarwood', percentage: 0.25 },
      ],
      carrierRatio: 0.7,
    },
    originalVolume: 30,
    unlockedAt: '2026-03-15',
    unlockedBy: 'ORD-003',
    shareCode: 'OIL-A8X9-KL2M',
  },
]

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>({
    user: null,
    orders: [],
    unlockedOils: [],
    unlockedBlendRefills: [],
    isAuthenticated: false,
    isDemo: false,
    isLoading: true,
  })

  // Load on mount — no localStorage, just finish loading
  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: false }))
  }, [])

  // Save to storage when state changes
  useEffect(() => {
    if (state.isAuthenticated) {
      saveStateToStorage(state)
    }
  }, [state])

  // Link guest orders to user account
  const linkGuestOrders = useCallback(async () => {
    if (!state.isAuthenticated || state.isDemo || !state.user?.email) return
    
    try {
      const response = await fetch('/api/user/link-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: state.user.email,
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.linkedCount > 0) {
        }
      }
    } catch (error) {
      console.error('Failed to link guest orders:', error)
    }
  }, [state.isAuthenticated, state.isDemo, state.user?.email])

  // Refresh user data from API
  const refreshUserData = useCallback(async () => {
    if (!state.isAuthenticated || state.isDemo) return
    
    try {
      // First, link any guest orders by email
      await linkGuestOrders()
      
      // Fetch profile
      const profileRes = await fetch('/api/user/profile')
      
      if (profileRes.ok) {
        const profile = await profileRes.json()
        
        // Fetch orders
        const ordersRes = await fetch('/api/user/orders')
        
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          
          setState(prev => ({
            ...prev,
            user: {
              ...prev.user!,
              ...profile,
            },
            orders: ordersData.orders || [],
            unlockedOils: ordersData.unlockedOils || [],
          }))
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)
    }
  }, [state.isAuthenticated, state.isDemo, linkGuestOrders])

  const login = useCallback(async (email: string, password: string) => {
    // Login initiated
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
    // Login response received
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error('Login failed:', data)
        throw new Error(data.error || `Login failed: ${response.status}`)
      }
      
      const data = await response.json()
      const userId = data.user.id
      
      // Set authenticated state
      setState(prev => ({
        ...prev,
        user: {
          ...data.user,
          collectorLevel: 1,
          totalXP: 0,
          nextLevelXP: 500,
          streakDays: 0,
        },
        isAuthenticated: true,
        isDemo: false,
      }))
      
      // Link any guest orders
      try {
        const linkRes = await fetch('/api/user/link-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
          }),
        })
        if (!linkRes.ok) {
          const err = await linkRes.json()
          console.error('Link orders error:', err)
        }
      } catch (e) {
        console.error('Failed to link guest orders:', e)
      }
      
      // Fetch orders and unlocked oils
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/orders'),
        ])
        
        if (!profileRes.ok) {
          const err = await profileRes.json().catch(() => ({}))
          console.error('Profile API error:', profileRes.status, err)
        }
        if (!ordersRes.ok) {
          const err = await ordersRes.json().catch(() => ({}))
          console.error('Orders API error:', ordersRes.status, err)
        }
        
        if (profileRes.ok && ordersRes.ok) {
          const [profile, ordersData] = await Promise.all([
            profileRes.json(),
            ordersRes.json(),
          ])
          
          setState(prev => ({
            ...prev,
            user: {
              ...prev.user!,
              ...profile,
            },
            orders: ordersData.orders || [],
            unlockedOils: ordersData.unlockedOils || [],
          }))
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    } catch (error: any) {
      console.error('Login error:', error)
      throw error
    }
  }, [])

  const loginDemo = useCallback(() => {
    setState({
      user: DEMO_USER,
      orders: DEMO_ORDERS,
      unlockedOils: DEMO_UNLOCKED_OILS,
      unlockedBlendRefills: DEMO_BLEND_REFILLS,
      isAuthenticated: true,
      isDemo: true,
      isLoading: false,
    })
  }, [])

  const logout = useCallback(async () => {
    // Tell server to destroy session
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore network errors
    }
    setState({
      user: null,
      orders: [],
      unlockedOils: [],
      unlockedBlendRefills: [],
      isAuthenticated: false,
      isDemo: false,
      isLoading: false,
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(BLEND_REFILLS_KEY)
    }
  }, [])

  const unlockOil = useCallback((oilId: string, orderId: string, type: 'pure' | 'enhanced') => {
    setState(prev => {
      const alreadyUnlocked = prev.unlockedOils.some(u => u.oilId === oilId)
      if (alreadyUnlocked) {
        const existing = prev.unlockedOils.find(u => u.oilId === oilId)
        if (existing && existing.type === 'pure' && type === 'enhanced') {
          return {
            ...prev,
            unlockedOils: prev.unlockedOils.map(u =>
              u.oilId === oilId ? { ...u, type: 'enhanced' } : u
            ),
          }
        }
        return prev
      }
      return {
        ...prev,
        unlockedOils: [
          ...prev.unlockedOils,
          {
            oilId,
            unlockedAt: new Date().toISOString(),
            unlockedBy: orderId,
            type,
          },
        ],
      }
    })
  }, [])

  const isOilUnlocked = useCallback((oilId: string, type?: 'pure' | 'enhanced'): boolean => {
    const unlocked = state.unlockedOils.find(u => u.oilId === oilId)
    if (!unlocked) return false
    if (!type) return true
    if (type === 'pure') return true
    return unlocked.type === 'enhanced'
  }, [state.unlockedOils])

  const getUnlockedOilIds = useCallback((): string[] => {
    return Array.from(new Set(state.unlockedOils.map(u => u.oilId)))
  }, [state.unlockedOils])

  const addOrder = useCallback((order: Order) => {
    setState(prev => {
      const newUnlocks: UnlockedOil[] = []
      for (const item of order.items) {
        const alreadyUnlocked = prev.unlockedOils.find(u => u.oilId === item.oilId)
        if (!alreadyUnlocked) {
          newUnlocks.push({
            oilId: item.oilId,
            unlockedAt: new Date().toISOString(),
            unlockedBy: order.id,
            type: item.type,
          })
        } else if (alreadyUnlocked.type === 'pure' && item.type === 'enhanced') {
          alreadyUnlocked.type = 'enhanced'
        }
      }
      return {
        ...prev,
        orders: [order, ...prev.orders],
        unlockedOils: [...prev.unlockedOils, ...newUnlocks],
      }
    })
  }, [])

  const unlockBlendRefill = useCallback((blend: UnlockedBlendRefill) => {
    setState(prev => {
      const alreadyExists = prev.unlockedBlendRefills.some(b => b.blendId === blend.blendId)
      if (alreadyExists) return prev
      return {
        ...prev,
        unlockedBlendRefills: [...prev.unlockedBlendRefills, blend],
      }
    })
  }, [])

  const getUnlockedBlendRefills = useCallback((): UnlockedBlendRefill[] => {
    return state.unlockedBlendRefills
  }, [state.unlockedBlendRefills])

  const totalSavings = state.unlockedOils.length * 15 + state.orders.length * 5

  return (
    <UserContext.Provider
      value={{
        ...state,
        login,
        loginDemo,
        logout,
        unlockOil,
        isOilUnlocked,
        getUnlockedOilIds,
        addOrder,
        unlockBlendRefill,
        getUnlockedBlendRefills,
        totalSavings,
        refreshUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export function useAuth(): { isAuthenticated: boolean; isDemo: boolean; user: User | null; isLoading: boolean } {
  const context = useContext(UserContext)
  if (context === undefined) {
    return { isAuthenticated: false, isDemo: false, user: null, isLoading: false }
  }
  return { 
    isAuthenticated: context.isAuthenticated, 
    isDemo: context.isDemo,
    user: context.user,
    isLoading: context.isLoading,
  }
}
