/**
 * Pricing Engine Tests
 * Verifies correct pricing for all scenarios
 */

import { 
  calculatePriceBreakdown, 
  calculateProductPrice,
  calculatePureOilPrice,
  calculateRefillPrice,
  calculateRefillSavings,
  getAllPricesForOil,
  getRatioPricePreviews,
  formatPrice
} from '../pricing-engine'
import { RATIO_PRESETS } from '../ratio-engine'

describe('Pricing Engine', () => {
  
  describe('Pure Oil Prices', () => {
    it('should calculate correct price for Lavender 30ml pure', () => {
      const price = calculatePureOilPrice('lavender', 30)
      console.log('Lavender 30ml pure:', formatPrice(price))
      expect(price).toBeGreaterThan(0)
      expect(price).toBeLessThan(100)
    })

    it('should calculate correct price for Myrrh 30ml pure (expensive)', () => {
      const price = calculatePureOilPrice('myrrh', 30)
      console.log('Myrrh 30ml pure:', formatPrice(price))
      expect(price).toBeGreaterThan(50)
      expect(price).toBeGreaterThan(70) // Myrrh is expensive
    })

    it('should have higher price for larger bottles', () => {
      const p5ml = calculatePureOilPrice('lavender', 5)
      const p30ml = calculatePureOilPrice('lavender', 30)
      console.log(`Lavender: 5ml=${formatPrice(p5ml)}, 30ml=${formatPrice(p30ml)}`)
      expect(p30ml).toBeGreaterThan(p5ml)
    })
  })

  describe('Ratio-Based Pricing', () => {
    it('should have lower price for lower ratios', () => {
      const pure = calculateProductPrice('myrrh', '30ml', 'carrier', 'jojoba', RATIO_PRESETS[4]) // 100%
      const balanced = calculateProductPrice('myrrh', '30ml', 'carrier', 'jojoba', RATIO_PRESETS[2]) // 25%
      const micro = calculateProductPrice('myrrh', '30ml', 'carrier', 'jojoba', RATIO_PRESETS[0]) // 5%
      
      console.log('Myrrh 30ml:')
      console.log('  Pure (100%):', formatPrice(pure))
      console.log('  Balanced (25%):', formatPrice(balanced))
      console.log('  Micro (5%):', formatPrice(micro))
      
      expect(micro).toBeLessThan(balanced)
      expect(balanced).toBeLessThan(pure)
    })

    it('should show significant savings for expensive oils at low ratios', async () => {
      const breakdown = await calculatePriceBreakdown('myrrh', '30ml', 'carrier', {
        carrierId: 'jojoba',
        ratio: RATIO_PRESETS[0] // 5%
      })
      
      console.log('Myrrh 5% concentration:')
      console.log('  Price:', formatPrice(breakdown.total))
      console.log('  Pure equivalent:', formatPrice(breakdown.pureOilEquivalent))
      console.log('  Savings:', breakdown.savingsPercent + '%')
      
      expect(breakdown.savings).toBeGreaterThan(0)
      expect(breakdown.savingsPercent).toBeGreaterThan(50)
    })
  })

  describe('Refill Pricing', () => {
    it('should have lower price for refills', () => {
      const original = calculateProductPrice('lavender', '30ml', 'carrier', 'jojoba', RATIO_PRESETS[2])
      const refill = calculateRefillPrice('lavender', 30)
      
      console.log('Lavender 30ml 25%:')
      console.log('  Original:', formatPrice(original))
      console.log('  Refill:', formatPrice(refill))
      console.log('  Savings:', formatPrice(original - refill))
      
      expect(refill).toBeLessThan(original)
    })

    it('should calculate correct refill savings', () => {
      const savings = calculateRefillSavings('lavender', '30ml', RATIO_PRESETS[2])
      
      console.log('Refill Savings:')
      console.log('  Original:', formatPrice(savings.originalPrice))
      console.log('  Refill:', formatPrice(savings.refillPrice))
      console.log('  Savings:', savings.savingsPercent + '%')
      
      expect(savings.savings).toBeGreaterThan(0)
      expect(savings.savingsPercent).toBeGreaterThan(10)
    })
  })

  describe('Size Scaling', () => {
    it('should scale prices correctly across sizes', () => {
      const prices = getAllPricesForOil('lavender')
      
      console.log('Lavender prices by size:')
      Object.entries(prices).forEach(([size, price]) => {
        console.log(`  ${size}: ${formatPrice(price)}`)
      })
      
      expect(prices['5ml']).toBeLessThan(prices['10ml'])
      expect(prices['10ml']).toBeLessThan(prices['30ml'])
    })
  })

  describe('Price Breakdown Components', () => {
    it('should have all cost components', async () => {
      const breakdown = await calculatePriceBreakdown('lavender', '30ml', 'carrier', {
        carrierId: 'jojoba',
        ratio: RATIO_PRESETS[2]
      })
      
      console.log('Price Breakdown for Lavender 30ml 25%:')
      console.log('  Wholesale oil:', formatPrice(breakdown.wholesaleOilCost))
      console.log('  Marked up oil:', formatPrice(breakdown.markedUpOilCost))
      console.log('  Carrier:', formatPrice(breakdown.carrierCost))
      console.log('  Packaging:', formatPrice(breakdown.packagingCost))
      console.log('  Crystals:', formatPrice(breakdown.crystalCost))
      console.log('  Applicator:', formatPrice(breakdown.applicatorCost))
      console.log('  Labor:', formatPrice(breakdown.laborCost))
      console.log('  Subtotal:', formatPrice(breakdown.subtotal))
      console.log('  Total:', formatPrice(breakdown.total))
      
      expect(breakdown.wholesaleOilCost).toBeGreaterThan(0)
      expect(breakdown.markedUpOilCost).toBeGreaterThan(breakdown.wholesaleOilCost)
      expect(breakdown.total).toBeGreaterThan(0)
    })

    it('should have zero packaging/crystal costs for refills', async () => {
      const breakdown = await calculatePriceBreakdown('lavender', '30ml', 'carrier', {
        carrierId: 'jojoba',
        ratio: RATIO_PRESETS[2],
        isRefill: true
      })
      
      expect(breakdown.packagingCost).toBe(0)
      expect(breakdown.crystalCost).toBe(0)
      expect(breakdown.laborCost).toBe(2.0) // Reduced labor for refills
    })
  })

  describe('Ratio Price Previews', () => {
    it('should show all ratio options', () => {
      const previews = getRatioPricePreviews('myrrh', '30ml', 'jojoba')
      
      console.log('Myrrh ratio options:')
      previews.forEach(p => {
        console.log(`  ${p.ratio.name} (${p.ratio.essentialOilPercent}%): ${formatPrice(p.price)} (save ${p.savingsPercent}%)`)
      })
      
      expect(previews).toHaveLength(5)
      expect(previews[0].price).toBeLessThan(previews[4].price) // Micro < Pure
    })
  })
})

// Run tests
console.log('=== PRICING ENGINE TESTS ===\n')
