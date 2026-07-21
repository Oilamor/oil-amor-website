/**
 * Hardening Tests — deductInventory mixed carts + ensureInventoryItems
 * (lib/inventory/inventory.ts)
 *
 * Builds on tests/inventory-deduct.test.ts (floor/warn/skip/error paths) and
 * covers the SKU routing for mixed carts: which SKUs get deducted, in what
 * quantity, and from which item fields. SKU and quantity are extracted from
 * the real drizzle SQL fragments via PgDialect.
 */

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      inventoryItems: { findFirst: jest.fn() },
    },
    update: jest.fn(),
    insert: jest.fn(),
  },
}))

import { db } from '@/lib/db'
import { logger } from '@/lib/logging/logger'
import { deductInventory, ensureInventoryItems } from '@/lib/inventory/inventory'
import { PgDialect } from 'drizzle-orm/pg-core'

const mockFindFirst = (db as any).query.inventoryItems.findFirst as jest.Mock
const mockUpdate = (db as any).update as jest.Mock
const mockInsert = (db as any).insert as jest.Mock

const dialect = new PgDialect()

interface CapturedUpdate {
  sku: string
  deductQty: number
  setArg: any
}

/** Capture (sku, qty, setArg) for every db.update chain. */
function captureUpdates(): CapturedUpdate[] {
  const updates: CapturedUpdate[] = []
  mockUpdate.mockImplementation(() => ({
    set: (setArg: any) => ({
      where: (whereArg: any) => {
        updates.push({
          sku: dialect.sqlToQuery(whereArg).params[0] as string,
          deductQty: dialect.sqlToQuery(setArg.quantity).params[0] as number,
          setArg,
        })
        return Promise.resolve([])
      },
    }),
  }))
  return updates
}

function inventoryRow(quantity: number, reservedQuantity = 0) {
  return {
    id: 'inv_1',
    sku: 'SKU',
    name: 'Item',
    category: 'oil',
    quantity,
    reservedQuantity,
    reorderPoint: 0,
    metadata: null,
    updatedAt: new Date(),
  }
}

beforeEach(() => {
  mockFindFirst.mockResolvedValue(inventoryRow(100))
})

describe('deductInventory — mixed carts', () => {
  it('deducts bottle, cap, oil, crystal and cord SKUs for a full custom mix', async () => {
    const updates = captureUpdates()

    await deductInventory([
      {
        quantity: 1,
        customMix: {
          totalVolume: 30,
          oils: [{ oilId: 'tea-tree', oilName: 'Tea Tree', ml: 10 }],
          crystalId: 'rose-quartz',
          cordId: 'vegan-leather-black',
        },
      },
    ])

    expect(updates.map(u => u.sku)).toEqual([
      'BOTTLE-30ML',
      'CAP-STANDARD',
      'OIL-TEATREE-30ML',
      'CRYSTAL-ROSEQUARTZ',
      'CORD-VEGANLEATHERBLACK',
    ])
    expect(updates.every(u => u.deductQty === 1)).toBe(true)
  })

  it('aggregates quantities across mixed lines sharing the same SKUs', async () => {
    const updates = captureUpdates()

    await deductInventory([
      { name: 'Lavender Pure Essential Oil', quantity: 2 },
      { name: 'Lavender Pure Essential Oil', quantity: 3 },
    ])

    // BOTTLE-30ML, CAP-STANDARD, OIL-LAVENDER-30ML — one update each, qty 5
    expect(updates.map(u => u.sku)).toEqual(['BOTTLE-30ML', 'CAP-STANDARD', 'OIL-LAVENDER-30ML'])
    expect(updates.every(u => u.deductQty === 5)).toBe(true)
  })

  it('handles a standard item and a custom mix in one order', async () => {
    const updates = captureUpdates()

    await deductInventory([
      { name: 'Lavender Pure Essential Oil', quantity: 1 },
      {
        quantity: 2,
        customMix: {
          totalVolume: 10,
          oils: [{ oilId: 'clove-bud', oilName: 'Clove Bud', ml: 2 }],
        },
      },
    ])

    expect(updates.map(u => u.sku)).toEqual([
      'BOTTLE-30ML', // standard item's bottle
      'CAP-STANDARD', // 1 + 2 aggregated
      'OIL-LAVENDER-30ML',
      'BOTTLE-10ML', // mix bottle from totalVolume
      'OIL-CLOVEBUD-10ML',
    ])
    const qtyBySku = Object.fromEntries(updates.map(u => [u.sku, u.deductQty]))
    expect(qtyBySku['BOTTLE-30ML']).toBe(1)
    expect(qtyBySku['CAP-STANDARD']).toBe(3)
    expect(qtyBySku['BOTTLE-10ML']).toBe(2)
    expect(qtyBySku['OIL-CLOVEBUD-10ML']).toBe(2)
  })

  it('defaults quantity to 1 when the item omits it', async () => {
    const updates = captureUpdates()

    await deductInventory([{ name: 'Lavender Pure Essential Oil' }])

    expect(updates.every(u => u.deductQty === 1)).toBe(true)
  })

  it('uses the customMix totalVolume for bottle and oil SKUs', async () => {
    const updates = captureUpdates()

    await deductInventory([
      { quantity: 1, customMix: { totalVolume: 50, oils: [{ oilId: 'lavender', ml: 10 }] } },
    ])

    expect(updates.map(u => u.sku)).toContain('BOTTLE-50ML')
    expect(updates.map(u => u.sku)).toContain('OIL-LAVENDER-50ML')
  })

  it('ignores configuration.crystalName — crystals only deduct from customMix.crystalId', async () => {
    const updates = captureUpdates()

    await deductInventory([
      {
        name: 'Lavender Pure Essential Oil',
        quantity: 1,
        configuration: { crystalName: 'Amethyst' } as any,
      },
    ])

    // Pinned gap: a crystal named in configuration is never deducted
    expect(updates.map(u => u.sku)).toEqual(['BOTTLE-30ML', 'CAP-STANDARD', 'OIL-LAVENDER-30ML'])
  })

  it('resolves the cord with precedence attachment > customMix > configuration', async () => {
    const updates = captureUpdates()

    await deductInventory([
      {
        quantity: 1,
        name: 'Lavender Oil',
        attachment: { cordId: 'hemp-natural' },
        configuration: { cord: 'waxed-cotton-natural' },
        customMix: { totalVolume: 30, oils: [{ oilId: 'lavender', ml: 5 }], cordId: 'cork' },
      },
    ])

    expect(updates.map(u => u.sku)).toContain('CORD-HEMPNATURAL')
    expect(updates.map(u => u.sku)).not.toContain('CORD-CORK')
    expect(updates.map(u => u.sku)).not.toContain('CORD-WAXEDCOTTONNATURAL')
  })

  it('falls back to the name heuristic for blend oils without an oilId', async () => {
    const updates = captureUpdates()

    await deductInventory([
      { quantity: 1, configuration: { oils: [{ name: 'Clove Bud Essential Oil', ml: 5 }] } },
    ])

    expect(updates.map(u => u.sku)).toContain('OIL-CLOVEBUD-30ML')
  })

  it('deducts no oil SKU for items with no identifiable oil', async () => {
    const updates = captureUpdates()

    await deductInventory([{ name: 'Gift Wrapping', quantity: 2 }])

    expect(updates.map(u => u.sku)).toEqual(['BOTTLE-30ML', 'CAP-STANDARD'])
  })

  it('records bottle-volume ml for single-oil products (5ml x 3 = 15ml)', async () => {
    const updates = captureUpdates()

    await deductInventory([
      { name: 'Lavender Pure Essential Oil', configuration: { bottleSize: '5ml' }, quantity: 3 },
    ])

    const oilUpdate = updates.find(u => u.sku === 'OIL-LAVENDER-5ML')!
    expect(oilUpdate.setArg.metadata.lastDeduction.ml).toBe(15)
    expect(oilUpdate.setArg.metadata.lastDeduction.units).toBe(3)
  })

  it('accumulates blend ml across repeated lines of the same oil', async () => {
    const updates = captureUpdates()

    await deductInventory([
      { quantity: 1, customMix: { totalVolume: 30, oils: [{ oilId: 'tea-tree', ml: 10 }] } },
      { quantity: 2, customMix: { totalVolume: 30, oils: [{ oilId: 'tea-tree', ml: 10 }] } },
    ])

    const oilUpdate = updates.find(u => u.sku === 'OIL-TEATREE-30ML')!
    expect(oilUpdate.deductQty).toBe(3)
    expect(oilUpdate.setArg.metadata.lastDeduction.ml).toBe(30) // 10x1 + 10x2
  })

  it('preserves existing row metadata when writing lastDeduction', async () => {
    mockFindFirst.mockResolvedValue({ ...inventoryRow(100), metadata: { origin: 'seed-v1' } })
    const updates = captureUpdates()

    await deductInventory([{ name: 'Lavender Pure Essential Oil', quantity: 1 }])

    const oilUpdate = updates.find(u => u.sku === 'OIL-LAVENDER-30ML')!
    expect(oilUpdate.setArg.metadata.origin).toBe('seed-v1')
    expect(oilUpdate.setArg.metadata.lastDeduction.ml).toBe(30)
  })

  it('skips only the unknown SKU and still deducts the rest of a mixed cart', async () => {
    // Crystal row missing; everything else present
    mockFindFirst.mockImplementation(({ where }: any = {}) => {
      const sku = where ? (dialect.sqlToQuery(where).params[0] as string) : ''
      if (sku.startsWith('CRYSTAL-')) return Promise.resolve(undefined)
      return Promise.resolve(inventoryRow(100))
    })
    const updates = captureUpdates()

    await deductInventory([
      {
        quantity: 1,
        customMix: {
          totalVolume: 30,
          oils: [{ oilId: 'tea-tree', ml: 10 }],
          crystalId: 'rose-quartz',
        },
      },
    ])

    expect(updates.map(u => u.sku)).toEqual(['BOTTLE-30ML', 'CAP-STANDARD', 'OIL-TEATREE-30ML'])
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('CRYSTAL-ROSEQUARTZ'),
      expect.anything()
    )
  })

  it('does nothing for an empty order', async () => {
    const updates = captureUpdates()

    await deductInventory([])

    expect(updates).toEqual([])
    expect(mockFindFirst).not.toHaveBeenCalled()
  })
})

describe('ensureInventoryItems', () => {
  beforeEach(() => {
    mockInsert.mockImplementation(() => ({ values: jest.fn().mockResolvedValue(undefined) }))
  })

  it('inserts all 6 default SKUs when none exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const valuesMock = jest.fn().mockResolvedValue(undefined)
    mockInsert.mockImplementation(() => ({ values: valuesMock }))

    await ensureInventoryItems()

    expect(valuesMock).toHaveBeenCalledTimes(6)
    const skus = valuesMock.mock.calls.map(([v]: any[]) => v.sku)
    expect(skus).toEqual([
      'BOTTLE-5ML',
      'BOTTLE-10ML',
      'BOTTLE-15ML',
      'BOTTLE-20ML',
      'BOTTLE-30ML',
      'CAP-STANDARD',
    ])
  })

  it('seeds new rows at zero quantity with a reorder point of 10', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const valuesMock = jest.fn().mockResolvedValue(undefined)
    mockInsert.mockImplementation(() => ({ values: valuesMock }))

    await ensureInventoryItems()

    for (const [value] of valuesMock.mock.calls) {
      expect(value).toEqual(
        expect.objectContaining({ quantity: 0, reservedQuantity: 0, reorderPoint: 10 })
      )
      expect(value.id).toMatch(/^inv_/)
    }
  })

  it('skips rows that already exist (never duplicates)', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(50))
    const valuesMock = jest.fn().mockResolvedValue(undefined)
    mockInsert.mockImplementation(() => ({ values: valuesMock }))

    await ensureInventoryItems()

    expect(valuesMock).not.toHaveBeenCalled()
  })
})
