/**
 * Pregnancy Safety Audit - Critical Test Cases
 * Testing pregnancy-related safety warnings
 */

import { 
  validateMixSafety, 
  UserSafetyProfile, 
  OilComponent,
  ExperienceLevel,
  RouteOfUse,
} from '../lib/safety/comprehensive-safety-v2';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createUserProfile(
  isPregnant: boolean,
  isBreastfeeding: boolean = false,
  isTryingToConceive: boolean = false,
  experienceLevel: ExperienceLevel = 'beginner'
): UserSafetyProfile {
  return {
    age: 30,
    ageGroup: 'adult',
    isPregnant,
    isBreastfeeding,
    isTryingToConceive,
    medications: [],
    healthConditions: [],
    knownAllergies: [],
    hasSensitiveSkin: false,
    respiratorySensitivity: false,
    experienceLevel,
  };
}

// ============================================================================
// TEST CASE 1: Pregnant user + Clary Sage oil
// Expected: HIGH warning (emmenagogue), uterine stimulation mentioned, alternatives suggested
// ----------------------------------------------------------------------------
describe('TEST CASE 1: Pregnant + Clary Sage', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
  
  test('should generate HIGH or CRITICAL risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(['high', 'critical']).toContain(pregnancyWarnings[0].riskLevel);
  });

  test('should mention uterine stimulation in explanation', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.detailedExplanation.toLowerCase()).toContain('uterine');
  });

  test('should mention emmenagogue effect', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.detailedExplanation.toLowerCase()).toContain('emmenagogue');
  });

  test('should suggest alternatives', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.alternatives).toBeDefined();
    expect(pregnancyWarning!.alternatives!.length).toBeGreaterThan(0);
    expect(pregnancyWarning!.alternatives).toContain('lavender');
  });

  test('should require acknowledgment for beginners', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(true);
  });

  test('should affect clary-sage oil', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.affectedOils).toContain('clary-sage');
  });
});

// ============================================================================
// TEST CASE 2: Pregnant user + Sage + Hyssop oils
// Expected: Warning for both, acknowledgment required
// ----------------------------------------------------------------------------
describe('TEST CASE 2: Pregnant + Sage + Hyssop', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [
    { oilId: 'sage', name: 'Sage', ml: 1, drops: 20 },
    { oilId: 'hyssop', name: 'Hyssop', ml: 1, drops: 20 },
  ];
  
  test('should generate warning for both oils', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.affectedOils).toContain('sage');
    expect(pregnancyWarning!.affectedOils).toContain('hyssop');
  });

  test('should have HIGH risk level', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.riskLevel).toBe('high');
  });

  test('should require acknowledgment at warning level for beginners', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    // Note: result.requiresAcknowledgment is only for CRITICAL warnings
    // HIGH warnings have their own requiresAcknowledgment flag
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(true);
  });
});

// ============================================================================
// TEST CASE 3: Trying to conceive + Fennel oil
// Expected: MODERATE warning, hormone effects mentioned
// ----------------------------------------------------------------------------
describe('TEST CASE 3: Trying to Conceive + Fennel', () => {
  const userProfile = createUserProfile(false, false, true);
  const oils: OilComponent[] = [{ oilId: 'fennel', name: 'Fennel', ml: 1, drops: 20 }];
  
  test('should generate MODERATE risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(pregnancyWarnings[0].riskLevel).toBe('moderate');
  });

  test('should mention hormone effects', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    const hasHormoneMention = 
      pregnancyWarning!.message.toLowerCase().includes('hormone') ||
      pregnancyWarning!.detailedExplanation.toLowerCase().includes('hormone');
    expect(hasHormoneMention).toBe(true);
  });

  test('should not require acknowledgment', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(false);
  });

  test('should suggest alternatives', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.alternatives).toBeDefined();
    expect(pregnancyWarning!.alternatives!.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TEST CASE 4: Pregnant user + Lavender oil (safe)
// Expected: NO pregnancy warning
// ----------------------------------------------------------------------------
describe('TEST CASE 4: Pregnant + Lavender (Safe)', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'lavender', name: 'Lavender', ml: 1, drops: 20 }];
  
  test('should NOT generate pregnancy warning for safe oil', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBe(0);
  });

  test('lavender should not be in affected oils of any pregnancy warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const allPregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    for (const warning of allPregnancyWarnings) {
      expect(warning.affectedOils).not.toContain('lavender');
    }
  });
});

// ============================================================================
// TEST CASE 5: Breastfeeding user + Sage oil
// Expected: Warning about milk supply reduction
// ----------------------------------------------------------------------------
describe('TEST CASE 5: Breastfeeding + Sage', () => {
  const userProfile = createUserProfile(false, true);
  const oils: OilComponent[] = [{ oilId: 'sage', name: 'Sage', ml: 1, drops: 20 }];
  
  test('should generate lactation warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const lactationWarnings = result.warnings.filter(w => w.category === 'lactation');
    
    expect(lactationWarnings.length).toBeGreaterThan(0);
  });

  test('should mention milk supply reduction', () => {
    const result = validateMixSafety(oils, userProfile);
    const lactationWarning = result.warnings.find(w => w.category === 'lactation');
    
    expect(lactationWarning).toBeDefined();
    const hasMilkMention = 
      lactationWarning!.message.toLowerCase().includes('milk') ||
      lactationWarning!.detailedExplanation.toLowerCase().includes('milk') ||
      lactationWarning!.detailedExplanation.toLowerCase().includes('lactation');
    expect(hasMilkMention).toBe(true);
  });

  test('should have MODERATE risk level', () => {
    const result = validateMixSafety(oils, userProfile);
    const lactationWarning = result.warnings.find(w => w.category === 'lactation');
    
    expect(lactationWarning).toBeDefined();
    expect(lactationWarning!.riskLevel).toBe('moderate');
  });

  test('should suggest clary-sage as alternative', () => {
    const result = validateMixSafety(oils, userProfile);
    const lactationWarning = result.warnings.find(w => w.category === 'lactation');
    
    expect(lactationWarning).toBeDefined();
    expect(lactationWarning!.alternatives).toContain('clary-sage');
  });
});

// ============================================================================
// TEST CASE 6: Pregnant user + Cinnamon Bark (hormonal oils)
// Expected: MODERATE warning
// ----------------------------------------------------------------------------
describe('TEST CASE 6: Pregnant + Cinnamon Bark (Hormonal)', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'cinnamon-bark', name: 'Cinnamon Bark', ml: 1, drops: 20 }];
  
  test('should generate MODERATE risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(pregnancyWarnings[0].riskLevel).toBe('moderate');
  });

  test('should categorize as hormonal oils', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.title.toLowerCase()).toContain('hormonal');
  });

  test('should affect cinnamon-bark oil', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.affectedOils).toContain('cinnamon-bark');
  });
});

// ============================================================================
// TEST CASE 7: First trimester vs Second trimester considerations
// Check if warnings account for trimester differences
// ----------------------------------------------------------------------------
describe('TEST CASE 7: Trimester-Specific Guidance', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
  
  test('should mention first trimester in recommendation or explanation', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    const hasTrimesterMention = 
      pregnancyWarning!.recommendation.toLowerCase().includes('trimester') ||
      pregnancyWarning!.detailedExplanation.toLowerCase().includes('trimester') ||
      pregnancyWarning!.recommendation.toLowerCase().includes('first') ||
      pregnancyWarning!.detailedExplanation.toLowerCase().includes('first trimester');
    expect(hasTrimesterMention).toBe(true);
  });

  test('should specifically mention first trimester', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    const hasFirstTrimester = 
      pregnancyWarning!.recommendation.toLowerCase().includes('first trimester') ||
      pregnancyWarning!.detailedExplanation.toLowerCase().includes('first trimester');
    expect(hasFirstTrimester).toBe(true);
  });

  test('should provide different guidance for 2nd/3rd trimester', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    const hasSecondOrThirdMention = 
      pregnancyWarning!.recommendation.toLowerCase().includes('2nd') ||
      pregnancyWarning!.recommendation.toLowerCase().includes('3rd') ||
      pregnancyWarning!.recommendation.toLowerCase().includes('second') ||
      pregnancyWarning!.recommendation.toLowerCase().includes('third');
    expect(hasSecondOrThirdMention).toBe(true);
  });
});

// ============================================================================
// ADDITIONAL EDGE CASE TESTS
// ============================================================================

describe('ADDITIONAL TEST: Pregnant + Aniseed (Hormonal)', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'aniseed', name: 'Aniseed', ml: 1, drops: 20 }];
  
  test('should generate MODERATE risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(pregnancyWarnings[0].riskLevel).toBe('moderate');
  });

  test('should affect aniseed oil', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.affectedOils).toContain('aniseed');
  });
});

describe('ADDITIONAL TEST: Pregnant + Juniper Berry (Emmenagogue)', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'juniper-berry', name: 'Juniper Berry', ml: 1, drops: 20 }];
  
  test('should generate HIGH or CRITICAL risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(['high', 'critical']).toContain(pregnancyWarnings[0].riskLevel);
  });

  test('should require acknowledgment', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(true);
  });
});

describe('ADDITIONAL TEST: Pregnant + Rosemary (Emmenagogue)', () => {
  const userProfile = createUserProfile(true);
  const oils: OilComponent[] = [{ oilId: 'rosemary', name: 'Rosemary', ml: 1, drops: 20 }];
  
  test('should generate HIGH risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(pregnancyWarnings[0].riskLevel).toBe('high');
  });
});

describe('ADDITIONAL TEST: TTC + Clary Sage', () => {
  const userProfile = createUserProfile(false, false, true);
  const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
  
  test('should generate MODERATE risk warning', () => {
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarnings = result.warnings.filter(w => w.category === 'pregnancy');
    
    expect(pregnancyWarnings.length).toBeGreaterThan(0);
    expect(pregnancyWarnings[0].riskLevel).toBe('moderate');
  });
});

// ============================================================================
// EXPERIENCE LEVEL TESTS
// ============================================================================

describe('Experience Level Tests: Acknowledgment Requirements', () => {
  const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
  
  test('beginner should require acknowledgment for high-risk pregnancy oil', () => {
    const userProfile = createUserProfile(true, false, false, 'beginner');
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(true);
  });

  test('intermediate should require acknowledgment for high-risk pregnancy oil', () => {
    const userProfile = createUserProfile(true, false, false, 'intermediate');
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(true);
  });

  test('advanced should NOT require acknowledgment for high-risk pregnancy oil', () => {
    const userProfile = createUserProfile(true, false, false, 'advanced');
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(false);
  });

  test('professional should NOT require acknowledgment for high-risk pregnancy oil', () => {
    const userProfile = createUserProfile(true, false, false, 'professional');
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.requiresAcknowledgment).toBe(false);
  });
});

// ============================================================================
// MESSAGE CONTENT TESTS
// ============================================================================

describe('Message Content Verification', () => {
  test('pregnancy warning should have appropriate title', () => {
    const userProfile = createUserProfile(true);
    const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.title).toContain('Uterine');
  });

  test('pregnancy warning should have beginner-friendly message', () => {
    const userProfile = createUserProfile(true);
    const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.message.length).toBeGreaterThan(20);
    expect(pregnancyWarning!.message.toLowerCase()).toContain('pregnancy');
  });

  test('pregnancy warning should have acknowledgment text', () => {
    const userProfile = createUserProfile(true);
    const oils: OilComponent[] = [{ oilId: 'clary-sage', name: 'Clary Sage', ml: 1, drops: 20 }];
    const result = validateMixSafety(oils, userProfile);
    const pregnancyWarning = result.warnings.find(w => w.category === 'pregnancy');
    
    expect(pregnancyWarning).toBeDefined();
    expect(pregnancyWarning!.acknowledgmentText).toBeDefined();
    expect(pregnancyWarning!.acknowledgmentText!.toLowerCase()).toContain('pregnant');
  });
});
