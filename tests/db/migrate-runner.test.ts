/**
 * Migration runner (scripts/migrate.ts) unit tests.
 *
 * No database required: only the exported pure helpers are exercised —
 * DATABASE_URL resolution and the destructive-reset guard. Importing the
 * module must not run the CLI (guarded by an argv[1] check); this import
 * succeeding without side effects is itself under test.
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  MIGRATIONS_FOLDER,
  JOURNAL_PATH,
  RESET_CONFIRM_FLAG,
  RESET_PROD_FLAG,
  getConnectionString,
  checkResetAllowed,
  readJournalTags,
} from '@/scripts/migrate'

describe('module import safety', () => {
  test('importing scripts/migrate.ts does not execute the CLI or exit', () => {
    // If main() had run on import, jest would have printed help output or the
    // process would have exited. Reaching this assertion proves the guard works.
    expect(typeof getConnectionString).toBe('function')
    expect(typeof checkResetAllowed).toBe('function')
  })
})

describe('getConnectionString (env resolution, same as lib/db/index.ts)', () => {
  test('returns DATABASE_URL when set', () => {
    expect(getConnectionString({ DATABASE_URL: 'postgres://u:p@host:5432/db' })).toBe(
      'postgres://u:p@host:5432/db'
    )
  })

  test('trims surrounding whitespace', () => {
    expect(getConnectionString({ DATABASE_URL: '  postgres://u:p@host/db  ' })).toBe(
      'postgres://u:p@host/db'
    )
  })

  test('throws when DATABASE_URL is missing', () => {
    expect(() => getConnectionString({})).toThrow(/DATABASE_URL is required/)
  })

  test('throws when DATABASE_URL is empty or blank', () => {
    expect(() => getConnectionString({ DATABASE_URL: '' })).toThrow()
    expect(() => getConnectionString({ DATABASE_URL: '   ' })).toThrow()
  })

  test('never falls back to DB_HOST/DB_NAME style config', () => {
    expect(() =>
      getConnectionString({ DB_HOST: 'localhost', DB_NAME: 'oil_amor' })
    ).toThrow(/DATABASE_URL is required/)
  })
})

describe('checkResetAllowed (destructive reset guard)', () => {
  test('refuses when no confirmation flags are set', () => {
    const result = checkResetAllowed({})
    expect(result.allowed).toBe(false)
    expect(result.reasons.join(' ')).toContain(RESET_CONFIRM_FLAG)
  })

  test('refuses when CONFIRM_RESET is not exactly "yes"', () => {
    expect(checkResetAllowed({ [RESET_CONFIRM_FLAG]: 'true' }).allowed).toBe(false)
    expect(checkResetAllowed({ [RESET_CONFIRM_FLAG]: 'YES' }).allowed).toBe(false)
    expect(checkResetAllowed({ [RESET_CONFIRM_FLAG]: '1' }).allowed).toBe(false)
  })

  test('allows with CONFIRM_RESET=yes outside production', () => {
    expect(checkResetAllowed({ [RESET_CONFIRM_FLAG]: 'yes' }).allowed).toBe(true)
    expect(
      checkResetAllowed({ [RESET_CONFIRM_FLAG]: 'yes', NODE_ENV: 'development' }).allowed
    ).toBe(true)
    expect(
      checkResetAllowed({ [RESET_CONFIRM_FLAG]: 'yes', NODE_ENV: 'test' }).allowed
    ).toBe(true)
  })

  test('refuses in production without ALLOW_DESTRUCTIVE_RESET', () => {
    const result = checkResetAllowed({
      [RESET_CONFIRM_FLAG]: 'yes',
      NODE_ENV: 'production',
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons.join(' ')).toContain(RESET_PROD_FLAG)
  })

  test('allows in production only when both flags are set', () => {
    const result = checkResetAllowed({
      [RESET_CONFIRM_FLAG]: 'yes',
      [RESET_PROD_FLAG]: 'yes',
      NODE_ENV: 'production',
    })
    expect(result.allowed).toBe(true)
    expect(result.reasons).toEqual([])
  })

  test('production refusal reports both missing flags when neither is set', () => {
    const result = checkResetAllowed({ NODE_ENV: 'production' })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toHaveLength(2)
  })
})

describe('runner wiring', () => {
  test('MIGRATIONS_FOLDER points at the drizzle-kit chain, not scripts/migrations', () => {
    expect(MIGRATIONS_FOLDER.replace(/\\/g, '/')).toMatch(/\/drizzle$/)
    expect(MIGRATIONS_FOLDER).not.toContain('scripts')
  })

  test('JOURNAL_PATH exists on disk', () => {
    expect(existsSync(JOURNAL_PATH)).toBe(true)
  })

  test('readJournalTags returns the registered migration tags in order', () => {
    const tags = readJournalTags()
    expect(tags.length).toBeGreaterThanOrEqual(1)
    expect(tags[0]).toBe('0000_initial_schema')
  })

  test('scripts/migrate.ts source uses DATABASE_URL and no DB_HOST fallback', () => {
    const source = readFileSync(
      join(process.cwd(), 'scripts', 'migrate.ts'),
      'utf8'
    )
    expect(source).toContain('DATABASE_URL')
    // No env-var fallback resolution (prose mentions in comments are fine).
    expect(source).not.toMatch(/process\.env\.DB_(HOST|NAME|USER|PASSWORD|PORT)/)
    expect(source).not.toMatch(/env\.DB_(HOST|NAME|USER|PASSWORD|PORT)\b/)
  })
})
