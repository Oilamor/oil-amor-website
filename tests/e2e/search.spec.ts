/**
 * Search E2E Tests
 * Tests the real product search modal (Cmd+K)
 */

import { test, expect } from '@playwright/test'

test.describe('Search Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('opens with Cmd+K keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.getByPlaceholder('Search oils, crystals, collections...')).toBeVisible()
  })

  test('opens by clicking search button', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByPlaceholder('Search oils, crystals, collections...')).toBeVisible()
  })

  test('closes with Escape key', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.getByPlaceholder('Search oils, crystals, collections...')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByPlaceholder('Search oils, crystals, collections...')).not.toBeVisible()
  })

  test('shows popular searches when empty', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.getByText('Popular Searches')).toBeVisible()
    await expect(page.getByText('Lavender')).toBeVisible()
    await expect(page.getByText('Sleep')).toBeVisible()
  })

  test('returns oil results for oil name query', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search oils, crystals, collections...')
    await input.fill('lavender')
    await page.waitForTimeout(300)

    await expect(page.getByText('Essential Oils')).toBeVisible()
    await expect(page.getByText('Lavender', { exact: false }).first()).toBeVisible()
  })

  test('returns crystal results for crystal query', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search oils, crystals, collections...')
    await input.fill('amethyst')
    await page.waitForTimeout(300)

    await expect(page.getByText('Crystals')).toBeVisible()
    await expect(page.getByText('Amethyst', { exact: false }).first()).toBeVisible()
  })

  test('filters by category tabs', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search oils, crystals, collections...')
    await input.fill('a')
    await page.waitForTimeout(300)

    // Category tabs should appear
    await expect(page.getByRole('button', { name: /All \(\d+\)/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Oils \(\d+\)/ })).toBeVisible()

    // Click Oils tab
    await page.getByRole('button', { name: /Oils \(\d+\)/ }).click()
    await page.waitForTimeout(200)

    // Should still show oils
    await expect(page.getByText('Essential Oils')).toBeVisible()
  })

  test('shows empty state for no results', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search oils, crystals, collections...')
    await input.fill('xyznonexistent')
    await page.waitForTimeout(300)

    await expect(page.getByText(/No results found/)).toBeVisible()
    await expect(page.getByText('Try searching for oils, crystals, or benefits')).toBeVisible()
  })

  test('navigates to oil detail from search result', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search oils, crystals, collections...')
    await input.fill('lavender')
    await page.waitForTimeout(300)

    // Click the lavender result
    const result = page.locator('a[href*="/oil/lavender"]').first()
    await result.click()

    // Should navigate to oil detail page
    await expect(page).toHaveURL(/\/oil\/lavender/)
    await expect(page.getByText('Lavender', { exact: false }).first()).toBeVisible()
  })

  test('searches by benefit/property keyword', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.getByPlaceholder('Search oils, crystals, collections...')
    await input.fill('sleep')
    await page.waitForTimeout(300)

    // Should return oils related to sleep
    const results = page.locator('a[href^="/oil/"]')
    const count = await results.count()
    expect(count).toBeGreaterThan(0)
  })
})
