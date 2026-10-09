/**
 * Bergamot (FCF) - Furocoumarin-Free / Bergapten-Free - Certified Organic
 * Botanical: Citrus aurantium ssp. bergamia
 * Origin: Calabria, Italy
 * Certification: Certified Organic
 * 
 * EXTRACTION METHOD:
 * Obtained from the fruit peel by cold expression (cold pressed), then washed
 * to remove furocoumarins (bergapten). This makes it non-phototoxic and safe
 * for daytime use, unlike regular Bergamot which contains 0.3-0.5% bergapten.
 */

import { OilSafetyProfile } from './types'

export const BERGAMOT_FCF_PROFILE: OilSafetyProfile = {
  oilId: 'bergamot-fcf',
  shelfLifeMonths: 12,
  commonName: 'Bergamot (FCF) Organic',
  botanicalName: 'Citrus aurantium ssp. bergamia',
  
  // Concentration Limits
  maxDilutionPercent: 5.0, // Safe for leave-on products
  recommendedDilutionPercent: 1.0, // Typical for massage oils
  
  // Age Restrictions
  ageRestrictions: {
    under2Months: 'avoid',
    under6Months: 'avoid',
    under2Years: 'dilute',
    under6Years: 'safe',
    under12Years: 'safe',
  },
  
  // Pregnancy Safety
  pregnancySafety: 'caution',
  pregnancyNotes: 'Bergapten-free (FCF) bergamot is safer than regular bergamot during pregnancy as it lacks the phototoxic furocoumarins. Use at low dilutions (under 1%). Some traditional sources recommend avoiding all citrus oils in first trimester.',
  
  // Breastfeeding Safety
  breastfeedingSafety: 'safe',
  breastfeedingNotes: 'Generally considered safe during breastfeeding when used at normal dilutions. FCF variety eliminates phototoxicity concerns.',
  
  // Specific Contraindications
  contraindications: [
    {
      type: 'photosensitivity',
      severity: 'info',
      description: 'Bergapten-free (FCF) bergamot has been washed to remove furocoumarins (bergapten). Unlike regular bergamot, it does NOT cause phototoxic reactions and is safe for daytime use.',
      affectedSystems: ['skin'],
    },
    {
      type: 'medication-interaction',
      severity: 'caution',
      description: 'Bergamot may interact with medications metabolized by CYP3A4 and CYP1A2 enzymes. Monitor if taking medications that use these pathways.',
      affectedSystems: ['liver', 'metabolism'],
    },
  ],
  
  // Chemical Compounds of Concern
  keyConstituents: [
    {
      name: 'Limonene',
      percentageRange: [30, 45],
      concerns: [],
    },
    {
      name: 'Linalyl acetate',
      percentageRange: [22, 36],
      concerns: [],
    },
    {
      name: 'Linalool',
      percentageRange: [3, 15],
      concerns: ['skin-sensitization'],
    },
    {
      name: 'Gamma-terpinene',
      percentageRange: [6, 12],
      concerns: [],
    },
    {
      name: 'Beta-pinene',
      percentageRange: [5, 10],
      concerns: [],
    },
    {
      name: 'Bergapten (furocoumarin)',
      percentageRange: [0, 0],
      concerns: [],
    },
    // Note: Bergapten is REMOVED through washing after cold expression
    // Regular bergamot contains 0.3-0.5% bergapten
  ],
  
  // Incompatibility with Other Oils
  incompatibleOils: [],
  
  // Toxicity Information
  toxicity: {
    level: 'none',
    oral: false,
    dermal: false,
    inhalation: false,
    notes: 'FCF bergamot is non-toxic, non-irritating, and non-sensitizing at recommended dilutions.',
  },
  
  // Special Properties
  photosensitivity: {
    isPhotosensitive: false, // Bergapten removed through washing
    phototoxicCompounds: [], // Furocoumarins removed
    safeAfterHours: 0, // No sun avoidance needed - major advantage over regular bergamot
  },
  
  skinSensitization: {
    isSensitizer: false,
    riskLevel: 'low',
    maxDilutionForSensitive: 1.0,
  },
  
  respiratoryEffects: {
    canTriggerAsthma: false,
    isMucousMembraneIrritant: false,
    cautionForRespiratoryConditions: false,
  },
  
  // Drug Interactions
  drugInteractions: [
    {
      drugClass: 'CYP3A4 substrates',
      effect: 'inhibits',
      description: 'Bergamot oil may inhibit CYP3A4 enzyme activity, potentially affecting metabolism of drugs including simvastatin, atorvastatin, felodipine, nifedipine, cyclosporine, and tacrolimus.',
      severity: 'caution',
    },
    {
      drugClass: 'CYP1A2 substrates',
      effect: 'inhibits',
      description: 'May affect metabolism of drugs processed by CYP1A2 including caffeine, theophylline, and riluzole.',
      severity: 'minor',
    },
    {
      drugClass: 'Photosensitizing medications',
      effect: 'unknown',
      description: 'While FCF bergamot is not phototoxic, combining with photosensitizing medications theoretically could increase sensitivity. Monitor for unusual skin reactions.',
      severity: 'minor',
    },
  ],
  
  // First Aid
  firstAid: {
    skinContact: 'Wash with soap and water. FCF bergamot is generally non-irritating.',
    eyeContact: 'Flush immediately with water for 15 minutes. Seek medical attention if irritation persists.',
    ingestion: 'Do not induce vomiting. Drink milk or water. Contact poison control if large amount ingested.',
    inhalation: 'Move to fresh air. Generally non-toxic via inhalation.',
  },
  
  // Regulatory
  regulatoryStatus: {
    gras: true,
    euCosmeticRestricted: false,
    ifraRestrictions: false,
  },
  
  sources: [
    'Tisserand & Young, Essential Oil Safety, 2nd Edition',
    'IFRA Standards, 51st Amendment',
    'Battaglia, S. The Complete Guide to Aromatherapy',
    'Clinical studies on bergamot essential oil anxiolytic effects',
  ],
}

// Export for database integration
export default BERGAMOT_FCF_PROFILE
