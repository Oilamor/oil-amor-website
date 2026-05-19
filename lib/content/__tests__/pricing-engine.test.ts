/**
 * Pricing Engine Unit Tests
 * Tests for calculatePrice, roundTo95, formatPrice, and getSavingsPercentage
 */

import {
  roundTo95,
  calculatePrice,
  formatPrice,
  getSavingsPercentage,
  getOilIdFromSlug,
  CRYSTAL_COUNTS,
} from '../pricing-engine-final'

describe('Pricing Engine', () => {
  describe('roundTo95', () => {
    it('rounds prices to end in .95', () => {
      expect(roundTo95(45)).toBe(45.95)
      expect(roundTo95(50)).toBe(50.95)
      expect(roundTo95(100)).toBe(100.95)
    })

    it('handles edge cases', () => {
      expect(roundTo95(0)).toBe(0.95)
      expect(roundTo95(0.95)).toBe(0.95)
      expect(roundTo95(1)).toBe(1.95)
    })
  })

  describe('calculatePrice', () => {
    it('calculates pure oil price correctly', () => {
      const price = calculatePrice({
        oilId: 'lavender',
        sizeMl: 10,
        type: 'pure',
      })
      expect(price).toBeGreaterThan(0)
      expect(typeof price).toBe('number')
    })

    it('calculates carrier blend price correctly', () => {
      const price = calculatePrice({
        oilId: 'lavender',
        sizeMl: 10,
        type: 'carrier',
        ratio: 0.25,
      })
      expect(price).toBeGreaterThan(0)
      expect(typeof price).toBe('number')
    })

    it('returns consistent pricing for same inputs', () => {
      const config = { oilId: 'tea-tree', sizeMl: 30, type: 'pure' as const }
      const price1 = calculatePrice(config)
      const price2 = calculatePrice(config)
      expect(price1).toBe(price2)
    })
  })

  describe('formatPrice', () => {
    it('formats price with $ symbol and two decimals', () => {
      expect(formatPrice(45)).toBe('$45.00')
      expect(formatPrice(45.5)).toBe('$45.50')
      expect(formatPrice(45.99)).toBe('$45.99')
    })

    it('handles zero', () => {
      expect(formatPrice(0)).toBe('$0.00')
    })
  })

  describe('getSavingsPercentage', () => {
    it('calculates savings correctly', () => {
      expect(getSavingsPercentage(100, 80, 30, 30)).toBe(20)
      expect(getSavingsPercentage(50, 25, 30, 30)).toBe(50)
    })

    it('returns 0 when no savings', () => {
      expect(getSavingsPercentage(50, 50, 30, 30)).toBe(0)
    })

    it('returns negative when refill costs more', () => {
      expect(getSavingsPercentage(50, 60, 30, 30)).toBe(-20)
    })
  })

  describe('getOilIdFromSlug', () => {
    it('converts slugs to oil IDs', () => {
      expect(getOilIdFromSlug('lavender')).toBe('lavender')
      expect(getOilIdFromSlug('tea-tree')).toBe('tea-tree')
    })

    it('handles unknown slugs gracefully', () => {
      expect(getOilIdFromSlug('unknown-oil')).toBe('unknown-oil')
    })
  })

  describe('CRYSTAL_COUNTS', () => {
    it('has crystal counts for all bottle sizes', () => {
      expect(CRYSTAL_COUNTS['5ml']).toBeDefined()
      expect(CRYSTAL_COUNTS['10ml']).toBeDefined()
      expect(CRYSTAL_COUNTS['30ml']).toBeDefined()
      expect(CRYSTAL_COUNTS['5ml']).toBeGreaterThan(0)
    })
  })
})
