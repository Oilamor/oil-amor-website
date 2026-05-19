/**
 * Order-Based Label Generation API — v5
 * Local DB only — generates wrap-around bottle labels from local order data
 *
 * POST /api/admin/labels/order
 * Body: { orderId: string, itemIndex?: number, batchId?: string, format?: 'html' | 'pdf' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { orders, refillOrders } from '@/lib/db/schema-refill'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { generateLabelHtml, getSizeConfig, CARRIER_OIL_NAMES, getDominantRarity } from '@/lib/label/generator'
import { generateLabelPdf } from '@/lib/label/pdf-generator'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { orderId, itemIndex = 0, batchId: customBatchId, format = 'pdf' } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Find order in local DB
    let order = null

    const localOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })

    if (localOrder) {
      order = {
        id: localOrder.id,
        customerName: localOrder.customerName,
        customerEmail: localOrder.customerEmail,
        items: (localOrder.items || []).map((item: any) => ({
          ...item,
          unitPrice: item.unitPrice / 100,
          subtotal: item.subtotal / 100,
          taxAmount: item.taxAmount / 100,
          total: item.total / 100,
        })),
        shippingAddress: localOrder.shippingAddress,
        status: localOrder.status,
        createdAt: localOrder.createdAt.toISOString(),
        isRefill: localOrder.metadata?.isRefill || false,
        sourceVolume: localOrder.metadata?.sourceVolume,
      }
    }

    // Try refill orders if not found
    if (!order) {
      const refill = await db.query.refillOrders.findFirst({
        where: eq(refillOrders.id, orderId),
      })

      if (refill) {
        const pricing = refill.pricing || { standardPrice: 0, finalPrice: 0 }
        order = {
          id: refill.id,
          customerName: 'Refill Customer',
          customerEmail: '',
          items: [{
            id: `item-${refill.id}`,
            name: `${refill.oilType} Refill`,
            customMix: {
              recipeName: `${refill.oilType} Refill`,
              mode: 'carrier',
              oils: [{ oilId: refill.oilType, oilName: refill.oilType, ml: 100, percentage: 100 }],
              totalVolume: 100,
              safetyScore: 95,
              safetyRating: 'safe',
              safetyWarnings: [],
            },
            unitPrice: pricing.finalPrice / 100,
            quantity: 1,
            subtotal: pricing.finalPrice / 100,
            total: pricing.finalPrice / 100,
          }],
          status: refill.status,
          createdAt: refill.createdAt.toISOString(),
          isRefill: true,
        }
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Find the blend item
    const mixItem = order.items?.[itemIndex] || order.items?.find((item: any) => item.customMix)

    if (!mixItem?.customMix && !order.items?.[itemIndex]) {
      return NextResponse.json({
        error: 'No blend item found in this order',
        orderId: order.id,
        itemCount: order.items?.length || 0,
      }, { status: 400 })
    }

    const mix = mixItem?.customMix || {
      recipeName: mixItem?.name || 'Custom Blend',
      mode: 'pure',
      oils: [{ oilId: '', oilName: mixItem?.name || 'Oil', ml: 30, percentage: 100 }],
      totalVolume: 30,
      safetyScore: 95,
      safetyRating: 'safe',
      safetyWarnings: [],
    }

    const size = mix.totalVolume || 30
    const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    const batchId = customBatchId || `OA-${dateSuffix}-${nanoid(4).toUpperCase()}`

    // FIX: Map carrierOilId to human-readable name
    // FIX: Calculate actual carrier percentage (100 - carrierRatio)
    const carrierOilId = mix.mode === 'carrier' ? mix.carrierOilId : undefined
    const carrierRatio = mix.mode === 'carrier' ? mix.carrierRatio : undefined
    const carrierName = carrierOilId ? (CARRIER_OIL_NAMES[carrierOilId] || carrierOilId) : undefined
    const carrierPercentage = carrierRatio !== undefined ? (100 - carrierRatio) : undefined

    // Build label data with corrected carrier info and actual safety data
    const labelData = {
      blendName: mix.recipeName || mixItem?.name || 'Custom Blend',
      oils: mix.oils.map((o: any) => ({
        name: o.oilName,
        percentage: o.percentage,
        ml: o.ml,
        oilId: o.oilId,
      })),
      carrierOil: carrierOilId,
      carrierPercentage,
      size,
      batchId,
      madeDate: new Date().toLocaleDateString('en-AU'),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
      warnings: mix.safetyWarnings || [],
      crystal: mix.crystalId,
      cord: mix.cordId,
      intendedUse: mix.intendedUse,
      isRefill: order.isRefill || false,
      sourceVolume: order.sourceVolume || mix.totalVolume,
      orderId: order.id,
      customerName: order.customerName,
      // Pass through actual safety data (v5)
      safetyScore: mix.safetyScore,
      safetyRating: mix.safetyRating,
      // Styling data (v5 — oil-aware theming)
      mode: mix.mode,
      isAtelier: mixItem?.type === 'custom-mix',
      dominantRarity: getDominantRarity(mix.oils.map((o: any) => ({ name: o.oilName, percentage: o.percentage, ml: o.ml, oilId: o.oilId }))),
    }

    // Generate label HTML
    const labelResult = await generateLabelHtml(labelData)

    // Generate PDF if requested
    if (format === 'pdf') {
      const config = getSizeConfig(size)
      const pdfResult = await generateLabelPdf(labelResult.html, config.widthMm, config.heightMm)

      if (pdfResult.pdf) {
        return new NextResponse(new Blob([Buffer.from(pdfResult.pdf)]), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="oil-amor-${batchId}.pdf"`,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      batchId,
      html: labelResult.html,
      printDimensions: labelResult.printDimensions,
      sizeConfig: labelResult.sizeConfig,
      format: format === 'pdf' ? 'html' : 'html',
    })

  } catch (error) {
    logger.error('Order Label v5 error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to generate order label' },
      { status: 500 }
    )
  }
}
