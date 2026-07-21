/**
 * Oil Amor Safety Database - Additional Oil Profiles (Oils 7-17)
 */

import { OilSafetyProfile } from './types'

// ============================================================================
// 7. FRANKINCENSE (Boswellia carterii) - The Sacred Oil
// ============================================================================

export const FRANKINCENSE_PROFILE: OilSafetyProfile = {
  oilId: 'frankincense',
  commonName: 'Frankincense',
  botanicalName: 'Boswellia carterii',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'caution',
  pregnancyNotes: 'Traditional caution, limited modern data',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [
    {
      type: 'blood-thinning',
      severity: 'caution',
      description: 'May have mild anticoagulant effects',
    },
  ],
  
  keyConstituents: [
    { name: 'α-Pinene', percentageRange: [35, 60], concerns: [] },
    { name: 'Limonene', percentageRange: [4, 12], concerns: [] },
    { name: 'α-Thujene', percentageRange: [2, 8], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [
    {
      drugClass: 'Anticoagulants',
      effect: 'potentiates',
      description: 'May increase bleeding risk',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// OREGANO (Origanum vulgare) - The Mighty Shield
// ============================================================================

export const OREGANO_PROFILE: OilSafetyProfile = {
  oilId: 'oregano',
  commonName: 'Oregano',
  botanicalName: 'Origanum vulgare',
  
  maxDilutionPercent: 1, // For topical use only
  recommendedDilutionPercent: 0.5,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'avoid',
    under6Years: 'avoid', // Too strong for young children topically
    under12Years: 'dilute', // Use with extreme caution topically
  },
  
  pregnancySafety: 'caution',
  pregnancyNotes: 'Avoid topical use. Diffusion in well-ventilated area is generally considered safe.',
  
  breastfeedingSafety: 'caution',
  breastfeedingNotes: 'Avoid topical use. Diffusion is generally considered safe.',
  
  contraindications: [
    {
      type: 'blood-thinning',
      severity: 'caution',
      description: 'May increase bleeding risk with topical use',
    },
    {
      type: 'blood-pressure-affecting',
      severity: 'caution',
      description: 'May affect blood pressure with extended topical use',
    },
  ],
  
  keyConstituents: [
    { name: 'Carvacrol', percentageRange: [60, 80], concerns: ['skin-irritant'] },
    { name: 'Thymol', percentageRange: [5, 10], concerns: ['neurotoxic'] },
    { name: 'Gamma-terpinene', percentageRange: [3, 8], concerns: [] },
    { name: 'Para-cymene', percentageRange: [2, 5], concerns: [] },
  ],
  
  incompatibleOils: [
    {
      oilId: 'thyme',
      reason: 'Combined phenol content too high - risk of skin irritation',
      severity: 'caution',
    },
    {
      oilId: 'clove-bud',
      reason: 'Combined intensity may overwhelm skin and senses',
      severity: 'caution',
    },
  ],
  
  toxicity: {
    level: 'moderate',
    oral: true, // Toxic in large amounts
    dermal: true, // Can burn skin if undiluted
    inhalation: false, // Safe in diffuser - just strong!
    notes: 'High phenol content requires dilution for topical use. Safe for diffusion in well-ventilated areas.',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'high',
    maxDilutionForSensitive: 0.25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: true, // Strong scent may trigger sensitive individuals
    isMucousMembraneIrritant: false, // Generally safe in diffuser
    cautionForRespiratoryConditions: false, // Actually helpful for respiratory issues
  },
  
  drugInteractions: [
    {
      drugClass: 'Anticoagulants',
      effect: 'potentiates',
      description: 'May increase bleeding risk with topical use',
      severity: 'caution',
    },
    {
      drugClass: 'Blood pressure medications',
      effect: 'inhibits',
      description: 'May affect blood pressure with extended topical use',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash thoroughly with carrier oil, then soap and water. Do NOT use water alone.',
    eyeContact: 'Flush immediately with carrier oil, then water for 15 minutes. Seek medical attention.',
    ingestion: 'DO NOT INDUCE VOMITING. Drink milk or carrier oil. Contact poison control immediately.',
    inhalation: 'Move to fresh air if discomfort occurs. Generally safe in well-ventilated areas.',
  },
  
  regulatoryStatus: {
    gras: false,
    euCosmeticRestricted: true,
    ifraRestrictions: true,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// BASIL CT LINALOOL (Ocimum basilicum) - The Gentle Sacred Herb
// ============================================================================

export const BASIL_LINALOOL_PROFILE: OilSafetyProfile = {
  oilId: 'basil-linalool',
  commonName: 'Basil CT Linalool',
  botanicalName: 'Ocimum basilicum',
  
  maxDilutionPercent: 15, // Gentle chemotype
  recommendedDilutionPercent: 3,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'caution',
  pregnancyNotes: 'Contains some estragole, use cautiously in first trimester',
  
  breastfeedingSafety: 'caution',
  breastfeedingNotes: 'Use caution due to estragole content',
  
  contraindications: [
    {
      type: 'carcinogenic',
      severity: 'caution',
      description: 'Contains estragole (methyl chavicol), a potential carcinogen at high doses',
    },
  ],
  
  keyConstituents: [
    { name: 'Linalool', percentageRange: [40, 55], concerns: [] },
    { name: 'Estragole', percentageRange: [10, 20], concerns: ['carcinogenic'] },
    { name: 'Eugenol', percentageRange: [5, 10], concerns: [] },
    { name: 'Beta-caryophyllene', percentageRange: [3, 8], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'low',
    oral: false,
    dermal: false,
    inhalation: false,
    notes: 'CT Linalool is the safest basil chemotype. Much safer than CT Methyl Chavicol.',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 10,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water if irritation occurs',
    eyeContact: 'Flush with water for 15 minutes',
    ingestion: 'Contact poison control if large amount ingested',
    inhalation: 'Move to fresh air if discomfort occurs',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// WINTERGREEN (Gaultheria fragrantissima) - Potent Pain Reliever
// ============================================================================

export const WINTERGREEN_PROFILE: OilSafetyProfile = {
  oilId: 'wintergreen',
  commonName: 'Wintergreen',
  botanicalName: 'Gaultheria fragrantissima',
  
  maxDilutionPercent: 2, // Very strong oil
  recommendedDilutionPercent: 1,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'avoid', // Too strong for children topically
    under6Years: 'avoid',
    under12Years: 'avoid', // Adults only for topical use
  },
  
  pregnancySafety: 'avoid',
  pregnancyNotes: 'Avoid topical use. Diffusion in well-ventilated areas is generally considered acceptable in small amounts.',
  
  breastfeedingSafety: 'avoid',
  breastfeedingNotes: 'Avoid topical use. Diffusion is generally considered safe.',
  
  contraindications: [
    {
      type: 'blood-thinning',
      severity: 'warning',
      description: 'Acts like aspirin - can cause bleeding',
    },
    {
      type: 'anticoagulant',
      severity: 'avoid',
      description: 'Contains methyl salicylate - avoid if allergic to aspirin',
    },
    {
      type: 'blood-thinning',
      severity: 'warning',
      description: 'Discontinue 2 weeks before surgery due to blood thinning effects',
    },
  ],
  
  keyConstituents: [
    { name: 'Methyl salicylate', percentageRange: [98, 100], concerns: ['hepatotoxic', 'blood-thinning'] },
  ],
  
  incompatibleOils: [
    {
      oilId: 'peppermint',
      reason: 'Combined intense stimulation may overwhelm',
      severity: 'caution',
    },
    {
      oilId: 'camphor-white',
      reason: 'Combined intense warming may irritate skin',
      severity: 'caution',
    },
  ],
  
  toxicity: {
    level: 'high',
    oral: true, // FATAL if ingested
    dermal: true, // Can be toxic through skin at high doses
    inhalation: false, // Safe in diffuser - just strong scent
    notes: 'Methyl salicylate requires strict dilution for topical use. Diffusion/inhalation is generally safe but use sparingly. Never ingest.',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'moderate',
    maxDilutionForSensitive: 0.5,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: true, // Strong scent may trigger sensitive individuals
    isMucousMembraneIrritant: false, // Generally safe in diffuser
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [
    {
      drugClass: 'Anticoagulants',
      effect: 'potentiates',
      description: 'Increases bleeding risk significantly - like taking aspirin with blood thinners',
      severity: 'avoid',
    },
    {
      drugClass: 'NSAIDs',
      effect: 'potentiates',
      description: 'Combined with aspirin/ibuprofen can cause salicylate toxicity',
      severity: 'avoid',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash thoroughly with soap and water. Discontinue use if irritation occurs.',
    eyeContact: 'Flush immediately with water for 15 minutes. Seek medical attention.',
    ingestion: 'CALL POISON CONTROL IMMEDIATELY. Do NOT induce vomiting. Can be FATAL.',
    inhalation: 'Move to fresh air. If breathing difficulties persist, seek medical attention.',
  },
  
  regulatoryStatus: {
    gras: false,
    euCosmeticRestricted: true,
    ifraRestrictions: true,
  },
  
  sources: ['Tisserand & Young (2014)', 'FDA Guidelines'],
}

// ============================================================================
// CYPRESS (Cupressus sempervirens) - The Oil of Flow
// ============================================================================

export const CYPRESS_PROFILE: OilSafetyProfile = {
  oilId: 'cypress',
  commonName: 'Cypress',
  botanicalName: 'Cupressus sempervirens',
  
  maxDilutionPercent: 20, // Generally safe oil
  recommendedDilutionPercent: 3,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'caution',
  pregnancyNotes: 'Use caution in first trimester, generally considered safe after',
  
  breastfeedingSafety: 'caution',
  breastfeedingNotes: 'Use caution, limited data available',
  
  contraindications: [],
  
  keyConstituents: [
    { name: 'Alpha-pinene', percentageRange: [25, 35], concerns: [] },
    { name: 'Delta-3-carene', percentageRange: [15, 25], concerns: [] },
    { name: 'Cedrol', percentageRange: [5, 10], concerns: [] },
    { name: 'Limonene', percentageRange: [3, 8], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'low',
    oral: false,
    dermal: false,
    inhalation: false,
    notes: 'Generally safe oil with no significant toxicity concerns',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 10,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water if irritation occurs',
    eyeContact: 'Flush with water for 15 minutes',
    ingestion: 'Contact poison control if large amount ingested',
    inhalation: 'Move to fresh air if discomfort occurs',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// HO WOOD (Cinnamomum camphora) - Gentle Rosewood Alternative
// ============================================================================

export const HO_WOOD_PROFILE: OilSafetyProfile = {
  oilId: 'ho-wood',
  commonName: 'Ho Wood',
  botanicalName: 'Cinnamomum camphora',
  
  maxDilutionPercent: 15, // Very gentle oil
  recommendedDilutionPercent: 3,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Considered safe during pregnancy - very gentle',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [], // Very safe oil
  
  keyConstituents: [
    { name: 'Linalool', percentageRange: [80, 90], concerns: [] },
    { name: 'Camphor', percentageRange: [0, 2], concerns: [] },
    { name: 'Cineole', percentageRange: [1, 5], concerns: [] },
    { name: 'Beta-caryophyllene', percentageRange: [2, 5], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
    notes: 'Extremely gentle oil, safe for all ages including babies',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 15,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water if irritation occurs',
    eyeContact: 'Flush with water for 15 minutes',
    ingestion: 'Contact poison control if large amount ingested',
    inhalation: 'Move to fresh air if discomfort occurs',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// CAMPHOR WHITE (Cinnamomum camphora) - Intense Warming Oil
// ============================================================================

export const CAMPHOR_WHITE_PROFILE: OilSafetyProfile = {
  oilId: 'camphor-white',
  commonName: 'Camphor White',
  botanicalName: 'Cinnamomum camphora',
  
  maxDilutionPercent: 3, // Very strong oil
  recommendedDilutionPercent: 1,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'avoid', // Too strong for children topically
    under6Years: 'avoid',
    under12Years: 'avoid', // Adults only for topical use
  },
  
  pregnancySafety: 'avoid',
  pregnancyNotes: 'Avoid topical use. Diffusion in well-ventilated areas is generally safer but use sparingly.',
  
  breastfeedingSafety: 'avoid',
  breastfeedingNotes: 'Avoid topical use. Diffusion is generally safer.',
  
  contraindications: [
    {
      type: 'neurotoxic',
      severity: 'warning',
      description: 'High camphor content can cause seizures in susceptible individuals',
    },
    {
      type: 'skin-sensitization',
      severity: 'warning',
      description: 'Very strong, can irritate sensitive skin',
    },
  ],
  
  keyConstituents: [
    { name: 'Camphor', percentageRange: [35, 50], concerns: ['neurotoxic'] },
    { name: '1,8-Cineole', percentageRange: [10, 25], concerns: [] },
    { name: 'Safrole', percentageRange: [0, 5], concerns: ['carcinogenic'] },
    { name: 'Terpinen-4-ol', percentageRange: [5, 10], concerns: [] },
  ],
  
  incompatibleOils: [
    {
      oilId: 'rosemary',
      reason: 'Both contain high camphor/cineole - cumulative neurotoxicity risk',
      severity: 'avoid',
    },
    {
      oilId: 'eucalyptus',
      reason: 'Cumulative cineole content may irritate respiratory system',
      severity: 'caution',
    },
    {
      oilId: 'peppermint',
      reason: 'Combined intense stimulation may overwhelm sensitive individuals',
      severity: 'caution',
    },
  ],
  
  toxicity: {
    level: 'moderate',
    oral: true, // Highly toxic if ingested
    dermal: false, // Safe at low dilutions
    inhalation: false, // Generally safe in diffuser, just strong
    notes: 'Camphor requires dilution for topical use. Inhalation/diffusion is generally safe in well-ventilated areas. Never ingest.',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'moderate',
    maxDilutionForSensitive: 0.5,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: true, // May trigger sensitive individuals
    isMucousMembraneIrritant: false, // Generally safe in diffuser
    cautionForRespiratoryConditions: false, // Can actually help congestion
  },
  
  drugInteractions: [
    {
      drugClass: 'Antiepileptics',
      effect: 'potential',
      description: 'Camphor can trigger seizures even with medication',
      severity: 'avoid',
    },
    {
      drugClass: 'Sedatives',
      effect: 'potentiates',
      description: 'May enhance sedative effects unpredictably',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash thoroughly with soap and water. Discontinue use if irritation persists.',
    eyeContact: 'Flush immediately with water for 15 minutes. Seek medical attention.',
    ingestion: 'DO NOT INDUCE VOMITING. Call poison control immediately. Camphor is highly toxic orally.',
    inhalation: 'Move to fresh air. If breathing difficulties persist, seek medical attention.',
  },
  
  regulatoryStatus: {
    gras: false, // Not GRAS at these concentrations
    euCosmeticRestricted: true,
    ifraRestrictions: true,
  },
  
  sources: ['Tisserand & Young (2014)', 'IFRA Standards'],
}

// ============================================================================
// VETIVER (Vetiveria zizanioides) - Deep Earth Grounding
// ============================================================================

export const VETIVER_PROFILE: OilSafetyProfile = {
  oilId: 'vetiver',
  commonName: 'Vetiver',
  botanicalName: 'Vetiveria zizanioides',
  
  maxDilutionPercent: 15, // Very safe oil
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Considered safe during pregnancy - grounding and calming',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [], // Very safe oil
  
  keyConstituents: [
    { name: 'Vetiverol', percentageRange: [15, 25], concerns: [] },
    { name: 'Khusimol', percentageRange: [10, 20], concerns: [] },
    { name: 'Vetivone', percentageRange: [5, 15], concerns: [] },
    { name: 'Beta-vetivone', percentageRange: [3, 10], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
    notes: 'Extremely safe oil with no known toxicity',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 15,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water if irritation occurs',
    eyeContact: 'Flush with water for 15 minutes',
    ingestion: 'Contact poison control if large amount ingested',
    inhalation: 'Move to fresh air if discomfort occurs',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 18. CLARY SAGE (Salvia sclarea) - The Women's Oil
// ============================================================================

export const CLARY_SAGE_PROFILE: OilSafetyProfile = {
  oilId: 'clary-sage',
  commonName: 'Clary Sage',
  botanicalName: 'Salvia sclarea',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'dilute',
    under12Years: 'safe',
  },
  
  // Unified 2026-07-21: raised from 'caution' to 'avoid'. The pregnancy audit
  // suite (tests/pregnancy-safety-audit.test.ts) pins clary-sage HIGH
  // (emmenagogue / uterine stimulant); the stricter verdict wins, so the DB
  // and both engines now agree at HIGH without special-casing.
  pregnancySafety: 'avoid',
  pregnancyNotes: 'Uterine stimulant (emmenagogue) — avoid throughout pregnancy. Traditionally used in late pregnancy for labor preparation, only under direct midwife/healthcare provider supervision.',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns at normal dilutions',
  
  contraindications: [
    {
      type: 'hormone-modulating',
      severity: 'caution',
      description: 'May have estrogenic effects - use with caution with hormone-sensitive conditions',
    },
    {
      type: 'medication-interaction',
      severity: 'caution',
      description: 'May enhance sedative effects of medications',
    },
  ],
  
  keyConstituents: [
    { name: 'Linalyl acetate', percentageRange: [50, 75], concerns: [] },
    { name: 'Linalool', percentageRange: [10, 25], concerns: [] },
    { name: 'Germacrene D', percentageRange: [2, 8], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [
    {
      drugClass: 'Sedatives',
      effect: 'potentiates',
      description: 'May enhance sedative effects',
      severity: 'caution',
    },
    {
      drugClass: 'Hormone medications',
      effect: 'unknown',
      description: 'Potential hormonal interactions',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 8. ROSEMARY (Rosmarinus officinalis) - 1,8-Cineole Type
// ============================================================================

export const ROSEMARY_PROFILE: OilSafetyProfile = {
  oilId: 'rosemary',
  commonName: 'Rosemary',
  botanicalName: 'Rosmarinus officinalis (1,8-cineole chemotype)',
  
  maxDilutionPercent: 16,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'avoid', // 1,8-cineole content
    under6Years: 'dilute',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'avoid',
  pregnancyNotes: '1,8-cineole content and traditional emmenagogue concerns',
  
  breastfeedingSafety: 'caution',
  breastfeedingNotes: 'Avoid large doses',
  
  contraindications: [
    {
      type: 'blood-pressure-affecting',
      severity: 'caution',
      description: 'May raise blood pressure',
    },
    {
      type: 'seizure-risk',
      severity: 'caution',
      description: 'High cineole content theoretical risk',
    },
  ],
  
  keyConstituents: [
    { name: '1,8-Cineole', percentageRange: [38, 55], concerns: ['neurotoxic'] },
    { name: 'α-Pinene', percentageRange: [9, 26], concerns: [] },
    { name: 'Camphor', percentageRange: [5, 15], concerns: ['neurotoxic'] },
  ],
  
  incompatibleOils: [
    {
      oilId: 'peppermint',
      reason: 'Cumulative 1,8-cineole content',
      severity: 'caution',
    },
  ],
  
  toxicity: {
    level: 'moderate',
    oral: true,
    dermal: false,
    inhalation: true,
    notes: 'High camphor and cineole content',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 10,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: true,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: true,
  },
  
  drugInteractions: [
    {
      drugClass: 'Anticoagulants',
      effect: 'potentiates',
      description: 'May increase bleeding risk',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 9. CHAMOMILE ROMAN (Chamaemelum nobile)
// ============================================================================

export const CHAMOMILE_ROMAN_PROFILE: OilSafetyProfile = {
  oilId: 'chamomile-roman',
  commonName: 'Chamomile Roman',
  botanicalName: 'Chamaemelum nobile',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'One of the safest oils for pregnancy',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [
    {
      type: 'skin-sensitization',
      severity: 'caution',
      description: 'Rare allergic reactions in Asteraceae-sensitive individuals',
    },
  ],
  
  keyConstituents: [
    { name: 'Isobutyl angelate', percentageRange: [5, 33], concerns: [] },
    { name: 'Isoamyl angelate', percentageRange: [5, 20], concerns: [] },
    { name: 'Methylallyl angelate', percentageRange: [3, 15], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: true, // Rarely
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 10. SWEET ORANGE (Citrus sinensis)
// ============================================================================

export const SWEET_ORANGE_PROFILE: OilSafetyProfile = {
  oilId: 'orange-sweet',
  commonName: 'Sweet Orange',
  botanicalName: 'Citrus sinensis',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Safe in normal use',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [],
  
  keyConstituents: [
    { name: 'Limonene', percentageRange: [90, 97], concerns: [] },
    { name: 'Myrcene', percentageRange: [0.5, 3], concerns: [] },
  ],
  
  incompatibleOils: [], // Not phototoxic
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false, // Not phototoxic unlike other citrus
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 11. YLANG YLANG (Cananga odorata)
// ============================================================================

export const YLANG_YLANG_PROFILE: OilSafetyProfile = {
  oilId: 'ylang-ylang',
  commonName: 'Ylang Ylang',
  botanicalName: 'Cananga odorata',
  
  maxDilutionPercent: 0.8, // Very strong scent, sensitization risk
  recommendedDilutionPercent: 0.5,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'dilute',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Safe in low dilutions',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'Safe in low dilutions',
  
  contraindications: [
    {
      type: 'skin-sensitization',
      severity: 'warning',
      description: 'High risk of skin sensitization',
    },
    {
      type: 'blood-pressure-affecting',
      severity: 'caution',
      description: 'May lower blood pressure',
    },
  ],
  
  keyConstituents: [
    { name: 'Linalool', percentageRange: [5, 20], concerns: [] },
    { name: 'Germacrene D', percentageRange: [10, 22], concerns: [] },
    { name: 'Benzyl acetate', percentageRange: [5, 18], concerns: [] },
    { name: '(E)-α-Farnesene', percentageRange: [3, 15], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'low',
    oral: false,
    dermal: true, // Sensitization risk
    inhalation: false,
    notes: 'Very strong scent - use sparingly',
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: true,
    riskLevel: 'high',
    maxDilutionForSensitive: 0.4,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water. Discontinue use if rash.',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: true, // Sensitization limits
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 12. GERANIUM (Pelargonium graveolens)
// ============================================================================

export const GERANIUM_PROFILE: OilSafetyProfile = {
  oilId: 'geranium',
  commonName: 'Geranium',
  botanicalName: 'Pelargonium graveolens',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Safe in normal use',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [
    {
      type: 'hormone-modulating',
      severity: 'caution',
      description: 'Possible hormonal effects',
    },
  ],
  
  keyConstituents: [
    { name: 'Citronellol', percentageRange: [20, 40], concerns: [] },
    { name: 'Geraniol', percentageRange: [15, 25], concerns: [] },
    { name: 'Linalool', percentageRange: [5, 15], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [
    {
      drugClass: 'Diabetes medications',
      effect: 'potentiates',
      description: 'May lower blood sugar',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 13. LIME (Citrus aurantifolia) - PHOTOTOXIC
// ============================================================================

export const LIME_PROFILE: OilSafetyProfile = {
  oilId: 'lime',
  commonName: 'Lime',
  botanicalName: 'Citrus aurantifolia',
  
  maxDilutionPercent: 0.7, // Severe phototoxicity
  recommendedDilutionPercent: 0.7,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'caution',
  pregnancyNotes: 'Use FCF (furanocoumarin-free) version',
  
  breastfeedingSafety: 'caution',
  breastfeedingNotes: 'Use FCF version',
  
  contraindications: [
    {
      type: 'photosensitivity',
      severity: 'critical',
      description: 'Severe phototoxicity risk',
    },
  ],
  
  keyConstituents: [
    { name: 'Limonene', percentageRange: [45, 60], concerns: [] },
    { name: 'Bergapten', percentageRange: [0.1, 0.5], concerns: ['photosensitivity'] },
  ],
  
  incompatibleOils: [
    {
      oilId: 'bergamot',
      reason: 'Extreme phototoxic combination',
      severity: 'avoid',
    },
    {
      oilId: 'lemon',
      reason: 'Severe phototoxic stack',
      severity: 'avoid',
    },
  ],
  
  toxicity: {
    level: 'low',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: true,
    phototoxicCompounds: ['bergapten', 'psoralen'],
    safeAfterHours: 72,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 0.7,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water. Avoid sun for 72 hours.',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: true,
    ifraRestrictions: true,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 14. CEDARWOOD (Juniperus virginiana)
// ============================================================================

export const CEDARWOOD_PROFILE: OilSafetyProfile = {
  oilId: 'cedarwood',
  commonName: 'Cedarwood Atlas',
  botanicalName: 'Cedrus atlantica',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'avoid',
  pregnancyNotes: 'Abortifacient potential in high doses',
  
  breastfeedingSafety: 'caution',
  breastfeedingNotes: 'Use with caution',
  
  contraindications: [],
  
  keyConstituents: [
    { name: 'Himachalenes', percentageRange: [30, 60], concerns: [] },
    { name: 'α-Himachalene', percentageRange: [15, 35], concerns: [] },
    { name: 'β-Himachalene', percentageRange: [10, 25], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 15. GRAPEFRUIT (Citrus paradisi)
// ============================================================================

export const GRAPEFRUIT_PROFILE: OilSafetyProfile = {
  oilId: 'grapefruit',
  commonName: 'Grapefruit',
  botanicalName: 'Citrus paradisi',
  
  maxDilutionPercent: 4, // Phototoxic limit
  recommendedDilutionPercent: 4,
  
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Safe in normal use',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [
    {
      type: 'photosensitivity',
      severity: 'warning',
      description: 'Moderate phototoxicity',
    },
  ],
  
  keyConstituents: [
    { name: 'Limonene', percentageRange: [88, 95], concerns: [] },
    { name: 'Nootkatone', percentageRange: [0.1, 2], concerns: [] },
  ],
  
  incompatibleOils: [
    {
      oilId: 'bergamot',
      reason: 'Cumulative phototoxicity',
      severity: 'avoid',
    },
    {
      oilId: 'lemon',
      reason: 'Phototoxic stacking',
      severity: 'avoid',
    },
    {
      oilId: 'lime',
      reason: 'Phototoxic stacking',
      severity: 'avoid',
    },
  ],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: true,
    phototoxicCompounds: ['nootkatone', 'bergapten'],
    safeAfterHours: 24,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 4,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [
    {
      drugClass: 'CYP3A4 substrates',
      effect: 'inhibits',
      description: 'May affect drug metabolism - consult physician',
      severity: 'warning',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash with soap and water. Avoid sun for 24 hours.',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 16. SANDALWOOD (Santalum album)
// ============================================================================

export const SANDALWOOD_PROFILE: OilSafetyProfile = {
  oilId: 'sandalwood',
  commonName: 'Sandalwood',
  botanicalName: 'Santalum album',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Safe in normal use',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [],
  
  keyConstituents: [
    { name: 'α-Santalol', percentageRange: [41, 55], concerns: [] },
    { name: 'β-Santalol', percentageRange: [16, 24], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}

// ============================================================================
// 17. PATCHOULI (Pogostemon cablin)
// ============================================================================

export const PATCHOULI_PROFILE: OilSafetyProfile = {
  oilId: 'patchouli',
  commonName: 'Patchouli',
  botanicalName: 'Pogostemon cablin',
  
  maxDilutionPercent: 25,
  recommendedDilutionPercent: 5,
  
  ageRestrictions: {
    under2Months: 'safe',
    under6Months: 'safe',
    under2Years: 'safe',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  pregnancySafety: 'safe',
  pregnancyNotes: 'Safe in normal use',
  
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'No known concerns',
  
  contraindications: [],
  
  keyConstituents: [
    { name: 'Patchoulol', percentageRange: [25, 35], concerns: [] },
    { name: 'α-Bulnesene', percentageRange: [13, 21], concerns: [] },
    { name: 'α-Guaiene', percentageRange: [12, 20], concerns: [] },
  ],
  
  incompatibleOils: [],
  
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
  },
  
  photosensitivity: {
    isPhotosensitive: false,
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 25,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  drugInteractions: [
    {
      drugClass: 'Blood thinners',
      effect: 'potentiates',
      description: 'May inhibit platelet aggregation',
      severity: 'caution',
    },
  ],
  
  firstAid: {
    skinContact: 'Wash with soap and water',
    eyeContact: 'Flush with water',
    ingestion: 'Contact poison control',
    inhalation: 'Move to fresh air',
  },
  
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: ['Tisserand & Young (2014)'],
}
