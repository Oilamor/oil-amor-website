/**
 * Batch Record System
 * 
 * Stores complete blend data associated with a batch ID for QR code retrieval.
 * When a label is generated, the batch record is saved so customers can scan
 * the QR code to see full ingredients, safety info, and reorder.
 */

import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

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
  // Refill tracking
  isRefill: boolean;
  sourceVolume?: number;
  targetVolume?: number;
  originalBatchId?: string;
  // Order tracking
  orderId?: string;
  customerName?: string;
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
}

export async function buildAndSaveBatchRecord(input: BuildBatchInput): Promise<BatchRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years

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
    safetyWarnings: input.safetyWarnings || [],
    safetyScore: input.safetyScore || 95,
    safetyRating: input.safetyRating || 'safe',
    isRefill: input.isRefill || false,
    sourceVolume: input.sourceVolume,
    targetVolume: input.targetVolume,
    originalBatchId: input.originalBatchId,
    orderId: input.orderId,
    // shopifyOrderId removed
    customerName: input.customerName,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await saveBatchRecord(record);
  return record;
}
