/**
 * Link Guest Orders API
 * Links guest orders to a user account when they sign up or log in
 * Also unlocks oils from linked orders for refill eligibility
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, unlockedOils, customers } from '@/lib/db/schema-refill'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const customerId = session.customerId

    const body = await request.json()
    const { email } = body
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()
    
    // SECURITY: Prevent IDOR — verify the user can only link their own email
    if (normalizedEmail !== session.email?.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Forbidden: You can only link orders associated with your own email' },
        { status: 403 }
      )
    }
    const now = new Date()
    
    // Find all guest orders with this email
    const guestOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.customerEmail, normalizedEmail),
        eq(orders.isGuest, true)
      ),
    })
    
    
    if (guestOrders.length === 0) {
      return NextResponse.json({
        linkedCount: 0,
        unlockedCount: 0,
        message: 'No guest orders found for this email',
      })
    }
    
    // Link orders to the user account and unlock oils
    const linkedOrderIds: string[] = []
    const unlockedOilIds: string[] = []
    
    for (const order of guestOrders) {
      // Link the order
      await db.update(orders)
        .set({
          customerId: customerId,
          isGuest: false,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id))
      
      linkedOrderIds.push(order.id)
      
      // Unlock oils from this order for refill eligibility
      const orderItems = order.items as any[] || []
      for (const item of orderItems) {
        const oilId = item.metadata?.oilId || extractOilIdFromProduct(item)
        
        if (oilId) {
          // Check if already unlocked
          const existing = await db.query.unlockedOils.findFirst({
            where: and(
              eq(unlockedOils.customerId, customerId),
              eq(unlockedOils.oilId, oilId)
            ),
          })
          
          if (!existing) {
            await db.insert(unlockedOils).values({
              id: `unlock_${nanoid(8)}`,
              customerId,
              oilId,
              unlockedAt: now,
              unlockedBy: order.id,
              type: item.metadata?.type === 'carrier' ? 'enhanced' : 'pure',
              createdAt: now,
            })
            unlockedOilIds.push(oilId)
          }
        }
      }
    }
    
    // Update customer's metadata with linked orders info
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    })
    
    if (customer) {
      const currentMetadata = customer.metadata || {}
      await db.update(customers)
        .set({
          metadata: {
            ...currentMetadata,
            linkedOrdersCount: (currentMetadata.linkedOrdersCount || 0) + linkedOrderIds.length,
            lastLinkedAt: now.toISOString(),
          },
          updatedAt: now,
        })
        .where(eq(customers.id, customerId))
    }
    
    // Linked successfully
    
    return NextResponse.json({
      linkedCount: linkedOrderIds.length,
      unlockedCount: unlockedOilIds.length,
      linkedOrderIds,
      unlockedOilIds,
      message: `Successfully linked ${linkedOrderIds.length} orders and unlocked ${unlockedOilIds.length} oils for refill`,
    })
    
  } catch (error: any) {
    logger.error('[LinkOrders] Error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to link orders' },
      { status: 500 }
    )
  }
}

// Helper to extract oilId from product data
function extractOilIdFromProduct(item: any): string | null {
  // Try to extract from name or other metadata
  const name = item.name?.toLowerCase() || ''
  
  // Common oil ID patterns
  if (name.includes('lavender')) return 'lavender'
  if (name.includes('eucalyptus')) return 'eucalyptus'
  if (name.includes('peppermint')) return 'peppermint'
  if (name.includes('tea tree')) return 'tea-tree'
  if (name.includes('lemon')) return 'lemon'
  if (name.includes('frankincense')) return 'frankincense'
  if (name.includes('geranium')) return 'geranium'
  
  // Return null if can't determine
  return null
}
