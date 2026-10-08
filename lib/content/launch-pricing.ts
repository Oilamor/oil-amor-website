/**
 * Launch mode configuration — single source of truth for the pre-stock launch.
 *
 * While LAUNCH_MODE is on:
 *  - All new-bottle prices (oils, atelier blends, community blends) are
 *    advertised 20% below the canonical .95-rounded price.
 *  - Refills are NEVER discounted (they gate on isRefill upstream).
 *  - Stock badges and the site banner use launch copy.
 *
 * The discount is applied AFTER roundTo95 as a pure multiplier, so turning
 * LAUNCH_MODE off restores the exact original prices.
 *
 * To end the launch: set NEXT_PUBLIC_LAUNCH_MODE=false in Vercel and redeploy.
 */

export const LAUNCH_MODE: boolean =
  (process.env.NEXT_PUBLIC_LAUNCH_MODE ?? 'true') !== 'false'

export const LAUNCH_DISCOUNT_PERCENT = 20

const LAUNCH_DISCOUNT_FRACTION = 1 - LAUNCH_DISCOUNT_PERCENT / 100 // 0.80

/**
 * Apply the launch discount to an already .95-rounded price.
 * Returns the input unchanged when launch mode is off.
 */
export function applyLaunchDiscount(price: number): number {
  if (!LAUNCH_MODE || price <= 0) return price
  return Math.round(price * LAUNCH_DISCOUNT_FRACTION * 100) / 100
}

/**
 * Bumped whenever cart item pricing changes shape; carts stored with an
 * older version are dropped on read so stale unitPrices can never fail
 * checkout validation.
 */
export const CART_VERSION = 2
