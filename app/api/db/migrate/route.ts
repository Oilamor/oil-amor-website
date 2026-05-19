/**
 * Database Migration API
 * Adds missing columns to existing tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { logger } from '@/lib/logging/logger'

const MIGRATE_KEY = process.env.DB_SETUP_KEY
const ALLOW_DDL = process.env.ALLOW_DDL_ENDPOINTS === 'true'

export async function POST(request: NextRequest) {
  try {
    // DDL endpoints are disabled by default in production
    if (!ALLOW_DDL) {
      return NextResponse.json(
        { error: 'Forbidden: DDL endpoints are disabled' },
        { status: 403 }
      )
    }

    // Fail closed if setup key is not configured
    if (!MIGRATE_KEY) {
      logger.error('DB_SETUP_KEY is not configured', new Error('DB_SETUP_KEY is not configured'))
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const { key } = await request.json()
    if (key !== MIGRATE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const results: string[] = []
    
    // Add missing columns to orders table
    const columnsToAdd = [
      { name: 'store_credit_used', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'gift_card_used', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'return_credits_earned', type: 'INTEGER NOT NULL DEFAULT 0' },
      { name: 'return_credits_used', type: 'INTEGER NOT NULL DEFAULT 0' },
    ]
    
    for (const col of columnsToAdd) {
      try {
        await pool.query(`
          ALTER TABLE orders 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `)
        results.push(`Added column: ${col.name}`)
      } catch (e: any) {
        results.push(`Failed to add ${col.name}: ${e?.message}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results,
    })
    
  } catch (error: any) {
    logger.error('Migration error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    )
  }
}
