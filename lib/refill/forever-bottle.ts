/**
 * Forever Bottle System - Core Types and Functions
 * Manages the lifecycle of refillable Forever Bottles for Oil Amor
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { foreverBottles, foreverBottleHistory } from '@/lib/db/schema-refill';
import { eq, and, desc } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type BottleStatus = 'active' | 'empty' | 'in-transit' | 'refilled' | 'retired';

export interface ForeverBottle {
  id: string;
  customerId: string;
  serialNumber: string; // FA-XXXX format
  oilType: string;
  capacity: '100ml';
  purchaseDate: Date;
  status: BottleStatus;
  currentFillLevel: number; // ml remaining
  refillCount: number;
  lastRefillDate?: Date;
  returnLabel?: {
    trackingNumber: string;
    generatedAt: string;
    expiresAt: string;
  };
  metadata?: {
    orderId: string;
    productVariantId: string;
    purchasePrice: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BottleHistoryEvent {
  id: string;
  bottleId: string;
  eventType: 'purchased' | 'refill-ordered' | 'return-shipped' | 'received' | 'inspected' | 'refilled' | 'retired';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface BottleRegistrationInput {
  customerId: string;
  oilType: string;
  orderId: string;
  productVariantId: string;
  purchasePrice: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SERIAL_NUMBER_PREFIX = 'FA';
const BOTTLE_CAPACITY_ML = 100;
const MAX_REFILL_CYCLES = 50;

// ============================================================================
// BOTTLE REGISTRATION
// ============================================================================

/**
 * Generate a unique serial number for a Forever Bottle
 * Format: FA-XXXXXX (e.g., FA-A3F9K2)
 *
 * 2026-07-21 fix: nanoid's default alphabet includes '-' and '_', which the
 * previous strip-then-hope version removed — leaving ~9% of serials shorter
 * than 6 characters and failing this module's own isValidSerialNumber.
 * Draw characters until we hold exactly 6 that pass the validator's
 * [A-Z0-9] alphabet, so every generated serial is valid by construction.
 */
export function generateSerialNumber(): string {
  let randomPart = '';
  while (randomPart.length < 6) {
    randomPart += nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  return `${SERIAL_NUMBER_PREFIX}-${randomPart.slice(0, 6)}`;
}

/**
 * Register a new Forever Bottle for a customer
 * Called when a customer purchases a 100ml Forever Bottle
 */
export async function registerForeverBottle(
  input: BottleRegistrationInput
): Promise<ForeverBottle> {
  const { customerId, oilType, orderId, productVariantId, purchasePrice } = input;

  // Generate unique serial number
  let serialNumber: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    serialNumber = generateSerialNumber();
    
    // Check if serial number already exists
    const existing = await db.query.foreverBottles.findFirst({
      where: eq(foreverBottles.serialNumber, serialNumber),
    });
    
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Unable to generate unique serial number after maximum attempts');
  }

  const now = new Date();

  // Create the bottle record
  const [bottle] = await db
    .insert(foreverBottles)
    .values({
      id: nanoid(),
      customerId,
      serialNumber: serialNumber!,
      oilType,
      capacity: '100ml',
      purchaseDate: now,
      status: 'active',
      currentFillLevel: BOTTLE_CAPACITY_ML,
      refillCount: 0,
      metadata: {
        orderId,
        productVariantId,
        purchasePrice,
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Log the purchase event
  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId: bottle.id,
    eventType: 'purchased',
    timestamp: now,
    metadata: {
      orderId,
      purchasePrice,
      initialFillLevel: BOTTLE_CAPACITY_ML,
    },
  });

  // Revalidate customer cache
  revalidateTag(`customer-bottles-${customerId}`);

  return {
    ...bottle,
    capacity: '100ml',
    currentFillLevel: bottle.currentFillLevel ?? BOTTLE_CAPACITY_ML,
    refillCount: bottle.refillCount ?? 0,
  } as ForeverBottle;
}

// ============================================================================
// BOTTLE RETRIEVAL
// ============================================================================

/**
 * Get all Forever Bottles for a customer
 */
export async function getCustomerForeverBottles(
  customerId: string
): Promise<ForeverBottle[]> {
  const bottles = await db.query.foreverBottles.findMany({
    where: eq(foreverBottles.customerId, customerId),
    orderBy: [desc(foreverBottles.purchaseDate)],
  });

  return bottles.map((bottle) => ({
    ...bottle,
    capacity: '100ml',
    currentFillLevel: bottle.currentFillLevel ?? 0,
    refillCount: bottle.refillCount ?? 0,
    returnLabel: bottle.returnLabel as ForeverBottle['returnLabel'] | undefined,
  })) as ForeverBottle[];
}

/**
 * Get a single Forever Bottle by ID
 */
export async function getForeverBottleById(
  bottleId: string
): Promise<ForeverBottle | null> {
  const bottle = await db.query.foreverBottles.findFirst({
    where: eq(foreverBottles.id, bottleId),
  });

  if (!bottle) return null;

  return {
    ...bottle,
    capacity: '100ml',
    currentFillLevel: bottle.currentFillLevel ?? 0,
    refillCount: bottle.refillCount ?? 0,
    returnLabel: bottle.returnLabel as ForeverBottle['returnLabel'] | undefined,
  } as ForeverBottle;
}

/**
 * Get a Forever Bottle by serial number
 */
export async function getForeverBottleBySerial(
  serialNumber: string
): Promise<ForeverBottle | null> {
  const bottle = await db.query.foreverBottles.findFirst({
    where: eq(foreverBottles.serialNumber, serialNumber),
  });

  if (!bottle) return null;

  return {
    ...bottle,
    capacity: '100ml',
    currentFillLevel: bottle.currentFillLevel ?? 0,
    refillCount: bottle.refillCount ?? 0,
    returnLabel: bottle.returnLabel as ForeverBottle['returnLabel'] | undefined,
  } as ForeverBottle;
}

/**
 * Get bottle history/events
 */
export async function getBottleHistory(
  bottleId: string
): Promise<BottleHistoryEvent[]> {
  const history = await db.query.foreverBottleHistory.findMany({
    where: eq(foreverBottleHistory.bottleId, bottleId),
    orderBy: [desc(foreverBottleHistory.timestamp)],
  });

  return history as BottleHistoryEvent[];
}

// ============================================================================
// BOTTLE UPDATES
// ============================================================================

/**
 * Update the fill level of a bottle
 * Used when customer reports usage or after refill
 */
export async function updateBottleFillLevel(
  bottleId: string,
  newLevel: number
): Promise<void> {
  if (newLevel < 0 || newLevel > BOTTLE_CAPACITY_ML) {
    throw new Error(`Fill level must be between 0 and ${BOTTLE_CAPACITY_ML}ml`);
  }

  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  const now = new Date();

  // Determine status based on fill level
  let newStatus: BottleStatus = bottle.status;
  if (newLevel === 0 && bottle.status !== 'in-transit') {
    newStatus = 'empty';
  } else if (newLevel > 0 && bottle.status === 'empty') {
    newStatus = 'active';
  }

  await db
    .update(foreverBottles)
    .set({
      currentFillLevel: newLevel,
      status: newStatus,
      updatedAt: now,
    })
    .where(eq(foreverBottles.id, bottleId));

  // Log the update event
  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId,
    eventType: 'refilled',
    timestamp: now,
    metadata: {
      previousLevel: bottle.currentFillLevel,
      newLevel,
    },
  });

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`bottle-${bottleId}`);
}

/**
 * Update bottle status
 */
export async function updateBottleStatus(
  bottleId: string,
  status: BottleStatus,
  metadata?: Record<string, unknown>
): Promise<void> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  const now = new Date();

  await db
    .update(foreverBottles)
    .set({
      status,
      updatedAt: now,
    })
    .where(eq(foreverBottles.id, bottleId));

  // Map status to event type
  const eventTypeMap: Record<BottleStatus, BottleHistoryEvent['eventType']> = {
    'active': 'refilled',
    'empty': 'refilled',
    'in-transit': 'return-shipped',
    'refilled': 'refilled',
    'retired': 'retired',
  };

  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId,
    eventType: eventTypeMap[status],
    timestamp: now,
    metadata: {
      previousStatus: bottle.status,
      newStatus: status,
      ...metadata,
    },
  });

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`bottle-${bottleId}`);
}

/**
 * Set return label for a bottle
 */
export async function setBottleReturnLabel(
  bottleId: string,
  label: {
    trackingNumber: string;
    generatedAt: string;
    expiresAt: string;
  }
): Promise<void> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  await db
    .update(foreverBottles)
    .set({
      returnLabel: label,
      status: 'in-transit',
      updatedAt: new Date(),
    })
    .where(eq(foreverBottles.id, bottleId));

  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId,
    eventType: 'return-shipped',
    timestamp: new Date(),
    metadata: {
      trackingNumber: label.trackingNumber,
      labelGeneratedAt: label.generatedAt,
      labelExpiresAt: label.expiresAt,
    },
  });

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`bottle-${bottleId}`);
}

/**
 * Increment refill count after successful refill
 */
export async function incrementRefillCount(
  bottleId: string
): Promise<number> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  const newCount = bottle.refillCount + 1;
  const now = new Date();

  await db
    .update(foreverBottles)
    .set({
      refillCount: newCount,
      lastRefillDate: now,
      currentFillLevel: BOTTLE_CAPACITY_ML,
      status: 'refilled',
      updatedAt: now,
    })
    .where(eq(foreverBottles.id, bottleId));

  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId,
    eventType: 'refilled',
    timestamp: now,
    metadata: {
      refillCount: newCount,
      filledTo: BOTTLE_CAPACITY_ML,
    },
  });

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`bottle-${bottleId}`);

  return newCount;
}

// ============================================================================
// BOTTLE RETIREMENT
// ============================================================================

export type RetirementReason = 'damaged' | 'lost' | 'customer-request' | 'max-cycles-reached';

/**
 * Retire a Forever Bottle from circulation
 */
export async function retireBottle(
  bottleId: string,
  reason: RetirementReason,
  notes?: string
): Promise<void> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  if (bottle.status === 'retired') {
    throw new Error('Bottle is already retired');
  }

  const now = new Date();

  await db
    .update(foreverBottles)
    .set({
      status: 'retired',
      currentFillLevel: 0,
      updatedAt: now,
    })
    .where(eq(foreverBottles.id, bottleId));

  await db.insert(foreverBottleHistory).values({
    id: nanoid(),
    bottleId,
    eventType: 'retired',
    timestamp: now,
    metadata: {
      reason,
      notes,
      finalRefillCount: bottle.refillCount,
      totalCycles: bottle.refillCount + 1,
    },
  });

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`bottle-${bottleId}`);
}

/**
 * Check if a bottle should be retired due to max cycles
 */
export async function checkBottleRetirementEligibility(
  bottleId: string
): Promise<{
  shouldRetire: boolean;
  reason?: RetirementReason;
  currentCycles: number;
  maxCycles: number;
}> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  const currentCycles = bottle.refillCount;

  if (currentCycles >= MAX_REFILL_CYCLES) {
    return {
      shouldRetire: true,
      reason: 'max-cycles-reached',
      currentCycles,
      maxCycles: MAX_REFILL_CYCLES,
    };
  }

  return {
    shouldRetire: false,
    currentCycles,
    maxCycles: MAX_REFILL_CYCLES,
  };
}

// ============================================================================
// VALIDATION & HELPERS
// ============================================================================

/**
 * Validate a serial number format
 */
export function isValidSerialNumber(serialNumber: string): boolean {
  const pattern = /^FA-[A-Z0-9]{6}$/;
  return pattern.test(serialNumber);
}

/**
 * Check if a bottle is eligible for refill
 */
export async function isBottleEligibleForRefill(
  bottleId: string
): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  const bottle = await getForeverBottleById(bottleId);
  
  if (!bottle) {
    return { eligible: false, reason: 'Bottle not found' };
  }

  if (bottle.status === 'retired') {
    return { eligible: false, reason: 'Bottle has been retired' };
  }

  if (bottle.status === 'in-transit') {
    return { eligible: false, reason: 'Bottle is already in transit' };
  }

  const retirementCheck = await checkBottleRetirementEligibility(bottleId);
  if (retirementCheck.shouldRetire) {
    return { 
      eligible: false, 
      reason: `Bottle has reached maximum refill cycles (${MAX_REFILL_CYCLES})` 
    };
  }

  return { eligible: true };
}

/**
 * Get environmental impact stats for a bottle
 */
export function getBottleEnvironmentalImpact(
  refillCount: number
): {
  bottlesSaved: number;
  glassRecycledKg: number;
  oilKeptLiters: number;
  treesEquivalent: number;
} {
  // Assumptions:
  // - Each refill saves 1 bottle from landfill
  // - 100ml glass bottle weighs ~200g
  // - Average tree absorbs ~20kg CO2/year
  // - Each bottle production = ~0.5kg CO2

  const bottlesSaved = refillCount;
  const glassRecycledKg = (refillCount * 0.2); // 200g per bottle
  const oilKeptLiters = (refillCount * 0.1); // 100ml per refill
  const treesEquivalent = Math.round((refillCount * 0.5) / 20 * 10) / 10; // 0.5kg CO2 per bottle, tree absorbs 20kg/year

  return {
    bottlesSaved,
    glassRecycledKg: Math.round(glassRecycledKg * 10) / 10,
    oilKeptLiters: Math.round(oilKeptLiters * 10) / 10,
    treesEquivalent,
  };
}
