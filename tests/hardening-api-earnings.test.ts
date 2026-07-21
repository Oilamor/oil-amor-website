/**
 * Community Blend Earnings API Hardening Tests
 * (app/api/community-blends/earnings/route.ts)
 *
 * - unauthenticated → 401
 * - non-owner → 403 (IDOR protection)
 * - owner → 200 with own earnings + formatted amounts
 * - admin session override → 200 for any creatorId
 *
 * Sessions, env and the commissions service are mocked.
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

const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockGetAdminSession = jest.fn()
jest.mock('@/lib/auth/admin-session', () => ({
  getAdminSession: (...args: unknown[]) => mockGetAdminSession(...args),
}))

jest.mock('@/env', () => ({ env: { NODE_ENV: 'test' } }))

const mockGetCreatorEarnings = jest.fn()
const mockGetCreatorCommissionHistory = jest.fn()
jest.mock('@/lib/community-blends/commissions', () => ({
  getCreatorEarnings: (...args: unknown[]) => mockGetCreatorEarnings(...args),
  getCreatorCommissionHistory: (...args: unknown[]) => mockGetCreatorCommissionHistory(...args),
}))

import { GET } from '@/app/api/community-blends/earnings/route'

function makeReq(url: string): NextRequest {
  return { url } as unknown as NextRequest
}

function setCustomer(customerId?: string) {
  mockGetSession.mockResolvedValue(customerId
    ? { isLoggedIn: true, customerId }
    : { isLoggedIn: false })
}

function setAdmin(isAdmin: boolean) {
  mockGetAdminSession.mockResolvedValue({ isAdmin })
}

beforeEach(() => {
  setCustomer(undefined)
  setAdmin(false)
  mockGetCreatorEarnings.mockResolvedValue({
    totalEarned: 12345,
    pendingAmount: 5000,
    totalSales: 7,
    blendCount: 2,
  })
  mockGetCreatorCommissionHistory.mockResolvedValue([
    { id: 'comm-1', orderId: 'order-1', saleAmount: 10000, commissionAmount: 1000, status: 'paid' },
  ])
})

// ============================================================================
// Parameter validation
// ============================================================================

describe('parameter validation', () => {
  it('returns 400 when creatorId is missing', async () => {
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Missing required parameter: creatorId')
    expect(mockGetCreatorEarnings).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Authentication / authorization
// ============================================================================

describe('authentication and authorization', () => {
  it('returns 401 for an anonymous caller', async () => {
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
    expect(mockGetCreatorEarnings).not.toHaveBeenCalled()
  })

  it('returns 401 when the session is logged in but has no customerId', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: true })
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when a customer requests another creator\'s earnings', async () => {
    setCustomer('cust-123')
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=someone-else'))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('Forbidden: You can only view your own earnings')
    expect(mockGetCreatorEarnings).not.toHaveBeenCalled()
  })

  it('allows the owner to read their own earnings', async () => {
    setCustomer('creator-1')
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(res.status).toBe(200)
    expect(mockGetCreatorEarnings).toHaveBeenCalledWith('creator-1')
  })

  it('allows an admin session without any customer login', async () => {
    setAdmin(true)
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(res.status).toBe(200)
    expect(mockGetCreatorEarnings).toHaveBeenCalledWith('creator-1')
  })

  it('allows an admin to read another creator\'s earnings even while logged in as a customer', async () => {
    setCustomer('cust-123')
    setAdmin(true)
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(res.status).toBe(200)
  })
})

// ============================================================================
// Response shape
// ============================================================================

describe('response shape', () => {
  it('returns raw and formatted earnings for the owner', async () => {
    setCustomer('creator-1')
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    const body = await res.json()
    expect(body.creatorId).toBe('creator-1')
    expect(body.earnings.totalEarned).toBe(12345)
    expect(body.earnings.pendingAmount).toBe(5000)
    expect(body.earnings.totalSales).toBe(7)
    expect(body.earnings.blendCount).toBe(2)
    expect(body.earnings.formatted.totalEarned).toBe('$123.45')
    expect(body.earnings.formatted.pendingAmount).toBe('$50.00')
  })

  it('formats each history entry in dollars', async () => {
    setCustomer('creator-1')
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    const body = await res.json()
    expect(body.history).toHaveLength(1)
    expect(body.history[0].formatted.saleAmount).toBe('$100.00')
    expect(body.history[0].formatted.commissionAmount).toBe('$10.00')
    expect(body.history[0].commissionAmount).toBe(1000)
  })

  it('formats zero earnings as $0.00', async () => {
    setCustomer('creator-1')
    mockGetCreatorEarnings.mockResolvedValue({ totalEarned: 0, pendingAmount: 0, totalSales: 0, blendCount: 0 })
    mockGetCreatorCommissionHistory.mockResolvedValue([])
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    const body = await res.json()
    expect(body.earnings.formatted.totalEarned).toBe('$0.00')
    expect(body.history).toEqual([])
  })

  it('defaults the history limit to 20', async () => {
    setCustomer('creator-1')
    await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(mockGetCreatorCommissionHistory).toHaveBeenCalledWith('creator-1', { limit: 20 })
  })

  it('passes a custom limit through to the history query', async () => {
    setCustomer('creator-1')
    await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1&limit=5'))
    expect(mockGetCreatorCommissionHistory).toHaveBeenCalledWith('creator-1', { limit: 5 })
  })

  it('returns 500 when the earnings service fails', async () => {
    setCustomer('creator-1')
    mockGetCreatorEarnings.mockRejectedValue(new Error('db down'))
    const res = await GET(makeReq('http://localhost/api/community-blends/earnings?creatorId=creator-1'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to fetch earnings')
  })
})
