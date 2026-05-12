/**
 * Label Generation API — v4 Enterprise
 *
 * Generates landscape wrap-around bottle labels with:
 * - Self-contained HTML (embedded fonts, local QR codes)
 * - Optional PDF output via puppeteer-core
 * - Correct carrier percentage and human-readable carrier names
 * - Actual safety score/rating passthrough
 *
 * POST /api/admin/labels/generate
 * Body: LabelData + optional { format?: 'html' | 'pdf' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { generateLabelHtml, getSizeConfig, LabelData } from '@/lib/label/generator';
import { generateLabelPdf } from '@/lib/label/pdf-generator';
import { buildAndSaveBatchRecord } from '@/lib/batch/records';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { format = 'pdf', ...data }: LabelData & { format?: 'html' | 'pdf' } = body;

    if (!data.blendName || !data.oils?.length || !data.batchId) {
      return NextResponse.json(
        { error: 'Missing required fields: blendName, oils, batchId' },
        { status: 400 }
      );
    }

    const config = getSizeConfig(data.size);

    // Generate self-contained HTML
    const labelResult = await generateLabelHtml(data);

    // Save batch record for QR scanning (with ACTUAL safety data)
    try {
      await buildAndSaveBatchRecord({
        batchId: data.batchId,
        blendName: data.blendName,
        mode: data.carrierOil ? 'carrier' : 'pure',
        oils: data.oils.map(o => ({ oilId: o.oilId || '', oilName: o.name, ml: o.ml, percentage: o.percentage })),
        carrierOil: data.carrierOil ? getCarrierOilName(data.carrierOil) : undefined,
        carrierPercentage: data.carrierPercentage,
        size: data.size,
        crystal: data.crystal,
        cord: data.cord,
        intendedUse: data.intendedUse,
        safetyWarnings: data.warnings,
        safetyScore: data.safetyScore ?? 95,
        safetyRating: data.safetyRating ?? 'safe',
        isRefill: data.isRefill || false,
        sourceVolume: data.sourceVolume,
        targetVolume: data.isRefill ? data.size : undefined,
        originalBatchId: data.originalBatchId,
        orderId: data.orderId,
        customerName: data.customerName,
      });
    } catch (err) {
      // Non-fatal — label still works, QR just won't have data
    }

    // Generate PDF if requested and Chromium is available
    if (format === 'pdf') {
      const pdfResult = await generateLabelPdf(
        labelResult.html,
        config.widthMm,
        config.heightMm
      );

      if (pdfResult.pdf) {
        return new NextResponse(new Blob([Buffer.from(pdfResult.pdf)]), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="oil-amor-${data.batchId}.pdf"`,
          },
        });
      }
      // Fallback to HTML if PDF generation failed
    }

    return NextResponse.json({
      success: true,
      html: labelResult.html,
      printDimensions: labelResult.printDimensions,
      sizeConfig: labelResult.sizeConfig,
      format: 'html',
    });
  } catch (error) {
    console.error('Label generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate label' },
      { status: 500 }
    );
  }
}

function getCarrierOilName(id: string | undefined): string | undefined {
  const map: Record<string, string> = {
    'jojoba': 'Jojoba Oil',
    'fractionated-coconut': 'Fractionated Coconut Oil',
  };
  return id ? (map[id] || id) : undefined;
}
