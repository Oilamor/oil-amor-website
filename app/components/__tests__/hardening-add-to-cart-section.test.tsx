/**
 * Hardening tests — add-to-cart-section.tsx
 *
 * Regression-guards the cart payload contract (properties.oilId/size/type,
 * configuration.*) that app/api/cart and the checkout flow depend on, plus
 * quantity bounds and disabled-state behavior.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddToCartSection } from '../add-to-cart-section'
import { BOTTLE_SIZES } from '@/lib/content/product-config'
import type { CrystalPairing } from '@/lib/content/oil-crystal-synergies'

// Mock the cart hook — we assert on the payload handed to addItem.
const mockAddItem = jest.fn()
jest.mock('@/app/hooks/use-cart', () => ({
  useCart: () => ({ addItem: mockAddItem }),
}))

const SIZE_30ML = BOTTLE_SIZES.find((s) => s.id === '30ml')!

const PURE_VARIANT = {
  id: 'lavender-30ml-pure',
  price: 24.95,
  size: '30ml',
  type: 'pure',
}

const CRYSTAL = {
  id: 'amethyst',
  name: 'Amethyst',
  chakra: 'Crown',
  element: 'Air',
} as unknown as CrystalPairing

function renderSection(overrides: Record<string, any> = {}) {
  return render(
    <AddToCartSection
      variant={PURE_VARIANT}
      title="Lavender"
      selectedSize={SIZE_30ML}
      {...overrides}
    />
  )
}

describe('AddToCartSection — price & quantity', () => {
  beforeEach(() => {
    mockAddItem.mockResolvedValue({ id: 'line_1' })
  })

  it('displays the formatted variant price with AUD label', () => {
    renderSection()
    expect(screen.getByText('$24.95')).toBeInTheDocument()
    expect(screen.getByText('AUD')).toBeInTheDocument()
  })

  it('starts at quantity 1 with the single-item total on the button', () => {
    renderSection({ selectedCrystal: CRYSTAL })
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/Add to Cart — \$24\.95/)).toBeInTheDocument()
  })

  it('increments quantity and updates the button total', () => {
    renderSection({ selectedCrystal: CRYSTAL })
    const buttons = screen.getAllByRole('button')
    const plus = buttons.find((b) => b.querySelector('svg.lucide-plus'))!
    fireEvent.click(plus)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/Add to Cart — \$49\.90/)).toBeInTheDocument()
  })

  it('keeps the decrement button disabled at quantity 1', () => {
    renderSection({ selectedCrystal: CRYSTAL })
    const buttons = screen.getAllByRole('button')
    const minus = buttons.find((b) => b.querySelector('svg.lucide-minus'))!
    expect(minus).toBeDisabled()
    fireEvent.click(minus)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('caps quantity at 10 and disables the increment button', () => {
    renderSection({ selectedCrystal: CRYSTAL })
    const buttons = screen.getAllByRole('button')
    const plus = buttons.find((b) => b.querySelector('svg.lucide-plus'))!
    for (let i = 0; i < 15; i++) fireEvent.click(plus)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(plus).toBeDisabled()
    expect(screen.getByText(/Add to Cart — \$249\.50/)).toBeInTheDocument()
  })

  it('decrements back down from a higher quantity', () => {
    renderSection({ selectedCrystal: CRYSTAL })
    const buttons = screen.getAllByRole('button')
    const plus = buttons.find((b) => b.querySelector('svg.lucide-plus'))!
    const minus = buttons.find((b) => b.querySelector('svg.lucide-minus'))!
    fireEvent.click(plus)
    fireEvent.click(plus)
    fireEvent.click(minus)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

describe('AddToCartSection — cart payload contract', () => {
  beforeEach(() => {
    mockAddItem.mockResolvedValue({ id: 'line_1' })
  })

  function clickAdd() {
    fireEvent.click(screen.getByText(/Add to Cart —/))
  }

  it('sends productId, variantId and quantity to the cart', async () => {
    renderSection({ selectedCrystal: CRYSTAL, oilId: 'lavender' })
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const input = mockAddItem.mock.calls[0][0]
    expect(input.productId).toBe('lavender')
    expect(input.variantId).toBe('lavender-30ml-pure')
    expect(input.quantity).toBe(1)
  })

  it('sends properties with oilId/size/type — the checkout regression contract', async () => {
    renderSection({ selectedCrystal: CRYSTAL, oilId: 'lavender' })
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const { properties } = mockAddItem.mock.calls[0][0]
    expect(properties).toMatchObject({
      name: 'Lavender',
      price: '24.95',
      oilId: 'lavender',
      size: '30ml',
      type: 'pure',
      carrier: '',
      ratio: '',
      crystalName: 'Amethyst',
    })
  })

  it('marks pure variants as isPure in the configuration', async () => {
    renderSection({ selectedCrystal: CRYSTAL, oilId: 'lavender' })
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const { configuration } = mockAddItem.mock.calls[0][0]
    expect(configuration).toMatchObject({
      bottleSize: '30ml',
      bottleSizeId: '30ml',
      bottleVolume: 30,
      crystalChips: 12,
      type: 'pure',
      isPure: true,
      crystalName: 'Amethyst',
      crystalId: 'amethyst',
    })
    expect(configuration.isCarrierBlend).toBeUndefined()
  })

  it('marks carrier variants with carrier/ratio and isCarrierBlend', async () => {
    const carrierVariant = {
      id: 'lavender-30ml-carrier',
      price: 19.95,
      size: '30ml',
      type: 'carrier',
      carrier: 'jojoba',
      ratio: '25%',
    }
    renderSection({ selectedCrystal: CRYSTAL, oilId: 'lavender', variant: carrierVariant })
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const input = mockAddItem.mock.calls[0][0]
    expect(input.configuration).toMatchObject({
      type: 'carrier',
      isCarrierBlend: true,
      carrierOil: 'jojoba',
      ratio: '25%',
    })
    expect(input.properties).toMatchObject({
      type: 'carrier',
      carrier: 'jojoba',
      ratio: '25%',
    })
  })

  it('includes crystal metadata in both configuration and properties', async () => {
    renderSection({ selectedCrystal: CRYSTAL, oilId: 'lavender' })
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const input = mockAddItem.mock.calls[0][0]
    expect(input.configuration.crystals).toEqual(['Amethyst'])
    expect(input.configuration.crystalChakra).toBe('Crown')
    expect(input.properties.crystalChakra).toBe('Crown')
  })

  it('includes the selected cord in the configuration', async () => {
    renderSection({
      selectedCrystal: CRYSTAL,
      selectedCord: { id: 'hemp', name: 'Hemp Cord', price: 0 },
    })
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const { configuration } = mockAddItem.mock.calls[0][0]
    expect(configuration.cord).toBe('Hemp Cord')
    expect(configuration.cordId).toBe('hemp')
  })

  it('multiplies quantity into the submitted input, not the unit price', async () => {
    renderSection({ selectedCrystal: CRYSTAL, oilId: 'lavender' })
    const buttons = screen.getAllByRole('button')
    const plus = buttons.find((b) => b.querySelector('svg.lucide-plus'))!
    fireEvent.click(plus)
    fireEvent.click(plus)
    clickAdd()
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    const input = mockAddItem.mock.calls[0][0]
    expect(input.quantity).toBe(3)
    expect(input.properties.price).toBe('24.95')
  })
})

describe('AddToCartSection — selection badges & disabled states', () => {
  beforeEach(() => {
    mockAddItem.mockResolvedValue({ id: 'line_1' })
  })

  it('shows the selected crystal name and size in the confirmation badges', () => {
    renderSection({ selectedCrystal: CRYSTAL })
    expect(screen.getByText('Amethyst')).toBeInTheDocument()
    expect(screen.getByText('30ml')).toBeInTheDocument()
    expect(screen.getByText('12 chips')).toBeInTheDocument()
  })

  it('shows a Select a crystal required badge when no crystal is chosen', () => {
    renderSection()
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Select a crystal')).toBeInTheDocument()
  })

  it('disables the button and shows the validation message when invalid', () => {
    renderSection({ isValid: false, validationMessage: 'Please select a crystal to continue' })
    const button = screen.getByText('Please select a crystal to continue').closest('button')!
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('shows a generic completion hint when invalid without a message', () => {
    renderSection({ isValid: false })
    expect(screen.getByText('Complete all selections')).toBeInTheDocument()
  })

  it('shows Added to Cart after a successful add', async () => {
    renderSection({ selectedCrystal: CRYSTAL })
    fireEvent.click(screen.getByText(/Add to Cart —/))
    expect(await screen.findByText('Added to Cart')).toBeInTheDocument()
  })

  it('recovers without showing the success state when addItem rejects', async () => {
    mockAddItem.mockRejectedValue(new Error('server exploded'))
    renderSection({ selectedCrystal: CRYSTAL })
    fireEvent.click(screen.getByText(/Add to Cart —/))
    await waitFor(() => expect(mockAddItem).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByText(/Add to Cart —/)).toBeInTheDocument()
    )
    expect(screen.queryByText('Added to Cart')).not.toBeInTheDocument()
  })

  it('shows the free-shipping notice', () => {
    renderSection()
    expect(screen.getByText('Free shipping on orders over $75')).toBeInTheDocument()
  })
})
