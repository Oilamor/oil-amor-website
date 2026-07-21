/**
 * SEO route output tests — robots.ts, sitemap.ts, manifest.ts
 */

import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import manifest from '@/app/manifest'

describe('robots()', () => {
  it('disallows private and POC routes', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallow = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : []
    )

    expect(disallow).toEqual(
      expect.arrayContaining(['/api/', '/cart/', '/admin', '/account', '/preview', '/components'])
    )
  })

  it('points at the production sitemap', () => {
    expect(robots().sitemap).toBe('https://oilamor.com/sitemap.xml')
  })
})

describe('sitemap()', () => {
  it('includes legal, faq, journal and crystals pages', async () => {
    const urls = (await sitemap()).map((e) => e.url)

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://oilamor.com/faq',
        'https://oilamor.com/journal',
        'https://oilamor.com/crystals',
        'https://oilamor.com/privacy',
        'https://oilamor.com/terms',
        'https://oilamor.com/returns',
        'https://oilamor.com/shipping',
        'https://oilamor.com/accessibility',
      ])
    )
  })

  it('includes dynamic oil detail pages', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.some((u) => u.startsWith('https://oilamor.com/oil/'))).toBe(true)
  })

  it('never includes private or POC routes', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    const banned = ['/admin', '/account', '/preview', '/components', '/cart', '/api']

    for (const url of urls) {
      for (const segment of banned) {
        expect(url).not.toContain(segment)
      }
    }
  })

  it('produces well-formed entries', async () => {
    for (const entry of await sitemap()) {
      expect(entry.url).toMatch(/^https:\/\/oilamor\.com/)
      expect(entry.lastModified).toBeInstanceOf(Date)
      expect(entry.priority).toBeGreaterThan(0)
      expect(entry.priority).toBeLessThanOrEqual(1)
    }
  })
})

describe('manifest()', () => {
  it('exposes PNG icons, not the SVG favicon', () => {
    const icons = manifest().icons ?? []
    const srcs = icons.map((i) => (typeof i === 'string' ? i : i.src))

    expect(srcs).toContain('/icon-192x192.png')
    expect(srcs).toContain('/icon-512x512.png')
    expect(srcs).not.toContain('/favicon.svg')
  })
})
