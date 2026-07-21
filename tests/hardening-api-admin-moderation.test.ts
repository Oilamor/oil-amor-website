/**
 * Admin Community Blend Moderation API Hardening Tests
 * (app/api/admin/community-blends/moderation)
 *
 * Covers the 2026-07-21 moderation queue endpoint:
 * - GET lists flagged blends (admin only)
 * - POST approve/hide sets moderation_status, zod-validates the body,
 *   404s unknown blends, and writes an audit_logs row
 *
 * next/server, admin auth, and the DB are mocked.
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

const mockRequireAdminAuth = jest.fn()
jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: (...args: unknown[]) => mockRequireAdminAuth(...args),
}))

// DB mock — select chain (GET), relational findFirst + update/insert (POST)
const mockSelectLimit = jest.fn()
const mockSelectOrderBy = jest.fn(() => ({ limit: mockSelectLimit }))
const mockSelectWhere = jest.fn(() => ({ orderBy: mockSelectOrderBy }))
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }))
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }))

const mockUpdateReturning = jest.fn()
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }))
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }))
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }))

const mockInsertValues = jest.fn().mockResolvedValue(undefined)
const mockInsert = jest.fn(() => ({ values: mockInsertValues }))

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
  query: {
    communityBlends: { findFirst: jest.fn() },
  },
}
jest.mock('@/lib/db', () => ({ db: mockDb }))

import { GET, POST } from '@/app/api/admin/community-blends/moderation/route'

const UNAUTHORIZED = { status: 401, body: { error: 'Unauthorized' } }
const BLEND_ID = '123e4567-e89b-12d3-a456-426614174000'

function makeRequest(body?: unknown): NextRequest {
  return {
    url: 'http://localhost/api/admin/community-blends/moderation',
    json: async () => body,
  } as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireAdminAuth.mockResolvedValue(null) // authorized by default
  mockSelectLimit.mockResolvedValue([])
  mockDb.query.communityBlends.findFirst.mockResolvedValue({
    id: BLEND_ID,
    slug: 'calm-nights',
    moderationStatus: 'flagged',
  })
  mockUpdateReturning.mockResolvedValue([{ id: BLEND_ID, slug: 'calm-nights', moderationStatus: 'approved' }])
})

// ============================================================================
// GET — list flagged blends
// ============================================================================

describe('GET /api/admin/community-blends/moderation', () => {
  it('returns 401 for non-admin callers', async () => {
    mockRequireAdminAuth.mockResolvedValue(UNAUTHORIZED)

    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('lists flagged blends for an admin', async () => {
    const flagged = [{ id: BLEND_ID, name: 'Shady Blend', moderationStatus: 'flagged' }]
    mockSelectLimit.mockResolvedValue(flagged)

    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blends).toEqual(flagged)
    expect(body.count).toBe(1)
  })

  it('returns an empty list when nothing is flagged', async () => {
    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.blends).toEqual([])
    expect(body.count).toBe(0)
  })

  it('returns 500 when the query fails', async () => {
    mockSelectLimit.mockRejectedValue(new Error('db down'))

    const res = await GET(makeRequest())

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to list flagged blends')
  })
})

// ============================================================================
// POST — approve / hide
// ============================================================================

describe('POST /api/admin/community-blends/moderation', () => {
  it('returns 401 for non-admin callers', async () => {
    mockRequireAdminAuth.mockResolvedValue(UNAUTHORIZED)

    const res = await POST(makeRequest({ blendId: BLEND_ID, action: 'approve' }))

    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects an invalid action with 400', async () => {
    const res = await POST(makeRequest({ blendId: BLEND_ID, action: 'delete' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid request')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects a non-uuid blendId with 400', async () => {
    const res = await POST(makeRequest({ blendId: 'not-a-uuid', action: 'approve' }))

    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects a missing body field with 400', async () => {
    const res = await POST(makeRequest({ action: 'approve' }))

    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 when the blend does not exist', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null)

    const res = await POST(makeRequest({ blendId: BLEND_ID, action: 'approve' }))

    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Blend not found')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('approve sets moderation_status approved and writes an audit row', async () => {
    const res = await POST(makeRequest({ blendId: BLEND_ID, action: 'approve' }))

    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)

    // Blend update
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ moderationStatus: 'approved' })
    )

    // Audit log row
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'community_blend_approve',
        entityType: 'community_blend',
        entityId: BLEND_ID,
        before: { moderationStatus: 'flagged' },
        after: { moderationStatus: 'approved' },
      })
    )
  })

  it('hide sets moderation_status hidden and writes an audit row', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: BLEND_ID, slug: 'calm-nights', moderationStatus: 'hidden' }])

    const res = await POST(makeRequest({ blendId: BLEND_ID, action: 'hide' }))

    expect(res.status).toBe(200)

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ moderationStatus: 'hidden' })
    )
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'community_blend_hide',
        after: { moderationStatus: 'hidden' },
      })
    )
  })

  it('returns 500 when the update fails', async () => {
    mockUpdateReturning.mockRejectedValue(new Error('db down'))

    const res = await POST(makeRequest({ blendId: BLEND_ID, action: 'approve' }))

    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to moderate blend')
  })
})
