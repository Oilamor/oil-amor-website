/**
 * Refill Order Route Tests
 *
 * 2026-07-21: algorithm-driven refill pricing — the route charges the
 * engine-computed price from initiateRefillOrder (integer cents) minus any
 * applied credit, persists that exact pricing on the order, and returns
 * dollars at the display boundary. NO flat $35 anywhere.
 */

import { NextRequest } from 'next/server'

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('next/server', () => {
  class MockNextRequest {
    url: string
    private body: string
    headers: { get: (key: string) => string | null }

    constructor(input: string, init?: { body?: string; headers?: Record<string, string> }) {
      this.url = input
      this.body = init?.body ?? ''
      const headerMap = init?.headers ?? {}
      this.headers = { get: (key: string) => (key in headerMap ? headerMap[key] : null) }
    }

    async text() { return this.body }
    async json() { return JSON.parse(this.body) }
  }

  class MockNextResponse {
    status: number
    private data: unknown

    constructor(data?: unknown, init?: { status?: number }) {
      this.data = data
      this.status = init?.status ?? 200
    }

    async json() { return this.data }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init)
    }
  }

  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse }
})

const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockCreateCheckoutSession = jest.fn()
jest.mock('@/lib/stripe/config', () => ({
  stripe: {
    checkout: {
      sessions: { create: (...args: unknown[]) => mockCreateCheckoutSession(...args) },
    },
  },
}))

const mockInitiateRefillOrder = jest.fn()
const mockUpdateRefillOrderPricing = jest.fn()
jest.mock('@/lib/refill/return-workflow', () => ({
  initiateRefillOrder: (...args: unknown[]) => mockInitiateRefillOrder(...args),
  updateRefillOrderPricing: (...args: unknown[]) => mockUpdateRefillOrderPricing(...args),
}))

const mockUseCredits = jest.fn()
jest.mock('@/lib/refill/credits', () => ({
  useCredits: (...args: unknown[]) => mockUseCredits(...args),
  REFILL_CREDIT_AMOUNT: 500,
}))

import { POST } from '../route'

// ============================================================================
// HELPERS
// ============================================================================

const ADDRESS = {
  name: 'Jane Smith',
  addressLine1: '123 Main St',
  city: 'Melbourne',
  state: 'VIC',
  postcode: '3000',
  phone: '0412345678',
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/refill/order', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// Lavender 100ml engine-computed refill price in cents
const LAVENDER_CENTS = 3095

function primeHappyPath(standardPriceCents = LAVENDER_CENTS) {
  mockGetSession.mockResolvedValue({
    isLoggedIn: true,
    customerId: 'cust-1',
    email: 'jane@example.com',
  })
  mockInitiateRefillOrder.mockResolvedValue({
    orderId: 'ro_1',
    returnLabel: { trackingNumber: 'TGE123', labelUrl: 'https://example.com/label.pdf' },
    newBottle: { id: 'bottle-1', oilType: 'lavender' },
    pricing: { standardPrice: standardPriceCents, creditApplied: 0, finalPrice: standardPriceCents },
  })
  mockUseCredits.mockResolvedValue({ success: true })
  mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/refill/order — engine-computed pricing', () => {
  it('charges the computed price minus the return credit when credits are used', async () => {
    primeHappyPath()

    const res = await POST(makeRequest({ bottleId: 'bottle-1', useCredits: true, customerAddress: ADDRESS }))
    const body = await res.json()

    expect(res.status).toBe(200)
    // Stripe unit_amount is ALREADY cents — 3095 − 500 = 2595, NOT 259500
    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1)
    const sessionArg = mockCreateCheckoutSession.mock.calls[0][0]
    expect(sessionArg.line_items[0].price_data.unit_amount).toBe(2595)
    expect(sessionArg.metadata.creditUsed).toBe('500')

    // Stored pricing matches what is actually charged
    expect(mockUpdateRefillOrderPricing).toHaveBeenCalledWith('ro_1', {
      standardPrice: 3095,
      creditApplied: 500,
      finalPrice: 2595,
    })

    // Display boundary: dollars for the UI
    expect(body.finalPrice).toBe(25.95)
    expect(body.creditUsed).toBe(5)
  })

  it('charges the full computed price when credits are not used', async () => {
    primeHappyPath()

    const res = await POST(makeRequest({ bottleId: 'bottle-1', useCredits: false, customerAddress: ADDRESS }))
    const body = await res.json()

    expect(res.status).toBe(200)
    const sessionArg = mockCreateCheckoutSession.mock.calls[0][0]
    expect(sessionArg.line_items[0].price_data.unit_amount).toBe(3095)
    expect(sessionArg.metadata.creditUsed).toBe('0')
    expect(mockUseCredits).not.toHaveBeenCalled()

    expect(mockUpdateRefillOrderPricing).toHaveBeenCalledWith('ro_1', {
      standardPrice: 3095,
      creditApplied: 0,
      finalPrice: 3095,
    })

    expect(body.finalPrice).toBe(30.95)
    expect(body.creditUsed).toBe(0)
  })

  it('charges per-oil computed prices — a luxury oil costs what the engine says', async () => {
    primeHappyPath(17895) // myrrh 100ml

    const res = await POST(makeRequest({ bottleId: 'bottle-2', useCredits: true, customerAddress: ADDRESS }))
    const body = await res.json()

    const sessionArg = mockCreateCheckoutSession.mock.calls[0][0]
    expect(sessionArg.line_items[0].price_data.unit_amount).toBe(17395)
    expect(body.finalPrice).toBe(173.95)
  })

  it('falls back to full price when the credit debit fails', async () => {
    primeHappyPath()
    mockUseCredits.mockRejectedValue(new Error('insufficient balance'))

    const res = await POST(makeRequest({ bottleId: 'bottle-1', useCredits: true, customerAddress: ADDRESS }))
    const body = await res.json()

    expect(res.status).toBe(200)
    const sessionArg = mockCreateCheckoutSession.mock.calls[0][0]
    expect(sessionArg.line_items[0].price_data.unit_amount).toBe(3095)
    expect(sessionArg.metadata.creditUsed).toBe('0')
    expect(body.finalPrice).toBe(30.95)
    expect(body.creditUsed).toBe(0)
  })

  it('rejects unauthenticated requests', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: false })

    const res = await POST(makeRequest({ bottleId: 'bottle-1', useCredits: false, customerAddress: ADDRESS }))

    expect(res.status).toBe(401)
    expect(mockInitiateRefillOrder).not.toHaveBeenCalled()
  })

  it('requires bottleId and customerAddress', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'cust-1', email: 'jane@example.com' })

    const res = await POST(makeRequest({ bottleId: 'bottle-1' }))

    expect(res.status).toBe(400)
    expect(mockInitiateRefillOrder).not.toHaveBeenCalled()
  })
})
