-- =============================================================================
-- Batch Records Table Migration
-- =============================================================================
-- Creates the batch_records table for QR code label tracking.
-- This table stores complete blend data so customers can scan a bottle's
-- QR code and retrieve the full recipe, safety info, and reorder option.
--
-- CRITICAL: This migration was missing. Without it, batch records fall back
-- to in-memory storage and are lost on server restart.
-- =============================================================================

-- =============================================================================
-- BATCH RECORDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS batch_records (
    -- Primary key (batch ID, same as on the printed label)
    id TEXT PRIMARY KEY,
    
    -- Blend identification
    blend_name TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'pure',
    
    -- Ingredients (stored as JSON array of { oilId, oilName, ml, percentage })
    oils JSONB NOT NULL,
    
    -- Carrier oil details
    carrier_oil TEXT,
    carrier_percentage INTEGER,
    
    -- Bottle details
    size INTEGER NOT NULL,
    crystal TEXT,
    cord TEXT,
    intended_use TEXT,
    
    -- Safety data
    safety_warnings JSONB,
    safety_score INTEGER NOT NULL DEFAULT 95,
    safety_rating TEXT NOT NULL DEFAULT 'safe',
    
    -- Refill tracking
    is_refill BOOLEAN NOT NULL DEFAULT FALSE,
    source_volume INTEGER,
    target_volume INTEGER,
    original_batch_id TEXT,
    
    -- Order linkage
    order_id TEXT,
    customer_name TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for fast QR lookups
CREATE INDEX IF NOT EXISTS batch_order_idx ON batch_records(order_id);
CREATE INDEX IF NOT EXISTS batch_created_idx ON batch_records(created_at);
CREATE INDEX IF NOT EXISTS batch_expires_idx ON batch_records(expires_at);

-- Index for fast batch ID lookups (QR scans)
CREATE INDEX IF NOT EXISTS batch_id_idx ON batch_records(id);
