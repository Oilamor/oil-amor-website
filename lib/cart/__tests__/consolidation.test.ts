/**
 * Consolidation Tests — ONE cart manager for both cart routes (2026-07-21)
 *
 * Proves the cart-manager consolidation:
 *  - app/api/cart/route.ts and app/api/cart/merge/route.ts both use the
 *    unified Redis-backed manager (lib/cart/cart-manager-redis.ts)
 *  - the legacy merge-path manager (lib/cart/cart-manager.ts) is gone
 *  - carts written through the main-path API (createCart/addItem) are
 *    readable by the merge path (mergeCarts) — same storage, keys, TTLs
 *
 * And pins the six bug fixes landed with the consolidation:
 *  a. mergeCarts enforces the 99-per-item cap
 *  b. totals are computed in integer cents (no 228.89000000000001 artifacts)
 *  c. corrupt Redis payloads are discarded (logged), not returned as carts
 *  d. updateItem recomputes attachment prices server-side
 *  e. an empty cart ships for $0 (a cleared cart totals $0, not $10)
 *  f. the merge key includes the customMix/attachment discriminator
 */

import fs from 'fs'
import path from 'path'
import { cartManager } from '../cart-manager-redis'
import type { OrderCustomMix } from '@/lib/db/schema/orders'
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

let store: Map<string, unknown>

beforeEach(() => {
  jest.clearAllMocks()
  mockRedis.isHealthy.mockReturnValue(true)
  store = new Map<string, unknown>()
  mockRedis.get.mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null))
  mockRedis.set.mockImplementation((key: string, value: unknown) => {
    store.set(key, value)
    return Promise.resolve(true)
  })
  mockRedis.del.mockImplementation((key: string) => {
    store.delete(key)
    return Promise.resolve(true)
  })
})

function makeMix(overrides: Partial<OrderCustomMix> = {}): OrderCustomMix {
  return {
    recipeName: 'Sleep Blend',
    mode: 'carrier',
    oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 5, percentage: 100 }],
    carrierRatio: 25,
    totalVolume: 30,
    safetyScore: 95,
    safetyRating: 'safe',
    safetyWarnings: [],
    labCertified: false,
    ...overrides,
  }
}

// ============================================================================
// THE CONSOLIDATION ITSELF
// ============================================================================

describe('cart-manager consolidation', () => {
  it('both cart routes import the unified manager module', () => {
    const root = process.cwd()
    const mainRoute = fs.readFileSync(path.join(root, 'app/api/cart/route.ts'), 'utf8')
    const mergeRoute = fs.readFileSync(path.join(root, 'app/api/cart/merge/route.ts'), 'utf8')

    expect(mainRoute).toContain("@/lib/cart/cart-manager-redis'")
    expect(mergeRoute).toContain("@/lib/cart/cart-manager-redis'")
    // No dangling reference to the deleted legacy manager (note the closing
    // quote — 'cart-manager-redis' must not satisfy this pattern).
    expect(mergeRoute).not.toContain("@/lib/cart/cart-manager'")
    expect(mainRoute).not.toContain("@/lib/cart/cart-manager'")
  })

  it('the legacy merge-path manager file no longer exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'lib/cart/cart-manager.ts'))).toBe(false)
  })

  it('carts written via the main-path API are mergeable through the same manager', async () => {
    // Guest cart built exactly the way POST /api/cart builds it…
    const guest = await cartManager.createCart()
    await cartManager.addItem(
      guest.id,
      { productId: 'p1', variantId: 'v1', quantity: 2 },
      { name: 'Lavender Oil', price: 49.95 }
    )
    // …and the customer cart the merge route would target.
    const user = await cartManager.createCart('cust_1', 'x@y.z')

    const merged = await cartManager.mergeCarts(guest.id, user.id)

    expect(merged.id).toBe(user.id)
    expect(merged.items).toHaveLength(1)
    expect(merged.items[0].name).toBe('Lavender Oil')
    expect(merged.items[0].quantity).toBe(2)
    // Guest cart is gone from the shared store.
    expect(await cartManager.getCart(guest.id)).toBeNull()
  })

  it('applies the guest/customer TTL difference ported from the legacy manager', async () => {
    const guestCart = await cartManager.createCart()
    const customerCart = await cartManager.createCart('cust_1')

    expect(mockRedis.set).toHaveBeenCalledWith(
      `oilamor:cart:${guestCart.id}`,
      guestCart,
      { ex: 30 * 24 * 60 * 60 }
    )
    expect(mockRedis.set).toHaveBeenCalledWith(
      `oilamor:cart:${customerCart.id}`,
      customerCart,
      { ex: 90 * 24 * 60 * 60 }
    )
  })
})

// ============================================================================
// REGRESSIONS FOR THE PINNED BUGS (a–f)
// ============================================================================

describe('regression a — mergeCarts enforces the 99-per-item cap', () => {
  it('60 + 60 merged into one line clamps to 99', async () => {
    const guest = await cartManager.createCart()
    await cartManager.addItem(guest.id, { productId: 'p1', variantId: 'v1', quantity: 60 }, { name: 'Oil', price: 10 })
    const user = await cartManager.createCart('cust_1')
    await cartManager.addItem(user.id, { productId: 'p1', variantId: 'v1', quantity: 60 }, { name: 'Oil', price: 10 })

    const merged = await cartManager.mergeCarts(guest.id, user.id)

    expect(merged.items).toHaveLength(1)
    expect(merged.items[0].quantity).toBe(99)
  })
})

describe('regression b — money is computed in integer cents', () => {
  it('0.1 + 0.2 subtotal is exactly 0.3', async () => {
    const cart = await cartManager.createCart()
    await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1 }, { name: 'A', price: 0.1 })
    const { cart: updated } = await cartManager.addItem(cart.id, { productId: 'p2', quantity: 1 }, { name: 'B', price: 0.2 })

    expect(updated.subtotal).toBe(0.3)
    expect(updated.taxTotal).toBe(0.03)
    expect(updated.total).toBe(0.33)
  })

  it('a $198.99 cart totals exactly 218.89 — no 228.89000000000001-style artifacts', async () => {
    const cart = await cartManager.createCart()
    const { cart: updated } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 198.99 })

    expect(updated.subtotal).toBe(198.99)
    expect(updated.taxTotal).toBe(19.9)
    expect(updated.total).toBe(218.89)
  })

  it('three $19.99 items give an exact 59.97 / 6.00 / 65.97', async () => {
    const cart = await cartManager.createCart()
    const { cart: updated } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 3 }, { name: 'Oil', price: 19.99 })

    expect(updated.subtotal).toBe(59.97)
    expect(updated.taxTotal).toBe(6)
    expect(updated.total).toBe(65.97)
  })
})

describe('regression c — corrupt Redis payloads are discarded', () => {
  it('getCart returns null and logs a warning for garbage JSON', async () => {
    store.set('oilamor:cart:cart_garbage', 'corrupted{{{json')

    await expect(cartManager.getCart('cart_garbage')).resolves.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      'Corrupt cart payload in storage; discarding',
      expect.objectContaining({ cartId: 'cart_gar' })
    )
  })

  it('addItem on a corrupt cart throws a clean Error, not a raw TypeError', async () => {
    store.set('oilamor:cart:cart_garbage', 'corrupted{{{json')

    await expect(
      cartManager.addItem('cart_garbage', { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 10 })
    ).rejects.toThrow('Cart not found')
  })

  it('a structurally invalid cart object (no items array) is also discarded', async () => {
    store.set('oilamor:cart:cart_broken', { id: 'cart_broken', items: 'not-an-array' })

    await expect(cartManager.getCart('cart_broken')).resolves.toBeNull()
  })
})

describe('regression d — updateItem recomputes attachment prices server-side', () => {
  it('ignores a client-supplied price of $999 on an attachment swap', async () => {
    const cart = await cartManager.createCart()
    const { item } = await cartManager.addItem(
      cart.id,
      { productId: 'p1', quantity: 1, attachment: { type: 'cord', cordId: 'vegan-leather-black', isMysteryCharm: false } },
      { name: 'Oil', price: 50 }
    )
    expect(item.unitPrice).toBe(52) // $50 oil + $2 cord

    const updated = await cartManager.updateItem(cart.id, {
      lineId: item.id,
      quantity: 1,
      attachment: { type: 'charm', charmId: 'charm-amethyst-point', isMysteryCharm: false, price: 999 },
    })

    // 52 - 2 (old cord) + 4.95 (server-computed charm), NOT + 999
    expect(updated.items[0].attachment?.price).toBe(4.95)
    expect(updated.items[0].unitPrice).toBe(54.95)
    expect(updated.total).toBeCloseTo(60.45, 2) // 54.95 + 5.50 GST (54.95*1.1 = 60.445)
  })
})

describe('regression e — an empty cart ships for $0', () => {
  it('clearing the last item zeroes the shipping estimate and the total', async () => {
    const cart = await cartManager.createCart()
    const { item } = await cartManager.addItem(cart.id, { productId: 'p1', quantity: 1 }, { name: 'Oil', price: 50 })

    // Simulate a shipping estimate persisted on the cart (e.g. from checkout).
    const stored = (await cartManager.getCart(cart.id))!
    stored.shippingEstimate = 10

    const cleared = await cartManager.updateItem(cart.id, { lineId: item.id, quantity: 0 })

    // Previously the legacy manager computed $10 shipping on an EMPTY cart
    // (subtotal 0 < $199 threshold) so a cleared cart totalled $10.
    expect(cleared.items).toHaveLength(0)
    expect(cleared.shippingEstimate).toBe(0)
    expect(cleared.subtotal).toBe(0)
    expect(cleared.taxTotal).toBe(0)
    expect(cleared.total).toBe(0)
  })

  it('a freshly created cart totals $0', async () => {
    const cart = await cartManager.createCart()

    expect(cart.shippingEstimate).toBe(0)
    expect(cart.total).toBe(0)
  })
})

describe('regression f — merge key includes the mix/attachment discriminator', () => {
  it('two different blends on the same variant survive the merge as two lines', async () => {
    const guest = await cartManager.createCart()
    await cartManager.addItem(
      guest.id,
      { productId: 'mix', variantId: 'v_mix', quantity: 1, customMix: makeMix({ recipeName: 'Calm' }) },
      { name: 'Custom Mix', price: 60 }
    )
    const user = await cartManager.createCart('cust_1')
    await cartManager.addItem(
      user.id,
      { productId: 'mix', variantId: 'v_mix', quantity: 1, customMix: makeMix({ recipeName: 'Energy' }) },
      { name: 'Custom Mix', price: 60 }
    )

    const merged = await cartManager.mergeCarts(guest.id, user.id)

    // Previously both blends collapsed into one line with quantity 2.
    expect(merged.items).toHaveLength(2)
    expect(merged.items.map(i => i.customMix?.recipeName).sort()).toEqual(['Calm', 'Energy'])
    expect(merged.items.every(i => i.quantity === 1)).toBe(true)
  })

  it('identical blends on the same variant still merge into one line', async () => {
    const guest = await cartManager.createCart()
    await cartManager.addItem(
      guest.id,
      { productId: 'mix', variantId: 'v_mix', quantity: 1, customMix: makeMix() },
      { name: 'Custom Mix', price: 60 }
    )
    const user = await cartManager.createCart('cust_1')
    await cartManager.addItem(
      user.id,
      { productId: 'mix', variantId: 'v_mix', quantity: 2, customMix: makeMix() },
      { name: 'Custom Mix', price: 60 }
    )

    const merged = await cartManager.mergeCarts(guest.id, user.id)

    expect(merged.items).toHaveLength(1)
    expect(merged.items[0].quantity).toBe(3)
  })
})
