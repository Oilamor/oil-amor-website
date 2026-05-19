/**
 * Shipping Rates API
 * Returns live Australia Post shipping rates for checkout
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBestShippingRate, calculateParcelWeight } from '@/lib/shipping/auspost'
import { SHIPPING_RATES } from '@/lib/stripe/config'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export interface ShippingRateRequest {
  postalCode: string
  country?: string
  itemCount: number
  hasCustomBlends: boolean
  subtotal: number
  isExpress?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ShippingRateRequest = await request.json()
    
    if (!body.postalCode) {
      return NextResponse.json(
        { error: 'Postcode is required' },
        { status: 400 }
      )
    }
    
    const country = body.country || 'AU'
    const subtotal = body.subtotal || 0
    
    // Free shipping threshold
    if (country === 'AU' && subtotal >= SHIPPING_RATES.domestic.free.threshold) {
      return NextResponse.json({
        amount: 0,
        description: 'Free Shipping',
        currency: 'AUD',
      })
    }
    
    // International fallback
    if (country !== 'AU') {
      return NextResponse.json({
        amount: body.isExpress ? 2500 : 1500,
        description: body.isExpress 
          ? 'International Express Shipping (5-10 business days)' 
          : 'International Standard Shipping (7-14 business days)',
        currency: 'AUD',
      })
    }
    
    // Live AusPost rate for Australian orders
    const weightKg = calculateParcelWeight(body.itemCount, body.itemCount > 0 && body.hasCustomBlends)
    const rate = await getBestShippingRate(body.postalCode, weightKg, body.isExpress)
    
    return NextResponse.json({
      amount: rate.amount,
      description: rate.description,
      currency: 'AUD',
    })
    
  } catch (error) {
    logger.error('Shipping rate API error', error instanceof Error ? error : new Error(String(error)))
    
    // Fallback to default rate
    return NextResponse.json({
      amount: 1000,
      description: 'Standard Shipping (3-5 business days)',
      currency: 'AUD',
    })
  }
}
