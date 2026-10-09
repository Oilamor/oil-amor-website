/**
 * Order Label API — batch record persistence + label/QR expiry consistency
 *
 * Regression: POST /api/admin/labels/order never saved a batch record, so
 * oilamor.com/batch/<batchId> 404'd for every label printed from the
 * dashboard. It must now save the record (like /api/admin/labels/generate)
 * and the label's printed expiry must be computed from the blend's per-oil
 * shelf lives — the same value stored in the batch record.
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
      json: async () => body,
    })),
  },
}))

jest.mock('@/lib/admin/auth', () => ({
  requireAdminAuth: jest.fn(async () => null),
}))

jest.mock('@/lib/db', () => ({
  db: {
    query: {
      orders: { findFirst: jest.fn() },
      refillOrders: { findFirst: jest.fn() },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoUpdate: jest.fn(async () => {}),
      })),
    })),
  },
}))

jest.mock('@/lib/db/schema-refill', () => ({
  orders: {},
  refillOrders: {},
  batchRecords: { id: 'id' },
}))

jest.mock('@/lib/label/pdf-generator', () => ({
  generateLabelPdf: jest.fn(async () => ({ pdf: null })),
}))

import { POST } from '@/app/api/admin/labels/order/route'
import { getBatchRecord } from '@/lib/batch/records'
import { db } from '@/lib/db'

const findOrder = db.query.orders.findFirst as jest.Mock

function makeRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

const orderRow = {
  id: 'order-1',
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  shippingAddress: {},
  status: 'paid',
  createdAt: new Date('2026-06-01T00:00:00Z'),
  metadata: {},
  items: [
    {
      id: 'item-1',
      name: 'Citrus Dream',
      type: 'custom-mix',
      unitPrice: 4995,
      subtotal: 4995,
      taxAmount: 0,
      total: 4995,
      customMix: {
        recipeName: 'Citrus Dream',
        mode: 'pure',
        totalVolume: 30,
        oils: [
          { oilId: 'lemon', oilName: 'Lemon', ml: 15, percentage: 50 },
          { oilId: 'cedarwood', oilName: 'Cedarwood', ml: 15, percentage: 50 },
        ],
        safetyScore: 90,
        safetyRating: 'good',
        safetyWarnings: [],
      },
    },
  ],
}

describe('POST /api/admin/labels/order', () => {
  it('saves a batch record so the QR page resolves', async () => {
    findOrder.mockResolvedValue(orderRow)

    const res: any = await POST(makeRequest({
      orderId: 'order-1',
      batchId: 'OA-ORDER-TEST-1',
      format: 'html',
    }) as any)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const record = await getBatchRecord('OA-ORDER-TEST-1')
    expect(record).not.toBeNull()
    expect(record!.blendName).toBe('Citrus Dream')
    expect(record!.oils).toHaveLength(2)
    expect(record!.orderId).toBe('order-1')
    expect(record!.customerName).toBe('Test Customer')
  })

  it('uses the same shelf-life-derived expiry on the label and in the batch record', async () => {
    findOrder.mockResolvedValue(orderRow)

    const res: any = await POST(makeRequest({
      orderId: 'order-1',
      batchId: 'OA-ORDER-TEST-2',
      format: 'html',
    }) as any)

    expect(res.status).toBe(200)

    const record = await getBatchRecord('OA-ORDER-TEST-2')
    expect(record).not.toBeNull()

    // Lemon (12 months) is the shortest-lived oil in the blend
    const made = new Date()
    const expiry = new Date(record!.expiresAt)
    const monthDiff =
      (expiry.getFullYear() - made.getFullYear()) * 12 + (expiry.getMonth() - made.getMonth())
    expect(monthDiff).toBe(12)

    // The label HTML prints the same date as the record stores
    expect(res.body.html).toContain(expiry.toLocaleDateString('en-AU'))
  })

  it('returns the label on one A4 sheet at true MIRON wrap dimensions', async () => {
    findOrder.mockResolvedValue(orderRow)

    const res: any = await POST(makeRequest({
      orderId: 'order-1',
      batchId: 'OA-ORDER-TEST-3',
      format: 'html',
    }) as any)

    expect(res.body.html).toContain('Made in Australia by')
    expect(res.body.html).toContain('External use only')
    // 30ml MIRON Orion: Ø34.0mm → C 106.8mm − 8mm overlap = 99mm wide,
    // 30mm tall (two-column back fits the full legal block at this height)
    expect(res.body.printDimensions).toEqual({ width: '99mm', height: '30mm' })
    expect(res.body.sizeConfig.bottleSize).toBe(30)
    // single-page A4 sheet: one label element, A4 page rule, crop marks
    expect(res.body.html).toContain('size:A4 portrait')
    expect((res.body.html.match(/class="label"/g) || []).length).toBe(1)
    expect(res.body.html).toContain('class="cm tl"')
    expect(res.body.html).toContain('Print at 100% scale')
  })

  it('404s when the order does not exist', async () => {
    findOrder.mockResolvedValue(undefined)
    ;(db.query.refillOrders.findFirst as jest.Mock).mockResolvedValue(undefined)

    const res: any = await POST(makeRequest({ orderId: 'missing' }) as any)
    expect(res.status).toBe(404)
  })
})
