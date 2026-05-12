/**
 * Oil Amor Safety System - Core Types
 * Enterprise-grade safety infrastructure for essential oil mixing
 */

// ============================================================================
// MEDICAL & SAFETY ENUMERATIONS
// ============================================================================

export type PregnancySafety = 'safe' | 'caution' | 'avoid' | 'consult'
export type AgeSafety = 'safe' | 'dilute' | 'avoid'
export type ToxicityLevel = 'none' | 'low' | 'moderate' | 'high' | 'extreme' | 'low-to-moderate'
export type SafetySeverity = 'info' | 'caution' | 'warning' | 'critical' | 'blocked' | 'minor' | 'moderate' | 'major' | 'avoid'
export type ContraindicationType = 
  | 'photosensitivity'
  | 'skin-sensitization'
  | 'mucous-membrane-irritant'
  | 'respiratory-sensitizer'
  | 'hormone-modulating'
  | 'blood-pressure-affecting'
  | 'blood-thinning'
  | 'neurotoxic'
  | 'hepatotoxic'
  | 'nephrotoxic'
  | 'carcinogenic'
  | 'medication-interaction'
  | 'seizure-risk'
  | 'asthma-trigger'
  | 'embryotoxic'
  | 'feto-toxic'
  | 'uterine-stimulant'
  | 'skin-irritant'
  | 'anticoagulant'
  | 'gallstones'
  | 'blood-glucose-affecting'

// ============================================================================
// USER HEALTH PROFILE
// ============================================================================

export interface UserHealthProfile {
  // Basic Demographics
  age: number
  weight?: number // kg, for dosage calculations
  
  // Pregnancy & Reproductive
  isPregnant: boolean
  pregnancyTrimester?: 1 | 2 | 3
  isBreastfeeding: boolean
  isTryingToConceive: boolean
  
  // Pediatric
  isChild: boolean
  exactAge?: number // months for children under 2
  
  // Medical Conditions (contraindications)
  conditions: MedicalCondition[]
  healthConditions?: string[] // Alternative property name used by some components
  
  // Medications
  medications: string[] // List of active medications
  
  // Allergies & Sensitivities
  knownAllergies: string[] // Oil IDs or compound names
  skinSensitivity: 'normal' | 'sensitive' | 'very-sensitive' | 'allergic-history'
  respiratorySensitivity: boolean
  
  // Usage Context
  intendedUse: UsageContext
  
  // Experience Level
  aromatherapyExperience: 'beginner' | 'intermediate' | 'advanced' | 'professional'
}

export type MedicalCondition =
  | 'asthma'
  | 'epilepsy'
  | 'high-blood-pressure'
  | 'low-blood-pressure'
  | 'heart-disease'
  | 'diabetes'
  | 'liver-disease'
  | 'kidney-disease'
  | 'cancer'
  | 'autoimmune-disorder'
  | ' bleeding-disorder'
  | 'surgery-planned' // Within 2 weeks
  | 'dermatitis'
  | 'eczema'
  | 'psoriasis'
  | 'anxiety-disorder'
  | 'depression'
  | 'insomnia'
  | 'hormone-sensitive-condition' // Breast cancer, endometriosis, etc.

export interface UsageContext {
  method: 'diffuser' | 'topical' | 'inhalation' | 'bath'
  area?: 'full-body' | 'large-area' | 'small-area' | 'face'
  frequency: 'daily' | 'few-times-week' | 'occasional'
  duration: 'short-term' | 'long-term'
}

// ============================================================================
// OIL SAFETY PROFILES
// ============================================================================

export interface OilSafetyProfile {
  oilId: string
  commonName: string
  botanicalName: string
  
  // Concentration Limits
  maxDilutionPercent: number // Absolute maximum safe dilution
  recommendedDilutionPercent: number // Suggested maximum for general use
  
  // Age Restrictions
  ageRestrictions: {
    under2Months: AgeSafety
    under6Months: AgeSafety
    under2Years: AgeSafety
    under6Years: AgeSafety
    under12Years: AgeSafety
  }
  
  // Pregnancy Safety
  pregnancySafety: PregnancySafety
  pregnancyNotes?: string
  
  // Breastfeeding Safety
  breastfeedingSafety: PregnancySafety
  breastfeedingNotes?: string
  
  // Specific Contraindications
  contraindications: Contraindication[]
  
  // Chemical Compounds of Concern
  keyConstituents: {
    name: string
    percentageRange: [number, number] // Min-max %
    concerns?: ContraindicationType[]
  }[]
  
  // Incompatibility with Other Oils
  incompatibleOils: Incompatibility[]
  
  // Toxicity Information
  toxicity: {
    level: ToxicityLevel
    oral: boolean // Toxic if ingested
    dermal: boolean // Toxic through skin at high concentrations
    inhalation: boolean // Toxic if inhaled
    notes?: string
  }
  
  // Special Properties
  photosensitivity: {
    isPhotosensitive: boolean
    phototoxicCompounds?: string[] // e.g., 'bergapten', 'oxypeucedanin'
    safeAfterHours?: number // Hours after application before sun exposure
  }
  
  skinSensitization: {
    isSensitizer: boolean
    riskLevel: 'low' | 'moderate' | 'high'
    maxDilutionForSensitive: number
  }
  
  respiratoryEffects: {
    canTriggerAsthma: boolean
    isMucousMembraneIrritant: boolean
    cautionForRespiratoryConditions: boolean
  }
  
  // Drug Interactions
  drugInteractions: DrugInteraction[]
  
  // First Aid
  firstAid: {
    skinContact: string
    eyeContact: string
    ingestion: string
    inhalation: string
  }
  
  // Regulatory
  regulatoryStatus: {
    gras: boolean // Generally Recognized As Safe (FDA)
    euCosmeticRestricted: boolean
    ifraRestrictions: boolean
  }
  
  // References
  sources: string[] // Scientific citations
}

export interface Contraindication {
  type: ContraindicationType
  severity: SafetySeverity
  description: string
  affectedSystems?: string[]
}

export interface Incompatibility {
  oilId: string
  reason: string
  severity: 'avoid' | 'caution' | 'note'
  chemicalExplanation?: string
}

export interface DrugInteraction {
  drugClass: string
  effect: 'potentiates' | 'inhibits' | 'unknown' | 'potential'
  description: string
  severity: SafetySeverity
}

// ============================================================================
// MIX VALIDATION
// ============================================================================

export interface MixComponent {
  oilId: string
  drops?: number
  ml?: number // Now supports milliliter measurements
  lotNumber?: string // For traceability
}

// Helper type for normalized components with both measurements
export interface NormalizedMixComponent {
  oilId: string
  drops: number
  ml: number
  lotNumber?: string
}

export interface MixValidationRequest {
  oils: MixComponent[] // Support both drops and ml through optional properties
  userProfile: UserHealthProfile
  totalVolumeMl: number
  mode: 'pure' | 'carrier'
  carrierOilId?: string
  intendedUse: UsageContext
}

export interface MixValidationResult {
  // Status
  canProceed: boolean // If false, mix is blocked
  requiresWaiver: boolean // If true, user must acknowledge risks
  
  // Calculations
  calculations: {
    totalDrops: number
    totalMl?: number
    dilutionPercent: number
    safeDilutionPercent: number // Recommended maximum
    activeConstituentLevels: Record<string, number> // Estimated % of key compounds
  }
  
  // Issues Found
  blockedCombinations: BlockedCombination[]
  criticalWarnings: SafetyWarning[]
  warnings: SafetyWarning[]
  cautions: SafetyWarning[]
  info: SafetyWarning[]
  
  // Recommendations
  recommendations: {
    reduceDrops?: number  // Deprecated: use reduceMl
    reduceMl?: number
    suggestedAlternatives?: string[] // Oil IDs
    usageRestrictions?: string[]
    patchTestRecommended: boolean
    professionalConsultationRecommended: boolean
  }
  
  // Final Assessment
  safetyScore: number // 0-100
  safetyRating: 'excellent' | 'good' | 'acceptable' | 'caution' | 'dangerous'
}

export interface BlockedCombination {
  type: 'incompatible-oils' | 'exceeds-max-dilution' | 'contraindicated-condition' | 'prohibited-for-age' | 'pregnancy-unsafe' | 'drug-interaction'
  severity: 'critical'
  affectedOils: string[]
  affectedConditions?: string[]
  description: string
  chemicalExplanation?: string
  alternativeSuggestion?: string
}

export interface SafetyWarning {
  id: string
  severity: SafetySeverity
  category: 'concentration' | 'contraindication' | 'interaction' | 'age' | 'pregnancy' | 'usage'
  title: string
  description: string
  affectedOils?: string[]
  affectedConditions?: string[]
  recommendation?: string
  learnMoreLink?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SAFETY_CONSTANTS = {
  // Standard drop volumes
  DROPS_PER_ML: 20, // Standard essential oil dropper
  
  // Age-based maximum dilutions (general guidelines)
  MAX_DILUTION: {
    ADULT: 5, // 5% for most oils
    CHILD_6_12: 1, // 1%
    CHILD_2_6: 0.5, // 0.5%
    INFANT_6M_2Y: 0.25, // 0.25%
    INFANT_UNDER_6M: 0.1, // 0.1% or avoid
  },
  
  // Pregnancy maximums
  PREGNANCY_MAX_DILUTION: 1, // 1% general rule
  
  // Photosensitivity threshold (Furanocoumarin content)
  PHOTOTOXIC_THRESHOLD: 0.00015, // 0.015% bergapten equivalent
} as const

// ============================================================================
// SAFETY DATABASE VERSIONING
// ============================================================================

export interface SafetyDatabaseVersion {
  version: string
  lastUpdated: string
  updatedBy: string
  changelog: string[]
}

// Current version tracking
export const SAFETY_DB_VERSION: SafetyDatabaseVersion = {
  version: '1.0.0',
  lastUpdated: '2026-03-29',
  updatedBy: 'Oil Amor Safety Team',
  changelog: [
    'Initial comprehensive safety database for all 17 oils',
    'Includes IFRA 51st Amendment compliance',
    'Tisserand & Young (2014) reference integration',
  ],
}
