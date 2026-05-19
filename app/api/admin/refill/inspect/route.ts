import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { refillOrders, customerCredits, creditTransactions } from '@/lib/db/schema-refill';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json();
    const { orderId, bottleId, inspectionData, result } = body;

    // Input validation
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid orderId' }, { status: 400 });
    }
    if (!bottleId || typeof bottleId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid bottleId' }, { status: 400 });
    }
    if (!inspectionData || typeof inspectionData !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid inspectionData' }, { status: 400 });
    }
    if (!result || typeof result !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid result' }, { status: 400 });
    }

    const inspectionResult = {
      cracks: !!inspectionData.cracks,
      chips: !!inspectionData.chips,
      labelCondition: inspectionData.labelCondition,
      capCondition: inspectionData.capCondition,
      cleanliness: inspectionData.bottleClean ? 'clean' : 'needs-cleaning',
      canRefill: result.canRefill,
      cleaningRequired: result.cleaningRequired,
      notes: inspectionData.notes,
      inspectorId: 'admin',
      inspectedAt: new Date().toISOString(),
    };

    await db
      .update(refillOrders)
      .set({
        status: result.canRefill ? 'refilling' : 'rejected',
        inspectionResult,
        updatedAt: new Date(),
      })
      .where(eq(refillOrders.id, orderId));

    if (result.canRefill) {
      const order = await db.query.refillOrders.findFirst({
        where: eq(refillOrders.id, orderId),
      });
      if (order) {
        const customerId = order.customerId;

        // Idempotency guard: skip if credit already awarded for this order
        const existingTx = await db.select().from(creditTransactions)
          .where(eq(creditTransactions.customerId, customerId))
          .limit(50);
        const alreadyCredited = existingTx.some(
          (tx) => tx.type === 'earned' && tx.metadata && (tx.metadata as any).orderId === orderId
        );
        if (alreadyCredited) {
          return NextResponse.json({ success: true, alreadyCredited: true });
        }

        const credit = await db.query.customerCredits.findFirst({
          where: eq(customerCredits.customerId, customerId),
        });

        if (credit) {
          const newBalance = credit.balance + 500;
          await db
            .update(customerCredits)
            .set({
              balance: newBalance,
              totalEarned: credit.totalEarned + 500,
              updatedAt: new Date(),
            })
            .where(eq(customerCredits.id, credit.id));

          await db.insert(creditTransactions).values({
            id: `ctx-${Date.now()}`,
            customerId,
            type: 'earned',
            amount: 500,
            balance: newBalance,
            description: 'Bottle return credit',
            metadata: { orderId, bottleId },
            createdAt: new Date(),
          });
        } else {
          await db.insert(customerCredits).values({
            id: `cc-${Date.now()}`,
            customerId,
            balance: 500,
            totalEarned: 500,
            totalUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          await db.insert(creditTransactions).values({
            id: `ctx-${Date.now()}`,
            customerId,
            type: 'earned',
            amount: 500,
            balance: 500,
            description: 'Bottle return credit',
            metadata: { orderId, bottleId },
            createdAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Inspect error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
