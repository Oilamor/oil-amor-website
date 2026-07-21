/**
 * API Endpoint Auth Hardening Tests
 *
 * Covers the auth fixes applied to previously unauthenticated endpoints:
 * - POST /api/community-blends (+ /purchase) — session required, purchaser and
 *   sale amount derived server-side from the order
 * - POST /api/orders — legacy handler removed (checkout goes through Stripe)
 * - GET/POST /api/user-blends — session required, owner identity from session
 * - POST /api/webhooks/auspost-tracking — mandatory signature when configured,
 *   server-time replay window
 * - GET /api/health?detailed=true — admin-only diagnostics
 *
 * DB, Redis, Stripe and the session layer are mocked — no real services.
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Minimal NextResponse implementation (routes only use NextResponse.json)
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

jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      orders: { findFirst: jest.fn() },
    },
  },
  // Plain functions (not jest.fn) so jest.resetModules + restoreMocks cannot
  // wipe them — the health route dynamically imports pool at request time
  pool: {
    connect: () => Promise.resolve({
      query: () => Promise.resolve({ rows: [] }),
      release: () => {},
    }),
  },
}))

jest.mock('@/lib/db/schema-refill', () => ({
  orders: { id: 'orders.id', customerId: 'orders.customerId' },
}))

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value })),
}))

jest.mock('@/lib/community-blends/actions', () => ({
  recordBlendPurchase: jest.fn(),
}))

jest.mock('@/lib/community-blends/data', () => ({
  getCommunityBlends: jest.fn(),
}))

jest.mock('@/lib/community-blends/commissions-types', () => ({
  CREATOR_COMMISSION_RATE: 10,
}))

jest.mock('@/lib/brand-ambassador', () => ({
  getUserBlends: jest.fn(),
  saveBlendToLibrary: jest.fn(),
  getBrandAmbassadorStats: jest.fn(),
}))

jest.mock('@/lib/shipping/auspost', () => ({
  handleTrackingWebhook: jest.fn(),
  verifyBottleReceived: jest.fn(),
}))

jest.mock('@/lib/refill/return-workflow', () => ({
  processBottleReturn: jest.fn(),
}))

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { getSession } from '@/lib/auth/session'
import { requireAdminAuth } from '@/lib/admin/auth'
import { db } from '@/lib/db'
import { recordBlendPurchase } from '@/lib/community-blends/actions'
import { getCommunityBlends } from '@/lib/community-blends/data'
import { getUserBlends, saveBlendToLibrary } from '@/lib/brand-ambassador'

import { GET as communityBlendsGET, POST as communityBlendsPOST } from '@/app/api/community-blends/route'
import { POST as blendPurchasePOST } from '@/app/api/community-blends/purchase/route'
import * as ordersRoute from '@/app/api/orders/route'
import { GET as userBlendsGET, POST as userBlendsPOST } from '@/app/api/user-blends/route'
import { GET as healthGET } from '@/app/api/health/route'

const mockGetSession = getSession as jest.Mock
const mockRequireAdminAuth = requireAdminAuth as jest.Mock
const mockOrderFindFirst = db.query.orders.findFirst as jest.Mock
const mockRecordBlendPurchase = recordBlendPurchase as jest.Mock
const mockGetCommunityBlends = getCommunityBlends as jest.Mock
const mockGetUserBlends = getUserBlends as jest.Mock
const mockSaveBlendToLibrary = saveBlendToLibrary as jest.Mock

// ============================================================================
// HELPERS
// ============================================================================

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): NextRequest {
  const headers = new Map(Object.entries(options.headers || {}))
  return {
    url,
    method: options.method || 'GET',
    headers: { get: (name: string) => headers.get(name) ?? null },
    json: async () => options.body,
    text: async () => (typeof options.body === 'string' ? options.body : JSON.stringify(options.body ?? '')),
  } as unknown as NextRequest
}

function setAuthenticated(customerId = 'cust-123') {
  mockGetSession.mockResolvedValue({
    isLoggedIn: true,
    customerId,
    email: 'customer@example.com',
  })
}

function setAnonymous() {
  mockGetSession.mockResolvedValue({ isLoggedIn: false })
}

/** A paid order belonging to cust-123 containing blend-1 (line total 5000 cents) */
function paidOrderWithBlend(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    customerId: 'cust-123',
    payment: { method: 'credit-card', status: 'captured' },
    items: [
      { id: 'line_1', name: 'Community Blend', blendId: 'blend-1', unitPrice: 5000, quantity: 1, subtotal: 5000, taxAmount: 500, total: 5000 },
    ],
    total: 6000,
    ...overrides,
  }
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
}

// ============================================================================
// POST /api/community-blends — record blend purchase
// ============================================================================

describe('POST /api/community-blends', () => {
  it('rejects unauthenticated requests with 401', async () => {
    setAnonymous()
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1', purchaserId: 'cust-123', saleAmount: 5000 },
    }))
    expect(res.status).toBe(401)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('rejects sessions without a customerId', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: true })
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(401)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('returns 400 when blendId or orderId is missing', async () => {
    setAuthenticated()
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1' },
    }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the order does not exist', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(undefined)
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(404)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('returns 403 when the order belongs to a different customer', async () => {
    setAuthenticated('cust-123')
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend({ customerId: 'someone-else' }))
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(403)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('rejects unpaid orders', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend({ payment: { method: 'credit-card', status: 'pending' } }))
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(400)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('rejects orders that do not contain the blend', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend())
    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-not-in-order', orderId: 'order-1' },
    }))
    expect(res.status).toBe(400)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('ignores body purchaserId/saleAmount and uses session + order-derived values', async () => {
    setAuthenticated('cust-123')
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend())
    mockRecordBlendPurchase.mockResolvedValue({ success: true, commissionAmount: 500 })

    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1', purchaserId: 'attacker-id', saleAmount: 99999999 },
    }))

    expect(res.status).toBe(200)
    expect(mockRecordBlendPurchase).toHaveBeenCalledWith('blend-1', 'order-1', 'cust-123', 5000)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.commissionAmount).toBe(500)
  })

  it('sums multiple line items for the same blend', async () => {
    setAuthenticated('cust-123')
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend({
      items: [
        { id: 'line_1', name: 'Blend', blendId: 'blend-1', unitPrice: 2000, quantity: 1, subtotal: 2000, taxAmount: 200, total: 2000 },
        { id: 'line_2', name: 'Blend x2', blendId: 'blend-1', unitPrice: 1500, quantity: 2, subtotal: 3000, taxAmount: 300, total: 3000 },
      ],
    }))
    mockRecordBlendPurchase.mockResolvedValue({ success: true, commissionAmount: 500 })

    await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))

    expect(mockRecordBlendPurchase).toHaveBeenCalledWith('blend-1', 'order-1', 'cust-123', 5000)
  })

  it('returns 500 when recording the purchase fails', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend())
    mockRecordBlendPurchase.mockResolvedValue({ success: false, error: 'db down' })

    const res = await communityBlendsPOST(makeRequest('http://localhost/api/community-blends', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/community-blends', () => {
  it('no longer serves earnings — ?earnings=true returns the blend list', async () => {
    mockGetCommunityBlends.mockResolvedValue([])
    const res = await communityBlendsGET(makeRequest('http://localhost/api/community-blends?earnings=true&creatorId=anyone'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('blends')
    expect(body).not.toHaveProperty('earnings')
    expect(body).not.toHaveProperty('history')
  })

  it('lists blends without requiring a session (public catalogue)', async () => {
    mockGetCommunityBlends.mockResolvedValue([{ id: 'blend-9', name: 'Real Blend' }])
    const res = await communityBlendsGET(makeRequest('http://localhost/api/community-blends?sort=newest'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blends).toHaveLength(1)
  })
})

// ============================================================================
// POST /api/community-blends/purchase
// ============================================================================

describe('POST /api/community-blends/purchase', () => {
  it('rejects unauthenticated requests with 401', async () => {
    setAnonymous()
    const res = await blendPurchasePOST(makeRequest('http://localhost/api/community-blends/purchase', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1', purchaserId: 'cust-123', saleAmount: 5000 },
    }))
    expect(res.status).toBe(401)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('returns 404 when the order does not exist', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(undefined)
    const res = await blendPurchasePOST(makeRequest('http://localhost/api/community-blends/purchase', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when the order belongs to a different customer', async () => {
    setAuthenticated('cust-123')
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend({ customerId: 'someone-else' }))
    const res = await blendPurchasePOST(makeRequest('http://localhost/api/community-blends/purchase', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(403)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('rejects unpaid orders', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend({ payment: { status: 'failed' } }))
    const res = await blendPurchasePOST(makeRequest('http://localhost/api/community-blends/purchase', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1' },
    }))
    expect(res.status).toBe(400)
    expect(mockRecordBlendPurchase).not.toHaveBeenCalled()
  })

  it('rejects orders that do not contain the blend', async () => {
    setAuthenticated()
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend())
    const res = await blendPurchasePOST(makeRequest('http://localhost/api/community-blends/purchase', {
      method: 'POST',
      body: { blendId: 'blend-x', orderId: 'order-1' },
    }))
    expect(res.status).toBe(400)
  })

  it('derives purchaser and sale amount server-side and returns the commission rate', async () => {
    setAuthenticated('cust-123')
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend())
    mockRecordBlendPurchase.mockResolvedValue({ success: true, commissionAmount: 500 })

    const res = await blendPurchasePOST(makeRequest('http://localhost/api/community-blends/purchase', {
      method: 'POST',
      body: { blendId: 'blend-1', orderId: 'order-1', purchaserId: 'attacker-id', saleAmount: 1 },
    }))

    expect(res.status).toBe(200)
    expect(mockRecordBlendPurchase).toHaveBeenCalledWith('blend-1', 'order-1', 'cust-123', 5000)
    const body = await res.json()
    expect(body.commissionRate).toBe(10)
  })
})

// ============================================================================
// /api/orders — legacy unauthenticated POST removed
// ============================================================================

describe('/api/orders', () => {
  it('no longer exports a POST handler', () => {
    expect((ordersRoute as Record<string, unknown>).POST).toBeUndefined()
  })

  it('GET returns 403 for a logged-in non-owner without admin rights', async () => {
    setAuthenticated('cust-123')
    mockOrderFindFirst.mockResolvedValue(paidOrderWithBlend({ customerId: 'someone-else' }))
    mockRequireAdminAuth.mockResolvedValue({ status: 401 }) // truthy = not admin

    const res = await ordersRoute.GET(makeRequest('http://localhost/api/orders?orderId=order-1'))
    expect(res.status).toBe(403)
  })

  it('GET returns the order to its owner', async () => {
    setAuthenticated('cust-123')
    const order = paidOrderWithBlend()
    mockOrderFindFirst.mockResolvedValue(order)

    const res = await ordersRoute.GET(makeRequest('http://localhost/api/orders?orderId=order-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.order.id).toBe('order-1')
  })

  it('GET without params requires admin auth', async () => {
    setAnonymous()
    mockRequireAdminAuth.mockResolvedValue({ status: 401, json: async () => ({ error: 'Unauthorized' }) })

    const res = await ordersRoute.GET(makeRequest('http://localhost/api/orders'))
    expect((res as unknown as { status: number }).status).toBe(401)
  })
})

// ============================================================================
// /api/user-blends
// ============================================================================

describe('GET /api/user-blends', () => {
  it('rejects unauthenticated requests with 401', async () => {
    setAnonymous()
    const res = await userBlendsGET(makeRequest('http://localhost/api/user-blends?userId=cust-123'))
    expect(res.status).toBe(401)
    expect(mockGetUserBlends).not.toHaveBeenCalled()
  })

  it('returns the full library for the owner', async () => {
    setAuthenticated('cust-123')
    mockGetUserBlends.mockResolvedValue([
      { id: 'b1', userId: 'cust-123', isPublic: false },
      { id: 'b2', userId: 'cust-123', isPublic: true },
    ])
    const res = await userBlendsGET(makeRequest('http://localhost/api/user-blends?userId=cust-123'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blends).toHaveLength(2)
  })

  it('returns only public blends when viewing another user', async () => {
    setAuthenticated('cust-123')
    mockGetUserBlends.mockResolvedValue([
      { id: 'b1', userId: 'other-user', isPublic: false },
      { id: 'b2', userId: 'other-user', isPublic: true },
    ])
    const res = await userBlendsGET(makeRequest('http://localhost/api/user-blends?userId=other-user'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blends).toHaveLength(1)
    expect(body.blends[0].id).toBe('b2')
  })

  it('defaults to the session user when userId is omitted', async () => {
    setAuthenticated('cust-123')
    mockGetUserBlends.mockResolvedValue([])
    await userBlendsGET(makeRequest('http://localhost/api/user-blends'))
    expect(mockGetUserBlends).toHaveBeenCalledWith('cust-123')
  })
})

describe('POST /api/user-blends', () => {
  it('rejects unauthenticated requests with 401', async () => {
    setAnonymous()
    const res = await userBlendsPOST(makeRequest('http://localhost/api/user-blends', {
      method: 'POST',
      body: { userId: 'cust-123', name: 'My Blend', recipe: { mode: 'pure' } },
    }))
    expect(res.status).toBe(401)
    expect(mockSaveBlendToLibrary).not.toHaveBeenCalled()
  })

  it('returns 400 when name or recipe is missing', async () => {
    setAuthenticated()
    const res = await userBlendsPOST(makeRequest('http://localhost/api/user-blends', {
      method: 'POST',
      body: { name: 'No recipe here' },
    }))
    expect(res.status).toBe(400)
  })

  it('ignores body userId and attributes the blend to the session user', async () => {
    setAuthenticated('cust-123')
    mockSaveBlendToLibrary.mockResolvedValue({ success: true, blendId: 'blend-new', shareCode: 'OIL-AAAA-BBBB' })

    const res = await userBlendsPOST(makeRequest('http://localhost/api/user-blends', {
      method: 'POST',
      body: { userId: 'attacker-id', name: 'My Blend', recipe: { mode: 'pure' } },
    }))

    expect(res.status).toBe(200)
    expect(mockSaveBlendToLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'cust-123', name: 'My Blend' })
    )
    const body = await res.json()
    expect(body.blendId).toBe('blend-new')
  })

  it('returns 500 when saving fails', async () => {
    setAuthenticated()
    mockSaveBlendToLibrary.mockResolvedValue({ success: false, error: 'db down' })
    const res = await userBlendsPOST(makeRequest('http://localhost/api/user-blends', {
      method: 'POST',
      body: { name: 'My Blend', recipe: { mode: 'pure' } },
    }))
    expect(res.status).toBe(500)
  })
})

// ============================================================================
// POST /api/webhooks/auspost-tracking
// ============================================================================

describe('POST /api/webhooks/auspost-tracking', () => {
  const SECRET = 'test-auspost-webhook-secret'
  const originalSecret = process.env.AUSPOST_WEBHOOK_SECRET

  async function loadRoute(secret?: string) {
    if (secret === undefined) {
      delete process.env.AUSPOST_WEBHOOK_SECRET
    } else {
      process.env.AUSPOST_WEBHOOK_SECRET = secret
    }
    jest.resetModules()
    return await import('@/app/api/webhooks/auspost-tracking/route')
  }

  function webhookRequest(payload: Record<string, unknown>, headers: Record<string, string>) {
    return makeRequest('http://localhost/api/webhooks/auspost-tracking', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers,
    })
  }

  const payload = { trackingNumber: 'AP123456', eventType: 'shipment.updated' }

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.AUSPOST_WEBHOOK_SECRET
    } else {
      process.env.AUSPOST_WEBHOOK_SECRET = originalSecret
    }
  })

  it('returns 401 when the signature header is missing and a secret is configured', async () => {
    const { POST } = await loadRoute(SECRET)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Timestamp': String(Date.now()),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 401 for an invalid signature', async () => {
    const { POST } = await loadRoute(SECRET)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': 'deadbeef'.repeat(8),
      'X-AusPost-Timestamp': String(Date.now()),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when the timestamp header is missing (valid signature)', async () => {
    const { POST } = await loadRoute(SECRET)
    const body = JSON.stringify(payload)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signPayload(body, SECRET),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 401 for a stale timestamp outside the server-time window', async () => {
    const { POST } = await loadRoute(SECRET)
    const body = JSON.stringify(payload)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signPayload(body, SECRET),
      'X-AusPost-Timestamp': String(Date.now() - 11 * 60 * 1000), // 11 min old
    }))
    expect(res.status).toBe(401)
  })

  it('returns 401 for a timestamp too far in the future', async () => {
    const { POST } = await loadRoute(SECRET)
    const body = JSON.stringify(payload)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signPayload(body, SECRET),
      'X-AusPost-Timestamp': String(Date.now() + 5 * 60 * 1000), // 5 min ahead
    }))
    expect(res.status).toBe(401)
  })

  it('accepts a valid signature with a fresh timestamp', async () => {
    const { POST } = await loadRoute(SECRET)
    const { handleTrackingWebhook } = await import('@/lib/shipping/auspost')
    ;(handleTrackingWebhook as jest.Mock).mockResolvedValue({ status: 'in-transit', actionRequired: null, bottleId: 'b1' })

    const body = JSON.stringify(payload)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signPayload(body, SECRET),
      'X-AusPost-Timestamp': String(Date.now()),
    }))
    expect(res.status).toBe(200)
    expect(handleTrackingWebhook).toHaveBeenCalled()
  })

  it('accepts small future clock skew (within 60s)', async () => {
    const { POST } = await loadRoute(SECRET)
    const { handleTrackingWebhook } = await import('@/lib/shipping/auspost')
    ;(handleTrackingWebhook as jest.Mock).mockResolvedValue({ status: 'in-transit', actionRequired: null, bottleId: 'b1' })

    const body = JSON.stringify(payload)
    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signPayload(body, SECRET),
      'X-AusPost-Timestamp': String(Date.now() + 30 * 1000), // 30s ahead
    }))
    expect(res.status).toBe(200)
  })

  it('accepts unix-second timestamps and ISO strings', async () => {
    const { POST } = await loadRoute(SECRET)
    const { handleTrackingWebhook } = await import('@/lib/shipping/auspost')
    ;(handleTrackingWebhook as jest.Mock).mockResolvedValue({ status: 'in-transit', actionRequired: null, bottleId: 'b1' })

    const body = JSON.stringify(payload)
    const signature = signPayload(body, SECRET)

    const unixRes = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signature,
      'X-AusPost-Timestamp': String(Math.floor(Date.now() / 1000)), // 10-digit seconds
    }))
    expect(unixRes.status).toBe(200)

    const isoRes = await POST(webhookRequest(payload, {
      'X-AusPost-Signature': signature,
      'X-AusPost-Timestamp': new Date().toISOString(),
    }))
    expect(isoRes.status).toBe(200)
  })

  it('passes the server-validated timestamp downstream, not the payload value', async () => {
    const { POST } = await loadRoute(SECRET)
    const { handleTrackingWebhook } = await import('@/lib/shipping/auspost')
    ;(handleTrackingWebhook as jest.Mock).mockResolvedValue({ status: 'in-transit', actionRequired: null, bottleId: 'b1' })

    const headerTimestamp = String(Date.now())
    const body = JSON.stringify({ ...payload, timestamp: '1999-01-01T00:00:00.000Z' })
    const res = await POST(makeRequest('http://localhost/api/webhooks/auspost-tracking', {
      method: 'POST',
      body,
      headers: {
        'X-AusPost-Signature': signPayload(body, SECRET),
        'X-AusPost-Timestamp': headerTimestamp,
      },
    }))

    expect(res.status).toBe(200)
    const call = (handleTrackingWebhook as jest.Mock).mock.calls[0][0]
    expect(call.timestamp).toBe(new Date(Number(headerTimestamp)).toISOString())
  })

  it('processes unsigned webhooks in dev mode (no secret) and logs a warning', async () => {
    const { POST } = await loadRoute(undefined)
    const { handleTrackingWebhook } = await import('@/lib/shipping/auspost')
    const { logger } = await import('@/lib/logging/logger')
    ;(handleTrackingWebhook as jest.Mock).mockResolvedValue({ status: 'in-transit', actionRequired: null, bottleId: 'b1' })

    const res = await POST(webhookRequest(payload, {
      'X-AusPost-Timestamp': String(Date.now()),
    }))
    expect(res.status).toBe(200)
    expect(logger.warn).toHaveBeenCalled()
  })
})

// ============================================================================
// GET /api/health?detailed=true
// ============================================================================

describe('GET /api/health', () => {
  const realFetch = global.fetch

  beforeAll(() => {
    // Plain function (not jest.fn) so clearMocks/restoreMocks cannot wipe it
    global.fetch = (() => Promise.resolve({ ok: true })) as unknown as typeof fetch
  })

  afterAll(() => {
    global.fetch = realFetch
  })

  it('returns basic status without diagnostics by default', async () => {
    const res = await healthGET(makeRequest('http://localhost/api/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('healthy')
    expect(body.checks).toBeUndefined()
    expect(body.memory).toBeUndefined()
    expect(body.uptime).toBeUndefined()
  })

  it('returns basic status when detailed=true is requested without admin auth', async () => {
    mockRequireAdminAuth.mockResolvedValue({ status: 401 }) // truthy = not admin
    const res = await healthGET(makeRequest('http://localhost/api/health?detailed=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checks).toBeUndefined()
    expect(body.memory).toBeUndefined()
    expect(body.uptime).toBeUndefined()
  })

  it('returns full diagnostics when detailed=true and the caller is an admin', async () => {
    mockRequireAdminAuth.mockResolvedValue(null) // null = authorized
    const res = await healthGET(makeRequest('http://localhost/api/health?detailed=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.checks)).toBe(true)
    expect(body.checks.length).toBeGreaterThan(0)
    expect(body.memory).toBeDefined()
    expect(typeof body.uptime).toBe('number')
  })
})
