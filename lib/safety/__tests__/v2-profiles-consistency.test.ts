/**
 * V2 Safety Engine ↔ Profiles DB Consistency Tests
 *
 * Data-driven verification that comprehensive-safety-v2 derives its pregnancy
 * verdicts from OIL_SAFETY_DATABASE (single source of truth):
 * - every oil the DB marks pregnancy 'avoid' is flagged HIGH or CRITICAL
 *   (no exceptions — the cinnamon-bark exception was removed 2026-07-21,
 *   see the "unified" note below)
 * - every oil the DB marks pregnancy 'caution' is flagged at least MODERATE
 * - oils the DB marks 'safe' produce no pregnancy warning
 * - v2's "never block, only warn" philosophy is preserved
 */

import {
  validateMixSafety,
  UserSafetyProfile,
  OilComponent,
} from '../comprehensive-safety-v2'
import { OIL_SAFETY_DATABASE } from '../database'

const DB_ENTRIES = Object.entries(OIL_SAFETY_DATABASE)

function pregnantProfile(): UserSafetyProfile {
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

function nonPregnantProfile(): UserSafetyProfile {
  return { ...pregnantProfile(), isPregnant: false }
}

function singleOil(oilId: string, commonName: string): OilComponent[] {
  return [{ oilId, name: commonName, ml: 1, drops: 20 }]
}

const AVOID_OILS = DB_ENTRIES.filter(([, p]) => p.pregnancySafety === 'avoid')
const CAUTION_OILS = DB_ENTRIES.filter(([, p]) => p.pregnancySafety === 'caution')
const SAFE_OILS = DB_ENTRIES.filter(([, p]) => p.pregnancySafety === 'safe')

// Unified 2026-07-21: there are no audit-pinned exceptions anymore. Every DB
// 'avoid' oil — cinnamon-bark included — flags HIGH/CRITICAL in v2.

describe('v2 derives pregnancy verdicts from the profiles DB', () => {
  it('covers at least the oils the hardcoded lists used to miss', () => {
    const previouslyMissed = [
      'wintergreen', 'clove-bud', 'camphor-white', 'tea-tree', 'eucalyptus',
      'cedarwood', 'lemongrass', 'may-chang', 'lemon-myrtle', 'juniper-berry', 'myrrh',
    ]
    for (const oilId of previouslyMissed) {
      const profile = OIL_SAFETY_DATABASE[oilId]
      expect(profile).toBeDefined()
      expect(profile!.pregnancySafety).toBe('avoid')
    }
  })

  describe('pregnancy-avoid oils are flagged HIGH or CRITICAL', () => {
    test.each(AVOID_OILS)(
      '%s (DB: avoid) produces a high/critical pregnancy warning',
      (oilId, profile) => {
        const result = validateMixSafety(singleOil(oilId, profile.commonName), pregnantProfile())
        const strong = result.warnings.filter(w =>
          w.category === 'pregnancy' &&
          (w.riskLevel === 'high' || w.riskLevel === 'critical') &&
          w.affectedOils.includes(oilId)
        )
        expect(strong.length).toBeGreaterThan(0)
      }
    )
  })

  describe('no exceptions to the DB verdicts', () => {
    it('cinnamon-bark (DB: avoid) flags HIGH — the former MODERATE exception is gone', () => {
      // -- unified 2026-07-21: DB is authoritative; cinnamon-bark is avoid-in-pregnancy
      const result = validateMixSafety(singleOil('cinnamon-bark', 'Cinnamon Bark'), pregnantProfile())
      const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy')
      expect(pregnancyWarnings.length).toBeGreaterThan(0)
      expect(pregnancyWarnings[0].riskLevel).toBe('high')
      expect(pregnancyWarnings[0].affectedOils).toContain('cinnamon-bark')
    })
  })

  describe('pregnancy-caution oils are flagged at least MODERATE', () => {
    test.each(CAUTION_OILS)(
      '%s (DB: caution) produces a moderate-or-stronger pregnancy warning',
      (oilId, profile) => {
        const result = validateMixSafety(singleOil(oilId, profile.commonName), pregnantProfile())
        const flagged = result.warnings.filter(w =>
          w.category === 'pregnancy' &&
          ['moderate', 'high', 'critical'].includes(w.riskLevel) &&
          w.affectedOils.includes(oilId)
        )
        expect(flagged.length).toBeGreaterThan(0)
      }
    )
  })

  describe('pregnancy-safe oils produce no pregnancy warning', () => {
    test.each(SAFE_OILS)(
      '%s (DB: safe) produces no pregnancy warning',
      (oilId, profile) => {
        const result = validateMixSafety(singleOil(oilId, profile.commonName), pregnantProfile())
        const flagged = result.warnings.filter(w =>
          w.category === 'pregnancy' && w.affectedOils.includes(oilId)
        )
        expect(flagged.length).toBe(0)
      }
    )
  })

  describe('philosophy and scope preserved', () => {
    it('never blocks, even for pregnancy-avoid oils', () => {
      for (const [oilId, profile] of AVOID_OILS) {
        const result = validateMixSafety(singleOil(oilId, profile.commonName), pregnantProfile())
        expect(result.canProceed).toBe(true)
      }
    })

    it('produces no pregnancy warnings when the user is not pregnant', () => {
      for (const [oilId, profile] of AVOID_OILS) {
        const result = validateMixSafety(singleOil(oilId, profile.commonName), nonPregnantProfile())
        expect(result.warnings.filter(w => w.category === 'pregnancy')).toHaveLength(0)
      }
    })

    it('keeps the audit-pinned HIGH uterine-stimulant group intact', () => {
      const oils: OilComponent[] = [
        { oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 },
        { oilId: 'rosemary', name: 'Rosemary', ml: 1, drops: 20 },
      ]
      const result = validateMixSafety(oils, pregnantProfile())
      const high = result.warnings.find(w => w.category === 'pregnancy' && w.riskLevel === 'high')
      expect(high).toBeDefined()
      expect(high!.affectedOils).toEqual(expect.arrayContaining(['clary-sage', 'rosemary']))
    })
  })
})
