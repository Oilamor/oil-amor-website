import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema-refill'
import { eq, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logging/logger'

// POST /api/auth/reset-password
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Find customer with matching reset token (secure JSONB query)
    const customer = await db.select().from(customers).where(sql`${customers.metadata}->>'resetToken' = ${token}`).limit(1).then(rows => rows[0])

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Check token expiry
    const tokenExpiry = customer.metadata?.resetTokenExpiry
    if (!tokenExpiry || new Date(tokenExpiry) < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    // Hash new password and clear token
    const passwordHash = await bcrypt.hash(password, 10)
    await db
      .update(customers)
      .set({
        metadata: {
          ...(customer.metadata || {}),
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id))

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    logger.error('Reset password error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
