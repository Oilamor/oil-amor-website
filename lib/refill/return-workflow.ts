/**
 * Return Workflow Management
 * Orchestrates the complete bottle return and refill process
 */

import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { refillOrders, type InsertRefillOrder } from '@/lib/db/schema-refill';
import { eq, sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { logger } from '@/lib/logging/logger';

import {
  type ForeverBottle,
  getForeverBottleById,
  updateBottleStatus,
  setBottleReturnLabel,
  incrementRefillCount,
  isBottleEligibleForRefill,
  checkBottleRetirementEligibility,
  retireBottle,
  type BottleStatus,
} from './forever-bottle';

import {
  type AusPostLabel,
  type Address,
  generateReturnLabel,
  trackReturn,
  verifyBottleReceived,
} from '@/lib/shipping/auspost';

import {
  REFILL_CREDIT_AMOUNT,
  processRefillCredit,
} from './credits';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RefillOrderResult {
  orderId: string;
  returnLabel: AusPostLabel;
  newBottle: ForeverBottle;
}

export interface BottleReturnResult {
  success: boolean;
  bottleId: string;
  customerId: string;
  creditApplied: number;
  refillOrderId?: string;
}

export interface InspectionResult {
  canRefill: boolean;
  cleaningRequired: boolean;
  damageAssessment?: string;
  recommendedAction: 'refill' | 'retire' | 'repair';
}

export interface RefillOrder {
  id: string;
  customerId: string;
  bottleId: string;
  oilType: string;
  status: RefillOrderStatus;
  returnLabel: {
    trackingNumber: string;
    labelUrl: string;
  };
  pricing: {
    standardPrice: number;
    creditApplied: number;
    finalPrice: number;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type RefillOrderStatus = 
  | 'pending-return'
  | 'in-transit'
  | 'received'
  | 'inspecting'
  | 'refilling'
  | 'completed'
  | 'cancelled'
  | 'rejected';

// ============================================================================
// CONSTANTS
// ============================================================================

const STANDARD_REFILL_PRICE = 35;
const EFFECTIVE_REFILL_PRICE = 30; // After $5 credit

// ============================================================================
// REFILL ORDER INITIATION
// ============================================================================

/**
 * Initiate a refill order for a Forever Bottle
 * Creates the order, generates return label, and updates bottle status
 */
export async function initiateRefillOrder(
  customerId: string,
  bottleId: string,
  options?: {
    customerAddress?: Address;
    emailNotification?: boolean;
  }
): Promise<RefillOrderResult> {
  // 1. Validate bottle eligibility
  const eligibility = await isBottleEligibleForRefill(bottleId);
  if (!eligibility.eligible) {
    throw new Error(`Bottle not eligible for refill: ${eligibility.reason}`);
  }

  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  if (bottle.customerId !== customerId) {
    throw new Error('Bottle does not belong to customer');
  }

  // 2. Generate return label
  if (!options?.customerAddress) {
    throw new Error('Customer address is required to generate return label');
  }

  const returnLabel = await generateReturnLabel(
    options.customerAddress,
    bottleId,
    {
      shipmentReference: `REFILL-${bottleId.slice(0, 8)}`,
      emailNotification: options.emailNotification ?? true,
    }
  );

  // 3. Update bottle with return label and status
  await setBottleReturnLabel(bottleId, {
    trackingNumber: returnLabel.trackingNumber,
    generatedAt: new Date().toISOString(),
    expiresAt: returnLabel.expiresAt instanceof Date ? returnLabel.expiresAt.toISOString() : returnLabel.expiresAt,
  });

  // 4. Create refill order record
  const orderId = nanoid();
  const now = new Date();

  const refillOrderData: InsertRefillOrder = {
    id: orderId,
    customerId,
    bottleId,
    oilType: bottle.oilType,
    status: 'pending-return',
    returnLabel: {
      trackingNumber: returnLabel.trackingNumber,
      labelUrl: returnLabel.labelUrl,
    },
    pricing: {
      standardPrice: STANDARD_REFILL_PRICE,
      creditApplied: REFILL_CREDIT_AMOUNT,
      finalPrice: EFFECTIVE_REFILL_PRICE,
    },
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(refillOrders).values(refillOrderData);

  // 5. Revalidate caches
  revalidateTag(`customer-bottles-${customerId}`);
  revalidateTag(`refill-orders-${customerId}`);

  return {
    orderId,
    returnLabel,
    newBottle: bottle,
  };
}

// ============================================================================
// BOTTLE RETURN PROCESSING
// ============================================================================

/**
 * Process a returned bottle when tracking shows delivered
 * Applies credit and updates order status
 */
export async function processBottleReturn(
  trackingNumber: string,
  options?: {
    autoApplyCredit?: boolean;
    skipInspection?: boolean;
  }
): Promise<BottleReturnResult> {
  // 1. Find the refill order by tracking number
  const order = await db.query.refillOrders.findFirst({
    where: sql`${refillOrders.returnLabel}->>'trackingNumber' = ${trackingNumber}`,
  });

  if (!order) {
    throw new Error(`No refill order found for tracking number: ${trackingNumber}`);
  }

  // 2. Verify bottle was delivered
  const isDelivered = await verifyBottleReceived(trackingNumber);
  if (!isDelivered) {
    throw new Error('Bottle has not been delivered yet');
  }

  // 3. Update order status
  await db
    .update(refillOrders)
    .set({
      status: options?.skipInspection ? 'refilling' : 'received',
      updatedAt: new Date(),
    })
    .where(eq(refillOrders.id, order.id));

  // 4. Update bottle status
  await updateBottleStatus(order.bottleId, 'refilled', {
    trackingNumber,
    receivedAt: new Date().toISOString(),
  });

  // 5. Apply credit only if explicitly requested (to avoid double-crediting with inspection)
  let creditApplied = 0;
  if (options?.autoApplyCredit === true) {
    const creditResult = await processRefillCredit(
      order.customerId,
      order.bottleId,
      trackingNumber
    );
    creditApplied = creditResult.creditApplied;
  }

  // 6. Revalidate caches
  revalidateTag(`customer-bottles-${order.customerId}`);
  revalidateTag(`refill-orders-${order.customerId}`);

  return {
    success: true,
    bottleId: order.bottleId,
    customerId: order.customerId,
    creditApplied,
    refillOrderId: order.id,
  };
}

/**
 * Mark a return as received manually (for admin use)
 */
export async function manuallyMarkReturned(
  trackingNumber: string,
  adminId: string
): Promise<BottleReturnResult> {
  const order = await db.query.refillOrders.findFirst({
    where: sql`${refillOrders.returnLabel}->>'trackingNumber' = ${trackingNumber}`,
  });

  if (!order) {
    throw new Error(`No refill order found for tracking number: ${trackingNumber}`);
  }

  // Update order status
  await db
    .update(refillOrders)
    .set({
      status: 'received',
      updatedAt: new Date(),
      metadata: {
        manuallyMarkedBy: adminId,
        markedAt: new Date().toISOString(),
      },
    })
    .where(eq(refillOrders.id, order.id));

  // Update bottle status
  await updateBottleStatus(order.bottleId, 'refilled');

  // Apply credit
  const creditResult = await processRefillCredit(
    order.customerId,
    order.bottleId,
    trackingNumber
  );

  revalidateTag(`customer-bottles-${order.customerId}`);
  revalidateTag(`refill-orders-${order.customerId}`);

  return {
    success: true,
    bottleId: order.bottleId,
    customerId: order.customerId,
    creditApplied: creditResult.creditApplied,
    refillOrderId: order.id,
  };
}

// ============================================================================
// BOTTLE INSPECTION
// ============================================================================

/**
 * Inspect a returned bottle and determine if it can be refilled
 */
export async function inspectReturnedBottle(
  bottleId: string,
  inspectionData: {
    cracks: boolean;
    chips: boolean;
    labelCondition: 'good' | 'fair' | 'poor';
    capCondition: 'good' | 'fair' | 'poor';
    cleanliness: 'clean' | 'needs-cleaning' | 'requires-deep-clean';
    notes?: string;
    inspectorId: string;
  }
): Promise<InspectionResult> {
  const bottle = await getForeverBottleById(bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  const order = await db.query.refillOrders.findFirst({
    where: eq(refillOrders.bottleId, bottleId),
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });

  if (!order) {
    throw new Error('No refill order found for this bottle');
  }

  // Update order status to inspecting
  await db
    .update(refillOrders)
    .set({
      status: 'inspecting',
      updatedAt: new Date(),
    })
    .where(eq(refillOrders.id, order.id));

  // Determine refill eligibility based on inspection
  const { cracks, chips, labelCondition, capCondition, cleanliness, notes, inspectorId } = inspectionData;

  let canRefill = true;
  let damageAssessment: string | undefined;
  let recommendedAction: InspectionResult['recommendedAction'] = 'refill';

  // Critical damage checks
  if (cracks) {
    canRefill = false;
    damageAssessment = 'Critical: Bottle has cracks';
    recommendedAction = 'retire';
  } else if (chips) {
    canRefill = false;
    damageAssessment = 'Critical: Bottle has chips';
    recommendedAction = 'retire';
  }

  // Check label and cap condition
  if (labelCondition === 'poor' || capCondition === 'poor') {
    canRefill = false;
    damageAssessment = damageAssessment || 'Component condition too poor for safe refill';
    recommendedAction = 'retire';
  }

  // Check refill count
  const retirementCheck = await checkBottleRetirementEligibility(bottleId);
  if (retirementCheck.shouldRetire) {
    canRefill = false;
    damageAssessment = damageAssessment || `Maximum refill cycles (${retirementCheck.maxCycles}) reached`;
    recommendedAction = 'retire';
  }

  // Determine if cleaning is required
  const cleaningRequired = cleanliness !== 'clean';

  const result: InspectionResult = {
    canRefill,
    cleaningRequired,
    damageAssessment,
    recommendedAction,
  };

  // Update order with inspection results
  await db
    .update(refillOrders)
    .set({
      status: canRefill ? 'refilling' : 'rejected',
      inspectionResult: {
        ...inspectionData,
        canRefill,
        cleaningRequired,
        inspectedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(refillOrders.id, order.id));

  // If bottle can't be refilled, retire it
  if (!canRefill && recommendedAction === 'retire') {
    await retireBottle(bottleId, 'damaged', damageAssessment);
  }

  revalidateTag(`customer-bottles-${bottle.customerId}`);
  revalidateTag(`refill-orders-${bottle.customerId}`);

  return result;
}

// ============================================================================
// REFILL COMPLETION
// ============================================================================

/**
 * Complete a refill order after bottle has been refilled
 */
export async function completeRefillOrder(
  orderId: string,
  options?: {
    newFillLevel?: number;
    notes?: string;
  }
): Promise<{
  success: boolean;
  bottleId: string;
  newRefillCount: number;
}> {
  const order = await db.query.refillOrders.findFirst({
    where: eq(refillOrders.id, orderId),
  });

  if (!order) {
    throw new Error('Refill order not found');
  }

  if (order.status !== 'refilling') {
    throw new Error(`Cannot complete order with status: ${order.status}`);
  }

  const bottle = await getForeverBottleById(order.bottleId);
  if (!bottle) {
    throw new Error('Bottle not found');
  }

  // Increment refill count
  const newRefillCount = await incrementRefillCount(order.bottleId);

  // Update order status
  await db
    .update(refillOrders)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...(order.metadata || {}),
        completionNotes: options?.notes,
        fillLevel: options?.newFillLevel ?? 100,
      },
    })
    .where(eq(refillOrders.id, orderId));

  // Update bottle status back to active
  await updateBottleStatus(order.bottleId, 'active', {
    refillCompleted: true,
    orderId,
    newRefillCount,
  });

  revalidateTag(`customer-bottles-${order.customerId}`);
  revalidateTag(`refill-orders-${order.customerId}`);

  return {
    success: true,
    bottleId: order.bottleId,
    newRefillCount,
  };
}

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * Get all refill orders for a customer
 */
export async function getCustomerRefillOrders(
  customerId: string
): Promise<RefillOrder[]> {
  const orders = await db.query.refillOrders.findMany({
    where: eq(refillOrders.customerId, customerId),
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });

  return orders.map((order) => ({
    ...order,
    returnLabel: order.returnLabel as RefillOrder['returnLabel'],
    pricing: order.pricing as RefillOrder['pricing'],
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
  }));
}

/**
 * Get refill order by ID
 */
export async function getRefillOrderById(
  orderId: string
): Promise<RefillOrder | null> {
  const order = await db.query.refillOrders.findFirst({
    where: eq(refillOrders.id, orderId),
  });

  if (!order) return null;

  return {
    ...order,
    returnLabel: order.returnLabel as RefillOrder['returnLabel'],
    pricing: order.pricing as RefillOrder['pricing'],
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
  };
}

/**
 * Cancel a refill order
 */
export async function cancelRefillOrder(
  orderId: string,
  reason: string
): Promise<boolean> {
  const order = await getRefillOrderById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  // Can only cancel pending or in-transit orders
  if (!['pending-return', 'in-transit'].includes(order.status)) {
    throw new Error(`Cannot cancel order with status: ${order.status}`);
  }

  await db
    .update(refillOrders)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
      metadata: {
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
      },
    })
    .where(eq(refillOrders.id, orderId));

  // Update bottle status back to active
  const bottle = await getForeverBottleById(order.bottleId);
  if (bottle && bottle.status === 'in-transit') {
    await updateBottleStatus(order.bottleId, 'active', {
      orderCancelled: true,
      reason,
    });
  }

  revalidateTag(`customer-bottles-${order.customerId}`);
  revalidateTag(`refill-orders-${order.customerId}`);

  return true;
}

/**
 * Get incoming returns (for admin dashboard)
 */
export async function getIncomingReturns(
  status?: 'pending-return' | 'in-transit' | 'received' | 'inspecting'
): Promise<Array<RefillOrder & { bottle: ForeverBottle }>> {
  const whereClause = status 
    ? eq(refillOrders.status, status)
    : undefined;

  const orders = await db.query.refillOrders.findMany({
    where: whereClause,
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    with: {
      bottle: true,
    },
  });

  return orders.map((order) => ({
    ...order,
    returnLabel: order.returnLabel as RefillOrder['returnLabel'],
    pricing: order.pricing as RefillOrder['pricing'],
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
    bottle: order.bottle as ForeverBottle,
  }));
}

// ============================================================================
// TRACKING
// ============================================================================

/**
 * Update tracking status for all in-transit orders
 * Should be called by a scheduled job or webhook
 */
export async function updateInTransitOrders(): Promise<{
  updated: number;
  delivered: number;
}> {
  const inTransitOrders = await db.query.refillOrders.findMany({
    where: eq(refillOrders.status, 'in-transit'),
  });

  let updated = 0;
  let delivered = 0;

  for (const order of inTransitOrders) {
    try {
      const tracking = await trackReturn(order.returnLabel.trackingNumber);
      
      if (tracking.status === 'delivered') {
        await processBottleReturn(order.returnLabel.trackingNumber, { autoApplyCredit: false });
        delivered++;
      } else if (tracking.status === 'in-transit') {
        // Update to ensure status is current
        await db
          .update(refillOrders)
          .set({ updatedAt: new Date() })
          .where(eq(refillOrders.id, order.id));
        updated++;
      }
    } catch (error) {
      logger.error(`Failed to update tracking for ${order.returnLabel.trackingNumber}`, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return { updated, delivered };
}
