/**
 * Cart API Route
 * Handles cart operations with Redis persistence
 */

import { NextRequest, NextResponse } from 'next/server'
import { cartManager } from '@/lib/cart/cart-manager-redis'
import { getOilSafetyProfile } from '@/lib/safety'
import { STOCKED_OIL_IDS } from '@/lib/inventory/client'

// ============================================================================
// INVENTORY VALIDATION
// ============================================================================

function extractOilIdsFromItem(body: any): string[] {
  const oilIds: string[] = []
  const blendOils = body.customMix?.oils || body.configuration?.oils || []

  if (blendOils.length > 0) {
    for (const oil of blendOils) {
      const id = oil.oilId || extractOilIdFromName(oil.name || oil.oilName)
      if (id) oilIds.push(id)
    }
  } else {
    const id = extractOilIdFromName(body.product?.name)
    if (id) oilIds.push(id)
  }

  return oilIds
}

function extractOilIdFromName(name?: string): string | undefined {
  if (!name) return undefined
  const lower = name.toLowerCase()
  if (lower.includes('lavender')) return 'lavender'
  if (lower.includes('tea tree')) return 'tea-tree'
  if (lower.includes('eucalyptus')) return 'eucalyptus'
  if (lower.includes('lemongrass')) return 'lemongrass'
  if (lower.includes('clove')) return 'clove-bud'
  if (lower.includes('jojoba')) return 'jojoba'
  return undefined
}

/**
 * Validate that adding this item won't oversell in-stock inventory.
 * Returns { valid: true } for preorders or if within limits.
 */
function validateCartItemStock(
  oilIds: string[],
  quantity: number,
  existingCartItems: any[]
): { valid: boolean; error?: string } {
  const stockedOilIds = oilIds.filter(id => STOCKED_OIL_IDS.has(id))
  if (stockedOilIds.length === 0) {
    return { valid: true } // Preorder — no stock limit
  }

  // Per-item limit for in-stock oils
  const MAX_PER_ITEM = 20
  if (quantity > MAX_PER_ITEM) {
    return {
      valid: false,
      error: `For in-stock oils, maximum ${MAX_PER_ITEM} units per item. Contact us for wholesale orders.`,
    }
  }

  // Check total quantity of this oil already in cart
  for (const oilId of stockedOilIds) {
    const existingQty = existingCartItems.reduce((sum: number, item: any) => {
      const itemOilIds = extractOilIdsFromItem({
        product: item,
        customMix: item.customMix,
        configuration: item.configuration,
      })
      if (itemOilIds.includes(oilId)) {
        return sum + (item.quantity || 1)
      }
      return sum
    }, 0)

    const MAX_TOTAL_PER_OIL = 50
    if (existingQty + quantity > MAX_TOTAL_PER_OIL) {
      return {
        valid: false,
        error: `Maximum ${MAX_TOTAL_PER_OIL} units of this in-stock oil per order. Contact us for wholesale orders.`,
      }
    }
  }

  return { valid: true }
}

export const dynamic = 'force-dynamic'

// ============================================================================
// GET /api/cart - Get or create cart
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cartId = searchParams.get('cartId')
    
    // If no cartId provided, create a new cart
    if (!cartId) {
      const cart = await cartManager.createCart()
      return NextResponse.json({ cart }, { status: 201 })
    }
    
    // Try to get existing cart
    let cart = await cartManager.getCart(cartId)
    
    // If cart not found or expired, create a new one
    if (!cart) {
      cart = await cartManager.createCart()
      return NextResponse.json({ cart }, { status: 201 })
    }
    
    return NextResponse.json({ cart })
  } catch (error) {
    console.error('[Cart API] GET error:', error)
    // Always return a valid cart, even on error
    try {
      const cart = await cartManager.createCart()
      return NextResponse.json({ cart, warning: 'Created new cart due to error' }, { status: 201 })
    } catch {
      // Ultimate fallback - return empty cart object
      return NextResponse.json({ 
        cart: {
          id: `cart_fallback_${Date.now()}`,
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
        }
      })
    }
  }
}

// ============================================================================
// POST /api/cart - Cart operations
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    
    const { action } = body
    
    // ==========================================================================
    // CREATE CART
    // ==========================================================================
    if (action === 'create') {
      const { customerId, email } = body
      const cart = await cartManager.createCart(customerId, email)
      return NextResponse.json({ cart }, { status: 201 })
    }
    
    // ==========================================================================
    // ADD ITEM
    // ==========================================================================
    if (action === 'add') {
      let { cartId, product, quantity, attachment, customMix, configuration, properties } = body
      
      if (!product) {
        return NextResponse.json({ error: 'Product is required' }, { status: 400 })
      }
      
      // Get or create cart
      let cart = cartId ? await cartManager.getCart(cartId) : null
      if (!cart) {
        cart = await cartManager.createCart()
        cartId = cart.id
      }
      
      // Validate attachment
      if (attachment) {
        const validation = validateAttachment(attachment)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
      }
      
      // Validate custom mix
      if (customMix) {
        const validation = validateCustomMix(customMix)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
      }

      // Validate inventory for in-stock oils
      const oilIds = extractOilIdsFromItem({ product, customMix, configuration })
      const stockValidation = validateCartItemStock(oilIds, quantity || 1, cart.items || [])
      if (!stockValidation.valid) {
        return NextResponse.json({ error: stockValidation.error }, { status: 400 })
      }
      
      try {
        const result = await cartManager.addItem(
          cartId,
          {
            productId: product.id,
            variantId: product.variantId,
            quantity: quantity || 1,
            attachment,
            customMix,
            configuration,
            properties,
          },
          {
            name: product.name,
            price: product.price,
            image: product.image,
            sku: product.sku,
          }
        )
        
        return NextResponse.json({ cart: result.cart, item: result.item })
      } catch (error) {
        console.error('[Cart API] Add item error:', error)
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
      }
    }
    
    // ==========================================================================
    // UPDATE ITEM
    // ==========================================================================
    if (action === 'update') {
      const { cartId, lineId, quantity, attachment } = body
      
      if (!cartId || !lineId) {
        return NextResponse.json({ error: 'Cart ID and line ID required' }, { status: 400 })
      }
      
      // Get or create cart
      let cart = await cartManager.getCart(cartId)
      if (!cart) {
        cart = await cartManager.createCart()
        return NextResponse.json({ cart, warning: 'Created new cart' })
      }
      
      try {
        cart = await cartManager.updateItem(cartId, { lineId, quantity, attachment })
        return NextResponse.json({ cart })
      } catch (error) {
        console.error('[Cart API] Update error:', error)
        return NextResponse.json({ cart, warning: 'Update failed' })
      }
    }
    
    // ==========================================================================
    // REMOVE ITEM - BULLETPROOF VERSION
    // ==========================================================================
    if (action === 'remove') {
      const { cartId, lineId } = body
      
      
      if (!cartId || !lineId) {
        return NextResponse.json({ error: 'Cart ID and line ID required' }, { status: 400 })
      }
      
      // Get cart (may be null if not found)
      const existingCart = await cartManager.getCart(cartId)
      
      if (!existingCart) {
        // Cart doesn't exist - create new empty one
        const cart = await cartManager.createCart()
        return NextResponse.json({ cart, warning: 'Created new cart (old one expired)' })
      }
      
      // Cart exists - try to remove item
      try {
        const cart = await cartManager.removeItem(cartId, lineId)
        return NextResponse.json({ cart })
      } catch (removeError) {
        // Remove failed - return cart as-is
        console.error('[Cart API] Remove failed:', removeError)
        return NextResponse.json({ cart: existingCart, warning: 'Item may not exist' })
      }
    }
    
    // ==========================================================================
    // UPDATE ATTACHMENT
    // ==========================================================================
    if (action === 'update-attachment') {
      const { cartId, lineId, attachment } = body
      
      if (!cartId || !lineId || !attachment) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
      
      const validation = validateAttachment(attachment)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      
      let cart = await cartManager.getCart(cartId)
      if (!cart) {
        cart = await cartManager.createCart()
        return NextResponse.json({ cart, warning: 'Created new cart' })
      }
      
      try {
        cart = await cartManager.updateAttachment(cartId, lineId, attachment)
        return NextResponse.json({ cart })
      } catch (error) {
        return NextResponse.json({ cart, warning: 'Update failed' })
      }
    }
    
    // Invalid action
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('[Cart API] Unhandled error:', error)
    // Ultimate fallback - always return a valid cart
    try {
      const cart = await cartManager.createCart()
      return NextResponse.json({ cart, warning: 'Created new cart due to error' })
    } catch {
      return NextResponse.json({
        cart: {
          id: `cart_emergency_${Date.now()}`,
          items: [],
          subtotal: 0,
          total: 0,
          currency: 'AUD',
          itemCount: 0,
          totalQuantity: 0,
        }
      })
    }
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateAttachment(attachment: any): { valid: boolean; error?: string } {
  if (!attachment.type) {
    return { valid: false, error: 'Attachment type is required' }
  }
  
  if (attachment.type === 'cord' && !attachment.cordId) {
    return { valid: false, error: 'Cord ID is required' }
  }
  
  if (attachment.type === 'charm' && !attachment.isMysteryCharm && !attachment.charmId) {
    return { valid: false, error: 'Charm ID or mystery selection is required' }
  }
  
  return { valid: true }
}

function validateCustomMix(mix: any): { valid: boolean; error?: string } {
  if (!mix.recipeName) {
    return { valid: false, error: 'Mix name is required' }
  }
  
  if (!mix.oils || !Array.isArray(mix.oils) || mix.oils.length === 0) {
    return { valid: false, error: 'Mix must contain at least one oil' }
  }
  
  if (mix.oils.length > 5) {
    return { valid: false, error: 'Mix cannot contain more than 5 oils' }
  }
  
  for (const oil of mix.oils) {
    if (!oil.oilId) {
      return { valid: false, error: 'Oil ID is required for each oil' }
    }
    const hasValidDrops = oil.drops && oil.drops >= 1
    const hasValidMl = oil.ml && oil.ml > 0
    if (!hasValidDrops && !hasValidMl) {
      return { valid: false, error: 'Valid drop count or ml required' }
    }
    
    const profile = getOilSafetyProfile(oil.oilId)
    if (!profile) {
      // Do not block cart addition for missing safety profiles
    }
  }
  
  if (mix.mode === 'carrier') {
    if (mix.carrierRatio === undefined || mix.carrierRatio < 5 || mix.carrierRatio > 75) {
      return { valid: false, error: 'Carrier ratio must be between 5% and 75%' }
    }
  }
  
  return { valid: true }
}
