-- Migration 005: Add styling columns to batch_records + fix duplicate index name
-- Generated for Oil Amor label theming (oil-aware colors, atelier flag, rarity)

-- Add theme color for label customization
ALTER TABLE "batch_records" ADD COLUMN IF NOT EXISTS "theme_color" text;

-- Add atelier flag to distinguish custom blends
ALTER TABLE "batch_records" ADD COLUMN IF NOT EXISTS "is_atelier" boolean DEFAULT false;

-- Add dominant rarity for premium/luxury badge rendering
ALTER TABLE "batch_records" ADD COLUMN IF NOT EXISTS "dominant_rarity" text;

-- Fix duplicate index name: rename orders table index to avoid conflict with refill_orders
-- Note: This only runs if the old index name exists. In fresh DBs the schema already uses the new name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'order_status_idx' 
    AND tablename = 'orders'
  ) THEN
    ALTER INDEX "order_status_idx" RENAME TO "orders_status_idx";
  END IF;
END $$;
