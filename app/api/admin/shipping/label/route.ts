/**
 * Admin Shipping Label API
 * Generates outbound shipping labels via Australia Post for customer orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { generateOutboundLabel, calculateOrderParcel, validateAustralianAddress } from '@/lib/shipping/auspost';
import type { Address } from '@/lib/shipping/auspost';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { 
      orderId, 
      orderReference,
      customerName,
      customerEmail,
      customerPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      postcode,
      country = 'AU',
      items,
      serviceCode,
      emailNotification = true,
    } = body;

    if (!orderId || !orderReference) {
      return NextResponse.json(
        { error: 'orderId and orderReference are required' },
        { status: 400 }
      );
    }

    if (!addressLine1 || !city || !state || !postcode) {
      return NextResponse.json(
        { error: 'Complete shipping address is required' },
        { status: 400 }
      );
    }

    const customerAddress: Address = {
      name: customerName || 'Customer',
      email: customerEmail || undefined,
      phone: customerPhone || undefined,
      addressLine1,
      addressLine2: addressLine2 || undefined,
      city,
      state: state.toUpperCase(),
      postcode,
      country: country.toUpperCase(),
    };

    // Validate Australian address
    const validation = validateAustralianAddress(customerAddress);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid address', details: validation.errors },
        { status: 400 }
      );
    }

    // Calculate parcel dimensions
    const parcel = items ? calculateOrderParcel(items) : { weightKg: 0.3, dimensions: { length: 15, width: 12, height: 8 } };

    // Generate the label
    const label = await generateOutboundLabel(customerAddress, orderReference, {
      weightKg: parcel.weightKg,
      dimensions: parcel.dimensions,
      serviceCode,
      description: `Oil Amor Order ${orderReference}`,
      emailNotification,
    });

    return NextResponse.json({
      success: true,
      trackingNumber: label.trackingNumber,
      labelUrl: label.labelUrl,
      shipmentId: label.shipmentId,
      cost: label.cost,
      carrier: 'auspost',
      estimatedDelivery: '3-5 business days',
    });
  } catch (error: any) {
    logger.error('[Admin Shipping Label] Error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to generate shipping label' },
      { status: 500 }
    );
  }
}
