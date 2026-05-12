/**
 * Admin Inventory API
 * CRUD operations for inventory items
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { inventoryItems } from '@/lib/db/schema-refill'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// ============================================================================
// GET /api/admin/inventory - List all inventory items
// ============================================================================

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = db.select().from(inventoryItems)

    if (category) {
      query = query.where(eq(inventoryItems.category, category)) as any
    }

    const items = await query.orderBy(inventoryItems.category, inventoryItems.name)

    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/admin/inventory - Update inventory item
// ============================================================================

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, quantity, reservedQuantity, reorderPoint } = body

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const updates: any = { updatedAt: new Date() }
    if (typeof quantity === 'number') updates.quantity = quantity
    if (typeof reservedQuantity === 'number') updates.reservedQuantity = reservedQuantity
    if (typeof reorderPoint === 'number') updates.reorderPoint = reorderPoint

    const result = await db
      .update(inventoryItems)
      .set(updates)
      .where(eq(inventoryItems.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ item: result[0] })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update inventory', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/admin/inventory - Create inventory item
// ============================================================================

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { sku, name, category, quantity, reservedQuantity, reorderPoint } = body

    if (!sku || !name || !category) {
      return NextResponse.json(
        { error: 'SKU, name, and category are required' },
        { status: 400 }
      )
    }

    const result = await db
      .insert(inventoryItems)
      .values({
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        sku,
        name,
        category,
        quantity: quantity || 0,
        reservedQuantity: reservedQuantity || 0,
        reorderPoint: reorderPoint || 10,
      })
      .returning()

    return NextResponse.json({ item: result[0] }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create inventory item', details: error.message },
      { status: 500 }
    )
  }
}
