/**
 * deductInventory Tests
 *
 * Covers the floor-at-0 fix: stock never drifts negative, a warning is logged
 * when a deduction would exceed on-hand stock, and oil deductions record the
 * real ml consumed in jsonb metadata.
 */

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      inventoryItems: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(),
  },
}))

jest.mock('@/lib/logging/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { db } from '@/lib/db'
import { logger } from '@/lib/logging/logger'
import { deductInventory } from '@/lib/inventory/inventory'

const mockFindFirst = (db as any).query.inventoryItems.findFirst as jest.Mock
const mockUpdate = (db as any).update as jest.Mock
const mockWarn = logger.warn as jest.Mock
const mockError = logger.error as jest.Mock

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

/** Captures every object passed to db.update(...).set(...) */
function captureSetArgs(): any[] {
  const setArgs: any[] = []
  mockUpdate.mockImplementation(() => ({
    set: (arg: any) => {
      setArgs.push(arg)
      return { where: jest.fn().mockResolvedValue([]) }
    },
  }))
  return setArgs
}

/** Extracts the plain-string chunks from a drizzle SQL template (circular-safe) */
function sqlStringChunks(sqlObj: any): string {
  if (!sqlObj || !Array.isArray(sqlObj.queryChunks)) return String(sqlObj)
  return sqlObj.queryChunks
    .map((c: any) => {
      if (typeof c === 'string') return c
      if (Array.isArray(c?.value)) return c.value.join('')
      return ''
    })
    .join('')
}

beforeEach(() => {
  mockFindFirst.mockResolvedValue(inventoryRow(100))
})

describe('deductInventory', () => {
  it('floors the deduction at 0 using GREATEST so stock never drifts negative', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(1))
    const setArgs = captureSetArgs()

    await deductInventory([{ name: 'Lavender Pure Essential Oil', quantity: 3 }])

    expect(setArgs.length).toBeGreaterThan(0)
    for (const arg of setArgs) {
      expect(sqlStringChunks(arg.quantity)).toContain('GREATEST')
    }
  })

  it('warns when a deduction would exceed on-hand stock', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(1))
    captureSetArgs()

    await deductInventory([{ name: 'Lavender Pure Essential Oil', quantity: 3 }])

    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('flooring at 0'),
      expect.objectContaining({ qty: 3, onHand: 1 })
    )
  })

  it('does not warn when stock is sufficient', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(100))
    captureSetArgs()

    await deductInventory([{ name: 'Lavender Pure Essential Oil', quantity: 1 }])

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('skips unknown SKUs with a warning instead of writing anything', async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const setArgs = captureSetArgs()

    await deductInventory([{ name: 'Lavender Pure Essential Oil', quantity: 1 }])

    expect(setArgs).toHaveLength(0)
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('no inventory record'),
      expect.anything()
    )
  })

  it('records the real ml consumed per blend oil in metadata', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(100))
    const setArgs = captureSetArgs()

    await deductInventory([
      {
        quantity: 2,
        customMix: {
          totalVolume: 30,
          oils: [
            { oilId: 'tea-tree', oilName: 'Tea Tree', ml: 10 },
            { oilId: 'lavender', oilName: 'Lavender', ml: 5 },
          ],
        },
      },
    ])

    const withMetadata = setArgs.filter((arg) => arg.metadata)
    const mlValues = withMetadata.map((arg) => arg.metadata.lastDeduction.ml).sort((a, b) => a - b)
    expect(mlValues).toEqual([10, 20]) // 5ml x 2 units, 10ml x 2 units
    for (const arg of withMetadata) {
      expect(arg.metadata.lastDeduction.units).toBe(2)
      expect(typeof arg.metadata.lastDeduction.at).toBe('string')
    }
  })

  it('does not write ml metadata for non-oil SKUs (bottle, cap)', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(100))
    const setArgs = captureSetArgs()

    await deductInventory([
      {
        quantity: 1,
        customMix: {
          totalVolume: 30,
          oils: [{ oilId: 'tea-tree', oilName: 'Tea Tree', ml: 10 }],
        },
      },
    ])

    // 3 SKUs: bottle + cap (no metadata) + oil (metadata)
    expect(setArgs).toHaveLength(3)
    expect(setArgs.filter((arg) => arg.metadata)).toHaveLength(1)
    expect(setArgs.filter((arg) => !('metadata' in arg))).toHaveLength(2)
  })

  it('records bottle-volume ml for single-oil products', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(100))
    const setArgs = captureSetArgs()

    await deductInventory([
      { name: 'Lavender Pure Essential Oil', configuration: { bottleSize: '10ml' }, quantity: 2 },
    ])

    const oilArg = setArgs.find((arg) => arg.metadata)
    expect(oilArg.metadata.lastDeduction.ml).toBe(20) // 10ml x 2 units
  })

  it('logs an error and continues when an update fails', async () => {
    mockFindFirst.mockResolvedValue(inventoryRow(100))
    mockUpdate.mockImplementation(() => ({
      set: () => ({ where: () => Promise.reject(new Error('db down')) }),
    }))

    await expect(
      deductInventory([{ name: 'Lavender Pure Essential Oil', quantity: 1 }])
    ).resolves.toBeUndefined()

    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to deduct'),
      expect.any(Error)
    )
  })
})
