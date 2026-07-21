/**
 * Email templates must never render the string "undefined" into links
 * when the NEXT_PUBLIC_* URL env vars are missing.
 */

import {
  rewardsUpdateEmail,
  orderCancelledEmail,
  welcomeEmail,
} from '@/lib/email/templates'

const URL_VARS = ['NEXT_PUBLIC_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'] as const

describe('email template URL fallback', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(URL_VARS.map((v) => [v, process.env[v]]))
    for (const v of URL_VARS) delete process.env[v]
  })

  afterEach(() => {
    for (const v of URL_VARS) {
      if (saved[v] === undefined) delete process.env[v]
      else process.env[v] = saved[v]
    }
  })

  it('rewards email links to the production rewards page without env vars', () => {
    const html = rewardsUpdateEmail({ firstName: 'Sam', pointsBalance: 1200, tier: 'Amethyst' })

    expect(html).toContain('https://oilamor.com/account/rewards')
    expect(html).not.toContain('undefined/')
  })

  it('order cancelled email links to collections without env vars', () => {
    const html = orderCancelledEmail({ firstName: 'Sam', orderNumber: 'OA-1001' })

    expect(html).toContain('https://oilamor.com/collections')
    expect(html).not.toContain('undefined/')
  })

  it('welcome email uses the fallback login URL when none is passed', () => {
    const html = welcomeEmail({ firstName: 'Sam' })

    expect(html).toContain('https://oilamor.com/collections')
    expect(html).not.toContain('undefined/')
  })
})
