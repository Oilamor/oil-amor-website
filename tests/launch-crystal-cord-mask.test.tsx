/**
 * Launch mask — crystals & cords are UNAVAILABLE (not preorder).
 *
 * Pins the masked state: no selectable crystal/cord UI anywhere, greyed-out
 * explanations rendered instead, and pricing copy reflects pure-oil-only.
 * FLIP BACK: NEXT_PUBLIC_CRYSTALS_CORDS_AVAILABLE=true — the "available"
 * UI paths are covered by hardening-product-configurator.test.tsx.
 */

import { render, screen } from '@testing-library/react'
import { ProductConfigurator } from '@/app/components/product-configurator'
import { CrystalSelector } from '@/app/(shop)/mixing-atelier/components/CrystalSelector'
import { CordSelector } from '@/app/(shop)/mixing-atelier/components/CordSelector'

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
})
