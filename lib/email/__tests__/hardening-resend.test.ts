/**
 * Hardening: Resend send functions (lib/email/resend.ts)
 *
 * The Resend SDK is fully mocked — no network. Pins:
 *  - dev-mode behavior without RESEND_API_KEY
 *  - from/to/subject construction (incl. the FROM_EMAIL fallback chain)
 *  - API errors are logged and surfaced as rejections (never unhandled)
 *  - text fallbacks never contain "undefined"
 */

const mockSend = jest.fn()

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({ emails: { send: mockSend } })),
}))

type ResendModule = typeof import('../resend')
type LoggerModule = typeof import('@/lib/logging/logger')

const ENV_VARS = [
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'EMAIL_FROM_DOMAIN',
  'ADMIN_EMAIL',
  'NEXT_PUBLIC_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
] as const

let savedEnv: Record<string, string | undefined>

function loadResend(): { resend: ResendModule; logger: LoggerModule['logger'] } {
  jest.resetModules()
  const { logger } = require('@/lib/logging/logger') as LoggerModule
  const resend = require('../resend') as ResendModule
  return { resend, logger }
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_VARS.map((v) => [v, process.env[v]]))
  for (const v of ENV_VARS) delete process.env[v]
  mockSend.mockResolvedValue({ data: { id: 'email-123' }, error: null })
})

afterEach(() => {
  for (const v of ENV_VARS) {
    if (savedEnv[v] === undefined) delete process.env[v]
    else process.env[v] = savedEnv[v]
  }
})

describe('dev mode (no RESEND_API_KEY)', () => {
  it('logs instead of sending and reports the dev id', async () => {
    const { resend } = loadResend()
    const result = await resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })
    expect(result).toEqual({ success: true, id: 'dev-mode-logged', logged: true })
    expect(mockSend).not.toHaveBeenCalled()
  })
})

describe('successful sends', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('sends via the Resend API with the default sender and returns the email id', async () => {
    const { resend } = loadResend()
    const result = await resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })
    expect(result).toEqual({ success: true, id: 'email-123' })
    expect(mockSend).toHaveBeenCalledTimes(1)
    const payload = mockSend.mock.calls[0][0]
    expect(payload.from).toBe('Oil Amor <noreply@oilamor.com>')
    expect(payload.to).toBe('sam@example.com')
    expect(payload.subject).toBe('Welcome to Oil Amor, Sam!')
    expect(payload.html).toContain('Dear Sam,')
    expect(payload.text).toContain('Welcome to Oil Amor, Sam!')
  })

  it('uses EMAIL_FROM_DOMAIN for the sender when set', async () => {
    process.env.EMAIL_FROM_DOMAIN = 'mail.oilamor.com'
    const { resend } = loadResend()
    await resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })
    expect(mockSend.mock.calls[0][0].from).toBe('Oil Amor <noreply@mail.oilamor.com>')
  })

  it('uses FROM_EMAIL verbatim when set (regression: must not produce noreply@undefined)', async () => {
    process.env.FROM_EMAIL = 'orders@oilamor.com'
    const { resend } = loadResend()
    await resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })
    const from = mockSend.mock.calls[0][0].from
    expect(from).toBe('Oil Amor <orders@oilamor.com>')
    expect(from).not.toContain('undefined')
  })

  it('prefers FROM_EMAIL over EMAIL_FROM_DOMAIN', async () => {
    process.env.FROM_EMAIL = 'orders@oilamor.com'
    process.env.EMAIL_FROM_DOMAIN = 'mail.oilamor.com'
    const { resend } = loadResend()
    await resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })
    expect(mockSend.mock.calls[0][0].from).toBe('Oil Amor <orders@oilamor.com>')
  })
})

describe('error handling', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('logs and rejects when the Resend API returns an error object', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key', name: 'validation_error' } })
    const { resend, logger } = loadResend()
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })).rejects.toThrow('Invalid API key')
    expect(errorSpy).toHaveBeenCalledWith('Resend API error', expect.any(Error))
    expect(errorSpy).toHaveBeenCalledWith('Failed to send email', expect.any(Error))
  })

  it('logs and rejects when the Resend client throws (network failure)', async () => {
    mockSend.mockRejectedValue(new Error('socket hangup'))
    const { resend, logger } = loadResend()
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })).rejects.toThrow('socket hangup')
    expect(errorSpy).toHaveBeenCalledWith('Failed to send email', expect.any(Error))
  })

  it('wraps non-Error rejections in an Error for logging', async () => {
    mockSend.mockRejectedValue('string failure')
    const { resend, logger } = loadResend()
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
    await expect(resend.sendWelcomeEmail({ to: 'sam@example.com', firstName: 'Sam' })).rejects.toBe('string failure')
    expect(errorSpy).toHaveBeenCalledWith('Failed to send email', expect.any(Error))
  })
})

describe('recipient and subject construction', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key'
  })

  const ADDRESS = {
    name: 'Sam Rivera',
    line1: '12 Crystal Lane',
    city: 'Byron Bay',
    state: 'NSW',
    postalCode: '2481',
    country: 'Australia',
  }

  it('sendOrderConfirmationEmail: subject, items and totals in text fallback', async () => {
    const { resend } = loadResend()
    await resend.sendOrderConfirmationEmail({
      to: 'sam@example.com',
      firstName: 'Sam',
      orderNumber: 'OA-500',
      orderDate: '21 July 2026',
      items: [{ name: 'Lavender', variant: '10ml', quantity: 2, price: 1995 }],
      subtotal: 3990,
      shipping: 0,
      total: 3990,
      shippingAddress: ADDRESS,
    })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.to).toBe('sam@example.com')
    expect(payload.subject).toBe('Order Confirmed #OA-500')
    expect(payload.text).toContain('- Lavender (10ml) x2 - $19.95')
    expect(payload.text).toContain('Shipping: FREE')
    expect(payload.text).toContain('Total: $39.90')
    expect(payload.text).toContain('Coming soon') // no trackingUrl
    expect(payload.text).not.toContain('undefined')
  })

  it('sendShippingConfirmationEmail: carrier and tracking in subject/text', async () => {
    const { resend } = loadResend()
    await resend.sendShippingConfirmationEmail({
      to: 'sam@example.com',
      firstName: 'Sam',
      orderNumber: 'OA-500',
      trackingNumber: 'APX1',
      trackingUrl: 'https://track.example.com/APX1',
      carrier: 'Australia Post',
    })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.subject).toBe('Your order #OA-500 has shipped!')
    expect(payload.text).toContain('Australia Post: APX1')
    expect(payload.text).not.toContain('undefined')
  })

  it('sendPasswordResetEmail: subject and reset URL in text', async () => {
    const { resend } = loadResend()
    await resend.sendPasswordResetEmail({ to: 'sam@example.com', resetUrl: 'https://oilamor.com/reset?token=t', firstName: 'Sam' })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.subject).toBe('Reset your Oil Amor password')
    expect(payload.text).toContain('https://oilamor.com/reset?token=t')
  })

  it('sendRefundConfirmationEmail: refund amount in text', async () => {
    const { resend } = loadResend()
    await resend.sendRefundConfirmationEmail({ to: 'sam@example.com', orderNumber: 'OA-500', amount: 24.95 })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.subject).toBe('Refund processed for order #OA-500')
    expect(payload.text).toContain('$24.95 AUD')
  })

  it('sendAbandonedCartEmail: items and cart URL in text', async () => {
    const { resend } = loadResend()
    await resend.sendAbandonedCartEmail({
      to: 'sam@example.com',
      items: [{ name: 'Myrrh', price: 4995 }],
      cartUrl: 'https://oilamor.com/cart',
    })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.subject).toBe('Your cart is waiting at Oil Amor')
    expect(payload.text).toContain('- Myrrh - $49.95')
    expect(payload.text).toContain('https://oilamor.com/cart')
  })

  it('sendRewardsUpdateEmail: point balance in subject', async () => {
    const { resend } = loadResend()
    await resend.sendRewardsUpdateEmail({ to: 'sam@example.com', firstName: 'Sam', pointsBalance: 12345, tier: 'Diamond' })
    expect(mockSend.mock.calls[0][0].subject).toBe('You have 12,345 Crystal Points!')
  })

  it('sendCommissionEarnedEmail: commission amount in subject', async () => {
    const { resend } = loadResend()
    await resend.sendCommissionEarnedEmail({
      to: 'sam@example.com',
      firstName: 'Sam',
      blendName: 'Calm Nights',
      saleAmount: 24.95,
      commissionAmount: 2.5,
      commissionRate: 10,
      purchaserName: 'Alex',
    })
    expect(mockSend.mock.calls[0][0].subject).toBe('You earned $2.50 from Calm Nights')
  })

  it('blend lifecycle subjects reference the blend name', async () => {
    const { resend } = loadResend()
    await resend.sendBlendPreparationEmail({ to: 's@x.com', firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Focus', mode: 'pure', bottleSize: 10 })
    await resend.sendBlendCraftingEmail({ to: 's@x.com', firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Focus' })
    await resend.sendOrderReadyEmail({ to: 's@x.com', firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Focus' })
    await resend.sendOrderDeliveredEmail({ to: 's@x.com', firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Focus' })
    expect(mockSend.mock.calls[0][0].subject).toBe('Your Focus is being prepared')
    expect(mockSend.mock.calls[1][0].subject).toBe('Handcrafting your Focus')
    expect(mockSend.mock.calls[2][0].subject).toBe('Focus is ready for dispatch')
    expect(mockSend.mock.calls[3][0].subject).toBe('Focus has been delivered')
  })

  it('sendOrderCancelledEmail: optional reason only appears when provided', async () => {
    const { resend } = loadResend()
    await resend.sendOrderCancelledEmail({ to: 'sam@example.com', firstName: 'Sam', orderNumber: 'OA-1', reason: 'Out of stock' })
    expect(mockSend.mock.calls[0][0].text).toContain('Reason: Out of stock')
    await resend.sendOrderCancelledEmail({ to: 'sam@example.com', firstName: 'Sam', orderNumber: 'OA-1' })
    expect(mockSend.mock.calls[1][0].text).not.toContain('Reason:')
    expect(mockSend.mock.calls[1][0].text).not.toContain('undefined')
  })
})

describe('admin notifications', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key'
  })

  const ADMIN_ORDER = {
    orderNumber: 'OA-900',
    customerName: 'Sam Rivera',
    customerEmail: 'sam@example.com',
    total: 9835,
    status: 'paid',
    items: [{ name: 'Lavender', quantity: 1, price: 1995 }],
  }

  it('sends to the default admin inbox with an [Oil Amor] subject', async () => {
    const { resend } = loadResend()
    await resend.sendAdminOrderNotification({ ...ADMIN_ORDER, action: 'new_order' })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.to).toBe('official.oilamor@gmail.com')
    expect(payload.subject).toBe('[Oil Amor] New Order — #OA-900')
  })

  it('honours the ADMIN_EMAIL env override', async () => {
    process.env.ADMIN_EMAIL = 'boss@oilamor.com'
    const { resend } = loadResend()
    await resend.sendAdminOrderNotification({ ...ADMIN_ORDER, action: 'new_order' })
    expect(mockSend.mock.calls[0][0].to).toBe('boss@oilamor.com')
  })

  it.each([
    ['new_order', '[Oil Amor] New Order — #OA-900'],
    ['refund', '[Oil Amor] Refund — #OA-900'],
    ['cancelled', '[Oil Amor] Cancelled — #OA-900'],
    ['status_change', '[Oil Amor] Update — #OA-900'],
  ] as const)('action %s maps to subject %s', async (action, subject) => {
    const { resend } = loadResend()
    await resend.sendAdminOrderNotification({ ...ADMIN_ORDER, action })
    expect(mockSend.mock.calls[0][0].subject).toBe(subject)
  })

  it('admin text fallback contains order summary and no undefined', async () => {
    const { resend } = loadResend()
    await resend.sendAdminOrderNotification({ ...ADMIN_ORDER, action: 'new_order' })
    const payload = mockSend.mock.calls[0][0]
    expect(payload.text).toContain('Customer: Sam Rivera <sam@example.com>')
    expect(payload.text).toContain('Total: $98.35 AUD')
    expect(payload.text).toContain('- Lavender x1 — $19.95')
    expect(payload.text).not.toContain('undefined')
  })
})
