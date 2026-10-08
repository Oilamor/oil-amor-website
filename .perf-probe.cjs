/* Live-site performance probe: cold loads key pages, collects web vitals + resource weight. */
const { chromium } = require('playwright')

const PAGES = ['/', '/oils', '/mixing-atelier', '/cart']

async function probe(browser, url) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))

  const longTasks = []
  await page.addInitScript(() => {
    window.__longTasks = []
    try {
      new PerformanceObserver((list) => {
        for (const t of list.getEntries()) window.__longTasks.push(Math.round(t.duration))
      }).observe({ entryTypes: ['longtask'] })
    } catch {}
  })

  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  const loadMs = Date.now() - t0
  await page.waitForTimeout(3500) // let hydration + post-load work settle

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paints = performance.getEntriesByType('paint')
    const resources = performance.getEntriesByType('resource')
    const byType = {}
    let jsCount = 0, jsBytes = 0, imgBytes = 0, fontBytes = 0
    for (const r of resources) {
      const size = r.transferSize || 0
      if (r.initiatorType === 'script') { jsCount++; jsBytes += size }
      if (r.initiatorType === 'img') imgBytes += size
      if (r.initiatorType === 'css' || r.name.includes('font')) fontBytes += size
      const k = r.initiatorType || 'other'
      byType[k] = (byType[k] || 0) + 1
    }
    let lcp = null
    try {
      const es = performance.getEntriesByType('largest-contentful-paint')
      if (es.length) lcp = Math.round(es[es.length - 1].startTime)
    } catch {}
    return {
      ttfb: Math.round(nav ? nav.responseStart : 0),
      domContentLoaded: Math.round(nav ? nav.domContentLoadedEventEnd : 0),
      loadEvent: Math.round(nav ? nav.loadEventEnd : 0),
      fcp: paints.find(p => p.name === 'first-contentful-paint')?.startTime || null,
      lcp,
      resourceCount: resources.length,
      jsCount,
      jsKB: Math.round(jsBytes / 1024),
      imgKB: Math.round(imgBytes / 1024),
      fontCssKB: Math.round(fontBytes / 1024),
      totalKB: Math.round(resources.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
      byTypeCount: byType,
      longTasks: window.__longTasks || [],
    }
  })
  await page.close()
  return { url, loadMs, ...data, errors: errors.slice(0, 3) }
}

;(async () => {
  const browser = await chromium.launch()
  for (const p of PAGES) {
    const r = await probe(browser, 'https://www.oilamor.com' + p)
    console.log(JSON.stringify(r))
  }
  await browser.close()
})().catch((e) => { console.error('PROBE FAILED:', e.message); process.exit(1) })
