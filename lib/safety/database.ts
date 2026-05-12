/**
 * Oil Amor Safety Database
 * Complete registry of all oil safety profiles
 */

import { OilSafetyProfile, SafetyDatabaseVersion } from './types'
import {
  LAVENDER_PROFILE,
  TEA_TREE_PROFILE,
  EUCALYPTUS_PROFILE,
  BERGAMOT_PROFILE,
  PEPPERMINT_PROFILE,
  LEMON_PROFILE,
} from './oil-profiles'

import {
  FRANKINCENSE_PROFILE,
  ROSEMARY_PROFILE,
  CHAMOMILE_ROMAN_PROFILE,
  SWEET_ORANGE_PROFILE,
  YLANG_YLANG_PROFILE,
  GERANIUM_PROFILE,
  LIME_PROFILE,
  CEDARWOOD_PROFILE,
  GRAPEFRUIT_PROFILE,
  SANDALWOOD_PROFILE,
  PATCHOULI_PROFILE,
  CLARY_SAGE_PROFILE,
  CAMPHOR_WHITE_PROFILE,
  VETIVER_PROFILE,
  HO_WOOD_PROFILE,
  WINTERGREEN_PROFILE,
  CYPRESS_PROFILE,
  BASIL_LINALOOL_PROFILE,
  OREGANO_PROFILE,
} from './oil-profiles-continued'

// Note: SWEET_ORANGE_PROFILE is already imported from oil-profiles-continued

import {
  LEMONGRASS_PROFILE,
  CINNAMON_LEAF_PROFILE,
  MAY_CHANG_PROFILE,
  GINGER_PROFILE,
  CARROT_SEED_PROFILE,
  LEMON_MYRTLE_PROFILE,
  GERANIUM_BOURBON_PROFILE,
  JUNIPER_BERRY_PROFILE,
  PATCHOULI_DARK_PROFILE,
  MYRRH_PROFILE,
  CLOVE_BUD_PROFILE,
  CINNAMON_BARK_PROFILE,
} from './oil-profiles-atelier-missing'

import { BERGAMOT_FCF_PROFILE } from './oil-profiles-bergamot'
// Note: SWEET_ORANGE_PROFILE is already imported from oil-profiles-continued above

// ============================================================================
// DATABASE VERSION
// ============================================================================

export const SAFETY_DB_VERSION: SafetyDatabaseVersion = {
  version: '1.0.0',
  lastUpdated: '2026-03-29',
  updatedBy: 'Oil Amor Safety Team',
  changelog: [
    'Initial comprehensive safety database for all 17 oils',
    'Includes IFRA 51st Amendment compliance',
    'Tisserand & Young (2014) reference integration',
    'Age-specific dilution guidelines',
    'Pregnancy and breastfeeding safety data',
    'Drug interaction cross-referencing',
    'Chemical constituent profiles',
  ],
}

// ============================================================================
// OIL DATABASE
// ============================================================================

export const OIL_SAFETY_DATABASE: Record<string, OilSafetyProfile> = {
  // Core 6
  lavender: LAVENDER_PROFILE,
  'tea-tree': TEA_TREE_PROFILE,
  eucalyptus: EUCALYPTUS_PROFILE,
  bergamot: BERGAMOT_PROFILE,
  peppermint: PEPPERMINT_PROFILE,
  lemon: LEMON_PROFILE,
  
  // Additional 12
  frankincense: FRANKINCENSE_PROFILE,
  rosemary: ROSEMARY_PROFILE,
  'chamomile-roman': CHAMOMILE_ROMAN_PROFILE,
  'orange-sweet': SWEET_ORANGE_PROFILE,
  'ylang-ylang': YLANG_YLANG_PROFILE,
  geranium: GERANIUM_PROFILE,
  lime: LIME_PROFILE,
  cedarwood: CEDARWOOD_PROFILE,
  grapefruit: GRAPEFRUIT_PROFILE,
  sandalwood: SANDALWOOD_PROFILE,
  patchouli: PATCHOULI_PROFILE,
  'clary-sage': CLARY_SAGE_PROFILE,
  
  // Atelier missing 10 (now complete)
  lemongrass: LEMONGRASS_PROFILE,
  'cinnamon-leaf': CINNAMON_LEAF_PROFILE,
  'may-chang': MAY_CHANG_PROFILE,
  ginger: GINGER_PROFILE,
  'carrot-seed': CARROT_SEED_PROFILE,
  'lemon-myrtle': LEMON_MYRTLE_PROFILE,
  'geranium-bourbon': GERANIUM_BOURBON_PROFILE,
  'juniper-berry': JUNIPER_BERRY_PROFILE,
  'patchouli-dark': PATCHOULI_DARK_PROFILE,
  myrrh: MYRRH_PROFILE,
  
  // New additions
  'bergamot-fcf': BERGAMOT_FCF_PROFILE,
  'camphor-white': CAMPHOR_WHITE_PROFILE,
  'vetiver': VETIVER_PROFILE,
  'ho-wood': HO_WOOD_PROFILE,
  'wintergreen': WINTERGREEN_PROFILE,
  'cypress': CYPRESS_PROFILE,
  'basil-linalool': BASIL_LINALOOL_PROFILE,
  'oregano': OREGANO_PROFILE,
  
  // Critical atelier oils — added in safety audit
  'clove-bud': CLOVE_BUD_PROFILE,
  'cinnamon-bark': CINNAMON_BARK_PROFILE,
  
  // Alias: atelier uses 'sweet-orange', safety DB uses 'orange-sweet'
  'sweet-orange': SWEET_ORANGE_PROFILE,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get safety profile for a specific oil
 */
export function getOilSafetyProfile(oilId: string): OilSafetyProfile | undefined {
  return OIL_SAFETY_DATABASE[oilId]
}

/**
 * Get all oil profiles
 */
export function getAllSafetyProfiles(): OilSafetyProfile[] {
  return Object.values(OIL_SAFETY_DATABASE)
}

/**
 * Get list of phototoxic oils
 */
export function getPhototoxicOils(): OilSafetyProfile[] {
  return getAllSafetyProfiles().filter(oil => oil.photosensitivity.isPhotosensitive)
}

/**
 * Get list of oils safe for pregnancy
 */
export function getPregnancySafeOils(): OilSafetyProfile[] {
  return getAllSafetyProfiles().filter(oil => 
    oil.pregnancySafety === 'safe' || oil.pregnancySafety === 'caution'
  )
}

/**
 * Get list of oils to avoid during pregnancy
 */
export function getPregnancyUnsafeOils(): OilSafetyProfile[] {
  return getAllSafetyProfiles().filter(oil => 
    oil.pregnancySafety === 'avoid'
  )
}

/**
 * Get oils safe for children of specific age
 */
export function getChildSafeOils(ageMonths: number): OilSafetyProfile[] {
  return getAllSafetyProfiles().filter(oil => {
    if (ageMonths < 2) return oil.ageRestrictions.under2Months !== 'avoid'
    if (ageMonths < 6) return oil.ageRestrictions.under6Months !== 'avoid'
    if (ageMonths < 24) return oil.ageRestrictions.under2Years !== 'avoid'
    if (ageMonths < 72) return oil.ageRestrictions.under6Years !== 'avoid'
    if (ageMonths < 144) return oil.ageRestrictions.under12Years !== 'avoid'
    return true
  })
}

/**
 * Get max dilution for a user profile
 */
export function getMaxDilutionForUser(
  oilId: string,
  age: number,
  isPregnant: boolean,
  isBreastfeeding: boolean
): number {
  const profile = getOilSafetyProfile(oilId)
  if (!profile) return 0
  
  let maxDilution = profile.maxDilutionPercent
  
  // Age restrictions
  if (age < 2 && profile.ageRestrictions.under2Years === 'dilute') {
    maxDilution = Math.min(maxDilution, 0.25)
  } else if (age < 6 && profile.ageRestrictions.under6Years === 'dilute') {
    maxDilution = Math.min(maxDilution, 1)
  } else if (age < 12 && profile.ageRestrictions.under12Years === 'dilute') {
    maxDilution = Math.min(maxDilution, 2)
  }
  
  // Pregnancy restrictions
  if (isPregnant) {
    maxDilution = Math.min(maxDilution, 1) // General pregnancy max
    if (profile.pregnancySafety === 'avoid') {
      maxDilution = 0
    }
  }
  
  // Breastfeeding restrictions
  if (isBreastfeeding && profile.breastfeedingSafety === 'avoid') {
    maxDilution = 0
  }
  
  return maxDilution
}

/**
 * Check if two oils are incompatible
 */
export function areOilsIncompatible(oilId1: string, oilId2: string): {
  incompatible: boolean
  reason?: string
  severity?: 'avoid' | 'caution' | 'note'
} {
  const profile1 = getOilSafetyProfile(oilId1)
  const profile2 = getOilSafetyProfile(oilId2)
  
  if (!profile1 || !profile2) {
    return { incompatible: false }
  }
  
  // Check oil1's incompatibilities
  const incompatibility1 = profile1.incompatibleOils.find(i => i.oilId === oilId2)
  if (incompatibility1) {
    return {
      incompatible: true,
      reason: incompatibility1.reason,
      severity: incompatibility1.severity,
    }
  }
  
  // Check oil2's incompatibilities
  const incompatibility2 = profile2.incompatibleOils.find(i => i.oilId === oilId1)
  if (incompatibility2) {
    return {
      incompatible: true,
      reason: incompatibility2.reason,
      severity: incompatibility2.severity,
    }
  }
  
  return { incompatible: false }
}

/**
 * Get all incompatible pairs in a mix
 */
export function getIncompatiblePairs(oilIds: string[]): Array<{
  oil1: string
  oil2: string
  reason: string
  severity: 'avoid' | 'caution' | 'note'
}> {
  const incompatibilities: Array<{
    oil1: string
    oil2: string
    reason: string
    severity: 'avoid' | 'caution' | 'note'
  }> = []
  
  for (let i = 0; i < oilIds.length; i++) {
    for (let j = i + 1; j < oilIds.length; j++) {
      const check = areOilsIncompatible(oilIds[i], oilIds[j])
      if (check.incompatible && check.reason) {
        incompatibilities.push({
          oil1: oilIds[i],
          oil2: oilIds[j],
          reason: check.reason,
          severity: check.severity || 'note',
        })
      }
    }
  }
  
  return incompatibilities
}

/**
 * Check for phototoxic stacking
 */
export function getPhototoxicStackingRisk(oilIds: string[]): {
  hasRisk: boolean
  cumulativeRisk: 'none' | 'low' | 'moderate' | 'high'
  oils: string[]
  maxSafeDilution: number
  sunAvoidanceHours: number
} {
  const phototoxicOils = oilIds
    .map(id => getOilSafetyProfile(id))
    .filter((profile): profile is OilSafetyProfile => 
      profile !== undefined && profile.photosensitivity.isPhotosensitive
    )
  
  if (phototoxicOils.length === 0) {
    return {
      hasRisk: false,
      cumulativeRisk: 'none',
      oils: [],
      maxSafeDilution: 25, // No limit
      sunAvoidanceHours: 0,
    }
  }
  
  // Calculate cumulative risk
  let cumulativeRisk: 'low' | 'moderate' | 'high' = 'low'
  if (phototoxicOils.length >= 3) {
    cumulativeRisk = 'high'
  } else if (phototoxicOils.length === 2) {
    cumulativeRisk = 'moderate'
  }
  
  // Find most restrictive
  const maxSafeDilution = Math.min(...phototoxicOils.map(o => o.maxDilutionPercent))
  const sunAvoidanceHours = Math.max(...phototoxicOils.map(o => 
    o.photosensitivity.safeAfterHours || 12
  ))
  
  return {
    hasRisk: true,
    cumulativeRisk,
    oils: phototoxicOils.map(o => o.oilId),
    maxSafeDilution,
    sunAvoidanceHours,
  }
}
