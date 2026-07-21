/**
 * Oil Amor Cart Manager (unified, Redis-backed)
 *
 * THE single cart manager — backs both /api/cart and /api/cart/merge.
 * Consolidated 2026-07-21 from cart-manager-redis.ts (main path) and
 * cart-manager.ts (merge path, deleted). Redis persistence via
 * lib/redis/client with an in-memory Map fallback when Redis is unavailable.
 *
 * Consolidation notes:
 *  - Redis TTL differs by cart ownership (ported from the legacy merge-path
 *    manager): 30 days for guest carts, 90 days for customer carts.
 *  - All money math is done in integer cents; dollar totals are exact.
 *  - Corrupt payloads in Redis are validated on read, logged, and discarded
 *    (treated as a missing cart) instead of being returned as-is.
 */

import { Cart, CartItem, AddToCartInput, UpdateCartItemInput, CartValidationResult } from './types'
import { OrderAttachment, OrderCustomMix } from '@/lib/db/schema/orders'
import { CORD_OPTIONS, CHARM_OPTIONS, getAttachmentPrice } from '@/lib/products/attachment-options'
import { redis, createCartKey } from '@/lib/redis/client'
import { logger } from '@/lib/logging/logger'

// Simple ID generator
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

/** Redis TTL in seconds — customer carts live longer than guest carts. */
const CART_TTL_SECONDS = {
  anonymous: 30 * 24 * 60 * 60, // 30 days
  authenticated: 90 * 24 * 60 * 60, // 90 days
} as const

const CART_LIMITS = {
  maxQuantityPerItem: 99,
  maxCartValue: 10000, // $10,000 AUD
} as const

// In-memory fallback for development / Redis outages
const memoryStore = new Map<string, Cart>()

// Check if Redis is available
const isRedisAvailable = (): boolean => {
  return redis.isHealthy()
}

/**
 * Minimal runtime shape check for carts read back from storage.
 * Garbage JSON (or payloads from an incompatible writer) must not be
 * treated as a live cart.
 */
function isValidCartShape(value: unknown): value is Cart {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const cart = value as Partial<Cart>
  return (
    typeof cart.id === 'string' &&
    Array.isArray(cart.items) &&
    typeof cart.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(cart.expiresAt))
  )
}

// ============================================================================
// CART MANAGER
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

  private ttlFor(cart: Cart): number {
    return cart.customerId ? CART_TTL_SECONDS.authenticated : CART_TTL_SECONDS.anonymous
  }

  private async saveCart(cart: Cart): Promise<void> {
    const key = createCartKey(cart.id)

    if (isRedisAvailable()) {
      await redis.set(key, cart, { ex: this.ttlFor(cart) })
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
    const ttl = customerId ? CART_TTL_SECONDS.authenticated : CART_TTL_SECONDS.anonymous
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
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
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

    // Corrupt payload in storage — discard it and behave as if the cart
    // does not exist (callers create a fresh one).
    if (!isValidCartShape(cart)) {
      logger.warn('Corrupt cart payload in storage; discarding', { cartId: cartId.slice(0, 8) })
      await this.deleteCart(cartId)
      return null
    }

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
        // Recompute the attachment price server-side (same source as
        // updateAttachment) — a client-supplied price is never trusted.
        const attachmentWithPrice: OrderAttachment = {
          ...input.attachment,
          price: getAttachmentPrice(input.attachment),
        }
        // Reprice against the OLD attachment's price BEFORE swapping.
        const basePrice = cart.items[itemIndex].unitPrice - (cart.items[itemIndex].attachment?.price || 0)
        cart.items[itemIndex].attachment = attachmentWithPrice
        cart.items[itemIndex].unitPrice = basePrice + attachmentWithPrice.price
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
  // MERGE CARTS (Guest → Authenticated)
  // ==========================================================================

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

    // Merge items. The line-identity key includes the customMix/attachment
    // discriminator — two different blends on the same variant must NOT
    // collapse into one line.
    for (const sourceItem of source.items) {
      const existingIndex = target.items.findIndex(item => this.isSameLine(item, sourceItem))

      if (existingIndex >= 0) {
        // Combine quantities, capped at the per-item limit.
        target.items[existingIndex].quantity = Math.min(
          CART_LIMITS.maxQuantityPerItem,
          target.items[existingIndex].quantity + sourceItem.quantity
        )
        target.items[existingIndex].updatedAt = now
      } else {
        // Add as new item with a fresh line id
        target.items.push({
          ...sourceItem,
          quantity: Math.min(CART_LIMITS.maxQuantityPerItem, sourceItem.quantity),
          id: `line_${generateId(12)}`,
          addedAt: now,
          updatedAt: now,
        })
      }
    }

    this.recalculateCart(target)
    await this.saveCart(target)

    // Delete source cart
    await this.deleteCart(sourceCartId)

    logger.info('Carts merged', {
      targetCart: targetCartId.slice(0, 8),
      sourceCart: sourceCartId.slice(0, 8),
      itemsMerged: source.items.length,
    })

    return target
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

    // Cart-wide value limit
    if (cart.total > CART_LIMITS.maxCartValue) {
      errors.push({
        type: 'limit_exceeded',
        lineId: '',
        message: `Cart value cannot exceed $${CART_LIMITS.maxCartValue}`,
      })
    }

    // Validate each item
    for (const item of cart.items) {
      // Per-item quantity limit
      if (item.quantity > CART_LIMITS.maxQuantityPerItem) {
        errors.push({
          type: 'limit_exceeded',
          lineId: item.id,
          message: `Maximum quantity is ${CART_LIMITS.maxQuantityPerItem}`,
        })
      }

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

  /** Line identity for merging: variant + configuration + attachment + mix. */
  private isSameLine(a: CartItem, b: CartItem): boolean {
    return a.variantId === b.variantId &&
           JSON.stringify(a.configuration) === JSON.stringify(b.configuration) &&
           this.attachmentsEqual(a.attachment, b.attachment) &&
           this.mixesEqual(a.customMix, b.customMix)
  }

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
    // Money is computed in integer cents so totals never carry IEEE-754
    // artifacts (e.g. 228.89000000000001); dollar values are exact.
    let subtotalCents = 0
    let totalQuantity = 0

    for (const item of cart.items) {
      subtotalCents += Math.round(item.unitPrice * 100) * item.quantity
      totalQuantity += item.quantity
    }

    // An empty cart ships for $0 — there is nothing to ship.
    if (cart.items.length === 0) {
      cart.shippingEstimate = 0
    }

    const taxCents = Math.round(subtotalCents * 0.1) // 10% GST
    const shippingCents = Math.round((cart.shippingEstimate || 0) * 100)
    const discountCents = Math.round((cart.discountTotal || 0) * 100)
    const totalCents = Math.max(0, subtotalCents + taxCents + shippingCents - discountCents)

    cart.subtotal = subtotalCents / 100
    cart.taxTotal = taxCents / 100
    cart.total = totalCents / 100
    cart.itemCount = cart.items.length
    cart.totalQuantity = totalQuantity
    cart.updatedAt = new Date().toISOString()

    // Keep the legacy summary mirror consistent when present (carts written
    // by the pre-consolidation merge-path manager carry one, and use-cart
    // prefers summary.total over total).
    if (cart.summary) {
      cart.summary = {
        subtotal: cart.subtotal,
        totalTax: cart.taxTotal,
        totalShipping: cart.shippingEstimate,
        totalDiscounts: cart.discountTotal,
        total: cart.total,
        currency: cart.currency || 'AUD',
        itemCount: totalQuantity,
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const cartManager = CartManager.getInstance()
