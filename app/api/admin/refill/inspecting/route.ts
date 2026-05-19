import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { refillOrders, foreverBottles, customers } from '@/lib/db/schema-refill';
import { eq, inArray, desc } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const orders = await db.query.refillOrders.findMany({
      where: inArray(refillOrders.status, ['received', 'inspecting']),
      orderBy: [desc(refillOrders.createdAt)],
      limit: 100,
    });

    const result = await Promise.all(
      orders.map(async (order) => {
        const [bottle, customer] = await Promise.all([
          db.query.foreverBottles.findFirst({
            where: eq(foreverBottles.id, order.bottleId),
          }),
          db.query.customers.findFirst({
            where: eq(customers.id, order.customerId),
          }),
        ]);

        return {
          id: order.id,
          customerId: order.customerId,
          customerEmail: customer?.email || '',
          bottleId: order.bottleId,
          bottleSerial: bottle?.serialNumber || '',
          oilType: order.oilType,
          status: order.status === 'received' ? 'inspecting' : order.status,
          trackingNumber: order.returnLabel?.trackingNumber || '',
          createdAt: order.createdAt.toISOString(),
          receivedAt: order.updatedAt?.toISOString?.() || order.createdAt.toISOString(),
          refillCount: bottle?.refillCount || 0,
        };
      })
    );

    return NextResponse.json({ orders: result });
  } catch (error) {
    logger.error('Inspecting orders error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ orders: [] });
  }
}
