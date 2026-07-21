/**
 * Hardening Tests — Validation Engine (lib/safety/validation-engine.ts)
 *
 * Edge-case coverage beyond the contract tests:
 * - boundary dilutions exactly at maxDilutionPercent (pass) vs epsilon over (flag)
 * - the 10x exceedance blocking threshold
 * - mixed blends where one oil violates while others comply
 * - empty / single-oil / unknown-oil mixes
 * - totalVolume edge cases
 * - canProceed / requiresWaiver semantics
 * - drops↔ml normalization and safety-score clamping
 */

import {
  validateOilMix,
  isMixSafe,
  getSafetyStatus,
} from '../validation-engine'
import { getOilSafetyProfile, OIL_SAFETY_DATABASE } from '../database'
import { MixValidationRequest, UserHealthProfile } from '../types'

// ============================================================================
// HELPERS
// ============================================================================

function baselineProfile(overrides: Partial<UserHealthProfile> = {}): UserHealthProfile {
  return {
    age: 30,
    isPregnant: false,
    isBreastfeeding: false,
    isTryingToConceive: false,
    isChild: false,
    conditions: [],
    medications: [],
    knownAllergies: [],
    skinSensitivity: 'normal',
    respiratorySensitivity: false,
    intendedUse: { method: 'topical', frequency: 'daily', duration: 'long-term' },
    aromatherapyExperience: 'beginner',
    ...overrides,
  }
}

function request(overrides: Partial<MixValidationRequest> = {}): MixValidationRequest {
  return {
    oils: [{ oilId: 'lavender', ml: 1.5 }],
    userProfile: baselineProfile(),
    totalVolumeMl: 30,
    mode: 'carrier',
    intendedUse: { method: 'topical', frequency: 'daily', duration: 'long-term' },
    ...overrides,
  }
}

const hasDilutionBlock = (r: ReturnType<typeof validateOilMix>, oilId: string) =>
  r.blockedCombinations.some(b => b.type === 'exceeds-max-dilution' && b.affectedOils.includes(oilId))

const hasDilutionWarning = (r: ReturnType<typeof validateOilMix>, oilId: string) =>
  r.criticalWarnings.some(w => w.id === `dilution-exceeded-${oilId}`)

// ============================================================================
// BOUNDARY DILUTIONS
// ============================================================================

describe('validateOilMix — boundary dilutions', () => {
  it('passes an oil at exactly its maxDilutionPercent', () => {
    // clove-bud max = 0.5% → 0.15ml in 30ml
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 0.15 }],
    }))
    expect(hasDilutionWarning(result, 'clove-bud')).toBe(false)
    expect(hasDilutionBlock(result, 'clove-bud')).toBe(false)
  })

  it('flags an oil a tiny epsilon over its maxDilutionPercent', () => {
    // 0.16ml / 30ml = 0.5333…% > 0.5%
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 0.16 }],
    }))
    expect(hasDilutionWarning(result, 'clove-bud')).toBe(true)
    expect(hasDilutionBlock(result, 'clove-bud')).toBe(false)
    expect(result.canProceed).toBe(true) // warn-only, not blocked
  })

  it('blocks an oil exceeding its max by more than 10x', () => {
    // clove-bud max 0.5%; 10x = 5% → 1.5ml+ in 30ml. Use 2ml = 6.67%
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 2 }],
    }))
    expect(hasDilutionBlock(result, 'clove-bud')).toBe(true)
    expect(result.canProceed).toBe(false)
  })

  it('does NOT block an oil at exactly 10x its max (boundary of the factor)', () => {
    // 10x of 0.5% = 5.0% exactly → 1.5ml in 30ml. The check is strict >.
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 1.5 }],
    }))
    expect(hasDilutionBlock(result, 'clove-bud')).toBe(false)
    expect(hasDilutionWarning(result, 'clove-bud')).toBe(true)
    expect(result.canProceed).toBe(true)
  })

  it('warn-only exceedance carries a critical-severity warning with actionable numbers', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 1 }],
    }))
    const warning = result.criticalWarnings.find(w => w.id === 'dilution-exceeded-clove-bud')
    expect(warning).toBeDefined()
    expect(warning!.severity).toBe('critical')
    expect(warning!.category).toBe('concentration')
    expect(warning!.description).toContain('3.33%')
    expect(warning!.description).toContain('0.5%')
    expect(warning!.recommendation).toContain('0.15ml')
  })

  it('blocked exceedance includes an alternative suggestion with the max ml for the volume', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'cinnamon-bark', ml: 3 }], // 10% vs 0.05% max = 200x
    }))
    const block = result.blockedCombinations.find(b => b.type === 'exceeds-max-dilution')
    expect(block).toBeDefined()
    expect(block!.severity).toBe('critical')
    expect(block!.description).toContain('Cinnamon Bark')
    expect(block!.alternativeSuggestion).toContain('0.01ml') // 0.05% of 30ml = 0.015 → toFixed(2) = "0.01" (float)
  })

  it('scales the boundary with totalVolumeMl (same ratio, different volume)', () => {
    // 0.5% of 100ml = 0.5ml — at the boundary in a larger bottle
    const atBoundary = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 0.5 }],
      totalVolumeMl: 100,
    }))
    expect(hasDilutionWarning(atBoundary, 'clove-bud')).toBe(false)

    const justOver = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 0.51 }],
      totalVolumeMl: 100,
    }))
    expect(hasDilutionWarning(justOver, 'clove-bud')).toBe(true)
  })

  it('treats a high-limit oil (lavender 25%) at its boundary as compliant', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', ml: 7.5 }], // exactly 25% of 30ml
    }))
    expect(hasDilutionWarning(result, 'lavender')).toBe(false)
    expect(result.canProceed).toBe(true)
  })
})

// ============================================================================
// MIXED BLENDS
// ============================================================================

describe('validateOilMix — mixed blends', () => {
  it('flags only the violating oil when the rest of the blend complies', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'lavender', ml: 1 },     // 3.33% — fine (max 25%)
        { oilId: 'frankincense', ml: 1 }, // fine
        { oilId: 'clove-bud', ml: 1 },    // 3.33% vs 0.5% max — violation
      ],
    }))
    expect(hasDilutionWarning(result, 'clove-bud')).toBe(true)
    expect(hasDilutionWarning(result, 'lavender')).toBe(false)
    expect(hasDilutionWarning(result, 'frankincense')).toBe(false)
  })

  it('blocks the whole mix when one oil exceeds 10x even if others are gentle', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'lavender', ml: 1 },
        { oilId: 'cinnamon-bark', ml: 2 }, // 6.67% vs 0.05% — 133x
      ],
    }))
    expect(result.canProceed).toBe(false)
    expect(hasDilutionBlock(result, 'cinnamon-bark')).toBe(true)
    // The gentle oil must not be blamed
    expect(result.blockedCombinations.every(b => !b.affectedOils.includes('lavender'))).toBe(true)
  })

  it('reports each violating oil independently', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'clove-bud', ml: 1 },      // 3.33% vs 0.5% max (6.7x → warning)
        { oilId: 'cinnamon-leaf', ml: 1 },  // 3.33% vs 0.6% max (5.6x → warning)
      ],
    }))
    const violating = result.criticalWarnings
      .filter(w => w.id.startsWith('dilution-exceeded-'))
      .map(w => w.affectedOils![0])
    expect(violating).toContain('clove-bud')
    expect(violating).toContain('cinnamon-leaf')
  })

  it('blocks incompatible-oil pairs rated "avoid" (lemongrass + lemon-myrtle)', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'lemongrass', ml: 0.1 },
        { oilId: 'lemon-myrtle', ml: 0.1 },
      ],
      totalVolumeMl: 30,
    }))
    const block = result.blockedCombinations.find(b => b.type === 'incompatible-oils')
    expect(block).toBeDefined()
    expect(block!.affectedOils).toEqual(expect.arrayContaining(['lemongrass', 'lemon-myrtle']))
    expect(result.canProceed).toBe(false)
  })

  it('treats note-level incompatibilities as cautions, not blocks (lavender + tea-tree)', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'lavender', ml: 1 },
        { oilId: 'tea-tree', ml: 1 },
      ],
    }))
    expect(result.blockedCombinations.filter(b => b.type === 'incompatible-oils')).toHaveLength(0)
    expect(result.cautions.some(c => c.id.includes('incompatibility'))).toBe(true)
    expect(result.canProceed).toBe(true)
  })
})

// ============================================================================
// EMPTY / SINGLE / UNKNOWN OILS
// ============================================================================

describe('validateOilMix — empty, single and unknown oils', () => {
  it('handles an empty oils array without crashing and allows proceeding', () => {
    const result = validateOilMix(request({ oils: [] }))
    expect(result.canProceed).toBe(true)
    expect(result.calculations.totalDrops).toBe(0)
    expect(result.calculations.dilutionPercent).toBe(0)
    expect(result.safetyScore).toBe(100)
    expect(result.safetyRating).toBe('excellent')
  })

  it('validates a single-oil mix cleanly', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', ml: 1.5 }],
    }))
    expect(result.canProceed).toBe(true)
    expect(result.calculations.totalMl).toBe(1.5)
    expect(result.calculations.dilutionPercent).toBe(5)
  })

  it('silently skips unknown oil ids (no profile → no crash, no dilution flag)', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'not-a-real-oil', ml: 5 },
        { oilId: 'lavender', ml: 1 },
      ],
    }))
    expect(result.canProceed).toBe(true)
    expect(result.criticalWarnings.some(w => w.id.includes('not-a-real-oil'))).toBe(false)
    // Unknown oil still contributes to volume math
    expect(result.calculations.totalMl).toBe(6)
  })

  it('accepts a mix of only unknown oils without throwing', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'mystery-oil', drops: 10 }],
    }))
    expect(result.canProceed).toBe(true)
    expect(result.calculations.totalDrops).toBe(10)
  })
})

// ============================================================================
// DROPS / ML NORMALIZATION & CALCULATIONS
// ============================================================================

describe('validateOilMix — measurement normalization', () => {
  it('converts drops to ml at 20 drops/ml', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', drops: 40 }],
    }))
    expect(result.calculations.totalDrops).toBe(40)
    expect(result.calculations.totalMl).toBe(2)
  })

  it('converts ml to rounded drops when only ml is given', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', ml: 2 }],
    }))
    expect(result.calculations.totalDrops).toBe(40)
    expect(result.calculations.totalMl).toBe(2)
  })

  it('prefers ml over drops when both are supplied', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', ml: 3, drops: 1 }],
    }))
    expect(result.calculations.totalMl).toBe(3)
    expect(result.calculations.totalDrops).toBe(60) // from ml, not the bogus 1 drop
  })

  it('computes dilutionPercent from total essential ml / totalVolumeMl', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'lavender', ml: 1 },
        { oilId: 'frankincense', ml: 0.5 },
      ],
      totalVolumeMl: 30,
    }))
    expect(result.calculations.dilutionPercent).toBe(1.5 / 30 * 100)
  })

  it('accumulates active constituent levels for known oils', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', ml: 1.5 }],
    }))
    // Lavender lists Linalool as a key constituent
    expect(result.calculations.activeConstituentLevels['Linalool']).toBeGreaterThan(0)
  })

  it('safeDilutionPercent is the most restrictive profile limit in the blend', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'lavender', ml: 0.05 },       // max 25%
        { oilId: 'clove-bud', ml: 0.05 },      // max 0.5%
      ],
      totalVolumeMl: 30,
    }))
    expect(result.calculations.safeDilutionPercent).toBe(0.5)
  })

  it('safeDilutionPercent falls back to 75 (carrier) / 100 (pure) for unknown-only mixes', () => {
    const carrier = validateOilMix(request({
      oils: [{ oilId: 'mystery-oil', ml: 1 }],
      mode: 'carrier',
    }))
    expect(carrier.calculations.safeDilutionPercent).toBe(75)

    const pure = validateOilMix(request({
      oils: [{ oilId: 'mystery-oil', ml: 1 }],
      mode: 'pure',
    }))
    expect(pure.calculations.safeDilutionPercent).toBe(100)
  })
})

// ============================================================================
// CANPROCEED / WAIVER / SCORE SEMANTICS
// ============================================================================

describe('validateOilMix — canProceed, waiver and scoring', () => {
  it('canProceed is true with zero issues and requiresWaiver is false', () => {
    const result = validateOilMix(request())
    expect(result.canProceed).toBe(true)
    expect(result.requiresWaiver).toBe(false)
    expect(result.safetyScore).toBeGreaterThanOrEqual(90)
  })

  it('requiresWaiver is true when warnings exist but nothing is blocked', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 1 }], // warn-only exceedance
    }))
    expect(result.canProceed).toBe(true)
    expect(result.requiresWaiver).toBe(true)
  })

  it('requiresWaiver is false when the mix is blocked (waiver cannot unblock)', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'cinnamon-bark', ml: 3 }],
    }))
    expect(result.canProceed).toBe(false)
    expect(result.requiresWaiver).toBe(false)
  })

  it('blocks pregnancy-avoid oils for pregnant users', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'wintergreen', ml: 0.1 }],
      userProfile: baselineProfile({ isPregnant: true }),
    }))
    const block = result.blockedCombinations.find(b => b.type === 'pregnancy-unsafe')
    expect(block).toBeDefined()
    expect(block!.affectedOils).toContain('wintergreen')
    expect(result.canProceed).toBe(false)
  })

  it('does not block pregnancy-avoid oils for non-pregnant users', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'wintergreen', ml: 0.1 }],
      userProfile: baselineProfile({ isPregnant: false }),
    }))
    expect(result.blockedCombinations.filter(b => b.type === 'pregnancy-unsafe')).toHaveLength(0)
  })

  it('adds cautions (not blocks) for pregnancy-caution oils', () => {
    const cautionOil = Object.entries(OIL_SAFETY_DATABASE).find(([, p]) => p.pregnancySafety === 'caution')
    expect(cautionOil).toBeDefined()
    const [oilId] = cautionOil!
    const result = validateOilMix(request({
      oils: [{ oilId, ml: 0.1 }],
      userProfile: baselineProfile({ isPregnant: true }),
    }))
    expect(result.blockedCombinations.filter(b => b.type === 'pregnancy-unsafe')).toHaveLength(0)
    expect(result.cautions.some(c => c.id === `pregnancy-caution-${oilId}`)).toBe(true)
  })

  it('safetyScore is clamped to 0 for catastrophic mixes, never negative', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'cinnamon-bark', ml: 10 },
        { oilId: 'clove-bud', ml: 10 },
        { oilId: 'lemongrass', ml: 5 },
        { oilId: 'lemon-myrtle', ml: 5 },
      ],
      totalVolumeMl: 30,
    }))
    expect(result.safetyScore).toBeGreaterThanOrEqual(0)
    expect(result.safetyScore).toBeLessThanOrEqual(100)
    expect(result.safetyRating).toBe('dangerous')
  })

  it('deducts 25 points per blocked combination and 5 per warning', () => {
    const clean = validateOilMix(request())
    const oneBlock = validateOilMix(request({
      oils: [{ oilId: 'cinnamon-bark', ml: 3 }],
    }))
    // clean score minus at least 25 for the block (warnings may deduct more)
    expect(clean.safetyScore - oneBlock.safetyScore).toBeGreaterThanOrEqual(25)
  })

  it('recommends professional consultation when blocked, pregnant, or >2 conditions', () => {
    const blocked = validateOilMix(request({
      oils: [{ oilId: 'cinnamon-bark', ml: 3 }],
    }))
    expect(blocked.recommendations.professionalConsultationRecommended).toBe(true)

    const pregnant = validateOilMix(request({
      userProfile: baselineProfile({ isPregnant: true }),
    }))
    expect(pregnant.recommendations.professionalConsultationRecommended).toBe(true)

    const manyConditions = validateOilMix(request({
      userProfile: baselineProfile({
        conditions: ['asthma', 'epilepsy', 'diabetes'],
      }),
    }))
    expect(manyConditions.recommendations.professionalConsultationRecommended).toBe(true)
  })

  it('recommends patch testing when warnings exist', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'clove-bud', ml: 1 }],
    }))
    expect(result.recommendations.patchTestRecommended).toBe(true)
  })
})

// ============================================================================
// AGE / RESPIRATORY / CONDITION PATHS
// ============================================================================

describe('validateOilMix — user-specific paths', () => {
  it('cautions for under-2 oils when the child is under 24 months', () => {
    const avoidUnder2 = Object.entries(OIL_SAFETY_DATABASE)
      .find(([, p]) => p.ageRestrictions.under2Years === 'avoid')
    expect(avoidUnder2).toBeDefined()
    const [oilId] = avoidUnder2!
    const result = validateOilMix(request({
      oils: [{ oilId, ml: 0.05 }],
      userProfile: baselineProfile({ isChild: true, age: 1, exactAge: 18 }),
    }))
    expect(result.cautions.some(c => c.id === `age-caution-${oilId}`)).toBe(true)
  })

  it('does not raise age cautions for adults', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'peppermint', ml: 0.5 }],
      userProfile: baselineProfile({ isChild: false, age: 30 }),
    }))
    expect(result.cautions.filter(c => c.category === 'age')).toHaveLength(0)
  })

  it('warns on respiratory sensitivity with triggering oils', () => {
    const trigger = Object.entries(OIL_SAFETY_DATABASE)
      .find(([, p]) => p.respiratoryEffects.canTriggerAsthma || p.respiratoryEffects.cautionForRespiratoryConditions)
    expect(trigger).toBeDefined()
    const [oilId] = trigger!
    const result = validateOilMix(request({
      oils: [{ oilId, ml: 0.2 }],
      userProfile: baselineProfile({ respiratorySensitivity: true }),
    }))
    expect(result.warnings.some(w => w.id === 'respiratory-risk')).toBe(true)
  })

  it('no respiratory warning for sensitive users when blend has no triggering oils', () => {
    // Find an oil with no respiratory flags at all
    const calm = Object.entries(OIL_SAFETY_DATABASE)
      .find(([, p]) => !p.respiratoryEffects.canTriggerAsthma && !p.respiratoryEffects.cautionForRespiratoryConditions)
    expect(calm).toBeDefined()
    const [oilId] = calm!
    const result = validateOilMix(request({
      oils: [{ oilId, ml: 0.5 }],
      userProfile: baselineProfile({ respiratorySensitivity: true }),
    }))
    expect(result.warnings.filter(w => w.id === 'respiratory-risk')).toHaveLength(0)
  })

  it('surfaces medical-condition contraindications without ever blocking', () => {
    // cinnamon-bark has a contraindication whose description mentions "diabetes"
    // (moderate severity). The engine maps condition matches to warnings and
    // must never block on them. Use a compliant dilution to isolate this path.
    const result = validateOilMix(request({
      oils: [{ oilId: 'cinnamon-bark', ml: 0.015 }], // exactly 0.05% = its max
      userProfile: baselineProfile({ conditions: ['diabetes'] }),
    }))
    expect(result.blockedCombinations.filter(b => b.type === 'contraindicated-condition')).toHaveLength(0)
    expect(result.canProceed).toBe(true)
  })
})

// ============================================================================
// PHOTOTOXICITY
// ============================================================================

describe('validateOilMix — phototoxicity', () => {
  it('cautions when a phototoxic oil is present below stacking threshold', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'bergamot', ml: 0.12 }], // 0.4% — its phototoxic limit
    }))
    const photo = [...result.warnings, ...result.cautions].find(w => w.id.startsWith('phototoxic'))
    expect(photo).toBeDefined()
    expect(photo!.affectedOils).toContain('bergamot')
  })

  it('escalates to a warning when combined phototoxic dilution exceeds the safe limit', () => {
    const result = validateOilMix(request({
      oils: [
        { oilId: 'bergamot', ml: 0.5 },
        { oilId: 'lime', ml: 0.5 },
        { oilId: 'lemon', ml: 0.5 },
      ],
      totalVolumeMl: 30,
    }))
    expect(result.warnings.some(w => w.id === 'phototoxic-stack')).toBe(true)
  })

  it('emits no phototoxic messaging for non-phototoxic blends', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'lavender', ml: 1 }],
    }))
    const photo = [...result.warnings, ...result.cautions].filter(w => w.id.startsWith('phototoxic'))
    expect(photo).toHaveLength(0)
  })

  it('bergamot-fcf is not treated as phototoxic', () => {
    const result = validateOilMix(request({
      oils: [{ oilId: 'bergamot-fcf', ml: 1 }],
    }))
    const photo = [...result.warnings, ...result.cautions].filter(w => w.id.startsWith('phototoxic'))
    expect(photo).toHaveLength(0)
  })
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

describe('isMixSafe / getSafetyStatus', () => {
  it('isMixSafe mirrors canProceed', () => {
    expect(isMixSafe(request())).toBe(true)
    expect(isMixSafe(request({ oils: [{ oilId: 'cinnamon-bark', ml: 3 }] }))).toBe(false)
  })

  it('getSafetyStatus returns green/check for a clean high-scoring mix', () => {
    const status = getSafetyStatus(validateOilMix(request()))
    expect(status).toEqual({ color: 'green', icon: 'check', message: 'Safe to use' })
  })

  it('getSafetyStatus returns red/ban for a blocked mix', () => {
    const status = getSafetyStatus(validateOilMix(request({
      oils: [{ oilId: 'cinnamon-bark', ml: 3 }],
    })))
    expect(status.color).toBe('red')
    expect(status.icon).toBe('ban')
  })

  it('getSafetyStatus returns yellow or orange for warn-but-proceed mixes', () => {
    // Four warn-level issues drag the score below 90 while nothing blocks:
    // 3 dilution exceedances (-15) + phototoxic stacking (-5) → score 80.
    // (These three oils have no 'avoid'-rated incompatibilities with each other.)
    const status = getSafetyStatus(validateOilMix(request({
      oils: [
        { oilId: 'clove-bud', ml: 1 },   // 3.33% vs 0.5% max
        { oilId: 'ylang-ylang', ml: 1 }, // 3.33% vs 0.8% max
        { oilId: 'bergamot', ml: 0.5 },  // 1.67% vs 0.4% max + phototoxic
      ],
    })))
    expect(['yellow', 'orange']).toContain(status.color)
    expect(status.message).not.toBe('Safe to use')
  })
})
