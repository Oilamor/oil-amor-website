/**
 * Login API
 * Authenticates user and returns customer data
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/logging/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    // Find customer by email
    const customer = await db.select().from(customers).where(eq(customers.email, email.toLowerCase())).limit(1).then(rows => rows[0])
    
    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Verify password (stored in metadata)
    const metadata = customer.metadata || {}
    const storedPasswordHash = metadata.passwordHash
    
    if (!storedPasswordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Reject pre-bcrypt plain-text passwords (nuclear reset for pre-launch users)
    if (!storedPasswordHash.startsWith('$2')) {
      return NextResponse.json(
        { error: 'Password security upgraded. Please use Forgot Password to reset your password.', code: 'PASSWORD_UPGRADE_REQUIRED' },
        { status: 401 }
      )
    }
    
    const isValid = await bcrypt.compare(password, storedPasswordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Create session
    const session = await getSession()
    session.customerId = customer.id
    session.email = customer.email
    session.firstName = customer.firstName || undefined
    session.lastName = customer.lastName || undefined
    session.isLoggedIn = true
    await session.save()

    // Return customer data (exclude password)
    return NextResponse.json({
      success: true,
      user: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customer.firstName || customer.email.split('@')[0],
        memberSince: customer.createdAt.toISOString(),
      },
    })
    
  } catch (error: any) {
    logger.error('Login error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
