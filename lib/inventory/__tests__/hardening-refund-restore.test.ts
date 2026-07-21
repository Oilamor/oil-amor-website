/**
 * Hardening Tests — lib/inventory/refund-restore.ts
 *
 * Complements lib/inventory/__tests__/refund-restore.test.ts with:
 *  - a pin of the documented NON-idempotency (a second call restores again)
 *  - partial restores that isolate a single failing SKU in a mixed order
 *  - items with missing/unidentifiable SKUs (no name, unknown blend names)
 *  - bottle-size/cord/crystal resolution parity with deductInventory
 *  - restored quantities verified from the real drizzle SQL params (PgDialect)
 */

import { restoreOrderInventory } from '../refund-restore'
import { logger } from '@/lib/logging/logger'
import { PgDialect } from 'drizzle-orm/pg-core'

// ============================================================================
// MOCKS
// ============================================================================

const mockOrdersFindFirst = jest.fn()
const mockCaptured: Array<{ setArg: any; whereArg: any }> = []
let mockWhereImpl: ((whereArg: any) => Promise<void>) | null = null

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      orders: { findFirst: (...args: unknown[]) => mockOrdersFindFirst(...args) },
    },
    update: () => ({
      set: (setArg: any) => ({
        where: (whereArg: any) => {
          mockCaptured.push({ setArg, whereArg })
          return mockWhereImpl ? mockWhereImpl(whereArg) : Promise.resolve(undefined)
        },
      }),
    }),
  },
}))

const dialect = new PgDialect()

function restoredSkus(): string[] {
  return mockCaptured.map(c => dialect.sqlToQuery(c.whereArg).params[0] as string)
}

function restoredQty(sku: string): number {
  const entry = mockCaptured.find(c => dialect.sqlToQuery(c.whereArg).params[0] === sku)
  return dialect.sqlToQuery(entry!.setArg.quantity).params[0] as number
}

// ============================================================================
// FIXTURES
// ============================================================================

function makeOrder(items: unknown[]) {
  return { id: 'ord_1', customerId: 'cust_1', items }
}

const standardItem = {
  id: 'li_1',
  type: 'standard-oil',
  name: 'Lavender Pure Essential Oil',
  unitPrice: 5000,
  quantity: 1,
  subtotal: 5000,
  taxAmount: 0,
  total: 5000,
}

beforeEach(() => {
  mockOrdersFindFirst.mockReset()
  mockCaptured.length = 0
  mockWhereImpl = null
})

// ============================================================================
// TESTS
// ============================================================================

describe('restoreOrderInventory — idempotency contract', () => {
  it('is NOT idempotent: a second call restores the same SKUs a second time', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([standardItem]))

    await restoreOrderInventory('ord_1')
    await restoreOrderInventory('ord_1')

    // Pinned documentation contract (module docstring): the function re-adds
    // stock on every invocation — callers must guard via order status.
    expect(mockCaptured).toHaveLength(6) // 3 SKUs x 2 calls
    const oilRestores = restoredSkus().filter(s => s === 'OIL-LAVENDER-30ML')
    expect(oilRestores).toHaveLength(2)
  })

  it('looks the order up on every call (no memoization)', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([standardItem]))

    await restoreOrderInventory('ord_1')
    await restoreOrderInventory('ord_1')

    expect(mockOrdersFindFirst).toHaveBeenCalledTimes(2)
  })
})

describe('restoreOrderInventory — partial restores and missing SKUs', () => {
  it('isolates a failing SKU in a mixed order and restores the rest', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          type: 'custom-mix',
          name: 'Sleep Blend',
          quantity: 1,
          customMix: {
            recipeName: 'Sleep Blend',
            mode: 'carrier',
            totalVolume: 30,
            oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 5, percentage: 50 }],
            crystalId: 'amethyst',
            cordId: 'leather-cord',
            safetyScore: 95,
            safetyRating: 'safe',
            safetyWarnings: [],
          },
        },
      ])
    )
    mockWhereImpl = whereArg => {
      const sku = dialect.sqlToQuery(whereArg).params[0] as string
      if (sku === 'CRYSTAL-AMETHYST') return Promise.reject(new Error('db down'))
      return Promise.resolve(undefined)
    }

    await expect(restoreOrderInventory('ord_1')).resolves.toBeUndefined()

    expect(restoredSkus()).toEqual([
      'BOTTLE-30ML',
      'CAP-STANDARD',
      'OIL-LAVENDER-30ML',
      'CRYSTAL-AMETHYST', // attempted, failed
      'CORD-LEATHERCORD', // still attempted after the failure
    ])
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('CRYSTAL-AMETHYST'),
      expect.any(Error)
    )
  })

  it('restores only bottle and cap for items with no identifiable oil', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([{ id: 'li_1', name: 'Gift Wrapping', quantity: 2 }]))

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toEqual(['BOTTLE-30ML', 'CAP-STANDARD'])
    expect(restoredQty('BOTTLE-30ML')).toBe(2)
  })

  it('restores no oil SKU for blend oils whose names the heuristic cannot map', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          quantity: 1,
          customMix: {
            totalVolume: 30,
            oils: [{ name: 'Sandalwood Reserve', ml: 5 }], // no oilId, heuristic misses
          },
        },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toEqual(['BOTTLE-30ML', 'CAP-STANDARD'])
  })

  it('defaults quantity to 1 when the line omits it', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([{ id: 'li_1', name: 'Lavender Pure Essential Oil' }]))

    await restoreOrderInventory('ord_1')

    expect(restoredQty('OIL-LAVENDER-30ML')).toBe(1)
    expect(restoredQty('BOTTLE-30ML')).toBe(1)
    expect(restoredQty('CAP-STANDARD')).toBe(1)
  })

  it('handles an order whose items field is null', async () => {
    mockOrdersFindFirst.mockResolvedValue({ id: 'ord_1', items: null })

    await restoreOrderInventory('ord_1')

    expect(mockCaptured).toHaveLength(0)
  })
})

describe('restoreOrderInventory — SKU resolution parity with deductInventory', () => {
  it('restores the bottle size from customMix totalVolume', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          quantity: 1,
          customMix: { totalVolume: 50, oils: [{ oilId: 'lavender', ml: 10 }] },
        },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toContain('BOTTLE-50ML')
    expect(restoredSkus()).toContain('OIL-LAVENDER-50ML')
  })

  it('falls back to configuration.bottleSize when there is no customMix volume', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        { id: 'li_1', name: 'Lavender Pure Essential Oil', quantity: 1, configuration: { bottleSize: '10ml' } },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toContain('BOTTLE-10ML')
    expect(restoredSkus()).toContain('OIL-LAVENDER-10ML')
  })

  it('prefers totalVolume over configuration.bottleSize', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          quantity: 1,
          configuration: { bottleSize: '10ml' },
          customMix: { totalVolume: 20, oils: [{ oilId: 'lavender', ml: 5 }] },
        },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toContain('BOTTLE-20ML')
    expect(restoredSkus()).not.toContain('BOTTLE-10ML')
  })

  it('restores the cord with precedence attachment > customMix > configuration', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          name: 'Lavender Oil',
          quantity: 1,
          attachment: { cordId: 'hemp-natural' },
          configuration: { cord: 'waxed-cotton-natural' },
          customMix: { totalVolume: 30, oils: [{ oilId: 'lavender', ml: 5 }], cordId: 'cork' },
        },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toContain('CORD-HEMPNATURAL')
    expect(restoredSkus()).not.toContain('CORD-CORK')
    expect(restoredSkus()).not.toContain('CORD-WAXEDCOTTONNATURAL')
  })

  it('ignores configuration.crystalName — crystals restore only from customMix.crystalId', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          name: 'Lavender Pure Essential Oil',
          quantity: 1,
          configuration: { crystalName: 'Amethyst' },
        },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toEqual(['BOTTLE-30ML', 'CAP-STANDARD', 'OIL-LAVENDER-30ML'])
  })

  it('prefers unlocksOilId over the name heuristic', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        { id: 'li_1', name: 'Lavender Pure Essential Oil', unlocksOilId: 'sandalwood', quantity: 1 },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toContain('OIL-SANDALWOOD-30ML')
    expect(restoredSkus()).not.toContain('OIL-LAVENDER-30ML')
  })

  it('uses the name heuristic for blend oils without an oilId', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([
        {
          id: 'li_1',
          quantity: 1,
          configuration: { oils: [{ name: 'Tea Tree Essential Oil', ml: 5 }] },
        },
      ])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toContain('OIL-TEATREE-30ML')
  })

  it('aggregates quantities across repeated lines into one update per SKU', async () => {
    mockOrdersFindFirst.mockResolvedValue(
      makeOrder([standardItem, { ...standardItem, id: 'li_2', quantity: 2 }])
    )

    await restoreOrderInventory('ord_1')

    expect(restoredSkus()).toEqual(['BOTTLE-30ML', 'CAP-STANDARD', 'OIL-LAVENDER-30ML'])
    expect(restoredQty('OIL-LAVENDER-30ML')).toBe(3)
    expect(restoredQty('CAP-STANDARD')).toBe(3)
  })

  it('writes an updatedAt timestamp on every restore update', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([standardItem]))

    await restoreOrderInventory('ord_1')

    expect(mockCaptured.length).toBeGreaterThan(0)
    for (const { setArg } of mockCaptured) {
      expect(setArg.updatedAt).toBeInstanceOf(Date)
    }
  })
})
