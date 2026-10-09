-- 0003: staging table for full atelier recipes during Stripe checkout.
-- Stripe line-item metadata values are capped at 500 chars, so checkout
-- stores the full customMix recipe here and passes a short customMixRef
-- through Stripe metadata; the webhook resolves (and deletes) the row.
-- NOT yet applied to production — apply before deploying the checkout change.
CREATE TABLE "checkout_recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkout_recipes_expires_at_idx" ON "checkout_recipes" USING btree ("expires_at");
