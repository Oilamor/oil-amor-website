# Database Reconciliation Report

Date: 2026-07-21
Scope: schema/migration reconciliation only. **Nothing in this change was run
against any database.** This document explains what was wrong, what the
canonical setup now is, and a safe runbook for bringing an existing production
database in line.

---

## 1. The split-brain state we found

The repo had **two competing descriptions of the database**:

- **Hand-written SQL** in `scripts/migrations/001–005` (now archived in
  `scripts/migrations/legacy/`).
- **The Drizzle ORM schema** in `lib/db/` — what the running application
  actually uses (`lib/db/index.ts` builds the Drizzle client from
  `lib/db/schema.ts`).

The Drizzle schema is the source of truth. Everything else has been
subordinated to it.

### 1.1 Tables with conflicting shapes (same name, different definition)

| Table | Legacy SQL (001/002) | Drizzle schema (canonical) |
|---|---|---|
| `forever_bottles` | `uuid` id (`uuid_generate_v4()`), Shopify `order_id`/`order_number`, `bottle_sku`, `bottle_size` CHECK (10/30/50ml), `bottle_material`, `total_credits`/`credits_remaining`, status CHECK (`active`/`exhausted`/`cancelled`) | `text` id, `customer_id`, `serial_number` UNIQUE, `oil_type`, `capacity` default `'100ml'`, `purchase_date`, `bottle_status` enum, `current_fill_level`, `refill_count`, `return_label`/`metadata` jsonb |
| `refill_orders` | `uuid` id, nullable `bottle_id` FK `ON DELETE SET NULL`, `customer_address` jsonb, `DECIMAL(10,2)` price columns, `shopify_order_id`, status CHECK list | `text` id, required `bottle_id` FK `ON DELETE CASCADE`, `refill_order_status` enum, `return_label`/`pricing`/`inspection_result` jsonb, no Shopify column |
| `audit_logs` | Event log: `event_type`, `actor_type`/`actor_id`/`actor_email`, `target_type`/`target_id`, `previous_state`/`new_state`, `ip_address` | Admin change log: `admin_id`, `action`, `entity_type`/`entity_id`, `before`/`after` jsonb |

Because `scripts/create-refill-tables.ts` used `CREATE TABLE IF NOT EXISTS`
with the *Drizzle* shape while `001`/`002` used plain `CREATE TABLE` with the
*legacy* shape, **whichever ran first won, silently** — two databases could
have divergent `forever_bottles` definitions and nothing would complain until
a query failed at runtime.

### 1.2 Legacy-only tables (created by SQL, never used by the app)

`refill_credits`, `shipments`, `shipment_tracking_events`,
`customer_sessions`, `synergy_selections`, `webhook_events`,
`customer_rewards`, `credit_reservations`, `notifications`, plus views
(`active_bottles_with_credits`, `pending_shipments`,
`customer_refill_summary`) and extensions (`uuid-ossp`, `moddatetime`).

### 1.3 Drizzle-only tables (used by the app, never migrated)

`community_blends`, `blend_ratings`, `blend_shares`, `user_blend_stats`,
`blend_commissions`, `user_blends`, `blend_referrals`, `unlocked_refills`,
`inventory_items`, `customer_credits`, `credit_transactions`, `unlocked_oils`,
and the eight safety tables (`medications`, `oil_medication_interactions`,
`health_conditions`, `oil_condition_contraindications`,
`oil_safety_profiles`, `user_medications`, `user_health_conditions`,
`safety_incidents`). Roughly 13+ tables the app queries had no migration at
all.

### 1.4 Broken tooling

- `scripts/migrate.ts` called drizzle-orm's `migrate()` against
  `scripts/migrations/`, which had **no `meta/_journal.json`** — the runner
  could not work at all. It also connected via `DB_HOST`/`DB_NAME`/
  `DB_USER`/`DB_PASSWORD` with localhost defaults while the app and
  drizzle-kit used `DATABASE_URL`.
- `scripts/seed-database.ts` inserted into `oils`, `crystals`, `synergies`,
  `cords`, `charms` — tables defined **nowhere** (not in Drizzle, not in the
  SQL migrations). Dead seed; deleted.
- `scripts/create-refill-tables.ts` duplicated part of the schema as raw SQL;
  deleted (its purpose is served by the canonical chain).

### 1.5 Drizzle schema internal review (task #1)

All Drizzle files were mapped and cross-checked:

- `lib/db/schema.ts` — barrel, re-exports everything below (except
  `schema/orders`).
- `lib/db/schema-refill.ts` — 12 tables (`forever_bottles`,
  `forever_bottle_history`, `refill_orders`, `customer_credits`,
  `credit_transactions`, `auspost_shipments`, `inventory_items`, `customers`,
  `orders`, `audit_logs`, `unlocked_oils`, `batch_records`) + 6 enums.
- `lib/db/schema/community-blends.ts` — 5 tables + 3 enums.
- `lib/db/schema/user-blends.ts` — 2 tables.
- `lib/db/schema/unlocked-refills.ts` — 1 table.
- `lib/db/schema/safety-comprehensive.ts` — 8 tables + 5 enums.
- `lib/db/schema/orders.ts` — **types-only** module (no `pgTable`); app code
  imports order DTO types from it.

**No genuine conflicts found**: no duplicate table names, enum names, or
index names across files; all FK references resolve within the set; the
barrel's overlapping `export *` re-exports point at the same symbols (e.g.
`communityBlends` reaches `schema.ts` both directly and via the named
re-exports at the bottom of `schema-refill.ts` — same binding, harmless).

Two `Order` *types* exist (the Drizzle select type in `schema-refill.ts` and
the DTO interface in `schema/orders.ts`). That is why the barrel does not
re-export `schema/orders` — only the file's misleading comment was wrong;
the comment was corrected. **No column shapes were changed.**

---

## 2. The canonical setup now

| Piece | Location | Notes |
|---|---|---|
| Schema (source of truth) | `lib/db/schema.ts` (barrel over `lib/db/schema-refill.ts` + `lib/db/schema/*`) | Edit tables here, never in generated SQL |
| drizzle-kit config | `drizzle.config.ts` (repo root) | `schema: ./lib/db/schema.ts`, `out: ./drizzle` |
| Migration chain | `drizzle/` | `0000_initial_schema.sql` + `meta/_journal.json` + `meta/0000_snapshot.json`; covers **all 28 tables and 14 enums** |
| Migration runner | `scripts/migrate.ts` | Commands: `up`, `down` (informational), `status`, `create`, `reset` |
| npm scripts | `package.json` | `npm run migrate`, `migrate:status`, `migrate:create`, `db:generate` |
| Legacy SQL | `scripts/migrations/legacy/` | Archived with README; **must not be run** |

The old `scripts/drizzle.config.ts` (pointed at the monolithic schema and the
journal-less `scripts/migrations/` folder) was removed in favour of the root
config.

### Runner behaviour worth knowing

- Connection comes from **`DATABASE_URL` only**, matching `lib/db/index.ts`.
  For CLI convenience, `.env.local` is loaded via dotenv when `DATABASE_URL`
  is not already exported. There is no `DB_HOST`/`DB_NAME` fallback anymore —
  the runner fails fast instead of silently targeting localhost.
- `migrate create <name>` delegates to `drizzle-kit generate` so the SQL,
  snapshot, and journal always stay coherent.
- `reset` drops everything and is now guarded: it requires
  `CONFIRM_RESET=yes`, and when `NODE_ENV=production` it additionally requires
  `ALLOW_DESTRUCTIVE_RESET=yes`. It still pauses 5 s before executing.

### Day-to-day workflow

```bash
# 1. Change the schema in lib/db/...
# 2. Generate a migration (SQL + journal entry)
npm run db:generate -- --name <change_description>
#    (or: npm run migrate:create -- <change_description>)
# 3. Review the generated SQL in drizzle/
# 4. Apply to your DEVELOPMENT database
npm run migrate up
# 5. Commit drizzle/ together with the schema change
```

`drizzle-kit generate` needs no database connection; `migrate up/status/reset`
do.

---

## 3. Runbook: bringing an EXISTING production database in line

> ⚠️ **Read fully before touching production.** Every step that changes
> anything is explicitly marked. Steps not marked are read-only inspections.

### Step 0 — Classify the database (read-only)

Figure out which of these states production is in:

- **State A — virgin/empty**: no app tables. → Skip to step 4, just run
  `migrate up`.
- **State B — Drizzle-shaped already**: tables were created via
  `create-refill-tables.ts` / `004`/`005` (text ids, jsonb pricing). → Small
  gap: missing Drizzle-only tables. Go to step 3.
- **State C — legacy-shaped**: tables were created from `001`/`002` (uuid ids,
  `bottle_sku`, `total_credits`, …). → Real data migration needed. Go to
  step 2, then 3.

How to tell (read-only):

```sql
-- Legacy shape? (state C)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'forever_bottles'
  AND column_name IN ('bottle_sku', 'total_credits', 'bottle_size');

-- Drizzle shape? (state B)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'forever_bottles'
  AND column_name IN ('serial_number', 'oil_type', 'current_fill_level');
```

### Step 1 — BACK UP FIRST (mandatory)

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

Verify the backup restores into a scratch database **before** proceeding.
Do not continue without a verified restore.

### Step 2 — Inspect the real diff (read-only)

Never guess the diff; generate it from the live database:

```bash
# Introspect the live DB into a drizzle snapshot (read-only; writes only
# local files under ./drizzle-introspect/)
npx drizzle-kit introspect --out=drizzle-introspect

# Compare the introspected DB against the canonical schema:
# print the exact statements needed, WITHOUT executing them
npx drizzle-kit push --dry-run   # or pipe to a file and review
```

(`push --dry-run` prints the DDL it *would* run. Do **not** run plain
`drizzle-kit push` — push applies changes immediately and can be lossy.)

Also diff manually for the conflicting tables:

```sql
\d+ forever_bottles
\d+ refill_orders
\d+ audit_logs
```

### Step 3 — Write a hand-reviewed ALTER script

From the step-2 output, prepare a **single reviewed SQL script** (kept in
version control, e.g. `scripts/migrations/manual/prod_reconcile_YYYYMM.sql`)
that:

1. For **state C** databases, converts conflicting tables. Typical pattern —
   create new shape alongside, copy, swap (example sketch only — adapt from
   the actual diff):
   ```sql
   BEGIN;
   ALTER TABLE forever_bottles RENAME TO forever_bottles_legacy;
   -- create forever_bottles in the Drizzle shape (copy DDL from drizzle/0000_initial_schema.sql)
   -- INSERT INTO forever_bottles (...) SELECT <mapped columns> FROM forever_bottles_legacy;
   -- verify row counts, then DROP TABLE forever_bottles_legacy;
   COMMIT;
   ```
   Notes:
   - uuid→text id conversion: cast `id::text`, and remap every referencing FK
     (`refill_orders.bottle_id`, `auspost_shipments.bottle_id`,
     `forever_bottle_history.bottle_id`) in the same transaction.
   - Legacy-only tables (`refill_credits`, `shipments`, …) have no app code;
     export their data for the record, then drop them in a later cleanup once
     the app is verified.
2. Adds the **missing Drizzle-only tables** (state B and C): replay the
   relevant `CREATE TABLE`/`CREATE TYPE` statements from
   `drizzle/0000_initial_schema.sql` for tables that don't exist yet
   (`community_blends`, `blend_ratings`, `blend_shares`, `user_blend_stats`,
   `blend_commissions`, `user_blends`, `blend_referrals`, `unlocked_refills`,
   `inventory_items`, `customer_credits`, `credit_transactions`,
   `unlocked_oils`, safety tables, and any missing enums).
3. Drops nothing that still contains un-migrated data.

Review the script with a second engineer. Test it end-to-end on a **staging
copy restored from the production backup** before production.

### Step 4 — Register the baseline, then hand over to drizzle

After the manual script, the database matches `drizzle/0000_initial_schema.sql`
but drizzle's bookkeeping table doesn't know that. Baseline it:

```sql
-- Create drizzle's bookkeeping schema/table exactly as migrate() would,
-- then mark migration 0000 as applied (the hash must match the file's hash;
-- get it from a fresh dev DB where 'migrate up' was run, or from
-- drizzle/meta/0000_snapshot.json tooling output).
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('<hash-of-0000_initial_schema>', <unix-ms>);
```

Alternatively, on a **state A** database just run `npm run migrate up` and
the bookkeeping is created automatically.

### Step 5 — Verify

```bash
npm run migrate:status    # 0 pending
```

Then run the app's smoke tests against staging, and only afterwards repeat
the verified script against production inside a maintenance window.

### Hard rules

- **Never** run `drizzle-kit push` against production.
- **Never** run `npm run migrate reset` against production (guarded: needs
  `CONFIRM_RESET=yes` *and* `ALLOW_DESTRUCTIVE_RESET=yes` with
  `NODE_ENV=production` — do not set these in production).
- **Never** run the files in `scripts/migrations/legacy/`.
- Every production change: backup → staging rehearsal → reviewed script →
  maintenance window.
