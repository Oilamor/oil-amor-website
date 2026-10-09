/**
 * Site-wide business configuration
 *
 * Values surfaced on physical product labels (manufacturer name, Australian
 * address, ABN) and anywhere else the registered business identity is needed.
 * Configure via NEXT_PUBLIC_* env vars so the same values are available to
 * both server and client bundles.
 */

export const BUSINESS = {
  name: 'Oil Amor',
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Central Coast NSW, Australia',
  abn: process.env.NEXT_PUBLIC_BUSINESS_ABN || undefined,
} as const
