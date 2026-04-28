/**
 * Oil Onboarding System - Safety-First New Oil Integration
 * 
 * This system ensures that EVERY new oil added to the platform undergoes
 * rigorous safety validation before being available to users.
 * 
 * Philosophy: "No oil is added until its safety profile is complete"
 */

import { COMMON_MEDICATIONS } from './medication-database';
import { searchAllergies } from './autocomplete-data';

// ============================================================================
// TYPES - New Oil Safety Profile
// ============================================================================

export interface NewOilSafetyProfile {
  // Basic Identification
  id: string;                    // e.g., 'ylang-ylang-extra'
  name: string;                  // e.g., 'Ylang Ylang Extra'
  botanicalName: string;         // e.g., 'Cananga odorata'
  family: BotanicalFamily;       // e.g., 'annonaceae'
  origin: string;                // e.g., 'Madagascar'
  extractionMethod: 'steam-distilled' | 'cold-pressed' | 'solvent-extracted' | 'co2-extracted';
  
  // Chemical Composition (CRITICAL for safety)
  chemicalProfile: {
    primaryComponents: ChemicalComponent[];     // >5% concentration
    secondaryComponents: ChemicalComponent[];   // 1-5% concentration
    traceComponents: ChemicalComponent[];       // <1% concentration
  };
  
  // Safety Classifications
  safetyFlags: {
    isPhototoxic: boolean;
    isNeurotoxic: boolean;
    isHepatotoxic: boolean;
    isNephrotoxic: boolean;
    isCarcinogenic: boolean;           // Contains known/suspected carcinogens
    isSkinSensitizer: boolean;
    isRespiratorySensitizer: boolean;
    isEmmenagogue: boolean;            // Stimulates uterine contractions
    isAbortifacient: boolean;          // Can induce abortion
    isGalactagogue: boolean;           // Affects milk supply
    isAnticoagulant: boolean;          // Affects blood clotting
    isHypertensive: boolean;           // Raises blood pressure
    isHypotensive: boolean;            // Lowers blood pressure
    affectsBloodSugar: boolean;
    containsPhenols: boolean;
    containsKetones: boolean;
  };
  
  // Interaction Profiles
  interactions: {
    contraindicatedConditions: HealthCondition[];
    contraindicatedMedications: MedicationInteraction[];
    potentialAllergens: string[];      // Chemical components that commonly cause allergies
    crossReactsWith: string[];         // Other oils with similar chemical profiles
  };
  
  // Age Restrictions
  ageRestrictions: {
    infant_0_3mo: AgeRestriction;
    infant_3_6mo: AgeRestriction;
    infant_6_12mo: AgeRestriction;
    toddler_1_2y: AgeRestriction;
    child_2_6y: AgeRestriction;
    child_6_12y: AgeRestriction;
    teen_12_18y: AgeRestriction;
    adult: AgeRestriction;
  };
  
  // Pregnancy & Lactation
  reproductiveSafety: {
    pregnancyTrimester1: ReproductiveSafety;
    pregnancyTrimester2: ReproductiveSafety;
    pregnancyTrimester3: ReproductiveSafety;
    breastfeeding: ReproductiveSafety;
    tryingToConceive: ReproductiveSafety;
  };
  
  // Route-Specific Safety
  routeSafety: {
    topical: RouteSpecificSafety;
    inhalation: RouteSpecificSafety;
    diffusion: RouteSpecificSafety;
    oral: RouteSpecificSafety;         // Even if we don't sell oral use
  };
  
  // Maximum Safe Concentrations
  maxConcentrations: {
    generalUse: number;                // % dilution
    facialUse: number;                 // % dilution (more sensitive)
    pregnancy: number | null;          // null = avoid entirely
    children: number | null;
    elderly: number | null;
  };
  
  // Documentation
  references: string[];                // Scientific references
  safetyDataSheetUrl?: string;
  completedBy: string;                 // Who created this profile
  reviewedBy?: string;                 // Safety officer who reviewed
  completionDate: string;
  reviewDate?: string;
  version: number;
}

interface ChemicalComponent {
  name: string;                      // e.g., 'linalool'
  casNumber?: string;                // CAS registry number
  percentage: number;                // Typical percentage range
  isAllergen: boolean;
  isPhototoxic: boolean;
}

type BotanicalFamily = 
  | 'lamiaceae'      // Mint family (Lavender, Rosemary, etc.)
  | 'rutaceae'       // Citrus family (Lemon, Bergamot, etc.)
  | 'asteraceae'     // Daisy family (Chamomile, Yarrow, etc.)
  | 'myrtaceae'      // Myrtle family (Tea Tree, Eucalyptus, etc.)
  | 'pinaceae'       // Pine family (Pine, Fir, Spruce, etc.)
  | 'lauraceae'      // Laurel family (Cinnamon, Camphor, etc.)
  | 'apiaceae'       // Carrot family (Fennel, Aniseed, etc.)
  | 'zingiberaceae'  // Ginger family (Ginger, Turmeric, etc.)
  | 'anonaceae'      // Custard apple family (Ylang Ylang)
  | 'burseraceae'    // Frankincense/Myrrh family
  | 'poaceae'        // Grass family (Lemongrass, Citronella)
  | 'other';

type HealthCondition = 
  | 'epilepsy'
  | 'hemophilia'
  | 'thrombocytopenia'
  | 'asthma'
  | 'severe_asthma'
  | 'high-blood-pressure'
  | 'low-blood-pressure'
  | 'heart-disease'
  | 'diabetes'
  | 'liver-disease'
  | 'kidney-disease'
  | 'cancer'
  | 'hormone-sensitive-condition'
  | 'dermatitis'
  | 'psoriasis'
  | 'pregnancy'
  | 'bleeding-disorder';

interface MedicationInteraction {
  medicationCategory: string;        // e.g., 'anticoagulants', 'antiepileptics'
  severity: 'contraindicated' | 'caution' | 'monitor';
  mechanism: string;                 // How the interaction occurs
  recommendation: string;
}

interface AgeRestriction {
  allowed: boolean;
  maxConcentration: number | null;   // null = not allowed
  notes?: string;
}

interface ReproductiveSafety {
  safety: 'safe' | 'caution' | 'avoid';
  maxConcentration?: number;
  notes?: string;
}

interface RouteSpecificSafety {
  safe: boolean;
  notes?: string;
  maxConcentration?: number;
}

// ============================================================================
// VALIDATION ENGINE - Ensures Complete Safety Profiles
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingCriticalData: string[];
  suggestedTests: string[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

/**
 * Validates a new oil safety profile for completeness and accuracy
 * This is the GATEKEEPER - no oil passes without 100% critical validation
 */
export function validateOilSafetyProfile(profile: NewOilSafetyProfile): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const missingCriticalData: string[] = [];
  const suggestedTests: string[] = [];

  // === CRITICAL VALIDATIONS (Must Pass) ===

  // 1. Chemical Profile Completeness
  if (!profile.chemicalProfile.primaryComponents.length) {
    errors.push({
      field: 'chemicalProfile.primaryComponents',
      message: 'Primary chemical components are REQUIRED for safety analysis',
      severity: 'critical'
    });
    missingCriticalData.push('Primary chemical components (need GC/MS analysis)');
  }

  // Check for known allergens in chemical profile
  const knownAllergens = ['linalool', 'limonene', 'eugenol', 'geraniol', 'citronellol', 'citral', 'cinnamaldehyde'];
  const foundAllergens = profile.chemicalProfile.primaryComponents
    .filter(c => knownAllergens.includes(c.name.toLowerCase()));
  
  if (foundAllergens.length > 0 && !profile.safetyFlags.isSkinSensitizer) {
    warnings.push({
      field: 'safetyFlags.isSkinSensitizer',
      message: `Oil contains known allergens: ${foundAllergens.map(c => c.name).join(', ')}`,
      suggestion: 'Set isSkinSensitizer to true or provide evidence why not applicable'
    });
  }

  // 2. Neurotoxic Compound Check
  const neurotoxicCompounds = ['thujone', 'pulegone', 'camphor', 'pinocamphone', 'methyl salicylate'];
  const foundNeurotoxins = [
    ...profile.chemicalProfile.primaryComponents,
    ...profile.chemicalProfile.secondaryComponents
  ].filter(c => neurotoxicCompounds.includes(c.name.toLowerCase()));

  if (foundNeurotoxins.length > 0 && !profile.safetyFlags.isNeurotoxic) {
    errors.push({
      field: 'safetyFlags.isNeurotoxic',
      message: `Contains neurotoxic compounds: ${foundNeurotoxins.map(c => c.name).join(', ')}`,
      severity: 'critical'
    });
    suggestedTests.push('Epilepsy/seizure contraindication required');
  }

  // 3. Anticoagulant Check
  const anticoagulantCompounds = ['eugenol', 'methyl salicylate', 'coumarin'];
  const foundAnticoagulants = [
    ...profile.chemicalProfile.primaryComponents,
    ...profile.chemicalProfile.secondaryComponents
  ].filter(c => anticoagulantCompounds.includes(c.name.toLowerCase()));

  if (foundAnticoagulants.length > 0 && !profile.safetyFlags.isAnticoagulant) {
    errors.push({
      field: 'safetyFlags.isAnticoagulant',
      message: `Contains anticoagulant compounds: ${foundAnticoagulants.map(c => c.name).join(', ')}`,
      severity: 'critical'
    });
    suggestedTests.push('Blood thinner interaction warning required');
  }

  // 4. Emmenagogue Check
  const emmenagogueOils = ['clary-sage', 'sage', 'hyssop', 'juniper-berry', 'rosemary', 'fennel'];
  const isRelatedToEmmenagogue = emmenagogueOils.some(e => 
    profile.botanicalName.toLowerCase().includes(e.replace('-', ' ')) ||
    profile.family === 'lamiaceae' || profile.family === 'apiaceae'
  );

  if (isRelatedToEmmenagogue && !profile.reproductiveSafety.pregnancyTrimester1.safety) {
    warnings.push({
      field: 'reproductiveSafety',
      message: 'Oil may have hormonal/emmenagogue effects based on family/chemical profile',
      suggestion: 'Review pregnancy safety data and set appropriate trimester restrictions'
    });
  }

  // 5. Phototoxicity Check
  const phototoxicCompounds = ['bergapten', 'psoralen', 'furocoumarin', 'methoxypsoralen'];
  const phototoxicFamilies = ['rutaceae'];
  const isPhototoxicFamily = phototoxicFamilies.includes(profile.family);
  
  if ((isPhototoxicFamily || profile.chemicalProfile.primaryComponents.some(c => 
    phototoxicCompounds.some(p => c.name.toLowerCase().includes(p)))) && 
    !profile.safetyFlags.isPhototoxic) {
    errors.push({
      field: 'safetyFlags.isPhototoxic',
      message: 'Citrus family oils or furocoumarin-containing oils MUST be flagged as phototoxic',
      severity: 'critical'
    });
  }

  // 6. Pregnancy Safety Completeness
  if (!profile.reproductiveSafety?.pregnancyTrimester1?.safety) {
    errors.push({
      field: 'reproductiveSafety.pregnancyTrimester1',
      message: 'Pregnancy trimester 1 safety classification is REQUIRED',
      severity: 'critical'
    });
    missingCriticalData.push('Pregnancy safety data (Tisserand, Aromatherapy for Midwives, etc.)');
  }

  // 7. Age Restriction Completeness
  const criticalAgeGroups = ['infant_0_3mo', 'infant_3_6mo', 'child_2_6y'];
  for (const ageGroup of criticalAgeGroups) {
    if (!profile.ageRestrictions[ageGroup as keyof typeof profile.ageRestrictions]) {
      errors.push({
        field: `ageRestrictions.${ageGroup}`,
        message: `Age restriction for ${ageGroup} is REQUIRED`,
        severity: 'high'
      });
    }
  }

  // 8. Route Safety Completeness
  if (!profile.routeSafety.topical.safe === undefined) {
    errors.push({
      field: 'routeSafety.topical',
      message: 'Topical route safety must be specified',
      severity: 'critical'
    });
  }

  // 9. Cross-Reference Validation
  if (profile.interactions.crossReactsWith.length === 0) {
    warnings.push({
      field: 'interactions.crossReactsWith',
      message: 'No cross-reactivity data provided',
      suggestion: 'Check similar oils in database for potential cross-reactions'
    });
  }

  // 10. Documentation Validation
  if (profile.references.length < 2) {
    warnings.push({
      field: 'references',
      message: 'Fewer than 2 scientific references provided',
      suggestion: 'Add peer-reviewed studies or authoritative texts (Tisserand, etc.)'
    });
  }

  // === AUTOMATED CROSS-REFERENCE CHECKS ===

  // Check against medication database
  const potentialMedInteractions = checkMedicationCrossReferences(profile);
  if (potentialMedInteractions.length > 0) {
    warnings.push({
      field: 'interactions.contraindicatedMedications',
      message: `Potential medication interactions detected: ${potentialMedInteractions.join(', ')}`,
      suggestion: 'Review and add explicit medication contraindications'
    });
  }

  // Check against allergen database
  const potentialAllergens = checkAllergenCrossReferences(profile);
  if (potentialAllergens.length > 0) {
    warnings.push({
      field: 'interactions.potentialAllergens',
      message: `Oil components match known allergens: ${potentialAllergens.join(', ')}`,
      suggestion: 'Ensure allergy warnings are comprehensive'
    });
  }

  return {
    isValid: !errors.some(e => e.severity === 'critical'),
    errors,
    warnings,
    missingCriticalData,
    suggestedTests
  };
}

// ============================================================================
// CROSS-REFERENCE FUNCTIONS
// ============================================================================

function checkMedicationCrossReferences(profile: NewOilSafetyProfile): string[] {
  const interactions: string[] = [];

  // Check for anticoagulant interactions
  if (profile.safetyFlags.isAnticoagulant) {
    const anticoagulants = COMMON_MEDICATIONS.filter(m => m.affectsBloodClotting);
    if (anticoagulants.length > 0) {
      interactions.push('anticoagulants (Warfarin, Eliquis, etc.)');
    }
  }

  // Check for blood pressure interactions
  if (profile.safetyFlags.isHypertensive) {
    interactions.push('antihypertensive medications');
  }
  if (profile.safetyFlags.isHypotensive) {
    interactions.push('blood pressure medications');
  }

  // Check for diabetes medication interactions
  if (profile.safetyFlags.affectsBloodSugar) {
    interactions.push('diabetes medications');
  }

  return interactions;
}

function checkAllergenCrossReferences(profile: NewOilSafetyProfile): string[] {
  const matches: string[] = [];
  
  for (const component of profile.chemicalProfile.primaryComponents) {
    const searchResults = searchAllergies(component.name);
    if (searchResults.length > 0) {
      matches.push(component.name);
    }
  }

  return matches;
}

// ============================================================================
// ONBOARDING WORKFLOW
// ============================================================================

export interface OnboardingStage {
  stage: 'draft' | 'chemical_analysis' | 'safety_research' | 'validation' | 'review' | 'approved' | 'rejected';
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface OilOnboardingRecord {
  oilId: string;
  status: OnboardingStage[];
  currentStage: OnboardingStage['stage'];
  safetyProfile?: NewOilSafetyProfile;
  validationResult?: ValidationResult;
  reviewerNotes?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates a new onboarding record with mandatory stages
 */
export function createOnboardingRecord(oilId: string, createdBy: string): OilOnboardingRecord {
  return {
    oilId,
    status: [
      { stage: 'draft', completedAt: new Date().toISOString(), completedBy: createdBy, notes: 'Initial draft created' }
    ],
    currentStage: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewerNotes: []
  };
}

/**
 * Advances oil to next stage only if current stage requirements are met
 */
export function advanceStage(
  record: OilOnboardingRecord, 
  newStage: OnboardingStage['stage'],
  completedBy: string,
  notes?: string
): { success: boolean; record: OilOnboardingRecord; errors?: string[] } {
  
  const stageRequirements: Record<OnboardingStage['stage'], (r: OilOnboardingRecord) => string[]> = {
    draft: () => [],
    chemical_analysis: () => record.safetyProfile?.chemicalProfile.primaryComponents.length ? [] : ['Chemical analysis (GC/MS) required'],
    safety_research: () => record.safetyProfile?.references.length ? [] : ['Safety research and references required'],
    validation: (r) => {
      if (!r.validationResult) return ['Must run validation first'];
      return r.validationResult.isValid ? [] : ['Validation errors must be resolved'];
    },
    review: () => [],
    approved: (r) => {
      if (r.currentStage !== 'review') return ['Must complete review stage first'];
      return [];
    },
    rejected: () => []
  };

  const errors = stageRequirements[newStage](record);
  
  if (errors.length > 0) {
    return { success: false, record, errors };
  }

  const updatedRecord: OilOnboardingRecord = {
    ...record,
    currentStage: newStage,
    status: [
      ...record.status,
      { 
        stage: newStage, 
        completedAt: new Date().toISOString(), 
        completedBy,
        notes 
      }
    ],
    updatedAt: new Date().toISOString()
  };

  return { success: true, record: updatedRecord };
}

// ============================================================================
// SAFETY COMPARISON - Compare new oil to similar oils
// ============================================================================

export interface SafetyComparison {
  similarOils: string[];
  differences: {
    field: string;
    newOilValue: any;
    similarOilValue: any;
    similarOilName: string;
  }[];
  concerns: string[];
}

/**
 * Compares new oil safety profile to similar oils in database
 * Flags discrepancies that may indicate errors
 */
export function compareToSimilarOils(
  newOil: NewOilSafetyProfile,
  existingOils: NewOilSafetyProfile[]
): SafetyComparison {
  
  // Find similar oils by family or chemical profile
  const similarOils = existingOils.filter(oil => 
    oil.family === newOil.family ||
    oil.chemicalProfile.primaryComponents.some(c1 =>
      newOil.chemicalProfile.primaryComponents.some(c2 => 
        c1.name.toLowerCase() === c2.name.toLowerCase() &&
        Math.abs(c1.percentage - c2.percentage) < 10
      )
    )
  );

  const differences: SafetyComparison['differences'] = [];
  const concerns: string[] = [];

  for (const similarOil of similarOils.slice(0, 3)) { // Compare to top 3 most similar
    // Compare safety flags
    for (const [flag, value] of Object.entries(newOil.safetyFlags)) {
      const similarValue = similarOil.safetyFlags[flag as keyof typeof similarOil.safetyFlags];
      if (value !== similarValue) {
        differences.push({
          field: `safetyFlags.${flag}`,
          newOilValue: value,
          similarOilValue: similarValue,
          similarOilName: similarOil.name
        });

        // Flag concerning discrepancies
        if (value === false && similarValue === true) {
          concerns.push(`${similarOil.name} flags ${flag} as true, but new oil does not`);
        }
      }
    }
  }

  return {
    similarOils: similarOils.map(o => o.name),
    differences,
    concerns
  };
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export const OilOnboardingSystem = {
  validateOilSafetyProfile,
  createOnboardingRecord,
  advanceStage,
  compareToSimilarOils,
  
  // Constants for reference
  KNOWN_ALLERGENS: ['linalool', 'limonene', 'eugenol', 'geraniol', 'citronellol', 'citral', 'cinnamaldehyde'],
  NEUROTOXIC_COMPOUNDS: ['thujone', 'pulegone', 'camphor', 'pinocamphone', 'methyl salicylate'],
  ANTICOAGULANT_COMPOUNDS: ['eugenol', 'methyl salicylate', 'coumarin'],
  PHOTOTOXIC_COMPOUNDS: ['bergapten', 'psoralen', 'furocoumarin']
};

export default OilOnboardingSystem;
