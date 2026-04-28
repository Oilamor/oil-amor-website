/**
 * Oil Amor Order Database Schema
 * Complete order structure with cord/charm attachments and custom mixes
 */

// ============================================================================
// ORDER STATUS ENUMERATIONS
// ============================================================================

export type OrderStatus = 
  | 'pending'           // Order created, awaiting payment
  | 'confirmed'         // Payment received
  | 'processing'        // Being prepared
  | 'blending'          // Custom mix being created
  | 'quality-check'     // Safety/quality verification
  | 'ready-to-ship'     // Packed, awaiting carrier
  | 'shipped'           // With carrier
  | 'delivered'         // Customer received
  | 'cancelled'         // Order cancelled
  | 'refunded'          // Payment refunded

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially-refunded'

// ============================================================================
// LINE ITEM TYPES
// ============================================================================

export type LineItemType = 
  | 'standard-oil'      // Regular 30ml oil
  | 'refill-oil'        // 50ml or 100ml refill
  | 'custom-mix'        // Mixing Atelier creation
  | 'accessory'         // Cord, charm, bottle
  | 'gift-card'
  | 'shipping'

// ============================================================================
// ATTACHMENT SELECTION
// ============================================================================

export interface OrderAttachment {
  type: 'cord' | 'charm' | 'none'
  cordId?: string
  cordName?: string
  charmId?: string
  charmName?: string
  isMysteryCharm: boolean
  price: number
}

// ============================================================================
// CUSTOM MIX SPECIFICATION
// ============================================================================

export interface OrderCustomMix {
  recipeId?: string           // If saved recipe
  recipeName: string          // "Alex's Sleep Blend"
  mode: 'pure' | 'carrier'
  oils: {
    oilId: string
    oilName: string
    ml: number                // Precise ml measurement (0.1ml increments)
    drops?: number            // Optional: kept for backwards compatibility
    percentage: number
  }[]
  carrierRatio?: number       // 5-75% for carrier mode
  carrierOilId?: string       // Selected carrier oil ID
  totalVolume: 5 | 10 | 15 | 20 | 30 | 50 | 100
  
  // Enhancements
  crystalId?: string          // Selected crystal ID
  cordId?: string             // Selected cord ID
  
  // Recipe categorization
  intendedUse?: string        // e.g., "sleep", "energy", "focus"
  tags?: string[]             // Additional tags
  
  // Safety data at time of order
  safetyScore: number
  safetyRating: string
  safetyWarnings: string[]
  
  // Batch tracking
  blendedBy?: string          // Technician ID
  blendedAt?: string          // ISO timestamp
  batchId?: string            // For recalls if needed
  labCertified: boolean
  
  // Community sharing
  shareToCommunity?: boolean  // User consented to share this blend
  creatorId?: string          // User who created the blend
  creatorName?: string        // Display name of creator
  
  // Living Blend Codex revelation data
  revelationData?: Record<string, unknown>
}

// ============================================================================
// LINE ITEM
// ============================================================================

export interface OrderLineItem {
  id: string                  // Unique line item ID
  type: LineItemType
  
  // Product reference
  productId?: string          // Product ID (local catalog)
  variantId?: string          // Variant ID (if applicable)
  sku?: string
  
  // Display info
  name: string                // "Lavender Essential Oil"
  description?: string        // "30ml • Pure • With Amethyst Charm"
  image?: string
  
  // Pricing
  unitPrice: number           // Price per unit
  quantity: number
  subtotal: number            // unitPrice * quantity
  taxAmount: number
  total: number               // subtotal + tax
  
  // Customizations
  attachment?: OrderAttachment    // Cord/Charm selection
  customMix?: OrderCustomMix      // If mixing atelier product
  
  // Refill tracking
  isRefill?: boolean
  originalBottleSerial?: string   // Links to original purchase
  
  // Unlock tracking
  unlocksOilId?: string           // Oil unlocked by this purchase
  unlocksOilName?: string
  
  // Metadata
  properties?: Record<string, string>  // Key-value pairs for product options
}

// ============================================================================
// SHIPPING ADDRESS
// ============================================================================

export interface ShippingAddress {
  firstName: string
  lastName: string
  email?: string
  company?: string
  address1: string
  address2?: string
  city: string
  province: string
  country: string
  zip: string
  phone?: string
}

// ============================================================================
// PAYMENT INFORMATION
// ============================================================================

export interface PaymentInfo {
  method: 'credit-card' | 'paypal' | 'afterpay' | 'gift-card' | 'store-credit'
  transactionId?: string
  status: PaymentStatus
  paidAt?: string
  refundedAt?: string
  refundAmount?: number
}

// ============================================================================
// SHIPPING INFORMATION
// ============================================================================

export interface ShippingInfo {
  carrier: 'auspost' | 'courier' | 'express'
  service: string             // "Standard", "Express", "Same Day"
  cost: number
  trackingNumber?: string
  trackingUrl?: string
  estimatedDelivery?: string
  shippedAt?: string
  deliveredAt?: string
}

// ============================================================================
// MAIN ORDER INTERFACE
// ============================================================================

export interface Order {
  // Identification
  id: string                  // Internal order ID (ORD-2026-000001)
  externalOrderId?: string    // External order reference (if synced)
  /** @deprecated Use externalOrderId instead */
  
  // Customer
  customerId: string
  customerEmail: string
  customerName: string
  isGuest: boolean
  
  // Status
  status: OrderStatus
  statusHistory: {
    status: OrderStatus
    timestamp: string
    note?: string
    changedBy?: string
  }[]
  
  // Line Items
  items: OrderLineItem[]
  
  // Totals
  subtotal: number            // Sum of line items
  taxTotal: number
  shippingTotal: number
  discountTotal: number
  storeCreditUsed: number
  giftCardUsed: number
  total: number               // Final amount charged
  
  // Currency
  currency: string            // AUD
  
  // Payment
  payment: PaymentInfo
  
  // Shipping
  shippingAddress: ShippingAddress
  billingAddress?: ShippingAddress
  shipping: ShippingInfo
  
  // Discounts
  discountCode?: string
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  
  // Special Flags
  isGift: boolean
  giftMessage?: string
  giftReceipt: boolean        // No prices shown
  
  // Custom Mix Orders
  requiresBlending: boolean   // Needs Mixing Atelier prep
  blendingPriority?: 'normal' | 'rush'
  
  // Refill Program
  eligibleForReturns: boolean // Has refill bottles
  returnCreditsEarned: number
  returnCreditsUsed: number
  
  // Notes
  customerNote?: string       // Customer's note
  internalNote?: string       // Staff notes
  
  // Timestamps
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  cancelledReason?: string
}

// ============================================================================
// ORDER STATS FOR CUSTOMER
// ============================================================================

export interface CustomerOrderStats {
  customerId: string
  totalOrders: number
  totalSpent: number
  totalRefillsOrdered: number
  totalReturnCreditsEarned: number
  totalReturnCreditsUsed: number
  favoriteOils: string[]      // Top 3 by purchase count
  unlockedOils: string[]      // Oils available for refill
  
  // For smart defaults
  lastOrderDate?: string
  lastAttachmentType?: 'cord' | 'charm'
  cordCount: number
  charmCount: number
}

// ============================================================================
// DATABASE SCHEMA DEFINITION (for Drizzle/Prisma)
// ============================================================================

/*
// This would be used with Drizzle ORM or Prisma

export const ordersTable = {
  id: varchar('id', { length: 255 }).primaryKey(),
  externalOrderId: varchar('external_order_id', { length: 255 }),
  customerId: varchar('customer_id', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  isGuest: boolean('is_guest').default(false),
  
  status: varchar('status', { length: 50 }).notNull(),
  statusHistory: json('status_history').$type<Order['statusHistory']>(),
  
  items: json('items').$type<OrderLineItem[]>(),
  
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
  taxTotal: decimal('tax_total', { precision: 10, scale: 2 }),
  shippingTotal: decimal('shipping_total', { precision: 10, scale: 2 }),
  discountTotal: decimal('discount_total', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }),
  
  currency: varchar('currency', { length: 3 }).default('AUD'),
  
  payment: json('payment').$type<PaymentInfo>(),
  shippingAddress: json('shipping_address').$Type<ShippingAddress>(),
  shipping: json('shipping').$type<ShippingInfo>(),
  
  isGift: boolean('is_gift').default(false),
  giftMessage: text('gift_message'),
  giftReceipt: boolean('gift_receipt').default(false),
  
  requiresBlending: boolean('requires_blending').default(false),
  
  customerNote: text('customer_note'),
  internalNote: text('internal_note'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}

export const customerStatsTable = {
  customerId: varchar('customer_id', { length: 255 }).primaryKey(),
  totalOrders: integer('total_orders').default(0),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0'),
  cordCount: integer('cord_count').default(0),
  charmCount: integer('charm_count').default(0),
  unlockedOils: json('unlocked_oils').$type<string[]>(),
}
*/

// ============================================================================
// ORDER CREATION INPUT
// ============================================================================

export interface CreateOrderInput {
  customerId: string
  customerEmail: string
  customerName: string
  isGuest?: boolean
  
  items: Omit<OrderLineItem, 'id' | 'subtotal' | 'total'>[]
  
  shippingAddress: ShippingAddress
  billingAddress?: ShippingAddress
  
  shippingMethod: 'standard' | 'express' | 'same-day'
  
  discountCode?: string
  
  isGift?: boolean
  giftMessage?: string
  giftReceipt?: boolean
  
  customerNote?: string
  
  paymentMethod: PaymentInfo['method']
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateOrder(order: Partial<Order>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!order.customerId) errors.push('Customer ID is required')
  if (!order.customerEmail) errors.push('Customer email is required')
  if (!order.items || order.items.length === 0) errors.push('Order must have at least one item')
  if (!order.shippingAddress) errors.push('Shipping address is required')
  
  // Validate line items
  order.items?.forEach((item, index) => {
    if (!item.name) errors.push(`Item ${index + 1}: Name is required`)
    if (item.unitPrice < 0) errors.push(`Item ${index + 1}: Price cannot be negative`)
    if (item.quantity < 1) errors.push(`Item ${index + 1}: Quantity must be at least 1`)
    
    // Validate attachments
    if (item.attachment) {
      if (item.attachment.type === 'cord' && !item.attachment.cordId) {
        errors.push(`Item ${index + 1}: Cord ID required for cord attachment`)
      }
    }
    
    // Validate custom mixes
    if (item.customMix) {
      if (!item.customMix.recipeName) errors.push(`Item ${index + 1}: Mix name is required`)
      if (!item.customMix.oils || item.customMix.oils.length === 0) {
        errors.push(`Item ${index + 1}: Mix must contain at least one oil`)
      }
    }
  })
  
  return { valid: errors.length === 0, errors }
}

// ============================================================================
// ORDER NUMBER GENERATOR
// ============================================================================

export function generateOrderId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `ORD-${year}-${random}`
}

// ============================================================================
// ORDER TOTALS CALCULATOR
// ============================================================================

export function calculateOrderTotals(
  items: OrderLineItem[],
  shippingCost: number,
  discountAmount: number = 0
): {
  subtotal: number
  taxTotal: number
  shippingTotal: number
  discountTotal: number
  total: number
} {
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const taxTotal = subtotal * 0.1 // 10% GST for Australia
  const total = subtotal + taxTotal + shippingCost - discountAmount
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    shippingTotal: shippingCost,
    discountTotal: discountAmount,
    total: Math.round(total * 100) / 100,
  }
}
