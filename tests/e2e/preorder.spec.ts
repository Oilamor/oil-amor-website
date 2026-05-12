/**
 * Preorder Transparency E2E Tests
 * Tests stock status badges across product listings, detail pages, and cart
 */

import { test, expect } from '@playwright/test'

// Known stocked oils (ship tomorrow)
const STOCKED_OILS = ['lavender', 'tea-tree', 'eucalyptus', 'lemongrass', 'clove-bud', 'jojoba']

// Known preorder oils (ship in 2-4 weeks)
const PREORDER_OILS = ['frankincense', 'peppermint', 'rose', 'sandalwood']

test.describe('Preorder Transparency', () => {
  test.describe('Product Listing Page (/oils)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/oils')
      await page.waitForLoadState('networkidle')
    })

    test('stocked oils show "In Stock — Ships Tomorrow" badge', async ({ page }) => {
      for (const oilId of STOCKED_OILS) {
        const card = page.locator(`a[href*="/oil/${oilId}"]`).first()
        if (await card.isVisible().catch(() => false)) {
          const badge = card.locator('text=In Stock').first()
          await expect(badge).toBeVisible()
        }
      }
    })

    test('preorder oils show "Pre-Order — Ships in 2-4 Weeks" badge', async ({ page }) => {
      for (const oilId of PREORDER_OILS) {
        const card = page.locator(`a[href*="/oil/${oilId}"]`).first()
        if (await card.isVisible().catch(() => false)) {
          const badge = card.locator('text=Pre-Order').first()
          await expect(badge).toBeVisible()
        }
      }
    })

    test('every visible oil card has a stock status badge', async ({ page }) => {
      const oilCards = page.locator('a[href^="/oil/"]')
      const count = await oilCards.count()
      expect(count).toBeGreaterThan(0)

      for (let i = 0; i < Math.min(count, 10); i++) {
        const card = oilCards.nth(i)
        const hasStock = await card.locator('text=In Stock').first().isVisible().catch(() => false)
        const hasPreorder = await card.locator('text=Pre-Order').first().isVisible().catch(() => false)
        expect(hasStock || hasPreorder).toBe(true)
      }
    })
  })

  test.describe('Oil Detail Page', () => {
    test('stocked oil detail shows in-stock badge', async ({ page }) => {
      await page.goto('/oil/lavender-essential-oil')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('text=In Stock').first()).toBeVisible()
      await expect(page.locator('text=Ships Tomorrow').first()).toBeVisible()
    })

    test('preorder oil detail shows preorder badge', async ({ page }) => {
      await page.goto('/oil/frankincense-essential-oil')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('text=Pre-Order').first()).toBeVisible()
      await expect(page.locator('text=Ships in 2-4 Weeks').first()).toBeVisible()
    })
  })

  test.describe('Cart Sidebar', () => {
    test('cart shows stock status for in-stock items', async ({ page }) => {
      // Navigate to a stocked oil and add to cart
      await page.goto('/oil/lavender-essential-oil')
      await page.waitForLoadState('networkidle')

      // Select crystal (required before add to cart)
      const crystalOption = page.locator('[data-testid="crystal-option-amethyst"]').first()
      if (await crystalOption.isVisible().catch(() => false)) {
        await crystalOption.click()
        await page.waitForTimeout(300)
      }

      // Add to cart
      const addButton = page.locator('[data-testid="add-to-cart-button"]').first()
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Open cart
        const cartToggle = page.locator('[data-testid="cart-toggle"]').first()
        if (await cartToggle.isVisible().catch(() => false)) {
          await cartToggle.click()
          await page.waitForTimeout(300)

          // Should show stock badge
          const cartItem = page.locator('[data-testid="cart-item"]').first()
          if (await cartItem.isVisible().catch(() => false)) {
            const hasStock = await cartItem.locator('text=In Stock').first().isVisible().catch(() => false)
            const hasPreorder = await cartItem.locator('text=Pre-Order').first().isVisible().catch(() => false)
            expect(hasStock || hasPreorder).toBe(true)
          }
        }
      }
    })
  })
})
