// ========================================
// Crystal Count Configuration
// ========================================

import type { BottleSize } from './types'
export type { BottleSize }

export interface CrystalConfig {
  count: number
  weight: number // in grams
  description: string
}

export const BOTTLE_CRYSTAL_MAPPING: Record<BottleSize, CrystalConfig> = {
  // 2026-07-21 fix: 5ml ships 2 crystal chips, not 3 — this now matches
  // CRYSTAL_COUNTS in pricing-engine-final.ts (the count pricing assumes),
  // BOTTLE_SIZES in product-config.ts, and OIL_DATABASE.sizeInfo.
  '5ml': { count: 2, weight: 8, description: 'Crystal Tease' },
  '10ml': { count: 4, weight: 15, description: 'Crystal Whisper' },
  '15ml': { count: 6, weight: 25, description: 'Crystal Touch' },
  '20ml': { count: 8, weight: 35, description: 'Crystal Nest' },
  '30ml': { count: 12, weight: 50, description: 'Crystal Garden' },
} as const

export const BOTTLE_SIZES: BottleSize[] = ['5ml', '10ml', '15ml', '20ml', '30ml']

/**
 * Get the crystal count for a specific bottle size
 */
export function getCrystalCountForBottle(size: BottleSize): number {
  return BOTTLE_CRYSTAL_MAPPING[size]?.count ?? 4 // Default to 4 for unknown sizes
}

/**
 * Get the crystal weight for a specific bottle size
 */
export function getCrystalWeightForBottle(size: BottleSize): number {
  return BOTTLE_CRYSTAL_MAPPING[size]?.weight ?? 15 // Default to 15g
}

/**
 * Get the description for a specific bottle size
 */
export function getBottleDescription(size: BottleSize): string {
  return BOTTLE_CRYSTAL_MAPPING[size]?.description ?? 'Crystal Touch'
}

/**
 * Get the full configuration for a bottle size
 */
export function getCrystalConfigForBottle(size: BottleSize): CrystalConfig {
  return (
    BOTTLE_CRYSTAL_MAPPING[size] ?? {
      count: 4,
      weight: 15,
      description: 'Crystal Touch',
    }
  )
}

/**
 * Get all bottle size options with their configurations
 */
export function getAllBottleConfigs(): Array<{
  size: BottleSize
  config: CrystalConfig
}> {
  return BOTTLE_SIZES.map((size) => ({
    size,
    config: BOTTLE_CRYSTAL_MAPPING[size],
  }))
}

/**
 * Calculate the number of crystals based on bottle size
 * with optional custom multiplier
 */
export function calculateCrystalCount(
  size: BottleSize,
  multiplier: number = 1
): number {
  const baseCount = getCrystalCountForBottle(size)
  return Math.round(baseCount * multiplier)
}

/**
 * Validate a bottle size string
 */
export function isValidBottleSize(size: string): size is BottleSize {
  return BOTTLE_SIZES.includes(size as BottleSize)
}

/**
 * Get available bottle sizes as options for UI
 */
export function getBottleSizeOptions(): Array<{
  value: BottleSize
  label: string
  description: string
  crystalCount: number
}> {
  return BOTTLE_SIZES.map((size) => ({
    value: size,
    label: size,
    description: BOTTLE_CRYSTAL_MAPPING[size].description,
    crystalCount: BOTTLE_CRYSTAL_MAPPING[size].count,
  }))
}

/**
 * Get the next larger bottle size
 */
export function getNextBottleSize(size: BottleSize): BottleSize | null {
  const currentIndex = BOTTLE_SIZES.indexOf(size)
  if (currentIndex === -1 || currentIndex === BOTTLE_SIZES.length - 1) {
    return null
  }
  return BOTTLE_SIZES[currentIndex + 1]
}

/**
 * Get the previous smaller bottle size
 */
export function getPreviousBottleSize(size: BottleSize): BottleSize | null {
  const currentIndex = BOTTLE_SIZES.indexOf(size)
  if (currentIndex <= 0) {
    return null
  }
  return BOTTLE_SIZES[currentIndex - 1]
}

/**
 * Compare two bottle sizes
 * Returns: -1 if size1 < size2, 0 if equal, 1 if size1 > size2
 */
export function compareBottleSizes(
  size1: BottleSize,
  size2: BottleSize
): number {
  const index1 = BOTTLE_SIZES.indexOf(size1)
  const index2 = BOTTLE_SIZES.indexOf(size2)
  return Math.sign(index1 - index2)
}
