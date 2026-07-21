/**
 * Hardening Tests — Cart Merge (guest → customer)
 *
 * Pins CartManager.mergeCarts (lib/cart/cart-manager.ts) which backs
 * POST /api/cart/merge:
 *  - dedupe key is variantId + JSON.stringify(configuration) ONLY
 *    (customMix/attachment fields are ignored by the merge key)
 *  - matched lines get quantities ADDED with NO 99-cap re-check
 *  - unmatched lines are copied with a fresh line_ id
 *  - the source (guest) cart is deleted only when a merge actually happened
 */

import { CartManager } from '../cart-manager'
import { CartEventType, type Cart } from '../types'
import { Redis } from '@upstash/redis'
import { createMockCart, createMockCartItem } from '@/lib/test-utils'

describe('CartManager.mergeCarts hardening', () => {
  let cartManager: CartManager
  let mockRedis: jest.Mocked<Redis>

  const GUEST_KEY = 'oilamor:cart:cart_guest'
  const USER_KEY = 'oilamor:cart:cart_user'

  function seed(source: Cart | null, target: Cart | null) {
    mockRedis.get = jest
      .fn()
      .mockImplementation((key: string) =>
        Promise.resolve(key === GUEST_KEY ? source : key === USER_KEY ? target : null)
      )
  }

  beforeEach(() => {
    mockRedis = new Redis({ url: 'http://localhost', token: 'test' }) as jest.Mocked<Redis>
    mockRedis.set = jest.fn().mockResolvedValue('OK')
    mockRedis.del = jest.fn().mockResolvedValue(1)
    cartManager = new CartManager(mockRedis)
  })

  it('throws when the target (customer) cart does not exist', async () => {
    seed(createMockCart({ id: 'cart_guest' }), null)

    await expect(cartManager.mergeCarts('cart_guest', 'cart_user')).rejects.toThrow(
      'Target cart not found'
    )
  })

  it('returns the target untouched when the source cart is gone', async () => {
    const target = createMockCart({ id: 'cart_user', items: [createMockCartItem({ id: 'line_u1' })] })
    seed(null, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(mockRedis.del).not.toHaveBeenCalled()
  })

  it('returns the target and does NOT delete an empty source cart (early return)', async () => {
    const source = createMockCart({ id: 'cart_guest', items: [] })
    const target = createMockCart({ id: 'cart_user', items: [createMockCartItem({ id: 'line_u1' })] })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    // Pinned: deleteCart is only reached after a real merge
    expect(mockRedis.del).not.toHaveBeenCalled()
    const eventCall = (mockRedis.set as jest.Mock).mock.calls.find(([key]) =>
      String(key).startsWith('oilamor:cart:events:')
    )
    expect(eventCall).toBeUndefined()
  })

  it('adds quantities for lines matching on variantId + configuration', async () => {
    const config = { bottleSize: '30ml' }
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: config, quantity: 2 })],
    })
    const target = createMockCart({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: config, quantity: 3 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(5)
    expect(result.items[0].id).toBe('line_u1') // target line id kept
  })

  it('pins the missing cap: merged quantities may exceed 99 (60 + 60 = 120)', async () => {
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: undefined, quantity: 60 })],
    })
    const target = createMockCart({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: undefined, quantity: 60 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    // Pinned: mergeCarts never re-checks maxQuantityPerItem — the overflow is
    // only caught later by validateCart.
    expect(result.items[0].quantity).toBe(120)
  })

  it('keeps different bottle sizes of the same oil as separate lines', async () => {
    const source = createMockCart({
      id: 'cart_guest',
      items: [
        createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: { bottleSize: '10ml' } }),
      ],
    })
    const target = createMockCart({
      id: 'cart_user',
      items: [
        createMockCartItem({ id: 'line_u1', variantId: 'v1', configuration: { bottleSize: '30ml' } }),
      ],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(2)
  })

  it('copies unmatched lines with a FRESH line id, not the source line id', async () => {
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_guest_orig', variantId: 'v_new', configuration: { bottleSize: '5ml' } })],
    })
    const target = createMockCart({ id: 'cart_user', items: [] })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).not.toBe('line_guest_orig')
    expect(result.items[0].id).toMatch(/^line_[A-Za-z0-9]{12}$/)
    expect(result.items[0].variantId).toBe('v_new')
  })

  it('ignores customMix when deduping — same variantId + configuration merges mixes', async () => {
    const mixA = { recipeName: 'A', mode: 'pure', oils: [], totalVolume: 30, safetyScore: 90, safetyRating: 'safe', safetyWarnings: [], labCertified: false }
    const mixB = { ...mixA, recipeName: 'B' }
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v_mix', configuration: undefined, quantity: 1, customMix: mixA })],
    })
    const target = createMockCart({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v_mix', configuration: undefined, quantity: 1, customMix: mixB })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    // Pinned: the merge key does not include customMix, so two DIFFERENT blends
    // on the same variant collapse into one line with combined quantity.
    expect(result.items).toHaveLength(1)
    expect(result.items[0].quantity).toBe(2)
    expect(result.items[0].customMix).toEqual(mixB) // target's mix survives
  })

  it('merges multiple source lines in one pass, matching and copying as needed', async () => {
    const config = { bottleSize: '30ml' }
    const source = createMockCart({
      id: 'cart_guest',
      items: [
        createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: config, quantity: 1 }),
        createMockCartItem({ id: 'line_g2', variantId: 'v2', configuration: undefined, quantity: 2 }),
        createMockCartItem({ id: 'line_g3', variantId: 'v3', configuration: { bottleSize: '5ml' }, quantity: 3 }),
      ],
    })
    const target = createMockCart({
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

  it('recalculates the summary after merging', async () => {
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: undefined, quantity: 1, price: 50 })],
    })
    const target = createMockCart({
      id: 'cart_user',
      items: [createMockCartItem({ id: 'line_u1', variantId: 'v2', configuration: { bottleSize: '10ml' }, quantity: 1, price: 30 })],
    })
    seed(source, target)

    const result = await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(result.summary!.subtotal).toBe(80)
    expect(result.summary!.itemCount).toBe(2)
    expect(result.summary!.totalTax).toBe(8)
    expect(result.summary!.totalShipping).toBe(10) // under $199
  })

  it('deletes the source cart from Redis after a successful merge', async () => {
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1' })],
    })
    const target = createMockCart({ id: 'cart_user', items: [] })
    seed(source, target)

    await cartManager.mergeCarts('cart_guest', 'cart_user')

    expect(mockRedis.del).toHaveBeenCalledWith(GUEST_KEY)
  })

  it('persists the merged target cart and logs a CART_MERGED event', async () => {
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1' })],
    })
    const target = createMockCart({ id: 'cart_user', customerId: 'cust_1', items: [] })
    seed(source, target)

    await cartManager.mergeCarts('cart_guest', 'cart_user')

    const cartSave = (mockRedis.set as jest.Mock).mock.calls.find(([key]) => key === USER_KEY)
    expect(cartSave).toBeDefined()

    const eventCall = (mockRedis.set as jest.Mock).mock.calls.find(([key]) =>
      String(key).startsWith('oilamor:cart:events:cart_user:')
    )
    expect(eventCall).toBeDefined()
    expect(eventCall![1]).toEqual(
      expect.objectContaining({
        type: CartEventType.CART_MERGED,
        cartId: 'cart_user',
        data: { sourceCartId: 'cart_guest', itemCount: 1 },
      })
    )
  })

  it('bumps updatedAt on the target cart and on matched lines', async () => {
    const config = { bottleSize: '30ml' }
    const source = createMockCart({
      id: 'cart_guest',
      items: [createMockCartItem({ id: 'line_g1', variantId: 'v1', configuration: config, quantity: 1 })],
    })
    const target = createMockCart({
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
})
