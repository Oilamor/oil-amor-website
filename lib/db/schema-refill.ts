/**
 * Database Schema for Oil Amor Refill Program
 * 
 * This file contains the Drizzle ORM schema definitions for:
 * - Forever Bottles
 * - Refill Orders
 * - Credit Transactions
 * - Australia Post Shipments
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const bottleStatusEnum = pgEnum('bottle_status', [
  'active',
  'empty',
  'in-transit',
  'refilled',
  'retired',
]);

export const refillOrderStatusEnum = pgEnum('refill_order_status', [
  'pending-return',
  'in-transit',
  'received',
  'inspecting',
  'refilling',
  'completed',
  'cancelled',
  'rejected',
]);

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'earned',
  'used',
  'expired',
  'adjusted',
]);

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'pending',
  'in-transit',
  'delivered',
  'exception',
  'cancelled',
]);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Forever Bottles
 * Tracks all refillable bottles owned by customers
 */
export const foreverBottles = pgTable(
  'forever_bottles',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    serialNumber: text('serial_number').notNull().unique(),
    oilType: text('oil_type').notNull(),
    capacity: text('capacity').notNull().default('100ml'),
    purchaseDate: timestamp('purchase_date', { mode: 'date' }).notNull(),
    status: bottleStatusEnum('status').notNull().default('active'),
    currentFillLevel: integer('current_fill_level').notNull().default(100),
    refillCount: integer('refill_count').notNull().default(0),
    lastRefillDate: timestamp('last_refill_date', { mode: 'date' }),
    returnLabel: jsonb('return_label').$type<{
      trackingNumber: string;
      generatedAt: string;
      expiresAt: string;
    }>(),
    metadata: jsonb('metadata').$type<{
      orderId: string;
      productVariantId: string;
      purchasePrice: number;
    }>(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdIdx: index('bottle_customer_id_idx').on(table.customerId),
    serialNumberIdx: index('bottle_serial_number_idx').on(table.serialNumber),
    statusIdx: index('bottle_status_idx').on(table.status),
  })
);

/**
 * Forever Bottle History
 * Audit trail of all bottle events
 */
export const foreverBottleHistory = pgTable(
  'forever_bottle_history',
  {
    id: text('id').primaryKey(),
    bottleId: text('bottle_id')
      .notNull()
      .references(() => foreverBottles.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(), // 'purchased', 'refill-ordered', 'return-shipped', 'received', 'inspected', 'refilled', 'retired'
    timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    bottleIdIdx: index('history_bottle_id_idx').on(table.bottleId),
    eventTypeIdx: index('history_event_type_idx').on(table.eventType),
    timestampIdx: index('history_timestamp_idx').on(table.timestamp),
  })
);

/**
 * Refill Orders
 * Tracks the complete refill workflow
 */
export const refillOrders = pgTable(
  'refill_orders',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    bottleId: text('bottle_id')
      .notNull()
      .references(() => foreverBottles.id, { onDelete: 'cascade' }),
    oilType: text('oil_type').notNull(),
    status: refillOrderStatusEnum('status').notNull().default('pending-return'),
    returnLabel: jsonb('return_label').notNull().$type<{
      trackingNumber: string;
      labelUrl: string;
    }>(),
    pricing: jsonb('pricing').notNull().$type<{
      standardPrice: number;
      creditApplied: number;
      finalPrice: number;
    }>(),
    inspectionResult: jsonb('inspection_result').$type<{
      cracks: boolean;
      chips: boolean;
      labelCondition: string;
      capCondition: string;
      cleanliness: string;
      canRefill: boolean;
      cleaningRequired: boolean;
      notes?: string;
      inspectorId: string;
      inspectedAt: string;
    }>(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (table) => ({
    customerIdIdx: index('order_customer_id_idx').on(table.customerId),
    bottleIdIdx: index('order_bottle_id_idx').on(table.bottleId),
    statusIdx: index('order_status_idx').on(table.status),
    createdAtIdx: index('order_created_at_idx').on(table.createdAt),
  })
);

/**
 * Customer Credits
 * Tracks credit balances per customer
 */
export const customerCredits = pgTable(
  'customer_credits',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull().unique(),
    balance: integer('balance').notNull().default(0), // Stored in cents
    totalEarned: integer('total_earned').notNull().default(0),
    totalUsed: integer('total_used').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdIdx: index('credit_customer_id_idx').on(table.customerId),
  })
);

/**
 * Credit Transactions
 * Audit trail of all credit movements
 */
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').notNull(),
    type: creditTransactionTypeEnum('type').notNull(),
    amount: integer('amount').notNull(), // Stored in cents, negative for deductions
    balance: integer('balance').notNull(), // Balance after transaction
    description: text('description').notNull(),
    metadata: jsonb('metadata').$type<{
      bottleId?: string;
      blendId?: string;
      trackingNumber?: string;
      orderId?: string;
      adminId?: string;
      reason?: string;
      creditAmount?: number;
      amountUsed?: number;
      previousBalance?: number;
      originalTransactionId?: string;
      originalCommissionId?: string;
      expiredAt?: string;
      commissionRate?: number;
    }>(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
  },
  (table) => ({
    customerIdIdx: index('transaction_customer_id_idx').on(table.customerId),
    typeIdx: index('transaction_type_idx').on(table.type),
    createdAtIdx: index('transaction_created_at_idx').on(table.createdAt),
    expiresAtIdx: index('transaction_expires_at_idx').on(table.expiresAt),
  })
);

/**
 * Australia Post Shipments
 * Tracks all shipments created via AusPost API
 */
export const ausPostShipments = pgTable(
  'auspost_shipments',
  {
    id: text('id').primaryKey(),
    bottleId: text('bottle_id')
      .notNull()
      .references(() => foreverBottles.id, { onDelete: 'cascade' }),
    trackingNumber: text('tracking_number').notNull().unique(),
    shipmentId: text('shipment_id').notNull(),
    labelUrl: text('label_url').notNull(),
    status: shipmentStatusEnum('status').notNull().default('pending'),
    fromAddress: jsonb('from_address').notNull(),
    toAddress: jsonb('to_address').notNull(),
    lastEvent: jsonb('last_event').$type<{
      timestamp: string;
      status: string;
      location?: string;
      description?: string;
    }>(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    bottleIdIdx: index('shipment_bottle_id_idx').on(table.bottleId),
    trackingNumberIdx: index('shipment_tracking_number_idx').on(table.trackingNumber),
    statusIdx: index('shipment_status_idx').on(table.status),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const foreverBottlesRelations = relations(foreverBottles, ({ many }) => ({
  history: many(foreverBottleHistory),
  orders: many(refillOrders),
  shipments: many(ausPostShipments),
}));

export const foreverBottleHistoryRelations = relations(foreverBottleHistory, ({ one }) => ({
  bottle: one(foreverBottles, {
    fields: [foreverBottleHistory.bottleId],
    references: [foreverBottles.id],
  }),
}));

export const refillOrdersRelations = relations(refillOrders, ({ one }) => ({
  bottle: one(foreverBottles, {
    fields: [refillOrders.bottleId],
    references: [foreverBottles.id],
  }),
}));

export const ausPostShipmentsRelations = relations(ausPostShipments, ({ one }) => ({
  bottle: one(foreverBottles, {
    fields: [ausPostShipments.bottleId],
    references: [foreverBottles.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ForeverBottle = typeof foreverBottles.$inferSelect;
export type InsertForeverBottle = typeof foreverBottles.$inferInsert;

export type ForeverBottleHistory = typeof foreverBottleHistory.$inferSelect;
export type InsertForeverBottleHistory = typeof foreverBottleHistory.$inferInsert;

export type RefillOrder = typeof refillOrders.$inferSelect;
export type InsertRefillOrder = typeof refillOrders.$inferInsert;

export type CustomerCredit = typeof customerCredits.$inferSelect;
export type InsertCustomerCredit = typeof customerCredits.$inferInsert;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

export type AusPostShipment = typeof ausPostShipments.$inferSelect;
export type InsertAusPostShipment = typeof ausPostShipments.$inferInsert;

/**
 * Inventory Items
 * Tracks stock levels for oils, bottles, crystals, cords, and caps
 */
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: text('id').primaryKey(),
    sku: text('sku').notNull().unique(),
    name: text('name').notNull(),
    category: text('category').notNull(), // 'oil', 'bottle', 'crystal', 'cord', 'cap'
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    reorderPoint: integer('reorder_point').notNull().default(0),
    metadata: jsonb('metadata').$type<{
      oilId?: string;
      bottleSize?: string;
      crystalId?: string;
      cordId?: string;
    }>(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    skuIdx: index('inventory_sku_idx').on(table.sku),
    categoryIdx: index('inventory_category_idx').on(table.category),
  })
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// ============================================================================
// PLACEHOLDER TABLES (for eligibility.ts compatibility)
// ============================================================================

import { pgTable as pgTableCore, text as textCore, timestamp as timestampCore, jsonb as jsonbCore, index as indexCore, boolean as booleanCore, integer as integerCore } from 'drizzle-orm/pg-core';

export const customers = pgTableCore(
  'customers',
  {
    id: textCore('id').primaryKey(),
    email: textCore('email').notNull().unique(),
    firstName: textCore('first_name'),
    lastName: textCore('last_name'),
    phone: textCore('phone'),
    metadata: jsonbCore('metadata').$type<Record<string, any>>(),
    createdAt: timestampCore('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestampCore('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: indexCore('customer_email_idx').on(table.email),
  })
);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'processing',
  'blending',
  'quality-check',
  'ready-to-ship',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially-refunded',
]);

export const orders = pgTableCore(
  'orders',
  {
    id: textCore('id').primaryKey(),
    customerId: textCore('customer_id').notNull().references(() => customers.id),
    customerEmail: textCore('customer_email').notNull(),
    customerName: textCore('customer_name').notNull(),
    isGuest: booleanCore('is_guest').notNull().default(false),
    
    status: orderStatusEnum('status').notNull().default('pending'),
    statusHistory: jsonbCore('status_history').$type<{
      status: string;
      timestamp: string;
      note?: string;
      changedBy?: string;
    }[]>(),
    
    items: jsonbCore('items').$type<{
      id: string;
      type: string;
      productId?: string;
      variantId?: string;
      sku?: string;
      name: string;
      description?: string;
      image?: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      taxAmount: number;
      total: number;
      attachment?: {
        type: 'cord' | 'charm' | 'none';
        cordId?: string;
        cordName?: string;
        charmId?: string;
        charmName?: string;
        isMysteryCharm: boolean;
        price: number;
      };
      customMix?: {
        recipeName: string;
        mode: 'pure' | 'carrier';
        oils: { oilId: string; oilName: string; ml: number; percentage: number }[];
        carrierRatio?: number;
        totalVolume: number;
        safetyScore: number;
        safetyRating: string;
        safetyWarnings: string[];
      };
      blendId?: string;
      unlocksOilId?: string;
    }[]>(),
    
    subtotal: integerCore('subtotal').notNull().default(0),
    taxTotal: integerCore('tax_total').notNull().default(0),
    shippingTotal: integerCore('shipping_total').notNull().default(0),
    discountTotal: integerCore('discount_total').notNull().default(0),
    storeCreditUsed: integerCore('store_credit_used').notNull().default(0),
    giftCardUsed: integerCore('gift_card_used').notNull().default(0),
    total: integerCore('total').notNull().default(0),
    
    currency: textCore('currency').notNull().default('AUD'),
    
    payment: jsonbCore('payment').$type<{
      method: string;
      transactionId?: string;
      status: string;
      paidAt?: string;
      refundedAt?: string;
      refundAmount?: number;
    }>(),
    
    shippingAddress: jsonbCore('shipping_address').$type<{
      firstName: string;
      lastName: string;
      email?: string;
      company?: string;
      address1: string;
      address2?: string;
      city: string;
      province: string;
      country: string;
      zip: string;
      phone?: string;
    }>(),
    
    shipping: jsonbCore('shipping').$type<{
      carrier: string;
      service: string;
      cost: number;
      trackingNumber?: string;
      trackingUrl?: string;
      estimatedDelivery?: string;
      shippedAt?: string;
      deliveredAt?: string;
    }>(),
    
    isGift: booleanCore('is_gift').notNull().default(false),
    giftMessage: textCore('gift_message'),
    giftReceipt: booleanCore('gift_receipt').notNull().default(false),
    
    requiresBlending: booleanCore('requires_blending').notNull().default(false),
    blendingPriority: textCore('blending_priority'),
    
    eligibleForReturns: booleanCore('eligible_for_returns').notNull().default(false),
    returnCreditsEarned: integerCore('return_credits_earned').notNull().default(0),
    returnCreditsUsed: integerCore('return_credits_used').notNull().default(0),
    
    customerNote: textCore('customer_note'),
    internalNote: textCore('internal_note'),
    
    metadata: jsonbCore('metadata').$type<Record<string, any>>(),
    processingCompletedAt: timestampCore('processing_completed_at', { mode: 'date' }),
    createdAt: timestampCore('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestampCore('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdIdx: indexCore('order_customer_idx').on(table.customerId),
    customerEmailIdx: indexCore('order_customer_email_idx').on(table.customerEmail),
    statusIdx: indexCore('orders_status_idx').on(table.status),
    createdAtIdx: indexCore('order_created_idx').on(table.createdAt),
  })
);

export const auditLogs = pgTableCore(
  'audit_logs',
  {
    id: textCore('id').primaryKey(),
    adminId: textCore('admin_id').notNull(),
    action: textCore('action').notNull(),
    entityType: textCore('entity_type').notNull(),
    entityId: textCore('entity_id').notNull(),
    before: jsonbCore('before'),
    after: jsonbCore('after'),
    createdAt: timestampCore('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    entityIdx: indexCore('audit_entity_idx').on(table.entityType, table.entityId),
    createdAtIdx: indexCore('audit_created_idx').on(table.createdAt),
  })
);

export const unlockedOils = pgTableCore(
  'unlocked_oils',
  {
    id: textCore('id').primaryKey(),
    customerId: textCore('customer_id').notNull(),
    oilId: textCore('oil_id').notNull(),
    unlockedAt: timestampCore('unlocked_at', { mode: 'date' }).notNull().defaultNow(),
    unlockedBy: textCore('unlocked_by').notNull(), // order ID
    type: textCore('type').notNull().default('pure'), // 'pure' | 'enhanced'
    createdAt: timestampCore('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    customerIdIdx: indexCore('unlocked_oils_customer_idx').on(table.customerId),
    oilIdIdx: indexCore('unlocked_oils_oil_idx').on(table.oilId),
    uniqueUnlock: indexCore('unlocked_oils_unique_idx').on(table.customerId, table.oilId),
  })
);

/**
 * Batch Records
 * Stores complete blend data for QR code batch tracking
 */
export const batchRecords = pgTableCore(
  'batch_records',
  {
    id: textCore('id').primaryKey(),
    blendName: textCore('blend_name').notNull(),
    mode: textCore('mode').notNull().default('pure'),
    oils: jsonbCore('oils').$type<Array<{ oilId: string; oilName: string; ml: number; percentage: number }>>().notNull(),
    carrierOil: textCore('carrier_oil'),
    carrierPercentage: integerCore('carrier_percentage'),
    size: integerCore('size').notNull(),
    crystal: textCore('crystal'),
    cord: textCore('cord'),
    intendedUse: textCore('intended_use'),
    safetyWarnings: jsonbCore('safety_warnings').$type<string[]>(),
    safetyScore: integerCore('safety_score').notNull().default(95),
    safetyRating: textCore('safety_rating').notNull().default('safe'),
    isRefill: booleanCore('is_refill').notNull().default(false),
    sourceVolume: integerCore('source_volume'),
    targetVolume: integerCore('target_volume'),
    originalBatchId: textCore('original_batch_id'),
    orderId: textCore('order_id'),
    // shopifyOrderId removed — Shopify dependency eliminated
    customerName: textCore('customer_name'),
    themeColor: textCore('theme_color'),
    isAtelier: booleanCore('is_atelier').default(false),
    dominantRarity: textCore('dominant_rarity'),
    createdAt: timestampCore('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestampCore('expires_at', { mode: 'date' }).notNull(),
  },
  (table) => ({
    orderIdIdx: indexCore('batch_order_idx').on(table.orderId),
    createdAtIdx: indexCore('batch_created_idx').on(table.createdAt),
    expiresAtIdx: indexCore('batch_expires_idx').on(table.expiresAt),
  })
);

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type UnlockedOil = typeof unlockedOils.$inferSelect;
export type InsertUnlockedOil = typeof unlockedOils.$inferInsert;
export type BatchRecord = typeof batchRecords.$inferSelect;
export type InsertBatchRecord = typeof batchRecords.$inferInsert;

// ============================================================================
// COMMUNITY BLENDS (re-exported from schema/community-blends)
// ============================================================================

export {
  communityBlends,
  blendRatings,
  blendShares,
  userBlendStats,
  blendVisibilityEnum,
  blendStatusEnum,
  communityBlendsRelations,
  blendRatingsRelations,
  type CommunityBlend,
  type InsertCommunityBlend,
  type BlendRating,
  type InsertBlendRating,
  type BlendShare,
  type InsertBlendShare,
  type UserBlendStats,
  type InsertUserBlendStats,
} from './schema/community-blends'

// User blends and brand ambassador system
export {
  userBlends,
  blendReferrals,
  userBlendsRelations,
  blendReferralsRelations,
  type UserBlend,
  type InsertUserBlend,
  type BlendReferral,
  type InsertBlendReferral,
} from './schema/user-blends'

// Blend commissions for creator earnings
export {
  blendCommissions,
  type BlendCommission,
  type InsertBlendCommission,
} from './schema/community-blends'

// Unlocked refills for custom blends
export {
  unlockedRefills,
  unlockedRefillsRelations,
  type UnlockedRefill,
  type InsertUnlockedRefill,
} from './schema/unlocked-refills'
