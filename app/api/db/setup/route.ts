/**
 * Database Setup API
 * Creates tables if they don't exist (run once on deploy)
 */

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { logger } from '@/lib/logging/logger'

// Secret key to prevent unauthorized access — NO FALLBACK
const SETUP_KEY = process.env.DB_SETUP_KEY
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
    if (!SETUP_KEY) {
      logger.error('DB_SETUP_KEY is not configured', new Error('DB_SETUP_KEY is not configured'))
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    // Verify setup key
    const { key } = await request.json()
    if (key !== SETUP_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    
    // Create index on email
    await pool.query(`
      CREATE INDEX IF NOT EXISTS customer_email_idx ON customers(email)
    `)
    
    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        is_guest BOOLEAN NOT NULL DEFAULT true,
        status TEXT NOT NULL DEFAULT 'pending',
        status_history JSONB DEFAULT '[]',
        items JSONB NOT NULL DEFAULT '[]',
        subtotal INTEGER NOT NULL DEFAULT 0,
        tax_total INTEGER NOT NULL DEFAULT 0,
        shipping_total INTEGER NOT NULL DEFAULT 0,
        discount_total INTEGER NOT NULL DEFAULT 0,
        store_credit_used INTEGER NOT NULL DEFAULT 0,
        gift_card_used INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'AUD',
        payment JSONB DEFAULT '{}',
        shipping_address JSONB DEFAULT '{}',
        shipping JSONB DEFAULT '{}',
        is_gift BOOLEAN DEFAULT false,
        gift_message TEXT,
        requires_blending BOOLEAN DEFAULT false,
        eligible_for_returns BOOLEAN DEFAULT true,
        return_credits_earned INTEGER NOT NULL DEFAULT 0,
        return_credits_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    
    // Create indexes for orders
    await pool.query(`CREATE INDEX IF NOT EXISTS order_customer_id_idx ON orders(customer_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS order_customer_email_idx ON orders(customer_email)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS order_status_idx ON orders(status)`)
    
    // Create unlocked_oils table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS unlocked_oils (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        oil_id TEXT NOT NULL,
        unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
        unlocked_by TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'pure',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    
    await pool.query(`CREATE INDEX IF NOT EXISTS unlocked_oil_customer_idx ON unlocked_oils(customer_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS unlocked_oil_idx ON unlocked_oils(oil_id)`)
    
    // Create forever_bottles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forever_bottles (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        serial_number TEXT NOT NULL UNIQUE,
        oil_type TEXT NOT NULL,
        capacity TEXT NOT NULL DEFAULT '100ml',
        purchase_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        current_fill_level INTEGER NOT NULL DEFAULT 100,
        refill_count INTEGER NOT NULL DEFAULT 0,
        last_refill_date TIMESTAMP,
        return_label JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    
    await pool.query(`CREATE INDEX IF NOT EXISTS bottle_customer_idx ON forever_bottles(customer_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS bottle_serial_idx ON forever_bottles(serial_number)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS bottle_status_idx ON forever_bottles(status)`)
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      tables: ['customers', 'orders', 'unlocked_oils', 'forever_bottles']
    })
    
  } catch (error: any) {
    logger.error('Database setup error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    )
  }
}
