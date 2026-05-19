/**
 * Admin Refill Orders API
 * Returns refill orders with scaled recipes for production
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { refillOrders, foreverBottles, customers } from '@/lib/db/schema-refill';
import { desc, eq } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';
import { scaleToRefill, normalizeRecipe } from '@/lib/refill/recipe-scaling';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    // Get recent refill orders
    const orders = await db.query.refillOrders.findMany({
      orderBy: [desc(refillOrders.createdAt)],
      limit: 50,
    });

    // Transform to refill order items with scaled recipes
    const refillOrderItems = await Promise.all(
      orders.map(async (order) => {
        // Get related data
        const [bottle, customer] = await Promise.all([
          db.query.foreverBottles.findFirst({
            where: eq(foreverBottles.id, order.bottleId),
          }),
          db.query.customers.findFirst({
            where: eq(customers.id, order.customerId),
          }),
        ]);

        const pricing = order.pricing || { standardPrice: 0, creditApplied: 0, finalPrice: 0 };

        // Create a normalized recipe for scaling
        const normalizedRecipe = {
          mode: 'carrier' as const,
          totalVolume: 30,
          oils: [{
            oilId: order.oilType,
            oilName: order.oilType.charAt(0).toUpperCase() + order.oilType.slice(1),
            percentage: 100,
            ml: 30, // Full bottle
          }],
          carrierRatio: 30,
          safetyScore: 95,
          safetyRating: 'safe',
          safetyWarnings: [],
        };

        // Scale to 50ml and 100ml options
        const scaled50ml = scaleToRefill(normalizedRecipe, 50);
        const scaled100ml = scaleToRefill(normalizedRecipe, 100);

        return {
          orderId: order.id,
          customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
          customerEmail: customer?.email || '',
          originalRecipeName: `${order.oilType.charAt(0).toUpperCase() + order.oilType.slice(1)} Refill`,
          originalOrderId: bottle?.metadata?.orderId || 'Unknown',
          targetSize: 50 as const,
          scaledRecipe: scaled50ml,
          scaled100ml: scaled100ml,
          bottleSerial: bottle?.serialNumber || 'Unknown',
          status: order.status,
          createdAt: order.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ orders: refillOrderItems });
  } catch (error) {
    logger.error('Refill orders API error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch refill orders', orders: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { orderId, action } = await request.json();

    if (action === 'start') {
      await db.update(refillOrders)
        .set({ status: 'refilling', updatedAt: new Date() })
        .where(eq(refillOrders.id, orderId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Refill orders POST error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed to update refill order' }, { status: 500 });
  }
}
