-- =============================================================================
-- Customers & Orders Tables Migration
-- =============================================================================
-- Creates the core e-commerce tables that are referenced by batch records,
-- commissions, and the entire order lifecycle.
--
-- NOTE: These tables likely already exist in production (orders are flowing),
-- but they were never formally migrated. This migration ensures a fresh database
-- can be spun up from scratch.
-- =============================================================================

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending',
            'confirmed',
            'processing',
            'blending',
            'quality-check',
            'ready-to-ship',
            'shipped',
            'delivered',
            'cancelled',
            'refunded'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'pending',
            'authorized',
            'captured',
            'failed',
            'refunded',
            'partially-refunded'
        );
    END IF;
END
$$;

-- =============================================================================
-- CUSTOMERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_email_idx ON customers(email);

-- =============================================================================
-- ORDERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    
    status order_status NOT NULL DEFAULT 'pending',
    status_history JSONB,
    
    items JSONB,
    
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    shipping_total INTEGER NOT NULL DEFAULT 0,
    discount_total INTEGER NOT NULL DEFAULT 0,
    store_credit_used INTEGER NOT NULL DEFAULT 0,
    gift_card_used INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    
    currency TEXT NOT NULL DEFAULT 'AUD',
    
    payment JSONB,
    shipping_address JSONB,
    shipping JSONB,
    
    is_gift BOOLEAN NOT NULL DEFAULT FALSE,
    gift_message TEXT,
    gift_receipt BOOLEAN NOT NULL DEFAULT FALSE,
    
    requires_blending BOOLEAN NOT NULL DEFAULT FALSE,
    blending_priority TEXT,
    
    eligible_for_returns BOOLEAN NOT NULL DEFAULT FALSE,
    return_credits_earned INTEGER NOT NULL DEFAULT 0,
    return_credits_used INTEGER NOT NULL DEFAULT 0,
    
    customer_note TEXT,
    internal_note TEXT,
    
    metadata JSONB,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_customer_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS order_customer_email_idx ON orders(customer_email);
CREATE INDEX IF NOT EXISTS order_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS order_created_idx ON orders(created_at);
