/**
 * getSiteUrl() — safe fallback for absolute links (emails, SEO, webhooks)
 */

import { getSiteUrl } from '@/lib/utils'

const URL_VARS = ['NEXT_PUBLIC_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'] as const

describe('getSiteUrl', () => {
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

  it('prefers NEXT_PUBLIC_URL when set', () => {
    process.env.NEXT_PUBLIC_URL = 'https://example.com'
    process.env.NEXT_PUBLIC_APP_URL = 'https://other.com'
    expect(getSiteUrl()).toBe('https://example.com')
  })

  it('falls back to NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    expect(getSiteUrl()).toBe('https://app.example.com')
  })

  it('falls back to NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.example.com'
    expect(getSiteUrl()).toBe('https://site.example.com')
  })

  it('defaults to the production domain when nothing is set', () => {
    expect(getSiteUrl()).toBe('https://oilamor.com')
  })

  it('strips trailing slashes so paths can be appended safely', () => {
    process.env.NEXT_PUBLIC_URL = 'https://example.com/'
    expect(getSiteUrl()).toBe('https://example.com')
  })
})
