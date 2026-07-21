/**
 * Hardening Tests — OIL_SAFETY_DATABASE Integrity (lib/safety/database.ts)
 *
 * Data-driven invariant checks across EVERY profile in the safety database.
 * These tests are the tripwire for future profile additions: a malformed
 * entry (bad enum, swapped dilution range, missing notes on an avoid-rated
 * oil) fails here before it can reach the engines.
 */

import {
  OIL_SAFETY_DATABASE,
  getOilSafetyProfile,
  getAllSafetyProfiles,
  getPhototoxicOils,
  getPregnancySafeOils,
  getPregnancyUnsafeOils,
  getChildSafeOils,
  getMaxDilutionForUser,
  areOilsIncompatible,
  getIncompatiblePairs,
  getPhototoxicStackingRisk,
} from '../database'
import { OilSafetyProfile } from '../types'

const DB_ENTRIES = Object.entries(OIL_SAFETY_DATABASE)

const PREGNANCY_ENUM = ['safe', 'caution', 'avoid', 'consult']
const AGE_ENUM = ['safe', 'dilute', 'avoid']
const TOXICITY_ENUM = ['none', 'low', 'moderate', 'high', 'extreme', 'low-to-moderate']
const INCOMPAT_SEVERITY_ENUM = ['avoid', 'caution', 'note']
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

// The atelier alias: 'sweet-orange' deliberately shares the 'orange-sweet' profile.
const DOCUMENTED_ALIASES: Record<string, string> = { 'sweet-orange': 'orange-sweet' }

// incompatibleOils may reference well-known aromatherapy oils that are not
// (yet) profiled in this database. Keep this list explicit and small.
const KNOWN_UNPROFILED_OILS = ['fennel', 'thyme', 'birch']

// ============================================================================
// STRUCTURAL INTEGRITY (data-driven over all profiles)
// ============================================================================

describe('OIL_SAFETY_DATABASE — structural integrity', () => {
  it('contains a meaningful number of profiles', () => {
    expect(DB_ENTRIES.length).toBeGreaterThanOrEqual(35)
  })

  test.each(DB_ENTRIES)('%s: required identity fields are non-empty strings', (key, p) => {
    expect(typeof p.oilId).toBe('string')
    expect(p.oilId.length).toBeGreaterThan(0)
    expect(typeof p.commonName).toBe('string')
    expect(p.commonName.length).toBeGreaterThan(0)
    expect(typeof p.botanicalName).toBe('string')
    expect(p.botanicalName.length).toBeGreaterThan(0)
  })

  test.each(DB_ENTRIES)('%s: database key is kebab-case', (key) => {
    expect(key).toMatch(KEBAB)
  })

  test.each(DB_ENTRIES)('%s: profile oilId is kebab-case', (_key, p) => {
    expect(p.oilId).toMatch(KEBAB)
  })

  test.each(DB_ENTRIES)('%s: profile oilId matches its key (except documented aliases)', (key, p) => {
    const expected = DOCUMENTED_ALIASES[key] ?? key
    expect(p.oilId).toBe(expected)
  })

  it('has no duplicate keys beyond the documented sweet-orange alias', () => {
    const profileIds = DB_ENTRIES.map(([, p]) => p.oilId)
    const counts = profileIds.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {})
    const duplicated = Object.entries(counts).filter(([, n]) => n > 1).map(([id]) => id)
    // Only the sweet-orange → orange-sweet alias may share a profile
    expect(duplicated).toEqual(['orange-sweet'])
  })

  it('aliases resolve to a real profile object', () => {
    for (const [alias, target] of Object.entries(DOCUMENTED_ALIASES)) {
      expect(OIL_SAFETY_DATABASE[alias]).toBeDefined()
      expect(OIL_SAFETY_DATABASE[alias]!.oilId).toBe(target)
    }
  })
})

// ============================================================================
// DILUTION LIMITS
// ============================================================================

describe('OIL_SAFETY_DATABASE — dilution limits', () => {
  test.each(DB_ENTRIES)('%s: maxDilutionPercent is within sane bounds (0 < x ≤ 100)', (_key, p) => {
    expect(typeof p.maxDilutionPercent).toBe('number')
    expect(Number.isFinite(p.maxDilutionPercent)).toBe(true)
    expect(p.maxDilutionPercent).toBeGreaterThan(0)
    expect(p.maxDilutionPercent).toBeLessThanOrEqual(100)
  })

  test.each(DB_ENTRIES)('%s: recommendedDilutionPercent is positive and never exceeds the max', (_key, p) => {
    expect(typeof p.recommendedDilutionPercent).toBe('number')
    expect(p.recommendedDilutionPercent).toBeGreaterThan(0)
    expect(p.recommendedDilutionPercent).toBeLessThanOrEqual(p.maxDilutionPercent)
  })

  test.each(DB_ENTRIES)('%s: skinSensitization.maxDilutionForSensitive is a sane positive number', (_key, p) => {
    expect(p.skinSensitization.maxDilutionForSensitive).toBeGreaterThan(0)
    expect(p.skinSensitization.maxDilutionForSensitive).toBeLessThanOrEqual(100)
  })
})

// ============================================================================
// ENUM FIELDS
// ============================================================================

describe('OIL_SAFETY_DATABASE — enum fields', () => {
  test.each(DB_ENTRIES)('%s: pregnancySafety is a known enum value', (_key, p) => {
    expect(PREGNANCY_ENUM).toContain(p.pregnancySafety)
  })

  test.each(DB_ENTRIES)('%s: breastfeedingSafety is a known enum value', (_key, p) => {
    expect(PREGNANCY_ENUM).toContain(p.breastfeedingSafety)
  })

  test.each(DB_ENTRIES)('%s: all age restrictions are known enum values', (_key, p) => {
    for (const band of ['under2Months', 'under6Months', 'under2Years', 'under6Years', 'under12Years'] as const) {
      expect(AGE_ENUM).toContain(p.ageRestrictions[band])
    }
  })

  test.each(DB_ENTRIES)('%s: toxicity.level is a known enum value', (_key, p) => {
    expect(TOXICITY_ENUM).toContain(p.toxicity.level)
  })

  test.each(DB_ENTRIES)('%s: incompatibility severities are known enum values', (_key, p) => {
    for (const inc of p.incompatibleOils) {
      expect(INCOMPAT_SEVERITY_ENUM).toContain(inc.severity)
    }
  })

  test.each(DB_ENTRIES)('%s: skinSensitization.riskLevel is low/moderate/high', (_key, p) => {
    expect(['low', 'moderate', 'high']).toContain(p.skinSensitization.riskLevel)
  })
})

// ============================================================================
// WARNINGS FOR AVOID-RATED OILS
// ============================================================================

describe('OIL_SAFETY_DATABASE — avoid-rated oils carry explanations', () => {
  const PREGNANCY_AVOID = DB_ENTRIES.filter(([, p]) => p.pregnancySafety === 'avoid')
  const BREASTFEEDING_AVOID = DB_ENTRIES.filter(([, p]) => p.breastfeedingSafety === 'avoid')

  it('has a substantial set of pregnancy-avoid oils (regression floor)', () => {
    // The remediation flagged at least 10 oils as pregnancy-avoid
    expect(PREGNANCY_AVOID.length).toBeGreaterThanOrEqual(10)
  })

  test.each(PREGNANCY_AVOID)('%s: pregnancy-avoid oil has non-empty pregnancyNotes', (_key, p) => {
    expect(typeof p.pregnancyNotes).toBe('string')
    expect(p.pregnancyNotes!.trim().length).toBeGreaterThan(10)
  })

  test.each(BREASTFEEDING_AVOID)('%s: breastfeeding-avoid oil has non-empty breastfeedingNotes', (_key, p) => {
    expect(typeof p.breastfeedingNotes).toBe('string')
    expect(p.breastfeedingNotes!.trim().length).toBeGreaterThan(10)
  })

  test.each(DB_ENTRIES)('%s: photosensitive oils declare a sun-avoidance window', (_key, p) => {
    if (p.photosensitivity.isPhotosensitive) {
      expect(p.photosensitivity.safeAfterHours).toBeDefined()
      expect(p.photosensitivity.safeAfterHours!).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// NESTED COLLECTIONS
// ============================================================================

describe('OIL_SAFETY_DATABASE — nested collections', () => {
  test.each(DB_ENTRIES)('%s: keyConstituents have ordered percentage ranges within [0, 100]', (_key, p) => {
    expect(Array.isArray(p.keyConstituents)).toBe(true)
    expect(p.keyConstituents.length).toBeGreaterThan(0)
    for (const c of p.keyConstituents) {
      expect(c.percentageRange[0]).toBeGreaterThanOrEqual(0)
      expect(c.percentageRange[0]).toBeLessThanOrEqual(c.percentageRange[1])
      expect(c.percentageRange[1]).toBeLessThanOrEqual(100)
      expect(typeof c.name).toBe('string')
      expect(c.name.length).toBeGreaterThan(0)
    }
  })

  test.each(DB_ENTRIES)('%s: contraindications are well-formed', (_key, p) => {
    for (const c of p.contraindications) {
      expect(typeof c.type).toBe('string')
      expect(typeof c.severity).toBe('string')
      expect(c.description.trim().length).toBeGreaterThan(0)
    }
  })

  test.each(DB_ENTRIES)('%s: incompatibleOils give a reason', (_key, p) => {
    for (const inc of p.incompatibleOils) {
      expect(inc.reason.trim().length).toBeGreaterThan(0)
    }
  })

  test.each(DB_ENTRIES)('%s: incompatibleOils reference profiled oils or known generic oils', (_key, p) => {
    for (const inc of p.incompatibleOils) {
      const known = OIL_SAFETY_DATABASE[inc.oilId] !== undefined || KNOWN_UNPROFILED_OILS.includes(inc.oilId)
      expect(known).toBe(true)
    }
  })

  test.each(DB_ENTRIES)('%s: first-aid guidance is complete', (_key, p) => {
    for (const field of ['skinContact', 'eyeContact', 'ingestion', 'inhalation'] as const) {
      expect(p.firstAid[field].trim().length).toBeGreaterThan(5)
    }
  })

  test.each(DB_ENTRIES)('%s: cites at least one source', (_key, p) => {
    expect(Array.isArray(p.sources)).toBe(true)
    expect(p.sources.length).toBeGreaterThan(0)
  })

  test.each(DB_ENTRIES)('%s: drugInteractions are well-formed', (_key, p) => {
    for (const d of p.drugInteractions) {
      expect(d.drugClass.trim().length).toBeGreaterThan(0)
      expect(['potentiates', 'inhibits', 'unknown', 'potential']).toContain(d.effect)
      expect(d.description.trim().length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

describe('database helpers', () => {
  it('getOilSafetyProfile returns the profile for known ids and undefined for unknown', () => {
    expect(getOilSafetyProfile('lavender')?.commonName).toBe('Lavender')
    expect(getOilSafetyProfile('definitely-not-an-oil')).toBeUndefined()
  })

  it('getAllSafetyProfiles returns one entry per database key', () => {
    expect(getAllSafetyProfiles().length).toBe(DB_ENTRIES.length)
  })

  it('getPhototoxicOils returns only photosensitive oils and includes bergamot', () => {
    const phototoxic = getPhototoxicOils()
    expect(phototoxic.length).toBeGreaterThan(0)
    expect(phototoxic.every(p => p.photosensitivity.isPhotosensitive)).toBe(true)
    expect(phototoxic.map(p => p.oilId)).toContain('bergamot')
    expect(phototoxic.map(p => p.oilId)).not.toContain('bergamot-fcf')
  })

  it('getPregnancySafeOils excludes every avoid-rated oil', () => {
    const safe = getPregnancySafeOils()
    expect(safe.every(p => p.pregnancySafety !== 'avoid')).toBe(true)
    expect(safe.map(p => p.oilId)).toContain('lavender')
  })

  it('getPregnancyUnsafeOils returns exactly the avoid-rated set', () => {
    const unsafe = getPregnancyUnsafeOils()
    expect(unsafe.every(p => p.pregnancySafety === 'avoid')).toBe(true)
    expect(unsafe.map(p => p.oilId)).toContain('wintergreen')
  })

  it('getChildSafeOils(1 month) returns only oils not avoided for newborns', () => {
    const safe = getChildSafeOils(1)
    expect(safe.every(p => p.ageRestrictions.under2Months !== 'avoid')).toBe(true)
    expect(safe.map(p => p.oilId)).toContain('lavender')
    expect(safe.map(p => p.oilId)).not.toContain('clove-bud')
  })

  it('getChildSafeOils becomes less restrictive with age', () => {
    const newborn = getChildSafeOils(1).length
    const toddler = getChildSafeOils(36).length
    const teen = getChildSafeOils(150).length
    expect(toddler).toBeGreaterThanOrEqual(newborn)
    expect(teen).toBeGreaterThanOrEqual(toddler)
  })

  it('getMaxDilutionForUser returns 0 for unknown oils', () => {
    expect(getMaxDilutionForUser('not-an-oil', 30, false, false)).toBe(0)
  })

  it('getMaxDilutionForUser caps pregnancy at 1% and zeroes avoid-rated oils', () => {
    // lavender (safe) is capped to the general pregnancy max of 1%
    expect(getMaxDilutionForUser('lavender', 30, true, false)).toBe(1)
    // wintergreen (avoid) is zeroed
    expect(getMaxDilutionForUser('wintergreen', 30, true, false)).toBe(0)
  })

  it('getMaxDilutionForUser zeroes breastfeeding-avoid oils only while breastfeeding', () => {
    expect(getMaxDilutionForUser('clove-bud', 30, false, true)).toBe(0)
    expect(getMaxDilutionForUser('clove-bud', 30, false, false)).toBeGreaterThan(0)
  })

  it('getMaxDilutionForUser applies child caps for dilute-rated bands', () => {
    // lemongrass under2Years is 'dilute' → capped at 0.25 for a 1-year-old
    expect(getMaxDilutionForUser('lemongrass', 1, false, false)).toBe(0.25)
    // adults get the full profile max
    expect(getMaxDilutionForUser('lemongrass', 30, false, false)).toBe(0.7)
  })

  it('areOilsIncompatible detects avoid pairs symmetrically', () => {
    const forward = areOilsIncompatible('lemongrass', 'lemon-myrtle')
    expect(forward.incompatible).toBe(true)
    expect(forward.severity).toBe('avoid')

    const reverse = areOilsIncompatible('lemon-myrtle', 'lemongrass')
    expect(reverse.incompatible).toBe(true)
    expect(reverse.severity).toBe('avoid')
  })

  it('areOilsIncompatible returns incompatible=false for unknown oils', () => {
    expect(areOilsIncompatible('not-an-oil', 'lavender').incompatible).toBe(false)
    expect(areOilsIncompatible('not-an-oil', 'also-not-an-oil').incompatible).toBe(false)
  })

  it('getIncompatiblePairs finds each avoid pair once in a mixed list', () => {
    const pairs = getIncompatiblePairs(['lemongrass', 'lemon-myrtle', 'lavender'])
    const avoidPairs = pairs.filter(p => p.severity === 'avoid')
    expect(avoidPairs).toHaveLength(1)
    expect(avoidPairs[0].oil1).toBe('lemongrass')
    expect(avoidPairs[0].oil2).toBe('lemon-myrtle')
  })

  it('getIncompatiblePairs on an empty list returns empty', () => {
    expect(getIncompatiblePairs([])).toEqual([])
  })

  it('getPhototoxicStackingRisk reports no risk for non-phototoxic oils', () => {
    const risk = getPhototoxicStackingRisk(['lavender', 'frankincense'])
    expect(risk.hasRisk).toBe(false)
    expect(risk.cumulativeRisk).toBe('none')
    expect(risk.oils).toEqual([])
  })

  it('getPhototoxicStackingRisk escalates with the number of phototoxic oils', () => {
    const one = getPhototoxicStackingRisk(['bergamot'])
    expect(one.hasRisk).toBe(true)
    expect(one.cumulativeRisk).toBe('low')

    const two = getPhototoxicStackingRisk(['bergamot', 'lime'])
    expect(two.cumulativeRisk).toBe('moderate')

    const three = getPhototoxicStackingRisk(['bergamot', 'lime', 'lemon'])
    expect(three.cumulativeRisk).toBe('high')
    expect(three.maxSafeDilution).toBeLessThanOrEqual(0.7) // most restrictive of the three
  })

  it('getPhototoxicStackingRisk uses the longest sun-avoidance window', () => {
    const risk = getPhototoxicStackingRisk(['bergamot', 'lemon'])
    const expected = Math.max(
      getOilSafetyProfile('bergamot')!.photosensitivity.safeAfterHours ?? 12,
      getOilSafetyProfile('lemon')!.photosensitivity.safeAfterHours ?? 12,
    )
    expect(risk.sunAvoidanceHours).toBe(expected)
  })
})
