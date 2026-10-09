const { chromium } = require('playwright')
const url = require('fs').readFileSync('.blendurl.txt', 'utf8')
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(String(e).slice(0, 150)))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(3000)
  // walk wizard
  for (let i = 0; i < 8; i++) {
    const bottle = page.locator('text=Bottle Size').first()
    if (await bottle.isVisible().catch(() => false)) break
    const skip = page.locator('text=Skip for now').first()
    const cont = page.locator('button:has-text("Continue")').first()
    if (await skip.isVisible().catch(() => false)) await skip.click()
    else if (await cont.isVisible().catch(() => false)) await cont.click()
    await page.waitForTimeout(800)
  }
  await page.waitForTimeout(800)
  // attempt to click the 10ml bottle
  const before = await page.evaluate(() => document.body.innerText.match(/(\d+)ml/)?.[0])
  const btn = page.locator('button:has-text("10ml")').first()
  const info = { bottleSectionVisible: await page.locator('text=Bottle Size').first().isVisible().catch(() => false), has10ml: await btn.isVisible().catch(() => false) }
  if (info.has10ml) {
    await btn.click()
    await page.waitForTimeout(1000)
    const after = await page.evaluate(() => document.body.innerText.match(/(\d+)\.?\d*ml \/ (\d+)ml/) ? document.body.innerText.match(/(\d+)\.?\d*ml \/ (\d+)ml/).slice(1,3).join('/') : null)
    info.afterClick = after
  }
  console.log(JSON.stringify(info))
  await page.screenshot({ path: '.shot-67.png' })
  console.log('errors:', JSON.stringify(errors.slice(0, 2)))
  await browser.close()
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
