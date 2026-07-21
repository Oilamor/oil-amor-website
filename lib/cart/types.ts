/**
 * Oil Amor Enhanced Cart Types
 * With cord/charm attachment and custom mix support
 */

import { OrderAttachment, OrderCustomMix } from '@/lib/db/schema/orders'

// ============================================================================
// CART ITEM TYPES
// ============================================================================

export interface CartItem {
  id: string                  // Unique cart line ID
  
  // Product reference
  productId: string
  variantId?: string
  sku?: string
  
  // Display
  name: string
  description?: string
  image?: string
  
  // Pricing
  unitPrice: number
  price?: number                  // Alias for unitPrice (compatibility)
  currency?: string               // Currency code (e.g., 'AUD')
  quantity: number
  
  // Oil Amor Specific
  attachment?: OrderAttachment    // Cord/Charm selection
  customMix?: OrderCustomMix      // Mixing Atelier configuration
  configuration?: {               // Product configuration
    bottleSize?: string
    carrierOil?: string
    cord?: string
    charm?: string
    oils?: Array<{ name: string; ml: number }>
    crystals?: string[]
    oilName?: string
    crystalName?: string
    accessoryName?: string
    [key: string]: unknown
  }
  
  // Unlock tracking
  unlocksOilId?: string           // Which oil this purchase unlocks
  
  // Metadata
  properties?: Record<string, string>
  
  // Timestamps
  addedAt: string
  updatedAt: string
}

// ============================================================================
// CART STATE
// ============================================================================

export interface CartSummary {
  subtotal: number
  totalTax: number
  totalShipping: number
  totalDiscounts: number
  total: number
  currency: string
  itemCount: number
}

export interface Cart {
  id: string
  
  // Customer
  customerId?: string
  email?: string
  
  // Items (Internal format)
  items: CartItem[]
  
  // Totals (Internal format)
  subtotal: number
  taxTotal: number
  shippingEstimate: number
  discountTotal: number
  total: number
  
  // Checkout
  checkoutUrl?: string
  
  // Summary (legacy mirror — refreshed by the unified cart manager when present)
  summary?: CartSummary
  
  // Currency
  currency: string
  
  // Discounts
  discountCode?: string
  
  // Shipping
  shippingAddress?: {
    country: string
    province: string
    zip: string
  }
  
  // Metadata
  itemCount: number
  totalQuantity: number
  
  // Timestamps
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
  expiresAt: string         // Cart expiration for abandoned cart recovery
  
  // Configuration for custom products
  configuration?: Record<string, unknown>
}



// ============================================================================
// CART OPERATIONS
// ============================================================================

export interface AddToCartInput {
  id?: string                     // Optional ID for the cart item
  productId?: string
  variantId?: string
  quantity: number
  
  // Oil Amor specific
  attachment?: Omit<OrderAttachment, 'price'>  // Price calculated server-side
  customMix?: OrderCustomMix
  configuration?: {              // Product configuration
    bottleSize?: string
    carrierOil?: string
    cord?: string
    charm?: string
    oils?: Array<{ name: string; ml: number }>
    crystals?: string[]
    [key: string]: unknown
  }
  
  properties?: Record<string, string>
}

export interface UpdateCartItemInput {
  lineId: string
  quantity: number
  
  // Allow changing attachment
  attachment?: OrderAttachment
}

// ============================================================================
// CART VALIDATION
// ============================================================================

export interface CartValidationResult {
  valid: boolean
  errors: CartError[]
  warnings: CartWarning[]
}

export interface CartError {
  type: 'item-unavailable' | 'quantity-exceeded' | 'attachment-invalid' | 'mix-invalid' | 'cart-invalid' | 'unavailable' | 'limit_exceeded'
  lineId?: string
  message: string
}

export interface CartWarning {
  type: 'low-stock' | 'price-changed' | 'attachment-changed'
  lineId?: string
  message: string
}

// ============================================================================
// CART PERSISTENCE
// ============================================================================

export interface CartSession {
  cartId: string
  customerId?: string
  sessionToken: string
  deviceFingerprint?: string
}

// ============================================================================
// CART EVENTS
// ============================================================================

export enum CartEventType {
  ITEM_ADDED = 'item-added',
  ITEM_REMOVED = 'item-removed',
  ITEM_UPDATED = 'item-updated',
  CART_CLEARED = 'cart-cleared',
  CART_MERGED = 'cart-merged',
}

export interface CartEvent {
  type: CartEventType
  cartId: string
  timestamp: string
  payload?: Record<string, unknown>
  data?: Record<string, unknown>  // Alias for payload (compatibility)
}
