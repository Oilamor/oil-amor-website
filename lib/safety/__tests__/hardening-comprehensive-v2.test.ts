/**
 * Hardening Tests — Comprehensive Safety V2 (lib/safety/comprehensive-safety-v2.ts)
 *
 * Behavior coverage beyond the base unit tests:
 * - medication interaction surfacing (generic + brand names, active gating,
 *   route gating, unknown medications)
 * - health-condition handling (epilepsy / bleeding disorders / asthma,
 *   incl. route specificity and severity escalation)
 * - null/undefined profile fields never crash
 * - the never-blocks philosophy (canProceed stays true for high-risk combos)
 * - acknowledgment requirements for high-risk oils
 * - deterministic safety scoring and severity sort order
 * - experience-level gating of warning categories
 */

import {
  validateMixSafety,
  validateMixSafetyForCommunity,
  getWarningMessage,
  getOilWarnings,
  type UserSafetyProfile,
  type OilComponent,
  type SafetyWarning,
} from '../comprehensive-safety-v2'

// ============================================================================
// HELPERS
// ============================================================================

function profile(overrides: Partial<UserSafetyProfile> = {}): UserSafetyProfile {
  return {
    age: 30,
    ageGroup: 'adult',
    isPregnant: false,
    isBreastfeeding: false,
    isTryingToConceive: false,
    medications: [],
    healthConditions: [],
    knownAllergies: [],
    hasSensitiveSkin: false,
    respiratorySensitivity: false,
    experienceLevel: 'beginner',
    ...overrides,
  }
}

const oil = (oilId: string, name = oilId): OilComponent => ({ oilId, name, ml: 1, drops: 20 })

const warfarin = { id: 'm1', name: 'Warfarin', isActive: true }
const clove = oil('clove-bud', 'Clove Bud')
const wintergreen = oil('wintergreen', 'Wintergreen')
const hyssop = oil('hyssop', 'Hyssop')
const lavender = oil('lavender', 'Lavender')

// ============================================================================
// MEDICATION INTERACTION SURFACING
// ============================================================================

describe('validateMixSafety — medication interactions', () => {
  it('surfaces a critical blood-thinner warning for warfarin + wintergreen (topical)', () => {
    const result = validateMixSafety([wintergreen], profile({ medications: [warfarin] }), 'topical')
    const w = result.warnings.find(x => x.category === 'medication' && x.title.includes('Blood Thinner'))
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('critical')
    expect(w!.affectedOils).toContain('wintergreen')
    expect(w!.requiresAcknowledgment).toBe(true)
    expect(w!.acknowledgmentText).toBeTruthy()
  })

  it('matches medications by brand name (Coumadin → Warfarin)', () => {
    const brandMed = { id: 'm2', name: 'Coumadin', isActive: true }
    const result = validateMixSafety([clove], profile({ medications: [brandMed] }), 'topical')
    expect(result.warnings.some(w => w.category === 'medication' && w.title.includes('Blood Thinner'))).toBe(true)
  })

  it('is case-insensitive on medication names', () => {
    const result = validateMixSafety([clove], profile({
      medications: [{ id: 'm3', name: 'WARFARIN', isActive: true }],
    }), 'topical')
    expect(result.warnings.some(w => w.title.includes('Blood Thinner'))).toBe(true)
  })

  it('ignores inactive medications entirely', () => {
    const result = validateMixSafety([clove], profile({
      medications: [{ id: 'm4', name: 'Warfarin', isActive: false }],
    }), 'topical')
    expect(result.warnings.filter(w => w.category === 'medication')).toHaveLength(0)
  })

  it('ignores unknown medication names without crashing', () => {
    const result = validateMixSafety([clove], profile({
      medications: [{ id: 'm5', name: 'Notarealdrug', isActive: true }],
    }), 'topical')
    expect(result.warnings.filter(w => w.category === 'medication')).toHaveLength(0)
    expect(result.canProceed).toBe(true)
  })

  it('gates the anticoagulant warning to topical routes (inhalation is exempt)', () => {
    const result = validateMixSafety([clove], profile({ medications: [warfarin] }), 'inhalation')
    expect(result.warnings.filter(w => w.title.includes('Blood Thinner'))).toHaveLength(0)
  })

  it('lists every dangerous oil in the blend in a single anticoagulant warning', () => {
    const cinnamon = oil('cinnamon-bark', 'Cinnamon Bark')
    const result = validateMixSafety([clove, wintergreen, cinnamon], profile({ medications: [warfarin] }), 'topical')
    const w = result.warnings.find(x => x.title.includes('Blood Thinner'))
    expect(w).toBeDefined()
    expect(w!.affectedOils).toEqual(expect.arrayContaining(['clove-bud', 'wintergreen', 'cinnamon-bark']))
  })

  it('flags antiepileptic medication + neurotoxic oils as critical', () => {
    const lamotrigine = { id: 'm6', name: 'Lamotrigine', isActive: true }
    const rosemary = oil('rosemary', 'Rosemary')
    const result = validateMixSafety([rosemary], profile({ medications: [lamotrigine] }))
    const w = result.warnings.find(x => x.category === 'medication' && x.title.includes('Seizure Risk'))
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('critical')
    expect(w!.affectedOils).toContain('rosemary')
  })

  it('does not flag antiepileptics when no neurotoxic oils are present', () => {
    const lamotrigine = { id: 'm6', name: 'Lamotrigine', isActive: true }
    const result = validateMixSafety([lavender], profile({ medications: [lamotrigine] }))
    expect(result.warnings.filter(w => w.title.includes('Seizure Risk'))).toHaveLength(0)
  })

  it('flags SSRI + serotonergic oils as moderate (not critical)', () => {
    const sertraline = { id: 'm7', name: 'Sertraline', isActive: true }
    const clarySage = oil('clary-sage', 'Clary Sage')
    const result = validateMixSafety([clarySage], profile({ medications: [sertraline] }))
    const w = result.warnings.find(x => x.category === 'medication' && x.title.includes('Potential Interaction'))
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('moderate')
    expect(w!.requiresAcknowledgment).toBe(false)
  })

  it('flags benzodiazepine + sedating oils as moderate sedation risk', () => {
    const diazepam = { id: 'm8', name: 'Diazepam', isActive: true }
    const result = validateMixSafety([lavender], profile({ medications: [diazepam] }))
    const w = result.warnings.find(x => x.title.includes('Sedation Risk'))
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('moderate')
    expect(w!.affectedOils).toContain('lavender')
  })

  it('does not raise medication warnings for clean profiles', () => {
    const result = validateMixSafety([clove], profile())
    expect(result.warnings.filter(w => w.category === 'medication')).toHaveLength(0)
  })
})

// ============================================================================
// HEALTH-CONDITION HANDLING
// ============================================================================

describe('validateMixSafety — health conditions', () => {
  it('flags epilepsy + neurotoxic oils as critical (all routes)', () => {
    const result = validateMixSafety([hyssop], profile({ healthConditions: ['epilepsy'] }), 'inhalation')
    const w = result.warnings.find(x => x.id === 'crit-epilepsy-condition')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('critical')
    expect(w!.affectedOils).toContain('hyssop')
  })

  it('flags hemophilia + anticoagulant oils for topical use only', () => {
    const topical = validateMixSafety([clove], profile({ healthConditions: ['hemophilia'] }), 'topical')
    expect(topical.warnings.some(w => w.id === 'crit-bleeding-disorder')).toBe(true)

    const inhaled = validateMixSafety([clove], profile({ healthConditions: ['hemophilia'] }), 'inhalation')
    expect(inhaled.warnings.filter(w => w.id === 'crit-bleeding-disorder')).toHaveLength(0)
  })

  it('treats thrombocytopenia like hemophilia (bleeding-disorder branch)', () => {
    const result = validateMixSafety([wintergreen], profile({ healthConditions: ['thrombocytopenia'] }), 'topical')
    expect(result.warnings.some(w => w.id === 'crit-bleeding-disorder')).toBe(true)
  })

  it('flags asthma + respiratory irritants on inhalation as moderate', () => {
    const peppermint = oil('peppermint', 'Peppermint')
    const result = validateMixSafety([peppermint], profile({ healthConditions: ['asthma'] }), 'inhalation')
    const w = result.warnings.find(x => x.id === 'mod-asthma')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('moderate')
  })

  it('escalates severe_asthma to high risk', () => {
    const peppermint = oil('peppermint', 'Peppermint')
    const result = validateMixSafety([peppermint], profile({ healthConditions: ['severe_asthma'] }), 'inhalation')
    const w = result.warnings.find(x => x.id === 'mod-asthma')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('high')
  })

  it('does not raise asthma warnings for topical-only use', () => {
    const peppermint = oil('peppermint', 'Peppermint')
    const result = validateMixSafety([peppermint], profile({ healthConditions: ['asthma'] }), 'topical')
    expect(result.warnings.filter(w => w.id === 'mod-asthma')).toHaveLength(0)
  })

  it('skips unknown condition ids silently', () => {
    const result = validateMixSafety([hyssop], profile({ healthConditions: ['not-a-condition'] }))
    expect(result.warnings.filter(w => w.category === 'condition')).toHaveLength(0)
  })
})

// ============================================================================
// NULL / UNDEFINED TOLERANCE
// ============================================================================

describe('validateMixSafety — null/undefined tolerance', () => {
  it('tolerates undefined medications', () => {
    const p = profile()
    // @ts-expect-error deliberately violating the type to prove runtime safety
    p.medications = undefined
    expect(() => validateMixSafety([clove], p)).not.toThrow()
  })

  it('tolerates undefined healthConditions', () => {
    const p = profile()
    // @ts-expect-error deliberately violating the type to prove runtime safety
    p.healthConditions = undefined
    expect(() => validateMixSafety([hyssop], p)).not.toThrow()
  })

  it('tolerates undefined knownAllergies', () => {
    const p = profile()
    // @ts-expect-error deliberately violating the type to prove runtime safety
    p.knownAllergies = undefined
    expect(() => validateMixSafety([lavender], p)).not.toThrow()
  })

  it('handles an empty oil list cleanly', () => {
    const result = validateMixSafety([], profile())
    expect(result.canProceed).toBe(true)
    expect(result.warnings).toHaveLength(0)
    expect(result.safetyScore).toBe(100)
    expect(result.requiresAcknowledgment).toBe(false)
  })

  it('allergyWarnings is undefined (not an empty array) when no allergies flagged', () => {
    const result = validateMixSafety([lavender], profile())
    expect(result.allergyWarnings).toBeUndefined()
  })
})

// ============================================================================
// NEVER-BLOCKS PHILOSOPHY
// ============================================================================

describe('validateMixSafety — never blocks', () => {
  it('canProceed stays true for a maximal-risk combination', () => {
    const result = validateMixSafety(
      [clove, wintergreen, hyssop],
      profile({
        isPregnant: true,
        medications: [warfarin],
        healthConditions: ['epilepsy', 'hemophilia'],
      }),
      'topical'
    )
    expect(result.canProceed).toBe(true)
    expect(result.criticalWarnings.length).toBeGreaterThan(1)
  })

  it('canProceed is literally true (not truthy) in every scenario', () => {
    const scenarios: Array<[OilComponent[], UserSafetyProfile]> = [
      [[lavender], profile()],
      [[clove], profile({ medications: [warfarin] })],
      [[hyssop], profile({ healthConditions: ['epilepsy'] })],
      [[oil('myrrh', 'Myrrh')], profile({ isPregnant: true })],
    ]
    for (const [oils, p] of scenarios) {
      expect(validateMixSafety(oils, p).canProceed).toBe(true)
    }
  })

  it('acknowledged always starts false — the user must act', () => {
    const result = validateMixSafety([clove], profile())
    expect(result.acknowledged).toBe(false)
  })

  it('echoes the profile experience level into the result', () => {
    for (const level of ['beginner', 'intermediate', 'advanced', 'professional'] as const) {
      expect(validateMixSafety([lavender], profile({ experienceLevel: level })).experienceLevel).toBe(level)
    }
  })
})

// ============================================================================
// ACKNOWLEDGMENT REQUIREMENTS
// ============================================================================

describe('validateMixSafety — acknowledgment requirements', () => {
  it('requires acknowledgment whenever a critical warning exists', () => {
    const result = validateMixSafety([clove], profile())
    expect(result.criticalWarnings.length).toBeGreaterThan(0)
    expect(result.requiresAcknowledgment).toBe(true)
  })

  it('does not require acknowledgment for a gentle blend', () => {
    const result = validateMixSafety([lavender], profile())
    expect(result.requiresAcknowledgment).toBe(false)
  })

  it('criticalWarnings is exactly the critical subset of warnings', () => {
    const result = validateMixSafety([clove, hyssop], profile())
    const criticals = result.warnings.filter(w => w.riskLevel === 'critical')
    expect(result.criticalWarnings).toEqual(criticals)
  })

  it('critical warnings carry acknowledgment text for the checkbox UI', () => {
    const result = validateMixSafety([clove, wintergreen, hyssop], profile())
    for (const w of result.criticalWarnings) {
      expect(w.requiresAcknowledgment).toBe(true)
      expect(typeof w.acknowledgmentText).toBe('string')
      expect(w.acknowledgmentText!.length).toBeGreaterThan(10)
    }
  })

  it('wintergreen acknowledgment is required at every experience level', () => {
    for (const level of ['beginner', 'intermediate', 'advanced', 'professional'] as const) {
      const result = validateMixSafety([wintergreen], profile({ experienceLevel: level }))
      const w = result.warnings.find(x => x.id === 'base-wintergreen-wintergreen')
      expect(w).toBeDefined()
      expect(w!.requiresAcknowledgment).toBe(true)
    }
  })

  it('clove acknowledgment requirement is waived for advanced/professional users', () => {
    const beginner = validateMixSafety([clove], profile({ experienceLevel: 'beginner' }))
    expect(beginner.warnings.find(w => w.id === 'base-clove-clove-bud')!.requiresAcknowledgment).toBe(true)

    const pro = validateMixSafety([clove], profile({ experienceLevel: 'professional' }))
    expect(pro.warnings.find(w => w.id === 'base-clove-clove-bud')!.requiresAcknowledgment).toBe(false)
    // …but the result-level flag still follows critical-warning presence
    expect(pro.requiresAcknowledgment).toBe(true)
  })
})

// ============================================================================
// SCORING & SORT ORDER
// ============================================================================

describe('validateMixSafety — scoring and ordering', () => {
  it('a warning-free blend scores exactly 100', () => {
    expect(validateMixSafety([lavender], profile()).safetyScore).toBe(100)
  })

  it('deducts 15 points per critical warning (clove → 85)', () => {
    expect(validateMixSafety([clove], profile()).safetyScore).toBe(85)
  })

  it('combines critical and high deductions (hyssop: 15 + 10 → 75)', () => {
    // hyssop: base critical + neurotoxicity high
    expect(validateMixSafety([hyssop], profile()).safetyScore).toBe(75)
  })

  it('never scores below 0', () => {
    const result = validateMixSafety(
      [
        clove, wintergreen, hyssop,
        oil('cinnamon-bark', 'Cinnamon Bark'),
        oil('oregano', 'Oregano'),
        oil('lemon-myrtle', 'Lemon Myrtle'),
        oil('sage', 'Sage'),
        oil('eucalyptus', 'Eucalyptus'),
        oil('peppermint', 'Peppermint'),
        oil('tea-tree', 'Tea Tree'),
      ],
      profile()
    )
    expect(result.safetyScore).toBe(0)
  })

  it('sorts warnings critical → high → moderate → low → info', () => {
    const result = validateMixSafety(
      [hyssop, oil('sage', 'Sage'), oil('lemongrass', 'Lemongrass'), oil('tea-tree', 'Tea Tree')],
      profile()
    )
    const order = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 } as const
    for (let i = 1; i < result.warnings.length; i++) {
      expect(order[result.warnings[i].riskLevel]).toBeGreaterThanOrEqual(order[result.warnings[i - 1].riskLevel])
    }
    expect(result.warnings[0].riskLevel).toBe('critical')
  })
})

// ============================================================================
// EXPERIENCE-LEVEL GATING
// ============================================================================

describe('validateMixSafety — experience-level gating', () => {
  it('skips the generic neurotoxicity warning for professionals (base warning remains)', () => {
    const pro = validateMixSafety([hyssop], profile({ experienceLevel: 'professional' }))
    expect(pro.warnings.filter(w => w.id === 'tox-neuro')).toHaveLength(0)
    expect(pro.warnings.some(w => w.id === 'base-hyssop-hyssop')).toBe(true)

    const beginner = validateMixSafety([hyssop], profile({ experienceLevel: 'beginner' }))
    expect(beginner.warnings.some(w => w.id === 'tox-neuro')).toBe(true)
  })

  it('gates phototoxicity warnings to beginner/intermediate', () => {
    const bergamot = oil('bergamot', 'Bergamot')
    const beginner = validateMixSafety([bergamot], profile({ experienceLevel: 'beginner' }), 'topical')
    expect(beginner.warnings.some(w => w.id === 'photo-toxic')).toBe(true)

    const advanced = validateMixSafety([bergamot], profile({ experienceLevel: 'advanced' }), 'topical')
    expect(advanced.warnings.filter(w => w.id === 'photo-toxic')).toHaveLength(0)
  })

  it('gates phototoxicity warnings to topical routes', () => {
    const bergamot = oil('bergamot', 'Bergamot')
    const inhaled = validateMixSafety([bergamot], profile({ experienceLevel: 'beginner' }), 'inhalation')
    expect(inhaled.warnings.filter(w => w.id === 'photo-toxic')).toHaveLength(0)
  })

  it('gates infant age guidance to topical routes and non-expert users', () => {
    const infant = profile({ age: 0, ageGroup: 'infant_3_6mo' })
    const topical = validateMixSafety([lavender], infant, 'topical')
    expect(topical.warnings.some(w => w.id === 'age-infant')).toBe(true)

    const inhaled = validateMixSafety([lavender], infant, 'inhalation')
    expect(inhaled.warnings.filter(w => w.id === 'age-infant')).toHaveLength(0)

    const proInfant = validateMixSafety([lavender], profile({ age: 0, ageGroup: 'infant_3_6mo', experienceLevel: 'professional' }), 'topical')
    expect(proInfant.warnings.filter(w => w.id === 'age-infant')).toHaveLength(0)
  })

  it('provides experience-tiered messages on multi-audience warnings', () => {
    const result = validateMixSafety([clove], profile({ experienceLevel: 'professional' }))
    const w = result.warnings.find(x => x.id === 'base-clove-clove-bud')!
    expect(getWarningMessage(w, 'professional')).toContain('CYP2C9')
    expect(getWarningMessage(w, 'beginner')).toContain('eugenol')
    expect(getWarningMessage(w, 'beginner')).not.toBe(getWarningMessage(w, 'professional'))
  })
})

// ============================================================================
// PREGNANCY / TTC / LACTATION
// ============================================================================

describe('validateMixSafety — reproductive paths', () => {
  it('warns on hormone-affecting oils while trying to conceive', () => {
    const result = validateMixSafety([oil('clary-sage', 'Clary Sage')], profile({ isTryingToConceive: true }))
    const w = result.warnings.find(x => x.id === 'ttc-hormone')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('moderate')
    expect(w!.category).toBe('pregnancy')
  })

  it('raises no TTC warning for non-hormonal oils', () => {
    const result = validateMixSafety([lavender], profile({ isTryingToConceive: true }))
    expect(result.warnings.filter(w => w.id === 'ttc-hormone')).toHaveLength(0)
  })

  it('flags myrrh as critical feto-toxic when trying to conceive', () => {
    const result = validateMixSafety([oil('myrrh', 'Myrrh')], profile({ isTryingToConceive: true }))
    const w = result.warnings.find(x => x.id === 'base-myrrh-preg-myrrh')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('critical')
    expect(w!.requiresAcknowledgment).toBe(true)
  })

  it('flags juniper-berry as critical emmenagogue when pregnant', () => {
    const result = validateMixSafety([oil('juniper-berry', 'Juniper Berry')], profile({ isPregnant: true }))
    const w = result.warnings.find(x => x.id === 'base-juniper-preg-juniper-berry')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('critical')
  })

  it('does not raise myrrh/juniper pregnancy base warnings for non-pregnant users', () => {
    const result = validateMixSafety([oil('myrrh', 'Myrrh'), oil('juniper-berry', 'Juniper')], profile())
    expect(result.warnings.filter(w => w.id.startsWith('base-myrrh-preg') || w.id.startsWith('base-juniper-preg'))).toHaveLength(0)
  })

  it('warns that sage may reduce milk supply while breastfeeding', () => {
    const result = validateMixSafety([oil('sage', 'Sage')], profile({ isBreastfeeding: true }))
    const w = result.warnings.find(x => x.id === 'lact-sage')
    expect(w).toBeDefined()
    expect(w!.category).toBe('lactation')
    expect(w!.riskLevel).toBe('moderate')
  })

  it('raises no lactation warning when not breastfeeding', () => {
    const result = validateMixSafety([oil('sage', 'Sage')], profile())
    expect(result.warnings.filter(w => w.id === 'lact-sage')).toHaveLength(0)
  })
})

// ============================================================================
// ALLERGY HANDLING
// ============================================================================

describe('validateMixSafety — allergy handling', () => {
  it('flags ragweed allergy against chamomile (botanical family cross-reactivity)', () => {
    const chamomile = oil('chamomile-roman', 'Roman Chamomile')
    const result = validateMixSafety([chamomile], profile({ knownAllergies: ['ragweed'] }))
    const w = result.warnings.find(x => x.category === 'allergy')
    expect(w).toBeDefined()
    expect(w!.riskLevel).toBe('high')
    expect(w!.affectedOils).toContain('chamomile-roman')
    expect(w!.requiresAcknowledgment).toBe(true)
  })

  it('flags linalool component allergy against lavender and bergamot', () => {
    const result = validateMixSafety(
      [lavender, oil('bergamot', 'Bergamot')],
      profile({ knownAllergies: ['linalool'] })
    )
    const w = result.warnings.find(x => x.category === 'allergy')
    expect(w).toBeDefined()
    expect(w!.affectedOils).toEqual(expect.arrayContaining(['lavender', 'bergamot']))
  })

  it('flags mint-family allergy against rosemary via the legacy family check', () => {
    const result = validateMixSafety([oil('rosemary', 'Rosemary')], profile({ knownAllergies: ['mint'] }))
    const w = result.warnings.find(x => x.category === 'allergy')
    expect(w).toBeDefined()
    expect(w!.affectedOils).toContain('rosemary')
  })

  it('populates the allergyWarnings side-channel only when allergies match', () => {
    const withAllergy = validateMixSafety([lavender], profile({ knownAllergies: ['lavender'] }))
    expect(withAllergy.allergyWarnings).toBeDefined()
    expect(withAllergy.allergyWarnings!.length).toBeGreaterThan(0)

    const noMatch = validateMixSafety([lavender], profile({ knownAllergies: ['shellfish'] }))
    expect(noMatch.allergyWarnings).toBeUndefined()
  })

  it('does not flag allergies that match nothing in the blend', () => {
    const result = validateMixSafety([lavender], profile({ knownAllergies: ['peanuts'] }))
    expect(result.warnings.filter(w => w.category === 'allergy')).toHaveLength(0)
  })
})

// ============================================================================
// COMMUNITY WRAPPER
// ============================================================================

describe('validateMixSafetyForCommunity', () => {
  const basic = {
    age: 30,
    isPregnant: false,
    isBreastfeeding: false,
    healthConditions: [] as string[],
    medications: [] as Array<{ id: string; name: string; isActive: boolean }>,
  }

  it('never blocks and forces beginner experience', () => {
    const result = validateMixSafetyForCommunity([clove, hyssop], basic)
    expect(result.canProceed).toBe(true)
    expect(result.experienceLevel).toBe('beginner')
  })

  it('surfaces medication interactions for community members', () => {
    const result = validateMixSafetyForCommunity([clove], { ...basic, medications: [warfarin] }, 'topical')
    expect(result.warnings.some(w => w.title.includes('Blood Thinner'))).toBe(true)
  })

  it('shows beginner (verbose) messages, not professional ones', () => {
    const result = validateMixSafetyForCommunity([clove], basic)
    const w = result.warnings.find(x => x.id === 'base-clove-clove-bud')!
    expect(getWarningMessage(w, result.experienceLevel)).toBe(w.message)
  })

  it('handles a minimal profile without optional fields', () => {
    // Community profile has no allergies/experience/sensitivity fields at all
    const result = validateMixSafetyForCommunity([lavender], basic)
    expect(result.safetyScore).toBe(100)
  })
})

// ============================================================================
// getOilWarnings / getWarningMessage EDGE CASES
// ============================================================================

describe('getOilWarnings — edge cases', () => {
  it('gives birch the same methyl-salicylate warning as wintergreen', () => {
    const warnings = getOilWarnings('birch')
    expect(warnings.some(w => w.id === 'oil-wintergreen-blood')).toBe(true)
  })

  it('returns independent warning objects per call (no shared mutation)', () => {
    const a = getOilWarnings('clove-bud')
    const b = getOilWarnings('clove-bud')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('combines base and user-specific warnings when a profile is given', () => {
    const warnings = getOilWarnings('clove-bud', profile({ medications: [warfarin] }))
    expect(warnings.some(w => w.id === 'oil-clove-blood')).toBe(true)
    expect(warnings.some(w => w.title.includes('Blood Thinner'))).toBe(true)
  })

  it('returns [] for unknown oils even with a profile', () => {
    expect(getOilWarnings('not-an-oil', profile({ isPregnant: true }))).toEqual([])
  })
})

describe('getWarningMessage — remaining fallbacks', () => {
  const warning: SafetyWarning = {
    id: 'w',
    riskLevel: 'low',
    category: 'dosage',
    title: 't',
    message: 'base',
    messageIntermediate: undefined,
    messageAdvanced: undefined,
    messageProfessional: undefined,
    detailedExplanation: 'd',
    affectedOils: [],
    recommendation: 'r',
    requiresAcknowledgment: false,
  }

  it('advanced falls back to the base message when no tiered message exists', () => {
    expect(getWarningMessage(warning, 'advanced')).toBe('base')
  })

  it('unknown experience values fall through to the base message', () => {
    expect(getWarningMessage(warning, 'wizard' as any)).toBe('base')
  })
})
