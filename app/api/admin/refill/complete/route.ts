import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { refillOrders, foreverBottles } from '@/lib/db/schema-refill';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const { orderId } = await request.json();

    const order = await db.query.refillOrders.findFirst({
      where: eq(refillOrders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    await db
      .update(refillOrders)
      .set({ status: 'completed', updatedAt: new Date(), completedAt: new Date() })
      .where(eq(refillOrders.id, orderId));

    const bottle = await db.query.foreverBottles.findFirst({
      where: eq(foreverBottles.id, order.bottleId),
    });
    if (bottle) {
      await db
        .update(foreverBottles)
        .set({
          refillCount: bottle.refillCount + 1,
          lastRefillDate: new Date(),
          status: 'refilled',
          updatedAt: new Date(),
        })
        .where(eq(foreverBottles.id, order.bottleId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Complete error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
