/**
 * Admin Commission Pay API
 * POST /api/admin/commissions/[id]/pay
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { blendCommissions, userBlendStats } from '@/lib/db/schema-refill'
import { eq, sql } from 'drizzle-orm'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { id } = params

  try {
    const commission = await db.query.blendCommissions.findFirst({
      where: eq(blendCommissions.id, id as any),
    })

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    if (commission.status === 'paid') {
      return NextResponse.json({ error: 'Commission already paid' }, { status: 400 })
    }

    // Update commission status
    const [updated] = await db.update(blendCommissions)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blendCommissions.id, id as any))
      .returning()

    // Update creator pending commission
    await db.update(userBlendStats)
      .set({
        pendingCommission: sql`${userBlendStats.pendingCommission} - ${commission.commissionAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(userBlendStats.userId, commission.creatorId))

    return NextResponse.json({
      success: true,
      commission: {
        id: updated.id,
        commissionAmount: updated.commissionAmount / 100,
        status: updated.status,
        paidAt: updated.paidAt?.toISOString(),
      },
    })
  } catch (error: any) {
    logger.error('Admin Commission Pay error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to pay commission' }, { status: 500 })
  }
}
