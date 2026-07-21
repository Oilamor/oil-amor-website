/**
 * Hardening tests — app/components/product/ProductCard.tsx
 *
 * The product card is the storefront's price/stock face: correct price
 * rendering, sale/new/limited badges, links into the oil detail page, and
 * the Quick Add cart contract.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ProductCard, type OilProduct } from '../product/ProductCard'

const mockAddItem = jest.fn()
jest.mock('@/app/hooks/use-cart', () => ({
  useCart: () => ({ addItem: mockAddItem }),
}))

const PRODUCT: OilProduct = {
  id: 'lavender',
  title: 'Lavender',
  handle: 'lavender',
  description: 'Calming pure essential oil from Provence.',
  price: 24.95,
  images: [{ url: '/images/lavender.webp', altText: 'Lavender bottle' }],
  tags: ['calming'],
}

function renderCard(overrides: Partial<OilProduct> = {}, props: Record<string, any> = {}) {
  return render(<ProductCard product={{ ...PRODUCT, ...overrides }} {...props} />)
}

describe('ProductCard — default variant', () => {
  it('renders the title, description, and formatted price', () => {
    renderCard()
    expect(screen.getByText('Lavender')).toBeInTheDocument()
    expect(screen.getByText(/Calming pure essential oil/)).toBeInTheDocument()
    expect(screen.getByText('$24.95')).toBeInTheDocument()
  })

  it('links to the oil detail page', () => {
    renderCard()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/oil/lavender')
  })

  it('shows the compare-at price struck through with a Sale badge when discounted', () => {
    renderCard({ compareAtPrice: 29.95 })
    expect(screen.getByText('Sale')).toBeInTheDocument()
    expect(screen.getByText('$29.95')).toBeInTheDocument()
    expect(screen.getByText('$24.95')).toBeInTheDocument()
  })

  it('shows no Sale badge when compareAtPrice is not above the price', () => {
    renderCard({ compareAtPrice: 24.95 })
    expect(screen.queryByText('Sale')).not.toBeInTheDocument()
  })

  it('shows New and Limited badges when flagged', () => {
    renderCard({ isNew: true, isLimited: true })
    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Limited')).toBeInTheDocument()
  })

  it('renders no badges for a plain product', () => {
    renderCard()
    expect(screen.queryByText('New')).not.toBeInTheDocument()
    expect(screen.queryByText('Limited')).not.toBeInTheDocument()
    expect(screen.queryByText('Sale')).not.toBeInTheDocument()
  })

  it('falls back to the placeholder image when the product has no images', () => {
    renderCard({ images: [] })
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toContain('placeholder-bottle.jpg')
  })

  it('quick-adds the product with the cart payload contract', () => {
    mockAddItem.mockResolvedValue({ id: 'line_1' })
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Quick Add/ }))
    expect(mockAddItem).toHaveBeenCalledTimes(1)
    const input = mockAddItem.mock.calls[0][0]
    expect(input.productId).toBe('lavender')
    expect(input.quantity).toBe(1)
    expect(input.properties.price).toBe('24.95')
    expect(input.properties.image).toBe('/images/lavender.webp')
  })

  it('surfaces the crystal pairing when synergy is enabled', () => {
    renderCard({
      crystalPairing: {
        name: 'Amethyst',
        description: 'Calming crystal',
        image: '/images/amethyst.webp',
      },
    })
    expect(
      screen.getByRole('button', { name: 'Paired with Amethyst' })
    ).toBeInTheDocument()
  })

  it('hides the crystal pairing when showSynergy is false', () => {
    renderCard(
      {
        crystalPairing: {
          name: 'Amethyst',
          description: 'Calming crystal',
          image: '/images/amethyst.webp',
        },
      },
      { showSynergy: false }
    )
    expect(
      screen.queryByRole('button', { name: 'Paired with Amethyst' })
    ).not.toBeInTheDocument()
  })
})

describe('ProductCard — compact variant', () => {
  it('renders title and price without the description', () => {
    renderCard({}, { variant: 'compact' })
    expect(screen.getByText('Lavender')).toBeInTheDocument()
    expect(screen.getByText('$24.95')).toBeInTheDocument()
    expect(screen.queryByText(/Calming pure essential oil/)).not.toBeInTheDocument()
  })

  it('still links to the oil detail page', () => {
    renderCard({}, { variant: 'compact' })
    expect(screen.getByRole('link')).toHaveAttribute('href', '/oil/lavender')
  })
})

describe('ProductCard — featured variant', () => {
  it('renders the featured eyebrow, description, and price', () => {
    renderCard({}, { variant: 'featured' })
    expect(screen.getByText('Featured Blend')).toBeInTheDocument()
    expect(screen.getByText(/Calming pure essential oil/)).toBeInTheDocument()
    expect(screen.getByText('$24.95')).toBeInTheDocument()
  })

  it('shows the crystal pairing callout', () => {
    renderCard(
      {
        crystalPairing: {
          name: 'Amethyst',
          description: 'Calming crystal',
          image: '/images/amethyst.webp',
        },
      },
      { variant: 'featured' }
    )
    expect(screen.getByText(/Paired with/)).toBeInTheDocument()
    expect(screen.getByText('Amethyst')).toBeInTheDocument()
  })

  it('adds to cart from the featured card', () => {
    mockAddItem.mockResolvedValue({ id: 'line_1' })
    renderCard({}, { variant: 'featured' })
    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/ }))
    expect(mockAddItem).toHaveBeenCalledTimes(1)
    expect(mockAddItem.mock.calls[0][0].productId).toBe('lavender')
  })
})
