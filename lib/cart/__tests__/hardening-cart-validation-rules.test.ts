/**
 * Hardening Tests — Cart validation rules (customMix oil count, carrierRatio,
 * attachment shape, in-stock quantity limits) as enforced by POST /api/cart.
 *
 * The rules themselves live in app/api/cart/route.ts (validateCustomMix /
 * validateAttachment / validateCartItemStock); these tests pin the exact
 * boundaries through the route:
 *  - oils: 1..5 allowed (0 and 6 rejected)
 *  - carrierRatio (carrier mode only): 5..75 inclusive (4/76/undefined rejected)
 *  - each oil needs a positive ml or drops >= 1
 *  - in-stock oils: max 20 per add, max 50 total per oil across the cart
 *
 * Server-side safety re-validation is mocked to a pass so these tests isolate
 * the structural boundary rules (safety itself is covered elsewhere).
 */

import type { NextRequest } from 'next/server'

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      body,
      json: async () => body,
    })),
  },
}))

const mockGetCart = jest.fn(async () => null)
const mockCreateCart = jest.fn(async () => ({ id: 'cart_test', items: [] }))
const mockAddItem = jest.fn(async (_cartId: string, item: any) => ({
  cart: { id: 'cart_test', items: [item] },
  item: { id: 'line_1', ...item },
}))

jest.mock('@/lib/cart/cart-manager-redis', () => ({
  cartManager: {
    getCart: (...args: unknown[]) => mockGetCart(...args),
    createCart: (...args: unknown[]) => mockCreateCart(...args),
    addItem: (...args: unknown[]) => mockAddItem(...args),
  },
}))

// Treat 'lavender' as the only in-stock oil for the stock-limit tests
jest.mock('@/lib/inventory/client', () => ({
  STOCKED_OIL_IDS: new Set<string>(['lavender']),
}))

// Pass all structural-valid mixes through safety so boundaries are isolated
jest.mock('@/lib/safety/server-validation', () => ({
  validateCustomMixServer: jest.fn(() => ({
    canProceed: true,
    errors: [],
    safetyScore: 95,
    safetyRating: 'safe',
    safetyWarnings: [],
  })),
}))

import { POST } from '@/app/api/cart/route'

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function oil(n: number) {
  return { oilId: `oil-${n}`, oilName: `Oil ${n}`, ml: 1, percentage: 3 }
}

function addBody(overrides: Record<string, unknown> = {}) {
  return {
    action: 'add',
    cartId: 'cart_test',
    product: { id: 'prod_custom', name: 'Custom Mix', price: 49.95 },
    quantity: 1,
    ...overrides,
  }
}

function mixBody(mix: Record<string, unknown>) {
  return addBody({ customMix: mix })
}

beforeEach(() => {
  mockGetCart.mockResolvedValue(null)
})

describe('POST /api/cart — customMix oil count boundaries (1–5)', () => {
  it('rejects a mix with zero oils', async () => {
    const res = await POST(makeRequest(mixBody({ recipeName: 'X', mode: 'pure', oils: [], totalVolume: 30 })))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix must contain at least one oil')
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('rejects a mix with no oils field at all', async () => {
    const res = await POST(makeRequest(mixBody({ recipeName: 'X', mode: 'pure', totalVolume: 30 })))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix must contain at least one oil')
  })

  it('accepts a mix with exactly 1 oil (lower bound)', async () => {
    const res = await POST(makeRequest(mixBody({ recipeName: 'Solo', mode: 'pure', oils: [oil(1)], totalVolume: 30 })))

    expect(res.status).toBe(200)
    expect(mockAddItem).toHaveBeenCalledTimes(1)
  })

  it('accepts a mix with exactly 5 oils (upper bound)', async () => {
    const res = await POST(
      makeRequest(mixBody({ recipeName: 'Full House', mode: 'pure', oils: [oil(1), oil(2), oil(3), oil(4), oil(5)], totalVolume: 30 }))
    )

    expect(res.status).toBe(200)
    expect(mockAddItem).toHaveBeenCalledTimes(1)
  })

  it('rejects a mix with 6 oils', async () => {
    const res = await POST(
      makeRequest(mixBody({ recipeName: 'Too Many', mode: 'pure', oils: [oil(1), oil(2), oil(3), oil(4), oil(5), oil(6)], totalVolume: 30 }))
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix cannot contain more than 5 oils')
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('rejects a mix without a recipeName', async () => {
    const res = await POST(makeRequest(mixBody({ mode: 'pure', oils: [oil(1)], totalVolume: 30 })))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Mix name is required')
  })

  it('rejects an oil entry missing its oilId', async () => {
    const res = await POST(
      makeRequest(mixBody({ recipeName: 'X', mode: 'pure', oils: [{ oilName: 'Nameless', ml: 1 }], totalVolume: 30 }))
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Oil ID is required for each oil')
  })

  it('rejects an oil with neither positive ml nor drops', async () => {
    const res = await POST(
      makeRequest(mixBody({ recipeName: 'X', mode: 'pure', oils: [{ oilId: 'oil-1', ml: 0 }], totalVolume: 30 }))
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Valid drop count or ml required')
  })

  it('accepts an oil specified in drops only (drops >= 1, no ml)', async () => {
    const res = await POST(
      makeRequest(mixBody({ recipeName: 'Drops', mode: 'pure', oils: [{ oilId: 'oil-1', drops: 5 }], totalVolume: 30 }))
    )

    expect(res.status).toBe(200)
  })
})

describe('POST /api/cart — carrierRatio boundaries (carrier mode, 5–75%)', () => {
  function carrierMix(carrierRatio: unknown) {
    return mixBody({ recipeName: 'Carrier', mode: 'carrier', oils: [oil(1)], carrierRatio, totalVolume: 30 })
  }

  it('rejects carrierRatio 4 (just below the bound)', async () => {
    const res = await POST(makeRequest(carrierMix(4)))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Carrier ratio must be between 5% and 75%')
  })

  it('accepts carrierRatio 5 (lower bound, inclusive)', async () => {
    const res = await POST(makeRequest(carrierMix(5)))

    expect(res.status).toBe(200)
  })

  it('accepts carrierRatio 75 (upper bound, inclusive)', async () => {
    const res = await POST(makeRequest(carrierMix(75)))

    expect(res.status).toBe(200)
  })

  it('rejects carrierRatio 76 (just above the bound)', async () => {
    const res = await POST(makeRequest(carrierMix(76)))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Carrier ratio must be between 5% and 75%')
  })

  it('rejects a carrier-mode mix with no carrierRatio at all', async () => {
    const res = await POST(makeRequest(carrierMix(undefined)))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Carrier ratio must be between 5% and 75%')
  })

  it('ignores carrierRatio bounds for pure-mode mixes', async () => {
    const res = await POST(
      makeRequest(mixBody({ recipeName: 'Pure', mode: 'pure', oils: [oil(1)], totalVolume: 30 }))
    )

    expect(res.status).toBe(200)
  })
})

describe('POST /api/cart — attachment shape validation', () => {
  it('rejects an attachment without a type', async () => {
    const res = await POST(makeRequest(addBody({ attachment: { cordId: 'hemp-natural' } })))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Attachment type is required')
  })

  it('rejects a cord attachment without a cordId', async () => {
    const res = await POST(makeRequest(addBody({ attachment: { type: 'cord', isMysteryCharm: false } })))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Cord ID is required')
  })

  it('rejects a non-mystery charm without a charmId', async () => {
    const res = await POST(makeRequest(addBody({ attachment: { type: 'charm', isMysteryCharm: false } })))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Charm ID or mystery selection is required')
  })

  it('accepts a mystery charm with no charmId', async () => {
    const res = await POST(makeRequest(addBody({ attachment: { type: 'charm', isMysteryCharm: true } })))

    expect(res.status).toBe(200)
  })
})

describe('POST /api/cart — in-stock oil quantity limits', () => {
  it('rejects adding more than 20 units of an in-stock oil in one line', async () => {
    const res = await POST(
      makeRequest(addBody({ product: { id: 'p', name: 'Lavender Pure Essential Oil', price: 30 }, quantity: 21 }))
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('maximum 20 units per item')
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('accepts exactly 20 units of an in-stock oil', async () => {
    const res = await POST(
      makeRequest(addBody({ product: { id: 'p', name: 'Lavender Pure Essential Oil', price: 30 }, quantity: 20 }))
    )

    expect(res.status).toBe(200)
  })

  it('rejects when the cart-wide total for an in-stock oil would exceed 50', async () => {
    mockGetCart.mockResolvedValue({
      id: 'cart_test',
      items: [{ id: 'line_old', productId: 'p', name: 'Lavender Pure Essential Oil', quantity: 45 }],
    } as any)

    const res = await POST(
      makeRequest(addBody({ product: { id: 'p', name: 'Lavender Pure Essential Oil', price: 30 }, quantity: 6 }))
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Maximum 50 units of this in-stock oil per order')
  })

  it('applies no quantity cap to preorder (non-stocked) oils', async () => {
    const res = await POST(
      makeRequest(addBody({ product: { id: 'p', name: 'Lemon Essential Oil', price: 30 }, quantity: 500 }))
    )

    expect(res.status).toBe(200)
  })
})
