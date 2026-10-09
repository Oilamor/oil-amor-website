/**
 * User Blends Subroute Hardening Tests
 * (app/api/user-blends/share, /view, /by-code, /stats)
 *
 * - share / view: anonymous analytics beacons (no session required by design)
 * - by-code: anonymous share-link access for PUBLIC blends only; private
 *   blends require the owner's session or admin auth (privacy fix 2026-07-21)
 * - stats: owner-or-admin only (2026-10-09 IDOR fix — was a public passthrough)
 *
 * The brand-ambassador data layer, customer session, and admin auth are mocked.
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

const mockRecordBlendShare = jest.fn()
const mockRecordBlendView = jest.fn()
const mockGetBlendByShareCode = jest.fn()
const mockGetBrandAmbassadorStats = jest.fn()

jest.mock('@/lib/brand-ambassador', () => ({
  recordBlendShare: (...args: unknown[]) => mockRecordBlendShare(...args),
  recordBlendView: (...args: unknown[]) => mockRecordBlendView(...args),
  getBlendByShareCode: (...args: unknown[]) => mockGetBlendByShareCode(...args),
  getBrandAmbassadorStats: (...args: unknown[]) => mockGetBrandAmbassadorStats(...args),
}))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession(),
}))

const mockRequireAdminAuth = jest.fn()
jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}))

import { POST as sharePOST } from '@/app/api/user-blends/share/route'
import { POST as viewPOST } from '@/app/api/user-blends/view/route'
import { GET as byCodeGET } from '@/app/api/user-blends/by-code/route'
import { GET as statsGET } from '@/app/api/user-blends/stats/route'

function makePost(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest
}

function makeGet(url: string): NextRequest {
  return { url } as unknown as NextRequest
}

beforeEach(() => {
  mockRecordBlendShare.mockResolvedValue(undefined)
  mockRecordBlendView.mockResolvedValue(undefined)
  mockGetBrandAmbassadorStats.mockResolvedValue({ totalShares: 3, totalViews: 10 })
  // Default: anonymous visitor (no customer session, not an admin)
  mockGetSession.mockResolvedValue({ isLoggedIn: false })
  mockRequireAdminAuth.mockResolvedValue({ status: 401 })
})

// ============================================================================
// POST /api/user-blends/share
// ============================================================================

describe('POST /api/user-blends/share', () => {
  it('returns 400 when blendId is missing', async () => {
    const res = await sharePOST(makePost({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Blend ID is required')
    expect(mockRecordBlendShare).not.toHaveBeenCalled()
  })

  it('records the share and succeeds anonymously (no session needed)', async () => {
    const res = await sharePOST(makePost({ blendId: 'blend-1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(mockRecordBlendShare).toHaveBeenCalledWith('blend-1')
  })

  it('returns 500 when recording fails', async () => {
    mockRecordBlendShare.mockRejectedValue(new Error('db down'))
    const res = await sharePOST(makePost({ blendId: 'blend-1' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to record share')
  })
})

// ============================================================================
// POST /api/user-blends/view
// ============================================================================

describe('POST /api/user-blends/view', () => {
  it('returns 400 when shareCode is missing', async () => {
    const res = await viewPOST(makePost({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Share code is required')
    expect(mockRecordBlendView).not.toHaveBeenCalled()
  })

  it('records the view and succeeds anonymously (no session needed)', async () => {
    const res = await viewPOST(makePost({ shareCode: 'OIL-AAAA-BBBB' }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(mockRecordBlendView).toHaveBeenCalledWith('OIL-AAAA-BBBB')
  })

  it('returns 500 when recording fails', async () => {
    mockRecordBlendView.mockRejectedValue(new Error('db down'))
    const res = await viewPOST(makePost({ shareCode: 'OIL-AAAA-BBBB' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to record view')
  })
})

// ============================================================================
// GET /api/user-blends/by-code — share-link access
// ============================================================================

describe('GET /api/user-blends/by-code', () => {
  it('returns 400 when the code param is missing', async () => {
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Share code is required')
    expect(mockGetBlendByShareCode).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown share code', async () => {
    mockGetBlendByShareCode.mockResolvedValue(null)
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-NOPE-0000'))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Blend not found')
  })

  it('serves a public blend to an anonymous viewer via its share code', async () => {
    const blend = { id: 'b1', shareCode: 'OIL-AAAA-BBBB', isPublic: true, name: 'Calm', userId: 'owner-1' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-AAAA-BBBB'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blend.id).toBe('b1')
    // Public blends never touch session/admin auth — share links are anonymous by design
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(mockRequireAdminAuth).not.toHaveBeenCalled()
  })

  it('PINNED (2026-07-21 privacy fix): refuses a private (isPublic=false) blend to an anonymous holder of the code', async () => {
    // Deliberate privacy fix dated 2026-07-21: share codes are no longer
    // bearer capability URLs for private blends. Anonymous access now
    // requires isPublic=true; anything else gets 403. This pin replaces the
    // old "PINNED GAP" test that documented the leak.
    const blend = { id: 'b2', shareCode: 'OIL-PRIV-0001', isPublic: false, name: 'Secret Blend', userId: 'owner-1' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-PRIV-0001'))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('This blend is private')
  })

  it('serves a private blend to its owner via their session', async () => {
    const blend = { id: 'b2', shareCode: 'OIL-PRIV-0001', isPublic: false, name: 'Secret Blend', userId: 'owner-1' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
    mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'owner-1' })
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-PRIV-0001'))
    expect(res.status).toBe(200)
    expect((await res.json()).blend.id).toBe('b2')
    // Owner short-circuits before the admin check
    expect(mockRequireAdminAuth).not.toHaveBeenCalled()
  })

  it('refuses a private blend to a logged-in non-owner', async () => {
    const blend = { id: 'b2', shareCode: 'OIL-PRIV-0001', isPublic: false, name: 'Secret Blend', userId: 'owner-1' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
    mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'someone-else' })
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-PRIV-0001'))
    expect(res.status).toBe(403)
  })

  it('serves a private blend to an admin', async () => {
    const blend = { id: 'b2', shareCode: 'OIL-PRIV-0001', isPublic: false, name: 'Secret Blend', userId: 'owner-1' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
    mockRequireAdminAuth.mockResolvedValue(null) // null = authorized
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-PRIV-0001'))
    expect(res.status).toBe(200)
    expect((await res.json()).blend.id).toBe('b2')
  })

  it('returns 500 when the lookup fails', async () => {
    mockGetBlendByShareCode.mockRejectedValue(new Error('db down'))
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-AAAA-BBBB'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to fetch blend')
  })
})

// ============================================================================
// GET /api/user-blends/stats
// ============================================================================

describe('GET /api/user-blends/stats', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('User ID is required')
    expect(mockGetBrandAmbassadorStats).not.toHaveBeenCalled()
  })

  it('PINNED (2026-10-09 IDOR fix): refuses stats to an anonymous requester', async () => {
    // Deliberate privacy fix: this endpoint previously served any user's
    // earnings/referral stats without any auth. Anonymous now gets 401.
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(401)
    expect(mockGetBrandAmbassadorStats).not.toHaveBeenCalled()
    expect(mockRequireAdminAuth).toHaveBeenCalled()
  })

  it('returns stats to the owner via their session', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'cust-1' })
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalShares).toBe(3)
    expect(mockGetBrandAmbassadorStats).toHaveBeenCalledWith('cust-1')
    // Owner short-circuits before the admin check
    expect(mockRequireAdminAuth).not.toHaveBeenCalled()
  })

  it('refuses stats to a logged-in non-owner', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'someone-else' })
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(403)
    expect(mockGetBrandAmbassadorStats).not.toHaveBeenCalled()
  })

  it('returns stats to an admin', async () => {
    mockRequireAdminAuth.mockResolvedValue(null) // null = authorized
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(200)
    expect(mockGetBrandAmbassadorStats).toHaveBeenCalledWith('cust-1')
  })

  it('returns 500 when stats lookup fails', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: true, customerId: 'cust-1' })
    mockGetBrandAmbassadorStats.mockRejectedValue(new Error('db down'))
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to fetch stats')
  })
})
