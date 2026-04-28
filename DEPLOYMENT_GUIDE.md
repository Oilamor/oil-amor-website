# 🚀 Oil Amor — Production Deployment Guide

**Last updated:** April 2026 | **Next.js 15** | **Target:** Vercel Production

---

## Part 1: Vercel Environment Variables

### How to Add/Edit Variables in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your **Oil Amor** project
3. Click **Settings** tab (top nav)
4. Click **Environment Variables** in the left sidebar
5. For each variable:
   - **Key:** The exact name (case-sensitive)
   - **Value:** The secret/token/string
   - **Environment:** Check **Production** (and Preview if you want staging to work)
   - Click **Save**

> ⚠️ **Important:** Vercel redeploys automatically when you change env vars. If `SKIP_ENV_VALIDATION` is removed first, the build will fail until all required vars are added.

---

## Part 2: Required Variables — Where to Get Each One

### 🔴 `DATABASE_URL` — PostgreSQL Connection String

**What it is:** Your PostgreSQL database connection string.

**Option A: Neon (Recommended — free tier, serverless, works great with Vercel)**
1. Go to [neon.tech](https://neon.tech) → Sign up
2. Click **New Project**
3. Name it `oil-amor-prod`
4. Choose region closest to your users (e.g., `US East` for Australia, use `Asia Pacific` if available)
5. Click **Create Project**
6. On the project dashboard, click **Connection Details**
7. Copy the **Connection string** (it looks like):
   ```
   postgresql://alex:password@ep-cool-name-123456.us-east-1.aws.neon.tech/oil-amor?sslmode=require
   ```
8. Paste this entire string as `DATABASE_URL` in Vercel

**Option B: Supabase**
1. Go to [supabase.com](https://supabase.com) → New Project
2. In Project Settings → Database → Connection String → URI
3. Copy the connection string

**Option C: Vercel Postgres (if you have it enabled)**
1. In Vercel project → **Storage** tab
2. Click **Connect Store** → **Vercel Postgres**
3. It auto-populates `POSTGRES_URL` — copy that value to `DATABASE_URL`

> 💡 **Test it:** After adding to Vercel, you can test the connection by running a local build with the same string.

---

### 🔴 `SANITY_API_TOKEN` — CMS Read/Write Token

**What it is:** Allows your app to read and write content to Sanity CMS.

1. Go to [sanity.io/manage](https://sanity.io/manage)
2. Select your Oil Amor project
3. In the left sidebar, click **API** → **Tokens**
4. Click **Add API token**
5. **Token name:** `Production API`
6. **Permissions:** Select **Editor** (or **Administrator** if you need write access)
7. Click **Add token**
8. **COPY THE TOKEN IMMEDIATELY** — it only shows once
9. Paste it as `SANITY_API_TOKEN` in Vercel

> ⚠️ If you lose it, just delete the old one and create a new one.

---

### 🔴 `STRIPE_SECRET_KEY` — Live Payments

**What it is:** Your Stripe secret key for processing real payments.

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle at top right — NOT Test mode)
3. In the left sidebar: **Developers** → **API keys**
4. Under **Standard keys**, find **Secret key**
5. Click **Reveal live key** (you may need to authenticate)
6. Copy the key starting with `sk_live_...`
7. Paste as `STRIPE_SECRET_KEY` in Vercel

> 🧪 **Do NOT use `sk_test_...`** in production. That's for test cards only.

---

### 🔴 `STRIPE_WEBHOOK_SECRET` — Webhook Verification

**What it is:** Stripe uses this to sign webhook payloads so your app knows they're authentic.

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `https://oilamor.com/api/stripe/webhook`
   - Replace `oilamor.com` with your actual domain
4. Click **Select events** and check:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
5. Click **Add endpoint**
6. On the next screen, find **Signing secret**
7. Click **Reveal** and copy the secret starting with `whsec_...`
8. Paste as `STRIPE_WEBHOOK_SECRET` in Vercel

> 🔁 If you change domains later, come back here and update the endpoint URL.

---

### 🔴 `RESEND_API_KEY` — Transactional Email

**What it is:** Sends order confirmations, password resets, and admin notifications.

1. Go to [resend.com](https://resend.com) → Sign up
2. In the dashboard, click **API Keys** in the left sidebar
3. Click **Create API Key**
4. **Name:** `Production`
5. **Permission:** `Sending access`
6. Click **Create**
7. Copy the key starting with `re_...`
8. Paste as `RESEND_API_KEY` in Vercel

> 📧 You'll also want to verify your sending domain in Resend (e.g., `oilamor.com`) so emails don't go to spam.

---

### 🔴 `ADMIN_API_KEY` — API Bearer Token

**What it is:** A long random string you create yourself. Used for machine-to-machine admin API access.

**How to generate it:**

**On Mac/Linux:**
```bash
openssl rand -hex 32
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
```

**Or just use any password manager** to generate a 48-character random string.

Paste this random string as `ADMIN_API_KEY` in Vercel.

> 🔒 This is like a master password for your admin API. Never share it. Store it in your password manager.

---

### 🔴 `IRON_SESSION_PASSWORD` — Session Encryption

**What it is:** Encrypts admin session cookies. Must be **at least 32 characters**.

**How to generate it:**

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
```

Paste the result as `IRON_SESSION_PASSWORD` in Vercel.

> 🔄 If you ever change this, all existing admin sessions will be logged out. That's fine — just log back in.

---

### 🔴 `NEXT_PUBLIC_SANITY_PROJECT_ID` — Public CMS ID

**What it is:** The same value as `SANITY_PROJECT_ID`, but prefixed with `NEXT_PUBLIC_` so Next.js exposes it to the browser.

1. Go back to [sanity.io/manage](https://sanity.io/manage)
2. Your project ID is shown at the top of the page (e.g., `abc123de`)
3. Copy that same ID
4. Paste as `NEXT_PUBLIC_SANITY_PROJECT_ID` in Vercel

> 💡 It should be the exact same string as `SANITY_PROJECT_ID`.

---

## Part 3: Optional But Recommended

### `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

**What it is:** Redis cache for rate limiting and session storage.

1. Go to [console.upstash.com](https://console.upstash.com) → Sign up
2. Click **Create Database**
3. **Name:** `oil-amor-prod`
4. **Region:** Choose closest to your users
5. **Eviction:** `Allkeys-lru` (recommended)
6. Click **Create**
7. In the database dashboard, find:
   - **REST API** → **UPSTASH_REDIS_REST_URL** (e.g., `https://fine-marmot-12345.upstash.io`)
   - **REST API** → **UPSTASH_REDIS_REST_TOKEN** (long random string)
8. Add both to Vercel

> 💡 Without Redis, rate limiting will be disabled (fail-open for general traffic, fail-closed for auth).

---

### `AUSPOST_API_KEY` + `AUSPOST_API_SECRET`

**What it is:** Australia Post API for shipping labels and rates.

1. Go to [developers.auspost.com.au](https://developers.auspost.com.au)
2. Sign up / Log in
3. Go to **My Apps** → **Create App**
4. Name it `Oil Amor`
5. Once created, you'll get:
   - **API Key** → `AUSPOST_API_KEY`
   - **API Secret** → `AUSPOST_API_SECRET`
6. Add both to Vercel

---

### `SENTRY_DSN` + `SENTRY_AUTH_TOKEN`

**What it is:** Error tracking and performance monitoring.

1. Go to [sentry.io](https://sentry.io) → Sign up
2. Create a new project → **Next.js**
3. Name it `oil-amor`
4. Sentry will show you a DSN — copy the full URL starting with `https://...`
5. Paste as `SENTRY_DSN` in Vercel
6. In Sentry → **Settings** → **Auth Tokens** → **Create New Token**
7. Give it `project:write` and `org:read` scopes
8. Copy the token and paste as `SENTRY_AUTH_TOKEN` in Vercel

---

## Part 4: Clean Up Dead Variables

In Vercel → Settings → Environment Variables, **delete** these:

| Variable | Reason |
|----------|--------|
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Shopify removed |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Shopify removed |
| `SHOPIFY_STOREFRONT_API_VERSION` | Shopify removed |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_VERSION` | Shopify removed (if it exists) |

Also remove `SKIP_ENV_VALIDATION` from **Production** (keep in Development only).

---

## Part 5: Final Checklist Before First Deploy

After adding all variables, your Vercel Environment Variables page should have:

### Required (8)
- [ ] `DATABASE_URL`
- [ ] `SANITY_PROJECT_ID`
- [ ] `SANITY_API_TOKEN`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `ADMIN_API_KEY`
- [ ] `IRON_SESSION_PASSWORD`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (you already have)
- [ ] `NEXT_PUBLIC_SANITY_PROJECT_ID`
- [ ] `NEXT_PUBLIC_APP_URL` (you already have)

### Optional (5)
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `AUSPOST_API_KEY`
- [ ] `AUSPOST_API_SECRET`
- [ ] `SENTRY_DSN`

### Removed (4)
- [ ] `SKIP_ENV_VALIDATION` (from Production)
- [ ] `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- [ ] `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- [ ] `SHOPIFY_STOREFRONT_API_VERSION`

---

## Part 6: Database Migrations

After the first successful deploy, run the migration to create tables:

### Option A: API Route (Easiest)
1. Add a temporary env var in Vercel:
   - Key: `ALLOW_DDL`
   - Value: `true`
   - Environment: Production
2. Add another temporary env var:
   - Key: `DB_SETUP_KEY`
   - Value: Any random string you choose (e.g., `setup-2026-audit`)
3. Trigger a redeploy (Vercel does this automatically)
4. Run:
   ```bash
   curl -X POST https://oilamor.com/api/db/migrate \
     -H "Content-Type: application/json" \
     -d '{"key":"setup-2026-audit"}'
   ```
5. Delete `ALLOW_DDL` and `DB_SETUP_KEY` from Vercel immediately after

### Option B: Direct SQL (If you have database access)
```bash
# Connect to your database
psql $DATABASE_URL -f scripts/migrations/001_initial_schema.sql
psql $DATABASE_URL -f scripts/migrations/002_refill_system_tables.sql
```

> 🔒 **Never leave `ALLOW_DDL=true` in production.** It allows anyone with the setup key to modify your database schema.

---

## Part 7: Smoke Test After Deploy

Once the GitHub Actions pipeline finishes:

1. **Homepage loads:** Visit `https://oilamor.com` ✅
2. **Oil pages work:** Click any oil → `/oil/lavender-essential-oil` ✅
3. **Add to cart:** Click "Configure" → select options → Add to Cart ✅
4. **Checkout starts:** Go to `/checkout` → should redirect to Stripe ✅
5. **Test payment:** Use Stripe test card `4242 4242 4242 4242` ✅
6. **Webhook received:** Check Stripe Dashboard → Developers → Webhooks → recent events ✅
7. **Admin login:** Visit `/admin` → login with Bearer token ✅

---

**Questions?** If any step is unclear, tell me which variable you're working on and I'll expand the instructions.
