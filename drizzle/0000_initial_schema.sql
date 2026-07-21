CREATE TYPE "public"."blend_status" AS ENUM('draft', 'purchased', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."blend_visibility" AS ENUM('private', 'shared', 'community');--> statement-breakpoint
CREATE TYPE "public"."bottle_status" AS ENUM('active', 'empty', 'in-transit', 'refilled', 'retired');--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('earned', 'used', 'expired', 'adjusted');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'blending', 'quality-check', 'ready-to-ship', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'captured', 'failed', 'refunded', 'partially-refunded');--> statement-breakpoint
CREATE TYPE "public"."refill_order_status" AS ENUM('pending-return', 'in-transit', 'received', 'inspecting', 'refilling', 'completed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'in-transit', 'delivered', 'exception', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('purchased', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."age_restriction" AS ENUM('all_ages', 'avoid_under_2', 'avoid_under_6', 'avoid_under_12', 'avoid_under_adult');--> statement-breakpoint
CREATE TYPE "public"."interaction_severity" AS ENUM('minor', 'moderate', 'major', 'contraindicated');--> statement-breakpoint
CREATE TYPE "public"."lactation_safety" AS ENUM('compatible', 'caution', 'avoid', 'insufficient');--> statement-breakpoint
CREATE TYPE "public"."pregnancy_safety" AS ENUM('category_a', 'category_b', 'category_c', 'category_d', 'category_x', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."route_safety" AS ENUM('all_routes', 'inhalation_only', 'avoid_topical', 'avoid_ingestion', 'dilution_required');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auspost_shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"bottle_id" text NOT NULL,
	"tracking_number" text NOT NULL,
	"shipment_id" text NOT NULL,
	"label_url" text NOT NULL,
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"from_address" jsonb NOT NULL,
	"to_address" jsonb NOT NULL,
	"last_event" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auspost_shipments_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "batch_records" (
	"id" text PRIMARY KEY NOT NULL,
	"blend_name" text NOT NULL,
	"mode" text DEFAULT 'pure' NOT NULL,
	"oils" jsonb NOT NULL,
	"carrier_oil" text,
	"carrier_percentage" integer,
	"size" integer NOT NULL,
	"crystal" text,
	"cord" text,
	"intended_use" text,
	"safety_warnings" jsonb,
	"safety_score" integer DEFAULT 95 NOT NULL,
	"safety_rating" text DEFAULT 'safe' NOT NULL,
	"is_refill" boolean DEFAULT false NOT NULL,
	"source_volume" integer,
	"target_volume" integer,
	"original_batch_id" text,
	"order_id" text,
	"customer_name" text,
	"theme_color" text,
	"is_atelier" boolean DEFAULT false,
	"dominant_rarity" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blend_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blend_id" uuid NOT NULL,
	"creator_id" text NOT NULL,
	"order_id" text NOT NULL,
	"purchaser_id" text NOT NULL,
	"sale_amount" integer NOT NULL,
	"commission_rate" integer DEFAULT 10 NOT NULL,
	"commission_amount" integer NOT NULL,
	"status" "commission_status" DEFAULT 'purchased' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commission_order_blend_unique" UNIQUE("order_id","blend_id")
);
--> statement-breakpoint
CREATE TABLE "blend_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blend_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_avatar" text,
	"rating" integer NOT NULL,
	"review" text,
	"verified_purchase" boolean DEFAULT false NOT NULL,
	"order_id" text,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rating_unique_user_blend" UNIQUE("blend_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "blend_referrals" (
	"id" text PRIMARY KEY NOT NULL,
	"share_code" text NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referred_user_id" text,
	"order_id" text NOT NULL,
	"blend_id" text NOT NULL,
	"purchase_amount" integer NOT NULL,
	"credit_earned" integer NOT NULL,
	"credit_status" text DEFAULT 'pending',
	"credit_applied_at" timestamp,
	"referrer_ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blend_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blend_id" uuid NOT NULL,
	"shared_by" text NOT NULL,
	"platform" text,
	"share_token" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"conversion_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "blend_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "community_blends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"creator_name" text NOT NULL,
	"creator_avatar" text,
	"creator_bio" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"story" text,
	"recipe" jsonb NOT NULL,
	"revelation_data" jsonb,
	"price" integer NOT NULL,
	"visibility" "blend_visibility" DEFAULT 'private' NOT NULL,
	"status" "blend_status" DEFAULT 'draft' NOT NULL,
	"consent_to_share" boolean DEFAULT false NOT NULL,
	"consent_date" timestamp,
	"original_order_id" text,
	"purchase_verified_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"purchase_count" integer DEFAULT 0 NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"popularity_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "community_blends_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance" integer NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_credits_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "forever_bottle_history" (
	"id" text PRIMARY KEY NOT NULL,
	"bottle_id" text NOT NULL,
	"event_type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forever_bottles" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"serial_number" text NOT NULL,
	"oil_type" text NOT NULL,
	"capacity" text DEFAULT '100ml' NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"status" "bottle_status" DEFAULT 'active' NOT NULL,
	"current_fill_level" integer DEFAULT 100 NOT NULL,
	"refill_count" integer DEFAULT 0 NOT NULL,
	"last_refill_date" timestamp,
	"return_label" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forever_bottles_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"status_history" jsonb,
	"items" jsonb,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax_total" integer DEFAULT 0 NOT NULL,
	"shipping_total" integer DEFAULT 0 NOT NULL,
	"discount_total" integer DEFAULT 0 NOT NULL,
	"store_credit_used" integer DEFAULT 0 NOT NULL,
	"gift_card_used" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"payment" jsonb,
	"shipping_address" jsonb,
	"shipping" jsonb,
	"is_gift" boolean DEFAULT false NOT NULL,
	"gift_message" text,
	"gift_receipt" boolean DEFAULT false NOT NULL,
	"requires_blending" boolean DEFAULT false NOT NULL,
	"blending_priority" text,
	"eligible_for_returns" boolean DEFAULT false NOT NULL,
	"return_credits_earned" integer DEFAULT 0 NOT NULL,
	"return_credits_used" integer DEFAULT 0 NOT NULL,
	"customer_note" text,
	"internal_note" text,
	"metadata" jsonb,
	"processing_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refill_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"bottle_id" text NOT NULL,
	"oil_type" text NOT NULL,
	"status" "refill_order_status" DEFAULT 'pending-return' NOT NULL,
	"return_label" jsonb NOT NULL,
	"pricing" jsonb NOT NULL,
	"inspection_result" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "unlocked_oils" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"oil_id" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"unlocked_by" text NOT NULL,
	"type" text DEFAULT 'pure' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlocked_refills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_order_id" text NOT NULL,
	"original_order_item_id" text,
	"name" text NOT NULL,
	"description" text,
	"intended_use" text,
	"tags" text[],
	"recipe" jsonb NOT NULL,
	"available_sizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"refill_count" integer DEFAULT 0 NOT NULL,
	"last_refilled_at" timestamp,
	"share_code" text,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blend_stats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"blends_created" integer DEFAULT 0 NOT NULL,
	"blends_published" integer DEFAULT 0 NOT NULL,
	"total_purchases_of_blends" integer DEFAULT 0 NOT NULL,
	"total_ratings_received" integer DEFAULT 0 NOT NULL,
	"average_rating" integer DEFAULT 0 NOT NULL,
	"total_commission_earned" integer DEFAULT 0 NOT NULL,
	"pending_commission" integer DEFAULT 0 NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"badges" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blends" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"share_code" text NOT NULL,
	"recipe" jsonb NOT NULL,
	"description" text,
	"intended_use" text,
	"tags" text[],
	"created_from_order_id" text,
	"original_community_blend_id" text,
	"is_brand_ambassador_enabled" boolean DEFAULT false,
	"total_shares" integer DEFAULT 0,
	"total_views" integer DEFAULT 0,
	"total_purchases_via_share" integer DEFAULT 0,
	"total_credits_earned" integer DEFAULT 0,
	"is_public" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_purchased_at" timestamp,
	CONSTRAINT "user_blends_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "health_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"aliases" text[],
	"search_terms" text[],
	"is_life_threatening" boolean DEFAULT false NOT NULL,
	"requires_medical_supervision" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_conditions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generic_name" text NOT NULL,
	"brand_names" text[],
	"drug_class" text NOT NULL,
	"search_terms" text[],
	"affects_blood_clotting" boolean DEFAULT false NOT NULL,
	"affects_blood_pressure" boolean DEFAULT false NOT NULL,
	"affects_blood_sugar" boolean DEFAULT false NOT NULL,
	"affects_liver" boolean DEFAULT false NOT NULL,
	"affects_kidney" boolean DEFAULT false NOT NULL,
	"affects_cns" boolean DEFAULT false NOT NULL,
	"affects_heart" boolean DEFAULT false NOT NULL,
	"metabolism_pathway" text,
	"verified_by" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oil_condition_contraindications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oil_id" text NOT NULL,
	"condition_id" uuid NOT NULL,
	"severity" "interaction_severity" NOT NULL,
	"reason" text NOT NULL,
	"specific_risks" text[],
	"alternative_oils" text[],
	"if_unavoidable" text,
	"evidence_level" text NOT NULL,
	"references" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oil_medication_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oil_id" text NOT NULL,
	"medication_id" uuid NOT NULL,
	"severity" "interaction_severity" NOT NULL,
	"mechanism" text NOT NULL,
	"potential_effects" text[],
	"recommendation" text NOT NULL,
	"alternative_oils" text[],
	"evidence_level" text NOT NULL,
	"references" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oil_safety_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oil_id" text NOT NULL,
	"pregnancy_safety" "pregnancy_safety" DEFAULT 'unknown' NOT NULL,
	"pregnancy_trimester_1_notes" text,
	"pregnancy_trimester_2_notes" text,
	"pregnancy_trimester_3_notes" text,
	"lactation_safety" "lactation_safety" DEFAULT 'insufficient' NOT NULL,
	"lactation_notes" text,
	"age_restriction" "age_restriction" DEFAULT 'all_ages' NOT NULL,
	"pediatric_notes" text,
	"geriatric_notes" text,
	"topical_safety" "route_safety" DEFAULT 'dilution_required' NOT NULL,
	"inhalation_safety" "route_safety" DEFAULT 'all_routes' NOT NULL,
	"ingestion_safety" "route_safety" DEFAULT 'avoid_ingestion' NOT NULL,
	"max_dermal_concentration" numeric(4, 2),
	"max_dermal_concentration_sensitive" numeric(4, 2),
	"ld50_oral" text,
	"ld50_dermal" text,
	"skin_irritation_potential" text,
	"sensitization_potential" text,
	"mucous_membrane_irritation" boolean DEFAULT false NOT NULL,
	"phototoxic" boolean DEFAULT false NOT NULL,
	"phototoxic_concentration" numeric(4, 2),
	"furocoumarins" text,
	"photosensitivity_duration" integer,
	"neurotoxic" boolean DEFAULT false NOT NULL,
	"hepatotoxic" boolean DEFAULT false NOT NULL,
	"nephrotoxic" boolean DEFAULT false NOT NULL,
	"carcinogenic" boolean DEFAULT false NOT NULL,
	"respiratory_sensitizer" boolean DEFAULT false NOT NULL,
	"asthma_trigger" boolean DEFAULT false NOT NULL,
	"affects_blood_pressure" text,
	"affects_heart_rate" text,
	"anticoagulant" boolean DEFAULT false NOT NULL,
	"hormone_like" boolean DEFAULT false NOT NULL,
	"estrogenic" boolean DEFAULT false NOT NULL,
	"epilepsy_warning" boolean DEFAULT false NOT NULL,
	"glaucoma_warning" boolean DEFAULT false NOT NULL,
	"common_allergens" text[],
	"cross_reactivity" text[],
	"general_safety_notes" text,
	"maximum_daily_exposure" text,
	"primary_references" text[],
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verified_by" text,
	"verified_at" timestamp,
	CONSTRAINT "oil_safety_profiles_oil_id_unique" UNIQUE("oil_id")
);
--> statement-breakpoint
CREATE TABLE "safety_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"incident_type" text NOT NULL,
	"severity" text NOT NULL,
	"oils_used" text[],
	"medications_at_time" text[],
	"conditions_at_time" text[],
	"symptoms" text[],
	"description" text,
	"onset_time" text,
	"duration" text,
	"action_taken" text,
	"resolved" boolean,
	"medical_attention_required" boolean DEFAULT false NOT NULL,
	"reported_to_healthcare_provider" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_health_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"condition_id" uuid,
	"custom_condition_name" text,
	"severity" text,
	"diagnosed_by" text,
	"diagnosis_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"managed_by" text[],
	"requires_medical_supervision" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"medication_id" uuid,
	"custom_medication_name" text,
	"dosage" text,
	"frequency" text,
	"prescribed_for" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"verified_by_healthcare_provider" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auspost_shipments" ADD CONSTRAINT "auspost_shipments_bottle_id_forever_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."forever_bottles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blend_commissions" ADD CONSTRAINT "blend_commissions_blend_id_community_blends_id_fk" FOREIGN KEY ("blend_id") REFERENCES "public"."community_blends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blend_ratings" ADD CONSTRAINT "blend_ratings_blend_id_community_blends_id_fk" FOREIGN KEY ("blend_id") REFERENCES "public"."community_blends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blend_referrals" ADD CONSTRAINT "blend_referrals_blend_id_user_blends_id_fk" FOREIGN KEY ("blend_id") REFERENCES "public"."user_blends"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blend_shares" ADD CONSTRAINT "blend_shares_blend_id_community_blends_id_fk" FOREIGN KEY ("blend_id") REFERENCES "public"."community_blends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forever_bottle_history" ADD CONSTRAINT "forever_bottle_history_bottle_id_forever_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."forever_bottles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refill_orders" ADD CONSTRAINT "refill_orders_bottle_id_forever_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."forever_bottles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oil_condition_contraindications" ADD CONSTRAINT "oil_condition_contraindications_condition_id_health_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."health_conditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oil_medication_interactions" ADD CONSTRAINT "oil_medication_interactions_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_health_conditions" ADD CONSTRAINT "user_health_conditions_condition_id_health_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."health_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_medications" ADD CONSTRAINT "user_medications_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "shipment_bottle_id_idx" ON "auspost_shipments" USING btree ("bottle_id");--> statement-breakpoint
CREATE INDEX "shipment_tracking_number_idx" ON "auspost_shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "shipment_status_idx" ON "auspost_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "batch_order_idx" ON "batch_records" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "batch_created_idx" ON "batch_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "batch_expires_idx" ON "batch_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "commission_blend_id_idx" ON "blend_commissions" USING btree ("blend_id");--> statement-breakpoint
CREATE INDEX "commission_creator_id_idx" ON "blend_commissions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "commission_order_id_idx" ON "blend_commissions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "commission_status_idx" ON "blend_commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commission_created_at_idx" ON "blend_commissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rating_blend_id_idx" ON "blend_ratings" USING btree ("blend_id");--> statement-breakpoint
CREATE INDEX "rating_user_id_idx" ON "blend_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rating_created_at_idx" ON "blend_ratings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "referral_share_code_idx" ON "blend_referrals" USING btree ("share_code");--> statement-breakpoint
CREATE INDEX "referral_referrer_idx" ON "blend_referrals" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_order_idx" ON "blend_referrals" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "referral_status_idx" ON "blend_referrals" USING btree ("credit_status");--> statement-breakpoint
CREATE INDEX "share_blend_id_idx" ON "blend_shares" USING btree ("blend_id");--> statement-breakpoint
CREATE INDEX "share_token_idx" ON "blend_shares" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "blend_creator_id_idx" ON "community_blends" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "blend_status_idx" ON "community_blends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blend_visibility_idx" ON "community_blends" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "blend_slug_idx" ON "community_blends" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blend_popularity_idx" ON "community_blends" USING btree ("popularity_score");--> statement-breakpoint
CREATE INDEX "blend_created_at_idx" ON "community_blends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transaction_customer_id_idx" ON "credit_transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "transaction_type_idx" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transaction_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transaction_expires_at_idx" ON "credit_transactions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "credit_customer_id_idx" ON "customer_credits" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "history_bottle_id_idx" ON "forever_bottle_history" USING btree ("bottle_id");--> statement-breakpoint
CREATE INDEX "history_event_type_idx" ON "forever_bottle_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "history_timestamp_idx" ON "forever_bottle_history" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "bottle_customer_id_idx" ON "forever_bottles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bottle_serial_number_idx" ON "forever_bottles" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "bottle_status_idx" ON "forever_bottles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_sku_idx" ON "inventory_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "order_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_customer_id_idx" ON "refill_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_bottle_id_idx" ON "refill_orders" USING btree ("bottle_id");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "refill_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_created_at_idx" ON "refill_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "unlocked_oils_customer_idx" ON "unlocked_oils" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "unlocked_oils_oil_idx" ON "unlocked_oils" USING btree ("oil_id");--> statement-breakpoint
CREATE INDEX "unlocked_oils_unique_idx" ON "unlocked_oils" USING btree ("customer_id","oil_id");--> statement-breakpoint
CREATE INDEX "unlocked_refill_user_id_idx" ON "unlocked_refills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "unlocked_refill_order_id_idx" ON "unlocked_refills" USING btree ("original_order_id");--> statement-breakpoint
CREATE INDEX "unlocked_refill_active_idx" ON "unlocked_refills" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "unlocked_refill_share_code_idx" ON "unlocked_refills" USING btree ("share_code");--> statement-breakpoint
CREATE INDEX "user_blend_user_id_idx" ON "user_blends" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blend_share_code_idx" ON "user_blends" USING btree ("share_code");--> statement-breakpoint
CREATE INDEX "user_blend_slug_idx" ON "user_blends" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "user_blend_public_idx" ON "user_blends" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "condition_category_idx" ON "health_conditions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "condition_search_idx" ON "health_conditions" USING btree ("search_terms");--> statement-breakpoint
CREATE INDEX "med_generic_name_idx" ON "medications" USING btree ("generic_name");--> statement-breakpoint
CREATE INDEX "med_drug_class_idx" ON "medications" USING btree ("drug_class");--> statement-breakpoint
CREATE INDEX "med_search_terms_idx" ON "medications" USING btree ("search_terms");--> statement-breakpoint
CREATE INDEX "contra_oil_id_idx" ON "oil_condition_contraindications" USING btree ("oil_id");--> statement-breakpoint
CREATE INDEX "contra_condition_id_idx" ON "oil_condition_contraindications" USING btree ("condition_id");--> statement-breakpoint
CREATE INDEX "interaction_oil_id_idx" ON "oil_medication_interactions" USING btree ("oil_id");--> statement-breakpoint
CREATE INDEX "interaction_med_id_idx" ON "oil_medication_interactions" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "unique_oil_med_interaction" ON "oil_medication_interactions" USING btree ("oil_id","medication_id");--> statement-breakpoint
CREATE INDEX "safety_oil_id_idx" ON "oil_safety_profiles" USING btree ("oil_id");--> statement-breakpoint
CREATE INDEX "safety_pregnancy_idx" ON "oil_safety_profiles" USING btree ("pregnancy_safety");--> statement-breakpoint
CREATE INDEX "safety_age_idx" ON "oil_safety_profiles" USING btree ("age_restriction");--> statement-breakpoint
CREATE INDEX "incident_user_id_idx" ON "safety_incidents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "incident_type_idx" ON "safety_incidents" USING btree ("incident_type");--> statement-breakpoint
CREATE INDEX "incident_created_idx" ON "safety_incidents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_condition_user_id_idx" ON "user_health_conditions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_condition_active_idx" ON "user_health_conditions" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "user_med_user_id_idx" ON "user_medications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_med_active_idx" ON "user_medications" USING btree ("user_id","is_active");