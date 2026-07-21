/**
 * Stripe Webhook Route Tests
 * Atomic idempotency, charge.refunded reversal, refill checkout abandonment
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

const mockConstructEvent = jest.fn()
const mockListLineItems = jest.fn()
jest.mock('@/lib/stripe/config', () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) },
    checkout: { sessions: { listLineItems: (...args: unknown[]) => mockListLineItems(...args) } },
  },
}))

const mockOrdersFindFirst = jest.fn()
const mockRefillOrdersFindFirst = jest.fn()
const mockUnlockedOilsFindMany = jest.fn()
const mockUnlockedOilsFindFirst = jest.fn()
const mockCustomersFindFirst = jest.fn()
const mockUpdateReturning = jest.fn()
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }))
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }))
const mockInsertValues = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      orders: { findFirst: (...args: unknown[]) => mockOrdersFindFirst(...args) },
      refillOrders: { findFirst: (...args: unknown[]) => mockRefillOrdersFindFirst(...args) },
      unlockedOils: {
        findMany: (...args: unknown[]) => mockUnlockedOilsFindMany(...args),
        findFirst: (...args: unknown[]) => mockUnlockedOilsFindFirst(...args),
      },
      customers: { findFirst: (...args: unknown[]) => mockCustomersFindFirst(...args) },
    },
    update: () => ({ set: mockUpdateSet }),
    insert: () => ({ values: mockInsertValues }),
  },
}))

const mockReverseBlendCommission = jest.fn()
jest.mock('@/lib/community-blends/commissions', () => ({
  reverseBlendCommission: (...args: unknown[]) => mockReverseBlendCommission(...args),
}))

const mockRestoreCustomerCredits = jest.fn()
const mockRestoreRefillCredit = jest.fn()
const mockReleaseBottleLock = jest.fn()
jest.mock('@/lib/refill/credit-restore', () => ({
  restoreCustomerCredits: (...args: unknown[]) => mockRestoreCustomerCredits(...args),
  restoreRefillCredit: (...args: unknown[]) => mockRestoreRefillCredit(...args),
  releaseBottleLock: (...args: unknown[]) => mockReleaseBottleLock(...args),
}))

const mockRevokeOrderUnlocks = jest.fn()
jest.mock('@/lib/orders/revocations', () => ({
  revokeOrderUnlocks: (...args: unknown[]) => mockRevokeOrderUnlocks(...args),
}))

const mockRestoreOrderInventory = jest.fn()
jest.mock('@/lib/inventory/refund-restore', () => ({
  restoreOrderInventory: (...args: unknown[]) => mockRestoreOrderInventory(...args),
}))

const mockUseCredits = jest.fn()
jest.mock('@/lib/refill/credits', () => ({
  useCredits: (...args: unknown[]) => mockUseCredits(...args),
  REFILL_CREDIT_AMOUNT: 500,
}))

const mockCompleteOrderProcessing = jest.fn()
jest.mock('@/lib/orders/order-completion', () => ({
  completeOrderProcessing: (...args: unknown[]) => mockCompleteOrderProcessing(...args),
}))

const mockDeductInventory = jest.fn()
jest.mock('@/lib/inventory/inventory', () => ({
  deductInventory: (...args: unknown[]) => mockDeductInventory(...args),
}))

const mockSendOrderConfirmation = jest.fn()
const mockSendAdminNotification = jest.fn()
jest.mock('@/lib/email/resend', () => ({
  sendOrderConfirmationEmail: (...args: unknown[]) => mockSendOrderConfirmation(...args),
  sendAdminOrderNotification: (...args: unknown[]) => mockSendAdminNotification(...args),
}))

// Set the webhook secret BEFORE loading the route (it reads env at module load)
process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret-value'
const { POST } = require('../route') as typeof import('../route')

// ============================================================================
// FIXTURES & HELPERS
// ============================================================================

function makeEvent(type: string, obj: unknown) {
  return { id: 'evt_1', object: 'event', type, data: { object: obj } }
}

function makeSession(metadata: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_123',
    object: 'checkout.session',
    amount_total: 5000,
    customer_email: 'jane@example.com',
    customer_details: { name: 'Jane Doe', phone: null },
    payment_intent: 'pi_123',
    metadata,
    ...extra,
  }
}

function makeRequest(event: unknown) {
  mockConstructEvent.mockReturnValue(event)
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: 'raw-payload',
    headers: { 'stripe-signature': 'sig_test' },
  })
}

const baseOrder = {
  id: 'ord_1',
  customerId: 'cust_1',
  customerEmail: 'jane@example.com',
  customerName: 'Jane Doe',
  isGuest: false,
  status: 'pending',
  statusHistory: [],
  items: [
    { id: 'li_1', type: 'standard-oil', name: 'Lavender Essential Oil', unitPrice: 5000, quantity: 1, subtotal: 5000, taxAmount: 0, total: 5000 },
  ],
  subtotal: 5000,
  taxTotal: 0,
  shippingTotal: 0,
  discountTotal: 0,
  storeCreditUsed: 0,
  giftCardUsed: 0,
  total: 5000,
  currency: 'AUD',
  payment: { method: 'credit-card', status: 'authorized', transactionId: 'pi_123' },
  shippingAddress: { firstName: 'Jane', lastName: 'Doe', address1: '1 St', city: 'Sydney', province: 'NSW', country: 'AU', zip: '2000' },
  shipping: { carrier: 'auspost', service: 'standard', cost: 0 },
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
  processingCompletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const blendOrder = {
  ...baseOrder,
  status: 'delivered',
  storeCreditUsed: 500,
  items: [
    ...baseOrder.items,
    { id: 'li_2', type: 'custom-mix', name: 'Sleep Blend', unitPrice: 3500, quantity: 1, subtotal: 3500, taxAmount: 0, total: 3500, blendId: 'blend_9' },
  ],
}

const refundCharge = {
  id: 'ch_123',
  object: 'charge',
  amount: 5000,
  amount_refunded: 5000,
  payment_intent: 'pi_123',
  refunded: true,
}

function getSetCalls(): Array<Record<string, any>> {
  return mockUpdateSet.mock.calls.map(call => call[0] as Record<string, any>)
}

beforeEach(() => {
  mockOrdersFindFirst.mockReset()
  mockRefillOrdersFindFirst.mockReset()
  mockUnlockedOilsFindMany.mockReset()
  mockUnlockedOilsFindFirst.mockReset()
  mockCustomersFindFirst.mockReset()
  mockUpdateReturning.mockReset()
  mockInsertValues.mockReset()
  mockConstructEvent.mockReset()
  mockListLineItems.mockReset()
  mockReverseBlendCommission.mockReset()
  mockRestoreCustomerCredits.mockReset()
  mockRestoreRefillCredit.mockReset()
  mockReleaseBottleLock.mockReset()
  mockRevokeOrderUnlocks.mockReset()
  mockRestoreOrderInventory.mockReset()
  mockUseCredits.mockReset()
  mockCompleteOrderProcessing.mockReset()
  mockDeductInventory.mockReset()
  mockSendOrderConfirmation.mockReset()
  mockSendAdminNotification.mockReset()

  // Safe defaults
  mockInsertValues.mockResolvedValue(undefined)
  mockUnlockedOilsFindMany.mockResolvedValue([])
  mockCompleteOrderProcessing.mockResolvedValue({ unlockResult: { newUnlocks: [], upgradedUnlocks: [] } })
  mockCustomersFindFirst.mockResolvedValue({ id: 'cust_1', metadata: {} })
  mockReverseBlendCommission.mockResolvedValue({ success: true, reversedAmount: 350 })
  mockDeductInventory.mockResolvedValue(undefined)
  mockSendOrderConfirmation.mockResolvedValue(undefined)
  mockSendAdminNotification.mockResolvedValue(undefined)
})

// ============================================================================
// SIGNATURE HANDLING
// ============================================================================

describe('signature verification', () => {
  it('returns 500 when the stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: 'raw-payload',
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('bad signature') })
    const req = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: 'raw-payload',
      headers: { 'stripe-signature': 'sig_bad' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('acks unknown event types with 200', async () => {
    const res = await POST(makeRequest(makeEvent('payment_intent.created', {})))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })
})

// ============================================================================
// ATOMIC IDEMPOTENCY (checkout.session.completed)
// ============================================================================

describe('checkout.session.completed idempotency', () => {
  const completedSession = () => makeSession({
    orderId: 'ord_1',
    customerId: 'cust_1',
    subtotal: '5000',
    shipping: '0',
    tax: '0',
    itemCount: '1',
  })

  it('processes an order exactly once across duplicate concurrent deliveries', async () => {
    mockOrdersFindFirst.mockResolvedValue(baseOrder)
    // First delivery wins the atomic claim, second loses it
    mockUpdateReturning
      .mockResolvedValueOnce([{ id: 'ord_1' }])
      .mockResolvedValueOnce([])

    const res1 = await POST(makeRequest(makeEvent('checkout.session.completed', completedSession())))
    const res2 = await POST(makeRequest(makeEvent('checkout.session.completed', completedSession())))

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(mockDeductInventory).toHaveBeenCalledTimes(1)
    expect(mockSendOrderConfirmation).toHaveBeenCalledTimes(1)
    expect(mockSendAdminNotification).toHaveBeenCalledTimes(1)
  })

  it('claims idempotency atomically via a conditional UPDATE ... RETURNING', async () => {
    mockOrdersFindFirst.mockResolvedValue(baseOrder)
    mockUpdateReturning.mockResolvedValueOnce([{ id: 'ord_1' }])

    await POST(makeRequest(makeEvent('checkout.session.completed', completedSession())))

    // The first update must set processingCompletedAt (the claim)
    const setCalls = getSetCalls()
    expect(setCalls[0].processingCompletedAt).toBeInstanceOf(Date)
    expect(mockUpdateReturning).toHaveBeenCalled()
  })

  it('skips all side effects when the claim loses (order already processed)', async () => {
    mockOrdersFindFirst.mockResolvedValue({ ...baseOrder, processingCompletedAt: new Date() })
    mockUpdateReturning.mockResolvedValueOnce([])

    const res = await POST(makeRequest(makeEvent('checkout.session.completed', completedSession())))

    expect(res.status).toBe(200)
    expect(mockDeductInventory).not.toHaveBeenCalled()
    expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
    expect(mockCompleteOrderProcessing).not.toHaveBeenCalled()
  })

  it('creates the order from line items when it does not exist, then claims it', async () => {
    mockOrdersFindFirst
      .mockResolvedValueOnce(undefined) // existence check
      .mockResolvedValue(baseOrder)     // post-claim reads
    mockListLineItems.mockResolvedValue({
      data: [{
        description: 'Lavender Essential Oil',
        amount_total: 5000,
        amount_subtotal: 5000,
        quantity: 1,
        price: { product: { metadata: { oilId: 'lavender', size: '30ml', type: 'pure' } } },
      }],
    })
    mockUpdateReturning.mockResolvedValueOnce([{ id: 'ord_1' }])

    const res = await POST(makeRequest(makeEvent('checkout.session.completed', completedSession())))

    expect(res.status).toBe(200)
    expect(mockInsertValues).toHaveBeenCalledTimes(1)
    expect(mockDeductInventory).toHaveBeenCalledTimes(1)
  })

  it('does not process side effects when a concurrent insert races and the claim is lost', async () => {
    mockOrdersFindFirst.mockResolvedValue(undefined)
    mockListLineItems.mockResolvedValue({ data: [] })
    mockInsertValues.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))
    mockUpdateReturning.mockResolvedValueOnce([])

    const res = await POST(makeRequest(makeEvent('checkout.session.completed', completedSession())))

    expect(res.status).toBe(200)
    expect(mockDeductInventory).not.toHaveBeenCalled()
    expect(mockSendOrderConfirmation).not.toHaveBeenCalled()
  })

  it('marks refill sessions in-transit without touching the regular order flow', async () => {
    mockRefillOrdersFindFirst.mockResolvedValue({ id: 'ro_1', status: 'pending-return' })

    const session = makeSession({ orderId: 'ro_1', customerId: 'cust_1', type: 'refill' })
    const res = await POST(makeRequest(makeEvent('checkout.session.completed', session)))

    expect(res.status).toBe(200)
    expect(getSetCalls().some(s => s.status === 'in-transit')).toBe(true)
    expect(mockOrdersFindFirst).not.toHaveBeenCalled()
    expect(mockDeductInventory).not.toHaveBeenCalled()
  })
})

// ============================================================================
// charge.refunded
// ============================================================================

describe('charge.refunded', () => {
  it('reverses all four side effects and marks the order refunded', async () => {
    mockOrdersFindFirst.mockResolvedValue(blendOrder)

    const res = await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(res.status).toBe(200)
    expect(mockReverseBlendCommission).toHaveBeenCalledWith('ord_1', 'blend_9')
    expect(mockRestoreCustomerCredits).toHaveBeenCalledWith('cust_1', 500, expect.stringContaining('ord_1'))
    expect(mockRevokeOrderUnlocks).toHaveBeenCalledWith('ord_1')
    expect(mockRestoreOrderInventory).toHaveBeenCalledWith('ord_1')

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate).toBeDefined()
    expect(refundUpdate!.payment.status).toBe('refunded')
    expect(refundUpdate!.payment.refundAmount).toBe(5000)
    expect(refundUpdate!.metadata.needsAdminReview).toBeUndefined()
  })

  it('marks the payment partially-refunded for partial refunds', async () => {
    mockOrdersFindFirst.mockResolvedValue(blendOrder)

    await POST(makeRequest(makeEvent('charge.refunded', { ...refundCharge, amount_refunded: 1000 })))

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate!.payment.status).toBe('partially-refunded')
  })

  it('skips credit restore when the order used no store credit', async () => {
    mockOrdersFindFirst.mockResolvedValue({ ...blendOrder, storeCreditUsed: 0 })

    await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(mockRestoreCustomerCredits).not.toHaveBeenCalled()
    expect(mockRevokeOrderUnlocks).toHaveBeenCalled()
    expect(mockRestoreOrderInventory).toHaveBeenCalled()
  })

  it('skips credit restore for guest orders but still runs other reversals', async () => {
    mockOrdersFindFirst.mockResolvedValue({ ...blendOrder, customerId: 'guest' })

    await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(mockRestoreCustomerCredits).not.toHaveBeenCalled()
    expect(mockRevokeOrderUnlocks).toHaveBeenCalledWith('ord_1')
    expect(mockRestoreOrderInventory).toHaveBeenCalledWith('ord_1')
  })

  it('isolates a commission reversal failure and flags the order for admin review', async () => {
    mockOrdersFindFirst.mockResolvedValue(blendOrder)
    mockReverseBlendCommission.mockRejectedValue(new Error('db down'))

    const res = await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(res.status).toBe(200)
    expect(mockRestoreCustomerCredits).toHaveBeenCalled()
    expect(mockRevokeOrderUnlocks).toHaveBeenCalled()
    expect(mockRestoreOrderInventory).toHaveBeenCalled()

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate!.metadata.needsAdminReview).toBe(true)
    expect(refundUpdate!.metadata.refundReversalFailures.length).toBeGreaterThan(0)
  })

  it('isolates an inventory restore failure and still marks the order refunded', async () => {
    mockOrdersFindFirst.mockResolvedValue(blendOrder)
    mockRestoreOrderInventory.mockRejectedValue(new Error('inventory locked'))

    const res = await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(res.status).toBe(200)
    expect(mockRevokeOrderUnlocks).toHaveBeenCalled()
    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate).toBeDefined()
    expect(refundUpdate!.metadata.needsAdminReview).toBe(true)
  })

  it('treats an already-reversed commission as benign (no admin flag)', async () => {
    mockOrdersFindFirst.mockResolvedValue(blendOrder)
    mockReverseBlendCommission.mockResolvedValue({ success: false, error: 'Commission already reversed' })

    await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    const refundUpdate = getSetCalls().find(s => s.status === 'refunded')
    expect(refundUpdate!.metadata.needsAdminReview).toBeUndefined()
  })

  it('is a no-op when the order is already refunded', async () => {
    mockOrdersFindFirst.mockResolvedValue({ ...blendOrder, status: 'refunded' })

    const res = await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(res.status).toBe(200)
    expect(mockReverseBlendCommission).not.toHaveBeenCalled()
    expect(mockRevokeOrderUnlocks).not.toHaveBeenCalled()
    expect(mockRestoreOrderInventory).not.toHaveBeenCalled()
  })

  it('acks without reversing when no order matches the payment intent', async () => {
    mockOrdersFindFirst.mockResolvedValue(undefined)

    const res = await POST(makeRequest(makeEvent('charge.refunded', refundCharge)))

    expect(res.status).toBe(200)
    expect(mockReverseBlendCommission).not.toHaveBeenCalled()
  })

  it('acks without reversing when the charge has no payment intent', async () => {
    const res = await POST(makeRequest(makeEvent('charge.refunded', { ...refundCharge, payment_intent: null })))

    expect(res.status).toBe(200)
    expect(mockOrdersFindFirst).not.toHaveBeenCalled()
  })
})

// ============================================================================
// checkout.session.expired / async_payment_failed (refill abandonment)
// ============================================================================

describe('refill checkout abandonment', () => {
  const refillSession = (creditUsed: string) => makeSession({
    orderId: 'ro_1',
    refillOrderId: 'ro_1',
    bottleId: 'bottle_1',
    customerId: 'cust_1',
    type: 'refill',
    creditUsed,
  })

  beforeEach(() => {
    mockRefillOrdersFindFirst.mockResolvedValue({ id: 'ro_1', status: 'pending-return', metadata: null })
  })

  it('restores credit, releases the bottle lock, and cancels the refill order on expiry', async () => {
    const res = await POST(makeRequest(makeEvent('checkout.session.expired', refillSession('500'))))

    expect(res.status).toBe(200)
    expect(mockRestoreRefillCredit).toHaveBeenCalledWith('cust_1', 500, expect.stringContaining('checkout.session.expired'))
    expect(mockReleaseBottleLock).toHaveBeenCalledWith('bottle_1', expect.stringContaining('checkout.session.expired'))
    expect(getSetCalls().some(s => s.status === 'cancelled')).toBe(true)
  })

  it('releases the bottle without restoring credit when no credit was debited', async () => {
    await POST(makeRequest(makeEvent('checkout.session.expired', refillSession('0'))))

    expect(mockRestoreRefillCredit).not.toHaveBeenCalled()
    expect(mockReleaseBottleLock).toHaveBeenCalledWith('bottle_1', expect.any(String))
  })

  it('ignores expired sessions that are not refill checkouts', async () => {
    await POST(makeRequest(makeEvent('checkout.session.expired', makeSession({ orderId: 'ord_1' }))))

    expect(mockRestoreRefillCredit).not.toHaveBeenCalled()
    expect(mockReleaseBottleLock).not.toHaveBeenCalled()
    expect(mockRefillOrdersFindFirst).not.toHaveBeenCalled()
  })

  it('reverses refill side effects on async_payment_failed', async () => {
    await POST(makeRequest(makeEvent('checkout.session.async_payment_failed', refillSession('500'))))

    expect(mockRestoreRefillCredit).toHaveBeenCalledWith('cust_1', 500, expect.stringContaining('async_payment_failed'))
    expect(mockReleaseBottleLock).toHaveBeenCalledWith('bottle_1', expect.any(String))
  })

  it('cancels a regular order on async_payment_failed', async () => {
    mockOrdersFindFirst.mockResolvedValue(baseOrder)

    await POST(makeRequest(makeEvent('checkout.session.async_payment_failed', makeSession({ orderId: 'ord_1' }))))

    expect(getSetCalls().some(s => s.status === 'cancelled')).toBe(true)
    expect(mockRestoreRefillCredit).not.toHaveBeenCalled()
  })

  it('continues cancelling the refill order even if credit restore fails', async () => {
    mockRestoreRefillCredit.mockRejectedValue(new Error('credits db down'))

    const res = await POST(makeRequest(makeEvent('checkout.session.expired', refillSession('500'))))

    expect(res.status).toBe(200)
    expect(mockReleaseBottleLock).toHaveBeenCalled()
    expect(getSetCalls().some(s => s.status === 'cancelled')).toBe(true)
  })
})
