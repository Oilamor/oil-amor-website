/**
 * Refill Eligibility Engine
 * Determines if customers and bottles are eligible for the refill program
 */

import { db } from '@/lib/db';
import { customers, orders, foreverBottles } from '@/lib/db/schema-refill';
import { eq, and, desc, sql } from 'drizzle-orm';

import {
  type ForeverBottle,
  getCustomerForeverBottles,
  isBottleEligibleForRefill,
} from './forever-bottle';

import {
  getCreditSummary,
  validateCreditUsage,
} from './credits';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RefillEligibility {
  canRefill: boolean;
  reason?: string;
  availableBottles: ForeverBottle[];
  /** All prices are integer cents (AUD) — divide by 100 at display boundaries */
  pricing: {
    standardPrice: number;
    discountedPrice: number;
    creditApplied: number;
    finalPrice: number;
    availableCredits: number;
  };
  customerStatus: {
    isUnlocked: boolean;
    unlockRequirement: string;
    bottlesOwned: number;
    totalRefills: number;
  };
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  metadata?: {
    refillUnlocked?: boolean;
    unlockDate?: string;
    firstPurchaseDate?: string;
  };
  createdAt: Date;
}

export interface EligibilityCheckInput {
  customerId: string;
  oilType?: string;
  bottleId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const REFILL_RULES = {
  // Customer must have purchased at least one 30ml bottle
  unlockRequirement: 'has-purchased-30ml',
  
  // Forever Bottles are 100ml only
  foreverBottleSize: '100ml',
  
  // ALL PRICES ARE INTEGER CENTS (AUD).
  // Convert to dollars only at display/checkout boundaries (divide by 100).
  // This matches the customer_credits / credit_transactions unit (cents).
  
  // Standard price for refill ($35.00)
  standardRefillPrice: 3500,
  
  // Credit applied when bottle returned ($5.00 — equals REFILL_CREDIT_AMOUNT)
  returnCreditAmount: 500,
  
  // Effective price after credit ($30.00)
  effectiveRefillPrice: 3000,
  
  // Return label expires after 30 days
  labelExpiryDays: 30,
  
  // Credit expires after 12 months
  creditExpiryMonths: 12,
  
  // Maximum refills per bottle before mandatory retirement
  maxRefillCycles: 50,
  
  // Bottles inspected every 10 refills
  inspectionFrequency: 10,
} as const;

// ============================================================================
// CUSTOMER ELIGIBILITY
// ============================================================================

/**
 * Check if a customer has unlocked the refill program
 * Requirement: Must have purchased at least one 30ml bottle
 */
export async function isRefillUnlocked(
  customer: Customer | string
): Promise<boolean> {
  const customerId = typeof customer === 'string' ? customer : customer.id;

  // Check customer metadata first
  if (typeof customer !== 'string' && customer.metadata?.refillUnlocked) {
    return true;
  }

  // Check database
  const customerRecord = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (customerRecord?.metadata?.refillUnlocked) {
    return true;
  }

  // Check for 30ml bottle purchase
  const has30mlPurchase = await check30mlPurchase(customerId);
  
  if (has30mlPurchase) {
    // Auto-unlock if they have the purchase
    await unlockRefillForCustomer(customerId);
    return true;
  }

  return false;
}

/**
 * Check if customer has purchased a 30ml bottle.
 * Matches orders stamped with metadata.has30mlBottle (written by order
 * completion) as well as orders whose line items reference a 30ml product
 * (covers orders placed before the metadata writer existed).
 */
async function check30mlPurchase(customerId: string): Promise<boolean> {
  const purchase = await db.query.orders.findFirst({
    where: and(
      eq(orders.customerId, customerId),
      sql`(
        ${orders.metadata}->>'has30mlBottle' = 'true'
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(${orders.items}) AS item
          WHERE item->>'name' ILIKE '%30ml%'
             OR item->>'size' = '30ml'
        )
      )`
    ),
  });

  return !!purchase;
}

/**
 * Unlock refill program for a customer
 */
export async function unlockRefillForCustomer(
  customerId: string
): Promise<void> {
  const now = new Date();

  await db
    .update(customers)
    .set({
      metadata: sql`jsonb_set(
        coalesce(metadata, '{}'::jsonb),
        '{refillUnlocked}',
        'true'::jsonb
      )`,
      updatedAt: now,
    })
    .where(eq(customers.id, customerId));

  // Record unlock event
  await db
    .update(customers)
    .set({
      metadata: sql`jsonb_set(
        metadata,
        '{unlockDate}',
        ${JSON.stringify(now.toISOString())}::jsonb
      )`,
    })
    .where(eq(customers.id, customerId));
}

/**
 * Lock refill program for a customer (admin use)
 */
export async function lockRefillForCustomer(
  customerId: string,
  reason: string
): Promise<void> {
  await db
    .update(customers)
    .set({
      metadata: sql`jsonb_set(
        jsonb_set(metadata, '{refillUnlocked}', 'false'::jsonb),
        '{lockReason}',
        ${JSON.stringify(reason)}::jsonb
      )`,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));
}

// ============================================================================
// REFILL ELIGIBILITY CHECK
// ============================================================================

/**
 * Check if customer is eligible to place a refill order
 */
export async function checkRefillEligibility(
  customerId: string,
  oilType?: string
): Promise<RefillEligibility> {
  // 1. Check if customer exists and is unlocked
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) {
    return {
      canRefill: false,
      reason: 'Customer not found',
      availableBottles: [],
      pricing: getDefaultPricing(),
      customerStatus: {
        isUnlocked: false,
        unlockRequirement: REFILL_RULES.unlockRequirement,
        bottlesOwned: 0,
        totalRefills: 0,
      },
    };
  }

  // 2. Check refill unlock status
  const isUnlocked = await isRefillUnlocked({
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    metadata: customer.metadata as Customer['metadata'],
    createdAt: new Date(customer.createdAt),
  });

  if (!isUnlocked) {
    return {
      canRefill: false,
      reason: 'Refill program not unlocked. Purchase a 30ml bottle to unlock.',
      availableBottles: [],
      pricing: getDefaultPricing(),
      customerStatus: {
        isUnlocked: false,
        unlockRequirement: REFILL_RULES.unlockRequirement,
        bottlesOwned: 0,
        totalRefills: 0,
      },
    };
  }

  // 3. Get customer's forever bottles
  const allBottles = await getCustomerForeverBottles(customerId);

  // 4. Filter for eligible bottles
  const eligibleBottles: ForeverBottle[] = [];
  const ineligibleReasons: string[] = [];

  for (const bottle of allBottles) {
    // Filter by oil type if specified
    if (oilType && bottle.oilType !== oilType) {
      continue;
    }

    const eligibility = await isBottleEligibleForRefill(bottle.id);
    
    if (eligibility.eligible) {
      eligibleBottles.push(bottle);
    } else {
      ineligibleReasons.push(`${bottle.serialNumber}: ${eligibility.reason}`);
    }
  }

  // 5. Calculate pricing
  const creditValidation = await validateCreditUsage(
    customerId,
    REFILL_RULES.returnCreditAmount
  );

  const pricing: RefillEligibility['pricing'] = {
    standardPrice: REFILL_RULES.standardRefillPrice,
    discountedPrice: REFILL_RULES.effectiveRefillPrice,
    creditApplied: REFILL_RULES.returnCreditAmount,
    finalPrice: REFILL_RULES.effectiveRefillPrice,
    availableCredits: creditValidation.availableBalance,
  };

  // If customer has credits, adjust final price
  if (creditValidation.availableBalance > 0) {
    const creditToApply = Math.min(
      creditValidation.availableBalance,
      REFILL_RULES.effectiveRefillPrice
    );
    pricing.finalPrice = REFILL_RULES.effectiveRefillPrice - creditToApply;
  }

  // 6. Calculate customer stats
  const totalRefills = allBottles.reduce(
    (sum, bottle) => sum + bottle.refillCount,
    0
  );

  // 7. Determine final eligibility
  if (eligibleBottles.length === 0) {
    return {
      canRefill: false,
      reason: ineligibleReasons[0] || 'No eligible bottles found',
      availableBottles: [],
      pricing,
      customerStatus: {
        isUnlocked: true,
        unlockRequirement: REFILL_RULES.unlockRequirement,
        bottlesOwned: allBottles.length,
        totalRefills,
      },
    };
  }

  return {
    canRefill: true,
    availableBottles: eligibleBottles,
    pricing,
    customerStatus: {
      isUnlocked: true,
      unlockRequirement: REFILL_RULES.unlockRequirement,
      bottlesOwned: allBottles.length,
      totalRefills,
    },
  };
}

/**
 * Check eligibility for a specific bottle
 */
export async function checkBottleRefillEligibility(
  customerId: string,
  bottleId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  bottle?: ForeverBottle;
  pricing: RefillEligibility['pricing'];
}> {
  // First check customer eligibility
  const customerEligibility = await checkRefillEligibility(customerId);

  if (!customerEligibility.canRefill) {
    return {
      eligible: false,
      reason: customerEligibility.reason,
      pricing: customerEligibility.pricing,
    };
  }

  // Find the specific bottle
  const bottle = customerEligibility.availableBottles.find(
    (b) => b.id === bottleId
  );

  if (!bottle) {
    return {
      eligible: false,
      reason: 'Bottle not found or not eligible for refill',
      pricing: customerEligibility.pricing,
    };
  }

  return {
    eligible: true,
    bottle,
    pricing: customerEligibility.pricing,
  };
}

// ============================================================================
// PRICING HELPERS
// ============================================================================

function getDefaultPricing(): RefillEligibility['pricing'] {
  return {
    standardPrice: REFILL_RULES.standardRefillPrice,
    discountedPrice: REFILL_RULES.effectiveRefillPrice,
    creditApplied: REFILL_RULES.returnCreditAmount,
    finalPrice: REFILL_RULES.effectiveRefillPrice,
    availableCredits: 0,
  };
}

/**
 * Calculate final price with credits
 */
export function calculateFinalPrice(
  availableCredits: number,
  useCredits: boolean = true
): {
  basePrice: number;
  creditDiscount: number;
  finalPrice: number;
} {
  const basePrice = REFILL_RULES.effectiveRefillPrice;
  
  if (!useCredits || availableCredits <= 0) {
    return {
      basePrice,
      creditDiscount: 0,
      finalPrice: basePrice,
    };
  }

  const creditDiscount = Math.min(availableCredits, basePrice);
  
  return {
    basePrice,
    creditDiscount,
    finalPrice: basePrice - creditDiscount,
  };
}

// ============================================================================
// BULK ELIGIBILITY
// ============================================================================

/**
 * Get eligibility status for multiple customers (admin)
 */
export async function getBulkEligibilityStatus(
  customerIds: string[]
): Promise<Array<{
  customerId: string;
  isUnlocked: boolean;
  bottlesOwned: number;
  eligibleBottles: number;
}>> {
  const results = await Promise.all(
    customerIds.map(async (customerId) => {
      const eligibility = await checkRefillEligibility(customerId);
      return {
        customerId,
        isUnlocked: eligibility.customerStatus.isUnlocked,
        bottlesOwned: eligibility.customerStatus.bottlesOwned,
        eligibleBottles: eligibility.availableBottles.length,
      };
    })
  );

  return results;
}

/**
 * Get customers eligible for refill program unlock
 * (those with 30ml purchase but not yet unlocked)
 */
export async function getPendingUnlocks(): Promise<Array<{
  customerId: string;
  email: string;
  firstPurchaseDate: Date;
}>> {
  const customersWith30ml = await db.query.orders.findMany({
    where: sql`(
      ${orders.metadata}->>'has30mlBottle' = 'true'
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(${orders.items}) AS item
        WHERE item->>'name' ILIKE '%30ml%'
           OR item->>'size' = '30ml'
      )
    )`,
    with: {
      customer: true,
    },
  });

  const pendingUnlocks = [];

  for (const order of customersWith30ml) {
    if (!order.customer) continue;
    
    const isUnlocked = await isRefillUnlocked({
      id: order.customer.id,
      email: order.customer.email,
      firstName: order.customer.firstName || '',
      lastName: order.customer.lastName || '',
      metadata: order.customer.metadata as Customer['metadata'],
      createdAt: new Date(order.customer.createdAt),
    });

    if (!isUnlocked) {
      pendingUnlocks.push({
        customerId: order.customer.id,
        email: order.customer.email,
        firstPurchaseDate: new Date(order.createdAt),
      });
    }
  }

  return pendingUnlocks;
}

// ============================================================================
// ELIGIBILITY RULES ACCESS
// ============================================================================

/**
 * Get refill program rules
 */
export function getRefillRules(): typeof REFILL_RULES {
  return { ...REFILL_RULES };
}

/**
 * Check if customer meets unlock requirement without unlocking
 */
export async function previewUnlockEligibility(
  customerId: string
): Promise<{
  meetsRequirement: boolean;
  requirement: string;
  qualifyingPurchase?: {
    orderId: string;
    purchaseDate: Date;
    productName: string;
  };
}> {
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.customerId, customerId),
      sql`(
        ${orders.metadata}->>'has30mlBottle' = 'true'
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(${orders.items}) AS item
          WHERE item->>'name' ILIKE '%30ml%'
             OR item->>'size' = '30ml'
        )
      )`
    ),
    orderBy: [desc(orders.createdAt)],
  });

  if (order) {
    return {
      meetsRequirement: true,
      requirement: REFILL_RULES.unlockRequirement,
      qualifyingPurchase: {
        orderId: order.id,
        purchaseDate: new Date(order.createdAt),
        productName: (order.metadata as Record<string, string>)?.productName || '30ml Essential Oil',
      },
    };
  }

  return {
    meetsRequirement: false,
    requirement: REFILL_RULES.unlockRequirement,
  };
}
