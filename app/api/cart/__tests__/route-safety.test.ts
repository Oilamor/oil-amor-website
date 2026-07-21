/**
 * Cart API — Server-Side Custom Mix Safety Tests
 *
 * The customMix add path must never trust client-supplied safety fields:
 * it re-validates server-side, rejects unsafe mixes with 400, and overwrites
 * safetyScore/safetyRating/safetyWarnings with server-computed values.
 */

import type { NextRequest } from 'next/server'

// Minimal NextResponse implementation (route only uses NextResponse.json)
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

jest.mock('@/lib/cart/cart-manager-redis', () => ({
  cartManager: {
    getCart: jest.fn(async () => null),
    createCart: jest.fn(async () => ({ id: 'cart_test', items: [] })),
    addItem: jest.fn(async (_cartId: string, item: any) => ({
      cart: { id: 'cart_test', items: [item] },
      item: { id: 'line_1', ...item },
    })),
  },
}))

jest.mock('@/lib/inventory/client', () => ({
  STOCKED_OIL_IDS: new Set<string>(),
}))

import { POST } from '../route'
import { cartManager } from '@/lib/cart/cart-manager-redis'

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function addBody(customMix: unknown) {
  return {
    action: 'add',
    cartId: 'cart_test',
    product: { id: 'prod_custom', name: 'Custom Mix', price: 49.95 },
    quantity: 1,
    customMix,
  }
}

describe('POST /api/cart — customMix server-side safety validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('accepts a valid mix and overwrites tampered client safety fields', async () => {
    const res = await POST(makeRequest(addBody({
      recipeName: 'Sleep Blend',
      mode: 'carrier',
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 5, percentage: 16.7 },
        { oilId: 'frankincense', oilName: 'Frankincense', ml: 2.5, percentage: 8.3 },
      ],
      carrierRatio: 25,
      totalVolume: 30,
      // Tampered client claims
      safetyScore: 5,
      safetyRating: 'dangerous',
      safetyWarnings: ['fake-warning'],
    })))

    expect(res.status).toBe(200)
    const addItemCalls = (cartManager.addItem as jest.Mock).mock.calls
    expect(addItemCalls.length).toBe(1)
    const savedMix = addItemCalls[0][1].customMix
    expect(savedMix.safetyScore).not.toBe(5)
    expect(savedMix.safetyScore).toBeGreaterThanOrEqual(0)
    expect(savedMix.safetyScore).toBeLessThanOrEqual(100)
    expect(savedMix.safetyRating).not.toBe('dangerous')
    expect(savedMix.safetyWarnings).not.toContain('fake-warning')
  })

  it('rejects a 100% cinnamon-bark mix with 400 even when the client claims safe', async () => {
    const res = await POST(makeRequest(addBody({
      recipeName: 'Danger Blend',
      mode: 'pure',
      oils: [{ oilId: 'cinnamon-bark', oilName: 'Cinnamon Bark', ml: 30, percentage: 100 }],
      totalVolume: 30,
      safetyScore: 100,
      safetyRating: 'excellent',
      safetyWarnings: [],
    })))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(body.errors.length).toBeGreaterThan(0)
    expect(cartManager.addItem).not.toHaveBeenCalled()
  })

  it('rejects mixes containing unknown oils with 400', async () => {
    const res = await POST(makeRequest(addBody({
      recipeName: 'Mystery Blend',
      mode: 'pure',
      oils: [{ oilId: 'unicorn-oil', oilName: 'Unicorn', ml: 30, percentage: 100 }],
      totalVolume: 30,
      safetyScore: 95,
      safetyRating: 'safe',
      safetyWarnings: [],
    })))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.errors.some((e: string) => e.includes('Unknown oil'))).toBe(true)
    expect(cartManager.addItem).not.toHaveBeenCalled()
  })

  it('rejects mixes whose oil volumes exceed the total volume', async () => {
    const res = await POST(makeRequest(addBody({
      recipeName: 'Overfull Blend',
      mode: 'pure',
      oils: [
        { oilId: 'lavender', oilName: 'Lavender', ml: 20, percentage: 50 },
        { oilId: 'frankincense', oilName: 'Frankincense', ml: 20, percentage: 50 },
      ],
      totalVolume: 30,
    })))

    expect(res.status).toBe(400)
    expect(cartManager.addItem).not.toHaveBeenCalled()
  })
})
