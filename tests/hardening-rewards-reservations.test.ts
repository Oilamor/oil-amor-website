/**
 * Hardening: credit reservation persistence (lib/rewards/customer-rewards.ts)
 *
 * Regression tests for the 2026-07-21 fix: saveProfileToStore never
 * persisted reservedCredit, so a reservation created in one process was
 * invisible to getAvailableCredit after a fresh profile fetch. The
 * reservation (with its expiry) now persists; released, committed and
 * expired reservations clear with the same 30-minute TTL semantics.
 *
 * Mock pattern mirrors lib/rewards/__tests__/hardening-customer-rewards.test.ts:
 * the shared Redis client (@/lib/redis/client) and the rewards-store are
 * backed by in-memory maps.
 */

// Map-backed Redis client (module under test uses the shared `redis` singleton).
const redisStore = new Map<string, string>()
const mockRedisInstance = {
  get: jest.fn((key: string) => {
    const raw = redisStore.get(key)
    return Promise.resolve(raw === undefined ? null : JSON.parse(raw))
  }),
  set: jest.fn((key: string, value: unknown, _options?: { ex?: number }) => {
    redisStore.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    return Promise.resolve(true)
  }),
  del: jest.fn((key: string) => {
    redisStore.delete(key)
    return Promise.resolve(true)
  }),
}
jest.mock('@/lib/redis/client', () => ({
  __esModule: true,
  redis: mockRedisInstance,
}))

// Map-backed rewards store (the "source of truth" persistence layer)
interface StoreRecord { [key: string]: unknown }
const rewardsStore = new Map<string, StoreRecord>()
jest.mock('@/lib/rewards/rewards-store', () => ({
  getCustomerRewardsData: (customerId: string) =>
    Promise.resolve({ ...(rewardsStore.get(customerId) ?? {}) }),
  updateCustomerRewardsData: (customerId: string, data: StoreRecord) => {
    rewardsStore.set(customerId, { ...(rewardsStore.get(customerId) ?? {}), ...data })
    return Promise.resolve()
  },
}))

jest.mock('@/lib/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

import {
  addAccountCredit,
  reserveCreditForCheckout,
  commitCreditReservation,
  releaseCreditReservation,
  getAvailableCredit,
  invalidateProfileCache,
} from '@/lib/rewards/customer-rewards'

const CUSTOMER = 'cust_reservation_test'

beforeEach(() => {
  redisStore.clear()
  rewardsStore.clear()
  jest.clearAllMocks()
  // Re-attach map-backed implementations cleared by clearAllMocks
  mockRedisInstance.get.mockImplementation((key: string) => {
    const raw = redisStore.get(key)
    return Promise.resolve(raw === undefined ? null : JSON.parse(raw))
  })
  mockRedisInstance.set.mockImplementation((key: string, value: unknown) => {
    redisStore.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    return Promise.resolve(true)
  })
  mockRedisInstance.del.mockImplementation((key: string) => {
    redisStore.delete(key)
    return Promise.resolve(true)
  })
})

describe('credit reservation persistence (2026-07-21 fix)', () => {
  it('persists the reservation (with expiry) and reflects it on a fresh fetch', async () => {
    await addAccountCredit(CUSTOMER, 100, 'test credit')
    const { reservationId } = await reserveCreditForCheckout(CUSTOMER, 40)
    expect(reservationId).toBeTruthy()

    // The reservation and its 30-minute expiry are now in the store…
    expect(rewardsStore.get(CUSTOMER)).toMatchObject({ reserved_credit: 40 })
    expect(typeof rewardsStore.get(CUSTOMER)?.reserved_credit_expires_at).toBe('string')

    // …so a fresh profile fetch (simulated by dropping the cached profile)
    // subtracts it. Previously this returned 100 — the reservation vanished.
    await invalidateProfileCache(CUSTOMER)
    expect(await getAvailableCredit(CUSTOMER)).toBe(60)
  })

  it('released reservations clear the persisted reservation', async () => {
    await addAccountCredit(CUSTOMER, 100, 'test credit')
    const { reservationId } = await reserveCreditForCheckout(CUSTOMER, 40)
    expect(await getAvailableCredit(CUSTOMER)).toBe(60)

    await releaseCreditReservation(reservationId)

    await invalidateProfileCache(CUSTOMER)
    expect(await getAvailableCredit(CUSTOMER)).toBe(100)
    expect(rewardsStore.get(CUSTOMER)).toMatchObject({ reserved_credit: 0 })
  })

  it('committed reservations stay deducted from the balance', async () => {
    await addAccountCredit(CUSTOMER, 100, 'test credit')
    const { reservationId } = await reserveCreditForCheckout(CUSTOMER, 40)
    await commitCreditReservation(reservationId)

    await invalidateProfileCache(CUSTOMER)
    expect(await getAvailableCredit(CUSTOMER)).toBe(60)
    expect(rewardsStore.get(CUSTOMER)).toMatchObject({ account_credit: 60, reserved_credit: 0 })
  })

  it('expired reservations clear on read (30-minute TTL semantics)', async () => {
    await addAccountCredit(CUSTOMER, 100, 'test credit')
    await reserveCreditForCheckout(CUSTOMER, 40)
    expect(await getAvailableCredit(CUSTOMER)).toBe(60)

    // Advance past the 30-minute reservation window; the next read (even a
    // cache hit) must treat the reservation as expired.
    const realNow = Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => realNow + 31 * 60 * 1000)

    expect(await getAvailableCredit(CUSTOMER)).toBe(100)
  })
})
