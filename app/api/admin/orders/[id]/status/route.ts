/**
 * Admin Order Status Transition API
 * POST /api/admin/orders/[id]/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { transitionOrderStatus } from '@/lib/orders/status-workflow'
import { OrderStatus } from '@/lib/db/schema/orders'
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
    const body = await request.json()
    const { status, note, sendEmail = true, changedBy = 'admin' } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const result = await transitionOrderStatus(id, status as OrderStatus, {
      note,
      changedBy,
      sendEmail,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      emailSent: result.emailSent,
      emailTemplate: result.emailTemplate,
    })
  } catch (error: any) {
    logger.error('[Admin Order Status] Error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to transition status' }, { status: 500 })
  }
}
