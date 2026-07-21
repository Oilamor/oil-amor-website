/**
 * Hardening tests — error boundaries and not-found pages.
 *
 * app/(shop)/error.tsx and app/admin/error.tsx must render a recovery UI and
 * wire the Try Again button to Next's reset callback; not-found pages must
 * render their 404 messaging and escape links.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import ShopError from '../../(shop)/error'
import AdminError from '../../admin/error'
import RootNotFound from '../../not-found'
import OilNotFound from '../../(shop)/oil/[slug]/not-found'

const testError = Object.assign(new Error('boom'), { digest: 'abc123' })

describe('app/(shop)/error.tsx', () => {
  it('renders the failure message and recovery copy', () => {
    render(<ShopError error={testError} reset={jest.fn()} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/return to the atelier/)).toBeInTheDocument()
  })

  it('fires the reset callback when Try Again is clicked', () => {
    const reset = jest.fn()
    render(<ShopError error={testError} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('offers a Return Home link', () => {
    render(<ShopError error={testError} reset={jest.fn()} />)
    expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/')
  })

  it('does not leak the raw error message to the user', () => {
    render(<ShopError error={testError} reset={jest.fn()} />)
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument()
  })
})

describe('app/admin/error.tsx', () => {
  it('renders the admin-specific failure copy', () => {
    render(<AdminError error={testError} reset={jest.fn()} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/admin console hit an unexpected error/)).toBeInTheDocument()
  })

  it('fires the reset callback when Try Again is clicked', () => {
    const reset = jest.fn()
    render(<AdminError error={testError} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})

describe('app/not-found.tsx', () => {
  it('renders the 404 heading and message', () => {
    render(<RootNotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    expect(screen.getByText(/essence you seek cannot be found/)).toBeInTheDocument()
  })

  it('links back to the atelier', () => {
    render(<RootNotFound />)
    expect(screen.getByRole('link', { name: 'Return to Atelier' })).toHaveAttribute('href', '/')
  })
})

describe('app/(shop)/oil/[slug]/not-found.tsx', () => {
  it('renders the oil-specific 404', () => {
    render(<OilNotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Oil Not Found')).toBeInTheDocument()
  })

  it('links to the oils collection', () => {
    render(<OilNotFound />)
    expect(screen.getByRole('link', { name: 'Browse All Oils' })).toHaveAttribute('href', '/oils')
  })
})
