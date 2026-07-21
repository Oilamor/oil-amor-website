/**
 * Inventory Refund Restore Tests
 * restoreOrderInventory reverses deductInventory SKU-for-SKU
 */

import { restoreOrderInventory } from '../refund-restore'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// MOCKS
// ============================================================================

const mockOrdersFindFirst = jest.fn()
const mockUpdateWhere = jest.fn()
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }))

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      orders: { findFirst: (...args: unknown[]) => mockOrdersFindFirst(...args) },
    },
    update: () => ({ set: mockUpdateSet }),
  },
}))

// ============================================================================
// FIXTURES & HELPERS
// ============================================================================

function makeOrder(items: unknown[]) {
  return {
    id: 'ord_1',
    customerId: 'cust_1',
    items,
  }
}

const standardItem = {
  id: 'li_1',
  type: 'standard-oil',
  name: 'Lavender Essential Oil',
  unitPrice: 5000,
  quantity: 1,
  subtotal: 5000,
  taxAmount: 0,
  total: 5000,
}

beforeEach(() => {
  mockOrdersFindFirst.mockReset()
  mockUpdateWhere.mockReset()
  mockUpdateSet.mockClear()

  mockUpdateWhere.mockResolvedValue(undefined)
})

// ============================================================================
// TESTS
// ============================================================================

describe('restoreOrderInventory', () => {
  it('restores bottle, cap, and oil SKUs for a standard oil item', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([standardItem]))

    await restoreOrderInventory('ord_1')

    // BOTTLE-30ML + CAP-STANDARD + OIL-LAVENDER-30ML
    expect(mockUpdateSet).toHaveBeenCalledTimes(3)
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      updatedAt: expect.any(Date),
    }))
  })

  it('aggregates quantities across items of the same SKU', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([
      standardItem,
      { ...standardItem, id: 'li_2', quantity: 2 },
    ]))

    await restoreOrderInventory('ord_1')

    // Same three SKUs, aggregated — still one update per SKU
    expect(mockUpdateSet).toHaveBeenCalledTimes(3)
  })

  it('restores blend oils, crystals, and cords for custom mixes', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([{
      id: 'li_1',
      type: 'custom-mix',
      name: 'Sleep Blend',
      unitPrice: 3500,
      quantity: 1,
      subtotal: 3500,
      taxAmount: 0,
      total: 3500,
      customMix: {
        recipeName: 'Sleep Blend',
        mode: 'carrier',
        totalVolume: 30,
        oils: [
          { oilId: 'lavender', oilName: 'Lavender', ml: 5, percentage: 50 },
          { oilId: 'clove-bud', oilName: 'Clove Bud', ml: 5, percentage: 50 },
        ],
        crystalId: 'amethyst',
        cordId: 'leather',
        safetyScore: 95,
        safetyRating: 'safe',
        safetyWarnings: [],
      },
    }]))

    await restoreOrderInventory('ord_1')

    // BOTTLE-30ML + CAP-STANDARD + 2 oils + CRYSTAL-AMETHYST + CORD-LEATHER
    expect(mockUpdateSet).toHaveBeenCalledTimes(6)
  })

  it('does nothing and warns when the order does not exist', async () => {
    mockOrdersFindFirst.mockResolvedValue(undefined)

    await restoreOrderInventory('ord_missing')

    expect(mockUpdateSet).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ord_missing'))
  })

  it('isolates a single SKU failure and continues restoring the rest', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([standardItem]))
    mockUpdateWhere
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(undefined)

    await expect(restoreOrderInventory('ord_1')).resolves.toBeUndefined()

    // All three SKUs were attempted despite the first failing
    expect(mockUpdateSet).toHaveBeenCalledTimes(3)
    expect(logger.error).toHaveBeenCalled()
  })

  it('restores nothing for an order with no items', async () => {
    mockOrdersFindFirst.mockResolvedValue(makeOrder([]))

    await restoreOrderInventory('ord_1')

    expect(mockUpdateSet).not.toHaveBeenCalled()
  })
})
