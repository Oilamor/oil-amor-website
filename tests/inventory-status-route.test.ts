/**
 * Inventory Status API Route Tests
 *
 * Verifies the response shape of GET /api/inventory/status — the single
 * source of truth for stock badges — including its failure mode.
 */

jest.mock('@/lib/logging/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock('@/lib/content/pricing-engine-final', () => ({
  WHOLESALE_OILS: {
    'tea-tree': { name: 'Tea Tree', pricePerLiter: 146, rarity: 'common' },
    lavender: { name: 'Lavender', pricePerLiter: 115, rarity: 'common' },
  },
}))

jest.mock('@/lib/inventory/availability', () => ({
  getOilStockStatuses: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      body,
      json: async () => body,
    }),
  },
}))

import { GET } from '@/app/api/inventory/status/route'
import { getOilStockStatuses } from '@/lib/inventory/availability'

const mockGetOilStockStatuses = getOilStockStatuses as jest.Mock

function makeRequest(url: string): any {
  return { url }
}

beforeEach(() => {
  mockGetOilStockStatuses.mockResolvedValue({
    'tea-tree': { status: 'in-stock', available: 30 },
    lavender: { status: 'preorder', available: 0 },
  })
})

describe('GET /api/inventory/status', () => {
  it('returns the per-oil status map with generatedAt and brief cache headers', async () => {
    const res = await GET(makeRequest('http://localhost/api/inventory/status'))

    expect(res.status).toBe(200)
    expect(res.body.oils['tea-tree']).toEqual({ status: 'in-stock', available: 30 })
    expect(res.body.oils['lavender']).toEqual({ status: 'preorder', available: 0 })
    expect(typeof res.body.generatedAt).toBe('string')
    expect(res.headers['Cache-Control']).toContain('s-maxage=60')
  })

  it('defaults to every sellable catalog oil when no oils param is given', async () => {
    await GET(makeRequest('http://localhost/api/inventory/status'))

    expect(mockGetOilStockStatuses).toHaveBeenCalledWith(['tea-tree', 'lavender'])
  })

  it('filters to the oils requested via ?oils=', async () => {
    mockGetOilStockStatuses.mockResolvedValue({
      'tea-tree': { status: 'in-stock', available: 30 },
    })

    const res = await GET(makeRequest('http://localhost/api/inventory/status?oils=tea-tree'))

    expect(mockGetOilStockStatuses).toHaveBeenCalledWith(['tea-tree'])
    expect(Object.keys(res.body.oils)).toEqual(['tea-tree'])
  })

  it('returns 500 with no-store caching when the status lookup fails', async () => {
    mockGetOilStockStatuses.mockRejectedValue(new Error('db down'))

    const res = await GET(makeRequest('http://localhost/api/inventory/status'))

    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
    expect(res.body.oils).toBeUndefined()
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
})
