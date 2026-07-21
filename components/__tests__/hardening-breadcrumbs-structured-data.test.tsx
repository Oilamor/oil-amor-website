/**
 * Hardening tests — components/Breadcrumbs.tsx and components/StructuredData.tsx
 *
 * Breadcrumb trails drive both navigation and SEO structured data; the
 * emitted JSON-LD must parse and carry the required schema.org fields.
 */

import { render, screen } from '@testing-library/react'
import { Breadcrumbs } from '../Breadcrumbs'
import { StructuredData } from '../StructuredData'

const TRAIL = [
  { label: 'Home', href: '/' },
  { label: 'Oils', href: '/oils' },
  { label: 'Lavender' },
]

function getBreadcrumbJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]')
  expect(script).not.toBeNull()
  return JSON.parse(script!.textContent || '{}')
}

describe('Breadcrumbs — trail rendering', () => {
  it('renders a nav landmark labelled Breadcrumb', () => {
    render(<Breadcrumbs items={TRAIL} />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
  })

  it('renders every item in order as a list', () => {
    render(<Breadcrumbs items={TRAIL} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Home')
    expect(items[1]).toHaveTextContent('Oils')
    expect(items[2]).toHaveTextContent('Lavender')
  })

  it('renders items with href as links and the terminal item as plain text', () => {
    render(<Breadcrumbs items={TRAIL} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/')
    expect(links[1]).toHaveAttribute('href', '/oils')
    expect(screen.queryByRole('link', { name: 'Lavender' })).not.toBeInTheDocument()
    expect(screen.getByText('Lavender')).toBeInTheDocument()
  })

  it('places a separator between items but never before the first', () => {
    const { container } = render(<Breadcrumbs items={TRAIL} />)
    const separators = Array.from(container.querySelectorAll('li span')).filter(
      (el) => el.textContent === '/'
    )
    expect(separators).toHaveLength(2)
  })

  it('renders a single-item trail without links or separators', () => {
    render(<Breadcrumbs items={[{ label: 'Current' }]} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation').textContent).not.toContain('/')
  })
})

describe('Breadcrumbs — JSON-LD schema', () => {
  it('emits a valid BreadcrumbList schema', () => {
    const { container } = render(<Breadcrumbs items={TRAIL} />)
    const schema = getBreadcrumbJsonLd(container)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('BreadcrumbList')
    expect(schema.itemListElement).toHaveLength(3)
  })

  it('numbers positions sequentially starting at 1', () => {
    const { container } = render(<Breadcrumbs items={TRAIL} />)
    const schema = getBreadcrumbJsonLd(container)
    expect(schema.itemListElement.map((el: any) => el.position)).toEqual([1, 2, 3])
    expect(schema.itemListElement.map((el: any) => el['@type'])).toEqual([
      'ListItem',
      'ListItem',
      'ListItem',
    ])
  })

  it('prefixes item URLs with the production origin', () => {
    const { container } = render(<Breadcrumbs items={TRAIL} />)
    const schema = getBreadcrumbJsonLd(container)
    expect(schema.itemListElement[0].item).toBe('https://oilamor.com/')
    expect(schema.itemListElement[1].item).toBe('https://oilamor.com/oils')
  })

  it('omits the item URL for the terminal (current page) entry', () => {
    const { container } = render(<Breadcrumbs items={TRAIL} />)
    const schema = getBreadcrumbJsonLd(container)
    expect(schema.itemListElement[2].name).toBe('Lavender')
    expect(schema.itemListElement[2]).not.toHaveProperty('item')
  })
})

describe('StructuredData — JSON-LD passthrough', () => {
  it('renders a script tag typed as application/ld+json', () => {
    const { container } = render(<StructuredData schema={{ '@type': 'Thing' }} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
  })

  it('round-trips a Product schema with required fields intact', () => {
    const product = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Lavender Essential Oil',
      image: ['https://oilamor.com/images/lavender.webp'],
      description: 'Pure lavender oil',
      brand: { '@type': 'Brand', name: 'Oil Amor' },
      offers: {
        '@type': 'Offer',
        price: '24.95',
        priceCurrency: 'AUD',
        availability: 'https://schema.org/InStock',
        url: 'https://oilamor.com/oil/lavender',
      },
    }
    const { container } = render(<StructuredData schema={product} />)
    const script = container.querySelector('script[type="application/ld+json"]')!
    const parsed = JSON.parse(script.textContent || '{}')
    expect(parsed['@type']).toBe('Product')
    expect(parsed.name).toBe('Lavender Essential Oil')
    expect(parsed.offers['@type']).toBe('Offer')
    expect(parsed.offers.priceCurrency).toBe('AUD')
    expect(parsed.offers.availability).toBe('https://schema.org/InStock')
    expect(parsed).toEqual(product)
  })

  it('preserves special characters without corrupting the JSON', () => {
    const schema = {
      '@type': 'FAQPage',
      mainEntity: {
        '@type': 'Question',
        name: 'Is it "safe" for pregnancy & breastfeeding?',
      },
    }
    const { container } = render(<StructuredData schema={schema} />)
    const script = container.querySelector('script[type="application/ld+json"]')!
    const parsed = JSON.parse(script.textContent || '{}')
    expect(parsed.mainEntity.name).toBe('Is it "safe" for pregnancy & breastfeeding?')
  })
})
