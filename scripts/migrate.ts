#!/usr/bin/env tsx
// =============================================================================
// Database Migration Runner
// =============================================================================
// Runs the drizzle-kit migration chain in ./drizzle (generated from
// lib/db/schema.ts — the single source of truth).
//
// Commands: up, status, create, down (informational), reset (guarded).
// Connection is DATABASE_URL-only, resolved exactly like lib/db/index.ts —
// there is deliberately no host/name/user/password env fallback so the
// runner can never silently target a different database than the app.
//
// This module is import-safe: the CLI only runs when executed directly
// (`tsx scripts/migrate.ts ...`), never on import.
// =============================================================================

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { config as loadEnv } from "dotenv";

// Load .env.local for CLI use (Next loads it itself at runtime). Silently
// ignored when the file is absent (CI, tests).
loadEnv({ path: ".env.local" });

// =============================================================================
// Configuration (exported for tests and tooling)
// =============================================================================

/** Canonical drizzle-kit migration chain (SQL + meta/_journal.json). */
export const MIGRATIONS_FOLDER = join(process.cwd(), "drizzle");
export const JOURNAL_PATH = join(MIGRATIONS_FOLDER, "meta", "_journal.json");

/** Env flags guarding the destructive `reset` command. */
export const RESET_CONFIRM_FLAG = "CONFIRM_RESET";
export const RESET_PROD_FLAG = "ALLOW_DESTRUCTIVE_RESET";

type EnvLike = Record<string, string | undefined>;

/**
 * Resolve the database connection string the same way lib/db/index.ts does:
 * DATABASE_URL or nothing. Throws rather than guessing a database.
 */
export function getConnectionString(env: EnvLike = process.env): string {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required — the migration runner uses the same connection " +
        "resolution as the app (lib/db/index.ts) and has no fallback."
    );
  }
  return url;
}

/**
 * Reset is destructive (drops every table). It must be explicitly confirmed,
 * and in production it needs a second, separate acknowledgement.
 */
export function checkResetAllowed(env: EnvLike = process.env): {
  allowed: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (env[RESET_CONFIRM_FLAG] !== "yes") {
    reasons.push(`set ${RESET_CONFIRM_FLAG}=yes to confirm dropping all tables`);
  }

  if (env.NODE_ENV === "production" && env[RESET_PROD_FLAG] !== "yes") {
    reasons.push(`NODE_ENV=production also requires ${RESET_PROD_FLAG}=yes`);
  }

  return { allowed: reasons.length === 0, reasons };
}

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
  breakpoints: boolean;
}

/** Migration tags registered in the drizzle journal, in order. */
export function readJournalTags(): string[] {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as {
    entries: JournalEntry[];
  };
  return journal.entries.map((entry) => entry.tag);
}

// =============================================================================
// CLI helpers
// =============================================================================

function printHelp(): void {
  console.log(`
Database Migration Runner for Oil Amor

Usage:
  npm run migrate -- [command] [options]

Commands:
  up          Run pending migrations from ./drizzle
  status      Show applied vs pending migrations
  create      Generate a new migration via drizzle-kit
  down        Informational (drizzle has no down migrations)
  reset       Drop all tables (requires ${RESET_CONFIRM_FLAG}=yes;
              in production also ${RESET_PROD_FLAG}=yes)

Options:
  --help      Show this help message

Examples:
  npm run migrate -- up
  npm run migrate -- status
  npm run migrate -- create add_user_preferences
`);
}

function log(message: string, type: "info" | "success" | "error" | "warning" = "info"): void {
  const colors = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    error: "\x1b[31m",
    warning: "\x1b[33m",
  };
  const reset = "\x1b[0m";

  console.log(`${colors[type]}[${type.toUpperCase()}]${reset} ${message}`);
}

// =============================================================================
// Migration commands
// =============================================================================

async function migrateUp(): Promise<void> {
  if (!existsSync(JOURNAL_PATH)) {
    log(`Migration journal not found at ${JOURNAL_PATH}`, "error");
    log("Run 'npm run db:generate' to regenerate the migration chain.", "info");
    process.exit(1);
  }

  log("Connecting to database...", "info");
  const pool = new Pool({ connectionString: getConnectionString() });
  const db = drizzle(pool);

  try {
    log(`Running migrations from ${MIGRATIONS_FOLDER}...`, "info");
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    log("Migrations completed successfully!", "success");
  } catch (error) {
    log(`Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function showStatus(): Promise<void> {
  if (!existsSync(JOURNAL_PATH)) {
    log(`Migration journal not found at ${JOURNAL_PATH}`, "error");
    process.exit(1);
  }

  const tags = readJournalTags();
  const pool = new Pool({ connectionString: getConnectionString() });

  try {
    const tableCheck = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
      )
    `);

    const appliedCount = tableCheck.rows[0]?.exists
      ? Number(
          (
            await pool.query<{ count: string }>(
              "SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations"
            )
          ).rows[0]?.count ?? 0
        )
      : 0;

    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION STATUS");
    console.log("=".repeat(60) + "\n");
    console.log(`Registered in journal: ${tags.length}`);
    tags.forEach((tag) => console.log(`  • ${tag}`));
    console.log(`\nApplied in database: ${appliedCount}`);
    console.log(
      appliedCount >= tags.length
        ? "All migrations are up to date!"
        : `Pending: ${tags.length - appliedCount}`
    );
    console.log("\n" + "=".repeat(60));
  } catch (error) {
    log(`Failed to get migration status: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function createMigration(name: string): void {
  if (!name) {
    log("Migration name is required", "error");
    log("Usage: npm run migrate -- create <name>", "info");
    process.exit(1);
  }

  // drizzle-kit generate keeps SQL, snapshot, and journal coherent —
  // never hand-write files into ./drizzle.
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const result = spawnSync("npx", ["drizzle-kit", "generate", "--name", sanitized], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    log("drizzle-kit generate failed", "error");
    process.exit(result.status ?? 1);
  }

  log(`Created migration '${sanitized}' in ${MIGRATIONS_FOLDER}`, "success");
}

function migrateDown(): void {
  log("drizzle-orm does not support down migrations.", "warning");
  log("To revert: restore from backup, or generate a new migration that undoes the change.", "info");
  log("See docs/DB_RECONCILIATION.md for the production runbook.", "info");
}

async function resetDatabase(): Promise<void> {
  const check = checkResetAllowed();
  if (!check.allowed) {
    log("Reset refused:", "error");
    check.reasons.forEach((reason) => log(`  - ${reason}`, "error"));
    process.exit(1);
  }

  log("WARNING: This will drop all tables in the database!", "warning");
  log("Press Ctrl+C within 5 seconds to cancel...", "warning");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const pool = new Pool({ connectionString: getConnectionString() });

  try {
    await pool.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");

    log("Database reset complete", "success");
    log("Run 'npm run migrate -- up' to reinitialize", "info");
  } catch (error) {
    log(`Reset failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  switch (command) {
    case "up":
      await migrateUp();
      break;
    case "down":
      migrateDown();
      break;
    case "status":
      await showStatus();
      break;
    case "create":
      createMigration(args[1]);
      break;
    case "reset":
      await resetDatabase();
      break;
    default:
      log(`Unknown command: ${command}`, "error");
      printHelp();
      process.exit(1);
  }
}

// Run the CLI only when executed directly (e.g. `tsx scripts/migrate.ts`),
// never on import — tests and tooling import the helpers above.
if (require.main === module) {
  main().catch((error) => {
    log(`Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    process.exit(1);
  });
}
