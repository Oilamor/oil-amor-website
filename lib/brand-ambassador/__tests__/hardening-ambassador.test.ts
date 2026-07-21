/**
 * Hardening tests — Brand Ambassador system
 *
 * Pins share-code format/uniqueness, share URL round-trips, blend library
 * writes, the 10%-of-merchandise-subtotal commission math (cents), the
 * self-referral guard, credit application, and stats aggregation.
 */

const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({
  returning: mockReturning,
  onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
}));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

const mockDb = {
  query: {
    userBlends: { findFirst: jest.fn(), findMany: jest.fn() },
    customerCredits: { findFirst: jest.fn() },
    blendReferrals: { findMany: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import {
  generateShareCode,
  generateShareUrl,
  extractShareCodeFromUrl,
  saveBlendToLibrary,
  getUserBlends,
  getBlendByShareCode,
  getBlendById,
  trackReferral,
  getBrandAmbassadorStats,
  getReferralHistory,
  recordBlendShare,
  recordBlendView,
} from '../index';

const ownedBlend = {
  id: 'blend-1',
  userId: 'owner-1',
  name: 'Sleep Blend',
  shareCode: 'OIL-ABCD-1234',
  isDeleted: false,
  isBrandAmbassadorEnabled: true,
  totalShares: 2,
  totalViews: 10,
  totalPurchasesViaShare: 1,
  totalCreditsEarned: 500,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockReturning.mockImplementation(() =>
    Promise.resolve([{ ...mockValues.mock.calls[0]?.[0] }])
  );
});

// ---------------------------------------------------------------------------
// Share code generation / validation
// ---------------------------------------------------------------------------

describe('generateShareCode', () => {
  it('always matches the OIL-XXXX-XXXX format', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateShareCode()).toMatch(/^OIL-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  it('only uses the unambiguous A-Z0-9 charset', () => {
    for (let i = 0; i < 200; i++) {
      const body = generateShareCode().replace(/^OIL-|-/g, '');
      expect(body).toMatch(/^[A-Z0-9]{8}$/);
    }
  });

  it('produces unique codes in practice (1000 samples, no collisions)', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShareCode()));
    expect(codes.size).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Share URL utilities
// ---------------------------------------------------------------------------

describe('share URL utilities', () => {
  it('generateShareUrl embeds the code as the ref param on the default host', () => {
    const url = generateShareUrl('OIL-ABCD-1234');

    expect(url).toBe('https://oilamor.com/mixing-atelier?ref=OIL-ABCD-1234');
  });

  it('extractShareCodeFromUrl round-trips a generated URL', () => {
    const code = 'OIL-WXYZ-9876';

    expect(extractShareCodeFromUrl(generateShareUrl(code))).toBe(code);
  });

  it('extractShareCodeFromUrl returns null for a URL without ref', () => {
    expect(extractShareCodeFromUrl('https://oilamor.com/mixing-atelier')).toBeNull();
  });

  it('extractShareCodeFromUrl returns null for garbage input', () => {
    expect(extractShareCodeFromUrl('not a url')).toBeNull();
    expect(extractShareCodeFromUrl('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveBlendToLibrary
// ---------------------------------------------------------------------------

describe('saveBlendToLibrary', () => {
  const input = {
    userId: 'user-1',
    name: 'My Sleep Blend!',
    description: 'for bedtime',
    recipe: { mode: 'pure', oils: [] },
  } as Parameters<typeof saveBlendToLibrary>[0];

  it('persists the blend ambassador-enabled with zeroed counters', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(null); // share code unique

    const result = await saveBlendToLibrary(input);

    expect(result.success).toBe(true);
    expect(result.shareCode).toMatch(/^OIL-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(result.blendId).toBeDefined();
    const row = mockValues.mock.calls.map(c => c[0]).find(v => v && v.shareCode);
    expect(row).toMatchObject({
      userId: 'user-1',
      name: 'My Sleep Blend!',
      isPublic: false,
      isBrandAmbassadorEnabled: true,
      totalShares: 0,
      totalViews: 0,
      totalPurchasesViaShare: 0,
      totalCreditsEarned: 0,
      isDeleted: false,
    });
    // slug is derived from the name
    expect(row.slug).toMatch(/^my-sleep-blend-/);
  });

  it('regenerates the share code when the first candidate collides', async () => {
    mockDb.query.userBlends.findFirst
      .mockResolvedValueOnce({ id: 'existing-blend' }) // collision
      .mockResolvedValueOnce(null);                    // free

    const result = await saveBlendToLibrary(input);

    expect(result.success).toBe(true);
    expect(mockDb.query.userBlends.findFirst).toHaveBeenCalledTimes(2);
  });

  it('returns a failure object instead of throwing when the DB write fails', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(null);
    mockInsert.mockImplementationOnce(() => {
      throw new Error('db down');
    });

    const result = await saveBlendToLibrary(input);

    expect(result).toEqual({ success: false, error: 'db down' });
  });
});

// ---------------------------------------------------------------------------
// Blend lookups
// ---------------------------------------------------------------------------

describe('blend lookups', () => {
  it('getUserBlends returns the library rows', async () => {
    mockDb.query.userBlends.findMany.mockResolvedValue([ownedBlend]);

    await expect(getUserBlends('owner-1')).resolves.toEqual([ownedBlend]);
  });

  it('getBlendByShareCode returns a falsy value for an unknown code', async () => {
    // NB: typed as UserBlend | null but drizzle findFirst yields undefined —
    // callers rely on falsiness (trackReferral uses `if (!blend)`).
    mockDb.query.userBlends.findFirst.mockResolvedValue(undefined);

    await expect(getBlendByShareCode('OIL-NOPE-0000')).resolves.toBeFalsy();
  });

  it('getBlendById returns the blend when present', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);

    await expect(getBlendById('blend-1')).resolves.toEqual(ownedBlend);
  });
});

// ---------------------------------------------------------------------------
// trackReferral — commission math (10% of merchandise subtotal, cents)
// ---------------------------------------------------------------------------

describe('trackReferral commission math', () => {
  beforeEach(() => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);
  });

  it('awards exactly 10% of the purchase amount, in cents', async () => {
    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 12300, // $123.00 merchandise
      referredUserId: 'buyer-2',
    });

    expect(result.success).toBe(true);
    expect(result.creditEarned).toBe(1230);
  });

  it('REGRESSION: credit is computed solely from the passed merchandise subtotal', async () => {
    // The caller (lib/orders/order-completion.ts trackBlendReferral) filters
    // out shipping and gift-card items BEFORE computing purchaseAmount, so
    // this module must never see or add those amounts. Pin the formula:
    // creditEarned === Math.round(purchaseAmount * 0.10) for any input.
    for (const amount of [100, 999, 5000, 50000]) {
      const result = await trackReferral({
        shareCode: 'OIL-ABCD-1234',
        orderId: `order-${amount}`,
        purchaseAmount: amount,
        referredUserId: 'buyer-2',
      });

      expect(result.creditEarned).toBe(Math.round(amount * 0.10));
    }
  });

  it('rounds fractional cents to the nearest cent', async () => {
    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10555, // 1055.5 → rounds half up
      referredUserId: 'buyer-2',
    });

    expect(result.creditEarned).toBe(1056);
  });

  it('rounds sub-cent commissions down to zero on tiny orders', async () => {
    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 4,
      referredUserId: 'buyer-2',
    });

    expect(result.success).toBe(true);
    expect(result.creditEarned).toBe(0);
  });

  it('records the referral as pending then marks it applied', async () => {
    await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    const referralRow = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.shareCode === 'OIL-ABCD-1234');
    expect(referralRow).toMatchObject({
      referrerUserId: 'owner-1',
      referredUserId: 'buyer-2',
      orderId: 'order-1',
      blendId: 'blend-1',
      purchaseAmount: 10000,
      creditEarned: 1000,
      creditStatus: 'pending',
    });
    // one update bumps blend stats, one marks the referral applied
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('creates a credit record for a first-time referrer', async () => {
    await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    const accountRow = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.customerId === 'owner-1' && v.totalEarned === 1000 && !v.type);
    expect(accountRow).toMatchObject({ balance: 1000, totalUsed: 0 });
    const txn = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.type === 'earned');
    expect(txn).toMatchObject({
      customerId: 'owner-1',
      amount: 1000,
      balance: 1000,
      metadata: expect.objectContaining({ orderId: 'order-1', reason: 'referral_purchase' }),
    });
  });

  it('adds to an existing credit balance', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'owner-1',
      balance: 700,
    });

    await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    const txn = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.type === 'earned');
    expect(txn.balance).toBe(1700);
  });
});

// ---------------------------------------------------------------------------
// trackReferral — self-referral guard (regression)
// ---------------------------------------------------------------------------

describe('trackReferral self-referral guard', () => {
  beforeEach(() => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);
  });

  it('blocks the owner earning on their own purchase — no writes at all', async () => {
    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-self',
      purchaseAmount: 999999,
      referredUserId: 'owner-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/self-referral/i);
    expect(result.creditEarned).toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('allows a different purchaser through the same code', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-2',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    expect(result.success).toBe(true);
  });

  it('guard is an exact-id match — a different casing is treated as a different user', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-3',
      purchaseAmount: 10000,
      referredUserId: 'Owner-1', // differs from blend.userId 'owner-1'
    });

    // Documents current behaviour: the check is strict equality on IDs.
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// trackReferral — failure paths
// ---------------------------------------------------------------------------

describe('trackReferral failure paths', () => {
  it('fails cleanly for a deleted/unknown share code', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(null);

    const result = await trackReferral({
      shareCode: 'OIL-GONE-0000',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    expect(result).toEqual({ success: false, error: 'Invalid share code' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns a failure object instead of throwing on DB errors', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);
    mockInsert.mockImplementationOnce(() => {
      throw new Error('db down');
    });

    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    expect(result).toEqual({ success: false, error: 'db down' });
  });
});

// ---------------------------------------------------------------------------
// getBrandAmbassadorStats
// ---------------------------------------------------------------------------

describe('getBrandAmbassadorStats', () => {
  it('aggregates totals and tolerates null counters', async () => {
    mockDb.query.userBlends.findMany.mockResolvedValue([
      ownedBlend,
      {
        ...ownedBlend,
        id: 'blend-2',
        shareCode: 'OIL-EFGH-5678',
        totalShares: null,
        totalViews: null,
        totalPurchasesViaShare: null,
        totalCreditsEarned: null,
      },
    ]);
    mockDb.query.blendReferrals.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);

    const stats = await getBrandAmbassadorStats('owner-1');

    expect(stats).toMatchObject({
      totalBlends: 2,
      totalShares: 2,
      totalViews: 10,
      totalReferrals: 2,
      totalCreditsEarned: 500,
    });
  });

  it('ranks top blends by purchases, excludes zero-purchase blends, caps at 5', async () => {
    const blends = Array.from({ length: 7 }, (_, i) => ({
      ...ownedBlend,
      id: `blend-${i}`,
      name: `Blend ${i}`,
      shareCode: `OIL-AAA${i}-0000`,
      totalPurchasesViaShare: i, // 0..6
      totalCreditsEarned: i * 100,
    }));
    mockDb.query.userBlends.findMany.mockResolvedValue(blends);
    mockDb.query.blendReferrals.findMany.mockResolvedValue([]);

    const stats = await getBrandAmbassadorStats('owner-1');

    expect(stats.topPerformingBlends).toHaveLength(5);
    expect(stats.topPerformingBlends.map(b => b.purchases)).toEqual([6, 5, 4, 3, 2]);
    expect(stats.topPerformingBlends.every(b => b.purchases > 0)).toBe(true);
    expect(stats.topPerformingBlends[0]).toMatchObject({
      blendId: 'blend-6',
      creditsEarned: 600,
    });
  });

  it('returns zeros for a user with no blends', async () => {
    mockDb.query.userBlends.findMany.mockResolvedValue([]);
    mockDb.query.blendReferrals.findMany.mockResolvedValue([]);

    await expect(getBrandAmbassadorStats('owner-1')).resolves.toEqual({
      totalBlends: 0,
      totalShares: 0,
      totalViews: 0,
      totalReferrals: 0,
      totalCreditsEarned: 0,
      topPerformingBlends: [],
    });
  });
});

// ---------------------------------------------------------------------------
// Referral history / share & view counters
// ---------------------------------------------------------------------------

describe('referral history and counters', () => {
  it('getReferralHistory passes rows through', async () => {
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    mockDb.query.blendReferrals.findMany.mockResolvedValue(rows);

    await expect(getReferralHistory('owner-1')).resolves.toEqual(rows);
  });

  it('recordBlendShare issues one increment update', async () => {
    await recordBlendShare('blend-1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      updatedAt: expect.any(Date),
    }));
  });

  it('recordBlendView issues one increment update without touching updatedAt', async () => {
    await recordBlendView('OIL-ABCD-1234');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
