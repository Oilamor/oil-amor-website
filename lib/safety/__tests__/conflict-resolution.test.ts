/**
 * Conflict Resolution Tests — unified 2026-07-21
 *
 * Pins the resolutions of conflicts between the v2 engine's legacy hardcoded
 * groups, the OIL_SAFETY_DATABASE profiles, and the v1 validation engine:
 *
 * 1. cinnamon-bark: DB 'avoid' wins over the legacy MODERATE "hormonal oils"
 *    group — v2 now flags it HIGH like every other avoid oil.
 * 2. clary-sage: DB profile raised to 'avoid' (stricter wins over 'caution'),
 *    matching the audit's HIGH/emmenagogue verdict — both engines agree at
 *    HIGH/avoid without v2 special-casing.
 * 3. Phantom warnings: non-critical condition contraindications are emitted
 *    visibly in `cautions` instead of an internal array the result filters
 *    out (invisible, yet score- and waiver-load-bearing).
 * 4. Condition matching normalizes case/hyphens/underscores/whitespace, so
 *    hyphenated MedicalCondition ids match natural-language text, and the
 *    ' bleeding-disorder' leading-space typo is gone (and tolerated).
 * 5. getContraindicatedOils() matches rows by medicationId and class-wide
 *    medicationClass instead of effectively always returning [].
 */

import * as fs from 'fs'
import * as path from 'path'

import {
  validateMixSafety,
  UserSafetyProfile,
  OilComponent,
} from '../comprehensive-safety-v2'
import { validateOilMix } from '../validation-engine'
import { getContraindicatedOils } from '../medication-database'
import { getOilSafetyProfile } from '../database'
import { MixValidationRequest, UserHealthProfile, MedicalCondition } from '../types'

// ============================================================================
// HELPERS
// ============================================================================

function pregnantV2Profile(): UserSafetyProfile {
  return {
    age: 30,
    ageGroup: 'adult',
    isPregnant: true,
    isBreastfeeding: false,
    isTryingToConceive: false,
    medications: [],
    healthConditions: [],
    knownAllergies: [],
    hasSensitiveSkin: false,
    respiratorySensitivity: false,
    experienceLevel: 'beginner',
  }
}

function v1Profile(overrides: Partial<UserHealthProfile> = {}): UserHealthProfile {
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

function v1Request(overrides: Partial<MixValidationRequest> = {}): MixValidationRequest {
  return {
    oils: [{ oilId: 'lavender', ml: 1.5 }],
    userProfile: v1Profile(),
    totalVolumeMl: 30,
    mode: 'carrier',
    intendedUse: { method: 'topical', frequency: 'daily', duration: 'long-term' },
    ...overrides,
  }
}

// ============================================================================
// 1. CINNAMON-BARK — DB 'avoid' WINS (was legacy MODERATE "hormonal oils")
// ============================================================================

describe('cinnamon-bark conflict — DB is authoritative', () => {
  const oils: OilComponent[] = [{ oilId: 'cinnamon-bark', name: 'Cinnamon Bark', ml: 1, drops: 20 }]

  it('the DB rates cinnamon-bark pregnancySafety avoid', () => {
    expect(getOilSafetyProfile('cinnamon-bark')?.pregnancySafety).toBe('avoid')
  })

  it('v2 flags cinnamon-bark HIGH, not the legacy MODERATE hormonal group', () => {
    // -- unified 2026-07-21: DB is authoritative; cinnamon-bark is avoid-in-pregnancy
    const result = validateMixSafety(oils, pregnantV2Profile())
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy')
    expect(pregnancyWarnings.length).toBeGreaterThan(0)
    expect(pregnancyWarnings[0].riskLevel).toBe('high')
    expect(pregnancyWarnings[0].affectedOils).toContain('cinnamon-bark')

    // No MODERATE pregnancy warning may claim cinnamon-bark anymore
    const moderate = result.warnings.filter(
      w => w.category === 'pregnancy' && w.riskLevel === 'moderate'
    )
    for (const w of moderate) {
      expect(w.affectedOils).not.toContain('cinnamon-bark')
    }
  })
})

// ============================================================================
// 2. CLARY-SAGE — DB RAISED TO 'avoid' (stricter wins, no v2 special case)
// ============================================================================

describe('clary-sage conflict — stricter verdict wins', () => {
  const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }]

  it('the DB now rates clary-sage pregnancySafety avoid (no v2 special case needed)', () => {
    // Unified 2026-07-21 with the audit verdict — previously 'caution', which
    // forced v2 to hardcode the HIGH rating. The DB alone now justifies HIGH.
    expect(getOilSafetyProfile('clary-sage')?.pregnancySafety).toBe('avoid')
  })

  it('v2 flags clary-sage HIGH for pregnant users', () => {
    const result = validateMixSafety(oils, pregnantV2Profile())
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy')
    expect(pregnancyWarning).toBeDefined()
    expect(['high', 'critical']).toContain(pregnancyWarning!.riskLevel)
    expect(pregnancyWarning!.affectedOils).toContain('clary-sage')
  })

  it('v1 engine agrees: blocks clary-sage as pregnancy-unsafe (DB avoid)', () => {
    const result = validateOilMix(v1Request({
      oils: [{ oilId: 'clary-sage', ml: 0.5 }], // 1.67% — within its 25% profile max
      userProfile: v1Profile({ isPregnant: true }),
    }))
    expect(
      result.blockedCombinations.some(
        b => b.type === 'pregnancy-unsafe' && b.affectedOils.includes('clary-sage')
      )
    ).toBe(true)
    expect(result.canProceed).toBe(false)
  })
})

// ============================================================================
// 3. PHANTOM WARNINGS — NOW EMITTED VISIBLY
// ============================================================================

describe('phantom condition warnings are visible', () => {
  it('non-critical matches land in cautions with their actual severity', () => {
    // cinnamon-bark has a moderate-severity contraindication whose description
    // mentions diabetes. Before the fix this match was pushed into the internal
    // warnings array with severity 'caution' — filtered out of the result, yet
    // still deducting score and forcing requiresWaiver.
    const result = validateOilMix(v1Request({
      oils: [{ oilId: 'cinnamon-bark', ml: 0.015 }], // exactly 0.05% = its max (no dilution warning)
      userProfile: v1Profile({ conditions: ['diabetes'] }),
    }))

    const visible = result.cautions.find(c => c.id === 'contraindication-cinnamon-bark-diabetes')
    expect(visible).toBeDefined()
    expect(visible!.severity).toBe('caution')
    expect(visible!.affectedConditions).toContain('diabetes')

    // Visible cautions still cost score, but a caution alone no longer forces
    // a waiver the user could never see the reason for.
    expect(result.safetyScore).toBeLessThan(100)
    expect(result.requiresWaiver).toBe(false)
    expect(result.canProceed).toBe(true)
  })

  it('critical-severity matches stay visible warnings and still force a waiver', () => {
    const result = validateOilMix(v1Request({
      oils: [{ oilId: 'clove-bud', ml: 0.1 }], // 0.33% — within its 0.5% profile max
      userProfile: v1Profile({ conditions: ['bleeding-disorder'] }),
    }))

    const visible = result.warnings.find(w => w.id === 'contraindication-clove-bud-bleeding-disorder')
    expect(visible).toBeDefined()
    expect(visible!.severity).toBe('warning')
    expect(result.requiresWaiver).toBe(true)
  })
})

// ============================================================================
// 4. CONDITION MATCHING — NORMALIZED (hyphens/underscores/case/whitespace)
// ============================================================================

describe('condition matching is normalization-tolerant', () => {
  it('matches hyphenated kidney-disease against natural-language text', () => {
    // juniper-berry: "High doses can irritate kidneys - avoid with kidney disease"
    const result = validateOilMix(v1Request({
      oils: [{ oilId: 'juniper-berry', ml: 0.3 }],
      userProfile: v1Profile({ conditions: ['kidney-disease'] }),
    }))
    expect(
      result.cautions.some(c => c.id === 'contraindication-juniper-berry-kidney-disease')
    ).toBe(true)
  })

  it('matches hyphenated hormone-sensitive-condition against natural-language text', () => {
    // clary-sage: "May have estrogenic effects - use with caution with hormone-sensitive conditions"
    const result = validateOilMix(v1Request({
      oils: [{ oilId: 'clary-sage', ml: 0.5 }],
      userProfile: v1Profile({ conditions: ['hormone-sensitive-condition'] }),
    }))
    expect(
      result.cautions.some(c => c.id === 'contraindication-clary-sage-hormone-sensitive-condition')
    ).toBe(true)
  })

  it('tolerates the legacy leading-space condition value (trim normalization)', () => {
    // The old ' bleeding-disorder' id would have silently matched nothing;
    // matching is now trim-tolerant so it cannot recur.
    const result = validateOilMix(v1Request({
      oils: [{ oilId: 'clove-bud', ml: 0.1 }],
      userProfile: v1Profile({ conditions: [' bleeding-disorder' as MedicalCondition] }),
    }))
    expect(
      result.warnings.some(w => w.category === 'contraindication' && w.affectedOils?.includes('clove-bud'))
    ).toBe(true)
  })

  it("' bleeding-disorder' typo is gone from the sources that defined/emitted it", () => {
    // Source-scan pin: the leading-space id lived in the MedicalCondition
    // union (lib/safety/types.ts) and in the health-profile form options
    // (components/mixing/HealthProfileForm.tsx). Both now use the clean id.
    const typesSrc = fs.readFileSync(path.resolve(__dirname, '../types.ts'), 'utf8')
    const formSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../components/mixing/HealthProfileForm.tsx'),
      'utf8'
    )
    for (const src of [typesSrc, formSrc]) {
      expect(src).not.toContain("' bleeding-disorder'")
      expect(src).toContain("'bleeding-disorder'")
    }
  })
})

// ============================================================================
// 5. getContraindicatedOils — ACTUALLY RETURNS ROWS NOW
// ============================================================================

describe('getContraindicatedOils is useful again', () => {
  it('returns the known major/contraindicated oils for warfarin', () => {
    // Previously []: 78/79 interaction rows left medicationId unset, so the
    // exact-match filter found nothing. The warfarin section is now tagged.
    const oils = getContraindicatedOils('warfarin')
    expect(oils.length).toBeGreaterThan(0)
    expect(oils).toEqual(expect.arrayContaining(['clove-bud', 'cinnamon-bark', 'wintergreen']))
  })

  it('class-wide rows cover other anticoagulants via drugClass (apixaban)', () => {
    expect(getContraindicatedOils('apixaban')).toContain('clove-bud')
  })

  it('still returns [] for unknown medications', () => {
    expect(getContraindicatedOils('not-a-medication')).toEqual([])
  })
})
