/**
 * Hardening Tests — lib/inventory/client.ts
 *
 * Complements tests/stock-badge-state.test.ts with:
 *  - getStockBadgeState mapping completeness (incl. out-of-contract values)
 *  - resolveBlendStockStatus arity/order edges
 *  - fetchOilStockStatuses: exact 60s TTL boundary, error-not-cached retry,
 *    concurrent rejection, and the unvalidated-oils-shape gap
 *  - extractOilIdFromName heuristic edge cases (check-order precedence,
 *    substring vs word matching, "TeaTree" without a space)
 */

import {
  _resetOilStockStatusCache,
  extractOilIdFromName,
  fetchOilStockStatuses,
  getPreorderOils,
  getStockBadgeState,
  hasPreorderItems,
  resolveBlendStockStatus,
  type OilStockStatus,
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

// ============================================================================
// getStockBadgeState — mapping completeness
// ============================================================================

describe('getStockBadgeState — completeness', () => {
  it('maps every OilStockStatus to a same-named or neutral variant with a distinct label', () => {
    const labels = new Set<string>()
    for (const status of ['in-stock', 'preorder', 'out'] as OilStockStatus[]) {
      const state = getStockBadgeState(status)
      expect(['in-stock', 'preorder', 'neutral']).toContain(state.variant)
      expect(state.label.length).toBeGreaterThan(0)
      labels.add(state.label)
    }
    expect(labels.size).toBe(3) // no two statuses share a label
  })

  it('only ever emits the three known variants, for any input', () => {
    const inputs: StockBadgeInput[] = ['in-stock', 'preorder', 'out', 'loading', 'error', undefined]
    for (const input of inputs) {
      expect(['in-stock', 'preorder', 'neutral']).toContain(getStockBadgeState(input).variant)
    }
  })

  it('treats an out-of-contract string as "unavailable", never as in-stock', async () => {
    const state = getStockBadgeState('weird-db-value' as StockBadgeInput)

    expect(state.variant).toBe('neutral')
    expect(state.label).toBe('Stock status unavailable')
  })

  it('pins the exact user-facing labels (copy is a contract)', () => {
    expect(getStockBadgeState('in-stock').label).toBe('In Stock — Ships Tomorrow')
    expect(getStockBadgeState('preorder').label).toBe('Pre-Order — Ships in 2-4 Weeks')
    expect(getStockBadgeState('out').label).toBe('Out of Stock')
    expect(getStockBadgeState('loading').label).toBe('Checking availability…')
    expect(getStockBadgeState('error').label).toBe('Stock status unavailable')
  })
})

// ============================================================================
// resolveBlendStockStatus — arity and order edges
// ============================================================================

describe('resolveBlendStockStatus — edges', () => {
  it.each([
    [['in-stock'], 'in-stock'],
    [['preorder'], 'preorder'],
    [['out'], 'out'],
    [[undefined], 'out'],
  ] as Array<[Array<OilStockStatus | undefined>, StockBadgeInput]>)(
    'resolves a single-oil blend %j → %s',
    (statuses, expected) => {
      expect(resolveBlendStockStatus(statuses)).toBe(expected)
    }
  )

  it('is order-independent: out wins from any position', () => {
    expect(resolveBlendStockStatus(['out', 'in-stock', 'preorder'])).toBe('out')
    expect(resolveBlendStockStatus(['in-stock', 'preorder', 'out'])).toBe('out')
    expect(resolveBlendStockStatus(['preorder', 'out', 'in-stock'])).toBe('out')
  })

  it('resolves a five-oil blend with all oils in stock', () => {
    expect(
      resolveBlendStockStatus(['in-stock', 'in-stock', 'in-stock', 'in-stock', 'in-stock'])
    ).toBe('in-stock')
  })

  it('keeps preorder when nothing is out or unknown', () => {
    expect(resolveBlendStockStatus(['preorder', 'preorder', 'in-stock'])).toBe('preorder')
  })

  it('unknown (undefined) beats preorder', () => {
    expect(resolveBlendStockStatus(['preorder', undefined])).toBe('out')
  })
})

// ============================================================================
// fetchOilStockStatuses — TTL boundary, retry, concurrency
// ============================================================================

describe('fetchOilStockStatuses — cache lifecycle', () => {
  it('serves the cache at 59,999ms and refetches at exactly 60,000ms', async () => {
    const nowSpy = jest.spyOn(Date, 'now')
    nowSpy.mockReturnValue(1_000_000)
    mockFetch.mockResolvedValue(okResponse({ 'tea-tree': { status: 'in-stock', available: 9 } }))

    await fetchOilStockStatuses()
    expect(mockFetch).toHaveBeenCalledTimes(1)

    nowSpy.mockReturnValue(1_000_000 + 59_999)
    const cached = await fetchOilStockStatuses()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(cached?.['tea-tree'].available).toBe(9)

    // Boundary is exclusive: age === TTL is stale
    nowSpy.mockReturnValue(1_000_000 + 60_000)
    await fetchOilStockStatuses()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('does NOT cache failures — the next call retries the fetch', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(okResponse({ lavender: { status: 'preorder', available: 0 } }))

    const first = await fetchOilStockStatuses()
    const second = await fetchOilStockStatuses()

    expect(first).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(second?.lavender.status).toBe('preorder')
  })

  it('does NOT cache non-ok responses — the next call retries', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValue(okResponse({ 'tea-tree': { status: 'in-stock', available: 1 } }))

    expect(await fetchOilStockStatuses()).toBeNull()
    expect(await fetchOilStockStatuses()).not.toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('shares a rejected fetch across concurrent callers, then recovers', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(okResponse({ 'tea-tree': { status: 'in-stock', available: 1 } }))

    const [a, b] = await Promise.all([fetchOilStockStatuses(), fetchOilStockStatuses()])

    expect(a).toBeNull()
    expect(b).toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(1) // single in-flight promise, shared rejection

    const recovered = await fetchOilStockStatuses()
    expect(recovered).not.toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('de-dupes three concurrent callers into one request', async () => {
    mockFetch.mockResolvedValue(okResponse({ 'tea-tree': { status: 'in-stock', available: 1 } }))

    const results = await Promise.all([
      fetchOilStockStatuses(),
      fetchOilStockStatuses(),
      fetchOilStockStatuses(),
    ])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(results[0]).toBe(results[1])
    expect(results[1]).toBe(results[2])
  })

  it('accepts an empty oils map as a valid (cacheable) response', async () => {
    mockFetch.mockResolvedValue(okResponse({}))

    const first = await fetchOilStockStatuses()
    const second = await fetchOilStockStatuses()

    expect(first).toEqual({})
    expect(second).toEqual({})
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('pins the shape-validation gap: a truthy non-object oils value passes through', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ oils: 'not-a-map', generatedAt: 'x' }),
    })

    // Only falsy oils values are rejected — the typeof check is on the body, not oils
    const result = await fetchOilStockStatuses()
    expect(result as unknown).toBe('not-a-map')
  })

  it('returns null when res.json() itself throws', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalid json')
      },
    })

    expect(await fetchOilStockStatuses()).toBeNull()
  })

  it('returns null when the body is literal null', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => null })

    expect(await fetchOilStockStatuses()).toBeNull()
  })
})

// ============================================================================
// extractOilIdFromName — heuristic edges
// ============================================================================

describe('extractOilIdFromName', () => {
  it('matches stocked oils case-insensitively', () => {
    expect(extractOilIdFromName('Lavender Pure Essential Oil')).toBe('lavender')
    expect(extractOilIdFromName('LAVENDER OIL')).toBe('lavender')
    expect(extractOilIdFromName('Eucalyptus Radiata Oil')).toBe('eucalyptus')
    expect(extractOilIdFromName('Lemongrass Essential Oil')).toBe('lemongrass')
  })

  it('requires the space in "tea tree" — "TeaTree" does not match', () => {
    expect(extractOilIdFromName('Tea Tree Essential Oil')).toBe('tea-tree')
    expect(extractOilIdFromName('TeaTree Essential Oil')).toBeUndefined()
  })

  it('matches "clove" as a bare substring (Clovebud qualifies)', () => {
    expect(extractOilIdFromName('Clove Bud Oil')).toBe('clove-bud')
    expect(extractOilIdFromName('Clovebud Oil')).toBe('clove-bud')
  })

  it('extracts jojoba even though it is not sellable (callers must filter)', () => {
    expect(extractOilIdFromName('Jojoba Carrier Oil')).toBe('jojoba')
  })

  it('returns undefined for unknown oils and missing names', () => {
    expect(extractOilIdFromName('Lemon Essential Oil')).toBeUndefined()
    expect(extractOilIdFromName('Bergamot Essential Oil')).toBeUndefined()
    expect(extractOilIdFromName(undefined)).toBeUndefined()
    expect(extractOilIdFromName('')).toBeUndefined()
  })

  it('does not match "Lavandin" (substring boundary)', () => {
    expect(extractOilIdFromName('Lavandin Grosso Oil')).toBeUndefined()
  })

  it('pins the fixed check order: lavender wins regardless of word position', () => {
    expect(extractOilIdFromName('Lavender Tea Tree Blend')).toBe('lavender')
    expect(extractOilIdFromName('Tea Tree Lavender Blend')).toBe('lavender')
  })

  it('pins the check order for clove vs earlier oils', () => {
    // eucalyptus is checked before clove
    expect(extractOilIdFromName('Eucalyptus Clove Blend')).toBe('eucalyptus')
  })
})

// ============================================================================
// Legacy preorder helpers (client.ts copies) — field precedence pins
// ============================================================================

describe('legacy preorder helpers (client.ts) — field precedence', () => {
  it('extracts blend oil ids from .name before .oilName', () => {
    // .name matches the heuristic (stocked) while oilId-less oilName would not
    const items = [
      { customMix: { oils: [{ oilId: undefined as unknown as string, name: 'Lavender Oil', oilName: 'Unknown', ml: 5 }] } },
    ]

    expect(hasPreorderItems(items)).toBe(false)
  })

  it('prefers an explicit oilId over any name', () => {
    const items = [
      { customMix: { oils: [{ oilId: 'sandalwood', name: 'Lavender Oil', ml: 5 }] } },
    ]

    expect(hasPreorderItems(items)).toBe(true)
  })

  it('displays preorder blend oils by oilName before name', () => {
    const oils = getPreorderOils([
      { customMix: { oils: [{ oilId: 'sandalwood', oilName: 'Sandalwood', name: 'Fallback Name', ml: 5 }] } },
    ])

    expect(oils).toEqual(['Sandalwood'])
  })
})
