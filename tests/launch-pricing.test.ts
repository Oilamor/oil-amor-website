/**
 * Launch pricing tests — the 20% launch discount and its guards.
 *
 * The discount must:
 *  - apply to all NEW-BOTTLE prices (pure, carrier, atelier blends, community blends)
 *  - never touch refill prices
 *  - be exactly revertible (flag off → exact original prices)
 */

import {
  calculatePurePrice,
  calculateCarrierPrice,
  roundTo95,
  MARGIN_DIVISORS,
  FIXED_COSTS,
  CRYSTAL_COUNTS,
  WHOLESALE_OILS,
} from '@/lib/content/pricing-engine-final'
import { calculateAtelierPrice } from '@/lib/atelier/atelier-engine'
import { applyLaunchDiscount, LAUNCH_MODE, LAUNCH_DISCOUNT_PERCENT } from '@/lib/content/launch-pricing'

jest.mock('@/lib/content/launch-pricing', () => {
  const actual = jest.requireActual('@/lib/content/launch-pricing')
  return {
    ...actual,
    LAUNCH_MODE: true,
  }
})

function expectedDiscounted(price95: number): number {
  return Math.round(price95 * 0.8 * 100) / 100
}

describe('launch discount', () => {
  it('is active in this test suite', () => {
    expect(LAUNCH_MODE).toBe(true)
    expect(LAUNCH_DISCOUNT_PERCENT).toBe(20)
  })

  it('pure new-bottle price is 20% below the .95-rounded base', () => {
    const oil = WHOLESALE_OILS['lavender']
    const oilCost = (oil.pricePerLiter / 1000) * 30
    const base = roundTo95(
      oilCost / MARGIN_DIVISORS.pure +
        FIXED_COSTS.newBottleBuffer * 1.25 +
        (CRYSTAL_COUNTS['30ml'] || 12) * FIXED_COSTS.crystalPerChip +
        FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure
    )
    expect(calculatePurePrice('lavender', 30)).toBe(expectedDiscounted(base))
  })

  it('carrier new-bottle price is discounted', () => {
    const discounted = calculateCarrierPrice('lavender', 30, 0.25)
    const oil = WHOLESALE_OILS['lavender']
    const oilCost = ((oil.pricePerLiter / 1000) * 30 * 0.25) / MARGIN_DIVISORS.carrier
    const carrierCost = (30 * 0.75 * FIXED_COSTS.carrierOilPerMl) / MARGIN_DIVISORS.carrier
    const base = roundTo95(
      oilCost + carrierCost + FIXED_COSTS.newBottleBuffer * 1.25 +
        (CRYSTAL_COUNTS['30ml'] || 12) * FIXED_COSTS.crystalPerChip +
        FIXED_COSTS.laborCarrier / MARGIN_DIVISORS.carrier
    )
    expect(discounted).toBe(expectedDiscounted(base))
  })

  it('refill prices are NEVER discounted (pure)', () => {
    const refill = calculatePurePrice('lavender', 100, true)
    // Must still end in .95 — the launch multiplier would produce a .96/.76 etc.
    expect(refill).toBe(roundTo95(refill))
  })

  it('refill prices are NEVER discounted (carrier)', () => {
    const refill = calculateCarrierPrice('lavender', 100, 0.25, true)
    expect(refill).toBe(roundTo95(refill))
  })

  it('atelier blend price is discounted', () => {
    const result = calculateAtelierPrice({
      mode: 'pure',
      bottleSize: 10,
      components: [{ oilId: 'lavender', ml: 10 }],
    })
    const oil = WHOLESALE_OILS['lavender']
    const subtotal =
      ((oil.pricePerLiter / 1000) * 10) / MARGIN_DIVISORS.pure +
      0.25 * (CRYSTAL_COUNTS['10ml'] || 12) +
      FIXED_COSTS.laborPure / MARGIN_DIVISORS.pure +
      FIXED_COSTS.newBottleBuffer * 1.25
    expect(result.total).toBe(expectedDiscounted(roundTo95(subtotal)))
  })

  it('applyLaunchDiscount is identity when price is zero/negative', () => {
    expect(applyLaunchDiscount(0)).toBe(0)
  })

  it('discount math: 24.95 -> 19.96 (cent-exact)', () => {
    expect(applyLaunchDiscount(24.95)).toBe(19.96)
    expect(applyLaunchDiscount(18.95)).toBe(15.16)
  })
})

describe('launch discount revertibility', () => {
  it('flag-off restores the exact original price', () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = 'false'
    jest.resetModules()
    const mod = jest.requireActual('@/lib/content/launch-pricing')
    expect(mod.LAUNCH_MODE).toBe(false)
    expect(mod.applyLaunchDiscount(24.95)).toBe(24.95)
    expect(mod.applyLaunchDiscount(19.96)).toBe(19.96)
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE
    jest.resetModules()
  })
})
