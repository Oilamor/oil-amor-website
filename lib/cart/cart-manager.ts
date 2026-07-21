/**
 * Cart Manager
 * Enterprise-grade cart management with Redis persistence
 */

import { Redis } from '@upstash/redis'
import { 
  Cart, 
  CartItem, 
  CartSummary, 
  AddToCartInput, 
  UpdateCartItemInput,
  CartValidationResult,
  CartEvent,
  CartEventType,
} from './types'
import { createCartKey } from '@/lib/redis/client'
import { logger } from '@/lib/logging/logger'
import { generateSecureToken } from '@/lib/security/security-utils'
import { cache } from '@/lib/redis/cache'
// Simple ID generator to avoid nanoid ES module issues
function generateId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CART_CONFIG = {
  // TTL in seconds
  ttl: {
    anonymous: 30 * 24 * 60 * 60, // 30 days for anonymous carts
    authenticated: 90 * 24 * 60 * 60, // 90 days for authenticated carts
    abandoned: 7 * 24 * 60 * 60, // 7 days for abandoned cart recovery
  },
  
  // Limits
  limits: {
    maxItems: 100,
    maxQuantityPerItem: 99,
    maxCartValue: 10000, // $10,000 AUD
  },
  
  // Sync settings
  sync: {
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
}

// ============================================================================
// CART MANAGER CLASS
// ============================================================================

export class CartManager {
  private redis: Redis
  
  constructor(redis: Redis) {
    this.redis = redis
  }
  
  // ========================================================================
  // CART CREATION
  // ========================================================================
  
  async createCart(customerId?: string, email?: string): Promise<Cart> {
    const cartId = `cart_${generateId(16)}`
    const now = new Date().toISOString()
    
    const cart: Cart = {
      id: cartId,
      items: [],
      summary: {
        subtotal: 0,
        totalTax: 0,
        totalShipping: 0,
        totalDiscounts: 0,
        total: 0,
        currency: 'AUD',
        itemCount: 0,
      },
      // Required Cart fields
      subtotal: 0,
      taxTotal: 0,
      shippingEstimate: 0,
      discountTotal: 0,
      total: 0,
      currency: 'AUD',
      itemCount: 0,
      totalQuantity: 0,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerId,
      email,
    }
    
    const ttl = customerId ? CART_CONFIG.ttl.authenticated : CART_CONFIG.ttl.anonymous
    
    await this.saveCart(cart, ttl)
    
    logger.info('Cart created', { cartId: cartId.slice(0, 8), customerId })
    
    return cart
  }
  
  // ========================================================================
  // CART RETRIEVAL
  // ========================================================================
  
  async getCart(cartId: string): Promise<Cart | null> {
    try {
      const key = createCartKey(cartId)
      const cart = await this.redis.get<Cart>(key)
      
      if (!cart) {
        return null
      }
      
      // Update last activity
      cart.lastActivityAt = new Date().toISOString()
      await this.saveCart(cart)
      
      return cart
    } catch (error) {
      logger.error('Error retrieving cart', error as Error, { cartId: cartId.slice(0, 8) })
      return null
    }
  }
  
  async getOrCreateCart(cartId?: string, customerId?: string, email?: string): Promise<Cart> {
    if (cartId) {
      const existing = await this.getCart(cartId)
      if (existing) {
        // Update customer info if provided
        if (customerId && !existing.customerId) {
          existing.customerId = customerId
          existing.email = email
          await this.saveCart(existing)
        }
        return existing
      }
    }
    
    return this.createCart(customerId, email)
  }
  
  // ========================================================================
  // ADD TO CART
  // ========================================================================
  
  async addItem(cartId: string, input: AddToCartInput): Promise<{ cart: Cart; item: CartItem }> {
    const cart = await this.getCart(cartId)
    
    if (!cart) {
      throw new Error('Cart not found')
    }
    
    // Check cart limits
    if (cart.items.length >= CART_CONFIG.limits.maxItems) {
      throw new Error(`Cart cannot exceed ${CART_CONFIG.limits.maxItems} items`)
    }
    
    if (input.quantity > CART_CONFIG.limits.maxQuantityPerItem) {
      throw new Error(`Maximum quantity per item is ${CART_CONFIG.limits.maxQuantityPerItem}`)
    }
    
    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      item => item.variantId === input.variantId && 
        JSON.stringify(item.configuration) === JSON.stringify(input.configuration)
    )
    
    let item: CartItem
    const now = new Date().toISOString()
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const existing = cart.items[existingItemIndex]
      const newQuantity = existing.quantity + input.quantity
      
      if (newQuantity > CART_CONFIG.limits.maxQuantityPerItem) {
        throw new Error(`Maximum quantity per item is ${CART_CONFIG.limits.maxQuantityPerItem}`)
      }
      
      item = {
        ...existing,
        quantity: newQuantity,
        updatedAt: now,
      }
      
      cart.items[existingItemIndex] = item
    } else {
      // Create new item
      item = {
        id: `line_${generateId(12)}`,
        variantId: input.variantId,
        productId: '', // Will be populated from product catalog
        name: '', // Will be populated from product catalog
        quantity: input.quantity,
        unitPrice: 0, // Will be populated from product catalog
        price: 0, // Will be populated from product catalog
        currency: 'AUD',
        configuration: input.configuration,
        properties: input.properties,
        addedAt: now,
        updatedAt: now,
      }
      
      cart.items.push(item)
    }
    
    // Recalculate summary
    cart.summary = this.calculateSummary(cart)
    cart.updatedAt = now
    
    await this.saveCart(cart)
    
    // Log event
    await this.logEvent({
      type: CartEventType.ITEM_ADDED,
      cartId,
      timestamp: now,
      data: { item },
    })
    
    return { cart, item }
  }
  
  // ========================================================================
  // UPDATE CART ITEM
  // ========================================================================
  
  async updateItem(cartId: string, input: UpdateCartItemInput): Promise<Cart> {
    const cart = await this.getCart(cartId)
    
    if (!cart) {
      throw new Error('Cart not found')
    }
    
    const itemIndex = cart.items.findIndex(item => item.id === input.lineId)
    
    if (itemIndex === -1) {
      throw new Error('Item not found in cart')
    }
    
    const now = new Date().toISOString()
    
    if (input.quantity <= 0) {
      // Remove item
      const removed = cart.items.splice(itemIndex, 1)[0]
      
      await this.logEvent({
        type: CartEventType.ITEM_REMOVED,
        cartId,
        timestamp: now,
        data: { item: removed },
      })
    } else {
      // Update quantity
      if (input.quantity > CART_CONFIG.limits.maxQuantityPerItem) {
        throw new Error(`Maximum quantity per item is ${CART_CONFIG.limits.maxQuantityPerItem}`)
      }
      
      cart.items[itemIndex].quantity = input.quantity
      cart.items[itemIndex].updatedAt = now
      
      await this.logEvent({
        type: CartEventType.ITEM_UPDATED,
        cartId,
        timestamp: now,
        data: { item: cart.items[itemIndex] },
      })
    }
    
    cart.summary = this.calculateSummary(cart)
    cart.updatedAt = now
    
    await this.saveCart(cart)
    
    return cart
  }
  
  // ========================================================================
  // REMOVE FROM CART
  // ========================================================================
  
  async removeItem(cartId: string, lineId: string): Promise<Cart> {
    return this.updateItem(cartId, { lineId, quantity: 0 })
  }
  
  // ========================================================================
  // CLEAR CART
  // ========================================================================
  
  async clearCart(cartId: string): Promise<Cart> {
    const cart = await this.getCart(cartId)
    
    if (!cart) {
      throw new Error('Cart not found')
    }
    
    const now = new Date().toISOString()
    
    await this.logEvent({
      type: CartEventType.CART_CLEARED,
      cartId,
      timestamp: now,
      data: { items: cart.items },
    })
    
    cart.items = []
    cart.summary = this.calculateSummary(cart)
    cart.updatedAt = now
    
    await this.saveCart(cart)
    
    return cart
  }
  
  // ========================================================================
  // MERGE CARTS (Guest → Authenticated)
  // ========================================================================
  
  async mergeCarts(sourceCartId: string, targetCartId: string): Promise<Cart> {
    const [source, target] = await Promise.all([
      this.getCart(sourceCartId),
      this.getCart(targetCartId),
    ])
    
    if (!target) {
      throw new Error('Target cart not found')
    }
    
    if (!source || source.items.length === 0) {
      return target
    }
    
    const now = new Date().toISOString()
    
    // Merge items
    for (const sourceItem of source.items) {
      const existingIndex = target.items.findIndex(
        item => item.variantId === sourceItem.variantId &&
          JSON.stringify(item.configuration) === JSON.stringify(sourceItem.configuration)
      )
      
      if (existingIndex >= 0) {
        // Combine quantities
        target.items[existingIndex].quantity += sourceItem.quantity
        target.items[existingIndex].updatedAt = now
      } else {
        // Add as new item
        target.items.push({
          ...sourceItem,
          id: `line_${generateId(12)}`, // New ID for merged cart
          addedAt: now,
          updatedAt: now,
        })
      }
    }
    
    target.summary = this.calculateSummary(target)
    target.updatedAt = now
    
    await this.saveCart(target)
    
    // Delete source cart
    await this.deleteCart(sourceCartId)
    
    await this.logEvent({
      type: CartEventType.CART_MERGED,
      cartId: targetCartId,
      timestamp: now,
      data: { sourceCartId, itemCount: source.items.length },
    })
    
    logger.info('Carts merged', { 
      targetCart: targetCartId.slice(0, 8), 
      sourceCart: sourceCartId.slice(0, 8),
      itemsMerged: source.items.length,
    })
    
    return target
  }
  
  // ========================================================================
  // VALIDATION
  // ========================================================================
  
  async validateCart(cartId: string): Promise<CartValidationResult> {
    const cart = await this.getCart(cartId)
    
    if (!cart) {
      return {
        valid: false,
        errors: [{ type: 'unavailable', lineId: '', message: 'Cart not found' }],
        warnings: [],
      }
    }
    
    const errors: CartValidationResult['errors'] = []
    const warnings: CartValidationResult['warnings'] = []
    
    // Check cart value limit
    if ((cart.summary?.total ?? cart.total) > CART_CONFIG.limits.maxCartValue) {
      errors.push({
        type: 'limit_exceeded',
        lineId: '',
        message: `Cart value cannot exceed $${CART_CONFIG.limits.maxCartValue}`,
      })
    }
    
    // Check each item (would integrate with inventory system)
    for (const item of cart.items) {
      if (item.quantity > CART_CONFIG.limits.maxQuantityPerItem) {
        errors.push({
          type: 'limit_exceeded',
          lineId: item.id,
          message: `Maximum quantity is ${CART_CONFIG.limits.maxQuantityPerItem}`,
        })
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
  
  // ========================================================================
  // UTILITY METHODS
  // ========================================================================
  
  private calculateSummary(cart: Cart): CartSummary {
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = cart.items.reduce(
      (sum, item) => sum + (item.price ?? item.unitPrice ?? 0) * item.quantity,
      0
    )
    
    // Calculate tax (simplified - would use tax service)
    const totalTax = Math.round(subtotal * 0.1 * 100) / 100 // 10% GST
    
    // Calculate shipping (simplified - would use shipping calculator)
    // Free shipping threshold matches lib/stripe/config.ts ($199)
    let totalShipping = 0
    if (subtotal < 199) {
      totalShipping = 10 // $10 shipping under $199
    }
    
    const total = subtotal + totalTax + totalShipping - (cart.summary?.totalDiscounts ?? cart.discountTotal ?? 0)
    
    return {
      subtotal,
      totalTax,
      totalShipping,
      totalDiscounts: cart.summary?.totalDiscounts ?? cart.discountTotal ?? 0,
      total: Math.max(0, total),
      currency: 'AUD',
      itemCount,
    }
  }
  
  private async saveCart(cart: Cart, ttl?: number): Promise<void> {
    const key = createCartKey(cart.id)
    const ttlToUse = ttl || (cart.customerId ? CART_CONFIG.ttl.authenticated : CART_CONFIG.ttl.anonymous)
    
    await this.redis.set(key, cart, { ex: ttlToUse })
  }
  
  private async deleteCart(cartId: string): Promise<void> {
    const key = createCartKey(cartId)
    await this.redis.del(key)
  }
  
  private async logEvent(event: CartEvent): Promise<void> {
    // Store event for analytics
    const eventKey = `oilamor:cart:events:${event.cartId}:${Date.now()}`
    await this.redis.set(eventKey, event, { ex: 86400 * 30 }) // Keep for 30 days
    
    // Also log to logger
    logger.info('Cart event', { type: event.type, cartId: event.cartId.slice(0, 8) })
  }
  
}
