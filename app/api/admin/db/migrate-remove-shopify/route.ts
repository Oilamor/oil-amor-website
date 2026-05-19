/**
 * Phase 7 DB Migration API
 * 
 * Run this once after deploying the Shopify-free codebase.
 * Protected by admin auth.
 * 
 * POST /api/admin/db/migrate-remove-shopify
 * Body: { confirm: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'
import { logger } from '@/lib/logging/logger'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Pass { confirm: true } to run the migration' },
        { status: 400 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      )
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=require') ||
           process.env.DATABASE_URL.includes('neon.tech') ||
           process.env.DATABASE_URL.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : undefined,
    } as ConstructorParameters<typeof Pool>[0])

    const client = await pool.connect()
    const results: string[] = []

    try {
      // Check if columns exist before dropping
      const checkColumn = async (table: string, column: string): Promise<boolean> => {
        const result = await client.query(
          `SELECT 1 FROM information_schema.columns 
           WHERE table_name = $1 AND column_name = $2`,
          [table, column]
        )
        return result.rowCount !== null && result.rowCount > 0
      }

      // Drop shopify_order_id from orders
      if (await checkColumn('orders', 'shopify_order_id')) {
        await client.query('ALTER TABLE orders DROP COLUMN shopify_order_id')
        results.push('Dropped shopify_order_id from orders')
      } else {
        results.push('shopify_order_id not found in orders (already removed)')
      }

      // Drop shopify_order_id from batch_records
      if (await checkColumn('batch_records', 'shopify_order_id')) {
        await client.query('ALTER TABLE batch_records DROP COLUMN shopify_order_id')
        results.push('Dropped shopify_order_id from batch_records')
      } else {
        results.push('shopify_order_id not found in batch_records (already removed)')
      }

      // Backfill status_history if missing
      const ordersWithoutHistory = await client.query(
        `SELECT id FROM orders WHERE status_history IS NULL OR jsonb_array_length(status_history::jsonb) = 0`
      )

      for (const row of ordersWithoutHistory.rows) {
        await client.query(
          `UPDATE orders 
           SET status_history = jsonb_build_array(jsonb_build_object('status', status, 'timestamp', created_at::text))
           WHERE id = $1`,
          [(row as { id: string }).id]
        )
      }

      if (ordersWithoutHistory.rowCount && ordersWithoutHistory.rowCount > 0) {
        results.push(`Backfilled status_history for ${ordersWithoutHistory.rowCount} orders`)
      }

      return NextResponse.json({
        success: true,
        message: 'Migration complete',
        results,
      })
    } finally {
      client.release()
      await pool.end()
    }
  } catch (error) {
    logger.error('Migration failed', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Phase 7: Shopify removal migration',
    instructions: 'POST with { confirm: true } to run',
    changes: [
      'Drop shopify_order_id from orders table',
      'Drop shopify_order_id from batch_records table',
      'Backfill status_history for orders missing it',
    ],
  })
}
