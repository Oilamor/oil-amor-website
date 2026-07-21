/**
 * Comprehensive Safety System - V2 (Warning-Based)
 * 
 * Medical-grade safety checking that EDUCATES and WARNS rather than BLOCKS.
 * Users make informed decisions with full transparency.
 * 
 * Philosophy:
 * - Never block access to oils
 * - Always provide clear warnings with explanations
 * - Require acknowledgment for serious risks
 * - Distinguish topical vs inhalation risks
 * - Allow user autonomy with informed consent
 */

import {
  COMMON_MEDICATIONS,
  OIL_MEDICATION_INTERACTIONS,
  HEALTH_CONDITIONS,
  OIL_CONDITION_CONTRAINDICATIONS,
  AGE_DOSAGE_LIMITS,
  searchMedications,
} from './medication-database';
import { getOilSafetyProfile } from './database';

// ============================================================================
// TYPES
// ============================================================================

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface UserSafetyProfile {
  age: number;
  ageGroup: keyof typeof AGE_DOSAGE_LIMITS;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  isTryingToConceive: boolean;
  medications: UserMedication[];
  healthConditions: string[];
  knownAllergies: string[];
  hasSensitiveSkin: boolean;
  respiratorySensitivity: boolean;
  experienceLevel: ExperienceLevel;
  weightKg?: number;
}

export interface UserMedication {
  id: string;
  name: string;
  genericName?: string;
  isActive: boolean;
}

export interface OilComponent {
  oilId: string;
  name: string;
  ml: number;
  drops: number;
}

export type RiskLevel = 'info' | 'low' | 'moderate' | 'high' | 'critical';
export type RouteOfUse = 'topical' | 'inhalation' | 'diffuser' | 'all-routes';

export interface SafetyWarning {
  id: string;
  riskLevel: RiskLevel;
  category: 'medication' | 'condition' | 'age' | 'pregnancy' | 'lactation' | 'dosage' | 'route' | 'toxicity' | 'allergy';
  routeSpecific?: RouteOfUse[]; // Which routes this applies to
  title: string;
  // Experience-based messages
  message: string; // Default (beginner)
  messageIntermediate?: string; // Shorter for intermediate
  messageAdvanced?: string; // Brief for advanced
  messageProfessional?: string; // Minimal for professionals
  detailedExplanation: string;
  affectedOils: string[];
  recommendation: string;
  alternatives?: string[];
  references?: string[];
  requiresAcknowledgment: boolean; // Must check box to proceed
  acknowledgmentText?: string; // Custom text for checkbox
}

/**
 * Get the appropriate message based on experience level
 */
export function getWarningMessage(warning: SafetyWarning, experience: ExperienceLevel): string {
  switch (experience) {
    case 'professional':
      return warning.messageProfessional || warning.messageAdvanced || warning.message;
    case 'advanced':
      return warning.messageAdvanced || warning.message;
    case 'intermediate':
      return warning.messageIntermediate || warning.message;
    case 'beginner':
    default:
      return warning.message;
  }
}

export interface SafetyValidationResult {
  canProceed: true; // Always true - we don't block
  requiresAcknowledgment: boolean;
  safetyScore: number; // 0-100 (informational)
  warnings: SafetyWarning[];
  criticalWarnings: SafetyWarning[]; // For display priority
  acknowledged: boolean;
  experienceLevel: ExperienceLevel;
  allergyWarnings?: SafetyWarning[]; // Specific to user's allergies
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Main safety validation - WARNINGS ONLY, never blocks
 */
export function validateMixSafety(
  oils: OilComponent[],
  userProfile: UserSafetyProfile,
  intendedRoute: RouteOfUse = 'all-routes'
): SafetyValidationResult {
  const warnings: SafetyWarning[] = [];
  const allergyWarnings: SafetyWarning[] = [];

  // 1. Check medication interactions
  if ((userProfile.medications?.length ?? 0) > 0) {
    const medWarnings = checkMedicationInteractions(oils, userProfile.medications, intendedRoute, userProfile.experienceLevel);
    warnings.push(...medWarnings);
  }

  // 2. Check health conditions
  if ((userProfile.healthConditions?.length ?? 0) > 0) {
    const conditionWarnings = checkConditionContraindications(oils, userProfile.healthConditions, intendedRoute, userProfile.experienceLevel);
    warnings.push(...conditionWarnings);
  }

  // 3. Check allergies
  if ((userProfile.knownAllergies?.length ?? 0) > 0) {
    const allergyChecks = checkAllergyWarnings(oils, userProfile.knownAllergies, userProfile.experienceLevel);
    allergyWarnings.push(...allergyChecks);
    warnings.push(...allergyChecks);
  }

  // 4. Check pregnancy (applies to all routes)
  if (userProfile.isPregnant) {
    const pregnancyWarnings = checkPregnancyWarnings(oils, intendedRoute, userProfile.experienceLevel);
    warnings.push(...pregnancyWarnings);
  }

  // 5. Check trying to conceive
  if (userProfile.isTryingToConceive) {
    const ttcWarnings = checkTryingToConceiveWarnings(oils, userProfile.experienceLevel);
    warnings.push(...ttcWarnings);
  }

  // 6. Check lactation
  if (userProfile.isBreastfeeding) {
    const lactationWarnings = checkLactationWarnings(oils, intendedRoute, userProfile.experienceLevel);
    warnings.push(...lactationWarnings);
  }

  // 7. Check age-based guidance (TOPICAL ONLY) - only for beginner/intermediate
  if ((intendedRoute === 'topical' || intendedRoute === 'all-routes') && 
      (userProfile.experienceLevel === 'beginner' || userProfile.experienceLevel === 'intermediate')) {
    const ageWarnings = checkAgeGuidance(oils, userProfile, userProfile.experienceLevel);
    warnings.push(...ageWarnings);
  }

  // 8. Check toxicity warnings (only for beginner/intermediate/advanced)
  if (userProfile.experienceLevel !== 'professional') {
    const toxicityWarnings = checkToxicityWarnings(oils, intendedRoute, userProfile.experienceLevel);
    warnings.push(...toxicityWarnings);
  }

  // 9. Check phototoxicity (topical only) - only for beginner/intermediate
  if ((intendedRoute === 'topical' || intendedRoute === 'all-routes') &&
      (userProfile.experienceLevel === 'beginner' || userProfile.experienceLevel === 'intermediate')) {
    const photoWarnings = checkPhototoxicityWarnings(oils);
    warnings.push(...photoWarnings);
  }

  // 10. Check base oil warnings (intrinsic oil properties - CRITICAL for all users)
  // This ensures warnings like "Clove is a blood thinner" always appear
  const baseOilWarnings = checkBaseOilWarnings(oils, intendedRoute, userProfile);
  warnings.push(...baseOilWarnings);

  // Separate critical warnings
  const criticalWarnings = warnings.filter(w => w.riskLevel === 'critical');
  const requiresAcknowledgment = criticalWarnings.length > 0;

  // Calculate safety score (informational only)
  const safetyScore = calculateSafetyScore(warnings);

  return {
    canProceed: true, // NEVER BLOCK
    requiresAcknowledgment,
    safetyScore,
    warnings: warnings.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
      return severityOrder[a.riskLevel] - severityOrder[b.riskLevel];
    }),
    criticalWarnings,
    acknowledged: false,
    experienceLevel: userProfile.experienceLevel,
    allergyWarnings: allergyWarnings.length > 0 ? allergyWarnings : undefined,
  };
}

/**
 * Validate for community blends - ALWAYS beginner level with full warnings
 */
export function validateMixSafetyForCommunity(
  oils: OilComponent[],
  basicProfile: {
    age: number;
    isPregnant: boolean;
    isBreastfeeding: boolean;
    healthConditions: string[];
    medications: UserMedication[];
  },
  intendedRoute: RouteOfUse = 'all-routes'
): SafetyValidationResult {
  // Force beginner experience level for community blends
  const profile: UserSafetyProfile = {
    ...basicProfile,
    ageGroup: 'adult' as any, // Will be calculated from age
    isTryingToConceive: false,
    knownAllergies: [],
    hasSensitiveSkin: false,
    respiratorySensitivity: false,
    experienceLevel: 'beginner', // ALWAYS beginner for community
  };

  return validateMixSafety(oils, profile, intendedRoute);
}

/**
 * Check medication interactions - WARNINGS ONLY
 */
function checkMedicationInteractions(
  oils: OilComponent[],
  medications: UserMedication[],
  route: RouteOfUse,
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  for (const med of medications) {
    if (!med.isActive) continue;

    const medData = COMMON_MEDICATIONS.find(m => 
      m.genericName.toLowerCase() === med.name.toLowerCase() ||
      m.brandNames?.some(b => b.toLowerCase() === med.name.toLowerCase())
    );

    if (!medData) continue;

    // Check for anticoagulant + clove/wintergreen/cinnamon-bark (CRITICAL for topical)
    if (medData.affectsBloodClotting) {
      const dangerousOils = oils.filter(o => 
        ['clove-bud', 'wintergreen', 'birch', 'cinnamon-bark'].includes(o.oilId)
      );

      if (dangerousOils.length > 0 && (route === 'topical' || route === 'all-routes')) {
        warnings.push({
          id: `crit-anticoag-${med.id}`,
          riskLevel: 'critical',
          category: 'medication',
          routeSpecific: ['topical'],
          title: `CRITICAL: Blood Thinner + ${dangerousOils.map(o => o.name).join('/')}`,
          // Experience-based messages
          message: `You take ${med.name} (blood thinner). ${dangerousOils.map(o => o.name).join(' and ')} significantly increase bleeding risk when used on skin.`,
          messageIntermediate: `${dangerousOils.map(o => o.name).join('/')} contain anticoagulant compounds. High bleeding risk with ${med.name} (topical use).`,
          messageAdvanced: `Anticoagulant oils (${dangerousOils.map(o => o.name).join('/')}) + ${med.name} = bleeding risk (topical).`,
          messageProfessional: `Caution: ${dangerousOils.map(o => o.name).join('/')} (eugenol/methyl salicylate/coumarin) + anticoagulant therapy.`,
          detailedExplanation: `${dangerousOils.map(o => o.name).join(' and ')} contain compounds (eugenol in clove, methyl salicylate in wintergreen/birch, coumarin in cinnamon) that interfere with blood clotting. Combined with ${med.name}, this can cause severe bruising, prolonged bleeding from cuts, or internal hemorrhage. This risk applies to TOPICAL USE (on skin) only. Inhalation/diffusion does not carry the same risk.`,
          affectedOils: dangerousOils.map(o => o.oilId),
          recommendation: 'If using TOPICALLY: Avoid these oils entirely. For INHALATION/DIFFUSER: Lower risk but monitor for unusual bruising.',
          alternatives: ['lavender', 'frankincense', 'bergamot-fcf', 'eucalyptus'],
          requiresAcknowledgment: true,
          acknowledgmentText: 'I understand this combination increases bleeding risk. I do not use these oils topically, or I accept this risk.',
        });
      }
    }

    // Check for epilepsy medications + neurotoxic oils
    const epilepsyMeds = ['valproic acid', 'carbamazepine', 'lamotrigine', 'phenytoin'];
    if (epilepsyMeds.some(e => med.name.toLowerCase().includes(e))) {
      const seizureRiskOils = oils.filter(o => 
        ['hyssop', 'sage', 'camphor', 'wormwood', 'rosemary'].includes(o.oilId)
      );

      if (seizureRiskOils.length > 0) {
        warnings.push({
          id: `crit-epilepsy-${med.id}`,
          riskLevel: 'critical',
          category: 'medication',
          title: `CRITICAL: Seizure Risk with ${seizureRiskOils.map(o => o.name).join('/')}`,
          // Experience-based messages
          message: `You take ${med.name} for seizure control. These oils contain neurotoxic compounds that can trigger seizures.`,
          messageIntermediate: `Seizure risk: ${seizureRiskOils.map(o => o.name).join('/')} (neurotoxic) with ${med.name}.`,
          messageAdvanced: `Neurotoxic oils (${seizureRiskOils.map(o => o.name).join('/')}) + antiepileptics = seizure risk.`,
          messageProfessional: `Caution: Neurotoxic oils (thujone/camphor/pinocamphone) + seizure disorder therapy.`,
          detailedExplanation: `${seizureRiskOils.map(o => o.name).join(' and ')} contain compounds (thujone, pinocamphone, camphor) that are known convulsants. Even with seizure medication, these oils can lower seizure threshold and trigger breakthrough seizures. This applies to ALL routes of use including inhalation.`,
          affectedOils: seizureRiskOils.map(o => o.oilId),
          recommendation: 'STRONGLY RECOMMENDED: Avoid these oils completely. Use safer alternatives.',
          alternatives: ['lavender', 'frankincense', 'bergamot-fcf'],
          requiresAcknowledgment: true,
          acknowledgmentText: 'I understand these oils may trigger seizures. I have epilepsy and accept this risk, or I do not have epilepsy/seizures.',
        });
      }
    }

    // SSRI + serotonergic oils (moderate)
    const ssriMeds = ['sertraline', 'fluoxetine', 'escitalopram', 'paroxetine'];
    if (ssriMeds.some(s => med.name.toLowerCase().includes(s))) {
      const serotonergicOils = oils.filter(o => 
        ['clary-sage', 'ylang-ylang'].includes(o.oilId)
      );

      if (serotonergicOils.length > 0) {
        warnings.push({
          id: `mod-ssri-${med.id}`,
          riskLevel: 'moderate',
          category: 'medication',
          title: `Potential Interaction: ${med.name} + ${serotonergicOils.map(o => o.name).join('/')}`,
          message: `These oils may have mild serotonergic effects. Theoretical risk when combined with ${med.name}.`,
          detailedExplanation: `While rare, combining serotonergic substances can theoretically contribute to serotonin syndrome (agitation, confusion, rapid heart rate). This is primarily a concern with high doses and multiple serotonergic agents. Risk with essential oils is low but not zero.`,
          affectedOils: serotonergicOils.map(o => o.oilId),
          recommendation: 'Monitor for symptoms: agitation, confusion, rapid heartbeat, sweating. Start with low concentrations.',
          alternatives: ['lavender', 'frankincense'],
          requiresAcknowledgment: false,
        });
      }
    }

    // Benzodiazepines + sedating oils (moderate)
    const benzoMeds = ['alprazolam', 'lorazepam', 'clonazepam', 'diazepam'];
    if (benzoMeds.some(b => med.name.toLowerCase().includes(b))) {
      const sedatingOils = oils.filter(o => 
        ['lavender', 'roman-chamomile', 'vetiver'].includes(o.oilId)
      );

      if (sedatingOils.length > 0) {
        warnings.push({
          id: `mod-benzo-${med.id}`,
          riskLevel: 'moderate',
          category: 'medication',
          title: `Sedation Risk: ${med.name} + Calming Oils`,
          message: `These oils have calming effects that may add to the sedation from ${med.name}.`,
          detailedExplanation: `Both benzodiazepines and these essential oils have CNS depressant effects. Combined use may cause excessive drowsiness, dizziness, or impaired coordination. This is manageable with awareness—don't drive or operate machinery after use.`,
          affectedOils: sedatingOils.map(o => o.oilId),
          recommendation: 'Use in evening/bedtime only. Avoid before driving. Consider reducing benzodiazepine dose with doctor approval.',
          requiresAcknowledgment: false,
        });
      }
    }
  }

  return warnings;
}

/**
 * Check health conditions - WARNINGS ONLY
 */
function checkConditionContraindications(
  oils: OilComponent[],
  conditionIds: string[],
  route: RouteOfUse,
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  for (const conditionId of conditionIds) {
    const condition = HEALTH_CONDITIONS.find(c => c.id === conditionId);
    if (!condition) continue;

    // Epilepsy - CRITICAL for neurotoxic oils (ALL ROUTES)
    if (conditionId === 'epilepsy') {
      const seizureOils = oils.filter(o => 
        ['hyssop', 'sage', 'camphor', 'wormwood', 'rosemary', 'fennel'].includes(o.oilId)
      );

      if (seizureOils.length > 0) {
        warnings.push({
          id: `crit-epilepsy-condition`,
          riskLevel: 'critical',
          category: 'condition',
          title: `CRITICAL: Seizure Disorder + Neurotoxic Oils`,
          message: `You have epilepsy/seizure disorder. ${seizureOils.map(o => o.name).join(', ')} contain compounds that can trigger seizures.`,
          messageIntermediate: `Seizure risk: ${seizureOils.map(o => o.name).join('/')} (neurotoxic) with epilepsy.`,
          messageAdvanced: `Convulsant oils (${seizureOils.map(o => o.name).join('/')}) + seizure disorder.`,
          messageProfessional: `Epilepsy patient using neurotoxic oils (thujone/camphor/pinocamphone).`,
          detailedExplanation: `These oils contain thujone, pinocamphone, or camphor—known convulsants. Studies have documented seizures triggered by these compounds, even in people with well-controlled epilepsy. Risk applies to ALL routes: topical, inhalation, and diffusion.`,
          affectedOils: seizureOils.map(o => o.oilId),
          recommendation: 'STRONGLY RECOMMENDED: Select alternative oils. The seizure risk is well-documented and significant.',
          alternatives: ['lavender', 'frankincense', 'bergamot-fcf', 'neroli'],
          requiresAcknowledgment: true,
          acknowledgmentText: 'I have a seizure disorder and understand these oils may trigger seizures. I accept this risk or I do not have epilepsy.',
        });
      }
    }

    // Hemophilia/Bleeding disorders (topical only)
    if (conditionId === 'hemophilia' || conditionId === 'thrombocytopenia') {
      if (route === 'topical' || route === 'all-routes') {
        const bleedingRiskOils = oils.filter(o => 
          ['clove-bud', 'wintergreen', 'cinnamon-bark'].includes(o.oilId)
        );

        if (bleedingRiskOils.length > 0) {
          warnings.push({
            id: `crit-bleeding-disorder`,
            riskLevel: 'critical',
            category: 'condition',
            routeSpecific: ['topical'],
            title: `CRITICAL: Bleeding Disorder + Anticoagulant Oils`,
            message: `You have a bleeding disorder. These oils can further impair clotting when applied to skin.`,
            messageIntermediate: `Bleeding risk: ${bleedingRiskOils.map(o => o.name).join('/')} + ${condition.name} (topical).`,
            messageAdvanced: `Anticoagulant oils (${bleedingRiskOils.map(o => o.name).join('/')}) + bleeding disorder.`,
            messageProfessional: `${condition.name}: Patient using anticoagulant EOs (eugenol/methyl salicylate) topically.`,
            detailedExplanation: `With ${condition.name}, your blood already doesn't clot properly. These oils contain compounds that inhibit platelet function and can cause spontaneous bruising or prolonged bleeding from minor cuts. This risk is for TOPICAL USE ONLY.`,
            affectedOils: bleedingRiskOils.map(o => o.oilId),
            recommendation: 'AVOID TOPICAL USE. For inhalation/diffusion, risk is much lower but monitor for unusual bruising.',
            alternatives: ['lavender', 'frankincense', 'bergamot-fcf'],
            requiresAcknowledgment: true,
            acknowledgmentText: 'I have a bleeding disorder and understand these oils may increase bleeding risk when applied to skin.',
          });
        }
      }
    }

    // Asthma (inhalation warnings)
    if (conditionId === 'asthma' || conditionId === 'severe_asthma') {
      const respiratoryIrritants = oils.filter(o => 
        ['peppermint', 'eucalyptus', 'cinnamon-bark', 'oregano'].includes(o.oilId)
      );

      if (respiratoryIrritants.length > 0 && (route === 'inhalation' || route === 'all-routes')) {
        warnings.push({
          id: `mod-asthma`,
          riskLevel: conditionId === 'severe_asthma' ? 'high' : 'moderate',
          category: 'condition',
          routeSpecific: ['inhalation'],
          title: `Respiratory Caution: Asthma + Strong Oils`,
          message: `These oils may trigger bronchospasm in people with asthma when inhaled.`,
          messageIntermediate: `Asthma trigger potential: ${respiratoryIrritants.map(o => o.name).join('/')} (inhalation).`,
          messageAdvanced: `Respiratory irritants (${respiratoryIrritants.map(o => o.name).join('/')}) with asthma.`,
          messageProfessional: `Asthma patient using respiratory irritant oils (menthol/cineole/cinnamaldehyde).`,
          detailedExplanation: `Strong aromatic compounds can irritate airways and trigger asthma attacks in susceptible individuals. This is person-specific—some asthmatics tolerate these fine, others react strongly. Always have rescue inhaler available when trying new oils.`,
          affectedOils: respiratoryIrritants.map(o => o.oilId),
          recommendation: 'Start with 1 drop in a large room. Discontinue immediately if wheezing, coughing, or breathlessness occurs.',
          alternatives: ['lavender', 'frankincense', 'roman-chamomile'],
          requiresAcknowledgment: false,
        });
      }
    }
  }

  return warnings;
}

/**
 * Check pregnancy warnings
 *
 * Verdicts derive from the safety profiles DB (lib/safety/database.ts —
 * OIL_SAFETY_DATABASE), the single source of truth. Two audit-pinned
 * groupings are kept verbatim because tests/pregnancy-safety-audit.test.ts
 * encodes them as intended behavior:
 * - clary-sage/sage/hyssop/juniper-berry/rosemary → HIGH "uterine stimulant"
 *   (note: the profiles DB rates clary-sage 'caution' — the audit wins)
 * - fennel/aniseed/cinnamon-bark → MODERATE "hormonal oils"
 *   (note: the profiles DB rates cinnamon-bark 'avoid' — the audit wins)
 * All other oils are classified from their DB profile: 'avoid' → HIGH
 * per-oil warning, 'caution'/'consult' → MODERATE per-oil warning.
 */
function checkPregnancyWarnings(
  oils: OilComponent[],
  route: RouteOfUse,
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  // Audit-pinned groupings (see docstring above)
  const AUDIT_HIGH_RISK_OILS = ['clary-sage', 'sage', 'hyssop', 'juniper-berry', 'rosemary'];
  const AUDIT_CAUTION_OILS = ['fennel', 'aniseed', 'cinnamon-bark'];

  const isHighRisk = (oilId: string): boolean => {
    if (AUDIT_CAUTION_OILS.includes(oilId)) return false; // audit pins moderate
    if (AUDIT_HIGH_RISK_OILS.includes(oilId)) return true; // audit pins high
    return getOilSafetyProfile(oilId)?.pregnancySafety === 'avoid';
  };

  const isCaution = (oilId: string): boolean => {
    if (isHighRisk(oilId)) return false;
    if (AUDIT_CAUTION_OILS.includes(oilId)) return true; // audit pins moderate
    const safety = getOilSafetyProfile(oilId)?.pregnancySafety;
    return safety === 'caution' || safety === 'consult';
  };

  // High-risk pregnancy oils (uterine stimulants — audit-pinned group)
  const highRiskOils = oils.filter(o => AUDIT_HIGH_RISK_OILS.includes(o.oilId));

  if (highRiskOils.length > 0) {
    warnings.push({
      id: `preg-highrisk`,
      riskLevel: 'high',
      category: 'pregnancy',
      title: 'Pregnancy: Uterine Stimulants',
      message: `${highRiskOils.map(o => o.name).join(', ')} can stimulate uterine contractions and should be avoided or used with extreme caution during pregnancy.`,
      messageIntermediate: `Uterine stimulants (${highRiskOils.map(o => o.name).join('/')}) during pregnancy - avoid or extreme caution.`,
      messageAdvanced: `Emmenagogue/abortifacient oils during pregnancy: ${highRiskOils.map(o => o.name).join('/')}.`,
      messageProfessional: `Pregnancy: Patient using emmenagogue oils (${highRiskOils.map(o => o.name).join('/')}).`,
      detailedExplanation: `These oils have documented uterine stimulant (emmenagogue) effects. They have traditionally been used to induce menstruation or labor. While modern safety data is limited, historical use and pharmacological activity suggest significant caution, especially in first trimester when miscarriage risk is highest.`,
      affectedOils: highRiskOils.map(o => o.oilId),
      recommendation: 'Avoid in first trimester. If using in 2nd/3rd trimester, use only under qualified prenatal care provider guidance at very low concentrations.',
      alternatives: ['lavender', 'mandarin', 'frankincense', 'neroli', 'roman-chamomile'],
      requiresAcknowledgment: experience === 'beginner' || experience === 'intermediate',
      acknowledgmentText: 'I am pregnant and understand these oils may affect pregnancy. I will consult my healthcare provider.',
    });
  }

  // Profile-derived HIGH warnings for oils the DB marks pregnancy 'avoid'
  const profileAvoidOils = oils.filter(o => isHighRisk(o.oilId) && !AUDIT_HIGH_RISK_OILS.includes(o.oilId));

  for (const oil of profileAvoidOils) {
    const profile = getOilSafetyProfile(oil.oilId);
    warnings.push({
      id: `preg-avoid-${oil.oilId}`,
      riskLevel: 'high',
      category: 'pregnancy',
      title: `Pregnancy: Avoid ${profile?.commonName || oil.name}`,
      message: `${profile?.commonName || oil.name} is classified as "avoid" during pregnancy in the Oil Amor safety database and should not be used while pregnant.`,
      messageIntermediate: `${profile?.commonName || oil.name}: classified pregnancy "avoid" in safety database.`,
      messageAdvanced: `${profile?.commonName || oil.name}: pregnancySafety = avoid (profiles DB).`,
      messageProfessional: `Pregnancy: ${profile?.commonName || oil.name} contraindicated (profiles DB: avoid).`,
      detailedExplanation: profile?.pregnancyNotes || `${profile?.commonName || oil.name} is marked as "avoid" during pregnancy in the Oil Amor safety profiles database. Unless a qualified prenatal care provider advises otherwise, do not use this oil while pregnant.`,
      affectedOils: [oil.oilId],
      recommendation: 'Avoid throughout pregnancy, including the first trimester. Choose oils classified as pregnancy-safe instead.',
      alternatives: ['lavender', 'mandarin', 'frankincense'],
      requiresAcknowledgment: experience === 'beginner' || experience === 'intermediate',
      acknowledgmentText: 'I am pregnant and understand this oil is classified as "avoid" during pregnancy. I will consult my healthcare provider.',
    });
  }

  // Moderate-risk hormonal oils (audit-pinned group)
  const cautionOils = oils.filter(o => AUDIT_CAUTION_OILS.includes(o.oilId));

  if (cautionOils.length > 0) {
    warnings.push({
      id: `preg-caution`,
      riskLevel: 'moderate',
      category: 'pregnancy',
      title: 'Pregnancy: Hormonal Oils',
      message: `${cautionOils.map(o => o.name).join(', ')} have hormonal effects that warrant caution during pregnancy.`,
      messageIntermediate: `Phytoestrogenic oils (${cautionOils.map(o => o.name).join('/')}) during pregnancy - use caution.`,
      messageAdvanced: `Hormone-modulating oils in pregnancy: ${cautionOils.map(o => o.name).join('/')}.`,
      messageProfessional: `Pregnancy: Patient using phytoestrogenic oils (${cautionOils.map(o => o.name).join('/')}).`,
      detailedExplanation: `These oils contain phytoestrogens or compounds that may affect hormone balance. While unlikely to cause harm at typical use levels, theoretical concerns exist about affecting fetal development or pregnancy hormones.`,
      affectedOils: cautionOils.map(o => o.oilId),
      recommendation: 'Consider avoiding in first trimester. If using, keep concentrations very low (under 1%).',
      alternatives: ['lavender', 'mandarin', 'frankincense'],
      requiresAcknowledgment: false,
    });
  }

  // Profile-derived MODERATE warnings for oils the DB marks 'caution'/'consult'
  const profileCautionOils = oils.filter(o =>
    isCaution(o.oilId) && !AUDIT_CAUTION_OILS.includes(o.oilId)
  );

  for (const oil of profileCautionOils) {
    const profile = getOilSafetyProfile(oil.oilId);
    warnings.push({
      id: `preg-caution-${oil.oilId}`,
      riskLevel: 'moderate',
      category: 'pregnancy',
      title: `Pregnancy: Use ${profile?.commonName || oil.name} with Caution`,
      message: `${profile?.commonName || oil.name} is classified as "caution" during pregnancy in the Oil Amor safety database.`,
      messageIntermediate: `${profile?.commonName || oil.name}: pregnancy caution (safety database).`,
      messageAdvanced: `${profile?.commonName || oil.name}: pregnancySafety = caution (profiles DB).`,
      messageProfessional: `Pregnancy: ${profile?.commonName || oil.name} — use with caution (profiles DB: caution).`,
      detailedExplanation: profile?.pregnancyNotes || `${profile?.commonName || oil.name} is marked as "caution" during pregnancy in the Oil Amor safety profiles database. Consult a qualified prenatal care provider before use.`,
      affectedOils: [oil.oilId],
      recommendation: 'Consult your healthcare provider before use. Consider avoiding in the first trimester and keep concentrations low (under 1%).',
      alternatives: ['lavender', 'mandarin', 'frankincense'],
      requiresAcknowledgment: false,
    });
  }

  return warnings;
}

/**
 * Check allergy warnings - Comprehensive with cross-reactivity
 */
function checkAllergyWarnings(
  oils: OilComponent[],
  allergies: string[],
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  
  // Import allergen database for cross-reactivity checking
  const { searchAllergies, getAllergyById, AllergySearchResult } = require('./autocomplete-data');
  
  for (const allergy of allergies) {
    const lowerAllergy = allergy.toLowerCase();
    let allergenicOils: OilComponent[] = [];
    let crossReactivityInfo: string[] = [];
    let allergenType = 'substance';
    
    // Method 1: Direct oil name matching
    const directMatches = oils.filter(o => 
      o.name.toLowerCase().includes(lowerAllergy) || 
      o.oilId.toLowerCase().includes(lowerAllergy)
    );
    allergenicOils.push(...directMatches);
    
    // Method 2: Check against comprehensive allergen database
    const matchedAllergens = searchAllergies(allergy);
    
    for (const allergen of matchedAllergens) {
      // Check if any oil in blend matches this allergen's related oils
      const relatedOilMatches = oils.filter(o => 
        allergen.relatedOils.some((related: string) => 
          o.oilId.toLowerCase().includes(related.toLowerCase()) ||
          o.name.toLowerCase().includes(related.toLowerCase())
        )
      );
      
      // Add unique matches
      for (const match of relatedOilMatches) {
        if (!allergenicOils.find(ao => ao.oilId === match.oilId)) {
          allergenicOils.push(match);
        }
      }
      
      // Track cross-reactivity information
      if (relatedOilMatches.length > 0) {
        allergenType = allergen.type;
        if (allergen.crossReactivity.length > 0) {
          crossReactivityInfo.push(...allergen.crossReactivity);
        }
      }
    }
    
    // Method 3: Legacy family checks (for backward compatibility)
    // Check for citrus family
    if (lowerAllergy.includes('citrus')) {
      const citrusOils = oils.filter(o => 
        ['lemon', 'orange', 'lime', 'grapefruit', 'bergamot', 'mandarin', 'tangerine', 'clementine'].includes(o.oilId)
      );
      for (const co of citrusOils) {
        if (!allergenicOils.find(ao => ao.oilId === co.oilId)) {
          allergenicOils.push(co);
        }
      }
    }
    
    // Check for mint family
    if (lowerAllergy.includes('mint') || lowerAllergy.includes('lamiaceae')) {
      const mintOils = oils.filter(o => 
        ['peppermint', 'spearmint', 'lavender', 'rosemary', 'thyme', 'oregano', 'basil', 'marjoram', 'sage', 'clary-sage'].includes(o.oilId)
      );
      for (const mo of mintOils) {
        if (!allergenicOils.find(ao => ao.oilId === mo.oilId)) {
          allergenicOils.push(mo);
        }
      }
    }
    
    // Check for ragweed/asteraceae family
    if (lowerAllergy.includes('ragweed') || lowerAllergy.includes('asteraceae') || lowerAllergy.includes('daisy')) {
      const ragweedOils = oils.filter(o => 
        ['chamomile-german', 'chamomile-roman', 'yarrow', 'tansy', 'helichrysum'].includes(o.oilId)
      );
      for (const ro of ragweedOils) {
        if (!allergenicOils.find(ao => ao.oilId === ro.oilId)) {
          allergenicOils.push(ro);
          crossReactivityInfo.push('Asteraceae family cross-reactivity');
        }
      }
    }
    
    // Check for conifer/pine family
    if (lowerAllergy.includes('pine') || lowerAllergy.includes('conifer')) {
      const coniferOils = oils.filter(o => 
        ['pine', 'fir', 'spruce', 'cedarwood', 'cypress', 'juniper'].includes(o.oilId)
      );
      for (const co of coniferOils) {
        if (!allergenicOils.find(ao => ao.oilId === co.oilId)) {
          allergenicOils.push(co);
        }
      }
    }

    if (allergenicOils.length > 0) {
      // Build detailed explanation with cross-reactivity info
      let detailedExp = `You have indicated a known allergy to ${allergy}. The following oils in your blend may contain this allergen or cross-reactive compounds: ${allergenicOils.map(o => o.name).join(', ')}. `;
      
      if (crossReactivityInfo.length > 0) {
        const uniqueCrossReactivity = [...new Set(crossReactivityInfo)];
        detailedExp += `Cross-reactivity detected with: ${uniqueCrossReactivity.join(', ')}. `;
      }
      
      detailedExp += `Essential oil allergies can cause skin reactions (dermatitis, hives), respiratory distress (wheezing, anaphylaxis), or systemic reactions. `;
      
      if (allergenType === 'component') {
        detailedExp += `This is a component allergy - you may react to any oil containing ${allergy}.`;
      } else if (allergenType === 'botanical') {
        detailedExp += `This is a botanical family allergy - cross-reactivity within the ${allergy} family is common.`;
      }
      
      const uniqueCrossReactivity = [...new Set(crossReactivityInfo)];
      
      warnings.push({
        id: `allergy-${allergy.toLowerCase().replace(/\s+/g, '-')}`,
        riskLevel: 'high',
        category: 'allergy',
        title: `Known Allergy: ${allergy}`,
        message: `You indicated an allergy to ${allergy}. ${allergenicOils.map(o => o.name).join(', ')} may trigger a reaction.${crossReactivityInfo.length > 0 ? ` Cross-reactivity: ${uniqueCrossReactivity.slice(0, 2).join(', ')}${uniqueCrossReactivity.length > 2 ? '...' : ''}.` : ''}`,
        messageIntermediate: `Allergy alert: ${allergy} (${allergenType}) - ${allergenicOils.map(o => o.name).join('/')}.${crossReactivityInfo.length > 0 ? ` Cross-reacts with: ${uniqueCrossReactivity[0]}.` : ''}`,
        messageAdvanced: `Known ${allergenType} allergy: ${allergy}. Oils: ${allergenicOils.map(o => o.name).join('/')}.${crossReactivityInfo.length > 0 ? ` Cross-reactivity detected.` : ''}`,
        messageProfessional: `Patient-reported ${allergenType} allergy: ${allergy}. Affected: ${allergenicOils.map(o => o.oilId).join('/')}.`,
        detailedExplanation: detailedExp,
        affectedOils: allergenicOils.map(o => o.oilId),
        recommendation: crossReactivityInfo.length > 0 
          ? `AVOID these oils due to cross-reactivity. Consider patch testing with a qualified allergist/aromatherapist.`
          : 'Avoid these oils if you have experienced reactions to them before. Consider patch testing with a qualified aromatherapist.',
        alternatives: ['hypoallergenic-alternatives', 'consult-allergist'],
        requiresAcknowledgment: true,
        acknowledgmentText: `I understand I have a known allergy to ${allergy}${crossReactivityInfo.length > 0 ? ' with cross-reactivity risks' : ''} and accept the risk of using these oils.`,
      });
    }
  }

  return warnings;
}

/**
 * Check trying to conceive warnings
 */
function checkTryingToConceiveWarnings(
  oils: OilComponent[],
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  
  // Oils that may affect hormones/fertility
  const hormoneOils = oils.filter(o => 
    ['clary-sage', 'fennel', 'aniseed', 'sage', 'juniper-berry'].includes(o.oilId)
  );

  if (hormoneOils.length > 0) {
    warnings.push({
      id: 'ttc-hormone',
      riskLevel: 'moderate',
      category: 'pregnancy',
      title: 'Trying to Conceive: Hormone-Affecting Oils',
      message: `${hormoneOils.map(o => o.name).join(', ')} may affect hormone balance while trying to conceive.`,
      messageIntermediate: `Hormone-modulating oils (${hormoneOils.map(o => o.name).join('/')}) during conception attempts.`,
      messageAdvanced: `Phytoestrogenic/abortifacient oils while TTC: ${hormoneOils.map(o => o.name).join('/')}.`,
      messageProfessional: `TTC patient using emmenagogue/phytoestrogenic oils: ${hormoneOils.map(o => o.name).join('/')}.`,
      detailedExplanation: `These oils have documented effects on hormonal balance or uterine activity. While evidence is limited, theoretical concerns exist about affecting fertility or early pregnancy. Most cautious approach is to avoid these oils while actively trying to conceive, especially in the two-week wait.`,
      affectedOils: hormoneOils.map(o => o.oilId),
      recommendation: 'Consider avoiding these oils during conception attempts. Use safer alternatives like lavender, frankincense, or mandarin.',
      alternatives: ['lavender', 'frankincense', 'mandarin', 'neroli'],
      requiresAcknowledgment: false,
    });
  }

  return warnings;
}

/**
 * Check lactation warnings
 */
function checkLactationWarnings(
  oils: OilComponent[],
  route: RouteOfUse,
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  
  // Sage can reduce milk supply
  const sageOils = oils.filter(o => o.oilId === 'sage');
  if (sageOils.length > 0) {
    warnings.push({
      id: 'lact-sage',
      riskLevel: 'moderate',
      category: 'lactation',
      title: 'Lactation: Sage May Reduce Milk Supply',
      message: 'Sage (Salvia officinalis) has been traditionally used to reduce milk supply when weaning.',
      detailedExplanation: 'Common sage contains compounds that can reduce lactation. While culinary amounts are generally fine, concentrated essential oil use may affect milk supply, especially with frequent use.',
      affectedOils: ['sage'],
      recommendation: 'If maintaining milk supply is important, consider avoiding sage oil or using sparingly.',
      alternatives: ['clary-sage'],
      requiresAcknowledgment: false,
    });
  }

  return warnings;
}

/**
 * Check age guidance - TOPICAL ONLY, never blocks
 */
function checkAgeGuidance(
  oils: OilComponent[], 
  profile: UserSafetyProfile,
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  // Only provide guidance for infants and young children (topical)
  if (profile.ageGroup === 'infant_0_3mo' || profile.ageGroup === 'infant_3_6mo') {
    warnings.push({
      id: 'age-infant',
      riskLevel: 'moderate',
      category: 'age',
      routeSpecific: ['topical'],
      title: 'Infant Use Guidance',
      message: 'For infants under 6 months, essential oils should be used with extra caution on skin.',
      messageIntermediate: `Infant skin <6mo: Extra caution with essential oils (thinner skin, immature metabolism).`,
      messageAdvanced: `Age <6mo: High dermal permeability, hepatic immaturity. Use hydrosols or max 0.25%.`,
      messageProfessional: `Neonatal/pediatric: Reduced barrier function, CYP immaturity. Recommend hydrosols or 0.1-0.25% max.`,
      detailedExplanation: `Infant skin is thinner and more permeable, and their livers are less able to metabolize essential oil compounds. For babies under 6 months, consider hydrosols (flower waters) instead of essential oils for topical use. If using essential oils, proper dilution (0.1-0.25%) is critical.`,
      affectedOils: oils.map(o => o.oilId),
      recommendation: 'For topical use: Maximum 0.25% dilution (1 drop per 20ml carrier). For diffusion: Use sparingly, ensure good ventilation.',
      alternatives: ['hydrosols-preferred-for-topical'],
      requiresAcknowledgment: false,
    });
  }

  return warnings;
}

/**
 * Check toxicity warnings
 */
function checkToxicityWarnings(
  oils: OilComponent[],
  route: RouteOfUse,
  experience: ExperienceLevel
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  // Skip toxicity warnings for professionals (they know)
  if (experience === 'professional') return warnings;

  // Neurotoxicity warning
  const neurotoxicOils = oils.filter(o => 
    ['hyssop', 'sage', 'camphor', 'wormwood'].includes(o.oilId)
  );

  if (neurotoxicOils.length > 0) {
    warnings.push({
      id: 'tox-neuro',
      riskLevel: 'high',
      category: 'toxicity',
      title: 'Neurotoxic Oils: Use with Care',
      message: `${neurotoxicOils.map(o => o.name).join(', ')} contain compounds that can be neurotoxic at high doses.`,
      messageIntermediate: `Neurotoxic compounds in ${neurotoxicOils.map(o => o.name).join('/')} - use low concentrations.`,
      messageAdvanced: `Thujone/camphor/pinocamphone content in ${neurotoxicOils.map(o => o.name).join('/')}.`,
      detailedExplanation: `These oils contain thujone, pinocamphone, or camphor—compounds that can cause seizures, hallucinations, or neurological symptoms at high doses. However, at typical aromatherapy concentrations (1-5% topical, diffusion), they are generally well-tolerated by healthy adults. Risk increases with: high concentration, large surface area application, prolonged use, or ingestion.`,
      affectedOils: neurotoxicOils.map(o => o.oilId),
      recommendation: 'Use at low concentrations (1-2%). Never ingest. Avoid if you have epilepsy or seizure history.',
      requiresAcknowledgment: false,
    });
  }

  return warnings;
}

/**
 * Check phototoxicity - TOPICAL ONLY
 */
function checkPhototoxicityWarnings(oils: OilComponent[]): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  const phototoxicOils = oils.filter(o => 
    ['bergamot', 'lime', 'lemon', 'grapefruit'].includes(o.oilId)
  );

  if (phototoxicOils.length > 0) {
    warnings.push({
      id: 'photo-toxic',
      riskLevel: 'moderate',
      category: 'route',
      routeSpecific: ['topical'],
      title: 'Photosensitivity Warning (Topical Use)',
      message: `${phototoxicOils.map(o => o.name).join(', ')} can cause severe sunburn when applied to skin before sun exposure.`,
      detailedExplanation: `These citrus oils contain furocoumarins (especially bergapten) that react with UV light to cause phototoxic reactions—essentially a chemical sunburn. This only applies to TOPICAL application, not inhalation or diffusion. Reactions can be severe and long-lasting.`,
      affectedOils: phototoxicOils.map(o => o.oilId),
      recommendation: 'Apply only to covered skin, OR wait 12-18 hours before sun exposure, OR use bergapten-free (FCF) varieties.',
      alternatives: ['bergamot-fcf', 'sweet-orange', 'mandarin'],
      requiresAcknowledgment: false,
    });
  }

  return warnings;
}

/**
 * Check base oil warnings - intrinsic properties of oils
 * This ensures educational warnings about oil properties always appear
 */
function checkBaseOilWarnings(
  oils: OilComponent[],
  route: RouteOfUse,
  userProfile: UserSafetyProfile
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  const experience = userProfile.experienceLevel;

  for (const oil of oils) {
    // Clove Bud - Blood thinning (CRITICAL for topical)
    if (oil.oilId === 'clove-bud') {
      const isTopical = route === 'topical' || route === 'all-routes';
      warnings.push({
        id: `base-clove-${oil.oilId}`,
        riskLevel: 'critical',
        category: 'toxicity',
        routeSpecific: isTopical ? ['topical'] : undefined,
        title: 'Clove Bud: High Eugenol Content',
        message: experience === 'beginner' 
          ? `Clove bud oil contains 80-90% eugenol, a potent natural anticoagulant (blood thinner). ${isTopical ? 'Applied to skin, it can significantly increase bleeding risk.' : ''}`
          : `Clove: ${isTopical ? '80-90% eugenol - significant anticoagulant effect topical' : 'High eugenol content'}`,
        messageIntermediate: `Clove bud: 80-90% eugenol - potent anticoagulant${isTopical ? ' (topical concern)' : ''}`,
        messageAdvanced: `Clove: High eugenol = antiplatelet effect${isTopical ? ', topical bleeding risk' : ''}`,
        messageProfessional: `Clove: 80-90% eugenol, CYP2C9 inhibitor, antiplatelet`,
        detailedExplanation: 'Clove bud essential oil contains extremely high concentrations of eugenol (80-90%), a phenylpropanoid with potent antiplatelet and anticoagulant properties. When applied topically, eugenol is absorbed through the skin and can inhibit platelet aggregation, increasing bleeding risk. This is particularly dangerous for individuals taking anticoagulant medications (Warfarin, DOACs), those with bleeding disorders, or before surgical procedures. Inhalation carries minimal systemic absorption and significantly lower risk.',
        affectedOils: [oil.oilId],
        recommendation: isTopical 
          ? 'Avoid topical use if on blood thinners or before surgery. For inhalation: Generally safe at normal dilutions.' 
          : 'For inhalation/diffusion: Use standard dilutions. Monitor if on anticoagulants.',
        requiresAcknowledgment: experience === 'beginner' || experience === 'intermediate',
        acknowledgmentText: 'I understand clove oil is a potent natural blood thinner and accept responsibility for its use.',
        alternatives: ['cinnamon-leaf', 'ginger'],
      });
    }

    // Wintergreen/Birch - Methyl Salicylate (CRITICAL)
    if (oil.oilId === 'wintergreen' || oil.oilId === 'birch') {
      const isTopical = route === 'topical' || route === 'all-routes';
      warnings.push({
        id: `base-wintergreen-${oil.oilId}`,
        riskLevel: 'critical',
        category: 'toxicity',
        routeSpecific: isTopical ? ['topical'] : undefined,
        title: `${oil.name}: Natural Aspirin (Methyl Salicylate)`,
        message: experience === 'beginner'
          ? `${oil.name} contains nearly pure methyl salicylate - natural aspirin. Can cause severe bleeding, Reye's syndrome in children, and is toxic in high doses.`
          : `${oil.name}: 95%+ methyl salicylate - natural aspirin${isTopical ? ', bleeding risk' : ''}`,
        messageIntermediate: `${oil.name}: 95%+ methyl salicylate - salicylate toxicity risk`,
        messageAdvanced: `${oil.name}: Methyl salicylate = aspirin-like effects, CNS toxicity possible`,
        messageProfessional: `${oil.name}: 95%+ methyl salicylate, antiplatelet, neurotoxic high dose`,
        detailedExplanation: `Wintergreen and birch oils contain 95-99% methyl salicylate, a compound chemically similar to aspirin (acetylsalicylic acid). When applied topically, it is absorbed through skin and metabolized to salicylic acid, producing antiplatelet effects. DANGERS: (1) Severe bleeding risk with anticoagulants, (2) Reye's syndrome in children/teenagers, (3) Salicylate toxicity with overuse (tinnitus, nausea, hyperventilation, seizures), (4) Cross-allergy with aspirin. Topical use is the primary concern; inhalation has minimal systemic absorption.`,
        affectedOils: [oil.oilId],
        recommendation: `NEVER use on children under 12. Avoid if taking blood thinners, before surgery, or with aspirin allergy. Max 2% dilution for adults.`,
        requiresAcknowledgment: true,
        acknowledgmentText: `I understand ${oil.name} contains aspirin-like compounds. I am over 12, not on blood thinners, and have no aspirin allergy.`,
        alternatives: ['peppermint', 'eucalyptus'],
      });
    }

    // Hyssop - Neurotoxic (CRITICAL)
    if (oil.oilId === 'hyssop') {
      warnings.push({
        id: `base-hyssop-${oil.oilId}`,
        riskLevel: 'critical',
        category: 'toxicity',
        title: 'Hyssop: Neurotoxic (Pinocamphone)',
        message: experience === 'beginner'
          ? 'Hyssop oil contains pinocamphone, a neurotoxin that can trigger seizures even in people without epilepsy. Several documented seizure cases exist.'
          : 'Hyssop: Pinocamphone neurotoxin - seizure risk',
        messageIntermediate: 'Hyssop: Pinocamphone content = neurotoxicity, seizure threshold lowered',
        messageAdvanced: 'Hyssop: Pinocamphone neurotoxin, documented seizure cases',
        messageProfessional: 'Hyssop: Pinocamphone neurotoxic, contraindicated seizure disorder',
        detailedExplanation: 'Hyssop (Hyssopus officinalis) essential oil contains significant amounts of pinocamphone and isopinocamphone (ketones), which are neurotoxic compounds. These compounds can lower seizure threshold and trigger convulsions. Documented adverse effects include seizures in both epileptic and non-epileptic individuals. The oil also contains thujone (absinthe-like compound). CONTRAINDICATIONS: Epilepsy, seizure disorders, pregnancy (emmenagogue), children, fever conditions.',
        affectedOils: [oil.oilId],
        recommendation: 'AVOID if you have epilepsy, are pregnant, or for children. Use only at very low concentrations (under 1%) if at all.',
        requiresAcknowledgment: true,
        acknowledgmentText: 'I understand hyssop is neurotoxic and can cause seizures. I do not have epilepsy or seizures, and I am not pregnant.',
        alternatives: ['lavender', 'frankincense'],
      });
    }

    // Sage/Dalmatian - Thujone content (HIGH)
    if (oil.oilId === 'sage' || oil.oilId === 'dalmatian-sage') {
      warnings.push({
        id: `base-sage-${oil.oilId}`,
        riskLevel: experience === 'beginner' ? 'critical' : 'high',
        category: 'toxicity',
        title: 'Sage (Dalmatian): Thujone Content',
        message: experience === 'beginner'
          ? 'Dalmatian sage contains thujone, the same neurotoxin found in absinthe. Can trigger seizures and is toxic to the nervous system.'
          : 'Sage: High thujone content - neurotoxic, seizure risk',
        messageIntermediate: 'Sage: 20-50% thujone (ketone), neurotoxic, avoid epilepsy/pregnancy',
        messageAdvanced: 'Sage: Thujone ketone neurotoxicity, emmenagogue, CYP450 effects',
        messageProfessional: 'Sage: 20-50% α/β-thujone, neurotoxic ketone, seizure contraindication',
        detailedExplanation: 'Dalmatian sage (Salvia officinalis) essential oil contains 20-50% thujone (alpha and beta), a monoterpene ketone responsible for the toxicity of absinthe. Thujone is neurotoxic and can cause seizures, especially at higher doses. It is also an emmenagogue (stimulates menstruation) and should be avoided during pregnancy. Clary sage is chemically distinct and much safer.',
        affectedOils: [oil.oilId],
        recommendation: 'Avoid during pregnancy, with epilepsy, or for children. Use Clary Sage as a safer alternative.',
        requiresAcknowledgment: experience === 'beginner',
        acknowledgmentText: 'I understand Dalmatian sage contains thujone and accept the risks.',
        alternatives: ['clary-sage', 'rosemary'],
      });
    }

    // Cinnamon Bark - High cinnamaldehyde (HIGH)
    if (oil.oilId === 'cinnamon-bark') {
      warnings.push({
        id: `base-cinnamon-bark-${oil.oilId}`,
        riskLevel: 'high',
        category: 'toxicity',
        title: 'Cinnamon Bark: Extreme Skin Irritant',
        message: experience === 'beginner'
          ? 'Cinnamon bark oil is one of the most irritating essential oils. Contains 60-80% cinnamaldehyde which can cause chemical burns even at low dilutions.'
          : 'Cinnamon bark: 60-80% cinnamaldehyde - severe dermal irritant',
        messageIntermediate: 'Cinnamon bark: High cinnamaldehyde = extreme dermal toxicity, avoid topical',
        messageAdvanced: 'Cinnamon bark: 60-80% cinnamaldehyde, aldehyde hypersensitivity, mucous membrane irritant',
        messageProfessional: 'Cinnamon bark: 60-80% (E)-cinnamaldehyde, dermal sensitizer, max 0.05%',
        detailedExplanation: 'Cinnamon bark oil contains 60-80% (E)-cinnamaldehyde, an aldehyde that is extremely irritating to skin and mucous membranes. It is one of the most dermally toxic essential oils, capable of causing chemical burns, blistering, and severe sensitization even at concentrations as low as 0.05%. The bark oil is significantly more irritating than cinnamon leaf oil (which is eugenol-based). IFRA restricts cinnamon bark to 0.4% in consumer products.',
        affectedOils: [oil.oilId],
        recommendation: 'NEVER use undiluted on skin. Maximum 0.05% for topical use (1 drop in 30ml carrier). Consider cinnamon leaf as a milder alternative.',
        requiresAcknowledgment: experience === 'beginner' || experience === 'intermediate',
        acknowledgmentText: 'I understand cinnamon bark is extremely irritating to skin and will use at very low dilution only.',
        alternatives: ['cinnamon-leaf', 'ginger'],
      });
    }

    // Oregano/Thyme - High phenols (HIGH)
    if (oil.oilId === 'oregano' || oil.oilId === 'thyme' || oil.oilId === 'thyme-ct-thymol') {
      warnings.push({
        id: `base-phenol-${oil.oilId}`,
        riskLevel: 'high',
        category: 'toxicity',
        title: `${oil.name}: High Phenol Content`,
        message: experience === 'beginner'
          ? `${oil.name} contains high levels of phenols (carvacrol/thymol) which are aggressive antimicrobials but severely irritating to skin and mucous membranes.`
          : `${oil.name}: High phenol content - aggressive antimicrobial, hepatotoxic, mucous membrane irritant`,
        messageIntermediate: `${oil.name}: Phenolic compounds = strong antimicrobial but hepatotoxic, dermal/mucous irritant`,
        messageAdvanced: `${oil.name}: Carvacrol/thymol phenols, aggressive antimicrobial, limit duration`,
        messageProfessional: `${oil.name}: Phenol-rich, hepatotoxic concern, short-term use only`,
        detailedExplanation: 'Oregano (70%+ carvacrol) and thyme (40%+ thymol) are extremely high in phenolic compounds. While these make them powerful antimicrobials, they are also hepatotoxic (liver toxic) with prolonged use and severe irritants to skin, mucous membranes, and the respiratory tract. Phenols can cause burning sensations, redness, and blistering. Should never be used undiluted and should be limited to short-term use only.',
        affectedOils: [oil.oilId],
        recommendation: 'Use only at very low concentrations (under 1%). Avoid prolonged use. Never use near eyes or mucous membranes.',
        requiresAcknowledgment: experience === 'beginner',
        acknowledgmentText: `I understand ${oil.name} contains irritating phenols and will use cautiously.`,
        alternatives: ['tea-tree', 'lavender'],
      });
    }

    // Lemon Myrtle/May Chang - High citral (HIGH)
    if (oil.oilId === 'lemon-myrtle' || oil.oilId === 'may-chang') {
      const citralContent = oil.oilId === 'lemon-myrtle' ? '90-98%' : '70-85%';
      warnings.push({
        id: `base-citral-${oil.oilId}`,
        riskLevel: 'high',
        category: 'toxicity',
        title: `${oil.name}: Extreme Citral Content`,
        message: experience === 'beginner'
          ? `${oil.name} contains ${citralContent} citral - the highest of any essential oil. Severe skin sensitization risk. IFRA restricts to 0.7%.`
          : `${oil.name}: ${citralContent} citral - severe sensitizer, IFRA 0.7% limit`,
        messageIntermediate: `${oil.name}: ${citralContent} citral = severe sensitization, restrict to 0.7%`,
        messageAdvanced: `${oil.name}: High citral = sensitization, phototoxic potential, embryo-fetal toxicity`,
        messageProfessional: `${oil.name}: ${citralContent} citral, IFRA 0.7%, sensitizer, avoid pregnancy`,
        detailedExplanation: `${oil.name} contains ${citralContent} citral (geranial + neral), the highest concentration of any commercial essential oil. Citral is a known skin sensitizer and can cause severe allergic reactions with repeated exposure. IFRA restricts citral-containing products to 0.7% for leave-on skin products. Also has embryotoxic potential - avoid during pregnancy.`,
        affectedOils: [oil.oilId],
        recommendation: 'Maximum 0.7% dilution for topical use. Avoid during pregnancy. Do not combine with other high-citral oils (lemongrass, lemon myrtle, may chang together).',
        requiresAcknowledgment: experience === 'beginner' || experience === 'intermediate',
        acknowledgmentText: `I understand ${oil.name} has extreme citral content and will follow IFRA guidelines.`,
        alternatives: ['lemon', 'bergamot-fcf'],
      });
    }

    // Lemongrass - Moderate citral (MODERATE)
    if (oil.oilId === 'lemongrass') {
      warnings.push({
        id: `base-lemongrass-${oil.oilId}`,
        riskLevel: 'moderate',
        category: 'toxicity',
        title: 'Lemongrass: High Citral Content',
        message: experience === 'beginner'
          ? 'Lemongrass contains 75-85% citral. Can cause skin sensitization with repeated use. IFRA restricts to 0.8%.'
          : 'Lemongrass: 75-85% citral - moderate sensitizer',
        messageIntermediate: 'Lemongrass: 75-85% citral, IFRA 0.8% restriction, sensitization possible',
        messageAdvanced: 'Lemongrass: Citral content requires dilution attention',
        messageProfessional: 'Lemongrass: 75-85% citral, IFRA 0.8%, sensitizer',
        detailedExplanation: 'Lemongrass contains 75-85% citral, making it a moderate to high risk for skin sensitization with repeated exposure. IFRA restricts to 0.8% for leave-on products. While not as extreme as lemon myrtle (90%+), it should still be used at proper dilution and not combined with other high-citral oils.',
        affectedOils: [oil.oilId],
        recommendation: 'Use at 0.8% or less for topical use. Avoid combining with other citral-rich oils.',
        requiresAcknowledgment: false,
        alternatives: ['may-chang', 'lemon'],
      });
    }

    // Eucalyptus - 1,8-cineole respiratory caution (MODERATE)
    if (oil.oilId === 'eucalyptus' || oil.oilId === 'eucalyptus-radiata' || oil.oilId === 'eucalyptus-globulus') {
      warnings.push({
        id: `base-eucalyptus-${oil.oilId}`,
        riskLevel: 'moderate',
        category: 'toxicity',
        title: 'Eucalyptus: 1,8-Cineole Content',
        message: experience === 'beginner'
          ? 'Eucalyptus contains 1,8-cineole which can slow breathing in high doses. Never use near infants\' faces.'
          : 'Eucalyptus: 1,8-cineole - respiratory caution, avoid infants',
        messageIntermediate: 'Eucalyptus: 1,8-cineole can slow respiration, contraindicated young children',
        messageAdvanced: 'Eucalyptus: Cineole content = respiratory depression risk infants',
        messageProfessional: 'Eucalyptus: 1,8-cineole 65-85%, respiratory depression infants, mucous irritant',
        detailedExplanation: 'Eucalyptus oils contain 65-85% 1,8-cineole (eucalyptol), a compound that can slow respiration and cause breathing difficulties, especially in young children. The oil should never be applied near the nose/face of infants or young children. Also an irritant to mucous membranes.',
        affectedOils: [oil.oilId],
        recommendation: 'Never use near infants\' faces. Use with caution around young children. Avoid contact with eyes and mucous membranes.',
        requiresAcknowledgment: experience === 'beginner',
        acknowledgmentText: 'I understand eucalyptus requires caution around children and will use safely.',
        alternatives: ['tea-tree', 'rosemary'],
      });
    }

    // Peppermint - Menthol cooling/burning (MODERATE)
    if (oil.oilId === 'peppermint') {
      warnings.push({
        id: `base-peppermint-${oil.oilId}`,
        riskLevel: 'moderate',
        category: 'toxicity',
        title: 'Peppermint: High Menthol Content',
        message: experience === 'beginner'
          ? 'Peppermint contains 30-50% menthol which creates intense cooling/burning sensations. Can irritate sensitive skin.'
          : 'Peppermint: 30-50% menthol - intense sensation, mucous membrane irritant',
        messageIntermediate: 'Peppermint: High menthol = cooling/burning, avoid eyes/mucous membranes',
        messageAdvanced: 'Peppermint: Menthol content, potential respiratory caution infants',
        messageProfessional: 'Peppermint: 30-50% menthol, trigeminal stimulation, mucous irritant',
        detailedExplanation: 'Peppermint oil contains 30-50% menthol, a compound that activates cold-sensitive TRPM8 receptors, creating intense cooling sensations that can feel like burning at higher concentrations. Can irritate eyes, mucous membranes, and sensitive skin. Should not be used near faces of infants/young children due to potential breathing reflex inhibition.',
        affectedOils: [oil.oilId],
        recommendation: 'Use at 1-2% maximum for topical use. Avoid contact with eyes and mucous membranes. Do not use near infants\' faces.',
        requiresAcknowledgment: false,
        alternatives: ['spearmint', 'eucalyptus'],
      });
    }

    // Tea Tree - Hormone modulation concern (LOW for beginners)
    if (oil.oilId === 'tea-tree' && experience === 'beginner') {
      warnings.push({
        id: `base-teatree-${oil.oilId}`,
        riskLevel: 'low',
        category: 'toxicity',
        title: 'Tea Tree: Hormone Considerations',
        message: 'Tea tree has very weak hormone-modulating properties. Safe for most users but those with hormone-sensitive conditions should note this.',
        messageIntermediate: 'Tea tree: Weak phytoestrogenic activity, generally safe',
        messageAdvanced: 'Tea tree: Terpinen-4-ol antimicrobial, weak endocrine effect',
        messageProfessional: 'Tea tree: Terpinen-4-ol 30-40%, antimicrobial, minimal endocrine concern',
        detailedExplanation: 'Tea tree oil contains terpinen-4-ol (primary antimicrobial) along with trace compounds with very weak phytoestrogenic activity. While generally recognized as safe, some studies suggest potential endocrine-disrupting effects at very high doses. Those with hormone-sensitive conditions (breast cancer, endometriosis) may wish to avoid prolonged use as a precaution.',
        affectedOils: [oil.oilId],
        recommendation: 'Generally safe for most users. Those with hormone-sensitive conditions should consult healthcare provider for prolonged use.',
        requiresAcknowledgment: false,
        alternatives: ['lavender', 'eucalyptus'],
      });
    }

    // Myrrh - Feto-toxic (HIGH for pregnancy)
    if (oil.oilId === 'myrrh' && (userProfile.isPregnant || userProfile.isTryingToConceive)) {
      warnings.push({
        id: `base-myrrh-preg-${oil.oilId}`,
        riskLevel: 'critical',
        category: 'pregnancy',
        title: 'Myrrh: Feto-toxic - Pregnancy Avoid',
        message: 'Myrrh is traditionally used as an emmenagogue and is considered feto-toxic. Avoid during pregnancy and when trying to conceive.',
        messageIntermediate: 'Myrrh: Feto-toxic, emmenagogue, avoid pregnancy',
        messageAdvanced: 'Myrrh: Furanodiene content, feto-toxic, embryotoxic potential',
        messageProfessional: 'Myrrh: Feto-toxic, emmenagogue, pregnancy contraindication',
        detailedExplanation: 'Myrrh (Commiphora myrrha) has been used historically as an emmenagogue (menstruation-inducing substance). It contains furanodiene and other compounds that are potentially feto-toxic. Traditional use and some animal studies suggest embryotoxic potential. Should be avoided during pregnancy and when trying to conceive.',
        affectedOils: [oil.oilId],
        recommendation: 'AVOID during pregnancy and when trying to conceive. Safe for non-pregnant adults.',
        requiresAcknowledgment: true,
        acknowledgmentText: 'I am not pregnant and not trying to conceive, or I accept full responsibility.',
        alternatives: ['frankincense', 'cedarwood'],
      });
    }

    // Juniper Berry - Emmenagogue (HIGH for pregnancy)
    if (oil.oilId === 'juniper-berry' && (userProfile.isPregnant || userProfile.isTryingToConceive)) {
      warnings.push({
        id: `base-juniper-preg-${oil.oilId}`,
        riskLevel: 'critical',
        category: 'pregnancy',
        title: 'Juniper Berry: Emmenagogue - Pregnancy Avoid',
        message: 'Juniper berry is an emmenagogue that stimulates uterine contractions. Avoid during pregnancy.',
        messageIntermediate: 'Juniper: Emmenagogue, uterine stimulant, avoid pregnancy',
        messageAdvanced: 'Juniper: Abortifacient potential, stimulates uterine smooth muscle',
        messageProfessional: 'Juniper: Emmenagogue/abortifacient, pregnancy contraindication',
        detailedExplanation: 'Juniper berry oil is classified as an emmenagogue and has uterine-stimulating properties. It can increase uterine muscle tone and potentially trigger contractions. While juniper berry is distinct from juniper tar (which contains known toxins), it should still be avoided during pregnancy due to its traditional use as an abortifacient.',
        affectedOils: [oil.oilId],
        recommendation: 'AVOID during pregnancy and when trying to conceive.',
        requiresAcknowledgment: true,
        acknowledgmentText: 'I am not pregnant and understand juniper is contraindicated in pregnancy.',
        alternatives: ['lemon', 'grapefruit'],
      });
    }
  }

  return warnings;
}

/**
 * Calculate safety score (informational)
 */
function calculateSafetyScore(warnings: SafetyWarning[]): number {
  let score = 100;
  
  warnings.forEach(w => {
    switch (w.riskLevel) {
      case 'critical': score -= 15; break;
      case 'high': score -= 10; break;
      case 'moderate': score -= 5; break;
      case 'low': score -= 2; break;
      case 'info': score -= 0; break;
    }
  });

  return Math.max(0, score);
}

// ============================================================================
// PRODUCT PAGE WARNINGS
// ============================================================================

/**
 * Get warnings for a single oil (for product/community pages)
 */
export function getOilWarnings(
  oilId: string,
  userProfile?: UserSafetyProfile
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  const oilName = getOilName(oilId);

  // Critical interactions that apply to everyone (educational)
  if (oilId === 'clove-bud') {
    warnings.push({
      id: 'oil-clove-blood',
      riskLevel: 'critical',
      category: 'medication',
      routeSpecific: ['topical'],
      title: 'Blood Thinning Risk (Topical)',
      message: 'Clove bud oil contains high levels of eugenol, a potent anticoagulant.',
      detailedExplanation: 'When applied to skin, clove oil can inhibit platelet function and increase bleeding risk. This is especially dangerous for people taking blood thinners (Warfarin, Eliquis, Xarelto, aspirin) or with bleeding disorders. Risk is minimal for inhalation/diffusion.',
      affectedOils: [oilId],
      recommendation: 'If taking blood thinners: Avoid topical use. For inhalation: Generally safe.',
      requiresAcknowledgment: true,
      acknowledgmentText: 'I do not take blood thinning medications and have no bleeding disorders, or I accept this risk.',
    });
  }

  if (oilId === 'wintergreen' || oilId === 'birch') {
    warnings.push({
      id: 'oil-wintergreen-blood',
      riskLevel: 'critical',
      category: 'medication',
      routeSpecific: ['topical'],
      title: 'Natural Aspirin - Bleeding Risk (Topical)',
      message: `${oilName} contains methyl salicylate (natural aspirin) and affects blood clotting.`,
      detailedExplanation: 'Methyl salicylate is absorbed through skin and has antiplatelet effects similar to aspirin. Dangerous when combined with blood thinners, before surgery, or in people with bleeding disorders. Can also cause Reye\'s syndrome in children. Topical use only risk.',
      affectedOils: [oilId],
      recommendation: 'Avoid if taking blood thinners, before surgery, or if under 12 years old.',
      requiresAcknowledgment: true,
      acknowledgmentText: 'I understand this oil contains aspirin-like compounds. I do not take blood thinners and am over 12 years old.',
    });
  }

  if (oilId === 'hyssop') {
    warnings.push({
      id: 'oil-hyssop-neuro',
      riskLevel: 'critical',
      category: 'toxicity',
      title: 'What is Hyssop? Important Safety Information',
      message: 'Hyssop (Hyssopus officinalis) contains pinocamphone, a potent neurotoxin.',
      detailedExplanation: 'Hyssop is an herb native to the Mediterranean. Its essential oil contains high levels of pinocamphone and related compounds that are neurotoxic and can trigger seizures, even in people without epilepsy. Several cases of seizures have been documented from hyssop oil use. This oil requires extreme caution and should be avoided by anyone with seizure disorders, during pregnancy, and in children.',
      affectedOils: [oilId],
      recommendation: 'Use only at very low concentrations (under 1%). Avoid if you have epilepsy, are pregnant, or for children.',
      requiresAcknowledgment: true,
      acknowledgmentText: 'I understand hyssop contains neurotoxic compounds. I do not have epilepsy or seizures, and I am not pregnant.',
    });
  }

  // Check user-specific warnings if profile provided
  if (userProfile) {
    const mixWarnings = validateMixSafety(
      [{ oilId, name: oilName, ml: 1, drops: 1 }],
      userProfile,
      'all-routes'
    );
    warnings.push(...mixWarnings.warnings);
  }

  return warnings;
}

// Helper
function getOilName(oilId: string): string {
  const names: Record<string, string> = {
    'lavender': 'Lavender',
    'tea-tree': 'Tea Tree',
    'eucalyptus': 'Eucalyptus',
    'peppermint': 'Peppermint',
    'clove-bud': 'Clove Bud',
    'wintergreen': 'Wintergreen',
    'hyssop': 'Hyssop',
    'sage': 'Sage (Dalmatian)',
    'rosemary': 'Rosemary',
  };
  return names[oilId] || oilId;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  searchMedications,
  COMMON_MEDICATIONS,
  HEALTH_CONDITIONS,
  AGE_DOSAGE_LIMITS,
};
