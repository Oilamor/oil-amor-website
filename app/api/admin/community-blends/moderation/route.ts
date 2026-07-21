/**
 * Admin Community Blend Moderation API
 *
 * GET  /api/admin/community-blends/moderation — list blends held for review
 *      (moderation_status='flagged'), newest first.
 * POST /api/admin/community-blends/moderation — moderate a blend.
 *      Body: { blendId, action: 'approve' | 'hide' }
 *      'approve' → moderation_status='approved' (publicly visible again)
 *      'hide'    → moderation_status='hidden'  (removed from public views)
 *      Every action writes an audit_logs row (before/after status).
 *
 * Both endpoints require admin auth (Bearer ADMIN_API_KEY or admin session).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { communityBlends } from '@/lib/db/schema/community-blends'
import { auditLogs } from '@/lib/db/schema-refill'
import { logger } from '@/lib/logging/logger'

export const dynamic = 'force-dynamic'

const moderationActionSchema = z.object({
  blendId: z.string().uuid(),
  action: z.enum(['approve', 'hide']),
})

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const flagged = await db.select({
      id: communityBlends.id,
      name: communityBlends.name,
      slug: communityBlends.slug,
      description: communityBlends.description,
      story: communityBlends.story,
      creatorId: communityBlends.creatorId,
      creatorName: communityBlends.creatorName,
      moderationStatus: communityBlends.moderationStatus,
      status: communityBlends.status,
      visibility: communityBlends.visibility,
      publishedAt: communityBlends.publishedAt,
      createdAt: communityBlends.createdAt,
    })
      .from(communityBlends)
      .where(eq(communityBlends.moderationStatus, 'flagged'))
      .orderBy(desc(communityBlends.updatedAt))
      .limit(100)

    return NextResponse.json({ blends: flagged, count: flagged.length })
  } catch (error) {
    logger.error('[Admin Moderation] Error listing flagged blends', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to list flagged blends' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const validation = moderationActionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { blendId, action } = validation.data
    const newStatus = action === 'approve' ? 'approved' : 'hidden'

    const existing = await db.query.communityBlends.findFirst({
      where: eq(communityBlends.id, blendId),
    })

    if (!existing) {
      return NextResponse.json({ error: 'Blend not found' }, { status: 404 })
    }

    const [updated] = await db.update(communityBlends)
      .set({
        moderationStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(communityBlends.id, blendId))
      .returning()

    // Audit log — same pattern as order admin actions
    await db.insert(auditLogs).values({
      id: `audit_${nanoid(8)}`,
      adminId: 'admin',
      action: `community_blend_${action}`,
      entityType: 'community_blend',
      entityId: blendId,
      before: { moderationStatus: existing.moderationStatus },
      after: { moderationStatus: newStatus },
      createdAt: new Date(),
    })

    logger.info('[Admin Moderation] Blend moderated', {
      blendId,
      action,
      previousStatus: existing.moderationStatus,
      newStatus,
    })

    return NextResponse.json({
      success: true,
      blend: {
        id: updated.id,
        slug: updated.slug,
        moderationStatus: updated.moderationStatus,
      },
    })
  } catch (error) {
    logger.error('[Admin Moderation] Error moderating blend', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to moderate blend' }, { status: 500 })
  }
}
