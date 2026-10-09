/**
 * Admin Order Refund Route — Lazy Stripe Init Tests
 * The Stripe client must be created lazily: importing the route without
 * STRIPE_SECRET_KEY set must not throw; only using the client may fail.
 */

import { NextRequest } from 'next/server'

// ============================================================================
// MOCKS (note: '@/lib/stripe/config' is deliberately NOT mocked)
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

jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: jest.fn().mockResolvedValue(null),
}))

const mockSelectLimit = jest.fn()
jest.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectLimit }) }) }),
    update: () => ({ set: () => ({ where: jest.fn().mockResolvedValue(undefined) }) }),
  },
}))

jest.mock('@/lib/email/resend', () => ({
  sendRefundConfirmationEmail: jest.fn(),
  sendAdminOrderNotification: jest.fn(),
}))

jest.mock('@/lib/community-blends/commissions', () => ({
  reverseBlendCommission: jest.fn(),
}))

jest.mock('@/lib/refill/credit-restore', () => ({
  restoreCustomerCredits: jest.fn(),
}))

jest.mock('@/lib/orders/revocations', () => ({
  revokeOrderUnlocks: jest.fn(),
}))

jest.mock('@/lib/inventory/refund-restore', () => ({
  restoreOrderInventory: jest.fn(),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('lazy Stripe init', () => {
  const ORIGINAL_KEY = process.env.STRIPE_SECRET_KEY

  const orderWithPayment = {
    id: 'ord_1',
    customerId: 'cust_1',
    customerEmail: 'jane@example.com',
    customerName: 'Jane Doe',
    status: 'delivered',
    statusHistory: [],
    items: [],
    storeCreditUsed: 0,
    total: 5000,
    payment: { method: 'credit-card', status: 'captured', transactionId: 'pi_123' },
    metadata: {},
  }

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    mockSelectLimit.mockReset()
    mockSelectLimit.mockResolvedValue([orderWithPayment])
  })

  afterAll(() => {
    if (ORIGINAL_KEY !== undefined) {
      process.env.STRIPE_SECRET_KEY = ORIGINAL_KEY
    } else {
      delete process.env.STRIPE_SECRET_KEY
    }
  })

  it('imports the route without STRIPE_SECRET_KEY set (no throw at import time)', async () => {
    await expect(import('../route')).resolves.toBeDefined()
  })

  it('fails only when the client is used, returning 500 with the config error', async () => {
    const { POST } = await import('../route')

    const req = new NextRequest('http://localhost/api/admin/orders/ord_1/refund', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'ord_1' }) })

    expect(res.status).toBe(500)
    const body = await res.json()
    // 2026-10-09: internal config/error messages must not leak to the client
    expect(body.error).toBe('Refund failed')
    expect(body.details).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('STRIPE_SECRET_KEY')
  })
})
