/**
 * Hardening Tests — lib/inventory/availability.ts uncovered boundaries
 *
 * Complements tests/inventory-availability.test.ts with the edges it misses:
 * reserved-vs-available interplay at the exact boundary, negative availability
 * (over-reservation) degrading to preorder, size/oilId normalization quirks,
 * non-finite quantities, single-query batching, and mixed-status aggregation.
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

import { db } from '@/lib/db'
import {
  checkInventoryAvailability,
  getOilStockStatuses,
  DEFAULT_OIL_SIZE,
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

beforeEach(() => {
  mockFindMany.mockReset()
  mockFindMany.mockResolvedValue([])
})

describe('exported constants', () => {
  it('pins the default oil size and the probed badge sizes', () => {
    expect(DEFAULT_OIL_SIZE).toBe('30ml')
    expect(OIL_STOCK_SIZES).toEqual(['5ml', '10ml', '15ml', '20ml', '30ml'])
  })
})

describe('checkInventoryAvailability — boundaries', () => {
  it('passes when requested quantity exactly equals available after reservations', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 10, 5)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 5 }])

    expect(result.ok).toBe(true)
  })

  it('fails when requested is one more than available after reservations', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 10, 5)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 6 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('need 6, have 5')
  })

  it('treats over-reserved stock (reserved > quantity, negative available) as preorder', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lemon', '30ml'), 3, 10)])

    const result = await checkInventoryAvailability([{ oilId: 'lemon', quantity: 100 }])

    // available = -7 → available <= 0 → preorder path — never blocked
    expect(result.ok).toBe(true)
    expect(result.failures).toEqual([])
  })

  it('treats fully-reserved stock (available exactly 0) as preorder', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lemon', '30ml'), 5, 5)])

    const result = await checkInventoryAvailability([{ oilId: 'lemon', quantity: 1 }])

    expect(result.ok).toBe(true)
  })

  it('checks multiple sizes of the same oil in one cart independently', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '5ml'), 1),
      oilRow(oilSku('tea-tree', '30ml'), 30),
    ])

    const result = await checkInventoryAvailability([
      { oilId: 'tea-tree', size: '5ml', quantity: 2 }, // 2 > 1 → insufficient
      { oilId: 'tea-tree', size: '30ml', quantity: 2 },
    ])

    expect(result.ok).toBe(false)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0].id).toBe('tea-tree')
    expect(result.failures[0].reason).toContain('(5ml)')
  })

  it('aggregates duplicate lines across size case variants ("30ml" + "30ML")', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 3)])

    const result = await checkInventoryAvailability([
      { oilId: 'tea-tree', size: '30ml', quantity: 2 },
      { oilId: 'tea-tree', size: '30ML', quantity: 2 },
    ])

    // Both normalize to OIL-TEATREE-30ML → 4 needed vs 3 available
    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('need 4')
  })

  it('treats an empty-string size as the 30ml default', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 1)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', size: '', quantity: 1 }])

    expect(result.ok).toBe(true)
  })

  it('does NOT trim whitespace in oilIds — fails closed on the unknown SKU', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lavender', '30ml'), 10)])

    const result = await checkInventoryAvailability([{ oilId: ' lavender', quantity: 1 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('unknown oil')
  })

  it('normalizes oilId case via the SKU (Lavender matches lavender rows)', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lavender', '30ml'), 10)])

    const result = await checkInventoryAvailability([{ oilId: 'Lavender', quantity: 1 }])

    expect(result.ok).toBe(true)
  })

  it('accepts fractional quantities (0.5 is finite and positive)', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 1)])

    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: 0.5 }])

    expect(result.ok).toBe(true)
  })

  it('rejects NaN quantity as invalid', async () => {
    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: NaN }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('invalid quantity')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('rejects Infinity quantity as invalid', async () => {
    const result = await checkInventoryAvailability([{ oilId: 'tea-tree', quantity: Infinity }])

    expect(result.ok).toBe(false)
    expect(result.failures[0].reason).toContain('invalid quantity')
  })

  it('reports a missing (undefined) oilId without touching the database', async () => {
    const result = await checkInventoryAvailability([{ oilId: undefined as unknown as string, quantity: 1 }])

    expect(result.ok).toBe(false)
    expect(result.failures[0]).toEqual({ id: '(missing)', reason: 'missing oilId' })
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('still checks valid items against the DB when other items fail pre-validation', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 10)])

    const result = await checkInventoryAvailability([
      { oilId: 'tea-tree', quantity: 0 }, // invalid — pre-validation failure
      { oilId: 'tea-tree', size: '5ml', quantity: 1 }, // valid shape but unknown SKU row
    ])

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(false)
    expect(result.failures).toHaveLength(2)
  })

  it('batches all SKUs into a single findMany query', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '30ml'), 10),
      oilRow(oilSku('lavender', '10ml'), 10),
      oilRow(oilSku('clove-bud', '5ml'), 10),
    ])

    await checkInventoryAvailability([
      { oilId: 'tea-tree', quantity: 1 },
      { oilId: 'lavender', size: '10ml', quantity: 1 },
      { oilId: 'clove-bud', size: '5ml', quantity: 1 },
    ])

    expect(mockFindMany).toHaveBeenCalledTimes(1)
  })
})

describe('getOilStockStatuses — boundaries', () => {
  it('handles duplicate oilIds in the request deterministically', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('tea-tree', '30ml'), 7)])

    const statuses = await getOilStockStatuses(['tea-tree', 'tea-tree'])

    expect(statuses['tea-tree']).toEqual({ status: 'in-stock', available: 7 })
  })

  it('pins the case asymmetry: output keys must match the seeded lowercase id exactly', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lavender', '30ml'), 4)])

    const statuses = await getOilStockStatuses(['Lavender', 'lavender'])

    // Both inputs probe the same SKUs, but the reverse SKU→oilId map keeps only
    // the last-cased variant, so 'Lavender' never gets credited with the row.
    expect(statuses['lavender']).toEqual({ status: 'in-stock', available: 4 })
    expect(statuses['Lavender']).toEqual({ status: 'out', available: 0 })
  })

  it('ignores rows whose SKU is outside the probed set', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '30ml'), 0), // probed
      oilRow('OIL-UNRELATED-30ML', 99), // not probed — must be skipped
    ])

    const statuses = await getOilStockStatuses(['tea-tree'])

    expect(statuses['tea-tree']).toEqual({ status: 'preorder', available: 0 })
  })

  it('reports preorder when quantity is fully reserved (clamped to 0, but the row exists)', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lemon', '30ml'), 8, 8)])

    const statuses = await getOilStockStatuses(['lemon'])

    expect(statuses['lemon']).toEqual({ status: 'preorder', available: 0 })
  })

  it('sums per-size availability with per-row clamping (negative sizes contribute 0)', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '5ml'), 2, 10), // -8 → clamps to 0
      oilRow(oilSku('tea-tree', '30ml'), 6, 1), // 5
    ])

    const statuses = await getOilStockStatuses(['tea-tree'])

    expect(statuses['tea-tree']).toEqual({ status: 'in-stock', available: 5 })
  })

  it('resolves a mixed request — in-stock, preorder and out in one call', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '30ml'), 10),
      oilRow(oilSku('lemon', '30ml'), 0),
    ])

    const statuses = await getOilStockStatuses(['tea-tree', 'lemon', 'ghost-oil'])

    expect(statuses['tea-tree'].status).toBe('in-stock')
    expect(statuses['lemon'].status).toBe('preorder')
    expect(statuses['ghost-oil'].status).toBe('out')
  })

  it('reports preorder when only some sizes have rows and all are at zero', async () => {
    mockFindMany.mockResolvedValue([oilRow(oilSku('lemon', '5ml'), 0)]) // other sizes have no rows

    const statuses = await getOilStockStatuses(['lemon'])

    // A single seen row is enough to distinguish preorder from out
    expect(statuses['lemon']).toEqual({ status: 'preorder', available: 0 })
  })

  it('keeps per-oil accounting independent when several oils share the query', async () => {
    mockFindMany.mockResolvedValue([
      oilRow(oilSku('tea-tree', '30ml'), 10, 4), // 6
      oilRow(oilSku('lavender', '30ml'), 3), // 3
    ])

    const statuses = await getOilStockStatuses(['tea-tree', 'lavender'])

    expect(statuses['tea-tree'].available).toBe(6)
    expect(statuses['lavender'].available).toBe(3)
  })
})
