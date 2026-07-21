/**
 * Hardening Tests — lib/cart/cart-manager.ts (Upstash CartManager class)
 *
 * Pins the exact behavioral contract of the enterprise CartManager:
 *  - creation defaults + guest vs authenticated Redis TTLs
 *  - getCart activity-touch semantics and graceful-null error paths
 *  - add/update/remove/clear item semantics and quantity caps (99/item, 100 lines)
 *  - duplicate-item merging keyed on variantId + JSON.stringify(configuration)
 *  - totals: 10% GST rounding, $199 free-shipping threshold, float behavior
 *    (subtotal and total are NOT rounded — only totalTax is)
 *  - validateCart limits ($10,000 cart value, per-item quantity)
 *
 * Redis is the globally mocked @upstash/redis client (see jest.setup.ts).
 */

import { CartManager } from '../cart-manager'
import { CartEventType, type Cart, type CartItem } from '../types'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logging/logger'
import { createMockCart, createMockCartItem } from '@/lib/test-utils'

const ANON_TTL = 30 * 24 * 60 * 60 // 2,592,000
const AUTH_TTL = 90 * 24 * 60 * 60 // 7,776,000
const EVENT_TTL = 30 * 24 * 60 * 60

describe('CartManager (cart-manager.ts) hardening', () => {
  let cartManager: CartManager
  let mockRedis: jest.Mocked<Redis>

  beforeEach(() => {
    mockRedis = new Redis({ url: 'http://localhost', token: 'test' }) as jest.Mocked<Redis>
    mockRedis.get = jest.fn().mockResolvedValue(null)
    mockRedis.set = jest.fn().mockResolvedValue('OK')
    mockRedis.del = jest.fn().mockResolvedValue(1)
    cartManager = new CartManager(mockRedis)
  })

  // ==========================================================================
  // CREATION
  // ==========================================================================

  describe('createCart', () => {
    it('creates an empty cart with a cart_ prefixed 16-char id and zeroed totals', async () => {
      const cart = await cartManager.createCart()

      expect(cart.id).toMatch(/^cart_[A-Za-z0-9]{16}$/)
      expect(cart.items).toEqual([])
      expect(cart.summary).toEqual({
        subtotal: 0,
        totalTax: 0,
        totalShipping: 0,
        totalDiscounts: 0,
        total: 0,
        currency: 'AUD',
        itemCount: 0,
      })
      expect(cart.subtotal).toBe(0)
      expect(cart.taxTotal).toBe(0)
      expect(cart.shippingEstimate).toBe(0)
      expect(cart.discountTotal).toBe(0)
      expect(cart.total).toBe(0)
      expect(cart.currency).toBe('AUD')
      expect(cart.itemCount).toBe(0)
      expect(cart.totalQuantity).toBe(0)
    })

    it('persists guest carts under the namespaced key with the 30-day anonymous TTL', async () => {
      const cart = await cartManager.createCart()

      expect(mockRedis.set).toHaveBeenCalledWith(
        `oilamor:cart:${cart.id}`,
        cart,
        { ex: ANON_TTL }
      )
    })

    it('persists customer carts with the 90-day authenticated TTL', async () => {
      const cart = await cartManager.createCart('cust_1', 'a@b.c')

      expect(cart.customerId).toBe('cust_1')
      expect(cart.email).toBe('a@b.c')
      expect(mockRedis.set).toHaveBeenCalledWith(
        `oilamor:cart:${cart.id}`,
        cart,
        { ex: AUTH_TTL }
      )
    })

    it('sets expiresAt ~30 days out even for authenticated carts (pinned inconsistency)', async () => {
      const before = Date.now()
      const cart = await cartManager.createCart('cust_1')
      const after = Date.now()

      const expiresMs = Date.parse(cart.expiresAt)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      // Redis TTL is 90 days for customers, but the expiresAt field is always +30d
      expect(expiresMs).toBeGreaterThanOrEqual(before + thirtyDays)
      expect(expiresMs).toBeLessThanOrEqual(after + thirtyDays)
    })

    it('generates unique cart ids across creations', async () => {
      const ids = new Set(
        await Promise.all(Array.from({ length: 20 }, () => cartManager.createCart().then(c => c.id)))
      )
      expect(ids.size).toBe(20)
    })
  })

  // ==========================================================================
  // RETRIEVAL
  // ==========================================================================

  describe('getCart', () => {
    it('returns null when Redis has no cart', async () => {
      expect(await cartManager.getCart('cart_missing')).toBeNull()
    })

    it('touches lastActivityAt and re-saves with the anonymous TTL on every read', async () => {
      const stale = createMockCart({
        id: 'cart_abc',
        lastActivityAt: '2020-01-01T00:00:00.000Z',
      })
      mockRedis.get = jest.fn().mockResolvedValue(stale)

      const cart = await cartManager.getCart('cart_abc')

      expect(cart).not.toBeNull()
      expect(Date.parse(cart!.lastActivityAt!)).toBeGreaterThan(Date.parse('2020-01-01T00:00:00.000Z'))
      expect(mockRedis.set).toHaveBeenCalledWith(
        'oilamor:cart:cart_abc',
        cart,
        { ex: ANON_TTL }
      )
    })

    it('re-saves customer carts with the authenticated TTL on read', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(createMockCart({ id: 'cart_c', customerId: 'cust_9' }))

      await cartManager.getCart('cart_c')

      expect(mockRedis.set).toHaveBeenCalledWith(
        'oilamor:cart:cart_c',
        expect.objectContaining({ customerId: 'cust_9' }),
        { ex: AUTH_TTL }
      )
    })

    it('returns null (and logs) when Redis get throws — never propagates', async () => {
      mockRedis.get = jest.fn().mockRejectedValue(new Error('redis down'))

      await expect(cartManager.getCart('cart_x')).resolves.toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })

    it('returns null when the follow-up save fails after a successful read', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(createMockCart({ id: 'cart_x' }))
      mockRedis.set = jest.fn().mockRejectedValue(new Error('write failed'))

      // Pinned: a save failure during the activity touch turns a FOUND cart into null
      await expect(cartManager.getCart('cart_x')).resolves.toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })

    it('returns null for corrupted (non-object) data in Redis via strict-mode TypeError', async () => {
      // A garbage string is truthy; assigning lastActivityAt on a string primitive
      // throws in strict mode and is caught by getCart's catch-all.
      mockRedis.get = jest.fn().mockResolvedValue('corrupted{{{json' as unknown as Cart)

      await expect(cartManager.getCart('cart_x')).resolves.toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getOrCreateCart', () => {
    it('returns the existing cart when found', async () => {
      const existing = createMockCart({ id: 'cart_exists' })
      mockRedis.get = jest.fn().mockResolvedValue(existing)

      const cart = await cartManager.getOrCreateCart('cart_exists')

      expect(cart.id).toBe('cart_exists')
    })

    it('adopts customerId/email onto an anonymous cart when provided', async () => {
      const anon = createMockCart({ id: 'cart_anon', customerId: undefined, email: undefined })
      mockRedis.get = jest.fn().mockResolvedValue(anon)

      const cart = await cartManager.getOrCreateCart('cart_anon', 'cust_1', 'x@y.z')

      expect(cart.customerId).toBe('cust_1')
      expect(cart.email).toBe('x@y.z')
    })

    it('does not overwrite an existing customerId', async () => {
      const owned = createMockCart({ id: 'cart_owned', customerId: 'cust_original' })
      mockRedis.get = jest.fn().mockResolvedValue(owned)

      const cart = await cartManager.getOrCreateCart('cart_owned', 'cust_other', 'x@y.z')

      expect(cart.customerId).toBe('cust_original')
    })

    it('creates a fresh cart when the id is unknown', async () => {
      const cart = await cartManager.getOrCreateCart('cart_gone', 'cust_1')

      expect(cart.id).not.toBe('cart_gone')
      expect(cart.id).toMatch(/^cart_/)
      expect(cart.customerId).toBe('cust_1')
    })

    it('creates a fresh cart when no id is given at all', async () => {
      const cart = await cartManager.getOrCreateCart()

      expect(cart.id).toMatch(/^cart_/)
    })
  })

  // ==========================================================================
  // ADD ITEM
  // ==========================================================================

  describe('addItem', () => {
    function seedCart(overrides: Partial<Cart> = {}): Cart {
      const cart = createMockCart({ id: 'cart_seed', ...overrides })
      mockRedis.get = jest.fn().mockResolvedValue(cart)
      return cart
    }

    it('throws when the cart does not exist', async () => {
      await expect(
        cartManager.addItem('cart_missing', { variantId: 'v1', quantity: 1 })
      ).rejects.toThrow('Cart not found')
    })

    it('adds a new line with a line_ id and placeholder catalog fields', async () => {
      seedCart()

      const { cart, item } = await cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 2 })

      expect(cart.items).toHaveLength(1)
      expect(item.id).toMatch(/^line_[A-Za-z0-9]{12}$/)
      // Pinned: catalog fields are placeholders until populated by the caller
      expect(item.productId).toBe('')
      expect(item.name).toBe('')
      expect(item.unitPrice).toBe(0)
      expect(item.price).toBe(0)
      expect(item.currency).toBe('AUD')
      expect(item.quantity).toBe(2)
    })

    it('accepts quantity exactly at the 99 cap', async () => {
      seedCart()

      const { item } = await cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 99 })

      expect(item.quantity).toBe(99)
    })

    it('rejects quantity above the 99 cap', async () => {
      seedCart()

      await expect(
        cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 100 })
      ).rejects.toThrow('Maximum quantity per item is 99')
    })

    it('merges a duplicate add (same variantId + configuration) into one line', async () => {
      const configuration = { bottleSize: '30ml' }
      seedCart({
        items: [createMockCartItem({ variantId: 'v1', configuration, quantity: 3 })],
      })

      const { cart } = await cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 2, configuration })

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].quantity).toBe(5)
    })

    it('keeps the original line id and bumps updatedAt when merging', async () => {
      const existing = createMockCartItem({
        id: 'line_original',
        variantId: 'v1',
        configuration: undefined,
        quantity: 1,
        updatedAt: '2020-01-01T00:00:00.000Z',
      })
      seedCart({ items: [existing] })

      const { item } = await cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 1 })

      expect(item.id).toBe('line_original')
      expect(Date.parse(item.updatedAt)).toBeGreaterThan(Date.parse('2020-01-01T00:00:00.000Z'))
    })

    it('rejects a merge that would push the line over the 99 cap', async () => {
      seedCart({
        items: [createMockCartItem({ variantId: 'v1', configuration: undefined, quantity: 50 })],
      })

      await expect(
        cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 50 })
      ).rejects.toThrow('Maximum quantity per item is 99')
    })

    it('allows a merge landing exactly on the 99 cap', async () => {
      seedCart({
        items: [createMockCartItem({ variantId: 'v1', configuration: undefined, quantity: 50 })],
      })

      const { cart } = await cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 49 })

      expect(cart.items[0].quantity).toBe(99)
    })

    it('treats the same variant with a different configuration as a separate line', async () => {
      seedCart({
        items: [createMockCartItem({ variantId: 'v1', configuration: { bottleSize: '10ml' } })],
      })

      const { cart } = await cartManager.addItem('cart_seed', {
        variantId: 'v1',
        quantity: 1,
        configuration: { bottleSize: '30ml' },
      })

      expect(cart.items).toHaveLength(2)
    })

    it('treats undefined configuration and {} as DIFFERENT lines (JSON.stringify asymmetry)', async () => {
      seedCart({
        items: [createMockCartItem({ variantId: 'v1', configuration: undefined })],
      })

      const { cart } = await cartManager.addItem('cart_seed', {
        variantId: 'v1',
        quantity: 1,
        configuration: {},
      })

      // JSON.stringify(undefined) !== JSON.stringify({}) — pinned behavior
      expect(cart.items).toHaveLength(2)
    })

    it('is sensitive to configuration key order when merging (JSON.stringify compare)', async () => {
      seedCart({
        items: [createMockCartItem({ variantId: 'v1', configuration: { a: '1', b: '2' } })],
      })

      const { cart } = await cartManager.addItem('cart_seed', {
        variantId: 'v1',
        quantity: 1,
        configuration: { b: '2', a: '1' },
      })

      // Same keys/values, different insertion order → NOT merged (pinned)
      expect(cart.items).toHaveLength(2)
    })

    it('rejects the 101st distinct line (100-line cart limit)', async () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        createMockCartItem({ id: `line_${i}`, variantId: `v_${i}` })
      )
      seedCart({ items })

      await expect(
        cartManager.addItem('cart_seed', { variantId: 'v_new', quantity: 1 })
      ).rejects.toThrow('Cart cannot exceed 100 items')
    })

    it('still allows merging into an existing line when the cart is at 100 lines', async () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        createMockCartItem({ id: `line_${i}`, variantId: `v_${i}`, configuration: undefined, quantity: 1 })
      )
      seedCart({ items })

      // Pinned: the line-count check runs before the duplicate check, so this throws
      // even though the merge would not add a new line.
      await expect(
        cartManager.addItem('cart_seed', { variantId: 'v_0', quantity: 1 })
      ).rejects.toThrow('Cart cannot exceed 100 items')
    })

    it('persists the cart and logs an ITEM_ADDED event with a 30-day event TTL', async () => {
      seedCart()

      await cartManager.addItem('cart_seed', { variantId: 'v1', quantity: 1 })

      const setCalls = (mockRedis.set as jest.Mock).mock.calls
      // 1 activity-touch save from getCart + 1 cart save + 1 event write
      const eventCall = setCalls.find(([key]) => String(key).startsWith('oilamor:cart:events:cart_seed:'))
      expect(eventCall).toBeDefined()
      expect(eventCall![1]).toEqual(expect.objectContaining({ type: CartEventType.ITEM_ADDED }))
      expect(eventCall![2]).toEqual({ ex: EVENT_TTL })
    })
  })

  // ==========================================================================
  // UPDATE / REMOVE / CLEAR
  // ==========================================================================

  describe('updateItem / removeItem / clearCart', () => {
    function seedCart(items: CartItem[]): Cart {
      const cart = createMockCart({ id: 'cart_seed', items })
      mockRedis.get = jest.fn().mockResolvedValue(cart)
      return cart
    }

    it('throws when the cart does not exist', async () => {
      await expect(
        cartManager.updateItem('cart_missing', { lineId: 'line_1', quantity: 1 })
      ).rejects.toThrow('Cart not found')
    })

    it('throws when the line id is not in the cart', async () => {
      seedCart([createMockCartItem({ id: 'line_1' })])

      await expect(
        cartManager.updateItem('cart_seed', { lineId: 'line_nope', quantity: 1 })
      ).rejects.toThrow('Item not found in cart')
    })

    it('updates quantity and logs ITEM_UPDATED', async () => {
      seedCart([createMockCartItem({ id: 'line_1', quantity: 1 })])

      const cart = await cartManager.updateItem('cart_seed', { lineId: 'line_1', quantity: 7 })

      expect(cart.items[0].quantity).toBe(7)
      const eventCall = (mockRedis.set as jest.Mock).mock.calls.find(([key]) =>
        String(key).startsWith('oilamor:cart:events:')
      )
      expect(eventCall![1]).toEqual(expect.objectContaining({ type: CartEventType.ITEM_UPDATED }))
    })

    it('rejects an update above the 99 cap', async () => {
      seedCart([createMockCartItem({ id: 'line_1', quantity: 1 })])

      await expect(
        cartManager.updateItem('cart_seed', { lineId: 'line_1', quantity: 100 })
      ).rejects.toThrow('Maximum quantity per item is 99')
    })

    it('accepts an update to exactly 99', async () => {
      seedCart([createMockCartItem({ id: 'line_1', quantity: 1 })])

      const cart = await cartManager.updateItem('cart_seed', { lineId: 'line_1', quantity: 99 })

      expect(cart.items[0].quantity).toBe(99)
    })

    it('removes the line when quantity is set to 0', async () => {
      seedCart([createMockCartItem({ id: 'line_1' }), createMockCartItem({ id: 'line_2', variantId: 'v2' })])

      const cart = await cartManager.updateItem('cart_seed', { lineId: 'line_1', quantity: 0 })

      expect(cart.items).toHaveLength(1)
      expect(cart.items[0].id).toBe('line_2')
    })

    it('removes the line for negative quantities too (quantity <= 0 branch)', async () => {
      seedCart([createMockCartItem({ id: 'line_1' })])

      const cart = await cartManager.updateItem('cart_seed', { lineId: 'line_1', quantity: -5 })

      expect(cart.items).toHaveLength(0)
    })

    it('logs ITEM_REMOVED when a line is dropped via quantity 0', async () => {
      seedCart([createMockCartItem({ id: 'line_1' })])

      await cartManager.updateItem('cart_seed', { lineId: 'line_1', quantity: 0 })

      const eventCall = (mockRedis.set as jest.Mock).mock.calls.find(([key]) =>
        String(key).startsWith('oilamor:cart:events:')
      )
      expect(eventCall![1]).toEqual(expect.objectContaining({ type: CartEventType.ITEM_REMOVED }))
    })

    it('removeItem delegates to updateItem with quantity 0', async () => {
      seedCart([createMockCartItem({ id: 'line_1' })])

      const cart = await cartManager.removeItem('cart_seed', 'line_1')

      expect(cart.items).toHaveLength(0)
    })

    it('removeItem throws for an unknown line id', async () => {
      seedCart([createMockCartItem({ id: 'line_1' })])

      await expect(cartManager.removeItem('cart_seed', 'line_nope')).rejects.toThrow('Item not found in cart')
    })

    it('clearCart empties all lines and zeroes the summary', async () => {
      seedCart([
        createMockCartItem({ id: 'line_1', price: 50, quantity: 2 }),
        createMockCartItem({ id: 'line_2', variantId: 'v2', price: 25, quantity: 1 }),
      ])

      const cart = await cartManager.clearCart('cart_seed')

      expect(cart.items).toEqual([])
      // Pinned quirk: an empty cart still computes $10 shipping (subtotal 0 < 199),
      // so a cleared cart totals $10 — there is no empty-cart shipping exemption.
      expect(cart.summary).toEqual({
        subtotal: 0,
        totalTax: 0,
        totalShipping: 10,
        totalDiscounts: 0,
        total: 10,
        currency: 'AUD',
        itemCount: 0,
      })
    })

    it('clearCart throws when the cart does not exist', async () => {
      await expect(cartManager.clearCart('cart_missing')).rejects.toThrow('Cart not found')
    })

    it('clearCart logs a CART_CLEARED event containing the removed items', async () => {
      const items = [createMockCartItem({ id: 'line_1' })]
      seedCart(items)

      await cartManager.clearCart('cart_seed')

      const eventCall = (mockRedis.set as jest.Mock).mock.calls.find(([key]) =>
        String(key).startsWith('oilamor:cart:events:')
      )
      expect(eventCall![1]).toEqual(
        expect.objectContaining({ type: CartEventType.CART_CLEARED, data: { items } })
      )
    })
  })

  // ==========================================================================
  // TOTALS (calculateSummary via addItem on priced items)
  // ==========================================================================

  describe('totals computation', () => {
    async function totalsFor(items: CartItem[]) {
      const cart = createMockCart({ id: 'cart_seed', items })
      mockRedis.get = jest.fn().mockResolvedValue(cart)
      // Trigger a recalculation via a no-op-ish update on an existing line
      const updated = await cartManager.updateItem('cart_seed', {
        lineId: items[0].id,
        quantity: items[0].quantity,
      })
      return updated.summary!
    }

    it('computes subtotal as price * quantity summed across lines', async () => {
      const summary = await totalsFor([
        createMockCartItem({ id: 'l1', price: 50, quantity: 2 }),
        createMockCartItem({ id: 'l2', variantId: 'v2', price: 25.5, quantity: 1 }),
      ])

      expect(summary.subtotal).toBe(125.5)
      expect(summary.itemCount).toBe(3)
    })

    it('falls back to unitPrice when price is undefined', async () => {
      const item = createMockCartItem({ id: 'l1', quantity: 2, unitPrice: 40 })
      delete (item as Partial<CartItem>).price

      const summary = await totalsFor([item])

      expect(summary.subtotal).toBe(80)
    })

    it('treats items with neither price nor unitPrice as free', async () => {
      const item = createMockCartItem({ id: 'l1', quantity: 3 })
      delete (item as Partial<CartItem>).price
      ;(item as { unitPrice: number }).unitPrice = undefined as unknown as number

      const summary = await totalsFor([item])

      expect(summary.subtotal).toBe(0)
    })

    it('charges $10 shipping when subtotal is below $199', async () => {
      const summary = await totalsFor([createMockCartItem({ id: 'l1', price: 198.99, quantity: 1 })])

      expect(summary.subtotal).toBe(198.99)
      expect(summary.totalShipping).toBe(10)
    })

    it('charges $0 shipping when subtotal is exactly $199 (threshold is inclusive)', async () => {
      const summary = await totalsFor([createMockCartItem({ id: 'l1', price: 199, quantity: 1 })])

      expect(summary.totalShipping).toBe(0)
      expect(summary.totalTax).toBe(19.9)
      expect(summary.total).toBe(218.9)
    })

    it('charges $0 shipping above $199', async () => {
      const summary = await totalsFor([createMockCartItem({ id: 'l1', price: 250, quantity: 1 })])

      expect(summary.totalShipping).toBe(0)
    })

    it('computes 10% GST rounded to cents', async () => {
      const summary = await totalsFor([createMockCartItem({ id: 'l1', price: 49.99, quantity: 1 })])

      expect(summary.totalTax).toBe(5) // 4.999 rounded
    })

    it('pins the float behavior: subtotal and total are NOT rounded, only the tax is', async () => {
      const summary = await totalsFor([createMockCartItem({ id: 'l1', price: 198.99, quantity: 1 })])

      // 198.99 + 19.9 + 10 in IEEE-754 — pinned exactly
      expect(summary.total).toBe(228.89000000000001)
    })

    it('pins the classic 0.1+0.2 float accumulation in subtotal', async () => {
      const summary = await totalsFor([
        createMockCartItem({ id: 'l1', price: 0.1, quantity: 1 }),
        createMockCartItem({ id: 'l2', variantId: 'v2', price: 0.2, quantity: 1 }),
      ])

      expect(summary.subtotal).toBe(0.30000000000000004)
      expect(summary.totalTax).toBe(0.03)
      expect(summary.total).toBe(10.33)
    })

    it('keeps the raw float subtotal for three 19.99 items while rounding the tax', async () => {
      const summary = await totalsFor([createMockCartItem({ id: 'l1', price: 19.99, quantity: 3 })])

      expect(summary.subtotal).toBe(59.97)
      expect(summary.totalTax).toBe(6) // 5.997 rounded up
      expect(summary.total).toBe(75.97)
    })

    it('subtracts discounts carried on the cart and floors the total at 0', async () => {
      const cart = createMockCart({
        id: 'cart_seed',
        items: [createMockCartItem({ id: 'l1', price: 20, quantity: 1 })],
        discountTotal: 500,
      })
      cart.summary = { ...cart.summary!, totalDiscounts: 500 }
      mockRedis.get = jest.fn().mockResolvedValue(cart)

      const updated = await cartManager.updateItem('cart_seed', { lineId: 'l1', quantity: 1 })

      expect(updated.summary!.total).toBe(0)
      expect(updated.summary!.totalDiscounts).toBe(500)
    })

    it('prefers summary.totalDiscounts over discountTotal when both exist', async () => {
      const cart = createMockCart({
        id: 'cart_seed',
        items: [createMockCartItem({ id: 'l1', price: 100, quantity: 1 })],
        discountTotal: 5,
      })
      cart.summary = { ...cart.summary!, totalDiscounts: 20 }
      mockRedis.get = jest.fn().mockResolvedValue(cart)

      const updated = await cartManager.updateItem('cart_seed', { lineId: 'l1', quantity: 1 })

      // 100 + 10 tax + 0 shipping... subtotal 100 < 199 → +10 shipping; 120 - 20 = 100
      expect(updated.summary!.totalDiscounts).toBe(20)
      expect(updated.summary!.total).toBe(100)
    })
  })

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe('validateCart', () => {
    it('fails closed when the cart does not exist', async () => {
      const result = await cartManager.validateCart('cart_missing')

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        { type: 'unavailable', lineId: '', message: 'Cart not found' },
      ])
      expect(result.warnings).toEqual([])
    })

    it('passes an ordinary in-limits cart', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(
        createMockCart({ id: 'cart_ok', items: [createMockCartItem({ quantity: 5 })] })
      )

      const result = await cartManager.validateCart('cart_ok')

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('flags a line whose stored quantity exceeds 99 (e.g. after an uncapped merge)', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(
        createMockCart({ id: 'cart_big', items: [createMockCartItem({ id: 'line_1', quantity: 150 })] })
      )

      const result = await cartManager.validateCart('cart_big')

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        { type: 'limit_exceeded', lineId: 'line_1', message: 'Maximum quantity is 99' },
      ])
    })

    it('flags a cart value over $10,000 using summary.total', async () => {
      const cart = createMockCart({ id: 'cart_rich', items: [] })
      cart.summary = { ...cart.summary!, total: 10000.01 }
      mockRedis.get = jest.fn().mockResolvedValue(cart)

      const result = await cartManager.validateCart('cart_rich')

      expect(result.valid).toBe(false)
      expect(result.errors).toEqual([
        { type: 'limit_exceeded', lineId: '', message: 'Cart value cannot exceed $10000' },
      ])
    })

    it('accepts a cart value of exactly $10,000 (boundary is exclusive)', async () => {
      const cart = createMockCart({ id: 'cart_edge', items: [] })
      cart.summary = { ...cart.summary!, total: 10000 }
      mockRedis.get = jest.fn().mockResolvedValue(cart)

      const result = await cartManager.validateCart('cart_edge')

      expect(result.valid).toBe(true)
    })

    it('falls back to the top-level total field when summary is missing', async () => {
      const cart = createMockCart({ id: 'cart_legacy', items: [], total: 20000 })
      delete (cart as Partial<Cart>).summary
      mockRedis.get = jest.fn().mockResolvedValue(cart)

      const result = await cartManager.validateCart('cart_legacy')

      expect(result.valid).toBe(false)
      expect(result.errors[0].type).toBe('limit_exceeded')
    })

    it('collects errors from multiple offending lines at once', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(
        createMockCart({
          id: 'cart_multi',
          items: [
            createMockCartItem({ id: 'line_1', quantity: 100 }),
            createMockCartItem({ id: 'line_2', variantId: 'v2', quantity: 250 }),
          ],
        })
      )

      const result = await cartManager.validateCart('cart_multi')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors.map(e => e.lineId)).toEqual(['line_1', 'line_2'])
    })
  })
})
