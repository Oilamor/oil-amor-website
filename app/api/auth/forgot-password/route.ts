import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email/resend'
import { logger } from '@/lib/logging/logger'

// POST /api/auth/forgot-password
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find customer
    const customer = await db.select().from(customers).where(eq(customers.email, email.toLowerCase())).limit(1).then(rows => rows[0])

    // Always return success to prevent email enumeration
    // But only send email if customer exists
    if (customer) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

      // Store token in customer metadata
      await db
        .update(customers)
        .set({
          metadata: {
            ...(customer.metadata || {}),
            resetToken,
            resetTokenExpiry: resetTokenExpiry.toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id))

      // Send reset email
      const resetUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      
      try {
        await sendPasswordResetEmail({
          to: customer.email,
          resetUrl,
          firstName: customer.firstName || undefined,
        })
      } catch (emailError) {
        logger.error('Failed to send reset email:', emailError instanceof Error ? emailError : new Error(String(emailError)))
        // Still return success to prevent email enumeration
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    })
  } catch (error) {
    logger.error('Forgot password error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
