/**
 * Oil Amor Redis Cart Manager
 * Production-ready cart storage with Redis persistence
 * Falls back to in-memory Map if Redis unavailable
 */

import { Cart, CartItem, AddToCartInput, UpdateCartItemInput, CartValidationResult } from './types'
import { OrderAttachment, OrderCustomMix } from '@/lib/db/schema/orders'
import { CORD_OPTIONS, CHARM_OPTIONS, getAttachmentPrice } from '@/lib/products/attachment-options'
import { redis, createCartKey } from '@/lib/redis/client'

// Simple ID generator
function generateId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// In-memory fallback for development
const memoryStore = new Map<string, Cart>()

// Check if Redis is available
const isRedisAvailable = (): boolean => {
  return redis.isHealthy()
}

// ============================================================================
// REDIS CART MANAGER
// ============================================================================

export class CartManager {
  private static instance: CartManager
  
  private constructor() {}
  
  static getInstance(): CartManager {
    if (!CartManager.instance) {
      CartManager.instance = new CartManager()
    }
    return CartManager.instance
  }

  // ==========================================================================
  // STORAGE HELPERS (Redis or Memory)
  // ==========================================================================

  private async saveCart(cart: Cart): Promise<void> {
    const key = createCartKey(cart.id)
    
    if (isRedisAvailable()) {
      // Save to Redis with 30-day expiry
      await redis.set(key, cart, { ex: 30 * 24 * 60 * 60 })
    } else {
      // Fallback to memory
      memoryStore.set(cart.id, cart)
    }
  }

  private async loadCart(cartId: string): Promise<Cart | null> {
    const key = createCartKey(cartId)
    
    if (isRedisAvailable()) {
      const cart = await redis.get<Cart>(key)
      if (cart) {
        return cart
      }
    }
    
    // Fallback to memory
    const cart = memoryStore.get(cartId)
    if (cart) {
    }
    return cart || null
  }

  private async deleteCart(cartId: string): Promise<void> {
    const key = createCartKey(cartId)
    
    if (isRedisAvailable()) {
      await redis.del(key)
    }
    
    memoryStore.delete(cartId)
  }

  // ==========================================================================
  // CART CREATION
  // ==========================================================================

  async createCart(customerId?: string, email?: string): Promise<Cart> {
    const cart: Cart = {
      id: `cart_${generateId(16)}`,
      customerId,
      email,
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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }
    
    await this.saveCart(cart)
    return cart
  }

  // ==========================================================================
  // CART RETRIEVAL
  // ==========================================================================

  async getCart(cartId: string): Promise<Cart | null> {
    const cart = await this.loadCart(cartId)
    
    if (!cart) return null
    
    // Check expiration
    if (new Date(cart.expiresAt) < new Date()) {
      await this.deleteCart(cartId)
      return null
    }
    
    return cart
  }

  // ==========================================================================
  // ADD ITEM WITH ATTACHMENT
  // ==========================================================================

  async addItem(
    cartId: string, 
    input: AddToCartInput,
    productInfo: {
      name: string
      price: number
      image?: string
      sku?: string
    }
  ): Promise<{ cart: Cart; item: CartItem }> {
    const cart = await this.getCart(cartId)
    if (!cart) throw new Error('Cart not found')

    // Calculate attachment price
    let attachmentPrice = 0
    let attachment: OrderAttachment | undefined
    
    if (input.attachment) {
      attachment = {
        ...input.attachment,
        price: getAttachmentPrice(input.attachment)
      }
      attachmentPrice = attachment.price
    }

    // Create cart item
    const item: CartItem = {
      id: `line_${generateId(12)}`,
      productId: input.productId || '',
      variantId: input.variantId,
      sku: productInfo.sku,
      name: productInfo.name,
      image: productInfo.image,
      unitPrice: productInfo.price + attachmentPrice,
      quantity: input.quantity,
      attachment,
      customMix: input.customMix,
      configuration: input.configuration,
      properties: input.properties,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Check if same product with same attachment already exists
    const existingIndex = cart.items.findIndex(existing => 
      existing.productId === item.productId &&
      this.attachmentsEqual(existing.attachment, item.attachment) &&
      this.mixesEqual(existing.customMix, item.customMix)
    )

    if (existingIndex >= 0) {
      // Update quantity
      cart.items[existingIndex].quantity += item.quantity
      cart.items[existingIndex].updatedAt = new Date().toISOString()
    } else {
      cart.items.push(item)
    }

    // Recalculate totals
    this.recalculateCart(cart)
    
    await this.saveCart(cart)
    
    return { cart, item }
  }

  // ==========================================================================
  // UPDATE ITEM
  // ==========================================================================

  async updateItem(
    cartId: string, 
    input: UpdateCartItemInput
  ): Promise<Cart> {
    const cart = await this.getCart(cartId)
    if (!cart) throw new Error('Cart not found')

    const itemIndex = cart.items.findIndex(item => item.id === input.lineId)
    if (itemIndex === -1) throw new Error('Item not found')

    if (input.quantity <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1)
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = input.quantity
      
      // Update attachment if provided
      if (input.attachment) {
        cart.items[itemIndex].attachment = input.attachment
        // Recalculate price with new attachment
        const basePrice = cart.items[itemIndex].unitPrice - (cart.items[itemIndex].attachment?.price || 0)
        cart.items[itemIndex].unitPrice = basePrice + input.attachment.price
      }
      
      cart.items[itemIndex].updatedAt = new Date().toISOString()
    }

    this.recalculateCart(cart)
    await this.saveCart(cart)
    
    return cart
  }

  // ==========================================================================
  // REMOVE ITEM
  // ==========================================================================

  async removeItem(cartId: string, lineId: string): Promise<Cart> {
    const cart = await this.getCart(cartId)
    if (!cart) throw new Error('Cart not found')

    cart.items = cart.items.filter(item => item.id !== lineId)
    
    this.recalculateCart(cart)
    await this.saveCart(cart)
    
    return cart
  }

  // ==========================================================================
  // UPDATE ATTACHMENT
  // ==========================================================================

  async updateAttachment(
    cartId: string,
    lineId: string,
    attachment: OrderAttachment
  ): Promise<Cart> {
    const cart = await this.getCart(cartId)
    if (!cart) throw new Error('Cart not found')

    const item = cart.items.find(item => item.id === lineId)
    if (!item) throw new Error('Item not found')

    // Calculate new attachment price
    const attachmentWithPrice = {
      ...attachment,
      price: getAttachmentPrice(attachment)
    }

    // Adjust unit price
    const basePrice = item.unitPrice - (item.attachment?.price || 0)
    item.unitPrice = basePrice + attachmentWithPrice.price
    item.attachment = attachmentWithPrice
    item.updatedAt = new Date().toISOString()

    this.recalculateCart(cart)
    await this.saveCart(cart)
    
    return cart
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  async validateCart(cartId: string): Promise<CartValidationResult> {
    const cart = await this.getCart(cartId)
    if (!cart) {
      return {
        valid: false,
        errors: [{ type: 'cart-invalid', message: 'Cart not found' }],
        warnings: []
      }
    }

    const errors: CartValidationResult['errors'] = []
    const warnings: CartValidationResult['warnings'] = []

    // Validate each item
    for (const item of cart.items) {
      // Validate attachment
      if (item.attachment) {
        if (item.attachment.type === 'cord' && item.attachment.cordId) {
          const cord = CORD_OPTIONS.find(c => c.id === item.attachment?.cordId)
          if (!cord) {
            errors.push({
              type: 'attachment-invalid',
              lineId: item.id,
              message: `Cord ${item.attachment.cordId} not found`
            })
          } else if (!cord.inStock) {
            errors.push({
              type: 'attachment-invalid',
              lineId: item.id,
              message: `Cord ${cord.name} is out of stock`
            })
          }
        }

        if (item.attachment.type === 'charm' && !item.attachment.isMysteryCharm && item.attachment.charmId) {
          const charm = CHARM_OPTIONS.find(c => c.id === item.attachment?.charmId)
          if (!charm) {
            errors.push({
              type: 'attachment-invalid',
              lineId: item.id,
              message: `Charm ${item.attachment.charmId} not found`
            })
          } else if (!charm.inStock) {
            errors.push({
              type: 'attachment-invalid',
              lineId: item.id,
              message: `Charm ${charm.name} is out of stock`
            })
          }
        }
      }

      // Validate custom mix
      if (item.customMix) {
        if (!item.customMix.oils || item.customMix.oils.length === 0) {
          errors.push({
            type: 'mix-invalid',
            lineId: item.id,
            message: 'Custom mix must contain at least one oil'
          })
        }
        if (item.customMix.safetyScore < 60) {
          errors.push({
            type: 'mix-invalid',
            lineId: item.id,
            message: 'Custom mix does not meet safety requirements'
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private attachmentsEqual(a?: OrderAttachment, b?: OrderAttachment): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    
    return a.type === b.type &&
           a.cordId === b.cordId &&
           a.charmId === b.charmId &&
           a.isMysteryCharm === b.isMysteryCharm
  }

  private mixesEqual(a?: OrderCustomMix, b?: OrderCustomMix): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    
    return a.recipeName === b.recipeName &&
           a.mode === b.mode &&
           a.oils.length === b.oils.length &&
           a.oils.every((oil, i) => 
             oil.oilId === b.oils[i].oilId && 
             (oil.ml === b.oils[i].ml || oil.drops === b.oils[i].drops)
           )
  }

  private recalculateCart(cart: Cart): void {
    let subtotal = 0
    let totalQuantity = 0
    
    for (const item of cart.items) {
      subtotal += item.unitPrice * item.quantity
      totalQuantity += item.quantity
    }
    
    const taxTotal = subtotal * 0.1 // 10% GST
    const total = subtotal + taxTotal + cart.shippingEstimate - cart.discountTotal
    
    cart.subtotal = Math.round(subtotal * 100) / 100
    cart.taxTotal = Math.round(taxTotal * 100) / 100
    cart.total = Math.round(total * 100) / 100
    cart.itemCount = cart.items.length
    cart.totalQuantity = totalQuantity
    cart.updatedAt = new Date().toISOString()
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const cartManager = CartManager.getInstance()
