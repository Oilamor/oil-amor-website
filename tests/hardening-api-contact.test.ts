/**
 * Contact Form API Hardening Tests (app/api/contact/route.ts)
 *
 * Covers:
 * - zod validation boundaries (name/email/subject/message)
 * - second-layer isValidEmail check
 * - HTML escaping of user content in the outgoing email (XSS prevention)
 * - Resend success/failure paths
 * - rate limiting (auth-tier, 5/min)
 *
 * next/server and the rate limiter are mocked; fetch (Resend) is stubbed.
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

const mockCheckApiRateLimit = jest.fn()
const mockCreateRateLimitHeaders = jest.fn()
jest.mock('@/lib/redis/rate-limiter', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
  createRateLimitHeaders: (...args: unknown[]) => mockCreateRateLimitHeaders(...args),
}))

import { POST } from '@/app/api/contact/route'

const realFetch = global.fetch
const mockFetch = jest.fn()

const VALID_BODY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'general',
  message: 'Hello, I have a question about your oils.',
}

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: { get: (name: string) => map.get(name.toLowerCase()) ?? null },
    json: async () => body,
  } as unknown as NextRequest
}

function resendCallBody(): Record<string, unknown> {
  expect(mockFetch).toHaveBeenCalled()
  const [url, init] = mockFetch.mock.calls[0] as [string, { body: string }]
  expect(url).toBe('https://api.resend.com/emails')
  return JSON.parse(init.body)
}

beforeEach(() => {
  mockCheckApiRateLimit.mockResolvedValue({
    allowed: true,
    limit: 5,
    remaining: 4,
    resetTime: Date.now() + 60000,
  })
  mockCreateRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Limit': '5' })
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'email-1' }) })
  global.fetch = mockFetch as unknown as typeof fetch
  process.env.RESEND_API_KEY = 'test-resend-key'
})

afterAll(() => {
  global.fetch = realFetch
})

// ============================================================================
// Rate limiting
// ============================================================================

describe('rate limiting', () => {
  it('returns 429 when the rate limiter denies the request', async () => {
    mockCheckApiRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 42,
    })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Rate limit exceeded')
    expect(body.retryAfter).toBe(42)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('applies the stricter auth-tier limit keyed by the first forwarded IP', async () => {
    await POST(makeRequest(VALID_BODY, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))
    expect(mockCheckApiRateLimit).toHaveBeenCalledWith('1.2.3.4', 'auth')
  })

  it('falls back to x-real-ip and then "unknown" for the limiter key', async () => {
    await POST(makeRequest(VALID_BODY, { 'x-real-ip': '8.8.8.8' }))
    expect(mockCheckApiRateLimit).toHaveBeenCalledWith('8.8.8.8', 'auth')

    mockCheckApiRateLimit.mockClear()
    await POST(makeRequest(VALID_BODY))
    expect(mockCheckApiRateLimit).toHaveBeenCalledWith('unknown', 'auth')
  })
})

// ============================================================================
// Validation
// ============================================================================

describe('validation', () => {
  it('accepts a valid submission and returns success', async () => {
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.message).toBe('Message sent successfully')
  })

  it.each([
    ['name', { ...VALID_BODY, name: undefined }],
    ['email', { ...VALID_BODY, email: undefined }],
    ['subject', { ...VALID_BODY, subject: undefined }],
    ['message', { ...VALID_BODY, message: undefined }],
  ])('returns 400 when %s is missing', async (_field, body) => {
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid form data')
    expect(Array.isArray(json.details)).toBe(true)
    expect(json.details.length).toBeGreaterThan(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns zod issue objects with path and message in details', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, name: 'x' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.details[0]).toHaveProperty('path')
    expect(json.details[0]).toHaveProperty('message')
  })

  it('rejects a 1-character name but accepts 2 characters (boundary)', async () => {
    expect((await POST(makeRequest({ ...VALID_BODY, name: 'J' }))).status).toBe(400)
    expect((await POST(makeRequest({ ...VALID_BODY, name: 'Jo' }))).status).toBe(200)
  })

  it('accepts a 100-character name but rejects 101 (boundary)', async () => {
    expect((await POST(makeRequest({ ...VALID_BODY, name: 'n'.repeat(100) }))).status).toBe(200)
    expect((await POST(makeRequest({ ...VALID_BODY, name: 'n'.repeat(101) }))).status).toBe(400)
  })

  it('rejects a malformed email', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('rejects an email over 254 chars via the second-layer isValidEmail check', async () => {
    // Passes zod's .email() (no length cap) but fails isValidEmail's 254-char limit
    const longEmail = `${'a'.repeat(245)}@example.com`
    const res = await POST(makeRequest({ ...VALID_BODY, email: longEmail }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid email address')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a subject outside the allowed enum', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, subject: 'spam' }))
    expect(res.status).toBe(400)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it.each(['general', 'order', 'product', 'wholesale', 'press', 'other'])(
    'accepts the subject "%s"',
    async (subject) => {
      const res = await POST(makeRequest({ ...VALID_BODY, subject }))
      expect(res.status).toBe(200)
    }
  )

  it('rejects a 9-character message but accepts 10 (boundary)', async () => {
    expect((await POST(makeRequest({ ...VALID_BODY, message: '123456789' }))).status).toBe(400)
    expect((await POST(makeRequest({ ...VALID_BODY, message: '1234567890' }))).status).toBe(200)
  })

  it('accepts a 2000-character message but rejects 2001 (boundary)', async () => {
    expect((await POST(makeRequest({ ...VALID_BODY, message: 'm'.repeat(2000) }))).status).toBe(200)
    expect((await POST(makeRequest({ ...VALID_BODY, message: 'm'.repeat(2001) }))).status).toBe(400)
  })

  it('returns 400 for a non-object body', async () => {
    const res = await POST(makeRequest('just a string'))
    expect(res.status).toBe(400)
  })

  it('strips unknown fields instead of rejecting (zod default)', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, website: 'http://spam.example', admin: true }))
    expect(res.status).toBe(200)
    const sent = resendCallBody() as { html: string }
    expect(sent.html).not.toContain('spam.example')
  })
})

// ============================================================================
// HTML escaping (XSS prevention in outgoing email)
// ============================================================================

describe('HTML escaping of user content', () => {
  it('escapes HTML metacharacters in the name and message', async () => {
    await POST(makeRequest({
      ...VALID_BODY,
      name: '<img src=x onerror=alert(1)>',
      message: 'A & B <tag> "quoted" and it\'s fine',
    }))
    const sent = resendCallBody() as { html: string; subject: string }
    expect(sent.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(sent.html).toContain('A &amp; B &lt;tag&gt; &quot;quoted&quot; and it&#039;s fine')
    expect(sent.html).not.toContain('<img')
    expect(sent.html).not.toContain('<tag>')
  })

  it('escapes the name inside the email subject line', async () => {
    await POST(makeRequest({ ...VALID_BODY, name: '<script>alert(1)</script>' }))
    const sent = resendCallBody() as { subject: string }
    expect(sent.subject).toContain('&lt;script&gt;')
    expect(sent.subject).not.toContain('<script>')
  })

  it('converts message newlines to <br> only after escaping', async () => {
    await POST(makeRequest({ ...VALID_BODY, message: 'line one\nline two <b>' }))
    const sent = resendCallBody() as { html: string }
    expect(sent.html).toContain('line one<br>line two &lt;b&gt;')
  })

  it('includes the subject tag in the email subject line', async () => {
    await POST(makeRequest({ ...VALID_BODY, subject: 'wholesale' }))
    const sent = resendCallBody() as { subject: string }
    expect(sent.subject).toMatch(/^\[WHOLESALE\] Message from /)
  })
})

// ============================================================================
// Resend integration
// ============================================================================

describe('Resend email delivery', () => {
  it('posts to the Resend API with bearer auth and reply_to set to the sender', async () => {
    await POST(makeRequest(VALID_BODY))
    const [url, init] = mockFetch.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-resend-key')
    const payload = JSON.parse(init.body)
    expect(payload.reply_to).toBe('jane@example.com')
    expect(payload.to).toBe('official.oilamor@gmail.com')
  })

  it('returns 500 with a safe error shape when Resend rejects the send', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'invalid api key' }) })
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to send message')
    expect(body.message).toContain('hello@oilamor.com')
    // Provider error detail must not leak to the client
    expect(JSON.stringify(body)).not.toContain('invalid api key')
  })

  it('returns 500 when the Resend request throws (network failure)', async () => {
    mockFetch.mockRejectedValue(new Error('socket hangup'))
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to send message')
  })

  it('succeeds without sending email when RESEND_API_KEY is not configured', async () => {
    delete process.env.RESEND_API_KEY
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
