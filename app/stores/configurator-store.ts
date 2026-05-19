/**
 * Configurator Store - Zustand
 * State management for the product configurator
 * Features: persistence, race condition prevention, real API integration
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  ConfiguratorStore,
  ConfiguratorState,
  ConfiguratorActions,
  Oil,
  Crystal,
  BottleSize,
  AccessorySelection,
  SynergyContent,
  PurchaseHistory,
  ConfiguredProduct,
  CordType,
} from '../types'
import { TierLevel } from '../../lib/rewards/tiers'
import { PRICING, CRYSTAL_MAPPING } from '../lib/constants'
import { fetchSynergyContent } from '../lib/api'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// RACE CONDITION PREVENTION
// ============================================================================

let currentAbortController: AbortController | null = null

function createAbortableAsync<T>(
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  // Cancel previous request
  currentAbortController?.abort()
  currentAbortController = new AbortController()
  
  return operation(currentAbortController.signal)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ConfiguratorState = {
  selectedOil: null,
  selectedCrystal: null,
  selectedSize: BottleSize.MEDIUM,
  selectedAccessory: {
    type: 'cord',
    cordType: CordType.BLACK_COTTON,
  },
  synergyContent: null,
  isLoading: false,
  customerTier: TierLevel.SEED,
  purchaseHistory: null,
  isAddingToCart: false,
  showCollectionProgress: false,
}

// ============================================================================
// STORE CREATION
// ============================================================================

export const useConfiguratorStore = create<ConfiguratorStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // =====================================================================
        // ACTIONS
        // =====================================================================

        /**
         * Set the selected oil and fetch initial synergy
         */
        setOil: (oil: Oil) => {
          set({ selectedOil: oil, isLoading: true })
          
          // If we have a crystal selected, update synergy content
          const { selectedCrystal } = get()
          if (selectedCrystal) {
            get().setCrystal(selectedCrystal)
          } else {
            set({ isLoading: false })
          }
        },

        /**
         * Set the selected crystal and fetch synergy content
         * Prevents race conditions on rapid selections
         */
        setCrystal: async (crystal: Crystal) => {
          const { selectedOil } = get()
          
          set({ 
            selectedCrystal: crystal, 
            isLoading: true,
            synergyContent: null,
          })

          try {
            if (selectedOil) {
              const content = await createAbortableAsync(async (signal) => {
                // Check if aborted before starting
                if (signal.aborted) {
                  throw new Error('AbortError')
                }
                
                const result = await fetchSynergyContent(selectedOil.slug, crystal.slug)
                
                // Check if aborted after fetch
                if (signal.aborted) {
                  throw new Error('AbortError')
                }
                
                return result
              })
              
              // Only update if this request wasn't aborted
              if (content) {
                set({ 
                  synergyContent: content, 
                  isLoading: false 
                })
              }
            } else {
              set({ isLoading: false })
            }
          } catch (error) {
            if (isAbortError(error)) {
              // Silently ignore abort errors - the newer request will handle the update
              return
            }
            logger.error('Failed to fetch synergy content', error instanceof Error ? error : new Error(String(error)))
            set({ isLoading: false })
          }
        },

        /**
         * Set the bottle size
         */
        setSize: (size: BottleSize) => {
          set({ selectedSize: size })
        },

        /**
         * Set the accessory selection
         */
        setAccessory: (accessory: AccessorySelection) => {
          set({ selectedAccessory: accessory })
        },

        /**
         * Calculate total price based on current selections
         */
        calculatePrice: (): number => {
          const state = get()
          const { selectedOil, selectedSize, selectedAccessory, customerTier } = state

          if (!selectedOil) return 0

          // Base price for bottle size
          let price = PRICING.basePrice[selectedSize]

          // Add cord/charm costs
          if (selectedAccessory.type === 'cord' && selectedAccessory.cordType) {
            price += PRICING.cordUpgrades[selectedAccessory.cordType as keyof typeof PRICING.cordUpgrades] || 0
          } else if (selectedAccessory.type === 'charm' && selectedAccessory.charmType) {
            price += PRICING.charmBase
          } else if (selectedAccessory.type === 'extra-crystals') {
            price += PRICING.extraCrystals
          }

          // Apply tier discount
          const discount = PRICING.tierDiscount[customerTier]
          price = price * (1 - discount)

          return Math.round(price * 100) / 100
        },

        /**
         * Build cart item from current configuration
         */
        buildCartItem: (): ConfiguredProduct | null => {
          const state = get()
          const { 
            selectedOil, 
            selectedCrystal, 
            selectedSize, 
            selectedAccessory,
          } = state

          if (!selectedOil || !selectedCrystal) return null

          const unitPrice = get().calculatePrice()
          const crystalConfig = CRYSTAL_MAPPING[selectedSize]

          // Build accessory name
          let accessoryName = ''
          if (selectedAccessory.type === 'cord') {
            accessoryName = selectedAccessory.cordType 
              ? `with ${selectedAccessory.cordType.replace('_', ' ')} cord`
              : 'with cord'
          } else if (selectedAccessory.type === 'charm') {
            accessoryName = selectedAccessory.charmType
              ? `with ${selectedAccessory.charmType} charm`
              : 'with charm'
          } else if (selectedAccessory.type === 'extra-crystals') {
            accessoryName = `with ${crystalConfig.count + (selectedAccessory.extraCrystalCount || 0)} crystals`
          }

          return {
            oilId: selectedOil.id,
            crystalId: selectedCrystal.id,
            bottleSize: selectedSize,
            accessory: selectedAccessory,
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
            configuration: {
              oilName: selectedOil.name,
              crystalName: selectedCrystal.name,
              sizeName: selectedSize,
              accessoryName,
            },
          }
        },

        /**
         * Reset store to initial state
         */
        reset: () => {
          currentAbortController?.abort()
          currentAbortController = null
          set(initialState)
        },

        // =====================================================================
        // SETTERS FOR NON-SELECTION STATE
        // =====================================================================

        setCustomerTier: (tier: TierLevel) => {
          set({ customerTier: tier })
        },

        setPurchaseHistory: (history: PurchaseHistory) => {
          set({ purchaseHistory: history })
        },

        setIsAddingToCart: (isAdding: boolean) => {
          set({ isAddingToCart: isAdding })
        },

        setShowCollectionProgress: (show: boolean) => {
          set({ showCollectionProgress: show })
        },
      }),
      {
        name: 'oil-amor-configurator',
        partialize: (state) => ({
          // Persist selection state for user convenience
          selectedSize: state.selectedSize,
          selectedCrystal: state.selectedCrystal,
          selectedOil: state.selectedOil,
          selectedAccessory: state.selectedAccessory,
          customerTier: state.customerTier,
        }),
      }
    ),
    { name: 'ConfiguratorStore' }
  )
)

// ============================================================================
// CART ADAPTER
// Adapts configurator cart item to cart format
// ============================================================================

export interface ConfiguratorCartItem {
  oilVariantId: string
  bottleSize: string
  crystalType: string
  crystalCount: number
  accessoryType: 'cord' | 'charm' | 'extra-crystals'
  cordType?: string
  charmType?: string
  extraCrystalCount?: number
  customerTier: TierLevel
  creditToApply?: number
  oilName: string
}

// Helper function to map Crystal Circle tier to legacy comparison
export function getTierValue(tier: TierLevel): number {
  const tierValues: Record<TierLevel, number> = {
    seed: 0,
    sprout: 1,
    bloom: 2,
    radiance: 3,
    luminary: 4
  }
  return tierValues[tier] || 0
}

/**
 * Adapt configurator cart item to standard cart format
 */
export function adaptCartItem(
  item: ConfiguredProduct | null
): ConfiguratorCartItem | null {
  if (!item) return null

  const crystalConfig = CRYSTAL_MAPPING[item.bottleSize]
  
  return {
    oilVariantId: item.oilId,
    bottleSize: item.bottleSize,
    crystalType: item.crystalId,
    crystalCount: crystalConfig.count,
    accessoryType: item.accessory.type,
    cordType: item.accessory.cordType,
    charmType: item.accessory.charmType,
    extraCrystalCount: item.accessory.extraCrystalCount,
    customerTier: TierLevel.SEED, // Retrieved from separate auth state
    creditToApply: 0, // Calculated separately based on customer credits
    oilName: item.configuration.oilName,
  }
}

// ============================================================================
// SELECTORS (for computed values and derived state)
// ============================================================================

export const selectCrystalCount = (state: ConfiguratorStore): number => {
  const { selectedSize, selectedAccessory } = state
  const baseCount = CRYSTAL_MAPPING[selectedSize].count
  
  if (selectedAccessory.type === 'extra-crystals') {
    return baseCount + (selectedAccessory.extraCrystalCount || 2)
  }
  
  return baseCount
}

export const selectHasUnlockedChains = (state: ConfiguratorStore): boolean => {
  // Bloom tier and above have chain unlocks
  return getTierValue(state.customerTier) >= getTierValue(TierLevel.BLOOM)
}

export const selectCanAddExtraCrystals = (state: ConfiguratorStore): boolean => {
  // All tiers can add extra crystals (seed and above)
  return getTierValue(state.customerTier) >= getTierValue(TierLevel.SEED)
}

export const selectCollectionProgress = (state: ConfiguratorStore): number => {
  const { purchaseHistory } = state
  if (!purchaseHistory) return 0
  
  // Calculate progress based on unique combinations
  const targetCombinations = 12 // Target for "Master" level
  const currentCombinations = (purchaseHistory.uniqueOils?.length || 0) + 
    (purchaseHistory.uniqueCrystals?.length || 0)
  
  return Math.min((currentCombinations / targetCombinations) * 100, 100)
}

// ============================================================================
// HOOKS (for common store operations)
// ============================================================================

export function useCrystalCount(): number {
  return useConfiguratorStore(selectCrystalCount)
}

export function useCollectionProgress(): number {
  return useConfiguratorStore(selectCollectionProgress)
}

export function useCurrentPrice(): number {
  return useConfiguratorStore((state) => state.calculatePrice())
}

export function useIsConfigurationComplete(): boolean {
  return useConfiguratorStore(
    (state) => state.selectedOil !== null && state.selectedCrystal !== null
  )
}
