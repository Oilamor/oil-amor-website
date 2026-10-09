-- 0002: orders columns missing from the pre-existing Neon table.
-- The live orders table predated drizzle schema-refill.ts and was missing
-- six columns that every drizzle SELECT/INSERT/UPDATE touches, which made
-- /api/admin/orders (and the Stripe webhook order upsert) 500 in production.
-- Already applied to production Neon on 2026-10-09; idempotent.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "gift_receipt" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "blending_priority" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_note" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "internal_note" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "processing_completed_at" timestamp;
