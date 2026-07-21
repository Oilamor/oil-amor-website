/**
 * Server-Side Custom Mix Safety Validation
 *
 * Authoritative server-side safety assessment for custom mixes.
 * Client-supplied safety fields (safetyScore/safetyRating/safetyWarnings)
 * are NEVER trusted — they are regenerated here from the safety profiles
 * database (lib/safety/database.ts) and the validation engine
 * (lib/safety/validation-engine.ts) before being persisted to orders,
 * batch records, or printed on labels.
 */

import { validateOilMix } from './validation-engine'
import { getOilSafetyProfile } from './database'
import { UserHealthProfile } from './types'

// ============================================================================
// CONTRACT
// ============================================================================

export interface ServerMixSafetyResult {
  canProceed: boolean
  errors: string[]
  safetyScore: number // 0-100
  safetyRating: string // uses the engine's rating scale
  safetyWarnings: string[] // regenerated server-side
}

// ============================================================================
// BASELINE PROFILE
// ============================================================================

/**
 * Baseline adult profile used for server-side blend validation.
 * Personalised checks (pregnancy, conditions, medications) happen in the
 * client-facing engines; here we validate the physical blend itself.
 */
const BASELINE_USER_PROFILE: UserHealthProfile = {
  age: 30,
  isPregnant: false,
  isBreastfeeding: false,
  isTryingToConceive: false,
  isChild: false,
  conditions: [],
  medications: [],
  knownAllergies: [],
  skinSensitivity: 'normal',
  respiratorySensitivity: false,
  intendedUse: { method: 'topical', frequency: 'daily', duration: 'long-term' },
  aromatherapyExperience: 'beginner',
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateCustomMixServer(mix: {
  oils: Array<{ oilId: string; ml: number; percentage?: number }>
  totalVolume: number
  carrierRatio?: number
  [key: string]: unknown
}): ServerMixSafetyResult {
  const errors: string[] = []

  // --------------------------------------------------------------------------
  // Structural validation
  // --------------------------------------------------------------------------

  const oils = Array.isArray(mix.oils) ? mix.oils : []
  if (oils.length === 0) {
    errors.push('Mix must contain at least one oil')
  }

  const totalVolume =
    typeof mix.totalVolume === 'number' && isFinite(mix.totalVolume)
      ? mix.totalVolume
      : NaN
  if (!isFinite(totalVolume) || totalVolume <= 0) {
    errors.push('totalVolume must be a positive number')
  }

  const normalizedOils: Array<{ oilId: string; ml: number }> = []

  for (const oil of oils) {
    if (!oil || typeof oil.oilId !== 'string' || oil.oilId.length === 0) {
      errors.push('Oil ID is required for each oil')
      continue
    }

    if (!getOilSafetyProfile(oil.oilId)) {
      errors.push(`Unknown oil: ${oil.oilId}`)
      continue
    }

    let ml = typeof oil.ml === 'number' && isFinite(oil.ml) ? oil.ml : NaN
    if ((!isFinite(ml) || ml <= 0) && typeof oil.percentage === 'number' && isFinite(totalVolume) && totalVolume > 0) {
      ml = (oil.percentage / 100) * totalVolume
    }
    const drops = (oil as Record<string, unknown>).drops
    if ((!isFinite(ml) || ml <= 0) && typeof drops === 'number' && drops > 0) {
      ml = drops / 20 // SAFETY_CONSTANTS.DROPS_PER_ML
    }
    if (!isFinite(ml) || ml <= 0) {
      errors.push(`A positive ml (or percentage/drops) is required for oil: ${oil.oilId}`)
      continue
    }

    normalizedOils.push({ oilId: oil.oilId, ml })
  }

  const totalEssentialMl = normalizedOils.reduce((sum, o) => sum + o.ml, 0)
  if (isFinite(totalVolume) && totalVolume > 0 && totalEssentialMl > totalVolume + 0.01) {
    errors.push(
      `Total essential oil volume (${parseFloat(totalEssentialMl.toFixed(2))}ml) exceeds total mix volume (${totalVolume}ml)`
    )
  }

  if (errors.length > 0) {
    return {
      canProceed: false,
      errors,
      safetyScore: 0,
      safetyRating: 'dangerous',
      safetyWarnings: [],
    }
  }

  // --------------------------------------------------------------------------
  // Engine validation (dilution limits, incompatibilities, phototoxicity)
  // --------------------------------------------------------------------------

  const result = validateOilMix({
    oils: normalizedOils,
    userProfile: BASELINE_USER_PROFILE,
    totalVolumeMl: totalVolume,
    mode: mix.mode === 'carrier' ? 'carrier' : 'pure',
    intendedUse: BASELINE_USER_PROFILE.intendedUse,
  })

  const safetyWarnings: string[] = [
    ...result.blockedCombinations.map(b => b.description),
    ...result.criticalWarnings.map(w => `${w.title}: ${w.description}`),
    ...result.warnings.map(w => `${w.title}: ${w.description}`),
    ...result.cautions.map(w => `${w.title}: ${w.description}`),
  ]

  return {
    canProceed: result.canProceed,
    errors: result.blockedCombinations.map(b => b.description),
    safetyScore: result.safetyScore,
    safetyRating: result.safetyRating,
    safetyWarnings,
  }
}

// ============================================================================
// STANDARD PRODUCT WARNINGS
// ============================================================================

/**
 * Derive honest label warnings for a standard (single-oil) product from the
 * oil's own safety profile. Used when no server-validated mix safety data
 * exists, so a label never silently defaults to "safe".
 */
export function getStandardOilWarnings(oilId: string): string[] {
  const profile = getOilSafetyProfile(oilId)
  if (!profile) return ['Pending safety validation']

  const warnings: string[] = []

  if (profile.pregnancySafety === 'avoid') {
    warnings.push('Avoid during pregnancy')
  } else if (profile.pregnancySafety === 'caution' || profile.pregnancySafety === 'consult') {
    warnings.push('Use with caution during pregnancy')
  }

  if (profile.breastfeedingSafety === 'avoid') {
    warnings.push('Avoid while breastfeeding')
  }

  if (profile.photosensitivity.isPhotosensitive) {
    warnings.push(
      `Avoid sun or UV exposure for ${profile.photosensitivity.safeAfterHours ?? 12} hours after skin application`
    )
  }

  if (profile.toxicity.oral) {
    warnings.push('Toxic if swallowed — keep out of reach of children')
  }

  if (profile.skinSensitization.isSensitizer && profile.skinSensitization.riskLevel === 'high') {
    warnings.push(
      `May cause skin sensitisation — dilute to ${profile.skinSensitization.maxDilutionForSensitive}% or less and patch test first`
    )
  }

  if (profile.maxDilutionPercent < 5) {
    warnings.push(`Maximum leave-on dilution ${profile.maxDilutionPercent}%`)
  }

  return warnings
}
