/**
 * Comprehensive Safety System V2 - Unit Tests
 * 
 * Tests for safety-critical validation functions.
 */

import {
  validateMixSafety,
  validateMixSafetyForCommunity,
  getWarningMessage,
  getOilWarnings,
  type UserSafetyProfile,
  type OilComponent,
  type ExperienceLevel,
} from '../comprehensive-safety-v2';

// ============================================================================
// TEST DATA
// ============================================================================

const baseProfile: UserSafetyProfile = {
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
};

const cloveOil: OilComponent = { oilId: 'clove-bud', name: 'Clove Bud', ml: 2, drops: 40 };
const lavenderOil: OilComponent = { oilId: 'lavender', name: 'Lavender', ml: 5, drops: 100 };
const wintergreenOil: OilComponent = { oilId: 'wintergreen', name: 'Wintergreen', ml: 2, drops: 40 };
const hyssopOil: OilComponent = { oilId: 'hyssop', name: 'Hyssop', ml: 1, drops: 20 };

// ============================================================================
// TESTS
// ============================================================================

describe('Comprehensive Safety V2', () => {
  describe('getWarningMessage', () => {
    const warning = {
      id: 'test',
      riskLevel: 'high' as const,
      category: 'pregnancy' as const,
      title: 'Test',
      message: 'Beginner message',
      messageIntermediate: 'Intermediate message',
      messageAdvanced: 'Advanced message',
      messageProfessional: 'Pro message',
      detailedExplanation: 'Details',
      affectedOils: [],
      recommendation: 'Rec',
      requiresAcknowledgment: false,
    };

    it('returns beginner message by default', () => {
      expect(getWarningMessage(warning, 'beginner')).toBe('Beginner message');
    });

    it('returns intermediate message when available', () => {
      expect(getWarningMessage(warning, 'intermediate')).toBe('Intermediate message');
    });

    it('falls back to beginner when intermediate missing', () => {
      const w = { ...warning, messageIntermediate: undefined };
      expect(getWarningMessage(w, 'intermediate')).toBe('Beginner message');
    });

    it('returns professional message for professionals', () => {
      expect(getWarningMessage(warning, 'professional')).toBe('Pro message');
    });

    it('falls back through message chain', () => {
      const w = { ...warning, messageProfessional: undefined };
      expect(getWarningMessage(w, 'professional')).toBe('Advanced message');
    });
  });

  describe('validateMixSafety', () => {
    it('always returns canProceed true', () => {
      const result = validateMixSafety([cloveOil], baseProfile);
      expect(result.canProceed).toBe(true);
    });

    it('returns warnings sorted by severity', () => {
      const result = validateMixSafety([cloveOil, hyssopOil], baseProfile);
      const severities = result.warnings.map(w => w.riskLevel);
      // critical should come before high, moderate, low, info
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
      for (let i = 1; i < severities.length; i++) {
        expect(severityOrder[severities[i]!]).toBeGreaterThanOrEqual(
          severityOrder[severities[i - 1]!]
        );
      }
    });

    it('flags clove bud for blood thinning risk', () => {
      const result = validateMixSafety([cloveOil], baseProfile);
      const cloveWarning = result.warnings.find(w =>
        w.affectedOils.includes('clove-bud') && w.category === 'toxicity'
      );
      expect(cloveWarning).toBeDefined();
      expect(cloveWarning!.riskLevel).toBe('critical');
      expect(cloveWarning!.requiresAcknowledgment).toBe(true);
    });

    it('detects blood thinner + clove interaction', () => {
      const profile: UserSafetyProfile = {
        ...baseProfile,
        medications: [{ id: 'warfarin', name: 'warfarin', isActive: true }],
      };
      const result = validateMixSafety([cloveOil], profile, 'topical');
      const medWarning = result.warnings.find(w =>
        w.category === 'medication' && w.title.includes('Blood Thinner')
      );
      expect(medWarning).toBeDefined();
      expect(medWarning!.riskLevel).toBe('critical');
    });

    it('warns about pregnancy contraindications for emmenagogue oils', () => {
      const profile: UserSafetyProfile = {
        ...baseProfile,
        isPregnant: true,
      };
      const result = validateMixSafety([hyssopOil], profile);
      const pregWarnings = result.warnings.filter(w => w.category === 'pregnancy');
      expect(pregWarnings.length).toBeGreaterThan(0);
    });

    it('warns about lactation concerns for sage', () => {
      const profile: UserSafetyProfile = {
        ...baseProfile,
        isBreastfeeding: true,
      };
      const sage: OilComponent = { oilId: 'sage', name: 'Sage', ml: 1, drops: 20 };
      const result = validateMixSafety([sage], profile);
      const lactWarnings = result.warnings.filter(w => w.category === 'lactation');
      expect(lactWarnings.length).toBeGreaterThan(0);
    });

    it('detects allergy cross-reactivity for citrus', () => {
      const profile: UserSafetyProfile = {
        ...baseProfile,
        knownAllergies: ['citrus'],
      };
      const result = validateMixSafety(
        [{ oilId: 'bergamot', name: 'Bergamot', ml: 2, drops: 40 }],
        profile
      );
      const allergyWarning = result.warnings.find(w => w.category === 'allergy');
      expect(allergyWarning).toBeDefined();
    });

    it('requires acknowledgment when critical warnings exist', () => {
      const result = validateMixSafety([cloveOil], baseProfile);
      expect(result.requiresAcknowledgment).toBe(true);
      expect(result.criticalWarnings.length).toBeGreaterThan(0);
    });

    it('calculates safety score between 0 and 100', () => {
      const result = validateMixSafety([lavenderOil], baseProfile);
      expect(result.safetyScore).toBeGreaterThanOrEqual(0);
      expect(result.safetyScore).toBeLessThanOrEqual(100);
    });

    it('returns higher safety score for safer oils', () => {
      const safeResult = validateMixSafety([lavenderOil], baseProfile);
      const riskyResult = validateMixSafety([cloveOil, wintergreenOil, hyssopOil], baseProfile);
      expect(safeResult.safetyScore).toBeGreaterThan(riskyResult.safetyScore);
    });
  });

  describe('validateMixSafetyForCommunity', () => {
    it('always uses beginner experience level', () => {
      const result = validateMixSafetyForCommunity(
        [cloveOil],
        {
          age: 30,
          isPregnant: false,
          isBreastfeeding: false,
          healthConditions: [],
          medications: [],
        }
      );
      expect(result.experienceLevel).toBe('beginner');
      expect(result.canProceed).toBe(true);
    });
  });

  describe('getOilWarnings', () => {
    it('returns base warnings for clove bud', () => {
      const warnings = getOilWarnings('clove-bud');
      expect(warnings.some(w => w.id === 'oil-clove-blood')).toBe(true);
    });

    it('returns base warnings for wintergreen', () => {
      const warnings = getOilWarnings('wintergreen');
      expect(warnings.some(w => w.id === 'oil-wintergreen-blood')).toBe(true);
    });

    it('returns base warnings for hyssop', () => {
      const warnings = getOilWarnings('hyssop');
      expect(warnings.some(w => w.id === 'oil-hyssop-neuro')).toBe(true);
    });

    it('includes user-specific warnings when profile provided', () => {
      const profile: UserSafetyProfile = {
        ...baseProfile,
        isPregnant: true,
      };
      // Hyssop is flagged for pregnancy warnings
      const warnings = getOilWarnings('hyssop', profile);
      expect(warnings.some(w => w.category === 'pregnancy')).toBe(true);
    });

    it('returns empty array for unknown oils', () => {
      const warnings = getOilWarnings('unknown-oil-123');
      expect(warnings.length).toBe(0);
    });
  });
})
