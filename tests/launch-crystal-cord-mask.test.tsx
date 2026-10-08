/**
 * Launch mask — crystals & cords are UNAVAILABLE (not preorder).
 *
 * Pins the masked state: no selectable crystal/cord UI anywhere, greyed-out
 * explanations rendered instead, and pricing copy reflects pure-oil-only.
 * FLIP BACK: NEXT_PUBLIC_CRYSTALS_CORDS_AVAILABLE=true — the "available"
 * UI paths are covered by hardening-product-configurator.test.tsx.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ProductConfigurator } from '@/app/components/product-configurator'
import { AddToCartSection } from '@/app/components/add-to-cart-section'
import { CrystalSelector } from '@/app/(shop)/mixing-atelier/components/CrystalSelector'
import { CordSelector } from '@/app/(shop)/mixing-atelier/components/CordSelector'
import { BOTTLE_SIZES } from '@/lib/content/product-config'

const mockAddItem = jest.fn()
jest.mock('@/app/hooks/use-cart', () => ({
  useCart: () => ({ addItem: mockAddItem }),
}))

jest.mock('@/lib/content/launch-pricing', () => ({
  ...jest.requireActual('@/lib/content/launch-pricing'),
  LAUNCH_MODE: true,
  CRYSTALS_AND_CORDS_AVAILABLE: false,
}))

const OIL = { id: 'lavender', name: 'Lavender' }

describe('crystal/cord launch mask', () => {
  it('configurator shows the cord as unavailable with an explanation', () => {
    render(<ProductConfigurator oil={OIL} selectedCrystal={undefined} onConfigurationChange={jest.fn()} />)
    expect(screen.getByText('Cord & Pendant — Temporarily Unavailable')).toBeInTheDocument()
    expect(screen.getByText(/not a pre-order item/i)).toBeInTheDocument()
    // no selectable cord UI
    expect(screen.queryByText('Your Cord or Pendant')).not.toBeInTheDocument()
  })

  it('configurator pricing note reflects pure-oil-only launch offering', () => {
    render(<ProductConfigurator oil={OIL} selectedCrystal={undefined} onConfigurationChange={jest.fn()} />)
    expect(screen.getByText(/Pure oil only during launch — crystals & cords unavailable, 20% off applied/)).toBeInTheDocument()
  })

  it('atelier crystal selector renders the unavailable notice, not options', () => {
    render(
      <CrystalSelector
        selectedCrystalId={undefined}
        onSelectCrystal={jest.fn()}
        showCrystalSelector={true}
        onToggleSelector={jest.fn()}
      />
    )
    expect(screen.getByText('Crystal Infusion — Temporarily Unavailable')).toBeInTheDocument()
    expect(screen.queryByText('All Available Crystals')).not.toBeInTheDocument()
    expect(screen.queryByText('Change Crystal')).not.toBeInTheDocument()
  })

  it('atelier cord selector renders the unavailable notice, not options', () => {
    render(<CordSelector selectedCordId="waxed-cotton" onSelect={jest.fn()} />)
    expect(screen.getByText(/Cord & Closure — Temporarily Unavailable/)).toBeInTheDocument()
    expect(screen.queryByText('Change')).not.toBeInTheDocument()
  })

  it('add-to-cart hides the crystal badge while masked', async () => {
    const size = BOTTLE_SIZES.find((s) => s.id === '30ml')!
    render(
      <AddToCartSection
        variant={{ id: 'lavender-30ml-pure', price: 19.96, size: '30ml', type: 'pure' }}
        title="Lavender"
        selectedSize={size}
      />
    )
    expect(screen.queryByText(/chips/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    await new Promise((r) => setTimeout(r, 0))
    expect(mockAddItem).toHaveBeenCalled()
    const payload = mockAddItem.mock.calls[0][0]
    expect(payload.configuration.cordId).toBeUndefined()
    expect(payload.configuration.crystalChips).toBe(0)
  })
})
