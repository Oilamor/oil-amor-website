-- =============================================================================
-- Refill System Tables Migration
-- =============================================================================
-- Creates missing tables for the Forever Bottle refill system:
-- - refill_orders
-- - customer_rewards
-- - credit_reservations
-- - notifications
-- =============================================================================

-- =============================================================================
-- ADD oil_type TO forever_bottles
-- =============================================================================

ALTER TABLE forever_bottles 
ADD COLUMN IF NOT EXISTS oil_type VARCHAR(100);

-- Update existing records with a default value
UPDATE forever_bottles 
SET oil_type = 'Unknown' 
WHERE oil_type IS NULL;

-- Make oil_type NOT NULL after updating
ALTER TABLE forever_bottles 
ALTER COLUMN oil_type SET NOT NULL;

-- =============================================================================
-- REFILL ORDERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS refill_orders (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Customer and bottle references
    customer_id VARCHAR(255) NOT NULL,
    bottle_id UUID REFERENCES forever_bottles(id) ON DELETE SET NULL,
    oil_type VARCHAR(100) NOT NULL,
    
    -- Order status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'label_generated', 'in_transit', 'delivered', 
        'received', 'inspected_passed', 'inspected_failed', 'completed'
    )),
    
    -- Return label (JSON with tracking details)
    return_label JSONB,
    
    -- Customer address for return
    customer_address JSONB NOT NULL,
    
    -- Pricing
    standard_price DECIMAL(10, 2) NOT NULL,
    discounted_price DECIMAL(10, 2) NOT NULL,
    credit_applied DECIMAL(10, 2) DEFAULT 5.00 NOT NULL,
    final_price DECIMAL(10, 2) NOT NULL,
    
    -- Tracking
    tracking_number VARCHAR(100),
    tracking_status VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    label_generated_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    inspected_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Inspection results
    inspection_result VARCHAR(20) CHECK (inspection_result IN ('passed', 'failed')),
    inspection_notes TEXT,
    
    -- Shopify reference
    shopify_order_id VARCHAR(255)
);

-- Indexes for refill_orders
CREATE INDEX IF NOT EXISTS idx_refill_orders_customer_id ON refill_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_refill_orders_bottle_id ON refill_orders(bottle_id);
CREATE INDEX IF NOT EXISTS idx_refill_orders_status ON refill_orders(status);
CREATE INDEX IF NOT EXISTS idx_refill_orders_tracking ON refill_orders(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refill_orders_created_at ON refill_orders(created_at);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_refill_orders_modtime ON refill_orders;
CREATE TRIGGER update_refill_orders_modtime
    BEFORE UPDATE ON refill_orders
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- CUSTOMER REWARDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_rewards (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Customer reference
    customer_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- Tier and benefits
    current_tier VARCHAR(50) NOT NULL DEFAULT 'amber',
    refill_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Credit system
    account_credit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reserved_credit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Purchase history
    total_purchases INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for customer_rewards
CREATE INDEX IF NOT EXISTS idx_customer_rewards_customer_id ON customer_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_rewards_tier ON customer_rewards(current_tier);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_customer_rewards_modtime ON customer_rewards;
CREATE TRIGGER update_customer_rewards_modtime
    BEFORE UPDATE ON customer_rewards
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);

-- =============================================================================
-- CREDIT RESERVATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS credit_reservations (
    -- Primary key (use provided reservation ID)
    id VARCHAR(255) PRIMARY KEY,
    
    -- Customer reference
    customer_id VARCHAR(255) NOT NULL,
    
    -- Reservation details
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'released', 'expired')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for credit_reservations
CREATE INDEX IF NOT EXISTS idx_credit_reservations_customer_id ON credit_reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_reservations_status ON credit_reservations(status);
CREATE INDEX IF NOT EXISTS idx_credit_reservations_expires ON credit_reservations(expires_at) WHERE status = 'pending';

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Customer reference
    customer_id VARCHAR(255) NOT NULL,
    
    -- Notification content
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Read status
    read BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Customer refill summary view
CREATE OR REPLACE VIEW customer_refill_summary AS
SELECT 
    cr.customer_id,
    cr.current_tier,
    cr.refill_unlocked,
    cr.account_credit,
    cr.reserved_credit,
    COUNT(DISTINCT fb.id) as total_bottles,
    COUNT(DISTINCT fb.id) FILTER (WHERE fb.status = 'active') as active_bottles,
    COUNT(DISTINCT ro.id) as total_refill_orders,
    COUNT(DISTINCT ro.id) FILTER (WHERE ro.status = 'completed') as completed_refills
FROM customer_rewards cr
LEFT JOIN forever_bottles fb ON fb.customer_id = cr.customer_id
LEFT JOIN refill_orders ro ON ro.customer_id = cr.customer_id
GROUP BY cr.customer_id, cr.current_tier, cr.refill_unlocked, cr.account_credit, cr.reserved_credit;

-- =============================================================================
-- AUDIT LOG ENTRY
-- =============================================================================

INSERT INTO audit_logs (
    event_type,
    event_description,
    actor_type,
    target_type
) VALUES (
    'database_migration',
    'Refill system tables migration applied',
    'system',
    'database'
);
