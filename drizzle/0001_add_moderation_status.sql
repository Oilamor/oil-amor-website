CREATE TYPE "public"."moderation_status" AS ENUM('approved', 'flagged', 'hidden');--> statement-breakpoint
ALTER TABLE "community_blends" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
CREATE INDEX "blend_moderation_status_idx" ON "community_blends" USING btree ("moderation_status");