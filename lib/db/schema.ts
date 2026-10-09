/**
 * Unified Drizzle Schema Entry Point
 * 
 * This file re-exports all tables, relations, and types from both
 * the monolithic schema-refill file and the modular schema directory.
 * It serves as the single source of truth for drizzle-kit migrations.
 */

// Re-export everything from the monolithic schema-refill file
export * from './schema-refill'

// Re-export from modular schemas (avoiding duplicates where possible)
export * from './schema/checkout-recipes'
export * from './schema/community-blends'
// Note: './schema/orders' is already re-exported by schema-refill
export * from './schema/safety-comprehensive'
export * from './schema/unlocked-refills'
export * from './schema/user-blends'
