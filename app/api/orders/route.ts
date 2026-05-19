/**
 * Orders API Route
 * Create and manage orders with cord/charm attachments
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, unlockedOils, customers } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getSession } from '@/lib/auth/session'
import { requireAdminAuth } from '@/lib/admin/auth'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

// ============================================================================
// POST /api/orders - Create new order
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      cartId, 
      shippingAddress, 
      paymentMethod, 
      customerId,
      customerEmail,
      items,
      ...orderData 
    } = body
    
    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart items are required' },
        { status: 400 }
      )
    }
    
    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      )
    }
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}-${nanoid(4).toUpperCase()}`
    
    // Calculate shipping cost
    const shippingCost = calculateShipping(items.length, shippingAddress.country)
    
    // Transform items and calculate totals
    const orderItems = items.map((item: any) => ({
      id: `line_${nanoid(8)}`,
      type: item.customMix ? 'custom-mix' : 'standard-oil',
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      name: item.name,
      description: item.description,
      image: item.image,
      unitPrice: Math.round(item.unitPrice * 100), // Convert to cents
      quantity: item.quantity,
      subtotal: Math.round(item.unitPrice * item.quantity * 100),
      taxAmount: Math.round(item.unitPrice * item.quantity * 0.1 * 100),
      total: Math.round(item.unitPrice * item.quantity * 1.1 * 100),
      attachment: item.attachment,
      customMix: item.customMix,
      unlocksOilId: item.oilId || item.unlocksOilId,
    }))
    
    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.subtotal, 0)
    const taxTotal = orderItems.reduce((sum: number, item: any) => sum + item.taxAmount, 0)
    const discountTotal = Math.round((orderData.discountTotal || 0) * 100)
    const total = subtotal + taxTotal + Math.round(shippingCost * 100) - discountTotal
    
    // Check for custom mix items
    const requiresBlending = orderItems.some((item: any) => item.customMix)
    
    // Check for refill eligibility
    const eligibleForReturns = orderItems.some((item: any) => 
      item.customMix || 
      item.name?.toLowerCase().includes('refill') ||
      item.size === '50ml' || 
      item.size === '100ml'
    )
    
    const now = new Date()
    
    // Create order in database
    const newOrder = await db.insert(orders).values({
      id: orderId,
      customerId: customerId || 'guest',
      customerEmail: customerEmail || shippingAddress.email || 'guest@oilamor.com',
      customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      isGuest: !customerId,
      
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: now.toISOString(),
        note: 'Order created',
      }],
      
      items: orderItems,
      
      subtotal,
      taxTotal,
      shippingTotal: Math.round(shippingCost * 100),
      discountTotal,
      storeCreditUsed: Math.round((orderData.storeCreditUsed || 0) * 100),
      giftCardUsed: Math.round((orderData.giftCardUsed || 0) * 100),
      total,
      
      currency: 'AUD',
      
      payment: {
        method: paymentMethod || 'credit-card',
        status: 'pending',
      },
      
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        email: shippingAddress.email,
        company: shippingAddress.company,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        province: shippingAddress.province,
        country: shippingAddress.country,
        zip: shippingAddress.zip,
        phone: shippingAddress.phone,
      },
      
      shipping: {
        carrier: 'auspost',
        service: 'standard',
        cost: shippingCost,
      },
      
      isGift: orderData.isGift || false,
      giftMessage: orderData.giftMessage,
      giftReceipt: orderData.giftReceipt || false,
      
      requiresBlending,
      blendingPriority: orderData.blendingPriority || 'normal',
      
      eligibleForReturns,
      returnCreditsEarned: 0,
      returnCreditsUsed: 0,
      
      customerNote: orderData.customerNote,
      internalNote: undefined,
      
      createdAt: now,
      updatedAt: now,
    }).returning()
    
    // Create unlocked oils records for each oil in the order
    const unlockedOilRecords = []
    for (const item of orderItems) {
      const oilId = item.unlocksOilId
      if (oilId && customerId && customerId !== 'guest') {
        // Check if already unlocked
        const existing = await db.query.unlockedOils.findFirst({
          where: eq(unlockedOils.oilId, oilId),
        })
        
        if (!existing) {
          const unlockRecord = await db.insert(unlockedOils).values({
            id: `unlock_${nanoid(8)}`,
            customerId,
            oilId,
            unlockedAt: now,
            unlockedBy: orderId,
            type: item.customMix?.mode === 'carrier' ? 'enhanced' : 'pure',
            createdAt: now,
          }).returning()
          
          unlockedOilRecords.push(unlockRecord[0])
        } else if (existing.type === 'pure' && item.customMix?.mode === 'carrier') {
          // Upgrade to enhanced
          await db.update(unlockedOils)
            .set({ type: 'enhanced' })
            .where(eq(unlockedOils.id, existing.id))
        }
      }
    }
    
    // Update customer metadata if needed
    if (customerId && customerId !== 'guest') {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      })
      
      if (customer && !customer.metadata?.firstPurchaseDate) {
        await db.update(customers)
          .set({
            metadata: {
              ...customer.metadata,
              firstPurchaseDate: now.toISOString(),
            },
            updatedAt: now,
          })
          .where(eq(customers.id, customerId))
      }
    }
    
    return NextResponse.json({ 
      order: {
        id: orderId,
        total: total / 100,
        status: 'pending',
      },
      unlockedOils: unlockedOilRecords.length,
      message: 'Order created successfully',
      nextStep: 'payment',
    }, { status: 201 })
    
  } catch (error) {
    logger.error('Order creation error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/orders - Get orders (admin or customer)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const orderId = searchParams.get('orderId')
    
    // Check customer session first
    const session = await getSession()
    const isLoggedIn = session.isLoggedIn && session.customerId
    
    if (orderId) {
      // Return specific order
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      })
      
      if (!order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      // Authorization: allow if the order belongs to the logged-in customer,
      // or if an admin is requesting it
      if (isLoggedIn && order.customerId === session.customerId) {
        return NextResponse.json({ order })
      }
      
      // Check admin auth
      const adminAuthError = await requireAdminAuth(request)
      if (!adminAuthError) {
        return NextResponse.json({ order })
      }
      
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    if (customerId) {
      // Authorization: customers can only view their own orders
      if (isLoggedIn && session.customerId === customerId) {
        const userOrders = await db.query.orders.findMany({
          where: eq(orders.customerId, customerId),
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        })
        
        return NextResponse.json({ 
          orders: userOrders,
          total: userOrders.length,
        })
      }
      
      // Check admin auth
      const adminAuthError = await requireAdminAuth(request)
      if (!adminAuthError) {
        const userOrders = await db.query.orders.findMany({
          where: eq(orders.customerId, customerId),
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        })
        
        return NextResponse.json({ 
          orders: userOrders,
          total: userOrders.length,
        })
      }
      
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // No params provided — require admin auth
    const adminAuthError = await requireAdminAuth(request)
    if (adminAuthError) return adminAuthError
    
    const allOrders = await db.query.orders.findMany({
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: 100,
    })
    
    return NextResponse.json({ 
      orders: allOrders,
      total: allOrders.length,
    })
    
  } catch (error) {
    logger.error('Order GET error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateShipping(quantity: number, country: string): number {
  // Domestic (Australia)
  if (country === 'AU') {
    if (quantity === 1) return 10
    if (quantity <= 3) return 15
    return 0 // Free shipping for 4+ items
  }
  
  // International
  if (quantity === 1) return 25
  if (quantity <= 3) return 35
  return 50
}
