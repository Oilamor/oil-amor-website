/**
 * Batch Record Shelf-Life / Expiry Tests
 *
 * Batch expiry is derived from the per-oil shelf lives in the safety
 * database: a blend expires when its shortest-lived component does, falling
 * back to 24 months when no oil has a profiled shelf life. A caller-supplied
 * expiry (e.g. the label API, which prints the same date on the label) is
 * passed through unchanged so the QR page and the label always agree.
 */

jest.mock('@/lib/db', () => ({ db: {} }))

import { buildAndSaveBatchRecord, computeBatchExpiry, DEFAULT_SHELF_LIFE_MONTHS } from '../records'

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

describe('computeBatchExpiry', () => {
  it('uses the shortest shelf life across the blend (citrus caps woods)', () => {
    const made = new Date('2026-01-15T10:00:00Z')
    const expiry = computeBatchExpiry(made, ['sandalwood', 'lavender', 'lemon'])
    expect(monthsBetween(made, expiry)).toBe(12)
  })

  it('uses 24 months for standard 24-month oils', () => {
    const made = new Date('2026-01-15T10:00:00Z')
    expect(monthsBetween(made, computeBatchExpiry(made, ['lavender']))).toBe(24)
  })

  it('uses 36 months for woods/resins/roots', () => {
    const made = new Date('2026-01-15T10:00:00Z')
    expect(monthsBetween(made, computeBatchExpiry(made, ['frankincense']))).toBe(36)
  })

  it('falls back to the default shelf life for unknown oils', () => {
    const made = new Date('2026-01-15T10:00:00Z')
    expect(monthsBetween(made, computeBatchExpiry(made, ['mystery-oil']))).toBe(DEFAULT_SHELF_LIFE_MONTHS)
    expect(monthsBetween(made, computeBatchExpiry(made, [undefined, null]))).toBe(DEFAULT_SHELF_LIFE_MONTHS)
  })
})

describe('buildAndSaveBatchRecord — expiry', () => {
  it('computes expiry from the shortest-lived oil in the blend', async () => {
    const before = new Date()
    const record = await buildAndSaveBatchRecord({
      batchId: 'OA-EXP-0001',
      blendName: 'Citrus Wood Blend',
      mode: 'pure',
      size: 30,
      oils: [
        { oilId: 'cedarwood', oilName: 'Cedarwood', ml: 15, percentage: 50 },
        { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 50 },
      ],
    })

    const expiresAt = new Date(record.expiresAt)
    expect(monthsBetween(before, expiresAt)).toBe(12)
  })

  it('passes through a caller-supplied expiry instead of recomputing', async () => {
    const supplied = new Date('2027-06-01T00:00:00Z')
    const record = await buildAndSaveBatchRecord({
      batchId: 'OA-EXP-0002',
      blendName: 'Label-Synced Blend',
      mode: 'pure',
      size: 30,
      oils: [{ oilId: 'sandalwood', oilName: 'Sandalwood', ml: 30, percentage: 100 }],
      expiryDate: supplied,
    })

    expect(new Date(record.expiresAt).getTime()).toBe(supplied.getTime())
  })
})
