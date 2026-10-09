/**
 * Batch Record System
 * 
 * Stores complete blend data associated with a batch ID for QR code retrieval.
 * When a label is generated, the batch record is saved so customers can scan
 * the QR code to see full ingredients, safety info, and reorder.
 */

import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logging/logger';
import { getStandardOilWarnings } from '@/lib/safety/server-validation';
import { getOilSafetyProfile } from '@/lib/safety/database';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchBlendOil {
  oilId: string;
  oilName: string;
  ml: number;
  percentage: number;
}

export interface BatchRecord {
  id: string; // batchId
  blendName: string;
  mode: 'pure' | 'carrier';
  oils: BatchBlendOil[];
  carrierOil?: string;
  carrierPercentage?: number;
  size: number;
  crystal?: string;
  cord?: string;
  intendedUse?: string;
  safetyWarnings: string[];
  safetyScore: number;
  safetyRating: string;
  /** True when the record was created without server-validated safety data */
  needsSafetyReview?: boolean;
  // Refill tracking
  isRefill: boolean;
  sourceVolume?: number;
  targetVolume?: number;
  originalBatchId?: string;
  // Order tracking
  orderId?: string;
  customerName?: string;
  // Styling metadata (v5)
  themeColor?: string;
  isAtelier?: boolean;
  dominantRarity?: 'common' | 'premium' | 'luxury';
  // Timestamps
  createdAt: string;
  expiresAt: string;
}

// ============================================================================
// IN-MEMORY FALLBACK (for when DB table doesn't exist yet)
// ============================================================================

const memoryStore = new Map<string, BatchRecord>();
const MAX_MEMORY_ITEMS = 500;

// ============================================================================
// SHELF LIFE / EXPIRY
// ============================================================================

/**
 * Fallback shelf life (months) when none of the blend's oils has a profiled
 * shelf life. Matches the historical label default.
 */
export const DEFAULT_SHELF_LIFE_MONTHS = 24;

/**
 * Compute a batch expiry date from the per-oil shelf lives in the safety
 * database. The blend expires when its shortest-lived component does.
 */
export function computeBatchExpiry(
  made: Date,
  oilIds: (string | null | undefined)[],
): Date {
  let shortest: number | undefined;
  for (const id of oilIds) {
    if (!id) continue;
    const shelfLife = getOilSafetyProfile(id)?.shelfLifeMonths;
    if (shelfLife !== undefined && (shortest === undefined || shelfLife < shortest)) {
      shortest = shelfLife;
    }
  }
  const months = shortest ?? DEFAULT_SHELF_LIFE_MONTHS;
  const expiry = new Date(made.getTime());
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
}

// ============================================================================
// SAVE
// ============================================================================

/**
 * Save a batch record. Tries DB first, falls back to in-memory.
 */
export async function saveBatchRecord(record: BatchRecord): Promise<void> {
  // Always save to memory as fallback
  memoryStore.set(record.id, record);
  
  // Prune memory if too large
  if (memoryStore.size > MAX_MEMORY_ITEMS) {
    const firstKey = memoryStore.keys().next().value;
    if (firstKey) memoryStore.delete(firstKey);
  }

  // Try DB if available
  try {
    const { batchRecords } = await import('@/lib/db/schema-refill');
    await db.insert(batchRecords).values({
      id: record.id,
      blendName: record.blendName,
      mode: record.mode,
      oils: record.oils,
      carrierOil: record.carrierOil,
      carrierPercentage: record.carrierPercentage,
      size: record.size,
      crystal: record.crystal,
      cord: record.cord,
      intendedUse: record.intendedUse,
      safetyWarnings: record.safetyWarnings,
      safetyScore: record.safetyScore,
      safetyRating: record.safetyRating,
      isRefill: record.isRefill,
      sourceVolume: record.sourceVolume,
      targetVolume: record.targetVolume,
      originalBatchId: record.originalBatchId,
      orderId: record.orderId,
      customerName: record.customerName,
      createdAt: new Date(record.createdAt),
      expiresAt: new Date(record.expiresAt),
    }).onConflictDoUpdate({
      target: (await import('@/lib/db/schema-refill')).batchRecords.id,
      set: {
        blendName: record.blendName,
        oils: record.oils,
        carrierOil: record.carrierOil,
        carrierPercentage: record.carrierPercentage,
        size: record.size,
        crystal: record.crystal,
        cord: record.cord,
        intendedUse: record.intendedUse,
        safetyWarnings: record.safetyWarnings,
        safetyScore: record.safetyScore,
        safetyRating: record.safetyRating,
        isRefill: record.isRefill,
        sourceVolume: record.sourceVolume,
        targetVolume: record.targetVolume,
        originalBatchId: record.originalBatchId,
        orderId: record.orderId,
        // shopifyOrderId removed
        customerName: record.customerName,
        expiresAt: new Date(record.expiresAt),
      },
    });
  } catch (err: any) {
    if (!err?.message?.includes('does not exist')) {
      logger.error('Failed to save batch record to database', err as Error, { batchId: record.id });
    }
    // Memory fallback already done above
  }
}

// ============================================================================
// GET
// ============================================================================

/**
 * Retrieve a batch record by ID. Tries DB first, falls back to memory.
 */
export async function getBatchRecord(batchId: string): Promise<BatchRecord | null> {
  // Try memory first (fastest)
  const memory = memoryStore.get(batchId);
  if (memory) return memory;

  // Try DB
  try {
    const { batchRecords } = await import('@/lib/db/schema-refill');
    const row = await db.query.batchRecords.findFirst({
      where: eq(batchRecords.id, batchId),
    });
    
    if (row) {
      const record: BatchRecord = {
        id: row.id,
        blendName: row.blendName,
        mode: row.mode as 'pure' | 'carrier',
        oils: (row.oils as BatchBlendOil[]) || [],
        carrierOil: row.carrierOil || undefined,
        carrierPercentage: row.carrierPercentage || undefined,
        size: row.size,
        crystal: row.crystal || undefined,
        cord: row.cord || undefined,
        intendedUse: row.intendedUse || undefined,
        safetyWarnings: (row.safetyWarnings as string[]) || [],
        safetyScore: row.safetyScore,
        safetyRating: row.safetyRating,
        isRefill: row.isRefill,
        sourceVolume: row.sourceVolume || undefined,
        targetVolume: row.targetVolume || undefined,
        originalBatchId: row.originalBatchId || undefined,
        orderId: row.orderId || undefined,
        // shopifyOrderId removed
        customerName: row.customerName || undefined,
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      };
      // Cache in memory
      memoryStore.set(batchId, record);
      return record;
    }
  } catch (err: any) {
    if (!err?.message?.includes('does not exist')) {
      logger.error('Failed to retrieve batch record from database', err as Error, { batchId });
    }
  }

  return null;
}

// ============================================================================
// BUILD FROM ORDER
// ============================================================================

export interface BuildBatchInput {
  batchId: string;
  blendName: string;
  mode: 'pure' | 'carrier';
  oils: BatchBlendOil[];
  carrierOil?: string;
  carrierPercentage?: number;
  size: number;
  crystal?: string;
  cord?: string;
  intendedUse?: string;
  safetyWarnings?: string[];
  safetyScore?: number;
  safetyRating?: string;
  isRefill?: boolean;
  sourceVolume?: number;
  targetVolume?: number;
  originalBatchId?: string;
  orderId?: string;
  // shopifyOrderId removed
  customerName?: string;
  themeColor?: string;
  isAtelier?: boolean;
  dominantRarity?: 'common' | 'premium' | 'luxury';
  /** Pre-computed expiry — callers (e.g. the label API) should pass the same
   *  date printed on the label so the QR page and the label always agree. */
  expiryDate?: string | Date;
}

export async function buildAndSaveBatchRecord(input: BuildBatchInput): Promise<BatchRecord> {
  const now = new Date();
  const expiresAt = input.expiryDate
    ? new Date(input.expiryDate)
    : computeBatchExpiry(now, input.oils.map(o => o.oilId));

  // Labels must never default to "safe". Without server-validated safety data
  // the record is marked needs-review and flagged for admin review; warnings
  // are derived from the oils' own safety profiles where possible.
  const hasValidatedSafety = input.safetyScore !== undefined && input.safetyRating !== undefined;
  let safetyWarnings = input.safetyWarnings;
  let safetyScore = input.safetyScore;
  let safetyRating = input.safetyRating;
  let needsSafetyReview = false;

  if (!hasValidatedSafety) {
    needsSafetyReview = true;
    safetyScore = 0;
    safetyRating = 'needs-review';
    const isCustomMix = input.isAtelier || input.oils.length > 1;
    if (isCustomMix) {
      safetyWarnings = ['Pending safety validation', ...(input.safetyWarnings || [])];
    } else {
      const derived = input.oils.flatMap(oil =>
        getStandardOilWarnings(oil.oilId).map(w =>
          input.oils.length > 1 ? `${oil.oilName}: ${w}` : w
        )
      );
      safetyWarnings = [...new Set(derived.length > 0 ? derived : ['Pending safety validation'])];
    }
    logger.warn('Batch record created without server-validated safety data — flagged for admin review', {
      batchId: input.batchId,
      blendName: input.blendName,
    });
  }

  const record: BatchRecord = {
    id: input.batchId,
    blendName: input.blendName,
    mode: input.mode,
    oils: input.oils,
    carrierOil: input.carrierOil,
    carrierPercentage: input.carrierPercentage,
    size: input.size,
    crystal: input.crystal,
    cord: input.cord,
    intendedUse: input.intendedUse,
    safetyWarnings: safetyWarnings || [],
    safetyScore: safetyScore ?? 0,
    safetyRating: safetyRating ?? 'needs-review',
    needsSafetyReview,
    isRefill: input.isRefill || false,
    sourceVolume: input.sourceVolume,
    targetVolume: input.targetVolume,
    originalBatchId: input.originalBatchId,
    orderId: input.orderId,
    // shopifyOrderId removed
    customerName: input.customerName,
    themeColor: input.themeColor,
    isAtelier: input.isAtelier,
    dominantRarity: input.dominantRarity,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await saveBatchRecord(record);
  return record;
}
