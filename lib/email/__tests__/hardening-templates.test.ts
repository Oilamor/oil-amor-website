/**
 * Hardening: email templates (lib/email/templates.ts)
 *
 * Every exported template must:
 *  - render a complete HTML document
 *  - include the order/customer specifics it was given (cents → $X.XX)
 *  - never render the string "undefined" (getSiteUrl fallback regression)
 *  - escape user-supplied strings (no HTML/script injection)
 */

import {
  escapeHtml,
  passwordResetEmail,
  welcomeEmail,
  orderConfirmationEmail,
  shippingConfirmationEmail,
  abandonedCartEmail,
  rewardsUpdateEmail,
  blendPreparationEmail,
  blendCraftingEmail,
  orderReadyEmail,
  orderDeliveredEmail,
  commissionEarnedEmail,
  orderCancelledEmail,
  refundConfirmationEmail,
  adminOrderNotificationEmail,
} from '../templates'

const ADDRESS = {
  name: 'Sam Rivera',
  line1: '12 Crystal Lane',
  line2: 'Unit 4',
  city: 'Byron Bay',
  state: 'NSW',
  postalCode: '2481',
  country: 'Australia',
}

const ORDER = {
  firstName: 'Sam',
  orderNumber: 'OA-1042',
  orderDate: '21 July 2026',
  items: [
    { name: 'Lavender Essential Oil', variant: '10ml', quantity: 2, price: 1995 },
    { name: 'Myrrh Essential Oil', quantity: 1, price: 4995 },
  ],
  subtotal: 8985,
  shipping: 850,
  total: 9835,
  shippingAddress: ADDRESS,
}

const XSS = '<script>alert("pwned")</script>'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Sam Rivera')).toBe('Sam Rivera')
  })

  it('neutralizes script tags', () => {
    expect(escapeHtml(XSS)).toBe('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;')
  })

  it('escapes ampersands first (no double-escaping artifacts)', () => {
    expect(escapeHtml('a &lt; b')).toBe('a &amp;lt; b')
  })
})

describe('all templates render complete documents without "undefined"', () => {
  const renders: Array<[string, () => string]> = [
    ['passwordResetEmail', () => passwordResetEmail({ resetUrl: 'https://oilamor.com/reset?token=t1' })],
    ['welcomeEmail', () => welcomeEmail({ firstName: 'Sam' })],
    ['orderConfirmationEmail', () => orderConfirmationEmail(ORDER)],
    ['shippingConfirmationEmail', () => shippingConfirmationEmail({ firstName: 'Sam', orderNumber: 'OA-1', trackingNumber: 'T1', trackingUrl: 'https://track.example.com/T1', carrier: 'Australia Post' })],
    ['abandonedCartEmail', () => abandonedCartEmail({ items: [{ name: 'Lavender', price: 1995 }], cartUrl: 'https://oilamor.com/cart' })],
    ['rewardsUpdateEmail', () => rewardsUpdateEmail({ firstName: 'Sam', pointsBalance: 1200, tier: 'Amethyst' })],
    ['blendPreparationEmail', () => blendPreparationEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Calm Nights', mode: 'pure', bottleSize: 10 })],
    ['blendCraftingEmail', () => blendCraftingEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Calm Nights' })],
    ['orderReadyEmail', () => orderReadyEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Calm Nights' })],
    ['orderDeliveredEmail', () => orderDeliveredEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Calm Nights' })],
    ['commissionEarnedEmail', () => commissionEarnedEmail({ firstName: 'Sam', blendName: 'Calm Nights', saleAmount: 24.95, commissionAmount: 2.5, commissionRate: 10, purchaserName: 'Alex' })],
    ['orderCancelledEmail', () => orderCancelledEmail({ firstName: 'Sam', orderNumber: 'OA-1' })],
    ['refundConfirmationEmail', () => refundConfirmationEmail({ orderNumber: 'OA-1', amount: 24.95 })],
    ['adminOrderNotificationEmail', () => adminOrderNotificationEmail({ orderNumber: 'OA-1', customerName: 'Sam', customerEmail: 'sam@example.com', total: 9835, status: 'paid', items: [{ name: 'Lavender', quantity: 1, price: 1995 }], action: 'new_order' })],
  ]

  it.each(renders)('%s renders a full HTML document', (_name, render) => {
    const html = render()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
    expect(html).toContain('Oil Amor')
  })

  it.each(renders)('%s never contains the string "undefined"', (_name, render) => {
    expect(render()).not.toContain('undefined')
  })

  it.each(renders)('%s keeps the unsubscribe placeholder intact', (_name, render) => {
    expect(render()).toContain('{{unsubscribe_url}}')
  })
})

describe('orderConfirmationEmail', () => {
  it('renders customer, order number, items and totals (cents → $X.XX)', () => {
    const html = orderConfirmationEmail(ORDER)
    expect(html).toContain('Hi Sam,')
    expect(html).toContain('OA-1042')
    expect(html).toContain('Lavender Essential Oil')
    expect(html).toContain('Myrrh Essential Oil')
    expect(html).toContain('Qty: 2')
    expect(html).toContain('$19.95')
    expect(html).toContain('$49.95')
    expect(html).toContain('$89.85') // subtotal
    expect(html).toContain('$8.50') // shipping
    expect(html).toContain('$98.35') // total
  })

  it('shows FREE shipping when shipping is 0', () => {
    const html = orderConfirmationEmail({ ...ORDER, shipping: 0 })
    expect(html).toContain('FREE')
    expect(html).not.toContain('$0.00')
  })

  it('renders the full shipping address including line2', () => {
    const html = orderConfirmationEmail(ORDER)
    expect(html).toContain('12 Crystal Lane')
    expect(html).toContain('Unit 4')
    expect(html).toContain('Byron Bay, NSW 2481')
    expect(html).toContain('Australia')
  })

  it('omits line2 cleanly when not provided', () => {
    const { line2, ...address } = ADDRESS
    const html = orderConfirmationEmail({ ...ORDER, shippingAddress: address })
    expect(html).toContain('12 Crystal Lane')
    expect(html).not.toContain('undefined')
  })

  it('includes a tracking button only when trackingUrl is provided', () => {
    const withTracking = orderConfirmationEmail({ ...ORDER, trackingUrl: 'https://track.example.com/abc' })
    expect(withTracking).toContain('Track Order')
    expect(withTracking).toContain('https://track.example.com/abc')
    const without = orderConfirmationEmail(ORDER)
    expect(without).not.toContain('Track Order')
  })

  it('escapes malicious item names and customer names', () => {
    const html = orderConfirmationEmail({
      ...ORDER,
      firstName: XSS,
      items: [{ name: XSS, quantity: 1, price: 100 }],
      shippingAddress: { ...ADDRESS, line1: XSS },
    })
    expect(html).not.toContain('<script>alert("pwned")</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('shippingConfirmationEmail', () => {
  const params = {
    firstName: 'Sam',
    orderNumber: 'OA-77',
    trackingNumber: 'APX123456',
    trackingUrl: 'https://auspost.com.au/track/APX123456',
    carrier: 'Australia Post',
  }

  it('renders carrier, tracking number and link', () => {
    const html = shippingConfirmationEmail(params)
    expect(html).toContain('Australia Post')
    expect(html).toContain('APX123456')
    expect(html).toContain('https://auspost.com.au/track/APX123456')
    expect(html).toContain('OA-77')
  })

  it('shows estimated delivery only when provided', () => {
    expect(shippingConfirmationEmail({ ...params, estimatedDelivery: 'Friday 24 July' })).toContain('Friday 24 July')
    expect(shippingConfirmationEmail(params)).not.toContain('Estimated delivery')
  })

  it('escapes user-controlled tracking fields', () => {
    const html = shippingConfirmationEmail({ ...params, trackingNumber: XSS, carrier: XSS })
    expect(html).not.toContain('<script>alert("pwned")</script>')
  })
})

describe('abandonedCartEmail', () => {
  it('shows at most 3 items with a "+N more" summary', () => {
    const items = [
      { name: 'Lavender', price: 1995 },
      { name: 'Myrrh', price: 4995 },
      { name: 'Tea Tree', price: 1795 },
      { name: 'Clove Bud', price: 1895 },
      { name: 'Ginger', price: 2195 },
    ]
    const html = abandonedCartEmail({ items, cartUrl: 'https://oilamor.com/cart' })
    expect(html).toContain('Lavender')
    expect(html).toContain('Tea Tree')
    expect(html).not.toContain('Clove Bud')
    expect(html).toContain('+ 2 more items')
  })

  it('greets by name when given, generically otherwise', () => {
    expect(abandonedCartEmail({ firstName: 'Sam', items: [], cartUrl: 'x' })).toContain('Hi Sam,')
    expect(abandonedCartEmail({ items: [], cartUrl: 'x' })).toContain('Hello,')
  })

  it('formats item prices from cents', () => {
    const html = abandonedCartEmail({ items: [{ name: 'Myrrh', price: 4995 }], cartUrl: 'x' })
    expect(html).toContain('$49.95')
  })
})

describe('rewardsUpdateEmail', () => {
  it('renders localized point balances and tier', () => {
    const html = rewardsUpdateEmail({ firstName: 'Sam', pointsBalance: 12345, tier: 'Diamond' })
    expect(html).toContain('12,345')
    expect(html).toContain('Diamond Member')
  })

  it('shows earned points and next reward only when provided', () => {
    const full = rewardsUpdateEmail({ firstName: 'Sam', pointsBalance: 100, pointsEarned: 50, tier: 'Quartz', nextReward: 'Free Shipping' })
    expect(full).toContain('You just earned 50 points!')
    expect(full).toContain('Free Shipping')
    const minimal = rewardsUpdateEmail({ firstName: 'Sam', pointsBalance: 100, tier: 'Quartz' })
    expect(minimal).not.toContain('You just earned')
    expect(minimal).not.toContain('unlocking')
  })

  it('falls back to brand gold for unknown tiers', () => {
    const html = rewardsUpdateEmail({ firstName: 'Sam', pointsBalance: 5, tier: 'Unobtainium' })
    expect(html).toContain('#c9a227')
  })
})

describe('blend lifecycle emails', () => {
  it('blendPreparationEmail shows blend name, size and mode-specific copy', () => {
    const pure = blendPreparationEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Calm Nights', mode: 'pure', bottleSize: 10 })
    expect(pure).toContain('Calm Nights')
    expect(pure).toContain('10ml • Pure Essential Oil')
    const carrier = blendPreparationEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: 'Calm Nights', mode: 'carrier', bottleSize: 30 })
    expect(carrier).toContain('30ml • Carrier Oil Blend')
  })

  it('blendCraftingEmail and orderReadyEmail reference the blend and order', () => {
    const crafting = blendCraftingEmail({ firstName: 'Sam', orderNumber: 'OA-2', blendName: 'Focus' })
    expect(crafting).toContain('Focus')
    expect(crafting).toContain('OA-2')
    const ready = orderReadyEmail({ firstName: 'Sam', orderNumber: 'OA-3', blendName: 'Focus' })
    expect(ready).toContain('Focus')
    expect(ready).toContain('OA-3')
  })

  it('orderDeliveredEmail includes care instructions and optional batch QR note', () => {
    const withBatch = orderDeliveredEmail({ firstName: 'Sam', orderNumber: 'OA-4', blendName: 'Focus', batchId: 'B-1' })
    expect(withBatch).toContain('patch test')
    expect(withBatch).toContain('QR code')
    const without = orderDeliveredEmail({ firstName: 'Sam', orderNumber: 'OA-4', blendName: 'Focus' })
    expect(without).not.toContain('QR code')
    expect(without).not.toContain('undefined')
  })

  it('escapes blend names in lifecycle emails', () => {
    for (const render of [
      () => blendPreparationEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: XSS, mode: 'pure', bottleSize: 10 }),
      () => blendCraftingEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: XSS }),
      () => orderReadyEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: XSS }),
      () => orderDeliveredEmail({ firstName: 'Sam', orderNumber: 'OA-1', blendName: XSS }),
    ]) {
      expect(render()).not.toContain('<script>alert("pwned")</script>')
    }
  })
})

describe('commission / cancellation / refund emails', () => {
  it('commissionEarnedEmail formats dollar amounts with 2 decimals', () => {
    const html = commissionEarnedEmail({
      firstName: 'Sam',
      blendName: 'Calm Nights',
      saleAmount: 24.95,
      commissionAmount: 2.5,
      commissionRate: 10,
      purchaserName: 'Alex',
    })
    expect(html).toContain('$2.50')
    expect(html).toContain('10% of $24.95 sale')
    expect(html).toContain('Alex')
  })

  it('commissionEarnedEmail escapes the purchaser name and blend name', () => {
    const html = commissionEarnedEmail({
      firstName: 'Sam',
      blendName: XSS,
      saleAmount: 10,
      commissionAmount: 1,
      commissionRate: 10,
      purchaserName: XSS,
    })
    expect(html).not.toContain('<script>alert("pwned")</script>')
  })

  it('orderCancelledEmail shows the reason only when provided', () => {
    const withReason = orderCancelledEmail({ firstName: 'Sam', orderNumber: 'OA-9', reason: 'Customer request' })
    expect(withReason).toContain('Reason: Customer request')
    const without = orderCancelledEmail({ firstName: 'Sam', orderNumber: 'OA-9' })
    expect(without).not.toContain('Reason:')
    expect(without).not.toContain('undefined')
  })

  it('orderCancelledEmail escapes the reason', () => {
    const html = orderCancelledEmail({ firstName: 'Sam', orderNumber: 'OA-9', reason: XSS })
    expect(html).not.toContain('<script>alert("pwned")</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('refundConfirmationEmail formats the amount as dollars', () => {
    const html = refundConfirmationEmail({ orderNumber: 'OA-11', amount: 24.95 })
    expect(html).toContain('$24.95')
    expect(html).toContain('OA-11')
    expect(html).toContain('AUD')
  })
})

describe('adminOrderNotificationEmail', () => {
  const base = {
    orderNumber: 'OA-20',
    customerName: 'Sam Rivera',
    customerEmail: 'sam@example.com',
    total: 9835,
    status: 'paid',
    items: [
      { name: 'Lavender', quantity: 2, price: 1995 },
      { name: 'Myrrh', quantity: 1, price: 4995 },
    ],
  }

  it.each([
    ['new_order', 'New Order Received'],
    ['status_change', 'Order Status Updated'],
    ['refund', 'Order Refunded'],
    ['cancelled', 'Order Cancelled'],
  ] as const)('action %s renders its label', (action, label) => {
    expect(adminOrderNotificationEmail({ ...base, action })).toContain(label)
  })

  it('renders customer, items and total (cents → $X.XX)', () => {
    const html = adminOrderNotificationEmail({ ...base, action: 'new_order' })
    expect(html).toContain('Sam Rivera')
    expect(html).toContain('sam@example.com')
    expect(html).toContain('Lavender')
    expect(html).toContain('$19.95')
    expect(html).toContain('$98.35')
  })

  it('shows status transitions and refund amounts when relevant', () => {
    const statusChange = adminOrderNotificationEmail({ ...base, action: 'status_change', previousStatus: 'pending', status: 'shipped' })
    expect(statusChange).toContain('pending → shipped')
    const refund = adminOrderNotificationEmail({ ...base, action: 'refund', refundAmount: 24.95 })
    expect(refund).toContain('Refund: $24.95 AUD')
  })

  it('includes the admin button only when adminUrl is provided', () => {
    expect(adminOrderNotificationEmail({ ...base, action: 'new_order', adminUrl: 'https://oilamor.com/admin' })).toContain('View in Admin')
    expect(adminOrderNotificationEmail({ ...base, action: 'new_order' })).not.toContain('View in Admin')
  })

  it('escapes customer-supplied fields', () => {
    const html = adminOrderNotificationEmail({
      ...base,
      action: 'new_order',
      customerName: XSS,
      customerEmail: XSS,
      items: [{ name: XSS, quantity: 1, price: 100 }],
    })
    expect(html).not.toContain('<script>alert("pwned")</script>')
  })
})

describe('welcome / password reset', () => {
  it('welcomeEmail greets the customer and links to collections', () => {
    const html = welcomeEmail({ firstName: 'Sam' })
    expect(html).toContain('Dear Sam,')
    expect(html).toContain('/collections')
  })

  it('welcomeEmail interpolates the first name into the preview/title (template-literal regression)', () => {
    const html = welcomeEmail({ firstName: 'Sam' })
    expect(html).toContain('<title>Welcome to Oil Amor, Sam</title>')
    expect(html).not.toContain('${firstName}')
  })

  it('welcomeEmail escapes the first name', () => {
    expect(welcomeEmail({ firstName: XSS })).not.toContain('<script>alert("pwned")</script>')
  })

  it('passwordResetEmail falls back to "there" without a first name', () => {
    expect(passwordResetEmail({ resetUrl: 'https://x' })).toContain('Hi there,')
    expect(passwordResetEmail({ firstName: 'Sam', resetUrl: 'https://x' })).toContain('Hi Sam,')
  })

  it('passwordResetEmail includes the reset URL in button and copy block', () => {
    const html = passwordResetEmail({ resetUrl: 'https://oilamor.com/reset?token=abc', expiresIn: '2 hours' })
    expect(html.match(/https:\/\/oilamor\.com\/reset\?token=abc/g)!.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('Expires in 2 hours')
  })

  it('passwordResetEmail escapes quotes in URLs so the href cannot be broken out of', () => {
    const html = passwordResetEmail({ resetUrl: `https://evil.com/" onclick="steal()` })
    expect(html).not.toContain('href="https://evil.com/" onclick="steal()"')
    expect(html).toContain('&quot;')
  })
})
