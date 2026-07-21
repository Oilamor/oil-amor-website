/**
 * User Blends Subroute Hardening Tests
 * (app/api/user-blends/share, /view, /by-code, /stats)
 *
 * - share / view: anonymous analytics beacons (no session required by design)
 * - by-code: share-link access for anonymous viewers (capability URL)
 * - stats: ambassador stats passthrough
 *
 * The brand-ambassador data layer is mocked.
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
    const blend = { id: 'b1', shareCode: 'OIL-AAAA-BBBB', isPublic: true, name: 'Calm' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
    const res = await byCodeGET(makeGet('http://localhost/api/user-blends/by-code?code=OIL-AAAA-BBBB'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blend.id).toBe('b1')
  })

  it('PINNED GAP: also serves a private (isPublic=false) blend to anyone holding the code', async () => {
    // The route does not check isPublic — share codes act as bearer capability
    // URLs for private blends too. See hardening report.
    const blend = { id: 'b2', shareCode: 'OIL-PRIV-0001', isPublic: false, name: 'Secret Blend' }
    mockGetBlendByShareCode.mockResolvedValue(blend)
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

  it('returns stats for the requested user', async () => {
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalShares).toBe(3)
    expect(mockGetBrandAmbassadorStats).toHaveBeenCalledWith('cust-1')
  })

  it('returns 500 when stats lookup fails', async () => {
    mockGetBrandAmbassadorStats.mockRejectedValue(new Error('db down'))
    const res = await statsGET(makeGet('http://localhost/api/user-blends/stats?userId=cust-1'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to fetch stats')
  })
})
