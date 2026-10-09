/**
 * Checkout Recipes
 *
 * Full atelier custom-mix recipes temporarily parked during Stripe checkout.
 * Stripe caps line-item metadata values at 500 chars, and customMix payloads
 * (including the multi-KB Living Blend Codex revelationData) blow past that —
 * so checkout stores the full recipe here and passes a short customMixRef
 * (plus a compact summary) through Stripe metadata instead. The webhook
 * resolves the ref when building the order and deletes the row.
 */

import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import type { OrderCustomMix } from './orders';

export const checkoutRecipes = pgTable(
  'checkout_recipes',
  {
    id: text('id').primaryKey(),
    recipe: jsonb('recipe').$type<OrderCustomMix>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('checkout_recipes_expires_at_idx').on(table.expiresAt),
  })
);

export type CheckoutRecipe = typeof checkoutRecipes.$inferSelect;
export type InsertCheckoutRecipe = typeof checkoutRecipes.$inferInsert;
