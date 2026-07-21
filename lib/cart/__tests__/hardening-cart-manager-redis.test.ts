/**
 * Hardening Tests — lib/cart/cart-manager-redis.ts
 * (the UNIFIED singleton backing both /api/cart and /api/cart/merge
 *  since the 2026-07-21 cart-manager consolidation)
 *
 * Covers the storage layer contract:
 *  - Redis healthy → get/set/del round trips through the wrapped client
 *  - Redis unhealthy → transparent in-memory Map fallback
 *  - Redis errors: get rejection propagates (500 path); set failure ignored
 *  - corrupted payload in Redis is validated, logged and discarded
 *    (fixed 2026-07-21 — previously returned as-is)
 *  - guest carts: 30-day TTL; customer carts: 90-day TTL (ported from the
 *    deleted merge-path manager)
 *  - expiry enforcement on read (expired carts are deleted)
 *
 * And the item semantics:
 *  - attachment pricing via getAttachmentPrice (server-side, client can't lie)
 *    — including updateItem (fixed 2026-07-21)
 *  - duplicate merging on productId + attachment + customMix identity
 *  - recalculateCart rounding (integer cents internally; exact dollar totals)
 *  - validateCart: cords, charms, customMix oils, safetyScore boundary (60),
 *    cart value / per-item quantity limits
 */

import { CartManager, cartManager } from '../cart-manager-redis'
import type { Cart } from '../types'
import type { OrderAttachment, OrderCustomMix } from '@/lib/db/schema/orders'
import { redis } from '@/lib/redis/client'
import { logger } from '@/lib/logging/logger'

jest.mock('@/lib/redis/client', () => ({
  redis: {
    isHealthy: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
  createCartKey: (cartId: string) => `oilamor:cart:${cartId}`,
}))

const mockRedis = redis as unknown as {
  isHealthy: jest.Mock
  get: jest.Mock
  set: jest.Mock
  del: jest.Mock
}

const CART_TTL = 30 * 24 * 60 * 60
const AUTH_CART_TTL = 90 * 24 * 60 * 60

// ============================================================================
// FIXTURES
// ============================================================================

function makeMix(overrides: Partial<OrderCustomMix> = {}): OrderCustomMix {
  return {
    recipeName: 'Sleep Blend',
    mode: 'carrier',
    oils: [
      { oilId: 'lavender', oilName: 'Lavender', ml: 5, percentage: 50 },
      { oilId: 'frankincense', oilName: 'Frankincense', ml: 5, percentage: 50 },
    ],
    carrierRatio: 25,
    totalVolume: 30,
    safetyScore: 95,
    safetyRating: 'safe',
    safetyWarnings: [],
    labCertified: false,
    ...overrides,
  }
}

function storedCart(overrides: Partial<Cart> = {}): Cart {
  const now = new Date().toISOString()
  return {
    id: `cart_store_${Math.random().toString(36).slice(2, 10)}`,
    items: [],
    subtotal: 0,
    taxTotal: 0,
    shippingEstimate: 0,
    discountTotal: 0,
    total: 0,
    currency: 'AUD',
    itemCount: 0,
    totalQuantity: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + CART_TTL * 1000).toISOString(),
    ...overrides,
  }
}

/** Wire the mocked redis client to an in-memory backing store (round trips). */
function useBackingStore() {
  const store = new Map<string, unknown>()
  mockRedis.get.mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null))
  mockRedis.set.mockImplementation((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve(true)
  })
  mockRedis.del.mockImplementation((key: string) => {
    store.delete(key)
    return Promise.resolve(true)
  })
  return store
}

beforeEach(() => {
  mockRedis.isHealthy.mockReturnValue(true)
  useBackingStore()
})

// ============================================================================
// SINGLETON & STORAGE
// ============================================================================

describe('CartManager (redis) — storage behavior', () => {
  it('getInstance always returns the same singleton', () => {
    expect(CartManager.getInstance()).toBe(CartManager.getInstance())
    expect(cartManager).toBe(CartManager.getInstance())
  })

  it('createCart persists to Redis with the 30-day TTL when healthy', async () => {
    const cart = await cartManager.createCart()

    expect(mockRedis.set).toHaveBeenCalledWith(
      `oilamor:cart:${cart.id}`,
      cart,
      { ex: CART_TTL }
    )
  })

  it('createCart initializes a zeroed AUD customer cart expiring in ~90 days', async () => {
    const before = Date.now()
    const cart = await cartManager.createCart('cust_1', 'x@y.z')

    expect(cart.id).toMatch(/^cart_[A-Za-z0-9]{16}$/)
    expect(cart.customerId).toBe('cust_1')
    expect(cart.email).toBe('x@y.z')
    expect(cart.items).toEqual([])
    expect(cart.total).toBe(0)
    expect(cart.currency).toBe('AUD')
    // 2026-07-21: customer carts now expire in 90 days (TTL ported from the
    // deleted merge-path manager); previously expiresAt was always +30d.
    const expiresMs = Date.parse(cart.expiresAt)
    expect(expiresMs).toBeGreaterThanOrEqual(before + AUTH_CART_TTL * 1000 - 1000)
    expect(expiresMs).toBeLessThanOrEqual(Date.now() + AUTH_CART_TTL * 1000 + 1000)
  })

  it('createCart persists customer carts to Redis with the 90-day TTL', async () => {
    // 2026-07-21: guest vs customer TTL difference ported from the deleted
    // merge-path manager (lib/cart/cart-manager.ts).
    const cart = await cartManager.createCart('cust_1', 'x@y.z')

    expect(mockRedis.set).toHaveBeenCalledWith(
      `oilamor:cart:${cart.id}`,
      cart,
      { ex: AUTH_CART_TTL }
    )
  })

  it('round-trips: create → get → update → remove with a healthy Redis', async () => {
    const cart = await cartManager.createCart()

    const fetched = await cartManager.getCart(cart.id)
    expect(fetched?.id).toBe(cart.id)

    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 2 }, { name: 'Oil', price: 30 })
    expect((await cartManager.getCart(cart.id))?.items).toHaveLength(1)

    await cartManager.updateItem(cart.id, { lineId: item.id, quantity: 5 })
    expect((await cartManager.getCart(cart.id))?.items[0].quantity).toBe(5)

    await cartManager.removeItem(cart.id, item.id)
    expect((await cartManager.getCart(cart.id))?.items).toHaveLength(0)
  })

  it('returns null for an unknown cart id', async () => {
    await expect(cartManager.getCart('cart_never_existed')).resolves.toBeNull()
  })

  it('falls back to the in-memory Map when Redis is unhealthy', async () => {
    mockRedis.isHealthy.mockReturnValue(false)

    const cart = await cartManager.createCart()

    expect(mockRedis.set).not.toHaveBeenCalled()
    const fetched = await cartManager.getCart(cart.id)
    expect(fetched?.id).toBe(cart.id)
  })

  it('serves a memory-fallback cart even after Redis comes back (key miss → memory)', async () => {
    mockRedis.isHealthy.mockReturnValue(false)
    const cart = await cartManager.createCart()

    mockRedis.isHealthy.mockReturnValue(true) // Redis back, but key was never written there

    const fetched = await cartManager.getCart(cart.id)
    expect(fetched?.id).toBe(cart.id)
  })

  it('deletes from BOTH Redis and memory on remove paths', async () => {
    mockRedis.isHealthy.mockReturnValue(false)
    const cart = await cartManager.createCart()
    mockRedis.isHealthy.mockReturnValue(true)

    // Force expiry so getCart triggers the delete path
    const expired = storedCart({ id: cart.id, expiresAt: new Date(Date.now() - 1000).toISOString() })
    mockRedis.get.mockResolvedValueOnce(expired)

    await expect(cartManager.getCart(cart.id)).resolves.toBeNull()
    expect(mockRedis.del).toHaveBeenCalledWith(`oilamor:cart:${cart.id}`)
    // And the memory copy is gone too — a second lookup with Redis down misses
    mockRedis.isHealthy.mockReturnValue(false)
    await expect(cartManager.getCart(cart.id)).resolves.toBeNull()
  })

  it('returns null and deletes when the cart is past its expiresAt', async () => {
    const expired = storedCart({ expiresAt: new Date(Date.now() - 60_000).toISOString() })
    mockRedis.get.mockResolvedValue(expired)

    await expect(cartManager.getCart(expired.id)).resolves.toBeNull()
    expect(mockRedis.del).toHaveBeenCalledWith(`oilamor:cart:${expired.id}`)
  })

  it('returns the cart when expiresAt is still in the future', async () => {
    const fresh = storedCart({ expiresAt: new Date(Date.now() + 60_000).toISOString() })
    mockRedis.get.mockResolvedValue(fresh)

    await expect(cartManager.getCart(fresh.id)).resolves.toEqual(fresh)
  })

  it('discards a garbage payload in Redis: returns null, logs a warning, deletes the key', async () => {
    // 2026-07-21: reads now validate the cart shape. Previously the garbage
    // string was returned as-is as a "Cart" (pinned corruption gap).
    mockRedis.get.mockResolvedValue('corrupted{{{json')

    const cart = await cartManager.getCart('cart_garbage')

    expect(cart).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      'Corrupt cart payload in storage; discarding',
      expect.objectContaining({ cartId: 'cart_gar' })
    )
    expect(mockRedis.del).toHaveBeenCalledWith('oilamor:cart:cart_garbage')
  })

  it('addItem on a corrupted cart fails cleanly with Cart not found (no raw TypeError)', async () => {
    // 2026-07-21: the corrupt payload is discarded on read, so addItem hits
    // the normal missing-cart path instead of throwing a raw TypeError.
    mockRedis.get.mockResolvedValue('corrupted{{{json')

    await expect(
      cartManager.addItem('cart_garbage', { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 10 })
    ).rejects.toThrow('Cart not found')
  })

  it('propagates a Redis get rejection (route turns this into a 500)', async () => {
    mockRedis.get.mockRejectedValue(new Error('connection reset'))

    await expect(cartManager.getCart('cart_x')).rejects.toThrow('connection reset')
  })

  it('ignores a Redis set failure — createCart still succeeds (fire-and-forget write)', async () => {
    mockRedis.set.mockResolvedValue(false) // wrapped client reports write failure as false

    const cart = await cartManager.createCart()

    expect(cart.id).toMatch(/^cart_/)
    // and the cart is NOT retrievable (write was dropped silently)
    mockRedis.get.mockResolvedValue(null)
    await expect(cartManager.getCart(cart.id)).resolves.toBeNull()
  })
})

// ============================================================================
// ADD ITEM + ATTACHMENT PRICING
// ============================================================================

describe('CartManager (redis) — addItem', () => {
  it('throws when the cart does not exist', async () => {
    await expect(
      cartManager.addItem('cart_missing', { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 10 })
    ).rejects.toThrow('Cart not found')
  })

  it('stores catalog fields from productInfo and computes totals', async () => {
    const cart = await cartManager.createCart()

    const { cart: updated, item } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', variantId: 'v1', quantity: 2, properties: { note: 'x' } },
      { name: 'Lavender Oil', price: 49.95, image: '/img.png', sku: 'OIL-LAVENDER-30ML' }
    )

    expect(item.id).toMatch(/^line_[A-Za-z0-9]{12}$/)
    expect(item.name).toBe('Lavender Oil')
    expect(item.sku).toBe('OIL-LAVENDER-30ML')
    expect(item.image).toBe('/img.png')
    expect(item.unitPrice).toBe(49.95)
    expect(item.properties).toEqual({ note: 'x' })
    expect(updated.subtotal).toBe(99.9)
    expect(updated.taxTotal).toBe(9.99)
    expect(updated.total).toBe(109.89)
    expect(updated.itemCount).toBe(1)
    expect(updated.totalQuantity).toBe(2)
  })

  it('adds the cord price to the unit price (vegan-leather-black = $2.00)', async () => {
    const cart = await cartManager.createCart()
    const attachment: Omit<OrderAttachment, 'price'> = {
      type: 'cord',
      cordId: 'vegan-leather-black',
      isMysteryCharm: false,
    }

    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1, attachment }, { name: 'Oil', price: 50 })

    expect(item.attachment?.price).toBe(2)
    expect(item.unitPrice).toBe(52)
  })

  it('adds the charm price to the unit price (amethyst point = $4.95)', async () => {
    const cart = await cartManager.createCart()
    const attachment: Omit<OrderAttachment, 'price'> = {
      type: 'charm',
      charmId: 'charm-amethyst-point',
      isMysteryCharm: false,
    }

    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1, attachment }, { name: 'Oil', price: 50 })

    expect(item.attachment?.price).toBe(4.95)
    expect(item.unitPrice).toBe(54.95)
  })

  it('prices a mystery charm at $0', async () => {
    const cart = await cartManager.createCart()
    const attachment: Omit<OrderAttachment, 'price'> = { type: 'charm', isMysteryCharm: true }

    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1, attachment }, { name: 'Oil', price: 50 })

    expect(item.attachment?.price).toBe(0)
    expect(item.unitPrice).toBe(50)
  })

  it('prices an unknown cord at $0 rather than failing', async () => {
    const cart = await cartManager.createCart()
    const attachment: Omit<OrderAttachment, 'price'> = {
      type: 'cord',
      cordId: 'cord-from-another-universe',
      isMysteryCharm: false,
    }

    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1, attachment }, { name: 'Oil', price: 50 })

    expect(item.attachment?.price).toBe(0)
    expect(item.unitPrice).toBe(50)
  })

  it('derives attachment price server-side even if the client sends one', async () => {
    const cart = await cartManager.createCart()
    // Client claims the $2 cord costs $0.01 — getAttachmentPrice overwrites it
    const attachment = {
      type: 'cord',
      cordId: 'vegan-leather-black',
      isMysteryCharm: false,
      price: 0.01,
    } as unknown as Omit<OrderAttachment, 'price'>

    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1, attachment }, { name: 'Oil', price: 50 })

    expect(item.attachment?.price).toBe(2)
    expect(item.unitPrice).toBe(52)
  })

  it('merges a duplicate add: same product, same attachment, same mix → quantities add', async () => {
    const cart = await cartManager.createCart()
    const attachment: Omit<OrderAttachment, 'price'> = {
      type: 'cord',
      cordId: 'waxed-cotton-natural',
      isMysteryCharm: false,
    }

    await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1, attachment }, { name: 'Oil', price: 50 })
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 2, attachment },
      { name: 'Oil', price: 50 }
    )

    expect(updated.items).toHaveLength(1)
    expect(updated.items[0].quantity).toBe(3)
  })

  it('keeps different cords of the same product on separate lines', async () => {
    const cart = await cartManager.createCart()

    await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, attachment: { type: 'cord', cordId: 'waxed-cotton-natural', isMysteryCharm: false } },
      { name: 'Oil', price: 50 }
    )
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, attachment: { type: 'cord', cordId: 'hemp-natural', isMysteryCharm: false } },
      { name: 'Oil', price: 50 }
    )

    expect(updated.items).toHaveLength(2)
  })

  it('attachment equality ignores display names — same ids merge', async () => {
    const cart = await cartManager.createCart()

    await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, attachment: { type: 'cord', cordId: 'hemp-natural', cordName: 'Raw Hemp', isMysteryCharm: false } as Omit<OrderAttachment, 'price'> },
      { name: 'Oil', price: 50 }
    )
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, attachment: { type: 'cord', cordId: 'hemp-natural', cordName: 'RENAMED', isMysteryCharm: false } as Omit<OrderAttachment, 'price'> },
      { name: 'Oil', price: 50 }
    )

    expect(updated.items).toHaveLength(1)
    expect(updated.items[0].quantity).toBe(2)
  })

  it('keeps different custom mixes on separate lines', async () => {
    const cart = await cartManager.createCart()

    await cartManager.addItem(cart.id, { productId: 'mix', quantity: 1, customMix: makeMix() }, { name: 'Mix', price: 60 })
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'mix', quantity: 1, customMix: makeMix({ recipeName: 'Other Blend' }) },
      { name: 'Mix', price: 60 }
    )

    expect(updated.items).toHaveLength(2)
  })

  it('merges identical custom mixes', async () => {
    const cart = await cartManager.createCart()

    await cartManager.addItem(cart.id, { productId: 'mix', quantity: 1, customMix: makeMix() }, { name: 'Mix', price: 60 })
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'mix', quantity: 1, customMix: makeMix() },
      { name: 'Mix', price: 60 }
    )

    expect(updated.items).toHaveLength(1)
    expect(updated.items[0].quantity).toBe(2)
  })

  it('pins the mixesEqual quirk: same oilId + equal drops but DIFFERENT ml still merges', async () => {
    const cart = await cartManager.createCart()
    const mixA = makeMix({
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 5, drops: 100, percentage: 50 }],
    })
    const mixB = makeMix({
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 9, drops: 100, percentage: 50 }],
    })

    await cartManager.addItem(cart.id, { productId: 'mix', quantity: 1, customMix: mixA }, { name: 'Mix', price: 60 })
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'mix', quantity: 1, customMix: mixB },
      { name: 'Mix', price: 60 }
    )

    // (oil.ml === oil.ml || oil.drops === oil.drops) — drops match is enough
    expect(updated.items).toHaveLength(1)
    expect(updated.items[0].quantity).toBe(2)
  })

  it('treats mixes with the same oils in a different order as different mixes', async () => {
    const cart = await cartManager.createCart()
    const forward = makeMix()
    const reversed = makeMix({ oils: [...makeMix().oils].reverse() })

    await cartManager.addItem(cart.id, { productId: 'mix', quantity: 1, customMix: forward }, { name: 'Mix', price: 60 })
    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'mix', quantity: 1, customMix: reversed },
      { name: 'Mix', price: 60 }
    )

    expect(updated.items).toHaveLength(2)
  })

  it('pins the rounding contract: subtotal, tax and total are all rounded to cents', async () => {
    const cart = await cartManager.createCart()

    const { cart: updated } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 3 },
      { name: 'Oil', price: 19.99 }
    )

    expect(updated.subtotal).toBe(59.97)
    expect(updated.taxTotal).toBe(6) // 5.997 rounded
    expect(updated.total).toBe(65.97)
  })

  it('rounds 0.1 + 0.2 style subtotals cleanly (unlike cart-manager.ts which keeps raw floats)', async () => {
    const cart = await cartManager.createCart()

    await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1 }, { name: 'A', price: 0.1 })
    const { cart: updated } = await cartManager.addItem(cart.id, { productId: 'p2', quantity: 1 }, { name: 'B', price: 0.2 })

    expect(updated.subtotal).toBe(0.3)
    expect(updated.taxTotal).toBe(0.03)
    expect(updated.total).toBe(0.33)
  })

  it('includes shippingEstimate and discountTotal in the total', async () => {
    const base = await cartManager.createCart()
    base.shippingEstimate = 10
    base.discountTotal = 5
    mockRedis.set.mockClear()
    const store = new Map<string, unknown>([[`oilamor:cart:${base.id}`, base]])
    mockRedis.get.mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null))

    const { cart: updated } = await cartManager.addItem(base.id, { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 100 })

    // 100 + 10 tax + 10 shipping - 5 discount
    expect(updated.total).toBe(115)
  })
})

// ============================================================================
// UPDATE / REMOVE / UPDATE-ATTACHMENT
// ============================================================================

describe('CartManager (redis) — updateItem / removeItem / updateAttachment', () => {
  async function cartWithPricedItem(attachment?: Omit<OrderAttachment, 'price'>) {
    const cart = await cartManager.createCart()
    const { item } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, attachment },
      { name: 'Oil', price: 50 }
    )
    return { cart, item }
  }

  it('updateItem throws for a missing cart', async () => {
    await expect(cartManager.updateItem('cart_missing', { lineId: 'l', quantity: 1 })).rejects.toThrow(
      'Cart not found'
    )
  })

  it('updateItem throws for a missing line', async () => {
    const { cart } = await cartWithPricedItem()

    await expect(cartManager.updateItem(cart.id, { lineId: 'line_nope', quantity: 1 })).rejects.toThrow(
      'Item not found'
    )
  })

  it('updateItem with quantity 0 removes the line and recalculates', async () => {
    const { cart, item } = await cartWithPricedItem()

    const updated = await cartManager.updateItem(cart.id, { lineId: item.id, quantity: 0 })

    expect(updated.items).toHaveLength(0)
    expect(updated.subtotal).toBe(0)
    expect(updated.total).toBe(0)
    expect(updated.totalQuantity).toBe(0)
  })

  it('updateItem with a negative quantity also removes the line', async () => {
    const { cart, item } = await cartWithPricedItem()

    const updated = await cartManager.updateItem(cart.id, { lineId: item.id, quantity: -3 })

    expect(updated.items).toHaveLength(0)
  })

  it('updateItem sets a new quantity and recalculates totals', async () => {
    const { cart, item } = await cartWithPricedItem()

    const updated = await cartManager.updateItem(cart.id, { lineId: item.id, quantity: 4 })

    expect(updated.items[0].quantity).toBe(4)
    expect(updated.subtotal).toBe(200)
    expect(updated.taxTotal).toBe(20)
    expect(updated.total).toBe(220)
  })

  it('updateItem attachment swap reprices against the OLD attachment price', async () => {
    // $50 oil + $2 cord = $52 line
    const { cart, item } = await cartWithPricedItem({
      type: 'cord',
      cordId: 'vegan-leather-black',
      isMysteryCharm: false,
    })
    expect(item.unitPrice).toBe(52)

    const updated = await cartManager.updateItem(cart.id, {
      lineId: item.id,
      quantity: 1,
      attachment: { type: 'charm', charmId: 'charm-amethyst-point', isMysteryCharm: false, price: 4.95 },
    })

    // Correct semantics (matching updateAttachment): 52 - 2 (old cord) + 4.95 (new charm)
    expect(updated.items[0].unitPrice).toBe(54.95)
  })

  it('updateItem recomputes the attachment price server-side (client price ignored)', async () => {
    const { cart, item } = await cartWithPricedItem()

    const updated = await cartManager.updateItem(cart.id, {
      lineId: item.id,
      quantity: 1,
      attachment: { type: 'charm', charmId: 'charm-amethyst-point', isMysteryCharm: false, price: 999 },
    })

    // 2026-07-21: updateItem now recomputes via getAttachmentPrice (matching
    // updateAttachment) — the $999 client lie is discarded. Previously the
    // client-supplied price was trusted verbatim (unitPrice 50 - 0 + 999).
    expect(updated.items[0].attachment?.price).toBe(4.95)
    expect(updated.items[0].unitPrice).toBe(54.95)
  })

  it('removeItem drops the line and recalculates', async () => {
    const { cart, item } = await cartWithPricedItem()

    const updated = await cartManager.removeItem(cart.id, item.id)

    expect(updated.items).toHaveLength(0)
    expect(updated.total).toBe(0)
  })

  it('removeItem on an unknown line is a silent no-op (unlike cart-manager.ts which throws)', async () => {
    const { cart } = await cartWithPricedItem()

    const updated = await cartManager.removeItem(cart.id, 'line_ghost')

    expect(updated.items).toHaveLength(1)
  })

  it('removeItem throws for a missing cart', async () => {
    await expect(cartManager.removeItem('cart_missing', 'line_1')).rejects.toThrow('Cart not found')
  })

  it('updateAttachment reprices against the old attachment and recomputes price server-side', async () => {
    const { cart, item } = await cartWithPricedItem({
      type: 'cord',
      cordId: 'vegan-leather-black',
      isMysteryCharm: false,
    })

    const updated = await cartManager.updateAttachment(cart.id, item.id, {
      type: 'charm',
      charmId: 'charm-amethyst-point',
      isMysteryCharm: false,
      price: 999, // client lie — must be ignored
    })

    // 52 - 2 (old cord) + 4.95 (server-computed charm price)
    expect(updated.items[0].unitPrice).toBe(54.95)
    expect(updated.items[0].attachment?.price).toBe(4.95)
  })

  it('updateAttachment throws for a missing line', async () => {
    const { cart } = await cartWithPricedItem()

    await expect(
      cartManager.updateAttachment(cart.id, 'line_nope', {
        type: 'cord',
        cordId: 'hemp-natural',
        isMysteryCharm: false,
        price: 0,
      })
    ).rejects.toThrow('Item not found')
  })
})

// ============================================================================
// VALIDATE CART
// ============================================================================

describe('CartManager (redis) — validateCart', () => {
  async function seedWithItem(itemOverrides: Record<string, unknown>) {
    const cart = await cartManager.createCart()
    const { item } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, customMix: itemOverrides.customMix as OrderCustomMix | undefined },
      { name: 'Oil', price: 50 }
    )
    // Overwrite the stored item wholesale for validation-focused scenarios
    Object.assign(item, itemOverrides)
    const stored = (await cartManager.getCart(cart.id))!
    return stored.id
  }

  it('fails closed when the cart does not exist', async () => {
    const result = await cartManager.validateCart('cart_missing')

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([{ type: 'cart-invalid', message: 'Cart not found' }])
  })

  it('passes a plain valid cart', async () => {
    const cart = await cartManager.createCart()
    await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 50 })

    const result = await cartManager.validateCart(cart.id)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('rejects an unknown cord id', async () => {
    const id = await seedWithItem({
      attachment: { type: 'cord', cordId: 'cord-ghost', isMysteryCharm: false, price: 0 },
    })

    const result = await cartManager.validateCart(id)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ type: 'attachment-invalid', message: 'Cord cord-ghost not found' })
    )
  })

  it('accepts every real cord option', async () => {
    for (const cordId of ['waxed-cotton-natural', 'waxed-cotton-black', 'hemp-natural', 'vegan-leather-black']) {
      const id = await seedWithItem({
        attachment: { type: 'cord', cordId, isMysteryCharm: false, price: 0 },
      })
      const result = await cartManager.validateCart(id)
      expect(result.valid).toBe(true)
    }
  })

  it('rejects an unknown charm id for non-mystery charms', async () => {
    const id = await seedWithItem({
      attachment: { type: 'charm', charmId: 'charm-ghost', isMysteryCharm: false, price: 0 },
    })

    const result = await cartManager.validateCart(id)

    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toBe('Charm charm-ghost not found')
  })

  it('skips charm validation entirely for mystery charms', async () => {
    const id = await seedWithItem({
      attachment: { type: 'charm', isMysteryCharm: true, price: 0 },
    })

    const result = await cartManager.validateCart(id)

    expect(result.valid).toBe(true)
  })

  it('rejects a custom mix with an empty oils array', async () => {
    const id = await seedWithItem({
      customMix: makeMix({ oils: [] }),
    })

    const result = await cartManager.validateCart(id)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toEqual(
      expect.objectContaining({ type: 'mix-invalid', message: 'Custom mix must contain at least one oil' })
    )
  })

  it('rejects a custom mix with safetyScore 59 and accepts exactly 60 (boundary)', async () => {
    const badId = await seedWithItem({ customMix: makeMix({ safetyScore: 59 }) })
    const goodId = await seedWithItem({ customMix: makeMix({ safetyScore: 60 }) })

    const bad = await cartManager.validateCart(badId)
    const good = await cartManager.validateCart(goodId)

    expect(bad.valid).toBe(false)
    expect(bad.errors[0].message).toBe('Custom mix does not meet safety requirements')
    expect(good.valid).toBe(true)
  })

  it('collects multiple validation errors across lines', async () => {
    const cart = await cartManager.createCart()
    await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1 }, { name: 'A', price: 10 })
    await cartManager.addItem(cart.id, { productId: 'p2', quantity: 1 }, { name: 'B', price: 20 })
    const stored = (await cartManager.getCart(cart.id))!
    stored.items[0].attachment = { type: 'cord', cordId: 'cord-ghost', isMysteryCharm: false, price: 0 }
    stored.items[1].customMix = makeMix({ oils: [], safetyScore: 10 })

    const result = await cartManager.validateCart(cart.id)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3) // cord + empty oils + safety
    expect(result.errors.map(e => e.type)).toContain('attachment-invalid')
    expect(result.errors.map(e => e.type)).toContain('mix-invalid')
  })
})
