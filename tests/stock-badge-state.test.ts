/**
 * Stock Badge State Mapping Tests
 *
 * Unit-tests the pure badge mapping in lib/inventory/client.ts and the
 * client-side fetch cache over /api/inventory/status. The badge must never
 * show "Ships Tomorrow" without server-confirmed stock.
 */

import {
  STOCKED_OIL_IDS,
  _resetOilStockStatusCache,
  fetchOilStockStatuses,
  getStockBadgeState,
  hasPreorderItems,
  resolveBlendStockStatus,
  type StockBadgeInput,
} from '@/lib/inventory/client'

const mockFetch = jest.fn()

beforeEach(() => {
  _resetOilStockStatusCache()
  mockFetch.mockReset()
  ;(global as any).fetch = mockFetch
})

function okResponse(oils: Record<string, { status: string; available: number }>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ oils, generatedAt: new Date().toISOString() }),
  }
}

describe('getStockBadgeState', () => {
  it('maps in-stock to the green "Ships Tomorrow" badge', () => {
    const state = getStockBadgeState('in-stock')

    expect(state.variant).toBe('in-stock')
    expect(state.label).toBe('In Stock — Ships Tomorrow')
  })

  it('maps preorder to the gold "Ships in 2-4 Weeks" badge', () => {
    const state = getStockBadgeState('preorder')

    expect(state.variant).toBe('preorder')
    expect(state.label).toBe('Pre-Order — Ships in 2-4 Weeks')
  })

  it('maps out to a neutral badge', () => {
    const state = getStockBadgeState('out')

    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Out of Stock')
  })

  it('maps loading to a neutral checking badge', () => {
    const state = getStockBadgeState('loading')

    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Checking availability…')
  })

  it('maps error to a neutral unavailable badge', () => {
    const state = getStockBadgeState('error')

    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Stock status unavailable')
  })

  it('maps an undefined status to a neutral badge', () => {
    expect(getStockBadgeState(undefined).variant).toBe('neutral')
  })

  it.each<StockBadgeInput>(['out', 'loading', 'error', undefined])(
    'never claims "Ships Tomorrow" for non-confirmed status %s',
    (status) => {
      expect(getStockBadgeState(status).label).not.toContain('Ships Tomorrow')
    }
  )
})

describe('resolveBlendStockStatus', () => {
  it('is in-stock when every oil is in-stock', () => {
    expect(resolveBlendStockStatus(['in-stock', 'in-stock'])).toBe('in-stock')
  })

  it('is preorder when any oil is preorder', () => {
    expect(resolveBlendStockStatus(['in-stock', 'preorder'])).toBe('preorder')
  })

  it('is out when any oil is out', () => {
    expect(resolveBlendStockStatus(['in-stock', 'out'])).toBe('out')
  })

  it('is out when any oil status is unknown', () => {
    expect(resolveBlendStockStatus(['in-stock', undefined])).toBe('out')
  })

  it('is out for an empty blend', () => {
    expect(resolveBlendStockStatus([])).toBe('out')
  })

  it('out wins over preorder (least optimistic truthful status)', () => {
    expect(resolveBlendStockStatus(['preorder', 'out'])).toBe('out')
  })
})

describe('STOCKED_OIL_IDS legacy fallback', () => {
  it('no longer contains jojoba', () => {
    expect(STOCKED_OIL_IDS.has('jojoba')).toBe(false)
  })

  it('contains exactly the 5 seeded in-stock oils', () => {
    expect(STOCKED_OIL_IDS.size).toBe(5)
    expect(Array.from(STOCKED_OIL_IDS).sort()).toEqual(
      ['clove-bud', 'eucalyptus', 'lavender', 'lemongrass', 'tea-tree'].sort()
    )
  })

  it('legacy hasPreorderItems still flags non-stocked oils as preorder', () => {
    expect(hasPreorderItems([{ name: 'Lavender Pure Essential Oil' }])).toBe(false)
    expect(hasPreorderItems([{ name: 'Lemongrass Essential Oil' }])).toBe(false)
    expect(hasPreorderItems([{ unlocksOilId: 'lemon' }])).toBe(true)
    // jojoba is no longer treated as stocked by the legacy fallback either
    expect(hasPreorderItems([{ name: 'Jojoba Carrier Oil' }])).toBe(true)
  })
})

describe('fetchOilStockStatuses', () => {
  it('fetches the status map from /api/inventory/status', async () => {
    mockFetch.mockResolvedValue(okResponse({ 'tea-tree': { status: 'in-stock', available: 30 } }))

    const map = await fetchOilStockStatuses()

    expect(mockFetch).toHaveBeenCalledWith('/api/inventory/status')
    expect(map?.['tea-tree'].status).toBe('in-stock')
  })

  it('serves a second call from the 60s cache without refetching', async () => {
    mockFetch.mockResolvedValue(okResponse({ 'tea-tree': { status: 'in-stock', available: 30 } }))

    await fetchOilStockStatuses()
    const second = await fetchOilStockStatuses()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(second?.['tea-tree'].status).toBe('in-stock')
  })

  it('de-dupes concurrent calls into a single request', async () => {
    mockFetch.mockResolvedValue(okResponse({ lavender: { status: 'preorder', available: 0 } }))

    const [a, b] = await Promise.all([fetchOilStockStatuses(), fetchOilStockStatuses()])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('returns null on a non-ok response so badges fall to neutral', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })

    expect(await fetchOilStockStatuses()).toBeNull()
  })

  it('returns null when the fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))

    expect(await fetchOilStockStatuses()).toBeNull()
  })

  it('returns null for a malformed response body', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ unexpected: true }) })

    expect(await fetchOilStockStatuses()).toBeNull()
  })
})
