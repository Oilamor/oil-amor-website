/**
 * Contact Form API
 * Handles contact form submissions with validation and email sending
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logging/logger'
import { checkApiRateLimit, createRateLimitHeaders } from '@/lib/redis/rate-limiter'
import { isValidEmail } from '@/lib/security/security-utils'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.enum(['general', 'order', 'product', 'wholesale', 'press', 'other']),
  message: z.string().min(10).max(2000),
})

// ============================================================================
// HTML ESCAPE HELPER
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ============================================================================
// EMAIL SERVICE (Resend)
// ============================================================================

async function sendContactEmail(data: z.infer<typeof contactSchema>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not configured, logging to console only')
    console.log('Contact form submission:', { name: data.name, email: data.email, subject: data.subject })
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Oil Amor Contact <hello@oilamor.com>',
        to: 'hello@oilamor.com',
        reply_to: data.email,
        subject: `[${data.subject.toUpperCase()}] Message from ${escapeHtml(data.name)}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>
        `,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }
  } catch (error) {
    logger.error('Failed to send contact email', error as Error)
    throw error
  }
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for contact forms
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = await checkApiRateLimit(ip, 'auth') // Use auth limits (5/min)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }
    
    // Parse and validate body
    const body = await request.json()
    const validation = contactSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid form data',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }
    
    // Additional email validation
    if (!isValidEmail(validation.data.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    // Send email
    await sendContactEmail(validation.data)
    
    logger.info('Contact form submitted', { 
      email: validation.data.email,
      subject: validation.data.subject,
    })
    
    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      {
        headers: createRateLimitHeaders(rateLimit),
      }
    )
    
  } catch (error) {
    logger.error('Contact form error', error as Error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        message: 'Please try again later or email us directly at hello@oilamor.com',
      },
      { status: 500 }
    )
  }
}
