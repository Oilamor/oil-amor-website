/**
 * Hardening Tests — Cart Merge (guest → customer)
 *
 * Covers CartManager.mergeCarts on the UNIFIED cart manager
 * (lib/cart/cart-manager-redis.ts) which backs POST /api/cart/merge since the
 * 2026-07-21 consolidation (the old lib/cart/cart-manager.ts was deleted).
 *
 * Deliberate behavior changes from the legacy merge-path manager:
 *  - merged quantities are CAPPED at 99 per line (previously uncapped)
 *  - the line-identity key includes customMix + attachment discriminators
 *    (previously two different blends on the same variant collapsed into one)
 *  - totals are recomputed in integer cents on the top-level cart fields
 *    (subtotal/taxTotal/total) and the legacy summary mirror is refreshed
 *    when present; the manager does NOT auto-add shipping
 *  - corrupt/expired source carts are handled by the shared getCart path
 *
 * Redis is mocked at the lib/redis/client wrapper level (same pattern as
 * hardening-cart-manager-redis.test.ts).
 */

import { cartManager } from '../cart-manager-redis'
import type { Cart, CartItem } from '../types'
import type { OrderAttachment, OrderCustomMix } from '@/lib/db/schema/orders'
import { redis } from '@/lib/redis/client'
import { createMockCart, createMockCartItem } from '@/lib/test-utils'
import { CART_VERSION } from '@/lib/content/launch-pricing'

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

const GUEST_KEY = 'oilamor:cart:cart_guest'
const USER_KEY = 'oilamor:cart:cart_user'

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

function makeAttachment(overrides: Partial<OrderAttachment> = {}): OrderAttachment {
  return {
    type: 'cord',
    cordId: 'hemp-natural',
    isMysteryCharm: false,
    price: 1.5,
    ...overrides,
  }
}

/** createMockCart sets expiresAt to the current time — born expired for the
 * unified manager's read-time expiry check. Push it a day into the future. */
function mc(overrides: Partial<Cart> = {}): Cart {
  return createMockCart({
    version: CART_VERSION,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  })
}

/** Seed both carts behind the mocked wrapper (round trips through a Map). */
function seed(source: Cart | null, target: Cart | null) {
  const store = new Map<string, unknown>()
  if (source) store.set(GUEST_KEY, source)
  if (target) store.set(USER_KEY, target)
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
  jest.clearAllMocks()
  mockRedis.isHealthy.mockReturnValue(true)
})

describe('CartManager.mergeCarts hardening (unified manager)', () => {
  it('throws when the target (customer) cart does not exist', async () => {
    seed(mc({ id: 'cart_guest' }), null)

    await expect(cartManager.mergeCarts('cart_guest', 'cart_user')).rejects.toThrow(
      'Target cart not found'
    )
  })

  it('returns the target untouched when the source cart is gone', async () => {
    const target = mc({ id: 'cart_user', items: [createMockCartItem({ id: 'line_u1' })] })
    seed(null, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('returns the target and does NOT delete an empty source cart (early return)', async () => {
    const source = mc({ id: 'cart_guest', items: [] })
    const target = mc({ id: 'cart_user', items: [createMockCartItem({ id: 'line_u1' })] })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('adds quantities for lines matching on variantId + configuration', async () => {
    const config = { bottleSize: '30ml' }
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: config, quantity: 2 })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: config, quantity: 3 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(5)
    expect(result.items[0].id).toBe('line_u1') // target line id kept
  })

  it('caps merged quantities at 99 per line (60 + 60 → 99)', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: undefined, quantity: 60 })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: undefined, quantity: 60 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    // 2026-07-21: merge now enforces the 99-per-item cap. Previously the
    // combined quantity could reach 120 and was only caught by validateCart.
    expect(result.items[0].quantity).toBe(99)
  })

  it('clamps an over-limit source line to 99 when copied', async () => {
    // Legacy carts written before the cap can hold quantities > 99.
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v_new', configuration: undefined, quantity: 150 })],
    })
    const target = mc({ id: 'cart_user', items: [] })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items[0].quantity).toBe(99)
  })

  it('keeps different bottle sizes of the same oil as separate lines', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: { bottleSize: '10ml' } })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: { bottleSize: '30ml' } })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(2)
  })

  it('copies unmatched lines with a FRESH line id, not the source line id', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_guest_orig', variantId: 'v_new', configuration: { bottleSize: '5ml' } })],
    })
    const target = mc({ id: 'cart_user', items: [] })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).not.toBe('line_guest_orig')
    expect(result.items[0].id).toMatch(/^line_[A-Za-z0-9]{12}$/)
    expect(result.items[0].variantId).toBe('v_new')
  })

  it('keeps DIFFERENT custom mixes on the same variant as separate lines', async () => {
    const mixA = makeMix({ recipeName: 'A' })
    const mixB = makeMix({ recipeName: 'B' })
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v_mix', configuration: undefined, quantity: 1, customMix: mixA })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v_mix', configuration: undefined, quantity: 1, customMix: mixB })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    // 2026-07-21: the merge key now includes the customMix discriminator —
    // two different blends on the same variant stay separate lines.
    // Previously they collapsed into one line with combined quantity.
    expect(result.items).toHaveLength(2)
    expect(result.items.map(i => i.customMix?.recipeName).sort()).toEqual(['A', 'B'])
  })

  it('merges IDENTICAL custom mixes on the same variant into one line', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v_mix', configuration: undefined, quantity: 1, customMix: makeMix() })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v_mix', configuration: undefined, quantity: 2, customMix: makeMix() })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(3)
    expect(result.items[0].id).toBe('line_u1')
  })

  it('keeps different attachments on the same variant as separate lines', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({
        id: 'line_g1',
        variantId: 'v1',
        configuration: undefined,
        quantity: 1,
        attachment: makeAttachment({ cordId: 'hemp-natural' }),
      })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({
        id: 'line_u1',
        variantId: 'v1',
        configuration: undefined,
        quantity: 1,
        attachment: makeAttachment({ cordId: 'vegan-leather-black' }),
      })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(2)
  })

  it('merges multiple source lines in one pass, matching and copying as needed', async () => {
    const config = { bottleSize: '30ml' }
    const source = mc({
      id: 'cart_guest',
      items: [
        createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: config, quantity: 1 }),
        createMockCartItem({ id: 'line_g2', variantId: 'v2', configuration: undefined, quantity: 2 }),
        createMockCartItem({ id: 'line_g3', variantId: 'v3', configuration: { bottleSize: '5ml' }, quantity: 3 }),
      ],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: config, quantity: 1 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(3)
    expect(result.items[0].quantity).toBe(2) // matched v1
    expect(result.items[1].variantId).toBe('v2')
    expect(result.items[2].variantId).toBe('v3')
  })

  it('recalculates totals after merging (integer cents, no float artifacts)', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: undefined, quantity: 1, price: 50, unitPrice: 50 })],
    })
    const target = mc({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v2', configuration: { bottleSize: '10ml' }, quantity: 1, price: 30, unitPrice: 30 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    // 2026-07-21: totals land on the top-level cart fields (the unified
    // manager's model) — no auto-shipping, 10% GST on the subtotal.
    expect(result.subtotal).toBe(80)
    expect(result.taxTotal).toBe(8)
    expect(result.total).toBe(88)
    expect(result.totalQuantity).toBe(2)
    // The legacy summary mirror is refreshed when the cart carries one.
    expect(result.summary).toEqual({
      subtotal: 80,
      totalTax: 8,
      totalShipping: 0,
      totalDiscounts: 0,
      total: 88,
      currency: 'AUD',
      itemCount: 2,
    })
  })

  it('deletes the source cart from Redis after a successful merge', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1' })],
    })
    const target = mc({ id: 'cart_user', items: [] })
    seed(source, target)

    await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(mockRedis.del).toHaveBeenCalledWith(GUEST_KEY)
  })

  it('persists the merged target cart with the customer TTL', async () => {
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1' })],
    })
    const target = mc({ id: 'cart_user', customerId: 'cust_1', items: [] })
    seed(source, target)

    await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(mockRedis.set).toHaveBeenCalledWith(
      USER_KEY,
      expect.objectContaining({ id: 'cart_user' }),
      { ex: 90 * 24 * 60 * 60 }
    )
  })

  it('bumps updatedAt on the target cart and on matched lines', async () => {
    const config = { bottleSize: '30ml' }
    const source = mc({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: config, quantity: 1 })],
    })
    const target = mc({
      id: 'cart_user',
      updatedAt: '2020-01-01T00:00:00.000Z',
      items: [
        createMockCartItem({
          id: 'line_u1',
          variantId: 'v1',
          configuration: config,
          quantity: 1,
          updatedAt: '2020-01-01T00:00:00.000Z',
        }),
      ],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(Date.parse(result.updatedAt)).toBeGreaterThan(Date.parse('2020-01-01T00:00:00.000Z'))
    expect(Date.parse(result.items[0].updatedAt)).toBeGreaterThan(Date.parse('2020-01-01T00:00:00.000Z'))
  })

  it('discards a corrupt source cart and returns the target untouched', async () => {
    // 2026-07-21: corrupt payloads are treated as missing carts, so the merge
    // is a no-op instead of crashing on source.items.
    const store = new Map<string, unknown>([
      [GUEST_KEY, 'corrupted{{{json'],
      [USER_KEY, mc({ id: 'cart_user', items: [createMockCartItem({ id: 'line_u1' })] })],
    ])
    mockRedis.get.mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null))

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(mockRedis.del).toHaveBeenCalledWith(GUEST_KEY) // corrupt key cleaned up
  })
})
