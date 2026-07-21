/**
 * Oil Amor Safety Validation Engine
 * Permissive safety checking - warns but doesn't block unnecessarily
 */

import { 
  MixValidationRequest, 
  MixValidationResult, 
  BlockedCombination, 
  SafetyWarning,
} from './types'
import { 
  getOilSafetyProfile, 
  getIncompatiblePairs,
  getPhototoxicStackingRisk,
} from './database'

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Exceeding an oil's profile maxDilutionPercent by more than this factor is
 * treated as dangerous and blocks the mix; smaller exceedances produce the
 * strongest advisory warning instead.
 */
const MAX_DILUTION_EXCEEDANCE_FACTOR = 10


export function validateOilMix(request: MixValidationRequest): MixValidationResult {
  const { oils, userProfile, totalVolumeMl, mode, intendedUse } = request
  
  // Initialize result structure
  const blockedCombinations: BlockedCombination[] = []
  const warnings: SafetyWarning[] = []
  const cautions: SafetyWarning[] = []
  const info: SafetyWarning[] = []
  
  // ==========================================================================
  // STEP 0: Normalize oils to have both drops and ml
  // ==========================================================================
  
  const normalizedOils = oils.map(o => {
    if (o.ml !== undefined) {
      return { 
        oilId: o.oilId, 
        drops: Math.round(o.ml * 20),
        ml: o.ml,
        lotNumber: o.lotNumber
      }
    }
    return {
      oilId: o.oilId,
      drops: o.drops || 0,
      ml: (o.drops || 0) / 20,
      lotNumber: o.lotNumber
    }
  })
  
  // ==========================================================================
  // STEP 1: Basic Calculations
  // ==========================================================================
  
  const totalDrops = normalizedOils.reduce((sum, o) => sum + o.drops, 0)
  const totalEssentialMl = normalizedOils.reduce((sum, o) => sum + o.ml, 0)
  const dilutionPercent = (totalEssentialMl / totalVolumeMl) * 100
  
  // Calculate active constituents
  const activeConstituentLevels: Record<string, number> = {}
  normalizedOils.forEach(({ oilId, drops }) => {
    const profile = getOilSafetyProfile(oilId)
    if (profile) {
      profile.keyConstituents.forEach(constituent => {
        const avgPercent = (constituent.percentageRange[0] + constituent.percentageRange[1]) / 2
        const contribution = (drops / totalDrops) * avgPercent * (dilutionPercent / 100)
        activeConstituentLevels[constituent.name] = 
          (activeConstituentLevels[constituent.name] || 0) + contribution
      })
    }
  })
  
  // ==========================================================================
  // STEP 2: Check Oil Incompatibilities (CRITICAL - These should block)
  // ==========================================================================
  
  const oilIds = normalizedOils.map(o => o.oilId)
  const incompatiblePairs = getIncompatiblePairs(oilIds)
  
  incompatiblePairs.forEach(pair => {
    if (pair.severity === 'avoid') {
      blockedCombinations.push({
        type: 'incompatible-oils',
        severity: 'critical',
        affectedOils: [pair.oil1, pair.oil2],
        description: pair.reason,
        chemicalExplanation: 'Chemical incompatibility between oils',
      })
    } else {
      cautions.push({
        id: `incompatibility-${pair.oil1}-${pair.oil2}`,
        severity: pair.severity === 'caution' ? 'warning' : 'caution',
        category: 'interaction',
        title: 'Oil Incompatibility Detected',
        description: pair.reason,
        affectedOils: [pair.oil1, pair.oil2],
        recommendation: 'Consider using alternative oils or reducing concentrations',
      })
    }
  })
  
  // ==========================================================================
  // STEP 3: Phototoxicity Analysis (WARNING only)
  // ==========================================================================
  
  const phototoxicRisk = getPhototoxicStackingRisk(oilIds)
  
  if (phototoxicRisk.hasRisk) {
    const phototoxicDrops = normalizedOils
      .filter(o => phototoxicRisk.oils.includes(o.oilId))
      .reduce((sum, o) => sum + o.drops, 0)
    
    const phototoxicDilution = (phototoxicDrops * 0.05) / totalVolumeMl * 100
    
    if (phototoxicDilution > phototoxicRisk.maxSafeDilution) {
      warnings.push({
        id: 'phototoxic-stack',
        severity: 'warning',
        category: 'contraindication',
        title: 'High Phototoxicity Risk',
        description: `Combined phototoxic oils exceed safe levels for sun exposure. Avoid sun for ${phototoxicRisk.sunAvoidanceHours}+ hours after use.`,
        affectedOils: phototoxicRisk.oils,
        recommendation: `Stay out of direct sunlight for ${phototoxicRisk.sunAvoidanceHours} hours after using this blend.`,
      })
    } else {
      cautions.push({
        id: 'phototoxic-caution',
        severity: 'caution',
        category: 'contraindication',
        title: 'Phototoxic Oils Present',
        description: `Contains ${phototoxicRisk.oils.length} photosensitizing oil${phototoxicRisk.oils.length > 1 ? 's' : ''}.`,
        affectedOils: phototoxicRisk.oils,
        recommendation: `Avoid sun exposure for ${phototoxicRisk.sunAvoidanceHours} hours after application.`,
      })
    }
  }
  
  // ==========================================================================
  // STEP 3B: Per-Oil Maximum Dilution Enforcement
  // Each oil's final leave-on dilution is compared against its own profile
  // limit (maxDilutionPercent). Moderate exceedances produce the strongest
  // advisory warning; order-of-magnitude exceedances block the mix.
  // ==========================================================================

  normalizedOils.forEach(({ oilId, ml }) => {
    const profile = getOilSafetyProfile(oilId)
    if (!profile) return

    const oilDilutionPercent = (ml / totalVolumeMl) * 100
    // Small epsilon so a mix at exactly the profile limit is not flagged
    // due to floating-point rounding (e.g. 0.21ml / 30ml = 0.7000…1%)
    if (oilDilutionPercent <= profile.maxDilutionPercent + 1e-9) return

    const formattedDilution = parseFloat(oilDilutionPercent.toFixed(2))
    const maxMlForVolume = parseFloat(((profile.maxDilutionPercent / 100) * totalVolumeMl).toFixed(2))

    if (oilDilutionPercent > profile.maxDilutionPercent * MAX_DILUTION_EXCEEDANCE_FACTOR) {
      blockedCombinations.push({
        type: 'exceeds-max-dilution',
        severity: 'critical',
        affectedOils: [oilId],
        description: `${profile.commonName} is at ${formattedDilution}% of the final blend — its maximum safe leave-on dilution is ${profile.maxDilutionPercent}%`,
        chemicalExplanation: `${profile.commonName} exceeds its profile maximum dermal limit by more than ${MAX_DILUTION_EXCEEDANCE_FACTOR}x`,
        alternativeSuggestion: `Reduce ${profile.commonName} to ${maxMlForVolume}ml or less per ${totalVolumeMl}ml total volume`,
      })
    } else {
      warnings.push({
        id: `dilution-exceeded-${oilId}`,
        severity: 'critical',
        category: 'concentration',
        title: 'Maximum Dilution Exceeded',
        description: `${profile.commonName} is at ${formattedDilution}% of the final blend — above its maximum safe leave-on dilution of ${profile.maxDilutionPercent}%`,
        affectedOils: [oilId],
        recommendation: `Reduce ${profile.commonName} to ${maxMlForVolume}ml or less per ${totalVolumeMl}ml total volume (${profile.maxDilutionPercent}% maximum)`,
      })
    }
  })

  // ==========================================================================
  // STEP 4: Age-Specific Checks (CAUTION only - parents decide)
  // ==========================================================================
  
  if (userProfile.isChild || userProfile.age < 12) {
    const ageMonths = userProfile.exactAge || userProfile.age * 12
    
    normalizedOils.forEach(({ oilId }) => {
      const profile = getOilSafetyProfile(oilId)
      if (!profile) return
      
      if (ageMonths < 24 && profile.ageRestrictions.under2Years === 'avoid') {
        cautions.push({
          id: `age-caution-${oilId}`,
          severity: 'warning',
          category: 'age',
          title: 'Not Recommended for Young Children',
          description: `${profile.commonName} is generally not recommended for children under 2 years.`,
          affectedOils: [oilId],
          recommendation: 'Consult a pediatric aromatherapist before use with young children.',
        })
      }
    })
  }
  
  // ==========================================================================
  // STEP 5: Pregnancy & Breastfeeding (CAUTION only - except explicit AVOID)
  // ==========================================================================
  
  if (userProfile.isPregnant) {
    normalizedOils.forEach(({ oilId }) => {
      const profile = getOilSafetyProfile(oilId)
      if (!profile) return
      
      if (profile.pregnancySafety === 'avoid') {
        // Only BLOCK if explicitly marked avoid
        blockedCombinations.push({
          type: 'pregnancy-unsafe',
          severity: 'critical',
          affectedOils: [oilId],
          description: `${profile.commonName} should be avoided during pregnancy`,
          alternativeSuggestion: 'Safe alternatives: Lavender, Chamomile Roman, Sweet Orange',
        })
      } else if (profile.pregnancySafety === 'caution') {
        cautions.push({
          id: `pregnancy-caution-${oilId}`,
          severity: 'caution',
          category: 'pregnancy',
          title: 'Use with Caution During Pregnancy',
          description: profile.pregnancyNotes || `${profile.commonName} requires caution during pregnancy`,
          affectedOils: [oilId],
          recommendation: 'Consult your healthcare provider before use',
        })
      }
    })
  }
  
  if (userProfile.isBreastfeeding) {
    normalizedOils.forEach(({ oilId }) => {
      const profile = getOilSafetyProfile(oilId)
      if (!profile || profile.breastfeedingSafety === 'safe') return
      
      if (profile.breastfeedingSafety === 'avoid') {
        cautions.push({
          id: `breastfeeding-caution-${oilId}`,
          severity: 'warning',
          category: 'pregnancy',
          title: 'Not Recommended While Breastfeeding',
          description: profile.breastfeedingNotes || `${profile.commonName} is not recommended during breastfeeding`,
          affectedOils: [oilId],
          recommendation: 'Consult your healthcare provider',
        })
      }
    })
  }
  
  // ==========================================================================
  // STEP 6: Medical Conditions (WARNING only - user decides with waiver)
  // ==========================================================================
  
  userProfile.conditions.forEach(condition => {
    normalizedOils.forEach(({ oilId }) => {
      const profile = getOilSafetyProfile(oilId)
      if (!profile) return
      
      const matchingContraindication = profile.contraindications.find(
        c => c.description.toLowerCase().includes(condition.toLowerCase()) ||
            c.affectedSystems?.some(s => s.toLowerCase().includes(condition.toLowerCase()))
      )
      
      if (matchingContraindication) {
        warnings.push({
          id: `contraindication-${oilId}-${condition}`,
          severity: matchingContraindication.severity === 'critical' ? 'warning' : 'caution',
          category: 'contraindication',
          title: 'Medical Condition Alert',
          description: matchingContraindication.description,
          affectedOils: [oilId],
          affectedConditions: [condition],
          recommendation: 'Consult your healthcare provider before use',
        })
      }
    })
  })
  
  // ==========================================================================
  // STEP 7: Respiratory Sensitivity (WARNING only)
  // ==========================================================================
  
  if (userProfile.respiratorySensitivity || userProfile.conditions.includes('asthma')) {
    const respiratoryRiskOils = normalizedOils.filter(({ oilId }) => {
      const profile = getOilSafetyProfile(oilId)
      return profile?.respiratoryEffects.canTriggerAsthma ||
             profile?.respiratoryEffects.cautionForRespiratoryConditions
    })
    
    if (respiratoryRiskOils.length > 0) {
      warnings.push({
        id: 'respiratory-risk',
        severity: 'warning',
        category: 'usage',
        title: 'Respiratory Sensitivity Alert',
        description: 'This blend contains oils that may affect sensitive airways',
        affectedOils: respiratoryRiskOils.map(o => o.oilId),
        affectedConditions: userProfile.conditions.filter(c => 
          ['asthma', 'copd', 'respiratory-conditions'].includes(c)
        ),
        recommendation: 'Use in well-ventilated areas, start with small amounts',
      })
    }
  }
  
  // ==========================================================================
  // STEP 8: Calculate Safety Score
  // ==========================================================================
  
  let safetyScore = 100
  
  // Only deduct for actual blocked combinations
  safetyScore -= blockedCombinations.length * 25
  
  // Minor deductions for warnings and cautions
  safetyScore -= warnings.length * 5
  safetyScore -= cautions.length * 2
  
  safetyScore = Math.max(0, Math.min(100, safetyScore))
  
  // Determine safety rating
  let safetyRating: MixValidationResult['safetyRating']
  if (safetyScore >= 90) safetyRating = 'excellent'
  else if (safetyScore >= 75) safetyRating = 'good'
  else if (safetyScore >= 60) safetyRating = 'acceptable'
  else if (safetyScore >= 40) safetyRating = 'caution'
  else safetyRating = 'dangerous'

  // Most restrictive per-oil leave-on limit across the blend (from profiles DB)
  const profileMaxDilutions = normalizedOils
    .map(o => getOilSafetyProfile(o.oilId)?.maxDilutionPercent)
    .filter((v): v is number => v !== undefined)
  const safeDilutionPercent = profileMaxDilutions.length > 0
    ? Math.min(mode === 'pure' ? 100 : 75, ...profileMaxDilutions)
    : mode === 'pure' ? 100 : 75
  
  // ==========================================================================
  // STEP 9: Compile Recommendations
  // ==========================================================================
  
  const recommendations: MixValidationResult['recommendations'] = {
    patchTestRecommended: warnings.length > 0 || cautions.some(c => c.severity === 'warning'),
    professionalConsultationRecommended: 
      blockedCombinations.length > 0 ||
      userProfile.conditions.length > 2 ||
      userProfile.isPregnant,
  }
  
  // ==========================================================================
  // FINAL RESULT
  // ==========================================================================
  
  return {
    // Can proceed unless there's a critical block (incompatible oils, pregnancy avoid)
    canProceed: blockedCombinations.length === 0,
    // Requires waiver if there are warnings but no blocks
    requiresWaiver: blockedCombinations.length === 0 && warnings.length > 0,
    calculations: {
      totalDrops,
      totalMl: parseFloat(totalEssentialMl.toFixed(2)),
      dilutionPercent: parseFloat(dilutionPercent.toFixed(2)),
      safeDilutionPercent,
      activeConstituentLevels,
    },
    blockedCombinations,
    criticalWarnings: warnings.filter(w => w.severity === 'critical'),
    warnings: warnings.filter(w => w.severity === 'warning'),
    cautions,
    info,
    recommendations,
    safetyScore: Math.round(safetyScore),
    safetyRating,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function isMixSafe(request: MixValidationRequest): boolean {
  const result = validateOilMix(request)
  return result.canProceed
}

export function getSafetyStatus(result: MixValidationResult): {
  color: 'green' | 'yellow' | 'orange' | 'red'
  icon: 'check' | 'info' | 'alert' | 'ban'
  message: string
} {
  if (result.canProceed && result.safetyScore >= 90) {
    return { color: 'green', icon: 'check', message: 'Safe to use' }
  } else if (result.canProceed && result.safetyScore >= 70) {
    return { color: 'yellow', icon: 'info', message: 'Use with caution' }
  } else if (result.canProceed) {
    return { color: 'orange', icon: 'alert', message: 'Review warnings before use' }
  } else {
    return { color: 'red', icon: 'ban', message: 'Cannot proceed - safety issues detected' }
  }
}
