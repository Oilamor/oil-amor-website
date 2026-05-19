import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { creditTransactions, customers } from '@/lib/db/schema-refill';
import { desc, eq } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const transactions = await db.query.creditTransactions.findMany({
      orderBy: [desc(creditTransactions.createdAt)],
      limit: 100,
    });

    const result = await Promise.all(
      transactions.map(async (t) => {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, t.customerId),
        });
        return {
          id: t.id,
          customerId: t.customerId,
          customerEmail: customer?.email || '',
          type: t.type,
          amount: t.amount / 100,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ transactions: result });
  } catch (error) {
    logger.error('Credits error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ transactions: [] });
  }
}
