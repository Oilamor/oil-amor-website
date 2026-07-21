import type { Config } from "drizzle-kit";

/**
 * Canonical drizzle-kit configuration.
 *
 * - Schema: lib/db/schema.ts is the barrel that re-exports every Drizzle
 *   table (schema-refill + schema/*). It is the single source of truth.
 * - Output: ./drizzle holds the generated migration chain, including
 *   meta/_journal.json required by drizzle-orm's migrate() runner.
 *
 * Generate a new migration after changing the schema:
 *   npx drizzle-kit generate --name <change_description>
 */
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only used by drizzle-kit push/introspect — never by generate.
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
