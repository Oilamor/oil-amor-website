import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { stripe } from '@/lib/stripe/config'
import { initiateRefillOrder } from '@/lib/refill/return-workflow'
import { useCredits as applyCredits, REFILL_CREDIT_AMOUNT } from '@/lib/refill/credits'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn || !session.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bottleId, useCredits, customerAddress } = body

    if (!bottleId || !customerAddress) {
      return NextResponse.json(
        { error: 'bottleId and customerAddress are required' },
        { status: 400 }
      )
    }

    const customerId = session.customerId

    // Create refill order and generate return label
    const refillResult = await initiateRefillOrder(customerId, bottleId, {
      customerAddress,
      emailNotification: true,
    })

    const creditDollars = REFILL_CREDIT_AMOUNT / 100
    const pricing = {
      standardPrice: 35,
      creditApplied: useCredits ? creditDollars : 0,
      finalPrice: useCredits ? 35 - creditDollars : 35,
    }

    // Apply credits if requested
    if (useCredits) {
      try {
        await applyCredits(customerId, REFILL_CREDIT_AMOUNT, refillResult.orderId)
      } catch (creditErr: any) {
        // If credit fails, continue with full price
        pricing.creditApplied = 0
        pricing.finalPrice = 35
      }
    }

    // Create Stripe Checkout Session for refill payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.email,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `Forever Bottle Refill`,
              description: `Refill for bottle ${bottleId}`,
              metadata: {
                refillOrderId: refillResult.orderId,
                bottleId,
                customerId,
              },
            },
            unit_amount: pricing.finalPrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?refill_success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?refill_cancel=1`,
      metadata: {
        orderId: refillResult.orderId,
        refillOrderId: refillResult.orderId,
        bottleId,
        customerId,
        type: 'refill',
      },
    })

    return NextResponse.json({
      orderId: refillResult.orderId,
      trackingNumber: refillResult.returnLabel.trackingNumber,
      labelUrl: refillResult.returnLabel.labelUrl,
      finalPrice: pricing.finalPrice,
      creditUsed: pricing.creditApplied,
      checkoutUrl: checkoutSession.url,
    })
  } catch (error: any) {
    logger.error('Refill order error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error.message || 'Failed to create refill order' },
      { status: 500 }
    )
  }
}
