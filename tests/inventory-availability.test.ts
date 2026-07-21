/**
 * Inventory Availability Tests
 *
 * Covers checkInventoryAvailability (checkout guard — stocked / preorder /
 * unknown / insufficient classification) and getOilStockStatuses (the
 * per-oil badge truth backing /api/inventory/status).
 */

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      inventoryItems: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
  },
}))

jest.mock('@/lib/logging/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { db } from '@/lib/db'
import {
  checkInventoryAvailability,
  getOilStockStatuses,
  OIL_STOCK_SIZES,
} from '@/lib/inventory/availability'

const mockFindMany = (db as any).query.inventoryItems.findMany as jest.Mock

function oilRow(sku: string, quantity: number, reservedQuantity = 0) {
  return {
    id: `inv_${sku}`,
    sku,
    name: `Oil ${sku}`,
    category: 'oil',
    quantity,
    reservedQuantity,
    reorderPoint: 10,
    metadata: null,
    updatedAt: new Date(),
  }
}

function oilSku(oilId: string, size: string) {
  return `OIL-${oilId.toUpperCase().replace(/-/g, '')}-${size.toUpperCase()}`
}

function oilRowsForAllSizes(oilId: string, quantityPerSize: number | Record<string, number>) {
  return OIL_STOCK_SIZES.map((size) => {
    const qty = typeof quantityPerSize === 'number' ? quantityPerSize : quantityPerSize[size] ?? 0
    return oilRow(oilSku(oilId, size), qty)
  })
}

beforeEach(() => {
  mockFindMany.mockResolvedValue([])
})

describe('checkInventoryAvailability', () => {
  it('passes for an in-stock oil with sufficient quantity', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 30)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 1 }])

    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
  })

  it('passes when the requested quantity exactly equals available stock', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lavender', '30ml'), 5)])

    const result = await checkInventoryAvailability([{ oilId: 'lavender', quantity: 5 }])

    expect(result.ok).toBe(true)
  })

  it('allows preorder oils seeded at zero stock', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lemon', '30ml'), 0)])

    const result = await checkInventoryAvailability([{ oilId: 'lemon', quantity: 3 }])

    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
  })

  it('fails closed for unknown oils with no inventory record', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await checkInventoryAvailability([{ oilId: 'not-a-real-oil', quantity: 1 }])

    expect(result.ok).toBe(false)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].id).toBe('not-a-real-oil')
    expect(result.failures[0].reason).toContain('unknown oil')
  })

  it('fails closed for jojoba, which is not in the sellable catalog', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await checkInventoryAvailability([{ oilId: 'jojoba', quantity: 1 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].id).toBe('jojoba')
  })

  it('fails when the requested quantity exceeds available stock', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 3)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 5 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('insufficient stock')
    expect(result.failures[0].reason).toContain('need 5')
    expect(result.failures[0].reason).toContain('have 3')
  })

  it('rejects a zero quantity without querying the database', async () => {
    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 0 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('invalid quantity')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('rejects a negative quantity', async () => {
    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: -2 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('invalid quantity')
  })

  it('rejects a missing oilId', async () => {
    const result = await checkInventoryAvailability([{ oilId: '', quantity: 1 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('missing oilId')
  })

  it('aggregates duplicate oil+size lines before checking stock', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 3)])

    const result = await checkInventoryAvailability([
      { oilId: 'tea-tree', size: '30ml', quantity: 2 },
      { oilId: 'tea-tree', size: '30ml', quantity: 2 },
    ])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('insufficient stock')
  })

  it('checks each bottle size independently', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '5ml'), 0), // preorder at this size
      oilRow(oilSku('tea-tree', '30ml'), 30), // stocked at this size
    ])

    const result = await checkInventoryAvailability([
      { oilId: 'tea-tree', size: '5ml', quantity: 1 },
      { oilId: 'tea-tree', size: '30ml', quantity: 1 },
    ])

    expect(result.ok).toBe(true)
  })

  it('subtracts reserved quantity from availability', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 10, 9)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 2 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('insufficient stock')
  })

  it('defaults to the 30ml size when no size is given', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 10)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 1 }])

    expect(result.ok).toBe(true)
  })

  it('returns ok for an empty item list without hitting the database', async () => {
    const result = await checkInventoryAvailability([])

    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('collects failures across multiple items', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 1)])

    const result = await checkInventoryAvailability([
      { oilId: 'tea-tree', quantity: 5 }, // insufficient
      { oilId: 'ghost-oil', quantity: 1 }, // unknown
      { oilId: 'lemon', quantity: 1 }, // unknown (no row returned)
    ])

    expect(result.ok).toBe(false)
    expect(result.failures).toHaveLength(3)
    expect(result.failures.map((f) => f.id)).toEqual(['tea-tree', 'ghost-oil', 'lemon'])
  })
})

describe('getOilStockStatuses', () => {
  it('reports in-stock when any bottle size has available stock', async () => {
    mockFindMany.mockResolvedValue(
      oilRowsForAllSizes('tea-tree', { '5ml': 0, '10ml': 0, '15ml': 0, '20ml': 0, '30ml': 5 })
    )

    const statuses = await getOilStockStatuses(['tea-tree'])

    expect(statuses['tea-tree'].status).toBe('in-stock')
    expect(statuses['tea-tree'].available).toBe(5)
  })

  it('reports preorder when rows exist but nothing is available', async () => {
    mockFindMany.mockResolvedValue(oilRowsForAllSizes('lemon', 0))

    const statuses = await getOilStockStatuses(['lemon'])

    expect(statuses['lemon'].status).toBe('preorder')
    expect(statuses['lemon'].available).toBe(0)
  })

  it('reports out for oils with no inventory rows at all', async () => {
    mockFindMany.mockResolvedValue([])

    const statuses = await getOilStockStatuses(['ghost-oil'])

    expect(statuses['ghost-oil'].status).toBe('out')
    expect(statuses['ghost-oil'].available).toBe(0)
  })

  it('sums available stock across all bottle sizes', async () => {
    mockFindMany.mockResolvedValue(oilRowsForAllSizes('lavender', 10))

    const statuses = await getOilStockStatuses(['lavender'])

    expect(statuses['lavender'].status).toBe('in-stock')
    expect(statuses['lavender'].available).toBe(10 * OIL_STOCK_SIZES.length)
  })

  it('clamps availability at zero when reserved exceeds quantity', async () => {
    mockFindMany.mockResolvedValue(
      OIL_STOCK_SIZES.map((size) => oilRow(oilSku('clove-bud', size), 2, 5))
    )

    const statuses = await getOilStockStatuses(['clove-bud'])

    expect(statuses['clove-bud'].status).toBe('preorder')
    expect(statuses['clove-bud'].available).toBe(0)
  })

  it('resolves jojoba to out since it is not seeded or sellable', async () => {
    mockFindMany.mockResolvedValue(oilRowsForAllSizes('tea-tree', 30))

    const statuses = await getOilStockStatuses(['tea-tree', 'jojoba'])

    expect(statuses['tea-tree'].status).toBe('in-stock')
    expect(statuses['jojoba'].status).toBe('out')
  })

  it('returns an empty map for an empty oil list', async () => {
    const statuses = await getOilStockStatuses([])

    expect(statuses).toEqual({})
    expect(mockFindMany).not.toHaveBeenCalled()
  })
})
