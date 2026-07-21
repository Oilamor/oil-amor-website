/**
 * Hardening tests — product-configurator.tsx
 *
 * Focuses on the observable logic: price display, selection flows, the
 * onConfigurationChange payload contract, and the externalConfig sync effect
 * (guarded setters must converge — an infinite loop would hang these tests).
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ProductConfigurator } from '../product-configurator'
import { BOTTLE_SIZES } from '@/lib/content/product-config'
import { calculatePrice, formatPrice } from '@/lib/content/pricing-engine-final'
import type { CrystalPairing } from '@/lib/content/oil-crystal-synergies'

const OIL = { id: 'lavender', name: 'Lavender' }

const CRYSTAL = {
  id: 'amethyst',
  name: 'Amethyst',
  chakra: 'Crown',
  element: 'Air',
} as unknown as CrystalPairing

function lastConfig(mock: jest.Mock) {
  expect(mock).toHaveBeenCalled()
  return mock.mock.calls[mock.mock.calls.length - 1][0]
}

function renderConfigurator(overrides: Record<string, any> = {}) {
  const onConfigurationChange = jest.fn()
  const utils = render(
    <ProductConfigurator
      oil={OIL}
      selectedCrystal={CRYSTAL}
      onConfigurationChange={onConfigurationChange}
      {...overrides}
    />
  )
  return { onConfigurationChange, ...utils }
}

describe('ProductConfigurator — price display', () => {
  it('shows Total Investment matching the pricing engine for the default config', () => {
    renderConfigurator()
    const expected = calculatePrice({ oilId: 'lavender', sizeMl: 30, type: 'pure', ratio: 1.0 })
    expect(screen.getByText('Total Investment')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(expected))).toBeInTheDocument()
  })

  it('updates the displayed price when the bottle size changes', () => {
    renderConfigurator()
    fireEvent.click(screen.getByRole('button', { name: /10ml/ }))
    const expected = calculatePrice({ oilId: 'lavender', sizeMl: 10, type: 'pure', ratio: 1.0 })
    expect(screen.getByText(formatPrice(expected))).toBeInTheDocument()
  })

  it('shows the fallback price text note with crystal chip count', () => {
    renderConfigurator()
    expect(screen.getByText(/Includes Miron bottle & 12 crystal chips/)).toBeInTheDocument()
  })
})

describe('ProductConfigurator — selection flows', () => {
  it('renders all five bottle sizes', () => {
    renderConfigurator()
    for (const label of ['30ml', '20ml', '15ml', '10ml', '5ml']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument()
    }
  })

  it('reports the default configuration to the parent on mount', () => {
    const { onConfigurationChange } = renderConfigurator()
    const config = lastConfig(onConfigurationChange)
    expect(config.size.id).toBe('30ml')
    expect(config.type).toBe('pure')
    expect(config.ratio).toBeUndefined()
    expect(config.isValid).toBe(true)
    expect(config.price).toBeCloseTo(
      calculatePrice({ oilId: 'lavender', sizeMl: 30, type: 'pure', ratio: 1.0 }),
      2
    )
    expect(config.selectedCord).toBeDefined()
    expect(config.breakdown).toBeDefined()
  })

  it('emits the new size when a bottle size is selected', () => {
    const { onConfigurationChange } = renderConfigurator()
    fireEvent.click(screen.getByRole('button', { name: /^5ml/ }))
    const config = lastConfig(onConfigurationChange)
    expect(config.size.id).toBe('5ml')
    expect(config.price).toBeCloseTo(
      calculatePrice({ oilId: 'lavender', sizeMl: 5, type: 'pure', ratio: 1.0 }),
      2
    )
  })

  it('reveals carrier and ratio sections when Carrier Enhanced is chosen', () => {
    renderConfigurator()
    expect(screen.queryByText('Select Carrier Oil')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Carrier Enhanced'))
    expect(screen.getByText('Select Carrier Oil')).toBeInTheDocument()
    expect(screen.getByText('Enhancement Strength')).toBeInTheDocument()
    // Lavender recommends jojoba
    expect(screen.getByText('Recommended for Lavender')).toBeInTheDocument()
  })

  it('emits a carrier configuration with the default balanced ratio', () => {
    const { onConfigurationChange } = renderConfigurator()
    fireEvent.click(screen.getByText('Carrier Enhanced'))
    const config = lastConfig(onConfigurationChange)
    expect(config.type).toBe('carrier')
    expect(config.carrier).toBe('jojoba')
    expect(config.ratio).toBeDefined()
    expect(config.ratio.essentialOilPercent).toBe(25)
  })

  it('emits the chosen dilution ratio and reprices accordingly', () => {
    const { onConfigurationChange } = renderConfigurator()
    fireEvent.click(screen.getByText('Carrier Enhanced'))
    const fifty = screen
      .getAllByRole('button')
      .find((b) => (b.textContent || '').startsWith('50%'))!
    fireEvent.click(fifty)
    const config = lastConfig(onConfigurationChange)
    expect(config.ratio.essentialOilPercent).toBe(50)
    expect(config.price).toBeCloseTo(
      calculatePrice({ oilId: 'lavender', sizeMl: 30, type: 'carrier', ratio: 0.5 }),
      2
    )
  })

  it('drops the ratio from the payload when switching back to pure', () => {
    const { onConfigurationChange } = renderConfigurator()
    fireEvent.click(screen.getByText('Carrier Enhanced'))
    expect(lastConfig(onConfigurationChange).type).toBe('carrier')
    fireEvent.click(screen.getByText('Pure Essential Oil'))
    const config = lastConfig(onConfigurationChange)
    expect(config.type).toBe('pure')
    expect(config.ratio).toBeUndefined()
  })

  it('switches the cord to the mystery pendant through the selector', () => {
    const { onConfigurationChange } = renderConfigurator()
    fireEvent.click(screen.getByText('Waxed Cotton Cord'))
    const options = screen.getAllByText('Mystery Crystal Pendant')
    fireEvent.click(options[options.length - 1])
    expect(lastConfig(onConfigurationChange).selectedCord.id).toBe('mystery-pendant')
  })

  it('expands the Miron Violetglass education panel', () => {
    renderConfigurator()
    expect(screen.queryByText('UV Protection')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Miron Violetglass Bottle'))
    expect(screen.getByText('UV Protection')).toBeInTheDocument()
  })

  it('shows the trust badges', () => {
    renderConfigurator()
    expect(screen.getByText('Free Shipping AU')).toBeInTheDocument()
    expect(screen.getByText('30-Day Returns')).toBeInTheDocument()
    expect(screen.getByText('Handcrafted')).toBeInTheDocument()
  })
})

describe('ProductConfigurator — validation', () => {
  it('flags the configuration invalid and shows a warning without a crystal', () => {
    const onConfigurationChange = jest.fn()
    render(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={undefined}
        onConfigurationChange={onConfigurationChange}
      />
    )
    expect(screen.getByText('Please select a crystal to continue')).toBeInTheDocument()
    const config = lastConfig(onConfigurationChange)
    expect(config.isValid).toBe(false)
    expect(config.validationMessage).toBe('Please select a crystal to continue')
  })

  it('clears the validation warning once a crystal is provided', () => {
    const onConfigurationChange = jest.fn()
    const { rerender } = render(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={undefined}
        onConfigurationChange={onConfigurationChange}
      />
    )
    rerender(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
      />
    )
    expect(screen.queryByText('Please select a crystal to continue')).not.toBeInTheDocument()
    expect(lastConfig(onConfigurationChange).isValid).toBe(true)
  })
})

describe('ProductConfigurator — externalConfig sync (regression: no infinite loop)', () => {
  it('applies an external size on mount and reports it exactly once', () => {
    const onConfigurationChange = jest.fn()
    render(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
        externalConfig={{ size: BOTTLE_SIZES[2] }}
      />
    )
    expect(onConfigurationChange).toHaveBeenCalledTimes(1)
    expect(lastConfig(onConfigurationChange).size.id).toBe('15ml')
  })

  it('converges when externalConfig changes mid-life', () => {
    const onConfigurationChange = jest.fn()
    const { rerender } = render(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
      />
    )
    rerender(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
        externalConfig={{ size: BOTTLE_SIZES[1] }}
      />
    )
    // A render loop would never let this assertion run — and the guarded
    // setters must settle in at most a couple of emissions.
    expect(onConfigurationChange.mock.calls.length).toBeLessThanOrEqual(3)
    expect(lastConfig(onConfigurationChange).size.id).toBe('20ml')
  })

  it('does not re-emit when rerendered with an unchanged externalConfig', () => {
    const onConfigurationChange = jest.fn()
    const props = {
      oil: OIL,
      selectedCrystal: CRYSTAL,
      onConfigurationChange,
      externalConfig: { size: BOTTLE_SIZES[2] },
    }
    const { rerender } = render(<ProductConfigurator {...props} />)
    const callsAfterMount = onConfigurationChange.mock.calls.length
    rerender(<ProductConfigurator {...props} />)
    rerender(<ProductConfigurator {...props} />)
    expect(onConfigurationChange.mock.calls.length).toBe(callsAfterMount)
  })

  it('syncs an external type change to carrier and back', () => {
    const onConfigurationChange = jest.fn()
    const { rerender } = render(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
      />
    )
    rerender(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
        externalConfig={{ type: 'carrier' }}
      />
    )
    expect(lastConfig(onConfigurationChange).type).toBe('carrier')
    expect(screen.getByText('Select Carrier Oil')).toBeInTheDocument()

    rerender(
      <ProductConfigurator
        oil={OIL}
        selectedCrystal={CRYSTAL}
        onConfigurationChange={onConfigurationChange}
        externalConfig={{ type: 'pure' }}
      />
    )
    expect(lastConfig(onConfigurationChange).type).toBe('pure')
    expect(screen.queryByText('Select Carrier Oil')).not.toBeInTheDocument()
  })
})
