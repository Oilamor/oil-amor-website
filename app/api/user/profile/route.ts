/**
 * User Profile API Route
 * Get and update user profile information
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers, orders, unlockedOils } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// GET /api/user/profile - Get current user profile
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const customerId = session.customerId
    
    // Fetch customer from database
    const customer = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1).then(rows => rows[0])
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    // Calculate collector level based on orders
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.customerId, customerId),
    })
    
    const userUnlockedOils = await db.query.unlockedOils.findMany({
      where: eq(unlockedOils.customerId, customerId),
    })
    
    // Calculate stats
    const totalOrders = userOrders.length
    const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const uniqueOils = new Set(userUnlockedOils.map(u => u.oilId)).size
    
    // Calculate collector level (1-7)
    const collectorLevel = Math.min(7, Math.floor(uniqueOils / 5) + 1)
    
    // Calculate XP
    const totalXP = (uniqueOils * 50) + (totalOrders * 25)
    const nextLevelXP = collectorLevel * 500
    
    // Calculate streak (simplified)
    const streakDays = customer.metadata?.firstPurchaseDate 
      ? Math.floor((Date.now() - new Date(customer.metadata.firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    return NextResponse.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: customer.firstName || customer.email.split('@')[0],
      memberSince: customer.createdAt.toISOString(),
      collectorLevel,
      totalXP,
      nextLevelXP,
      streakDays: Math.min(streakDays, 30),
      stats: {
        totalOrders,
        totalSpent,
        uniqueOils,
      }
    })
    
  } catch (error: any) {
    logger.error('Profile GET error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/user/profile - Create new user profile (Registration)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { email, firstName, lastName, password, acceptMarketing } = body
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    // Check if customer already exists
    const existing = await db.query.customers.findFirst({
      where: eq(customers.email, email.toLowerCase()),
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    
    // Generate unique customer ID
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Hash password before storing
    const passwordHash = await bcrypt.hash(password, 10)

    // Create customer in database
    const insertData = {
      id: customerId,
      email: email.toLowerCase(),
      firstName: firstName || null,
      lastName: lastName || null,
      metadata: {
        passwordHash,
        acceptMarketing: acceptMarketing || false,
        registeredAt: new Date().toISOString(),
      },
    }
    
    await db.insert(customers).values(insertData)
    
    
    return NextResponse.json({
      success: true,
      customer: {
        id: customerId,
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null,
      },
    }, { status: 201 })
    
  } catch (error: any) {
    logger.error('[Profile POST] Error', error instanceof Error ? error : new Error(String(error)))
    logger.error('[Profile POST] Error message', new Error(String(error?.message)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT /api/user/profile - Update user profile
// ============================================================================

export async function PUT(request: NextRequest) {
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
    const { firstName, lastName, phone } = body
    
    // Update customer in database
    const updated = await db.update(customers)
      .set({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning()
    
    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      customer: updated[0],
    })
    
  } catch (error) {
    logger.error('Profile PUT error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
