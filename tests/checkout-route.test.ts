/**
 * Stripe Checkout Route Tests
 * Session shape (coupon vs negative line item), session-derived customerId,
 * store credit validation, GST consistency, and inventory gating.
 * Stripe, DB, session, and inventory are all mocked.
 */

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('next/server', () => ({
  NextRequest: class NextRequest {},
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/stripe/config', () => ({
  stripe: {
    checkout: { sessions: { create: jest.fn() } },
    coupons: { create: jest.fn(), retrieve: jest.fn() },
    customers: { list: jest.fn(), update: jest.fn(), create: jest.fn() },
    errors: { StripeError: class StripeError extends Error {} },
  },
  calculateShippingCost: jest.fn(),
  SHIPPING_RATES: {
    domestic: {
      standard: { amount: 1000, description: 'Standard Shipping (3-5 business days)' },
      express: { amount: 1500, description: 'Express Shipping (1-2 business days)' },
      free: { amount: 0, description: 'Free Shipping', threshold: 19900 },
    },
    international: {
      standard: { amount: 2500, description: 'International Standard (7-14 days)' },
      express: { amount: 5000, description: 'International Express (3-5 days)' },
    },
  },
}))

jest.mock('@/lib/shipping/auspost', () => ({
  getBestShippingRate: jest.fn(),
  calculateParcelWeight: jest.fn(() => 0.5),
}))

jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      customerCredits: { findFirst: jest.fn() },
    },
  },
}))

jest.mock('@/lib/db/schema-refill', () => ({
  customerCredits: { customerId: 'customerCredits.customerId' },
}))

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field: any, value: any) => ({ field, value, operator: 'eq' })),
}))

jest.mock('@/lib/inventory/availability', () => ({
  checkInventoryAvailability: jest.fn(),
}))

import { POST } from '@/app/api/stripe/checkout/route'
import { calculatePurePrice } from '@/lib/content/pricing-engine-final'

const { stripe, calculateShippingCost } = jest.requireMock('@/lib/stripe/config') as any
const { getBestShippingRate } = jest.requireMock('@/lib/shipping/auspost') as any
const { getSession } = jest.requireMock('@/lib/auth/session') as any
const { db } = jest.requireMock('@/lib/db') as any
const { checkInventoryAvailability } = jest.requireMock('@/lib/inventory/availability') as any

const sessionsCreate = stripe.checkout.sessions.create as jest.Mock
const couponsCreate = stripe.coupons.create as jest.Mock
const couponsRetrieve = stripe.coupons.retrieve as jest.Mock

// ============================================================================
// HELPERS
// ============================================================================

const LAVENDER_30ML_CENTS = Math.round(calculatePurePrice('lavender', 30) * 100)

function buildBody(overrides: any = {}) {
  return {
    items: [
      {
        name: 'Lavender',
        amount: LAVENDER_30ML_CENTS,
        quantity: 1,
        metadata: { oilId: 'lavender', size: '30ml', type: 'pure' },
      },
    ],
    customerEmail: 'test@example.com',
    shippingAddress: {
      firstName: 'Test',
      lastName: 'User',
      address1: '1 Main St',
      city: 'Sydney',
      province: 'NSW',
      postalCode: '2000',
      country: 'AU',
    },
    successUrl: 'http://localhost:3000/checkout/success',
    cancelUrl: 'http://localhost:3000/checkout',
    ...overrides,
  }
}

function makeRequest(body: any): any {
  return { json: async () => body }
}

function loggedIn(customerId = 'cust_session_123') {
  getSession.mockResolvedValue({ isLoggedIn: true, customerId })
}

beforeEach(() => {
  sessionsCreate.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
    amount_total: 0,
  })
  couponsCreate.mockImplementation(async (params: any) => ({ id: `coupon_${params.amount_off}` }))
  couponsRetrieve.mockImplementation(async (id: string) => ({ id }))
  stripe.customers.list.mockResolvedValue({ data: [] })
  stripe.customers.create.mockResolvedValue({ id: 'cus_new_123' })
  stripe.customers.update.mockResolvedValue({ id: 'cus_upd_123' })
  calculateShippingCost.mockReturnValue({ amount: 1000, description: 'Standard Shipping (3-5 business days)' })
  getBestShippingRate.mockResolvedValue({ amount: 1000, description: 'Standard Shipping (3-5 business days)' })
  getSession.mockResolvedValue({ isLoggedIn: false })
  db.query.customerCredits.findFirst.mockResolvedValue(undefined)
  checkInventoryAvailability.mockResolvedValue({ ok: true, failures: [] })
})

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/stripe/checkout — happy path', () => {
  it('creates a checkout session without discounts when no credit is used', async () => {
    const res = await POST(makeRequest(buildBody()))
    expect(res.status).toBe(200)

    const sessionParams = sessionsCreate.mock.calls[0][0]
    expect(sessionParams.mode).toBe('payment')
    expect(sessionParams.discounts).toBeUndefined()
  })

  it('never sends negative line items to Stripe', async () => {
    loggedIn()
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 10000 })

    const res = await POST(makeRequest(buildBody({ creditUsed: 500 })))
    expect(res.status).toBe(200)

    const sessionParams = sessionsCreate.mock.calls[0][0]
    for (const lineItem of sessionParams.line_items) {
      expect(lineItem.price_data.unit_amount).toBeGreaterThan(0)
    }
    expect(
      sessionParams.line_items.some((li: any) => li.price_data.product_data.name === 'Store Credit')
    ).toBe(false)
  })

  it('adds a GST line item matching Math.round((subtotal + shipping) * 0.1) for AU orders', async () => {
    const res = await POST(makeRequest(buildBody()))
    expect(res.status).toBe(200)

    const sessionParams = sessionsCreate.mock.calls[0][0]
    const expectedGst = Math.round((LAVENDER_30ML_CENTS + 1000) * 0.1)
    const gstLine = sessionParams.line_items.find(
      (li: any) => li.price_data.product_data.name === 'GST (10%)'
    )
    expect(gstLine).toBeDefined()
    expect(gstLine.price_data.unit_amount).toBe(expectedGst)

    // Charged total = subtotal + shipping + GST (no credit)
    const lineTotal = sessionParams.line_items.reduce(
      (sum: number, li: any) => sum + li.price_data.unit_amount * li.quantity,
      0
    )
    expect(lineTotal).toBe(LAVENDER_30ML_CENTS + 1000 + expectedGst)
  })

  it('rejects tampered item prices with 400 and creates no session', async () => {
    const body = buildBody()
    body.items[0].amount = 100 // way below canonical
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('accepts a gift card checkout item at a valid denomination', async () => {
    const body = buildBody({
      items: [
        {
          name: 'Oil Amor Gift Card - $100',
          amount: 10000,
          quantity: 1,
          metadata: { type: 'gift-card', giftCardAmount: '100' },
        },
      ],
    })
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(200)
    expect(sessionsCreate).toHaveBeenCalled()
  })
})

describe('POST /api/stripe/checkout — store credit via coupon', () => {
  it('creates a coupon with the credit amount and passes it as a session discount', async () => {
    loggedIn()
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 10000 })

    const res = await POST(makeRequest(buildBody({ creditUsed: 600 })))
    expect(res.status).toBe(200)

    expect(couponsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount_off: 600, currency: 'aud', duration: 'once' })
    )

    const sessionParams = sessionsCreate.mock.calls[0][0]
    expect(sessionParams.discounts).toEqual([{ coupon: 'coupon_600' }])
  })

  it('reuses the cached coupon for a repeat credit amount', async () => {
    loggedIn()
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 100000 })

    await POST(makeRequest(buildBody({ creditUsed: 700 })))
    await POST(makeRequest(buildBody({ creditUsed: 700 })))

    expect(couponsCreate).toHaveBeenCalledTimes(1)
    expect(couponsRetrieve).toHaveBeenCalledWith('coupon_700')
    const secondSession = sessionsCreate.mock.calls[1][0]
    expect(secondSession.discounts).toEqual([{ coupon: 'coupon_700' }])
  })

  it('rejects credit when it would zero out the payable total (no zero-amount session)', async () => {
    loggedIn()
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 100000 })
    // Non-AU order: no GST; forced free shipping → credit equals the whole total
    calculateShippingCost.mockReturnValue({ amount: 0, description: 'Free Shipping' })

    const body = buildBody({ creditUsed: LAVENDER_30ML_CENTS })
    body.shippingAddress.country = 'US'
    const res = await POST(makeRequest(body))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/covers the entire order total/)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})

describe('POST /api/stripe/checkout — customerId is session-derived', () => {
  it('uses the session customer id in metadata even when the body claims another', async () => {
    loggedIn('cust_session_123')
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 10000 })

    const res = await POST(
      makeRequest(buildBody({ customerId: 'cust_attacker', creditUsed: 500 }))
    )
    expect(res.status).toBe(200)

    const sessionParams = sessionsCreate.mock.calls[0][0]
    expect(sessionParams.metadata.customerId).toBe('cust_session_123')
    expect(sessionParams.payment_intent_data.metadata.customerId).toBe('cust_session_123')
  })

  it('marks metadata.customerId as guest when there is no session, ignoring the body', async () => {
    const res = await POST(makeRequest(buildBody({ customerId: 'cust_attacker' })))
    expect(res.status).toBe(200)

    const sessionParams = sessionsCreate.mock.calls[0][0]
    expect(sessionParams.metadata.customerId).toBe('guest')
    expect(sessionParams.payment_intent_data.metadata.customerId).toBe('guest')
  })

  it('rejects creditUsed > 0 without a session (401)', async () => {
    const res = await POST(makeRequest(buildBody({ customerId: 'cust_attacker', creditUsed: 500 })))
    expect(res.status).toBe(401)
    expect(sessionsCreate).not.toHaveBeenCalled()
    expect(db.query.customerCredits.findFirst).not.toHaveBeenCalled()
  })

  it('rejects credit above the available balance (400)', async () => {
    loggedIn()
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 100 })

    const res = await POST(makeRequest(buildBody({ creditUsed: 500 })))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Insufficient store credit/)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('rejects credit above the order subtotal (400)', async () => {
    loggedIn()
    db.query.customerCredits.findFirst.mockResolvedValue({ balance: 100000 })

    const res = await POST(makeRequest(buildBody({ creditUsed: LAVENDER_30ML_CENTS + 1 })))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/cannot exceed order subtotal/)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})

describe('POST /api/stripe/checkout — inventory gate', () => {
  it('returns 409 with failures when inventory is unavailable', async () => {
    checkInventoryAvailability.mockResolvedValue({
      ok: false,
      failures: [{ id: 'lavender', reason: "insufficient stock for 'Lavender' (30ml): need 1, have 0" }],
    })

    const res = await POST(makeRequest(buildBody()))
    expect(res.status).toBe(409)

    const data = await res.json()
    expect(data.failures).toHaveLength(1)
    expect(data.failures[0].id).toBe('lavender')
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('proceeds to session creation when inventory is available', async () => {
    const res = await POST(makeRequest(buildBody()))
    expect(res.status).toBe(200)
    expect(checkInventoryAvailability).toHaveBeenCalled()
    expect(sessionsCreate).toHaveBeenCalled()
  })

  it('maps checkout items to oil-level inventory checks, skipping gift cards', async () => {
    const body = buildBody({
      items: [
        {
          name: 'Lavender',
          amount: LAVENDER_30ML_CENTS,
          quantity: 2,
          metadata: { oilId: 'lavender', size: '30ml', type: 'pure' },
        },
        {
          name: 'Oil Amor Gift Card - $50',
          amount: 5000,
          quantity: 1,
          metadata: { type: 'gift-card', giftCardAmount: '50' },
        },
      ],
    })

    const res = await POST(makeRequest(body))
    expect(res.status).toBe(200)
    expect(checkInventoryAvailability).toHaveBeenCalledWith([
      { oilId: 'lavender', size: '30ml', quantity: 2 },
    ])
  })
})
