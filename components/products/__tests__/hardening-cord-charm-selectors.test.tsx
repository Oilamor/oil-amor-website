/**
 * Hardening tests — components/products/CordSelector.tsx and CharmSelector.tsx
 *
 * Attachment pickers must list every option, price them correctly
 * (Free vs +$X), filter by material/type, and report selections upward.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { CordSelector } from '../CordSelector'
import { CharmSelector } from '../CharmSelector'
import { CORD_OPTIONS, CHARM_OPTIONS } from '@/lib/products/attachment-options'

// Filter pills are the only buttons styled rounded-full; cards use rounded-xl.
function clickFilterPill(name: RegExp | string) {
  const pill = screen
    .getAllByRole('button', { name })
    .find((b) => b.className.includes('rounded-full'))
  expect(pill).toBeDefined()
  fireEvent.click(pill!)
}

describe('CordSelector', () => {
  it('renders every cord option by default', () => {
    render(<CordSelector selectedCordId={undefined} onSelect={jest.fn()} />)
    expect(screen.getByText('Select Cord')).toBeInTheDocument()
    for (const cord of CORD_OPTIONS) {
      expect(screen.getByText(cord.name)).toBeInTheDocument()
    }
  })

  it('marks free cords as Free and priced cords with their surcharge', () => {
    render(<CordSelector selectedCordId={undefined} onSelect={jest.fn()} />)
    const freeCords = CORD_OPTIONS.filter((c) => c.price === 0)
    const pricedCords = CORD_OPTIONS.filter((c) => c.price > 0)
    expect(screen.getAllByText('Free')).toHaveLength(freeCords.length)
    for (const cord of pricedCords) {
      expect(screen.getByText(`+$${cord.price.toFixed(2)}`)).toBeInTheDocument()
    }
  })

  it('filters cords by material', () => {
    render(<CordSelector selectedCordId={undefined} onSelect={jest.fn()} />)
    clickFilterPill(/Waxed Cotton/)
    const waxed = CORD_OPTIONS.filter((c) => c.material === 'waxed-cotton')
    const others = CORD_OPTIONS.filter((c) => c.material !== 'waxed-cotton')
    for (const cord of waxed) {
      expect(screen.getByText(cord.name)).toBeInTheDocument()
    }
    for (const cord of others) {
      expect(screen.queryByText(cord.name)).not.toBeInTheDocument()
    }
  })

  it('restores the full list via All Materials', () => {
    render(<CordSelector selectedCordId={undefined} onSelect={jest.fn()} />)
    clickFilterPill(/Waxed Cotton/)
    fireEvent.click(screen.getByRole('button', { name: 'All Materials' }))
    for (const cord of CORD_OPTIONS) {
      expect(screen.getByText(cord.name)).toBeInTheDocument()
    }
  })

  it('reports the selected cord id upward', () => {
    const onSelect = jest.fn()
    render(<CordSelector selectedCordId={undefined} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Raw Hemp Fiber'))
    expect(onSelect).toHaveBeenCalledWith('hemp-natural')
  })

  it('highlights the selected cord', () => {
    render(<CordSelector selectedCordId="hemp-natural" onSelect={jest.fn()} />)
    const card = screen.getByText('Raw Hemp Fiber').closest('button')!
    expect(card.className).toContain('border-[#c9a227]')
  })

  it('expands care details on demand', () => {
    render(<CordSelector selectedCordId={undefined} onSelect={jest.fn()} />)
    const heritage = CORD_OPTIONS.find((c) => c.id === 'waxed-cotton-natural')!
    expect(screen.queryByText(new RegExp(heritage.careInstructions))).not.toBeInTheDocument()
    const showDetails = screen.getAllByText('Show details')[0]
    fireEvent.click(showDetails)
    expect(screen.getByText(new RegExp(heritage.careInstructions))).toBeInTheDocument()
    expect(screen.getByText(heritage.description)).toBeInTheDocument()
  })

  it('renders sustainability badges', () => {
    render(<CordSelector selectedCordId={undefined} onSelect={jest.fn()} />)
    expect(screen.getAllByText('Biodegradable').length).toBeGreaterThan(0)
    expect(screen.getByText('OEKO-TEX')).toBeInTheDocument()
  })
})

describe('CharmSelector', () => {
  const defaultProps = {
    selectedCharmId: undefined,
    isMysterySelected: false,
    onSelectCharm: jest.fn(),
    onSelectMystery: jest.fn(),
  }

  it('renders the mystery charm card as a free random option', () => {
    render(<CharmSelector {...defaultProps} />)
    expect(screen.getByText('Select Charm')).toBeInTheDocument()
    expect(screen.getByText('Mystery Charm')).toBeInTheDocument()
    expect(screen.getByText('Random Selection')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('renders every charm with its price', () => {
    render(<CharmSelector {...defaultProps} />)
    for (const charm of CHARM_OPTIONS) {
      expect(screen.getByText(charm.name)).toBeInTheDocument()
    }
    expect(screen.getAllByText('+$4.95')).toHaveLength(
      CHARM_OPTIONS.filter((c) => c.price === 4.95).length
    )
    expect(screen.getAllByText('+$2.95')).toHaveLength(
      CHARM_OPTIONS.filter((c) => c.price === 2.95).length
    )
  })

  it('filters charms by type', () => {
    render(<CharmSelector {...defaultProps} />)
    clickFilterPill(/Crystal/)
    for (const charm of CHARM_OPTIONS.filter((c) => c.type === 'crystal')) {
      expect(screen.getByText(charm.name)).toBeInTheDocument()
    }
    for (const charm of CHARM_OPTIONS.filter((c) => c.type !== 'crystal')) {
      expect(screen.queryByText(charm.name)).not.toBeInTheDocument()
    }
  })

  it('restores all charms via All Types', () => {
    render(<CharmSelector {...defaultProps} />)
    clickFilterPill(/Metal/)
    fireEvent.click(screen.getByRole('button', { name: 'All Types' }))
    for (const charm of CHARM_OPTIONS) {
      expect(screen.getByText(charm.name)).toBeInTheDocument()
    }
  })

  it('reports charm selections upward', () => {
    const onSelectCharm = jest.fn()
    render(<CharmSelector {...defaultProps} onSelectCharm={onSelectCharm} />)
    fireEvent.click(screen.getByText('Amethyst Point'))
    expect(onSelectCharm).toHaveBeenCalledWith('charm-amethyst-point')
  })

  it('reports mystery selections upward', () => {
    const onSelectMystery = jest.fn()
    render(<CharmSelector {...defaultProps} onSelectMystery={onSelectMystery} />)
    fireEvent.click(screen.getByText('Mystery Charm'))
    expect(onSelectMystery).toHaveBeenCalledTimes(1)
  })

  it('shows rarity labels for charms that have them', () => {
    render(<CharmSelector {...defaultProps} />)
    const rarities = CHARM_OPTIONS.filter((c) => c.rarity).map((c) => c.rarity!)
    for (const rarity of new Set(rarities)) {
      expect(screen.getAllByText(rarity).length).toBeGreaterThan(0)
    }
  })

  it('does not highlight a specific charm while mystery is selected', () => {
    render(
      <CharmSelector {...defaultProps} selectedCharmId="charm-evil-eye" isMysterySelected />
    )
    const card = screen.getByText('Evil Eye').closest('button')!
    expect(card.className).not.toContain('border-[#c9a227]')
  })
})
