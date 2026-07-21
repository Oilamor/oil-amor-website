/**
 * Hardening tests — Customer rewards profile (Redis-backed)
 *
 * Pins spend→tier math, order→points conversions, accountCredit add/use,
 * the credit reservation lifecycle, and the documented Redis persistence
 * behaviour. The shared Redis client (@/lib/redis/client, Upstash) and the
 * rewards-store are backed by in-memory maps; tiers/chains/charms use the
 * real configuration.
 */

// Map-backed Redis client (module under test uses the shared `redis` singleton).
// Mirrors @upstash/redis semantics: set() JSON-serializes non-string values,
// get() returns them parsed.
const redisStore = new Map<string, string>();
const mockRedisInstance = {
  get: jest.fn((key: string) => {
    const raw = redisStore.get(key);
    return Promise.resolve(raw === undefined ? null : JSON.parse(raw));
  }),
  set: jest.fn((key: string, value: unknown, _options?: { ex?: number }) => {
    redisStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    return Promise.resolve(true);
  }),
  del: jest.fn((key: string) => {
    redisStore.delete(key);
    return Promise.resolve(true);
  }),
};
jest.mock('@/lib/redis/client', () => ({
  __esModule: true,
  redis: mockRedisInstance,
}));

// Map-backed rewards store (the "source of truth" persistence layer)
interface StoreRecord { [key: string]: unknown }
const rewardsStore = new Map<string, StoreRecord>();
const mockGetRewardsData = jest.fn((customerId: string): Promise<StoreRecord> => {
  if (customerId === 'broken-customer') return Promise.reject(new Error('store read failed'));
  return Promise.resolve({ ...(rewardsStore.get(customerId) ?? {}) });
});
const mockUpdateRewardsData = jest.fn((customerId: string, data: StoreRecord) => {
  rewardsStore.set(customerId, { ...(rewardsStore.get(customerId) ?? {}), ...data });
  return Promise.resolve();
});
jest.mock('../rewards-store', () => ({
  getCustomerRewardsData: (customerId: string) => mockGetRewardsData(customerId),
  updateCustomerRewardsData: (customerId: string, data: StoreRecord) =>
    mockUpdateRewardsData(customerId, data),
}));

import {
  createDefaultProfile,
  getCustomerRewardsProfile,
  updateCustomerSpend,
  processOrderForRewards,
  upgradeCustomerTier,
  unlockRefillForCustomer,
  addAccountCredit,
  useAccountCredit,
  getAvailableCredit,
  getCreditHistory,
  reserveCreditForCheckout,
  commitCreditReservation,
  releaseCreditReservation,
  invalidateProfileCache,
  getBatchCustomerProfiles,
  type OrderInfo,
} from '../customer-rewards';

function makeOrder(overrides: Partial<OrderInfo> = {}): OrderInfo {
  return {
    orderId: 'order-1',
    orderTotal: 150,
    items: [{ productId: 'p1', productType: 'oil', quantity: 1, price: 150 }],
    isRefill: false,
    ...overrides,
  };
}

beforeEach(() => {
  redisStore.clear();
  rewardsStore.clear();
  jest.clearAllMocks();
  // Re-attach map-backed implementations cleared by clearAllMocks
  mockRedisInstance.get.mockImplementation((key: string) => {
    const raw = redisStore.get(key);
    return Promise.resolve(raw === undefined ? null : JSON.parse(raw));
  });
  mockRedisInstance.set.mockImplementation((key: string, value: unknown) => {
    redisStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    return Promise.resolve(true);
  });
  mockRedisInstance.del.mockImplementation((key: string) => {
    redisStore.delete(key);
    return Promise.resolve(true);
  });
  mockGetRewardsData.mockImplementation((customerId: string): Promise<StoreRecord> => {
    if (customerId === 'broken-customer') return Promise.reject(new Error('store read failed'));
    return Promise.resolve({ ...(rewardsStore.get(customerId) ?? {}) });
  });
  mockUpdateRewardsData.mockImplementation((customerId: string, data: StoreRecord) => {
    rewardsStore.set(customerId, { ...(rewardsStore.get(customerId) ?? {}), ...data });
    return Promise.resolve();
  });
});

// ---------------------------------------------------------------------------
// createDefaultProfile
// ---------------------------------------------------------------------------

describe('createDefaultProfile', () => {
  it('starts every customer as a zeroed Seed', () => {
    const profile = createDefaultProfile('cust-1');

    expect(profile).toMatchObject({
      customerId: 'cust-1',
      currentTier: 'seed',
      totalSpend: 0,
      lifetimePurchases: 0,
      purchaseCount: 0,
      unlockedChains: [],
      unlockedCharms: [],
      accountCredit: 0,
      reservedCredit: 0,
      refillDiscount: 0,
      refillUnlocked: false,
      creditHistory: [],
    });
    expect(profile.progressToNextTier).toMatchObject({
      target: 150,
      percentage: 0,
      amountNeeded: 150,
      nextTierName: 'Sprout',
    });
  });
});

// ---------------------------------------------------------------------------
// getCustomerRewardsProfile — persistence & caching
// ---------------------------------------------------------------------------

describe('getCustomerRewardsProfile', () => {
  it('builds a default seed profile for an unknown customer', async () => {
    const profile = await getCustomerRewardsProfile('new-customer');

    expect(profile.currentTier).toBe('seed');
    expect(profile.totalSpend).toBe(0);
    expect(profile.purchaseCount).toBe(0);
  });

  it('hydrates from persisted rewards data', async () => {
    rewardsStore.set('cust-1', {
      crystal_circle_tier: 'bloom',
      total_spend: 400,
      purchase_count: 3,
      account_credit: 250,
      refill_unlocked: true,
    });

    const profile = await getCustomerRewardsProfile('cust-1');

    expect(profile).toMatchObject({
      currentTier: 'bloom',
      totalSpend: 400,
      lifetimePurchases: 400,
      purchaseCount: 3,
      accountCredit: 250,
      refillUnlocked: true,
      refillDiscount: 0, // bloom has no refill discount
    });
    // chains fall back to the tier config when not persisted
    expect(profile.unlockedChains).toEqual(['silver-plated', 'gold-plated']);
  });

  it('caches the profile for an hour and serves the second read from cache', async () => {
    await getCustomerRewardsProfile('cust-1');
    await getCustomerRewardsProfile('cust-1');

    expect(mockGetRewardsData).toHaveBeenCalledTimes(1);
    expect(mockRedisInstance.set).toHaveBeenCalledWith(
      'rewards:customer:cust-1',
      expect.any(Object),
      { ex: 3600 }
    );
  });

  it('invalidateProfileCache forces a store re-read', async () => {
    await getCustomerRewardsProfile('cust-1');
    await invalidateProfileCache('cust-1');
    await getCustomerRewardsProfile('cust-1');

    expect(mockGetRewardsData).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// updateCustomerSpend — order value → tier math
// ---------------------------------------------------------------------------

describe('updateCustomerSpend', () => {
  it('a $150 order lifts a new customer from Seed to Sprout', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 150 }));

    expect(result.profile.totalSpend).toBe(150);
    expect(result.profile.currentTier).toBe('sprout');
    expect(result.tierUpgraded).toBe(true);
    expect(result.previousTier).toBe('seed');
    expect(result.profile.purchaseCount).toBe(1);
    expect(result.notifications.some(n => n.type === 'tier_upgrade' && n.title === 'Welcome to Sprout!')).toBe(true);
  });

  it('unlocks the silver-plated chain on reaching Sprout', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 150 }));

    expect(result.newChainsUnlocked).toContain('silver-plated');
    expect(result.profile.unlockedChains).toContain('silver-plated');
    expect(result.notifications.some(n => n.type === 'chain_unlock')).toBe(true);
  });

  it('persists the new totals to the rewards store', async () => {
    await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 150 }));

    expect(mockUpdateRewardsData).toHaveBeenCalledWith('cust-1', expect.objectContaining({
      crystal_circle_tier: 'sprout',
      total_spend: 150,
      purchase_count: 1,
    }));
    expect(rewardsStore.get('cust-1')).toMatchObject({ total_spend: 150, purchase_count: 1 });
  });

  it('a single large order crosses multiple tiers and reports them all', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 1600 }));

    expect(result.profile.currentTier).toBe('luminary');
    expect(result.tierUpgraded).toBe(true);
    const upgrade = result.notifications.find(n => n.type === 'tier_upgrade');
    expect(upgrade?.title).toBe('Multi-Tier Ascension!');
    expect(upgrade?.metadata.tiersCrossed).toEqual(['sprout', 'bloom', 'radiance', 'luminary']);
  });

  it('Luminary collapses charms to the "all" unlock and grants 15% refill discount', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 1600 }));

    expect(result.profile.unlockedCharms).toEqual(['all']);
    expect(result.profile.refillDiscount).toBe(15);
    // the synthetic "all" charm must not produce a charm_unlock notification
    expect(result.notifications.some(n => n.type === 'charm_unlock' && n.metadata.charmId === 'all')).toBe(false);
  });

  it('stays in tier when the order does not cross a threshold', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'seed', total_spend: 100, purchase_count: 1 });

    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 20 }));

    expect(result.profile.currentTier).toBe('seed');
    expect(result.tierUpgraded).toBe(false);
    expect(result.notifications.some(n => n.type === 'tier_upgrade')).toBe(false);
    expect(result.profile.totalSpend).toBe(120);
  });

  it('EDGE: a $0 order still counts as a purchase but never upgrades', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'seed', total_spend: 100, purchase_count: 1 });

    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 0 }));

    expect(result.profile.totalSpend).toBe(100);
    expect(result.profile.purchaseCount).toBe(2);
    expect(result.tierUpgraded).toBe(false);
  });

  it('unlocks refills on the first order containing a 30ml bottle item', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder({
      items: [{ productId: 'b30', productType: '30ml_bottle', quantity: 1, price: 45 }],
    }));

    expect(result.profile.refillUnlocked).toBe(true);
    expect(result.notifications.some(n => n.type === 'refill_unlocked')).toBe(true);
    expect(rewardsStore.get('cust-1')).toMatchObject({ refill_unlocked: true });
  });

  it('does not re-notify the refill unlock on a later 30ml order', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'seed', total_spend: 50, purchase_count: 1, refill_unlocked: true });

    const result = await updateCustomerSpend('cust-1', makeOrder({
      items: [{ productId: 'b30', productType: '30ml_bottle', quantity: 1, price: 45 }],
    }));

    expect(result.profile.refillUnlocked).toBe(true);
    expect(result.notifications.some(n => n.type === 'refill_unlocked')).toBe(false);
  });

  it('does not unlock refills for orders without a 30ml item', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder());

    expect(result.profile.refillUnlocked).toBe(false);
    expect(result.notifications.some(n => n.type === 'refill_unlocked')).toBe(false);
  });

  it('emits a milestone notification on the 5th purchase', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'seed', total_spend: 100, purchase_count: 4 });

    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 10 }));

    expect(result.profile.purchaseCount).toBe(5);
    const milestone = result.notifications.find(n => n.type === 'milestone');
    expect(milestone?.title).toBe('5 Purchases!');
  });

  it('updates progress-to-next-tier after the order', async () => {
    const result = await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 200 }));

    expect(result.profile.progressToNextTier).toMatchObject({
      current: 200,
      target: 350,
      amountNeeded: 150,
      nextTierName: 'Bloom',
    });
  });

  it('processOrderForRewards returns the same update result', async () => {
    const result = await processOrderForRewards('cust-1', makeOrder({ orderTotal: 400 }));

    expect(result.profile.currentTier).toBe('bloom');
    expect(result.tierUpgraded).toBe(true);
  });

  it('REGRESSION: upgrades must not mutate the global tier config', async () => {
    // fetchProfileFromStore previously returned the live
    // CRYSTAL_CIRCLE_TIERS[tier].unlockedChains array; pushing unlocked
    // chains into it corrupted every later customer's defaults.
    await updateCustomerSpend('cust-1', makeOrder({ orderTotal: 150 }));

    const { CRYSTAL_CIRCLE_TIERS } = await import('../tiers');
    expect(CRYSTAL_CIRCLE_TIERS.seed.unlockedChains).toEqual([]);
    // ...and the next fresh customer still unlocks the chain on upgrade
    const second = await updateCustomerSpend('cust-2', makeOrder({ orderTotal: 150 }));
    expect(second.newChainsUnlocked).toContain('silver-plated');
  });
});

// ---------------------------------------------------------------------------
// upgradeCustomerTier / unlockRefillForCustomer (admin paths)
// ---------------------------------------------------------------------------

describe('upgradeCustomerTier', () => {
  it('is a no-op when the customer is already at that tier', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'seed', total_spend: 0 });

    await upgradeCustomerTier('cust-1', 'seed');

    expect(mockUpdateRewardsData).not.toHaveBeenCalled();
  });

  it('grants the new tier benefits and persists them', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'seed', total_spend: 0 });

    await upgradeCustomerTier('cust-1', 'radiance');

    expect(mockUpdateRewardsData).toHaveBeenCalledWith('cust-1', expect.objectContaining({
      crystal_circle_tier: 'radiance',
      unlocked_chains: expect.arrayContaining(['silver-plated', 'gold-plated', 'sterling-silver']),
      collected_charms: expect.arrayContaining(['crescent-moon', 'lotus-flower', 'tree-of-life', 'evil-eye']),
    }));
  });

  it('manual downgrade also updates the persisted tier', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'luminary', total_spend: 5000 });

    await upgradeCustomerTier('cust-1', 'seed');

    expect(mockUpdateRewardsData).toHaveBeenCalledWith('cust-1', expect.objectContaining({
      crystal_circle_tier: 'seed',
    }));
  });
});

describe('unlockRefillForCustomer (rewards)', () => {
  it('persists refill_unlocked for the customer', async () => {
    await unlockRefillForCustomer('cust-1');

    expect(rewardsStore.get('cust-1')).toMatchObject({ refill_unlocked: true });
  });
});

// ---------------------------------------------------------------------------
// accountCredit (Redis rewards balance — pinned behaviour)
// ---------------------------------------------------------------------------

describe('accountCredit (Redis system)', () => {
  it('rejects zero and negative credit amounts', async () => {
    await expect(addAccountCredit('cust-1', 0, 'x')).rejects.toThrow(/must be positive/);
    await expect(addAccountCredit('cust-1', -100, 'x')).rejects.toThrow(/must be positive/);
  });

  it('adds credit, returns the new balance, and persists it', async () => {
    const balance = await addAccountCredit('cust-1', 500, 'goodwill');

    expect(balance).toBe(500);
    expect(rewardsStore.get('cust-1')).toMatchObject({ account_credit: 500 });
  });

  it('accumulates across calls', async () => {
    await addAccountCredit('cust-1', 500, 'goodwill');
    const balance = await addAccountCredit('cust-1', 250, 'second grant');

    expect(balance).toBe(750);
  });

  it('useAccountCredit deducts and returns true when funds suffice', async () => {
    await addAccountCredit('cust-1', 500, 'goodwill');

    const ok = await useAccountCredit('cust-1', 200, 'order-1');

    expect(ok).toBe(true);
    expect(rewardsStore.get('cust-1')).toMatchObject({ account_credit: 300 });
  });

  it('useAccountCredit returns false without touching the balance when short', async () => {
    await addAccountCredit('cust-1', 100, 'goodwill');

    const ok = await useAccountCredit('cust-1', 200, 'order-1');

    expect(ok).toBe(false);
    expect(rewardsStore.get('cust-1')).toMatchObject({ account_credit: 100 });
  });

  it('useAccountCredit rejects zero and negative amounts', async () => {
    await expect(useAccountCredit('cust-1', 0, 'order-1')).rejects.toThrow(/must be positive/);
    await expect(useAccountCredit('cust-1', -5, 'order-1')).rejects.toThrow(/must be positive/);
  });

  it('getAvailableCredit returns the balance when nothing is reserved', async () => {
    await addAccountCredit('cust-1', 500, 'goodwill');

    await expect(getAvailableCredit('cust-1')).resolves.toBe(500);
  });

  it('DOCUMENTED QUIRK: creditHistory is not persisted — it resets on the next fetch', async () => {
    // saveProfileToStore never writes creditHistory, and fetchProfileFromStore
    // always returns creditHistory: []. A history read after a fresh fetch
    // therefore sees an empty list even right after a credit was granted.
    await addAccountCredit('cust-1', 500, 'goodwill');

    const history = await getCreditHistory('cust-1');

    expect(history).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Credit reservation lifecycle
// ---------------------------------------------------------------------------

describe('credit reservations', () => {
  it('refuses to reserve more than the available balance', async () => {
    await addAccountCredit('cust-1', 100, 'goodwill');

    await expect(reserveCreditForCheckout('cust-1', 200))
      .rejects.toThrow(/insufficient credit/i);
  });

  it('creates a 30-minute pending reservation with a CREDIT- discount code', async () => {
    await addAccountCredit('cust-1', 1000, 'goodwill');

    const { reservationId, discountCode } = await reserveCreditForCheckout('cust-1', 400);

    expect(reservationId).toMatch(/^res_/);
    expect(discountCode).toMatch(/^CREDIT-/);
    expect(mockRedisInstance.set).toHaveBeenCalledWith(
      `rewards:reservation:${reservationId}`,
      expect.objectContaining({ status: 'pending' }),
      { ex: 30 * 60 }
    );
    expect(redisStore.get(`rewards:reservation:${reservationId}`)).toContain('"amount":400');
  });

  it('commit deducts the reserved amount from the persisted balance', async () => {
    await addAccountCredit('cust-1', 1000, 'goodwill');
    const { reservationId } = await reserveCreditForCheckout('cust-1', 400);

    await commitCreditReservation(reservationId);

    expect(rewardsStore.get('cust-1')).toMatchObject({ account_credit: 600 });
    const stored = JSON.parse(redisStore.get(`rewards:reservation:${reservationId}`)!);
    expect(stored.status).toBe('committed');
  });

  it('commit throws for an unknown or expired reservation', async () => {
    await expect(commitCreditReservation('res_nonexistent')).rejects.toThrow(/invalid or expired/i);
  });

  it('a committed reservation cannot be committed twice', async () => {
    await addAccountCredit('cust-1', 1000, 'goodwill');
    const { reservationId } = await reserveCreditForCheckout('cust-1', 400);
    await commitCreditReservation(reservationId);

    await expect(commitCreditReservation(reservationId)).rejects.toThrow(/invalid or expired/i);
    // balance was only deducted once
    expect(rewardsStore.get('cust-1')).toMatchObject({ account_credit: 600 });
  });

  it('release marks the reservation released without deducting credit', async () => {
    await addAccountCredit('cust-1', 1000, 'goodwill');
    const { reservationId } = await reserveCreditForCheckout('cust-1', 400);

    await releaseCreditReservation(reservationId);

    expect(rewardsStore.get('cust-1')).toMatchObject({ account_credit: 1000 });
    const stored = JSON.parse(redisStore.get(`rewards:reservation:${reservationId}`)!);
    expect(stored.status).toBe('released');
  });

  it('release is a safe no-op for unknown or already-handled reservations', async () => {
    await expect(releaseCreditReservation('res_nonexistent')).resolves.toBeUndefined();

    await addAccountCredit('cust-1', 1000, 'goodwill');
    const { reservationId } = await reserveCreditForCheckout('cust-1', 400);
    await releaseCreditReservation(reservationId);
    await expect(releaseCreditReservation(reservationId)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getBatchCustomerProfiles
// ---------------------------------------------------------------------------

describe('getBatchCustomerProfiles', () => {
  it('returns profiles for all resolvable customers and skips failures', async () => {
    rewardsStore.set('cust-1', { crystal_circle_tier: 'bloom', total_spend: 400 });

    const profiles = await getBatchCustomerProfiles(['cust-1', 'broken-customer', 'cust-2']);

    expect(profiles).toHaveLength(2);
    expect(profiles.map(p => p.customerId).sort()).toEqual(['cust-1', 'cust-2']);
    expect(profiles.find(p => p.customerId === 'cust-1')?.currentTier).toBe('bloom');
  });
});
