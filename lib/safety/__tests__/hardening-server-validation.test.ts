/**
 * Hardening Tests — Server-Side Mix Validation (lib/safety/server-validation.ts)
 *
 * Paths beyond the contract suite:
 * - ml / percentage / drops input styles and their precedence
 * - carrierRatio passthrough (accepted, must not influence the result)
 * - error message quality and aggregation
 * - structural degenerate inputs (non-array oils, null entries, bad types)
 * - getStandardOilWarnings for known vs unknown oils, per-warning-type coverage
 */

import { validateCustomMixServer, getStandardOilWarnings } from '../server-validation'
import { getOilSafetyProfile } from '../database'

// ============================================================================
// INPUT STYLES — ml / percentage / drops
// ============================================================================

describe('validateCustomMixServer — input styles', () => {
  it('accepts a plain ml-based mix', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 3 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('uses percentage when ml is zero, computing ml from totalVolume', () => {
    // 5% of 30ml = 1.5ml lavender — comfortably inside limits
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, percentage: 5 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
  })

  it('uses percentage when ml is negative', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: -2, percentage: 5 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
  })

  it('uses percentage when ml is NaN', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: NaN, percentage: 5 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
  })

  it('prefers a valid ml over percentage (ml wins)', () => {
    // ml = 1.5 (fine) but percentage = 90 (would exceed volume) — if ml did
    // not win, the Σml check would fail.
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 1.5, percentage: 90 }],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('falls back to drops (20/ml) when ml and percentage are both unusable', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, percentage: NaN, drops: 30 } as any],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
  })

  it('percentage beats drops when both could apply', () => {
    // percentage 50 → 15ml (over 25% lavender max → dilution warning);
    // drops 20 → 1ml (no warning). Warning presence proves percentage won.
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, percentage: 50, drops: 20 } as any],
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.safetyWarnings.some(w => w.includes('Maximum Dilution Exceeded'))).toBe(true)
  })

  it('converts drops at exactly 20/ml (boundary: 1 drop = 0.05ml)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'clove-bud', ml: 0, drops: 3 } as any], // 0.15ml = 0.5% = clove max
      totalVolume: 30,
      mode: 'carrier',
    })
    expect(result.canProceed).toBe(true)
    expect(result.safetyWarnings.some(w => w.includes('Maximum Dilution Exceeded'))).toBe(false)
  })

  it('rejects drops ≤ 0 as a volume source', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, drops: 0 } as any],
      totalVolume: 30,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('lavender'))).toBe(true)
  })

  it('rejects a mix when percentage-derived ml cannot be computed (bad totalVolume)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 0, percentage: 5 }],
      totalVolume: 0,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('totalVolume'))).toBe(true)
    expect(result.errors.some(e => e.includes('lavender'))).toBe(true)
  })

  it('flags Σml > totalVolume even when derived from percentages', () => {
    const result = validateCustomMixServer({
      oils: [
        { oilId: 'lavender', ml: 0, percentage: 60 },
        { oilId: 'frankincense', ml: 0, percentage: 60 },
      ],
      totalVolume: 30,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('exceeds total mix volume'))).toBe(true)
  })

  it('tolerates Σml within 0.01ml of totalVolume (float tolerance)', () => {
    const within = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 30.005 }],
      totalVolume: 30,
      mode: 'pure',
    })
    expect(within.errors.filter(e => e.includes('exceeds total mix volume'))).toHaveLength(0)

    const beyond = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 30.02 }],
      totalVolume: 30,
      mode: 'pure',
    })
    expect(beyond.errors.some(e => e.includes('exceeds total mix volume'))).toBe(true)
  })
})

// ============================================================================
// CARRIER RATIO & MODE PASSTHROUGH
// ============================================================================

describe('validateCustomMixServer — carrierRatio / mode handling', () => {
  it('carrierRatio does not influence the safety outcome', () => {
    const mix = {
      oils: [{ oilId: 'lavender', ml: 1.5 }],
      totalVolume: 30,
      mode: 'carrier',
    }
    const withRatio = validateCustomMixServer({ ...mix, carrierRatio: 0.7 })
    const without = validateCustomMixServer(mix)
    expect(withRatio).toEqual(without)
  })

  it('extreme carrierRatio values (0, 1, negative) do not crash', () => {
    for (const carrierRatio of [0, 1, -0.5, 999]) {
      const result = validateCustomMixServer({
        oils: [{ oilId: 'lavender', ml: 1.5 }],
        totalVolume: 30,
        mode: 'carrier',
        carrierRatio,
      })
      expect(result.canProceed).toBe(true)
    }
  })

  it('any mode other than "carrier" is treated as pure', () => {
    // pure-mode cap for safeDilutionPercent is 100 — a lavender-heavy mix
    // that is fine in pure mode still gets engine-checked the same way.
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: 3 }],
      totalVolume: 30,
      mode: 'something-else',
    })
    expect(result.canProceed).toBe(true)
  })
})

// ============================================================================
// ERROR MESSAGE QUALITY & AGGREGATION
// ============================================================================

describe('validateCustomMixServer — error quality', () => {
  it('names the offending oil in the unknown-oil error', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'snake-oil', ml: 5 }],
      totalVolume: 30,
    })
    expect(result.errors).toEqual(['Unknown oil: snake-oil'])
  })

  it('aggregates multiple structural errors into one result', () => {
    const result = validateCustomMixServer({
      oils: [
        { oilId: 'ghost-oil', ml: 5 },
        { oilId: 'lavender', ml: 0 },
      ],
      totalVolume: -10,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
    expect(result.errors.some(e => e.includes('Unknown oil: ghost-oil'))).toBe(true)
    expect(result.errors.some(e => e.includes('totalVolume'))).toBe(true)
    expect(result.errors.some(e => e.includes('lavender'))).toBe(true)
  })

  it('reports valid oils only once — errors reference the broken entries', () => {
    const result = validateCustomMixServer({
      oils: [
        { oilId: 'lavender', ml: 5 },   // fine
        { oilId: 'bergamot', ml: 0 },   // broken volume
      ],
      totalVolume: 30,
    })
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('bergamot')
    expect(result.errors[0]).not.toContain('lavender')
  })

  it('structural failures short-circuit: score 0, dangerous, no warnings', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'ghost-oil', ml: 5 }],
      totalVolume: 30,
      safetyScore: 100, // tampered — must be discarded with the short-circuit
    })
    expect(result.safetyScore).toBe(0)
    expect(result.safetyRating).toBe('dangerous')
    expect(result.safetyWarnings).toEqual([])
  })

  it('Σml error message includes both the summed and total volumes', () => {
    const result = validateCustomMixServer({
      oils: [
        { oilId: 'lavender', ml: 20 },
        { oilId: 'frankincense', ml: 15 },
      ],
      totalVolume: 30,
    })
    const msg = result.errors.find(e => e.includes('exceeds total mix volume'))
    expect(msg).toBeDefined()
    expect(msg).toContain('35ml')
    expect(msg).toContain('30ml')
  })

  it('rejects non-array oils without crashing', () => {
    for (const bad of [null, undefined, 'lavender', 42, {}]) {
      const result = validateCustomMixServer({ oils: bad as any, totalVolume: 30 })
      expect(result.canProceed).toBe(false)
      expect(result.errors).toContain('Mix must contain at least one oil')
    }
  })

  it('rejects null entries inside the oils array', () => {
    const result = validateCustomMixServer({
      oils: [null as any, { oilId: 'lavender', ml: 5 }],
      totalVolume: 30,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('Oil ID is required'))).toBe(true)
  })

  it('rejects non-string and empty-string oilIds', () => {
    const numeric = validateCustomMixServer({
      oils: [{ oilId: 42 as any, ml: 5 }],
      totalVolume: 30,
    })
    expect(numeric.errors.some(e => e.includes('Oil ID is required'))).toBe(true)

    const empty = validateCustomMixServer({
      oils: [{ oilId: '', ml: 5 }],
      totalVolume: 30,
    })
    expect(empty.errors.some(e => e.includes('Oil ID is required'))).toBe(true)
  })

  it('rejects non-finite totalVolume variants', () => {
    for (const totalVolume of [NaN, Infinity, -Infinity, -5, '30' as any]) {
      const result = validateCustomMixServer({
        oils: [{ oilId: 'lavender', ml: 5 }],
        totalVolume: totalVolume as number,
      })
      expect(result.canProceed).toBe(false)
      expect(result.errors.some(e => e.includes('totalVolume'))).toBe(true)
    }
  })

  it('rejects string-typed ml (no silent coercion)', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'lavender', ml: '5' as any }],
      totalVolume: 30,
    })
    expect(result.canProceed).toBe(false)
    expect(result.errors.some(e => e.includes('lavender'))).toBe(true)
  })

  it('engine-blocked mixes echo the block description in both errors and warnings', () => {
    const result = validateCustomMixServer({
      oils: [{ oilId: 'cinnamon-bark', ml: 30 }],
      totalVolume: 30,
      mode: 'pure',
    })
    expect(result.errors.length).toBeGreaterThan(0)
    for (const e of result.errors) {
      expect(result.safetyWarnings).toContain(e)
    }
  })
})

// ============================================================================
// getStandardOilWarnings — KNOWN vs UNKNOWN
// ============================================================================

describe('getStandardOilWarnings — hardening', () => {
  it('unknown oils get the pending-validation placeholder and nothing else', () => {
    expect(getStandardOilWarnings('nope')).toEqual(['Pending safety validation'])
    expect(getStandardOilWarnings('')).toEqual(['Pending safety validation'])
  })

  it('every profiled oil gets real warnings instead of the placeholder', () => {
    for (const oilId of ['lavender', 'bergamot', 'clove-bud', 'wintergreen', 'peppermint']) {
      const warnings = getStandardOilWarnings(oilId)
      expect(warnings).not.toContain('Pending safety validation')
    }
  })

  it('clove-bud carries the full expected warning set', () => {
    const warnings = getStandardOilWarnings('clove-bud')
    expect(warnings).toContain('Avoid during pregnancy')
    expect(warnings).toContain('Avoid while breastfeeding')
    expect(warnings).toContain('Toxic if swallowed — keep out of reach of children')
    expect(warnings.some(w => w.includes('skin sensitisation'))).toBe(true)
    expect(warnings.some(w => w.includes('Maximum leave-on dilution 0.5%'))).toBe(true)
  })

  it('bergamot warns about sun exposure with its 72-hour window', () => {
    const warnings = getStandardOilWarnings('bergamot')
    expect(warnings.some(w => w.includes('72 hours'))).toBe(true)
    // and pregnancy caution (not avoid) wording
    expect(warnings).toContain('Use with caution during pregnancy')
    expect(warnings).not.toContain('Avoid during pregnancy')
  })

  it('bergamot-fcf has no phototoxicity warning (furocoumarin-free)', () => {
    const warnings = getStandardOilWarnings('bergamot-fcf')
    expect(warnings.some(w => /sun|UV/i.test(w))).toBe(false)
  })

  it('wintergreen combines pregnancy-avoid, breastfeeding-avoid and oral-toxicity warnings', () => {
    const warnings = getStandardOilWarnings('wintergreen')
    expect(warnings).toContain('Avoid during pregnancy')
    expect(warnings).toContain('Avoid while breastfeeding')
    expect(warnings).toContain('Toxic if swallowed — keep out of reach of children')
  })

  it('only oils with maxDilutionPercent < 5 get the dilution-cap warning', () => {
    // peppermint max is exactly 5 → no cap warning
    expect(getStandardOilWarnings('peppermint').some(w => w.includes('Maximum leave-on dilution'))).toBe(false)
    // oregano max is 1 → cap warning present
    expect(getStandardOilWarnings('oregano').some(w => w.includes('Maximum leave-on dilution 1%'))).toBe(true)
  })

  it('sensitisation warning only fires for high-risk sensitisers', () => {
    // clove-bud is a high-risk sensitiser
    expect(getStandardOilWarnings('clove-bud').some(w => w.includes('sensitisation'))).toBe(true)
    // bergamot is a low-risk sensitiser → no such warning
    expect(getStandardOilWarnings('bergamot').some(w => w.includes('sensitisation'))).toBe(false)
  })

  it('sensitisation warning embeds the profile maxDilutionForSensitive value', () => {
    const profile = getOilSafetyProfile('clove-bud')!
    const warnings = getStandardOilWarnings('clove-bud')
    expect(warnings.some(w => w.includes(`${profile.skinSensitization.maxDilutionForSensitive}%`))).toBe(true)
  })

  it('the sweet-orange alias resolves to real warnings (not the placeholder)', () => {
    const warnings = getStandardOilWarnings('sweet-orange')
    expect(warnings).not.toContain('Pending safety validation')
    expect(warnings).toEqual(getStandardOilWarnings('orange-sweet'))
  })
})
