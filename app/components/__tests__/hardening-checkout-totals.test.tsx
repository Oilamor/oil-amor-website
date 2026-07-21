/**
 * Hardening tests — checkout-adjacent totals & price presentation.
 *
 * - calculateCheckoutTotals: the displayed GST/shipping/credit math must match
 *   the server's cent-level rounding (GST = 10% of subtotal + shipping for AU).
 * - PriceDisplay / PriceCompact: credit lines subtract and never go negative,
 *   sale badges compute the right percentage, unit math is exact.
 */

import { render, screen, within } from '@testing-library/react'
import { calculateCheckoutTotals, FREE_SHIPPING_THRESHOLD_CENTS } from '@/lib/stripe/checkout'
import { PriceDisplay, PriceCompact } from '../product/PriceDisplay'

describe('calculateCheckoutTotals — GST & shipping math', () => {
  it('charges GST as 10% of subtotal plus shipping for AU orders', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    expect(totals.subtotal).toBe(50)
    expect(totals.shipping).toBe(10)
    // 10% of (5000 + 1000) cents = 600 cents
    expect(totals.gst).toBe(6)
    expect(totals.total).toBe(66)
  })

  it('charges no GST for non-AU orders', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'NZ' }
    )
    expect(totals.gst).toBe(0)
    expect(totals.total).toBe(60)
  })

  it('defaults to AU GST when no country is given', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 20, quantity: 1 }])
    expect(totals.gst).toBeCloseTo((20 + 10) * 0.1, 2)
  })

  it('waives shipping at the free-shipping threshold and drops GST accordingly', () => {
    const atThreshold = FREE_SHIPPING_THRESHOLD_CENTS / 100
    const totals = calculateCheckoutTotals(
      [{ unitPrice: atThreshold, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    expect(totals.shipping).toBe(0)
    expect(totals.gst).toBeCloseTo(atThreshold * 0.1, 2)
    expect(totals.total).toBeCloseTo(atThreshold * 1.1, 2)
  })

  it('falls back to the default 1000-cent shipping when no rate is provided', () => {
    const totals = calculateCheckoutTotals([{ unitPrice: 10, quantity: 1 }])
    expect(totals.shipping).toBe(10)
  })

  it('subtracts store credit from the total', () => {
    const base = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    const withCredit = calculateCheckoutTotals(
      [{ unitPrice: 50, quantity: 1 }],
      { shippingAmountCents: 1000, country: 'AU', creditCents: 1500 }
    )
    expect(withCredit.total).toBeCloseTo(base.total - 15, 2)
    expect(withCredit.subtotal).toBe(base.subtotal)
    expect(withCredit.gst).toBe(base.gst)
  })

  it('never lets credit push the total below zero', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 10, quantity: 1 }],
      { shippingAmountCents: 0, country: 'AU', creditCents: 999999 }
    )
    expect(totals.total).toBe(0)
  })

  it('rounds fractional-cent unit prices at cent level like the server', () => {
    const totals = calculateCheckoutTotals(
      [{ unitPrice: 24.95, quantity: 3 }],
      { shippingAmountCents: 1000, country: 'AU' }
    )
    expect(totals.subtotal).toBe(74.85)
    // Mirror the server's exact formula: Math.round on (subCents + shipCents) * 0.1
    const expectedGstCents = Math.round((7485 + 1000) * 0.1)
    expect(totals.gst).toBe(expectedGstCents / 100)
    expect(totals.total).toBeCloseTo((7485 + 1000 + expectedGstCents) / 100, 2)
  })

  it('sums itemCount across quantities', () => {
    const totals = calculateCheckoutTotals([
      { unitPrice: 10, quantity: 2 },
      { unitPrice: 5, quantity: 3 },
    ])
    expect(totals.itemCount).toBe(5)
    expect(totals.subtotal).toBe(35)
  })

  it('handles an empty cart without NaN', () => {
    const totals = calculateCheckoutTotals([], { shippingAmountCents: 0 })
    expect(totals.subtotal).toBe(0)
    expect(totals.total).toBe(0)
    expect(totals.itemCount).toBe(0)
  })
})

describe('PriceDisplay — presentational totals', () => {
  it('renders the formatted price', () => {
    render(<PriceDisplay price={24.95} animated={false} />)
    expect(screen.getByText('$24.95')).toBeInTheDocument()
  })

  it('shows the compare-at price struck through with the savings percentage', () => {
    render(<PriceDisplay price={20} compareAtPrice={25} animated={false} />)
    expect(screen.getByText('$25.00')).toBeInTheDocument()
    expect(screen.getByText('Save 20%')).toBeInTheDocument()
  })

  it('shows no sale UI when compareAtPrice is not higher', () => {
    render(<PriceDisplay price={25} compareAtPrice={25} animated={false} />)
    expect(screen.queryByText(/Save /)).not.toBeInTheDocument()
  })

  it('subtracts credits and shows subtotal, credit line, and final price', () => {
    render(<PriceDisplay price={50} credits={10} creditValue={1} animated={false} />)
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('$50.00')).toBeInTheDocument()
    expect(screen.getByText('Credits Applied')).toBeInTheDocument()
    expect(screen.getByText('-$10.00')).toBeInTheDocument()
    const finalRow = screen.getByText('Final Price').parentElement!
    expect(within(finalRow).getByText('$40.00')).toBeInTheDocument()
  })

  it('floors the credit-adjusted price at zero', () => {
    render(<PriceDisplay price={10} credits={50} creditValue={1} animated={false} />)
    const finalRow = screen.getByText('Final Price').parentElement!
    expect(within(finalRow).getByText('$0.00')).toBeInTheDocument()
  })

  it('applies the credit value multiplier to the credit line', () => {
    render(<PriceDisplay price={50} credits={4} creditValue={2.5} animated={false} />)
    expect(screen.getByText('-$10.00')).toBeInTheDocument()
    const finalRow = screen.getByText('Final Price').parentElement!
    expect(within(finalRow).getByText('$40.00')).toBeInTheDocument()
  })

  it('shows the per-unit price when provided', () => {
    render(<PriceDisplay price={24.95} unitPrice={0.83} unit="ml" animated={false} />)
    expect(screen.getByText('$0.83 per ml')).toBeInTheDocument()
  })

  it('hides the per-unit line when showPerUnit is false', () => {
    render(
      <PriceDisplay price={24.95} unitPrice={0.83} showPerUnit={false} animated={false} />
    )
    expect(screen.queryByText(/per ml/)).not.toBeInTheDocument()
  })
})

describe('PriceCompact — line-item math', () => {
  it('multiplies unit price by quantity', () => {
    render(<PriceCompact price={24.95} quantity={3} />)
    expect(screen.getByText('$74.85')).toBeInTheDocument()
    expect(screen.getByText('$24.95 each')).toBeInTheDocument()
  })

  it('omits the each annotation for a single item', () => {
    render(<PriceCompact price={24.95} quantity={1} />)
    expect(screen.getByText('$24.95')).toBeInTheDocument()
    expect(screen.queryByText(/each/)).not.toBeInTheDocument()
  })
})
