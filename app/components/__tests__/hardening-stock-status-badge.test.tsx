/**
 * Hardening tests — stock-status-badge.tsx + lib/inventory/client badge mapping.
 *
 * The critical business rule under test: a badge may only say
 * "In Stock — Ships Tomorrow" when the server positively confirmed stock.
 * Loading, errors, and unknown oils must degrade to a neutral label and
 * must NEVER claim "Ships Tomorrow".
 */

import { render, screen } from '@testing-library/react'
import { StockStatusBadge, CartItemStockBadge } from '../stock-status-badge'
import {
  getStockBadgeState,
  resolveBlendStockStatus,
  extractOilIdFromName,
  _resetOilStockStatusCache,
  type OilStockStatusMap,
} from '@/lib/inventory/client'

// ---------------------------------------------------------------------------
// Pure mapping: getStockBadgeState
// ---------------------------------------------------------------------------

describe('getStockBadgeState', () => {
  it('maps in-stock to the Ships Tomorrow label', () => {
    const state = getStockBadgeState('in-stock')
    expect(state.variant).toBe('in-stock')
    expect(state.label).toBe('In Stock — Ships Tomorrow')
  })

  it('maps preorder to the pre-order label', () => {
    const state = getStockBadgeState('preorder')
    expect(state.variant).toBe('preorder')
    expect(state.label).toBe('Pre-Order — Ships in 2-4 Weeks')
  })

  it('maps out to a neutral Out of Stock label', () => {
    const state = getStockBadgeState('out')
    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Out of Stock')
  })

  it('maps loading to Checking availability', () => {
    const state = getStockBadgeState('loading')
    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Checking availability…')
  })

  it('maps error to a neutral unavailable label that never promises shipping', () => {
    const state = getStockBadgeState('error')
    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Stock status unavailable')
    expect(state.label).not.toContain('Ships Tomorrow')
  })

  it('maps undefined (unknown oil) to a neutral label that never promises shipping', () => {
    const state = getStockBadgeState(undefined)
    expect(state.variant).toBe('neutral')
    expect(state.label).not.toContain('Ships Tomorrow')
  })
})

// ---------------------------------------------------------------------------
// Pure mapping: resolveBlendStockStatus (least optimistic truthful status)
// ---------------------------------------------------------------------------

describe('resolveBlendStockStatus', () => {
  it('returns in-stock when every oil is in stock', () => {
    expect(resolveBlendStockStatus(['in-stock', 'in-stock'])).toBe('in-stock')
  })

  it('returns preorder when any oil is preorder and none are out', () => {
    expect(resolveBlendStockStatus(['in-stock', 'preorder'])).toBe('preorder')
  })

  it('returns out when any oil is out of stock', () => {
    expect(resolveBlendStockStatus(['in-stock', 'out', 'preorder'])).toBe('out')
  })

  it('returns out when any oil status is unknown (undefined wins)', () => {
    expect(resolveBlendStockStatus(['in-stock', undefined])).toBe('out')
  })

  it('returns out for an empty blend', () => {
    expect(resolveBlendStockStatus([])).toBe('out')
  })
})

// ---------------------------------------------------------------------------
// Pure helper: extractOilIdFromName
// ---------------------------------------------------------------------------

describe('extractOilIdFromName', () => {
  it.each([
    ['Lavender 30ml', 'lavender'],
    ['Tea Tree Essential Oil', 'tea-tree'],
    ['EUCALYPTUS blue mallee', 'eucalyptus'],
    ['Lemongrass (organic)', 'lemongrass'],
    ['Clove Bud', 'clove-bud'],
  ])('extracts %s as %s', (name, expected) => {
    expect(extractOilIdFromName(name)).toBe(expected)
  })

  it('returns undefined for an unrecognized name', () => {
    expect(extractOilIdFromName('Bergamot FCF')).toBeUndefined()
  })

  it('returns undefined for missing input', () => {
    expect(extractOilIdFromName(undefined)).toBeUndefined()
    expect(extractOilIdFromName('')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Component: StockStatusBadge (fetch mocked at the global level)
// ---------------------------------------------------------------------------

const STATUSES: OilStockStatusMap = {
  lavender: { status: 'in-stock', available: 12 },
  bergamot: { status: 'preorder', available: 0 },
  'tea-tree': { status: 'out', available: 0 },
}

function mockFetchOk(statuses: OilStockStatusMap = STATUSES) {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ oils: statuses, generatedAt: '2026-01-01T00:00:00Z' }),
  })
}

describe('StockStatusBadge component', () => {
  beforeEach(() => {
    _resetOilStockStatusCache()
    global.fetch = jest.fn()
  })

  it('shows Checking availability while the fetch is in flight', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<StockStatusBadge oilId="lavender" />)
    expect(screen.getByText('Checking availability…')).toBeInTheDocument()
  })

  it('shows In Stock — Ships Tomorrow after the server confirms stock', async () => {
    mockFetchOk()
    render(<StockStatusBadge oilId="lavender" />)
    expect(await screen.findByText('In Stock — Ships Tomorrow')).toBeInTheDocument()
  })

  it('shows the pre-order label for preorder oils', async () => {
    mockFetchOk()
    render(<StockStatusBadge oilId="bergamot" />)
    expect(await screen.findByText('Pre-Order — Ships in 2-4 Weeks')).toBeInTheDocument()
  })

  it('shows Out of Stock for oils the server reports as out', async () => {
    mockFetchOk()
    render(<StockStatusBadge oilId="tea-tree" />)
    expect(await screen.findByText('Out of Stock')).toBeInTheDocument()
  })

  it('shows Out of Stock (never Ships Tomorrow) for an oil missing from the map', async () => {
    mockFetchOk()
    render(<StockStatusBadge oilId="myrrh" />)
    const badge = await screen.findByText('Out of Stock')
    expect(badge).toBeInTheDocument()
    expect(screen.queryByText(/Ships Tomorrow/)).not.toBeInTheDocument()
  })

  it('degrades to a neutral badge when the fetch rejects — no provider needed, no crash', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network down'))
    render(<StockStatusBadge oilId="lavender" />)
    const badge = await screen.findByText('Stock status unavailable')
    expect(badge).toBeInTheDocument()
    expect(screen.queryByText(/Ships Tomorrow/)).not.toBeInTheDocument()
  })

  it('degrades to a neutral badge on a non-OK response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })
    render(<StockStatusBadge oilId="lavender" />)
    expect(await screen.findByText('Stock status unavailable')).toBeInTheDocument()
  })

  it('degrades to a neutral badge on a malformed response body', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ unexpected: true }),
    })
    render(<StockStatusBadge oilId="lavender" />)
    expect(await screen.findByText('Stock status unavailable')).toBeInTheDocument()
  })

  it('renders without crashing when no oilId is provided', async () => {
    mockFetchOk()
    render(<StockStatusBadge />)
    expect(await screen.findByText('Stock status unavailable')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Component: CartItemStockBadge
// ---------------------------------------------------------------------------

describe('CartItemStockBadge', () => {
  beforeEach(() => {
    _resetOilStockStatusCache()
    global.fetch = jest.fn()
    mockFetchOk()
  })

  it('shows In Stock for a blend whose oils are all in stock', async () => {
    const item = { customMix: { oils: [{ oilId: 'lavender' }, { oilId: 'lavender' }] } }
    render(<CartItemStockBadge item={item} />)
    expect(await screen.findByText('In Stock — Ships Tomorrow')).toBeInTheDocument()
  })

  it('shows the pre-order label when any blend oil is preorder', async () => {
    const item = { customMix: { oils: [{ oilId: 'lavender' }, { oilId: 'bergamot' }] } }
    render(<CartItemStockBadge item={item} />)
    expect(await screen.findByText('Pre-Order — Ships in 2-4 Weeks')).toBeInTheDocument()
  })

  it('shows Out of Stock when any blend oil is out of stock', async () => {
    const item = { customMix: { oils: [{ oilId: 'lavender' }, { oilId: 'tea-tree' }] } }
    render(<CartItemStockBadge item={item} />)
    expect(await screen.findByText('Out of Stock')).toBeInTheDocument()
  })

  it('resolves blend oils from names when oilId is absent', async () => {
    const item = { configuration: { oils: [{ name: 'Lavender', ml: 5 }, { name: 'Bergamot', ml: 5 }] } }
    render(<CartItemStockBadge item={item} />)
    // Lavender resolves to in-stock, Bergamot does not resolve → least optimistic wins
    expect(await screen.findByText('Out of Stock')).toBeInTheDocument()
  })

  it('uses unlocksOilId for standard products', async () => {
    const item = { name: 'Mystery Product', unlocksOilId: 'lavender' }
    render(<CartItemStockBadge item={item} />)
    expect(await screen.findByText('In Stock — Ships Tomorrow')).toBeInTheDocument()
  })

  it('falls back to extracting the oil id from the item name', async () => {
    const item = { name: 'Tea Tree 30ml' }
    render(<CartItemStockBadge item={item} />)
    expect(await screen.findByText('Out of Stock')).toBeInTheDocument()
  })

  it('shows Checking availability while loading', () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<CartItemStockBadge item={{ name: 'Lavender' }} />)
    expect(screen.getByText('Checking availability…')).toBeInTheDocument()
  })

  it('never shows Ships Tomorrow when the status fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('offline'))
    render(<CartItemStockBadge item={{ unlocksOilId: 'lavender' }} />)
    expect(await screen.findByText('Stock status unavailable')).toBeInTheDocument()
    expect(screen.queryByText(/Ships Tomorrow/)).not.toBeInTheDocument()
  })
})
