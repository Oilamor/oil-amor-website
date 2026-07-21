/**
 * Migration folder integrity tests.
 *
 * These tests require no database. They verify that the canonical
 * drizzle-kit generated migration chain in ./drizzle is complete and
 * coherent: journal <-> SQL files <-> snapshots, and that the generated
 * SQL actually covers every table defined in the Drizzle schema barrel
 * (lib/db/schema.ts) — the regression guard against the pre-reconciliation
 * state where ~13 Drizzle tables had no migration at all.
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { is, getTableName } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import * as schema from '@/lib/db/schema'

const DRIZZLE_DIR = join(process.cwd(), 'drizzle')
const JOURNAL_PATH = join(DRIZZLE_DIR, 'meta', '_journal.json')

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}

function readJournal(): { entries: JournalEntry[] } {
  return JSON.parse(readFileSync(JOURNAL_PATH, 'utf8'))
}

function sqlFiles(): string[] {
  return readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

function schemaTableNames(): string[] {
  const names = Object.values(schema)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableName(table))
  return [...new Set(names)].sort()
}

describe('drizzle migration folder integrity', () => {
  test('meta/_journal.json exists and parses', () => {
    expect(existsSync(JOURNAL_PATH)).toBe(true)
    const journal = readJournal()
    expect(Array.isArray(journal.entries)).toBe(true)
  })

  test('journal has at least one entry', () => {
    expect(readJournal().entries.length).toBeGreaterThanOrEqual(1)
  })

  test('journal entries have sequential idx starting at 0', () => {
    const entries = readJournal().entries
    entries.forEach((entry, i) => {
      expect(entry.idx).toBe(i)
    })
  })

  test('journal entry timestamps are non-decreasing', () => {
    const entries = readJournal().entries
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].when).toBeGreaterThanOrEqual(entries[i - 1].when)
    }
  })

  test('every journal entry has a matching <tag>.sql file', () => {
    const files = new Set(sqlFiles())
    for (const entry of readJournal().entries) {
      expect(files.has(`${entry.tag}.sql`)).toBe(true)
    }
  })

  test('every journal entry has a matching meta snapshot', () => {
    for (const entry of readJournal().entries) {
      const snapshot = join(
        DRIZZLE_DIR,
        'meta',
        `${String(entry.idx).padStart(4, '0')}_snapshot.json`
      )
      expect(existsSync(snapshot)).toBe(true)
    }
  })

  test('every .sql file in drizzle/ is registered in the journal', () => {
    const tags = new Set(readJournal().entries.map((e) => `${e.tag}.sql`))
    for (const file of sqlFiles()) {
      expect(tags.has(file)).toBe(true)
    }
  })

  test('journal entry count matches .sql file count', () => {
    expect(readJournal().entries.length).toBe(sqlFiles().length)
  })

  test('generated SQL contains statement breakpoints (required by migrate())', () => {
    for (const file of sqlFiles()) {
      const sql = readFileSync(join(DRIZZLE_DIR, file), 'utf8')
      expect(sql).toContain('--> statement-breakpoint')
    }
  })
})

describe('generated SQL covers the whole Drizzle schema', () => {
  test('schema barrel exposes at least 28 tables', () => {
    expect(schemaTableNames().length).toBeGreaterThanOrEqual(28)
  })

  test('every Drizzle table has a CREATE TABLE in the migration chain', () => {
    const allSql = sqlFiles()
      .map((f) => readFileSync(join(DRIZZLE_DIR, f), 'utf8'))
      .join('\n')
    const createdTables = new Set(
      [...allSql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((m) => m[1])
    )
    for (const tableName of schemaTableNames()) {
      expect(createdTables.has(tableName)).toBe(true)
    }
  })

  test('previously unmigrated tables are now covered', () => {
    // Regression list: tables the app used but no migration ever created.
    const previouslyMissing = [
      'community_blends',
      'blend_ratings',
      'blend_shares',
      'user_blend_stats',
      'blend_commissions',
      'user_blends',
      'blend_referrals',
      'unlocked_refills',
      'inventory_items',
      'customer_credits',
      'credit_transactions',
      'unlocked_oils',
      'medications',
      'oil_safety_profiles',
      'safety_incidents',
    ]
    const allSql = sqlFiles()
      .map((f) => readFileSync(join(DRIZZLE_DIR, f), 'utf8'))
      .join('\n')
    for (const table of previouslyMissing) {
      expect(allSql).toContain(`CREATE TABLE "${table}"`)
    }
  })

  test('all 14 pgEnums are created in the migration chain', () => {
    const expectedEnums = [
      'bottle_status',
      'refill_order_status',
      'credit_transaction_type',
      'shipment_status',
      'order_status',
      'payment_status',
      'blend_visibility',
      'blend_status',
      'commission_status',
      'pregnancy_safety',
      'lactation_safety',
      'age_restriction',
      'route_safety',
      'interaction_severity',
    ]
    const allSql = sqlFiles()
      .map((f) => readFileSync(join(DRIZZLE_DIR, f), 'utf8'))
      .join('\n')
    for (const enumName of expectedEnums) {
      expect(allSql).toContain(`"${enumName}" AS ENUM`)
    }
  })
})

describe('legacy and dead scripts are neutralized', () => {
  test('scripts/migrations has no runnable .sql files at its top level', () => {
    const topLevel = readdirSync(join(process.cwd(), 'scripts', 'migrations'))
    expect(topLevel.filter((f) => f.endsWith('.sql'))).toEqual([])
  })

  test('legacy SQL is archived with a README warning', () => {
    const legacyDir = join(process.cwd(), 'scripts', 'migrations', 'legacy')
    const files = readdirSync(legacyDir)
    expect(files.filter((f) => f.endsWith('.sql')).length).toBe(5)
    expect(files).toContain('README.md')
  })

  test('conflicting one-off scripts are deleted', () => {
    expect(existsSync(join(process.cwd(), 'scripts', 'create-refill-tables.ts'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'scripts', 'seed-database.ts'))).toBe(false)
  })

  test('drizzle.config.ts points at the schema barrel and ./drizzle', () => {
    const config = readFileSync(join(process.cwd(), 'drizzle.config.ts'), 'utf8')
    expect(config).toContain('./lib/db/schema.ts')
    expect(config).toContain('./drizzle')
  })
})
