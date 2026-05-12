/**
 * Admin Commissions API
 * List all blend commissions with filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { blendCommissions, communityBlends, userBlendStats, customers } from '@/lib/db/schema-refill'
import { desc, eq, sql, and, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const creatorId = searchParams.get('creatorId') || undefined
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const conditions = []

    if (status !== 'all') {
      conditions.push(eq(blendCommissions.status, status as any))
    }

    if (creatorId) {
      conditions.push(eq(blendCommissions.creatorId, creatorId))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const commissions = await db.select()
      .from(blendCommissions)
      .where(whereClause)
      .orderBy(desc(blendCommissions.createdAt))
      .limit(limit)
      .offset(offset)

    // Fetch blend names for context
    const blendIds = [...new Set(commissions.map(c => c.blendId))]
    const blends = await db.select()
      .from(communityBlends)
      .where(blendIds.length > 0 ? inArray(communityBlends.id, blendIds) : undefined)

    const blendMap = new Map(blends.map(b => [b.id, b]))

    // Fetch creator stats
    const creatorIds = [...new Set(commissions.map(c => c.creatorId))]
    const stats = await db.select()
      .from(userBlendStats)
      .where(creatorIds.length > 0 ? inArray(userBlendStats.userId, creatorIds) : undefined)

    const statsMap = new Map(stats.map(s => [s.userId, s]))

    // Fetch purchaser names
    const purchaserIds = [...new Set(commissions.map(c => c.purchaserId))]
    const purchaserRecords = await db.select()
      .from(customers)
      .where(purchaserIds.length > 0 ? inArray(customers.id, purchaserIds) : undefined)

    const purchaserMap = new Map(purchaserRecords.map(c => {
      const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ')
      return [c.id, fullName || c.email || 'Unknown']
    }))

    const enriched = commissions.map(comm => {
      const blend = blendMap.get(comm.blendId)
      const creatorStats = statsMap.get(comm.creatorId)

      return {
        id: comm.id,
        blendId: comm.blendId,
        blendName: blend?.name || 'Unknown Blend',
        creatorId: comm.creatorId,
        creatorName: blend?.creatorName || 'Unknown Creator',
        orderId: comm.orderId,
        purchaserId: comm.purchaserId,
        purchaserName: purchaserMap.get(comm.purchaserId) || 'Unknown',
        saleAmount: comm.saleAmount / 100,
        commissionRate: comm.commissionRate,
        commissionAmount: comm.commissionAmount / 100,
        status: comm.status,
        paidAt: comm.paidAt?.toISOString(),
        createdAt: comm.createdAt.toISOString(),
        creatorStats: creatorStats ? {
          totalEarned: creatorStats.totalCommissionEarned / 100,
          pending: creatorStats.pendingCommission / 100,
        } : null,
      }
    })

    // Calculate totals
    const totalPending = enriched
      .filter(c => c.status === 'purchased')
      .reduce((sum, c) => sum + c.commissionAmount, 0)

    const totalPaid = enriched
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0)

    return NextResponse.json({
      commissions: enriched,
      count: enriched.length,
      totalPending,
      totalPaid,
      source: 'local',
    })
  } catch (error: any) {
    console.error('[Admin Commissions] Error:', error)
    return NextResponse.json({
      commissions: [],
      count: 0,
      totalPending: 0,
      totalPaid: 0,
      error: 'Failed to fetch commissions',
      
    }, { status: 500 })
  }
}
