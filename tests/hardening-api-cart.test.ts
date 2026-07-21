/**
 * Cart API Hardening Tests (app/api/cart/route.ts)
 *
 * Covers the request-validation branches of POST /api/cart:
 * - action dispatch and JSON body parsing
 * - item shape (product required)
 * - customMix oil-count bounds (1..5), oil shape, carrierRatio bounds (5..75)
 * - server-side safety re-validation of customMix (client safety fields never trusted)
 * - attachment validation
 * - in-stock inventory limits (20/item, 50/oil/order)
 *
 * cartManager, safety libs and inventory constants are mocked.
 */

import type { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      body,
      json: async () => body,
    })),
  },
}))

const mockCartManager = {
  createCart: jest.fn(),
  getCart: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  updateAttachment: jest.fn(),
}
jest.mock('@/lib/cart/cart-manager-redis', () => ({ cartManager: mockCartManager }))

jest.mock('@/lib/safety', () => ({
  getOilSafetyProfile: jest.fn(() => undefined),
}))

const mockValidateCustomMixServer = jest.fn()
jest.mock('@/lib/safety/server-validation', () => ({
  validateCustomMixServer: (...args: unknown[]) => mockValidateCustomMixServer(...args),
}))

jest.mock('@/lib/inventory/client', () => ({
  STOCKED_OIL_IDS: new Set(['tea-tree', 'lavender', 'lemongrass', 'clove-bud', 'eucalyptus']),
}))

import { GET, POST } from '@/app/api/cart/route'

// ============================================================================
// HELPERS
// ============================================================================

const STOCKED_PRODUCT = { id: 'prod-lav-30', name: 'Lavender Essential Oil 30ml', price: 4200, sku: 'LAV-30' }
const PREORDER_PRODUCT = { id: 'prod-cham-30', name: 'Roman Chamomile Essential Oil 30ml', price: 5600, sku: 'CHAM-30' }

function makeRequest(body: unknown): NextRequest {
  return {
    url: 'http://localhost/api/cart',
    json: async () => body,
  } as unknown as NextRequest
}

function makeGetRequest(url: string): NextRequest {
  return { url } as unknown as NextRequest
}

function mix(oils: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return { recipeName: 'Test Blend', mode: 'pure', totalVolume: 30, oils, ...extra }
}

const TWO_OILS = [
  { oilId: 'lavender', ml: 15 },
  { oilId: 'bergamot', ml: 15 },
]

beforeEach(() => {
  mockCartManager.createCart.mockResolvedValue({ id: 'cart_new', items: [] })
  mockCartManager.getCart.mockResolvedValue(null)
  mockCartManager.addItem.mockResolvedValue({ cart: { id: 'cart_new', items: [{}] }, item: { id: 'line_1' } })
  mockCartManager.updateItem.mockResolvedValue({ id: 'cart_1', items: [] })
  mockCartManager.removeItem.mockResolvedValue({ id: 'cart_1', items: [] })
  mockValidateCustomMixServer.mockReturnValue({
    canProceed: true,
    errors: [],
    safetyScore: 92,
    safetyRating: 'safe',
    safetyWarnings: ['server-warning'],
  })
})

// ============================================================================
// GET /api/cart
// ============================================================================

describe('GET /api/cart', () => {
  it('creates a new cart with 201 when no cartId is given', async () => {
    const res = await GET(makeGetRequest('http://localhost/api/cart'))
    expect(res.status).toBe(201)
    expect(mockCartManager.createCart).toHaveBeenCalledTimes(1)
  })

  it('returns the existing cart with 200 when found', async () => {
    mockCartManager.getCart.mockResolvedValue({ id: 'cart_abc', items: [] })
    const res = await GET(makeGetRequest('http://localhost/api/cart?cartId=cart_abc'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cart.id).toBe('cart_abc')
  })

  it('creates a replacement cart when the cart expired', async () => {
    mockCartManager.getCart.mockResolvedValue(null)
    const res = await GET(makeGetRequest('http://localhost/api/cart?cartId=cart_gone'))
    expect(res.status).toBe(201)
  })

  it('falls back to a fresh cart when storage errors', async () => {
    mockCartManager.getCart.mockRejectedValue(new Error('redis down'))
    const res = await GET(makeGetRequest('http://localhost/api/cart?cartId=cart_x'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.warning).toBe('Created new cart due to error')
  })
})

// ============================================================================
// POST /api/cart — dispatch and item shape
// ============================================================================

describe('POST /api/cart — dispatch and item shape', () => {
  it('returns 400 for an unparseable JSON body', async () => {
    const req = { url: 'http://localhost/api/cart', json: async () => { throw new Error('bad json') } } as unknown as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid JSON body')
  })

  it('returns 400 when action is missing', async () => {
    const res = await POST(makeRequest({ cartId: 'cart_1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid action')
  })

  it('returns 400 for an unknown action', async () => {
    const res = await POST(makeRequest({ action: 'destroy' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid action')
  })

  it('returns 400 when adding without a product', async () => {
    const res = await POST(makeRequest({ action: 'add', quantity: 1 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Product is required')
    expect(mockCartManager.addItem).not.toHaveBeenCalled()
  })

  it('creates a cart when adding without a cartId', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, quantity: 1 }))
    expect(res.status).toBe(200)
    expect(mockCartManager.createCart).toHaveBeenCalledTimes(1)
    expect(mockCartManager.addItem).toHaveBeenCalledWith('cart_new', expect.any(Object), expect.any(Object))
  })

  it('reuses the existing cart for a known cartId', async () => {
    mockCartManager.getCart.mockResolvedValue({ id: 'cart_live', items: [] })
    const res = await POST(makeRequest({ action: 'add', cartId: 'cart_live', product: PREORDER_PRODUCT, quantity: 2 }))
    expect(res.status).toBe(200)
    expect(mockCartManager.createCart).not.toHaveBeenCalled()
    expect(mockCartManager.addItem).toHaveBeenCalledWith('cart_live', expect.objectContaining({ quantity: 2 }), expect.any(Object))
  })

  it('creates a cart when the provided cartId no longer exists', async () => {
    mockCartManager.getCart.mockResolvedValue(null)
    await POST(makeRequest({ action: 'add', cartId: 'cart_gone', product: PREORDER_PRODUCT }))
    expect(mockCartManager.createCart).toHaveBeenCalledTimes(1)
    expect(mockCartManager.addItem).toHaveBeenCalledWith('cart_new', expect.any(Object), expect.any(Object))
  })

  it('returns 500 when the cart manager fails to add the item', async () => {
    mockCartManager.addItem.mockRejectedValue(new Error('write failed'))
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to add item')
  })

  it('returns 400 for update without cartId/lineId', async () => {
    expect((await POST(makeRequest({ action: 'update', lineId: 'l1' }))).status).toBe(400)
    expect((await POST(makeRequest({ action: 'update', cartId: 'c1' }))).status).toBe(400)
  })

  it('returns 400 for remove without cartId/lineId', async () => {
    expect((await POST(makeRequest({ action: 'remove', lineId: 'l1' }))).status).toBe(400)
    expect((await POST(makeRequest({ action: 'remove', cartId: 'c1' }))).status).toBe(400)
  })

  it('returns 400 for update-attachment without all required fields', async () => {
    const res = await POST(makeRequest({ action: 'update-attachment', cartId: 'c1', lineId: 'l1' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Missing required fields')
  })
})

// ============================================================================
// POST /api/cart — customMix validation
// ============================================================================

describe('POST /api/cart — customMix shape', () => {
  it('rejects a mix with zero oils', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix([]) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix must contain at least one oil')
    expect(mockValidateCustomMixServer).not.toHaveBeenCalled()
  })

  it('rejects a mix with 6 oils (upper bound is 5)', async () => {
    const oils = Array.from({ length: 6 }, (_, i) => ({ oilId: `oil-${i}`, ml: 5 }))
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix(oils) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix cannot contain more than 5 oils')
    expect(mockValidateCustomMixServer).not.toHaveBeenCalled()
  })

  it('accepts a mix with exactly 5 oils (boundary)', async () => {
    const oils = Array.from({ length: 5 }, (_, i) => ({ oilId: `oil-${i}`, ml: 5 }))
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix(oils) }))
    expect(res.status).toBe(200)
  })

  it('accepts a mix with exactly 1 oil (boundary)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix([{ oilId: 'lavender', ml: 30 }]) }))
    expect(res.status).toBe(200)
  })

  it('rejects a mix without a recipeName', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix(TWO_OILS, { recipeName: undefined }) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix name is required')
  })

  it('rejects an oil entry without an oilId', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix([{ ml: 15 }]) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Oil ID is required for each oil')
  })

  it('rejects an oil with neither drops nor ml', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix([{ oilId: 'lavender' }]) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Valid drop count or ml required')
  })

  it('rejects an oil with drops = 0 (boundary)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix([{ oilId: 'lavender', drops: 0 }]) }))
    expect(res.status).toBe(400)
  })

  it('accepts an oil with drops = 1 (boundary)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix([{ oilId: 'lavender', drops: 1 }]) }))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/cart — carrierRatio bounds (carrier mode)', () => {
  function carrierMix(carrierRatio: unknown) {
    return mix(TWO_OILS, { mode: 'carrier', carrierRatio })
  }

  it('rejects a carrier mix without carrierRatio', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: carrierMix(undefined) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Carrier ratio must be between 5% and 75%')
  })

  it('rejects carrierRatio 4 (below lower bound)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: carrierMix(4) }))
    expect(res.status).toBe(400)
  })

  it('accepts carrierRatio 5 (lower boundary)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: carrierMix(5) }))
    expect(res.status).toBe(200)
  })

  it('accepts carrierRatio 75 (upper boundary)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: carrierMix(75) }))
    expect(res.status).toBe(200)
  })

  it('rejects carrierRatio 76 (above upper bound)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: carrierMix(76) }))
    expect(res.status).toBe(400)
  })

  it('ignores carrierRatio in pure mode', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix(TWO_OILS, { mode: 'pure' }) }))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/cart — server safety re-validation', () => {
  it('invokes validateCustomMixServer for every customMix add', async () => {
    const customMix = mix(TWO_OILS)
    await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix }))
    expect(mockValidateCustomMixServer).toHaveBeenCalledTimes(1)
    expect(mockValidateCustomMixServer).toHaveBeenCalledWith(expect.objectContaining({ recipeName: 'Test Blend' }))
  })

  it('rejects the add when server safety validation cannot proceed', async () => {
    mockValidateCustomMixServer.mockReturnValue({
      canProceed: false,
      errors: ['Blocked combination: clove-bud + eucalyptus'],
      safetyScore: 0,
      safetyRating: 'dangerous',
      safetyWarnings: [],
    })
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix: mix(TWO_OILS) }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Custom mix failed safety validation')
    expect(body.errors).toEqual(['Blocked combination: clove-bud + eucalyptus'])
    expect(mockCartManager.addItem).not.toHaveBeenCalled()
  })

  it('overwrites client-supplied safety fields with server-computed values', async () => {
    const customMix = mix(TWO_OILS, { safetyScore: 100, safetyRating: 'perfectly-safe', safetyWarnings: [] })
    await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, customMix }))
    const itemArg = mockCartManager.addItem.mock.calls[0][1] as { customMix: Record<string, unknown> }
    expect(itemArg.customMix.safetyScore).toBe(92)
    expect(itemArg.customMix.safetyRating).toBe('safe')
    expect(itemArg.customMix.safetyWarnings).toEqual(['server-warning'])
  })
})

// ============================================================================
// POST /api/cart — attachments
// ============================================================================

describe('POST /api/cart — attachment validation', () => {
  it('rejects an attachment without a type', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, attachment: {} }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Attachment type is required')
  })

  it('rejects a cord attachment without cordId', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, attachment: { type: 'cord' } }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Cord ID is required')
  })

  it('rejects a charm attachment without charmId or mystery selection', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, attachment: { type: 'charm' } }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Charm ID or mystery selection is required')
  })

  it('accepts a mystery charm without a charmId', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, attachment: { type: 'charm', isMysteryCharm: true } }))
    expect(res.status).toBe(200)
  })

  it('accepts a cord with a cordId', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, attachment: { type: 'cord', cordId: 'cord-leather' } }))
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// POST /api/cart — in-stock inventory limits
// ============================================================================

describe('POST /api/cart — stock limits', () => {
  it('rejects quantity 21 for an in-stock oil (per-item max 20)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: STOCKED_PRODUCT, quantity: 21 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('maximum 20 units per item')
    expect(mockCartManager.addItem).not.toHaveBeenCalled()
  })

  it('accepts quantity 20 for an in-stock oil (boundary)', async () => {
    const res = await POST(makeRequest({ action: 'add', product: STOCKED_PRODUCT, quantity: 20 }))
    expect(res.status).toBe(200)
  })

  it('does not limit quantity for preorder (non-stocked) oils', async () => {
    const res = await POST(makeRequest({ action: 'add', product: PREORDER_PRODUCT, quantity: 500 }))
    expect(res.status).toBe(200)
    expect(mockCartManager.addItem).toHaveBeenCalledWith('cart_new', expect.objectContaining({ quantity: 500 }), expect.any(Object))
  })

  it('rejects when the order-wide total for a stocked oil would exceed 50', async () => {
    // 31 already in cart + 20 new = 51 > 50 (per-item max of 20 not triggered)
    mockCartManager.getCart.mockResolvedValue({
      id: 'cart_live',
      items: [{ name: 'Lavender Essential Oil 10ml', quantity: 31 }],
    })
    const res = await POST(makeRequest({ action: 'add', cartId: 'cart_live', product: STOCKED_PRODUCT, quantity: 20 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Maximum 50 units of this in-stock oil per order')
  })

  it('accepts when existing cart plus new quantity stays at or under 50', async () => {
    mockCartManager.getCart.mockResolvedValue({
      id: 'cart_live',
      items: [{ name: 'Lavender Essential Oil 10ml', quantity: 30 }],
    })
    const res = await POST(makeRequest({ action: 'add', cartId: 'cart_live', product: STOCKED_PRODUCT, quantity: 20 }))
    expect(res.status).toBe(200)
  })

  it('applies stock limits to stocked oils inside a customMix', async () => {
    const res = await POST(makeRequest({
      action: 'add',
      product: PREORDER_PRODUCT,
      quantity: 25,
      customMix: mix([{ oilId: 'lavender', ml: 30 }]),
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('maximum 20 units per item')
  })
})
