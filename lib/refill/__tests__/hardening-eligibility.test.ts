/**
 * Hardening tests — Refill eligibility engine
 *
 * Covers all unlock paths (metadata short-circuit, DB metadata, 30ml
 * purchase auto-unlock, legacy order-line fallback query contract), bottle
 * filtering, pricing in cents with credit balances, and the read-only
 * helpers. DB, forever-bottle, and credits modules are mocked.
 */

const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

const mockDb = {
  query: {
    customers: { findFirst: jest.fn() },
    orders: { findFirst: jest.fn(), findMany: jest.fn() },
  },
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

const mockGetCustomerForeverBottles = jest.fn();
const mockIsBottleEligibleForRefill = jest.fn();
jest.mock('@/lib/refill/forever-bottle', () => ({
  getCustomerForeverBottles: (...args: unknown[]) => mockGetCustomerForeverBottles(...args),
  isBottleEligibleForRefill: (...args: unknown[]) => mockIsBottleEligibleForRefill(...args),
}));

const mockValidateCreditUsage = jest.fn();
const mockGetCreditSummary = jest.fn();
jest.mock('@/lib/refill/credits', () => ({
  validateCreditUsage: (...args: unknown[]) => mockValidateCreditUsage(...args),
  getCreditSummary: (...args: unknown[]) => mockGetCreditSummary(...args),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import {
  isRefillUnlocked,
  checkRefillEligibility,
  checkBottleRefillEligibility,
  calculateFinalPrice,
  getBulkEligibilityStatus,
  getRefillRules,
  previewUnlockEligibility,
  type Customer,
} from '../eligibility';

function makeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    email: 'a@example.com',
    firstName: 'A',
    lastName: 'B',
    metadata: { refillUnlocked: true },
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeBottle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bottle-1',
    customerId: 'cust-1',
    serialNumber: 'FA-A3F9K2',
    oilType: 'lavender',
    capacity: '100ml' as const,
    purchaseDate: new Date('2025-01-01'),
    status: 'empty' as const,
    currentFillLevel: 0,
    refillCount: 2,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function primeUnlockedCustomer(bottles = [makeBottle()], balance = 0) {
  mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer());
  mockGetCustomerForeverBottles.mockResolvedValue(bottles);
  mockIsBottleEligibleForRefill.mockResolvedValue({ eligible: true });
  mockValidateCreditUsage.mockResolvedValue({
    valid: true,
    availableBalance: balance,
    suggestedUsage: balance,
    pendingCredits: 0,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// isRefillUnlocked — all unlock paths
// ---------------------------------------------------------------------------

describe('isRefillUnlocked', () => {
  it('short-circuits on passed-in metadata without hitting the DB', async () => {
    const customer: Customer = {
      id: 'cust-1',
      email: 'a@example.com',
      firstName: 'A',
      lastName: 'B',
      metadata: { refillUnlocked: true },
      createdAt: new Date(),
    };

    await expect(isRefillUnlocked(customer)).resolves.toBe(true);
    expect(mockDb.query.customers.findFirst).not.toHaveBeenCalled();
  });

  it('accepts a DB record with refillUnlocked metadata (string id input)', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer());

    await expect(isRefillUnlocked('cust-1')).resolves.toBe(true);
    expect(mockDb.query.orders.findFirst).not.toHaveBeenCalled();
  });

  it('auto-unlocks when a 30ml purchase exists and writes the unlock', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer({ metadata: {} }));
    mockDb.query.orders.findFirst.mockResolvedValue({ id: 'order-1' });

    await expect(isRefillUnlocked('cust-1')).resolves.toBe(true);
    // unlockRefillForCustomer performs two metadata updates
    // (refillUnlocked flag + unlockDate)
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('returns false and writes nothing when there is no metadata and no purchase', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer({ metadata: {} }));
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    await expect(isRefillUnlocked('cust-1')).resolves.toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns false when the customer record does not exist and no purchase is found', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(null);
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    await expect(isRefillUnlocked('ghost')).resolves.toBe(false);
  });

  it('queries the orders table for the 30ml fallback when metadata is absent', async () => {
    // The legacy line-item fallback lives in the SQL (metadata.has30mlBottle
    // OR jsonb line items matching 30ml). With the DB mocked, we pin the
    // contract: an order row of any shape counts as a qualifying purchase.
    mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer({ metadata: null }));
    mockDb.query.orders.findFirst.mockResolvedValue({
      id: 'legacy-order',
      items: [{ name: 'Lavender 30ml' }],
    });

    await expect(isRefillUnlocked('cust-1')).resolves.toBe(true);
    expect(mockDb.query.orders.findFirst).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// checkRefillEligibility
// ---------------------------------------------------------------------------

describe('checkRefillEligibility', () => {
  it('rejects an unknown customer with a computed "from cheapest" cents preview', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(null);

    const result = await checkRefillEligibility('ghost');

    expect(result.canRefill).toBe(false);
    expect(result.reason).toBe('Customer not found');
    expect(result.availableBottles).toEqual([]);
    // 2026-07-21: algorithm-driven refill pricing — the generic locked
    // preview is the cheapest engine-computed 100ml refill across
    // WHOLESALE_OILS (camphor-white, 1895 cents), not a flat constant.
    expect(result.pricing).toEqual({
      standardPrice: 1895,
      discountedPrice: 1395,
      creditApplied: 500,
      finalPrice: 1395,
      availableCredits: 0,
    });
    expect(result.customerStatus.isUnlocked).toBe(false);
  });

  it('rejects a locked customer with the unlock requirement', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(makeCustomer({ metadata: {} }));
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    const result = await checkRefillEligibility('cust-1');

    expect(result.canRefill).toBe(false);
    expect(result.reason).toMatch(/not unlocked/i);
    expect(result.customerStatus).toMatchObject({
      isUnlocked: false,
      unlockRequirement: 'has-purchased-30ml',
      bottlesOwned: 0,
    });
  });

  it('rejects an unlocked customer with no bottles', async () => {
    primeUnlockedCustomer([]);

    const result = await checkRefillEligibility('cust-1');

    expect(result.canRefill).toBe(false);
    expect(result.reason).toBe('No eligible bottles found');
    expect(result.customerStatus).toMatchObject({ isUnlocked: true, bottlesOwned: 0 });
  });

  it('approves an unlocked customer with an eligible bottle', async () => {
    primeUnlockedCustomer();

    const result = await checkRefillEligibility('cust-1');

    expect(result.canRefill).toBe(true);
    expect(result.availableBottles.map(b => b.id)).toEqual(['bottle-1']);
    expect(result.customerStatus).toMatchObject({
      isUnlocked: true,
      bottlesOwned: 1,
      totalRefills: 2,
    });
  });

  it('filters bottles by oil type when specified', async () => {
    primeUnlockedCustomer([
      makeBottle({ id: 'b1', oilType: 'lavender' }),
      makeBottle({ id: 'b2', oilType: 'peppermint', serialNumber: 'FA-BBBBBB' }),
    ]);

    const result = await checkRefillEligibility('cust-1', 'peppermint');

    expect(result.availableBottles.map(b => b.id)).toEqual(['b2']);
    // bottlesOwned still counts every bottle the customer has
    expect(result.customerStatus.bottlesOwned).toBe(2);
  });

  it('surfaces the first ineligibility reason when no bottles qualify', async () => {
    primeUnlockedCustomer([makeBottle({ status: 'in-transit' })]);
    mockIsBottleEligibleForRefill.mockResolvedValue({
      eligible: false,
      reason: 'Bottle is already in transit',
    });

    const result = await checkRefillEligibility('cust-1');

    expect(result.canRefill).toBe(false);
    expect(result.reason).toBe('FA-A3F9K2: Bottle is already in transit');
  });

  it('pins engine-computed pricing in integer cents with a zero credit balance', async () => {
    primeUnlockedCustomer([makeBottle()], 0);

    const result = await checkRefillEligibility('cust-1');

    // 2026-07-21: algorithm-driven refill pricing — lavender 100ml refill
    // computed by the cost-based engine, not the old flat 3500/3000.
    expect(result.pricing).toEqual({
      standardPrice: 3095,  // $30.95 engine-computed
      discountedPrice: 2595, // $25.95 after $5.00 return credit
      creditApplied: 500,    // $5.00
      finalPrice: 2595,
      availableCredits: 0,
    });
  });

  it('applies a partial credit balance against the cents price', async () => {
    primeUnlockedCustomer([makeBottle()], 1000);

    const result = await checkRefillEligibility('cust-1');

    expect(result.pricing.finalPrice).toBe(1595);
    expect(result.pricing.availableCredits).toBe(1000);
  });

  it('caps the credit at the price — an over-balance makes the refill free', async () => {
    primeUnlockedCustomer([makeBottle()], 999999);

    const result = await checkRefillEligibility('cust-1');

    expect(result.pricing.finalPrice).toBe(0);
  });

  it('a full-coverage balance of exactly the price also zeroes the refill', async () => {
    primeUnlockedCustomer([makeBottle()], 2595);

    const result = await checkRefillEligibility('cust-1');

    expect(result.pricing.finalPrice).toBe(0);
  });

  it('sums totalRefills across all bottles', async () => {
    primeUnlockedCustomer([
      makeBottle({ id: 'b1', refillCount: 3 }),
      makeBottle({ id: 'b2', refillCount: 4, serialNumber: 'FA-BBBBBB' }),
    ]);

    const result = await checkRefillEligibility('cust-1');

    expect(result.customerStatus.totalRefills).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// checkBottleRefillEligibility
// ---------------------------------------------------------------------------

describe('checkBottleRefillEligibility', () => {
  it('propagates customer-level ineligibility', async () => {
    mockDb.query.customers.findFirst.mockResolvedValue(null);

    const result = await checkBottleRefillEligibility('ghost', 'bottle-1');

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Customer not found');
  });

  it('rejects a bottle that is not in the eligible list', async () => {
    primeUnlockedCustomer();

    const result = await checkBottleRefillEligibility('cust-1', 'other-bottle');

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Bottle not found or not eligible for refill');
  });

  it('returns the bottle and its per-oil pricing when eligible', async () => {
    primeUnlockedCustomer();

    const result = await checkBottleRefillEligibility('cust-1', 'bottle-1');

    expect(result.eligible).toBe(true);
    expect(result.bottle?.id).toBe('bottle-1');
    expect(result.pricing.standardPrice).toBe(3095); // engine-computed lavender 100ml
    expect(result.pricing.finalPrice).toBe(2595);
  });
});

// ---------------------------------------------------------------------------
// calculateFinalPrice (pure)
// 2026-07-21: algorithm-driven refill pricing — takes the engine-computed
// standard price (cents) instead of reading a flat constant. Lavender 100ml
// (3095) is used throughout; effective base = 3095 − 500 = 2595.
// ---------------------------------------------------------------------------

describe('calculateFinalPrice', () => {
  it('no credits → full effective price in cents', () => {
    expect(calculateFinalPrice(3095, 0)).toEqual({
      basePrice: 2595,
      creditDiscount: 0,
      finalPrice: 2595,
    });
  });

  it('partial credits are subtracted cent-for-cent', () => {
    expect(calculateFinalPrice(3095, 1200)).toEqual({
      basePrice: 2595,
      creditDiscount: 1200,
      finalPrice: 1395,
    });
  });

  it('exact coverage zeroes the price', () => {
    expect(calculateFinalPrice(3095, 2595).finalPrice).toBe(0);
  });

  it('over-coverage is capped at the price (never negative)', () => {
    const result = calculateFinalPrice(3095, 5000);

    expect(result.creditDiscount).toBe(2595);
    expect(result.finalPrice).toBe(0);
  });

  it('treats a negative balance as no credit', () => {
    expect(calculateFinalPrice(3095, -50).finalPrice).toBe(2595);
  });

  it('honours useCredits = false', () => {
    expect(calculateFinalPrice(3095, 2595, false)).toEqual({
      basePrice: 2595,
      creditDiscount: 0,
      finalPrice: 2595,
    });
  });
});

// ---------------------------------------------------------------------------
// getRefillRules
// ---------------------------------------------------------------------------

describe('getRefillRules', () => {
  it('pins the program constants (cents, days, months, cycles)', () => {
    const rules = getRefillRules();

    // 2026-07-21: algorithm-driven refill pricing — NO flat price constants.
    // Refill prices come from lib/refill/pricing (cost-based engine).
    expect(rules).toEqual({
      unlockRequirement: 'has-purchased-30ml',
      foreverBottleSize: '100ml',
      returnCreditAmount: 500,
      labelExpiryDays: 30,
      creditExpiryMonths: 12,
      maxRefillCycles: 50,
      inspectionFrequency: 10,
    });
  });

  it('contains no flat refill price keys', () => {
    const rules = getRefillRules() as Record<string, unknown>;

    expect('standardRefillPrice' in rules).toBe(false);
    expect('effectiveRefillPrice' in rules).toBe(false);
  });

  it('returns a defensive copy — mutation does not leak into later calls', () => {
    const rules = getRefillRules();
    (rules as { returnCreditAmount: number }).returnCreditAmount = 1;

    expect(getRefillRules().returnCreditAmount).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// getBulkEligibilityStatus
// ---------------------------------------------------------------------------

describe('getBulkEligibilityStatus', () => {
  it('aggregates per-customer status', async () => {
    mockDb.query.customers.findFirst
      .mockResolvedValueOnce(makeCustomer({ id: 'c1' }))
      .mockResolvedValueOnce(makeCustomer({ id: 'c2' }));
    mockGetCustomerForeverBottles
      .mockResolvedValueOnce([makeBottle()])
      .mockResolvedValueOnce([]);
    mockIsBottleEligibleForRefill.mockResolvedValue({ eligible: true });
    mockValidateCreditUsage.mockResolvedValue({ valid: true, availableBalance: 0, suggestedUsage: 0 });

    const result = await getBulkEligibilityStatus(['c1', 'c2']);

    expect(result).toEqual([
      { customerId: 'c1', isUnlocked: true, bottlesOwned: 1, eligibleBottles: 1 },
      { customerId: 'c2', isUnlocked: true, bottlesOwned: 0, eligibleBottles: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// previewUnlockEligibility
// ---------------------------------------------------------------------------

describe('previewUnlockEligibility', () => {
  it('reports the qualifying purchase when a 30ml order exists', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue({
      id: 'order-1',
      createdAt: new Date('2025-03-01'),
      metadata: { productName: 'Lavender 30ml' },
    });

    const result = await previewUnlockEligibility('cust-1');

    expect(result.meetsRequirement).toBe(true);
    expect(result.requirement).toBe('has-purchased-30ml');
    expect(result.qualifyingPurchase).toMatchObject({
      orderId: 'order-1',
      productName: 'Lavender 30ml',
    });
  });

  it('falls back to a default product name when order metadata is missing', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue({
      id: 'order-1',
      createdAt: new Date('2025-03-01'),
      metadata: null,
    });

    const result = await previewUnlockEligibility('cust-1');

    expect(result.qualifyingPurchase?.productName).toBe('30ml Essential Oil');
  });

  it('reports no match without unlocking anything', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    const result = await previewUnlockEligibility('cust-1');

    expect(result).toEqual({
      meetsRequirement: false,
      requirement: 'has-purchased-30ml',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
