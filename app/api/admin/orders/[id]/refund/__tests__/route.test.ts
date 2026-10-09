/**
 * Admin Order Refund Route Tests
 * Refund reversal wiring, failure isolation, double-refund guard
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

const mockRequireAdminAuth = jest.fn()
jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}))

const mockSelectLimit = jest.fn()
const mockSelectWhere = jest.fn(() => ({ limit: mockSelectLimit }))
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }))
const mockUpdateWhere = jest.fn()
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }))

jest.mock('@/lib/db', () => ({
  db: {
    select: () => ({ from: mockSelectFrom }),
    update: () => ({ set: mockUpdateSet }),
  },
}))

const mockRefundsCreate = jest.fn()
jest.mock('@/lib/stripe/config', () => ({
  getStripe: () => ({ refunds: { create: (...args: unknown[]) => mockRefundsCreate(...args) } }),
}))

const mockSendRefundConfirmation = jest.fn()
const mockSendAdminNotification = jest.fn()
jest.mock('@/lib/email/resend', () => ({
  sendRefundConfirmationEmail: (...args: unknown[]) => mockSendRefundConfirmation(...args),
  sendAdminOrderNotification: (...args: unknown[]) => mockSendAdminNotification(...args),
}))

const mockReverseBlendCommission = jest.fn()
jest.mock('@/lib/community-blends/commissions', () => ({
  reverseBlendCommission: (...args: unknown[]) => mockReverseBlendCommission(...args),
}))

const mockRestoreCustomerCredits = jest.fn()
jest.mock('@/lib/refill/credit-restore', () => ({
  restoreCustomerCredits: (...args: unknown[]) => mockRestoreCustomerCredits(...args),
}))

const mockRevokeOrderUnlocks = jest.fn()
jest.mock('@/lib/orders/revocations', () => ({
  revokeOrderUnlocks: (...args: unknown[]) => mockRevokeOrderUnlocks(...args),
}))

const mockRestoreOrderInventory = jest.fn()
jest.mock('@/lib/inventory/refund-restore', () => ({
  restoreOrderInventory: (...args: unknown[]) => mockRestoreOrderInventory(...args),
}))

import { POST } from '../route'

// ============================================================================
// FIXTURES & HELPERS
// ============================================================================

const paidOrder = {
  id: 'ord_1',
  customerId: 'cust_1',
  customerEmail: 'jane@example.com',
  customerName: 'Jane Doe',
  isGuest: false,
  status: 'delivered',
  statusHistory: [],
  items: [
    { id: 'li_1', type: 'standard-oil', name: 'Lavender Essential Oil', unitPrice: 5000, quantity: 1, subtotal: 5000, taxAmount: 0, total: 5000 },
    { id: 'li_2', type: 'custom-mix', name: 'Sleep Blend', unitPrice: 3500, quantity: 1, subtotal: 3500, taxAmount: 0, total: 3500, blendId: 'blend_9' },
  ],
  subtotal: 5000,
  taxTotal: 0,
  shippingTotal: 0,
  discountTotal: 0,
  storeCreditUsed: 500,
  giftCardUsed: 0,
  total: 5000,
  currency: 'AUD',
  payment: { method: 'credit-card', status: 'captured', transactionId: 'pi_123' },
  shippingAddress: null,
  shipping: null,
  isGift: false,
  giftMessage: null,
  giftReceipt: false,
  requiresBlending: false,
  blendingPriority: null,
  eligibleForReturns: true,
  returnCreditsEarned: 0,
  returnCreditsUsed: 0,
  customerNote: null,
  internalNote: null,
  metadata: {},
  processingCompletedAt: new Date('2026-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/orders/ord_1/refund', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const routeParams = { params: Promise.resolve({ id: 'ord_1' }) }

function getSetCalls(): Array<Record<string, any>> {
  return mockUpdateSet.mock.calls.map(call => call[0] as Record<string, any>)
}

beforeEach(() => {
  mockRequireAdminAuth.mockReset()
  mockSelectLimit.mockReset()
  mockRefundsCreate.mockReset()
  mockSendRefundConfirmation.mockReset()
  mockSendAdminNotification.mockReset()
  mockReverseBlendCommission.mockReset()
  mockRestoreCustomerCredits.mockReset()
  mockRevokeOrderUnlocks.mockReset()
  mockRestoreOrderInventory.mockReset()
  mockUpdateSet.mockClear()
  mockUpdateWhere.mockReset()

  mockRequireAdminAuth.mockResolvedValue(null)
  mockSelectLimit.mockResolvedValue([paidOrder])
  mockRefundsCreate.mockResolvedValue({ id: 're_123', amount: 5000, status: 'succeeded' })
  mockReverseBlendCommission.mockResolvedValue({ success: true, reversedAmount: 350 })
  mockUpdateWhere.mockResolvedValue(undefined)
})

// ============================================================================
// TESTS
// ============================================================================

describe('POST /api/admin/orders/[id]/refund', () => {
  it('creates the Stripe refund, marks the order refunded, and wires all four reversals', async () => {
    const res = await POST(makeRequest({ amount: 5000, reason: 'Customer request' }), routeParams)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.refundId).toBe('re_123')

    expect(mockRefundsCreate).toHaveBeenCalledWith(expect.objectContaining({
      payment_intent: 'pi_123',
      amount: 5000,
    }))

    expect(mockReverseBlendCommission).toHaveBeenCalledWith('ord_1', 'blend_9')
    expect(mockRestoreCustomerCredits).toHaveBeenCalledWith('cust_1', 500, expect.stringContaining('re_123'))
    expect(mockRevokeOrderUnlocks).toHaveBeenCalledWith('ord_1')
    expect(mockRestoreOrderInventory).toHaveBeenCalledWith('ord_1')

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate).toBeDefined()
    expect(refundUpdate!.payment.status).toBe('refunded')
    expect(refundUpdate!.metadata.needsAdminReview).toBeUndefined()
  })

  it('reverses each blend commission when the order has multiple blend items', async () => {
    mockSelectLimit.mockResolvedValue([{
      ...paidOrder,
      items: [
        { id: 'li_1', type: 'custom-mix', name: 'Blend A', unitPrice: 3500, quantity: 1, subtotal: 3500, taxAmount: 0, total: 3500, blendId: 'blend_a' },
        { id: 'li_2', type: 'custom-mix', name: 'Blend B', unitPrice: 3500, quantity: 1, subtotal: 3500, taxAmount: 0, total: 3500, blendId: 'blend_b' },
      ],
    }])

    await POST(makeRequest({}), routeParams)

    expect(mockReverseBlendCommission).toHaveBeenCalledWith('ord_1', 'blend_a')
    expect(mockReverseBlendCommission).toHaveBeenCalledWith('ord_1', 'blend_b')
  })

  it('performs a full refund when no amount is given', async () => {
    await POST(makeRequest({}), routeParams)

    expect(mockRefundsCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: undefined,
    }))
  })

  it('marks payment partially-refunded for partial amounts', async () => {
    mockRefundsCreate.mockResolvedValue({ id: 're_123', amount: 1000, status: 'succeeded' })

    await POST(makeRequest({ amount: 1000 }), routeParams)

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate!.payment.status).toBe('partially-refunded')
    expect(refundUpdate!.payment.refundAmount).toBe(1000)
  })

  it('skips credit restore when the order used no store credit', async () => {
    mockSelectLimit.mockResolvedValue([{ ...paidOrder, storeCreditUsed: 0 }])

    await POST(makeRequest({}), routeParams)

    expect(mockRestoreCustomerCredits).not.toHaveBeenCalled()
    expect(mockRevokeOrderUnlocks).toHaveBeenCalled()
    expect(mockRestoreOrderInventory).toHaveBeenCalled()
  })

  it('returns 404 when the order does not exist', async () => {
    mockSelectLimit.mockResolvedValue([])

    const res = await POST(makeRequest({}), routeParams)

    expect(res.status).toBe(404)
    expect(mockRefundsCreate).not.toHaveBeenCalled()
  })

  it('returns 400 when the order has no payment transaction', async () => {
    mockSelectLimit.mockResolvedValue([{ ...paidOrder, payment: { method: 'credit-card', status: 'captured' } }])

    const res = await POST(makeRequest({}), routeParams)

    expect(res.status).toBe(400)
    expect(mockRefundsCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid refund amount', async () => {
    const res = await POST(makeRequest({ amount: 99999 }), routeParams)

    expect(res.status).toBe(400)
    expect(mockRefundsCreate).not.toHaveBeenCalled()
  })

  it('returns 400 when the order was already refunded (reversals must not run twice)', async () => {
    mockSelectLimit.mockResolvedValue([{ ...paidOrder, status: 'refunded' }])

    const res = await POST(makeRequest({}), routeParams)

    expect(res.status).toBe(400)
    expect(mockRefundsCreate).not.toHaveBeenCalled()
    expect(mockRestoreOrderInventory).not.toHaveBeenCalled()
  })

  it('isolates a reversal failure, flags the order, and still reports success', async () => {
    mockRevokeOrderUnlocks.mockRejectedValue(new Error('unlocks db down'))

    const res = await POST(makeRequest({}), routeParams)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.reversalFailures).toBeDefined()
    expect(body.reversalFailures.length).toBeGreaterThan(0)

    expect(mockReverseBlendCommission).toHaveBeenCalled()
    expect(mockRestoreCustomerCredits).toHaveBeenCalled()
    expect(mockRestoreOrderInventory).toHaveBeenCalled()

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate!.metadata.needsAdminReview).toBe(true)
  })

  it('treats an already-reversed commission as benign (no admin flag)', async () => {
    mockReverseBlendCommission.mockResolvedValue({ success: false, error: 'Commission already reversed' })

    const res = await POST(makeRequest({}), routeParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reversalFailures).toBeUndefined()
    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate!.metadata.needsAdminReview).toBeUndefined()
  })

  it('returns 500 when the Stripe refund fails', async () => {
    mockRefundsCreate.mockRejectedValue(new Error('card issuer rejected'))

    const res = await POST(makeRequest({}), routeParams)

    expect(res.status).toBe(500)
    const body = await res.json()
    // 2026-10-09: internal error messages must not leak to the client
    expect(body.error).toBe('Refund failed')
    expect(body.details).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('card issuer rejected')
    expect(mockRestoreOrderInventory).not.toHaveBeenCalled()
  })
})
