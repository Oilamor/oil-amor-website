/**
 * Batch Record Safety Fallback Tests
 *
 * Labels must never default to "safe": a batch record created without
 * server-validated safety data must be marked needs-review, carry honest
 * warnings, and be flagged for admin review. The old 95/'safe'/[] fallback
 * is gone.
 */

jest.mock('@/lib/db', () => ({ db: {} }))

import { buildAndSaveBatchRecord, getBatchRecord } from '../records'

const baseInput = {
  batchId: 'OA-TEST-0001',
  blendName: 'Test Blend',
  mode: 'pure' as const,
  size: 30,
}

describe('buildAndSaveBatchRecord — safety fallbacks', () => {
  it('marks custom mixes without safety data as needs-review (atelier)', async () => {
    const record = await buildAndSaveBatchRecord({
      ...baseInput,
      isAtelier: true,
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
        { oilId: 'clove-bud', oilName: 'Clove Bud', ml: 15, percentage: 50 },
      ],
    })

    expect(record.safetyRating).toBe('needs-review')
    expect(record.safetyWarnings).toContain('Pending safety validation')
    expect(record.needsSafetyReview).toBe(true)
  })

  it('treats multi-oil blends as custom mixes even without the atelier flag', async () => {
    const record = await buildAndSaveBatchRecord({
      ...baseInput,
      batchId: 'OA-TEST-0002',
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 15, percentage: 50 },
        { oilId: 'tea-tree', oilName: 'Tea Tree', ml: 15, percentage: 50 },
      ],
    })

    expect(record.safetyRating).toBe('needs-review')
    expect(record.safetyWarnings).toContain('Pending safety validation')
    expect(record.needsSafetyReview).toBe(true)
  })

  it('never emits the old 95/"safe" fallback', async () => {
    const record = await buildAndSaveBatchRecord({
      ...baseInput,
      batchId: 'OA-TEST-0003',
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 30, percentage: 100 }],
    })

    expect(record.safetyScore).not.toBe(95)
    expect(record.safetyRating).not.toBe('safe')
    expect(record.safetyWarnings.length).toBeGreaterThan(0)
  })

  it('derives warnings from the oil profile for standard single-oil products', async () => {
    const record = await buildAndSaveBatchRecord({
      ...baseInput,
      batchId: 'OA-TEST-0004',
      oils: [{ oilId: 'wintergreen', oilName: 'Wintergreen', ml: 30, percentage: 100 }],
    })

    expect(record.safetyRating).toBe('needs-review')
    expect(record.safetyWarnings.some(w => /pregnancy/i.test(w))).toBe(true)
    expect(record.safetyWarnings).not.toContain('Pending safety validation')
  })

  it('falls back to "Pending safety validation" for unprofiled single oils', async () => {
    const record = await buildAndSaveBatchRecord({
      ...baseInput,
      batchId: 'OA-TEST-0005',
      oils: [{ oilId: 'mystery-oil', oilName: 'Mystery Oil', ml: 30, percentage: 100 }],
    })

    expect(record.safetyRating).toBe('needs-review')
    expect(record.safetyWarnings).toEqual(['Pending safety validation'])
  })

  it('passes through server-validated safety data unchanged', async () => {
    const record = await buildAndSaveBatchRecord({
      ...baseInput,
      batchId: 'OA-TEST-0006',
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 30, percentage: 100 }],
      safetyScore: 88,
      safetyRating: 'good',
      safetyWarnings: ['Patch test before use'],
    })

    expect(record.safetyScore).toBe(88)
    expect(record.safetyRating).toBe('good')
    expect(record.safetyWarnings).toEqual(['Patch test before use'])
    expect(record.needsSafetyReview).toBe(false)
  })

  it('round-trips through the in-memory store', async () => {
    const saved = await buildAndSaveBatchRecord({
      ...baseInput,
      batchId: 'OA-TEST-0007',
      isAtelier: true,
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 30, percentage: 100 }],
    })

    const fetched = await getBatchRecord('OA-TEST-0007')
    expect(fetched).not.toBeNull()
    expect(fetched!.safetyRating).toBe(saved.safetyRating)
    expect(fetched!.safetyWarnings).toEqual(saved.safetyWarnings)
  })
})
