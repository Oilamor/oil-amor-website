import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { stripe } from '@/lib/stripe/config'
import { initiateRefillOrder, updateRefillOrderPricing } from '@/lib/refill/return-workflow'
import { useCredits as applyCredits, REFILL_CREDIT_AMOUNT } from '@/lib/refill/credits'
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

    // Create refill order and generate return label. The standard price is
    // computed by the cost-based pricing engine at initiation (integer cents)
    // — 2026-07-21: algorithm-driven refill pricing, NO flat fee.
    const refillResult = await initiateRefillOrder(customerId, bottleId, {
      customerAddress,
      emailNotification: true,
    })

    const standardCents = refillResult.pricing.standardPrice

    // Apply credits if requested (REFILL_CREDIT_AMOUNT is integer cents)
    let creditCents = 0
    if (useCredits) {
      try {
        await applyCredits(customerId, REFILL_CREDIT_AMOUNT, refillResult.orderId)
        creditCents = REFILL_CREDIT_AMOUNT
      } catch (creditErr) {
        // If credit fails, continue with full price
        logger.warn('Credit application failed, charging full refill price', {
          customerId,
          orderId: refillResult.orderId,
          error: creditErr instanceof Error ? creditErr.message : String(creditErr),
        })
      }
    }

    const finalPriceCents = standardCents - creditCents

    // Persist the credit decision so the stored pricing matches what is charged
    await updateRefillOrderPricing(refillResult.orderId, {
      standardPrice: standardCents,
      creditApplied: creditCents,
      finalPrice: finalPriceCents,
    })

    // Create Stripe Checkout Session for refill payment
    // unit_amount is ALREADY in cents — do not multiply by 100
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
            unit_amount: finalPriceCents,
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
        // Cents of store credit debited at checkout creation — the webhook
        // restores exactly this amount if the checkout is abandoned
        creditUsed: String(creditCents),
      },
    })

    return NextResponse.json({
      orderId: refillResult.orderId,
      trackingNumber: refillResult.returnLabel.trackingNumber,
      labelUrl: refillResult.returnLabel.labelUrl,
      // Display boundary: the account/refill UI expects dollars
      finalPrice: finalPriceCents / 100,
      creditUsed: creditCents / 100,
      checkoutUrl: checkoutSession.url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Refill order error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: message || 'Failed to create refill order' },
      { status: 500 }
    )
  }
}
