const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  await page.goto('http://localhost:3100/', { waitUntil: 'load' })
  await page.waitForTimeout(5000)
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    const canvas = document.querySelector('canvas')
    return {
      h1Text: h1?.textContent,
      h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
      h1Transform: h1 ? getComputedStyle(h1).transform : null,
      canvas: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
    }
  })
  console.log(JSON.stringify(info))
  await page.screenshot({ path: '.shot-hero3.png' })
  console.log('errors:', JSON.stringify(errors.slice(0, 4)))
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
