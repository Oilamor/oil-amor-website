/**
 * Hardening Tests — lib/inventory/inventory.ts
 *
 *  - SKU builders (getOilSku/getBottleSku/getCrystalSku/getCordSku): these are
 *    PERSISTED identifiers stored in inventory_items.sku — format stability is
 *    a compatibility contract, not a style choice.
 *  - checkInventory: SKU aggregation, size/cord/crystal resolution, and the
 *    "available = quantity - reservedQuantity" guard with fail messages.
 *  - Legacy hasPreorderItems/getPreorderOils (inventory.ts copies).
 */

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      inventoryItems: { findFirst: jest.fn() },
    },
  },
}))

import { db } from '@/lib/db'
import {
  checkInventory,
  getOilSku,
  getBottleSku,
  getCrystalSku,
  getCordSku,
  hasPreorderItems,
  getPreorderOils,
  type OrderItemForInventory,
} from '../inventory'

const mockFindFirst = (db as any).query.inventoryItems.findFirst as jest.Mock

function row(sku: string, quantity: number, reservedQuantity = 0, name?: string) {
  return {
    id: `inv_${sku}`,
    sku,
    name: name ?? `Row ${sku}`,
    category: 'oil',
    quantity,
    reservedQuantity,
    reorderPoint: 10,
    metadata: null,
    updatedAt: new Date(),
  }
}

beforeEach(() => {
  mockFindFirst.mockReset()
  mockFindFirst.mockResolvedValue(row('ANY', 1000))
})

// ============================================================================
// SKU BUILDERS (persisted identifiers — pin the format)
// ============================================================================

describe('getOilSku', () => {
  it('builds OIL-{ID}-{SIZE}ML with hyphens stripped from the oil id', () => {
    expect(getOilSku('tea-tree', '30ml')).toBe('OIL-TEATREE-30ML')
    expect(getOilSku('clove-bud', '30ml')).toBe('OIL-CLOVEBUD-30ML')
  })

  it('defaults to the 30ml size', () => {
    expect(getOilSku('lavender')).toBe('OIL-LAVENDER-30ML')
  })

  it('normalizes case on both oil id and size', () => {
    expect(getOilSku('Lavender', '30ML')).toBe('OIL-LAVENDER-30ML')
    expect(getOilSku('TEA-TREE', '5ml')).toBe('OIL-TEATREE-5ML')
  })

  it('strips every hyphen from multi-word oil ids', () => {
    expect(getOilSku('rose-geranium-extra', '10ml')).toBe('OIL-ROSEGERANIUMEXTRA-10ML')
  })

  it('produces the same SKU for "30ml" and "30ML" (idempotent normalization)', () => {
    expect(getOilSku('lavender', '30ml')).toBe(getOilSku('lavender', '30ML'))
  })

  it('appends ML to a bare numeric size', () => {
    expect(getOilSku('lavender', '10')).toBe('OIL-LAVENDER-10ML')
  })

  it('does not validate inputs — empty oil id still produces a (degenerate) SKU', () => {
    // Pinned: no guard rails; callers must validate before building SKUs
    expect(getOilSku('', '30ml')).toBe('OIL--30ML')
  })
})

describe('getBottleSku / getCrystalSku / getCordSku', () => {
  it('builds BOTTLE-{SIZE}ML', () => {
    expect(getBottleSku('5ml')).toBe('BOTTLE-5ML')
    expect(getBottleSku('30ml')).toBe('BOTTLE-30ML')
    expect(getBottleSku('50ml')).toBe('BOTTLE-50ML')
    expect(getBottleSku('100ml')).toBe('BOTTLE-100ML')
  })

  it('normalizes bottle size case idempotently', () => {
    expect(getBottleSku('30ML')).toBe('BOTTLE-30ML')
  })

  it('builds CRYSTAL-{ID} with hyphens stripped', () => {
    expect(getCrystalSku('amethyst')).toBe('CRYSTAL-AMETHYST')
    expect(getCrystalSku('rose-quartz')).toBe('CRYSTAL-ROSEQUARTZ')
  })

  it('builds CORD-{ID} with hyphens stripped', () => {
    expect(getCordSku('vegan-leather-black')).toBe('CORD-VEGANLEATHERBLACK')
    expect(getCordSku('waxed-cotton-natural')).toBe('CORD-WAXEDCOTTONNATURAL')
  })
})

// ============================================================================
// checkInventory
// ============================================================================

describe('checkInventory', () => {
  it('queries bottle + cap + oil SKUs for a standard oil item', async () => {
    await checkInventory([{ name: 'Lavender Pure Essential Oil', quantity: 1 }])

    const queriedSkus = mockFindFirst.mock.calls.map(() => mockFindFirst.mock.calls.indexOf(mockFindFirst.mock.calls[0]))
    expect(mockFindFirst).toHaveBeenCalledTimes(3)
    expect(queriedSkus).toHaveLength(3)
  })

  it('passes when every SKU has enough available stock', async () => {
    const result = await checkInventory([{ name: 'Lavender Pure Essential Oil', quantity: 5 }])

    expect(result.available).toBe(true)
    expect(result.missingItems).toEqual([])
  })

  it('defaults quantity to 1 when omitted', async () => {
    mockFindFirst.mockImplementation(() => Promise.resolve(row('X', 1)))

    const result = await checkInventory([{ name: 'Lavender Pure Essential Oil' }])

    expect(result.available).toBe(true) // exactly 1 available covers the default 1
  })

  it('reports a formatted missing entry when available < required', async () => {
    mockFindFirst.mockImplementation(() => Promise.resolve(row('S', 2, 0, 'Lavender 30ml')))

    const result = await checkInventory([{ name: 'Lavender Pure Essential Oil', quantity: 5 }])

    expect(result.available).toBe(false)
    expect(result.missingItems).toContain('Lavender 30ml (need 5, have 2)')
  })

  it('subtracts reservedQuantity from availability', async () => {
    mockFindFirst.mockImplementation(() => Promise.resolve(row('S', 10, 8, 'Thing')))

    const result = await checkInventory([{ name: 'Lavender Pure Essential Oil', quantity: 3 }])

    expect(result.available).toBe(false)
    expect(result.missingItems[0]).toContain('have 2')
  })

  it('falls back to the raw SKU in the message when the row does not exist', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([{ name: 'Lavender Pure Essential Oil', quantity: 1 }])

    expect(result.available).toBe(false)
    expect(result.missingItems).toContain('BOTTLE-30ML (need 1, have 0)')
    expect(result.missingItems).toContain('OIL-LAVENDER-30ML (need 1, have 0)')
  })

  it('uses the customMix totalVolume for the bottle SKU', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      { quantity: 1, customMix: { totalVolume: 50, oils: [{ oilId: 'lavender', ml: 5 }] } },
    ])

    expect(result.missingItems).toContain('BOTTLE-50ML (need 1, have 0)')
    expect(result.missingItems).toContain('OIL-LAVENDER-50ML (need 1, have 0)')
  })

  it('prefers customMix.totalVolume over configuration.bottleSize', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      {
        quantity: 1,
        configuration: { bottleSize: '10ml' },
        customMix: { totalVolume: 20, oils: [{ oilId: 'lavender', ml: 5 }] },
      },
    ])

    expect(result.missingItems).toContain('BOTTLE-20ML (need 1, have 0)')
    expect(result.missingItems.some(m => m.includes('BOTTLE-10ML'))).toBe(false)
  })

  it('uses configuration.bottleSize when there is no customMix volume', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      { name: 'Lavender Oil', quantity: 1, configuration: { bottleSize: '10ml' } },
    ])

    expect(result.missingItems).toContain('BOTTLE-10ML (need 1, have 0)')
    expect(result.missingItems).toContain('OIL-LAVENDER-10ML (need 1, have 0)')
  })

  it('aggregates duplicate lines of the same oil+size into one SKU requirement', async () => {
    mockFindFirst.mockImplementation(() => Promise.resolve(row('S', 2, 0, 'Lavender 30ml')))

    const result = await checkInventory([
      { name: 'Lavender Pure Essential Oil', quantity: 2 },
      { name: 'Lavender Pure Essential Oil', quantity: 2 },
    ])

    // 4 required vs 2 available — caught as a single aggregated SKU, not per line
    expect(result.available).toBe(false)
    expect(result.missingItems).toContain('Lavender 30ml (need 4, have 2)')
  })

  it('checks multiple sizes of the same oil independently', async () => {
    mockFindFirst.mockImplementation(() => Promise.resolve(row('S', 100)))

    const result = await checkInventory([
      { name: 'Lavender Pure Essential Oil', quantity: 1, configuration: { bottleSize: '5ml' } },
      { name: 'Lavender Pure Essential Oil', quantity: 1, configuration: { bottleSize: '30ml' } },
    ])

    expect(result.available).toBe(true)
    // bottle x2 sizes + cap + oil x2 sizes = 5 distinct SKUs
    expect(mockFindFirst).toHaveBeenCalledTimes(5)
  })

  it('includes crystal and cord SKUs for custom mixes', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      {
        quantity: 1,
        customMix: {
          totalVolume: 30,
          oils: [{ oilId: 'lavender', ml: 5 }],
          crystalId: 'rose-quartz',
          cordId: 'vegan-leather-black',
        },
      },
    ])

    expect(result.missingItems).toContain('CRYSTAL-ROSEQUARTZ (need 1, have 0)')
    expect(result.missingItems).toContain('CORD-VEGANLEATHERBLACK (need 1, have 0)')
  })

  it('resolves the cord with precedence attachment > customMix > configuration', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      {
        quantity: 1,
        name: 'Lavender Oil',
        attachment: { cordId: 'hemp-natural' },
        configuration: { cord: 'waxed-cotton-natural' },
        customMix: { totalVolume: 30, oils: [{ oilId: 'lavender', ml: 5 }], cordId: 'cork' },
      },
    ])

    expect(result.missingItems).toContain('CORD-HEMPNATURAL (need 1, have 0)')
    expect(result.missingItems.some(m => m.includes('CORD-CORK'))).toBe(false)
    expect(result.missingItems.some(m => m.includes('CORD-WAXEDCOTTONNATURAL'))).toBe(false)
  })

  it('uses the explicit customMix oilId without needing name heuristics', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      { quantity: 1, customMix: { totalVolume: 30, oils: [{ oilId: 'sandalwood', ml: 5 }] } },
    ])

    expect(result.missingItems).toContain('OIL-SANDALWOOD-30ML (need 1, have 0)')
  })

  it('falls back to the name heuristic for blend oils without an oilId', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      { quantity: 1, configuration: { bottleSize: '30ml', oils: [{ name: 'Clove Bud Oil', ml: 5 }] } },
    ])

    expect(result.missingItems).toContain('OIL-CLOVEBUD-30ML (need 1, have 0)')
  })

  it('pins the empty-blend quirk: customMix with oils: [] falls back to the single-oil name path', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      { name: 'Lavender Pure Essential Oil', quantity: 1, customMix: { totalVolume: 30, oils: [] } },
    ])

    // blendOils.length === 0 → treated as a standard single-oil product
    expect(result.missingItems).toContain('OIL-LAVENDER-30ML (need 1, have 0)')
  })

  it('prefers unlocksOilId over the name heuristic for standard items', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([
      { name: 'Lavender Pure Essential Oil', unlocksOilId: 'sandalwood', quantity: 1 },
    ])

    expect(result.missingItems).toContain('OIL-SANDALWOOD-30ML (need 1, have 0)')
    expect(result.missingItems.some(m => m.includes('OIL-LAVENDER'))).toBe(false)
  })

  it('skips oil SKUs entirely for items with no identifiable oil (bottle + cap only)', async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const result = await checkInventory([{ name: 'Gift Card', quantity: 1 }])

    expect(result.missingItems).toHaveLength(2) // BOTTLE-30ML + CAP-STANDARD
    expect(result.missingItems.some(m => m.includes('OIL-'))).toBe(false)
  })

  it('returns available with zero missing items for an empty order', async () => {
    const result = await checkInventory([])

    expect(result).toEqual({ available: true, missingItems: [] })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })
})

// ============================================================================
// LEGACY PREORDER HELPERS (inventory.ts copies)
// ============================================================================

describe('hasPreorderItems (inventory.ts)', () => {
  it('returns false for stocked oils identified by unlocksOilId', () => {
    expect(hasPreorderItems([{ unlocksOilId: 'lavender' }])).toBe(false)
    expect(hasPreorderItems([{ unlocksOilId: 'tea-tree' }])).toBe(false)
  })

  it('returns true for non-stocked oils identified by unlocksOilId', () => {
    expect(hasPreorderItems([{ unlocksOilId: 'lemon' }])).toBe(true)
    expect(hasPreorderItems([{ unlocksOilId: 'sandalwood' }])).toBe(true)
  })

  it('identifies stocked oils from product names via the heuristic', () => {
    expect(hasPreorderItems([{ name: 'Lavender Pure Essential Oil' }])).toBe(false)
    expect(hasPreorderItems([{ name: 'Tea Tree Essential Oil' }])).toBe(false)
  })

  it('flags jojoba as preorder (not in the stocked set)', () => {
    expect(hasPreorderItems([{ name: 'Jojoba Carrier Oil' }])).toBe(true)
  })

  it('pins the heuristic gap: name-only items for unknown oils are invisible', () => {
    // 'Lemon' is not in the name heuristic, so without unlocksOilId this is NOT
    // flagged even though lemon is a preorder oil.
    expect(hasPreorderItems([{ name: 'Lemon Essential Oil' }])).toBe(false)
  })

  it('checks customMix blend oils by explicit oilId', () => {
    const stocked = hasPreorderItems([
      { customMix: { totalVolume: 30, oils: [{ oilId: 'lavender', ml: 5 }] } },
    ])
    const preorder = hasPreorderItems([
      { customMix: { totalVolume: 30, oils: [{ oilId: 'lemon', ml: 5 }] } },
    ])

    expect(stocked).toBe(false)
    expect(preorder).toBe(true)
  })

  it('checks configuration oils via the name heuristic', () => {
    expect(
      hasPreorderItems([{ configuration: { oils: [{ name: 'Eucalyptus Oil', ml: 5 }] } }])
    ).toBe(false)
  })

  it('ignores items with no identifiable oil and empty carts', () => {
    expect(hasPreorderItems([{ name: 'Gift Card' }])).toBe(false)
    expect(hasPreorderItems([])).toBe(false)
  })
})

describe('getPreorderOils (inventory.ts)', () => {
  it('returns an empty list when everything is stocked', () => {
    expect(getPreorderOils([{ unlocksOilId: 'lavender' }])).toEqual([])
  })

  it('names preorder blend oils by their oilName', () => {
    const oils = getPreorderOils([
      {
        customMix: {
          totalVolume: 30,
          oils: [
            { oilId: 'lavender', ml: 5, oilName: 'Lavender' },
            { oilId: 'sandalwood', ml: 5, oilName: 'Sandalwood' },
          ],
        },
      },
    ])

    expect(oils).toEqual(['Sandalwood'])
  })

  it('dedupes repeated preorder oils', () => {
    const oils = getPreorderOils([
      { unlocksOilId: 'lemon', name: 'Lemon Oil' },
      { unlocksOilId: 'lemon', name: 'Lemon Oil' },
    ])

    expect(oils).toEqual(['Lemon Oil'])
  })

  it('falls back to the oilId when neither name nor oilName exists', () => {
    const oils = getPreorderOils([{ unlocksOilId: 'lemon' }])

    expect(oils).toEqual(['lemon'])
  })
})
