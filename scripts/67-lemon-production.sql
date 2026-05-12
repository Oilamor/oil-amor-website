-- ============================================================
-- Production SQL: Create "67 Lemon" community blend
-- Run this in the Neon SQL Editor (https://console.neon.tech)
-- ============================================================

-- Ensure community_blends table exists (safe to run if already exists)
CREATE TABLE IF NOT EXISTS community_blends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  creator_bio TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  story TEXT,
  recipe JSONB NOT NULL,
  revelation_data JSONB,
  price INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'draft',
  consent_to_share BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP,
  original_order_id TEXT,
  purchase_verified_at TIMESTAMP,
  view_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  popularity_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS blend_creator_id_idx ON community_blends(creator_id);
CREATE INDEX IF NOT EXISTS blend_status_idx ON community_blends(status);
CREATE INDEX IF NOT EXISTS blend_visibility_idx ON community_blends(visibility);
CREATE INDEX IF NOT EXISTS blend_slug_idx ON community_blends(slug);
CREATE INDEX IF NOT EXISTS blend_popularity_idx ON community_blends(popularity_score);
CREATE INDEX IF NOT EXISTS blend_created_at_idx ON community_blends(created_at);

-- Insert or update the "67 Lemon" blend
INSERT INTO community_blends (
  creator_id, creator_name, creator_bio, name, slug, description, story,
  recipe, price, status, visibility, consent_to_share, consent_date,
  purchase_verified_at, published_at
) VALUES (
  'oil-amor-admin',
  'Oil Amor',
  'Artisan essential oil blends crafted with intention in the Oil Amor Atelier.',
  '67 Lemon',
  '67-lemon',
  'A bright, uplifting citrus-forward blend with warm woody undertones and a gentle spice finish. Named for the year of transformation — 1967 — this blend captures the spirit of renewal, clarity, and joyful energy. Lemongrass leads with its crisp, lemony vibrancy, supported by the creamy sweetness of Ho Wood and the sacred depth of Frankincense. Cedarwood grounds the composition, while Ginger and Clove Bud add a subtle warming spice that lingers beautifully on the skin.',
  'The "67 Lemon" blend was born from a desire to capture the essence of a perfect summer morning — when sunlight filters through lemon trees and the air is alive with possibility. Each oil was selected not just for its individual character, but for how they harmonise: Lemongrass brings the brightness, Ho Wood the softness, Frankincense the sacred pause, Cedarwood the earth, and Ginger & Clove Bud the warm embrace. It is a blend for those who seek clarity with comfort, energy with grounding.',
  '{
    "mode": "pure",
    "bottleSize": 30,
    "strength": 100,
    "oils": [
      { "oilId": "lemongrass", "name": "Lemongrass", "ml": 15.6 },
      { "oilId": "ho-wood", "name": "Ho Wood", "ml": 6.0 },
      { "oilId": "frankincense", "name": "Frankincense", "ml": 3.6 },
      { "oilId": "cedarwood", "name": "Cedarwood Atlas", "ml": 2.7 },
      { "oilId": "ginger", "name": "Ginger", "ml": 1.5 },
      { "oilId": "clove-bud", "name": "Clove Bud", "ml": 0.6 }
    ],
    "oilRatios": {
      "lemongrass": 0.52,
      "ho-wood": 0.20,
      "frankincense": 0.12,
      "cedarwood": 0.09,
      "ginger": 0.05,
      "clove-bud": 0.02
    }
  }'::jsonb,
  2995,
  'published',
  'community',
  true,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  recipe = EXCLUDED.recipe,
  description = EXCLUDED.description,
  story = EXCLUDED.story,
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  visibility = EXCLUDED.visibility,
  consent_to_share = EXCLUDED.consent_to_share,
  updated_at = NOW();

-- Verify
SELECT id, name, slug, price, status, visibility FROM community_blends WHERE slug = '67-lemon';
