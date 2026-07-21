-- =============================================================================
-- Oil Amor Initial Database Schema
-- =============================================================================
-- This migration creates the foundational tables for:
-- - Forever bottles and refill credits
-- - Shipments and tracking
-- - Customer sessions
-- - Audit logs
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timestamp trigger extension
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- =============================================================================
-- FOREVER BOTTLES TABLE
-- =============================================================================
-- Tracks all Forever Bottles sold and their refill credits

CREATE TABLE forever_bottles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Shopify order reference
    order_id VARCHAR(255) NOT NULL,
    order_number VARCHAR(50),
    
    -- Customer information
    customer_id VARCHAR(255),
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    
    -- Bottle details
    bottle_sku VARCHAR(100) NOT NULL,
    bottle_size VARCHAR(20) NOT NULL CHECK (bottle_size IN ('10ml', '30ml', '50ml')),
    bottle_material VARCHAR(20) NOT NULL DEFAULT 'Glass' CHECK (bottle_material IN ('Glass', 'Sapphire')),
    
    -- Credit system
    total_credits INTEGER NOT NULL DEFAULT 6 CHECK (total_credits > 0),
    credits_remaining INTEGER NOT NULL DEFAULT 6 CHECK (credits_remaining >= 0),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'cancelled')),
    
    -- Crystal vial pairing (optional)
    crystal_vial_type VARCHAR(50),
    
    -- Timestamps
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Metadata
    notes TEXT,
    tags TEXT[] DEFAULT '{}'
);

-- Indexes for forever_bottles
CREATE INDEX idx_forever_bottles_customer_id ON forever_bottles(customer_id);
CREATE INDEX idx_forever_bottles_customer_email ON forever_bottles(customer_email);
CREATE INDEX idx_forever_bottles_order_id ON forever_bottles(order_id);
CREATE INDEX idx_forever_bottles_status ON forever_bottles(status);
CREATE INDEX idx_forever_bottles_credits_remaining ON forever_bottles(credits_remaining) WHERE credits_remaining > 0;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_forever_bottles_modtime
    BEFORE UPDATE ON forever_bottles
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- REFILL CREDITS TABLE
-- =============================================================================
-- Tracks individual credit usage per bottle

CREATE TABLE refill_credits (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to forever_bottles
    bottle_id UUID NOT NULL REFERENCES forever_bottles(id) ON DELETE CASCADE,
    
    -- Shopify order reference for the refill
    order_id VARCHAR(255),
    order_number VARCHAR(50),
    
    -- Credit details
    credit_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired', 'cancelled')),
    
    -- Usage details
    used_at TIMESTAMP WITH TIME ZONE,
    used_for_order_id VARCHAR(255),
    
    -- Oil selections for this refill (JSON array)
    oil_selections JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Expiration (optional)
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for refill_credits
CREATE INDEX idx_refill_credits_bottle_id ON refill_credits(bottle_id);
CREATE INDEX idx_refill_credits_status ON refill_credits(status);
CREATE INDEX idx_refill_credits_order_id ON refill_credits(order_id) WHERE order_id IS NOT NULL;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_refill_credits_modtime
    BEFORE UPDATE ON refill_credits
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- SHIPMENTS TABLE
-- =============================================================================
-- Tracks all shipments (initial orders and refills)

CREATE TABLE shipments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Order reference
    order_id VARCHAR(255) NOT NULL,
    order_number VARCHAR(50),
    
    -- Shipment type
    shipment_type VARCHAR(20) NOT NULL CHECK (shipment_type IN ('initial', 'refill', 'replacement', 'return')),
    
    -- Forever bottle reference (for refills)
    bottle_id UUID REFERENCES forever_bottles(id) ON DELETE SET NULL,
    
    -- Customer information
    customer_id VARCHAR(255),
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    
    -- Shipping address
    shipping_address JSONB NOT NULL,
    
    -- Australia Post tracking
    auspost_tracking_number VARCHAR(100),
    auspost_consignment_id VARCHAR(100),
    
    -- Shipment status
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'label_created', 'picked_up', 
        'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'
    )),
    
    -- Shipping details
    shipping_method VARCHAR(50),
    shipping_cost DECIMAL(10, 2),
    estimated_delivery_date DATE,
    
    -- Weight and dimensions
    weight_kg DECIMAL(6, 3),
    length_cm INTEGER,
    width_cm INTEGER,
    height_cm INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    
    -- Last tracking update
    last_tracking_event JSONB
);

-- Indexes for shipments
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_bottle_id ON shipments(bottle_id) WHERE bottle_id IS NOT NULL;
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking ON shipments(auspost_tracking_number) WHERE auspost_tracking_number IS NOT NULL;
CREATE INDEX idx_shipments_customer_email ON shipments(customer_email);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_shipments_modtime
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- SHIPMENT TRACKING EVENTS TABLE
-- =============================================================================
-- Historical tracking events for shipments

CREATE TABLE shipment_tracking_events (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign key to shipments
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    
    -- Event details
    event_code VARCHAR(50) NOT NULL,
    event_description VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    
    -- Timestamps
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Raw data from Australia Post
    raw_data JSONB
);

-- Indexes for shipment_tracking_events
CREATE INDEX idx_tracking_events_shipment_id ON shipment_tracking_events(shipment_id);
CREATE INDEX idx_tracking_events_timestamp ON shipment_tracking_events(event_timestamp);
CREATE INDEX idx_tracking_events_created_at ON shipment_tracking_events(created_at);

-- =============================================================================
-- CUSTOMER SESSIONS TABLE
-- =============================================================================
-- Tracks customer configurator sessions and cart state

CREATE TABLE customer_sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session identifier
    session_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- Customer information (nullable for guest sessions)
    customer_id VARCHAR(255),
    customer_email VARCHAR(255),
    
    -- Cart state
    cart_id VARCHAR(255),
    cart_data JSONB DEFAULT '{}'::jsonb,
    
    -- Configurator state
    configurator_state JSONB DEFAULT '{}'::jsonb,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Last activity
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for customer_sessions
CREATE INDEX idx_sessions_token ON customer_sessions(session_token);
CREATE INDEX idx_sessions_customer_id ON customer_sessions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sessions_expires_at ON customer_sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON customer_sessions(last_activity_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_customer_sessions_modtime
    BEFORE UPDATE ON customer_sessions
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- SYNERGY HISTORY TABLE
-- =============================================================================
-- Tracks oil-crystal pairings chosen by customers

CREATE TABLE synergy_selections (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Selection details
    oils TEXT[] NOT NULL,
    crystal VARCHAR(100) NOT NULL,
    intention VARCHAR(100),
    
    -- Context
    customer_id VARCHAR(255),
    session_id UUID REFERENCES customer_sessions(id) ON DELETE SET NULL,
    
    -- Whether this led to a purchase
    converted_to_order BOOLEAN DEFAULT FALSE,
    order_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for synergy_selections
CREATE INDEX idx_synergy_customer_id ON synergy_selections(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_synergy_crystal ON synergy_selections(crystal);
CREATE INDEX idx_synergy_created_at ON synergy_selections(created_at);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================
-- Tracks all important system events

CREATE TABLE audit_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT,
    
    -- Actor
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('customer', 'admin', 'system', 'webhook')),
    actor_id VARCHAR(255),
    actor_email VARCHAR(255),
    
    -- Target (what was affected)
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    
    -- Change details
    previous_state JSONB,
    new_state JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- Partition audit_logs by month for performance (optional, PostgreSQL 10+)
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =============================================================================
-- WEBHOOK EVENTS TABLE
-- =============================================================================
-- Stores incoming webhook events for processing

CREATE TABLE webhook_events (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Webhook source
    source VARCHAR(50) NOT NULL CHECK (source IN ('shopify', 'auspost', 'stripe', 'paypal')),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    
    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'ignored')),
    
    -- Processing details
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_source ON webhook_events(source);
CREATE INDEX idx_webhook_status ON webhook_events(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_created_at ON webhook_events(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_webhook_events_modtime
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Active Forever Bottles with credits
CREATE VIEW active_bottles_with_credits AS
SELECT 
    fb.*,
    COUNT(rc.id) FILTER (WHERE rc.status = 'available') as available_credits
FROM forever_bottles fb
LEFT JOIN refill_credits rc ON fb.id = rc.bottle_id
WHERE fb.status = 'active'
GROUP BY fb.id;

-- Pending shipments
CREATE VIEW pending_shipments AS
SELECT 
    s.*,
    fb.bottle_size,
    fb.bottle_material
FROM shipments s
LEFT JOIN forever_bottles fb ON s.bottle_id = fb.id
WHERE s.status IN ('pending', 'processing', 'label_created', 'picked_up', 'in_transit');

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default settings
INSERT INTO audit_logs (
    event_type,
    event_description,
    actor_type,
    target_type
) VALUES (
    'database_init',
    'Database schema initialized',
    'system',
    'database'
);
