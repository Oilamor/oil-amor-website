/**
 * Hardening Tests — Medication Database (lib/safety/medication-database.ts)
 *
 * Data-driven integrity checks:
 * - every medication entry has required, well-typed fields
 * - interaction severities / evidence levels are valid enums
 * - referenced oil ids exist in the safety DB or are documented generic oils
 * - referenced condition ids exist in HEALTH_CONDITIONS (no orphans)
 * - search / lookup utilities behave sanely on good and garbage input
 */

import {
  COMMON_MEDICATIONS,
  OIL_MEDICATION_INTERACTIONS,
  HEALTH_CONDITIONS,
  OIL_CONDITION_CONTRAINDICATIONS,
  AGE_DOSAGE_LIMITS,
  searchMedications,
  getMedicationsByClass,
  getContraindicatedOils,
} from '../medication-database'
import { OIL_SAFETY_DATABASE } from '../database'

const INTERACTION_SEVERITIES = ['contraindicated', 'major', 'moderate', 'minor']
const EVIDENCE_LEVELS = ['clinical', 'theoretical', 'traditional', 'anecdotal']

// Oils referenced by the interaction data that are legitimate aromatherapy
// agents but not (yet) profiled in OIL_SAFETY_DATABASE.
const GENERIC_UNPROFILED_OILS = [
  'aniseed', 'birch', 'camphor', 'chamomile-german', 'coriander', 'fennel',
  'hyssop', 'licorice-root', 'myrtle', 'roman-chamomile', 'sage', 'valerian',
  'wormwood',
]

// ============================================================================
// COMMON_MEDICATIONS INTEGRITY
// ============================================================================

describe('COMMON_MEDICATIONS — entry integrity', () => {
  it('covers a meaningful number of medications', () => {
    expect(COMMON_MEDICATIONS.length).toBeGreaterThanOrEqual(50)
  })

  it('every medication has a non-empty generic name and drug class', () => {
    for (const med of COMMON_MEDICATIONS) {
      expect(typeof med.genericName).toBe('string')
      expect(med.genericName.trim().length).toBeGreaterThan(0)
      expect(typeof med.drugClass).toBe('string')
      expect(med.drugClass.trim().length).toBeGreaterThan(0)
    }
  })

  it('generic names are unique', () => {
    const names = COMMON_MEDICATIONS.map(m => m.genericName.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('effect flags are booleans when present', () => {
    for (const med of COMMON_MEDICATIONS) {
      for (const flag of [
        'affectsBloodClotting', 'affectsBloodPressure', 'affectsBloodSugar',
        'affectsLiver', 'affectsKidney', 'affectsCns', 'affectsHeart',
      ] as const) {
        if (med[flag] !== undefined) {
          expect(typeof med[flag]).toBe('boolean')
        }
      }
    }
  })

  it('brand names and search terms are non-empty strings when present', () => {
    for (const med of COMMON_MEDICATIONS) {
      for (const b of med.brandNames ?? []) {
        expect(typeof b).toBe('string')
        expect(b.trim().length).toBeGreaterThan(0)
      }
      for (const t of med.searchTerms ?? []) {
        expect(typeof t).toBe('string')
        expect(t.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('includes the safety-critical anticoagulant class (warfarin et al.)', () => {
    const bloodThinners = COMMON_MEDICATIONS.filter(m => m.affectsBloodClotting)
    expect(bloodThinners.length).toBeGreaterThanOrEqual(5)
    expect(bloodThinners.map(m => m.genericName)).toContain('Warfarin')
  })

  it('metabolism pathway strings look like CYP annotations when present', () => {
    for (const med of COMMON_MEDICATIONS) {
      if (med.metabolismPathway) {
        expect(typeof med.metabolismPathway).toBe('string')
        expect(med.metabolismPathway.length).toBeGreaterThan(2)
      }
    }
  })
})

// ============================================================================
// OIL_MEDICATION_INTERACTIONS INTEGRITY
// ============================================================================

describe('OIL_MEDICATION_INTERACTIONS — integrity', () => {
  it('contains a substantial interaction set', () => {
    expect(OIL_MEDICATION_INTERACTIONS.length).toBeGreaterThanOrEqual(70)
  })

  it('every interaction has an oilId, mechanism and recommendation', () => {
    for (const ix of OIL_MEDICATION_INTERACTIONS) {
      expect(typeof ix.oilId).toBe('string')
      expect(ix.oilId!.trim().length).toBeGreaterThan(0)
      expect(typeof ix.mechanism).toBe('string')
      expect(ix.mechanism!.trim().length).toBeGreaterThan(10)
      expect(typeof ix.recommendation).toBe('string')
      expect(ix.recommendation!.trim().length).toBeGreaterThan(0)
    }
  })

  it('every severity is a valid enum value', () => {
    for (const ix of OIL_MEDICATION_INTERACTIONS) {
      expect(INTERACTION_SEVERITIES).toContain(ix.severity)
    }
  })

  it('every evidence level is a valid enum value', () => {
    for (const ix of OIL_MEDICATION_INTERACTIONS) {
      if (ix.evidenceLevel !== undefined) {
        expect(EVIDENCE_LEVELS).toContain(ix.evidenceLevel)
      }
    }
  })

  it('referenced oil ids exist in the safety DB or are documented generic oils', () => {
    const unknown = OIL_MEDICATION_INTERACTIONS
      .map(ix => ix.oilId!)
      .filter(id => OIL_SAFETY_DATABASE[id] === undefined && !GENERIC_UNPROFILED_OILS.includes(id))
    expect(unknown).toEqual([])
  })

  it('potentialEffects is a non-empty array when present', () => {
    for (const ix of OIL_MEDICATION_INTERACTIONS) {
      if (ix.potentialEffects !== undefined) {
        expect(Array.isArray(ix.potentialEffects)).toBe(true)
        expect(ix.potentialEffects.length).toBeGreaterThan(0)
      }
    }
  })

  it('contraindicated interactions carry strong recommendation language', () => {
    const contraindicated = OIL_MEDICATION_INTERACTIONS.filter(ix => ix.severity === 'contraindicated')
    expect(contraindicated.length).toBeGreaterThan(0)
    for (const ix of contraindicated) {
      expect(ix.recommendation!.toUpperCase()).toMatch(/CONTRAINDICATED|AVOID|NEVER|ABSOLUTELY/)
    }
  })

  it('flags the clove-bud / anticoagulant pair as contraindicated', () => {
    const clove = OIL_MEDICATION_INTERACTIONS.filter(
      ix => ix.oilId === 'clove-bud' && ix.severity === 'contraindicated'
    )
    expect(clove.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// HEALTH_CONDITIONS INTEGRITY
// ============================================================================

describe('HEALTH_CONDITIONS — integrity', () => {
  it('covers a meaningful number of conditions', () => {
    expect(HEALTH_CONDITIONS.length).toBeGreaterThanOrEqual(40)
  })

  it('condition ids are unique', () => {
    const ids = HEALTH_CONDITIONS.map((c: any) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every condition has id, name, category and boolean flags', () => {
    for (const c of HEALTH_CONDITIONS as any[]) {
      expect(typeof c.id).toBe('string')
      expect(c.id.trim().length).toBeGreaterThan(0)
      expect(typeof c.name).toBe('string')
      expect(c.name.trim().length).toBeGreaterThan(0)
      expect(typeof c.category).toBe('string')
      expect(c.category.trim().length).toBeGreaterThan(0)
      expect(typeof c.isLifeThreatening).toBe('boolean')
      expect(typeof c.requiresMedicalSupervision).toBe('boolean')
      expect(Array.isArray(c.aliases)).toBe(true)
    }
  })

  it('includes the conditions the v2 engine special-cases', () => {
    const ids = HEALTH_CONDITIONS.map((c: any) => c.id)
    for (const required of ['epilepsy', 'hemophilia', 'thrombocytopenia', 'asthma', 'severe_asthma']) {
      expect(ids).toContain(required)
    }
  })
})

// ============================================================================
// OIL_CONDITION_CONTRAINDICATIONS — NO ORPHAN REFERENCES
// ============================================================================

describe('OIL_CONDITION_CONTRAINDICATIONS — referential integrity', () => {
  it('every referenced conditionId exists in HEALTH_CONDITIONS', () => {
    const conditionIds = new Set(HEALTH_CONDITIONS.map((c: any) => c.id))
    const orphans = OIL_CONDITION_CONTRAINDICATIONS
      .map((c: any) => c.conditionId)
      .filter((id: string) => !conditionIds.has(id))
    expect([...new Set(orphans)]).toEqual([])
  })

  it('every severity is a valid enum value', () => {
    for (const c of OIL_CONDITION_CONTRAINDICATIONS as any[]) {
      expect(INTERACTION_SEVERITIES).toContain(c.severity)
    }
  })

  it('every evidence level is a valid enum value', () => {
    for (const c of OIL_CONDITION_CONTRAINDICATIONS as any[]) {
      if (c.evidenceLevel !== undefined) {
        expect(EVIDENCE_LEVELS).toContain(c.evidenceLevel)
      }
    }
  })

  it('every entry gives a reason and non-empty specificRisks', () => {
    for (const c of OIL_CONDITION_CONTRAINDICATIONS as any[]) {
      expect(c.reason.trim().length).toBeGreaterThan(10)
      expect(Array.isArray(c.specificRisks)).toBe(true)
      expect(c.specificRisks.length).toBeGreaterThan(0)
    }
  })

  it('referenced oil ids exist in the safety DB or are documented generic oils', () => {
    const unknown = (OIL_CONDITION_CONTRAINDICATIONS as any[])
      .map(c => c.oilId)
      .filter((id: string) => OIL_SAFETY_DATABASE[id] === undefined && !GENERIC_UNPROFILED_OILS.includes(id))
    expect(unknown).toEqual([])
  })

  it('epilepsy contraindications cover the classic convulsant oils', () => {
    const epilepsyOils = (OIL_CONDITION_CONTRAINDICATIONS as any[])
      .filter(c => c.conditionId === 'epilepsy')
      .map(c => c.oilId)
    for (const oil of ['hyssop', 'sage', 'camphor', 'wormwood', 'rosemary']) {
      expect(epilepsyOils).toContain(oil)
    }
  })
})

// ============================================================================
// AGE_DOSAGE_LIMITS
// ============================================================================

describe('AGE_DOSAGE_LIMITS — sanity', () => {
  const ORDER = [
    'infant_0_3mo', 'infant_3_6mo', 'infant_6_12mo', 'child_1_2yr',
    'child_2_6yr', 'child_6_12yr', 'teen_12_15yr', 'adult',
  ] as const

  it('maxDrops is monotonically non-decreasing from infancy to adulthood', () => {
    for (let i = 1; i < ORDER.length; i++) {
      expect(AGE_DOSAGE_LIMITS[ORDER[i]].maxDrops)
        .toBeGreaterThanOrEqual(AGE_DOSAGE_LIMITS[ORDER[i - 1]].maxDrops)
    }
  })

  it('maxDilution is monotonically non-decreasing and within (0, 5]', () => {
    for (let i = 1; i < ORDER.length; i++) {
      expect(AGE_DOSAGE_LIMITS[ORDER[i]].maxDilution)
        .toBeGreaterThanOrEqual(AGE_DOSAGE_LIMITS[ORDER[i - 1]].maxDilution)
    }
    for (const key of ORDER) {
      expect(AGE_DOSAGE_LIMITS[key].maxDilution).toBeGreaterThan(0)
      expect(AGE_DOSAGE_LIMITS[key].maxDilution).toBeLessThanOrEqual(5)
    }
  })

  it('newborns (0-3mo) get zero drops and the tightest dilution', () => {
    expect(AGE_DOSAGE_LIMITS.infant_0_3mo.maxDrops).toBe(0)
    expect(AGE_DOSAGE_LIMITS.infant_0_3mo.maxDilution)
      .toBeLessThanOrEqual(AGE_DOSAGE_LIMITS.infant_3_6mo.maxDilution)
  })

  it('elderly dosing is reduced relative to adult dosing', () => {
    expect(AGE_DOSAGE_LIMITS.elderly.maxDrops).toBeLessThan(AGE_DOSAGE_LIMITS.adult.maxDrops)
    expect(AGE_DOSAGE_LIMITS.elderly.maxDilution).toBeLessThan(AGE_DOSAGE_LIMITS.adult.maxDilution)
  })

  it('every band has a label and guidance notes', () => {
    for (const band of Object.values(AGE_DOSAGE_LIMITS)) {
      expect(band.label.trim().length).toBeGreaterThan(0)
      expect(band.notes.trim().length).toBeGreaterThan(10)
    }
  })
})

// ============================================================================
// SEARCH / LOOKUP UTILITIES
// ============================================================================

describe('medication-database utilities', () => {
  it('searchMedications finds by generic name, case-insensitively', () => {
    const results = searchMedications('warfarin')
    expect(results.map(m => m.genericName)).toContain('Warfarin')

    const upper = searchMedications('WARFARIN')
    expect(upper.map(m => m.genericName)).toContain('Warfarin')
  })

  it('searchMedications finds by brand name', () => {
    const results = searchMedications('coumadin')
    expect(results.map(m => m.genericName)).toContain('Warfarin')
  })

  it('searchMedications finds by search term and drug class', () => {
    const byTerm = searchMedications('blood thinner')
    expect(byTerm.length).toBeGreaterThan(0)

    const byClass = searchMedications('anticoagulant')
    expect(byClass.length).toBeGreaterThan(0)
  })

  it('searchMedications returns empty for garbage input', () => {
    expect(searchMedications('zzzz-not-a-medication')).toEqual([])
  })

  it('searchMedications on an empty string returns the full list without crashing', () => {
    // No empty-query guard exists here (unlike the autocomplete wrapper):
    // ''.includes('') matches every entry. Documented behavior — consumers
    // must guard the query themselves.
    expect(searchMedications('')).toHaveLength(COMMON_MEDICATIONS.length)
  })

  it('getMedicationsByClass is case-insensitive and returns the class members', () => {
    const results = getMedicationsByClass('ACE INHIBITOR')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(m => m.drugClass.toLowerCase().includes('ace inhibitor'))).toBe(true)
  })

  it('getMedicationsByClass returns empty for unknown classes', () => {
    expect(getMedicationsByClass('not-a-drug-class')).toEqual([])
  })

  it('getContraindicatedOils returns an array for known and unknown ids', () => {
    // Interaction rows are generic (medicationId unset) except one 'simvastatin'
    // row rated minor — so major/contraindicated filtering yields no rows yet.
    expect(Array.isArray(getContraindicatedOils('warfarin'))).toBe(true)
    expect(getContraindicatedOils('not-a-medication')).toEqual([])
  })
})
