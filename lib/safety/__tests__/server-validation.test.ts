/**
 * Server-Side Custom Mix Safety Validation — Contract Tests
 *
 * Covers lib/safety/server-validation.ts:
 * - valid mixes pass with engine-computed safety data
 * - client-tampered safety fields are ignored/overwritten
 * - unknown oils, bad volumes and Σml > totalVolume are rejected
 * - per-oil maxDilutionPercent enforcement (incl. 100% cinnamon-bark)
 * - table-driven checks over every profile in OIL_SAFETY_DATABASE
 */

import { validateCustomMixServer, getStandardOilWarnings } from '../server-validation'
import { OIL_SAFETY_DATABASE } from '../database'

const RATING_SCALE = ['excellent', 'good', 'acceptable', 'caution', 'dangerous']
const DB_ENTRIES = Object.entries(OIL_SAFETY_DATABASE)

// Oils whose profile max is under 10% — a 100% pure blend exceeds their
// leave-on limit by more than 10x and must be blocked.
const TIGHT_LIMIT_OILS = DB_ENTRIES.filter(([, p]) => p.maxDilutionPercent < 10)

describe('validateCustomMixServer — contract', () => {
  it('passes a valid carrier-mode mix', () => {
    const result = validateCustomMixServer({
      oils: [
        { oilId: 'lavender', ml: 5 },
        { oilId: 'frankincense', ml: 2.5 },
      ],
      totalVolume: 30,
      mode: 'carrier',
      carrierRatio: 25,
    })

    expect(result.canProceed).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.safetyScore).toBeGreaterThanOrEqual(0)
    expect(result.safetyScore).toBeLessThanOrEqual(100)
    expect(RATING_SCALE).toContain(result.safetyRating)
    expect(Array.isArray(result.safetyWarnings)).toBe(true)
  })

  it('ignores client-tampered safety fields and recomputes its own', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 5 }],
      totalVolume: 30,
      mode: 'carrier',
      // Tampered client-supplied fields — must not influence the result
      safetyScore: 0,
      safetyRating: 'dangerous',
      safetyWarnings: ['tampered-warning'],
    })

    expect(result.canProceed).toBe(true)
    expect(result.safetyScore).not.toBe(0)
    expect(result.safetyWarnings).not.toContain('tampered-warning')
  })

  it('rejects a tampered "100/excellent" claim on a dangerous mix', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'cinnamon-bark', ml: 30 }],
      totalVolume: 30,
      mode: 'pure',
      safetyScore: 100,
      safetyRating: 'excellent',
      safetyWarnings: [],
    })

    expect(result.canProceed).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.safetyRating).not.toBe('excellent')
  })

  it('errors on unknown oils', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'not-a-real-oil', ml: 5 }],
      totalVolume: 30,
    })

    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('Unknown oil'))).toBe(true)
  })

  it('errors on an empty oils array', () => {
    const result = validateCustomMixServer({ oils: [], totalVolume: 30 })
    expect(result.canProceed).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('errors on non-positive ml', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0 }],
      totalVolume: 30,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('lavender'))).toBe(true)
  })

  it('accepts percentage- or drops-based amounts when ml is missing', () => {
    const byPercentage = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, percentage: 16.7 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(byPercentage.canProceed).toBe(true)

    const byDrops = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, drops: 100 } as any],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(byDrops.canProceed).toBe(true)
  })

  it('errors when Σml exceeds totalVolume', () => {
    const result = validateCustomMixServer({
      oils: [
        { oilId: 'lavender', ml: 20 },
        { oilId: 'frankincense', ml: 20 },
      ],
      totalVolume: 30,
    })

    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('exceeds total mix volume'))).toBe(true)
  })

  it('errors on missing or non-positive totalVolume', () => {
    const zero = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 5 }],
      totalVolume: 0,
    })
    expect(zero.canProceed).toBe(false)

    const missing = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 5 }],
      totalVolume: NaN,
    })
    expect(missing.canProceed).toBe(false)
  })

  it('blocks a 100% pure cinnamon-bark blend (maxDilution 0.05%)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'cinnamon-bark', ml: 30 }],
      totalVolume: 30,
      mode: 'pure',
    })

    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('Cinnamon Bark'))).toBe(true)
    expect(result.safetyWarnings.some(w => w.includes('Cinnamon Bark'))).toBe(true)
  })

  it('blocks an extreme clove-bud exceedance (12% vs 0.5% max)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'clove-bud', ml: 3.6 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(false)
  })

  it('warns (but does not block) a moderate clove-bud exceedance (3.3% vs 0.5% max)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'clove-bud', ml: 1 }],
      totalVolume: 30,
      mode: 'carrier',
    })

    expect(result.canProceed).toBe(true)
    expect(result.safetyWarnings.some(w => w.includes('Maximum Dilution Exceeded'))).toBe(true)
  })

  it('allows clove-bud at its profile limit (0.5%)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'clove-bud', ml: 0.15 }],
      totalVolume: 30,
      mode: 'carrier',
    })

    expect(result.canProceed).toBe(true)
    expect(result.safetyWarnings.some(w => w.includes('Maximum Dilution Exceeded'))).toBe(false)
  })

  it('warns on bergamot above its phototoxic limit (1.67% vs 0.4% max)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'bergamot', ml: 0.5 }],
      totalVolume: 30,
      mode: 'carrier',
    })

    expect(result.canProceed).toBe(true)
    expect(result.safetyWarnings.some(w => w.includes('Bergamot'))).toBe(true)
  })
})

describe('validateCustomMixServer — table-driven over OIL_SAFETY_DATABASE', () => {
  test.each(DB_ENTRIES)('%s: no dilution violation at exactly the profile maxDilutionPercent', (oilId, profile) => {
    const totalVolume = 30
    const ml = parseFloat(((profile.maxDilutionPercent / 100) * totalVolume).toFixed(4))
    const result = validateCustomMixServer({
      oils: [{ oilId, ml }],
      totalVolume,
      mode: 'carrier',
    })

    expect(result.canProceed).toBe(true)
    expect(result.safetyWarnings.some(w => w.includes('Maximum Dilution Exceeded'))).toBe(false)
  })

  test.each(TIGHT_LIMIT_OILS)('%s: 100% pure blend is blocked (profile max < 10%)', (oilId, profile) => {
    const result = validateCustomMixServer({
      oils: [{ oilId, ml: 30 }],
      totalVolume: 30,
      mode: 'pure',
    })

    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes(profile.commonName))).toBe(true)
  })
})

describe('getStandardOilWarnings', () => {
  it('derives pregnancy-avoid warning for wintergreen', () => {
    const warnings = getStandardOilWarnings('wintergreen')
    expect(warnings.some(w => /pregnancy/i.test(w))).toBe(true)
  })

  it('derives phototoxicity warning for bergamot', () => {
    const warnings = getStandardOilWarnings('bergamot')
    expect(warnings.some(w => /sun|UV/i.test(w))).toBe(true)
  })

  it('returns an array for a gentle oil (lavender)', () => {
    expect(Array.isArray(getStandardOilWarnings('lavender'))).toBe(true)
  })

  it('never returns empty "safe" for an unknown oil', () => {
    expect(getStandardOilWarnings('not-a-real-oil')).toEqual(['Pending safety validation'])
  })
})
