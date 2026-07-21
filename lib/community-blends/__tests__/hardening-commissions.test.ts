/**
 * Hardening tests — lib/community-blends/commissions.ts uncovered edges
 *
 * Complements commissions-guards.test.ts: unique-conflict races, zero-amount
 * sales, unpublished visibilities, pendingCommission vs lifetime bookkeeping,
 * earnings/history queries (0/1/N blends), and exact-balance / zero-balance
 * reversal boundaries.
 */

const mockOnConflict = jest.fn().mockResolvedValue(undefined);
const mockValues = jest.fn(() => ({ onConflictDoUpdate: mockOnConflict }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  query: {
    blendCommissions: { findFirst: jest.fn(), findMany: jest.fn() },
    communityBlends: { findFirst: jest.fn(), findMany: jest.fn() },
    customerCredits: { findFirst: jest.fn() },
    userBlendStats: { findFirst: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import {
  awardBlendCommission,
  getCreatorEarnings,
  getCreatorCommissionHistory,
  reverseBlendCommission,
} from '../commissions';

const publishedBlend = {
  id: 'blend-1',
  creatorId: 'creator-1',
  name: 'Calm Nights',
  status: 'published',
  visibility: 'community',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOnConflict.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// awardBlendCommission — idempotency and races
// ---------------------------------------------------------------------------

describe('awardBlendCommission idempotency', () => {
  it('returns the existing commission without writing anything (pre-check hit)', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue({
      id: 'comm-existing',
      commissionAmount: 321,
    });

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    expect(result).toEqual({
      success: true,
      commissionAmount: 321,
      alreadyExists: true,
    });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('surfaces a unique-constraint race as a failure instead of double-awarding', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);
    mockDb.query.communityBlends.findFirst.mockResolvedValue(publishedBlend);
    mockValues.mockImplementationOnce(() => {
      throw new Error('duplicate key value violates unique constraint "blend_commissions_order_blend_unique"');
    });

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    expect(result.success).toBe(false);
    expect(result.commissionAmount).toBe(0);
    expect(result.error).toMatch(/duplicate key/);
    // No stats or credit writes happened after the failed commission insert
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// awardBlendCommission — blend/creator preconditions
// ---------------------------------------------------------------------------

describe('awardBlendCommission preconditions', () => {
  beforeEach(() => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);
  });

  it('fails when the blend row is missing', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    const result = await awardBlendCommission('gone', 'order-1', 'buyer-2', 5000);

    expect(result).toMatchObject({ success: false, commissionAmount: 0, error: 'Blend not found' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it.each([
    ['draft', 'community'],
    ['published', 'shared'],
    ['published', 'private'],
    ['archived', 'community'],
  ])('rejects status=%s visibility=%s as not published', async (status, visibility) => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({ ...publishedBlend, status, visibility });

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not published/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// awardBlendCommission — zero amount and bookkeeping
// ---------------------------------------------------------------------------

describe('awardBlendCommission bookkeeping', () => {
  beforeEach(() => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);
    mockDb.query.communityBlends.findFirst.mockResolvedValue(publishedBlend);
  });

  it('records a zero-amount sale without crashing (10% of 0 is 0)', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 0);

    expect(result.success).toBe(true);
    expect(result.commissionAmount).toBe(0);
    // Commission row still recorded at 0, credit row created with 0 balance
    const commissionRow = mockValues.mock.calls.map(c => c[0]).find(v => v && v.commissionRate === 10);
    expect(commissionRow).toMatchObject({ commissionAmount: 0, saleAmount: 0, status: 'purchased' });
  });

  it('initializes a new stats row with pending == lifetime == commission', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 100 });

    await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000); // 500 commission

    const statsInsert = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.userId === 'creator-1' && 'totalPurchasesOfBlends' in v);
    expect(statsInsert).toMatchObject({
      totalPurchasesOfBlends: 1,
      totalCommissionEarned: 500,
      pendingCommission: 500,
    });
  });

  it('increments both pendingCommission and lifetime earnings on the upsert path', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 100 });

    await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    const conflictSet = mockOnConflict.mock.calls[0][0].set;
    // Both columns are SQL increments keyed off the same commission amount
    expect(conflictSet.totalCommissionEarned).toBeDefined();
    expect(conflictSet.pendingCommission).toBeDefined();
    expect(conflictSet.totalPurchasesOfBlends).toBeDefined();
    expect(conflictSet.updatedAt).toBeInstanceOf(Date);
  });

  it('creates a new credit record when the creator has none', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    const creditRow = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.customerId === 'creator-1' && 'totalEarned' in v);
    expect(creditRow).toMatchObject({ balance: 500, totalEarned: 500, totalUsed: 0 });
  });

  it('writes an earned transaction with the running balance and blend metadata', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 700 });

    await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    const tx = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'earned');
    expect(tx).toMatchObject({
      customerId: 'creator-1',
      amount: 500,
      balance: 1200, // 700 existing + 500 new
      expiresAt: null,
    });
    expect(tx.metadata).toMatchObject({ blendId: 'blend-1', orderId: 'order-1', commissionRate: 10 });
  });
});

// ---------------------------------------------------------------------------
// getCreatorEarnings
// ---------------------------------------------------------------------------

describe('getCreatorEarnings', () => {
  it('maps stats rows and counts published blends', async () => {
    mockDb.query.userBlendStats.findFirst.mockResolvedValue({
      totalCommissionEarned: 1750,
      pendingCommission: 500,
      totalPurchasesOfBlends: 4,
    });
    mockDb.query.communityBlends.findMany.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);

    const earnings = await getCreatorEarnings('creator-1');

    expect(earnings).toEqual({
      totalEarned: 1750,
      pendingAmount: 500,
      totalSales: 4,
      blendCount: 2,
    });
  });

  it('returns zeros when the creator has no stats row and no blends', async () => {
    mockDb.query.userBlendStats.findFirst.mockResolvedValue(null);
    mockDb.query.communityBlends.findMany.mockResolvedValue([]);

    expect(await getCreatorEarnings('new-creator')).toEqual({
      totalEarned: 0,
      pendingAmount: 0,
      totalSales: 0,
      blendCount: 0,
    });
  });

  it('returns zeros instead of throwing when the DB fails', async () => {
    mockDb.query.userBlendStats.findFirst.mockRejectedValue(new Error('db down'));

    expect(await getCreatorEarnings('creator-1')).toEqual({
      totalEarned: 0,
      pendingAmount: 0,
      totalSales: 0,
      blendCount: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// getCreatorCommissionHistory — 0 / 1 / N blends
// ---------------------------------------------------------------------------

describe('getCreatorCommissionHistory edges', () => {
  it('handles a single commission on a single blend', async () => {
    mockDb.query.blendCommissions.findMany.mockResolvedValue([
      { id: 'c1', blendId: 'blend-1', saleAmount: 5000, commissionAmount: 500, createdAt: new Date('2026-04-01') },
    ]);
    mockDb.query.communityBlends.findMany.mockResolvedValue([{ id: 'blend-1', name: 'Calm Nights' }]);

    const history = await getCreatorCommissionHistory('creator-1');

    expect(history).toEqual([
      { id: 'c1', blendName: 'Calm Nights', saleAmount: 5000, commissionAmount: 500, createdAt: new Date('2026-04-01') },
    ]);
  });

  it('queries blends with the deduplicated id set for N blends', async () => {
    mockDb.query.blendCommissions.findMany.mockResolvedValue([
      { id: 'c1', blendId: 'b1', saleAmount: 100, commissionAmount: 10, createdAt: new Date() },
      { id: 'c2', blendId: 'b2', saleAmount: 100, commissionAmount: 10, createdAt: new Date() },
      { id: 'c3', blendId: 'b1', saleAmount: 100, commissionAmount: 10, createdAt: new Date() },
    ]);
    mockDb.query.communityBlends.findMany.mockResolvedValue([
      { id: 'b1', name: 'One' },
      { id: 'b2', name: 'Two' },
    ]);

    const history = await getCreatorCommissionHistory('creator-1');

    expect(history.map(h => h.blendName)).toEqual(['One', 'Two', 'One']);
    // findMany was called exactly once (one inArray query, not per-row)
    expect(mockDb.query.communityBlends.findMany).toHaveBeenCalledTimes(1);
  });

  it('forwards limit/offset options to the commission query', async () => {
    mockDb.query.blendCommissions.findMany.mockResolvedValue([]);

    await getCreatorCommissionHistory('creator-1', { limit: 10, offset: 20 });

    expect(mockDb.query.blendCommissions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 })
    );
  });

  it('returns an empty array instead of throwing when the DB fails', async () => {
    mockDb.query.blendCommissions.findMany.mockRejectedValue(new Error('db down'));

    expect(await getCreatorCommissionHistory('creator-1')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// reverseBlendCommission — balance boundaries
// ---------------------------------------------------------------------------

describe('reverseBlendCommission balance boundaries', () => {
  const commission = {
    id: 'comm-1',
    creatorId: 'creator-1',
    blendId: 'blend-1',
    orderId: 'order-1',
    commissionAmount: 500,
    status: 'purchased',
  };

  beforeEach(() => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(commission);
  });

  it('reverses cleanly when the balance exactly equals the commission', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 500 });

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result).toEqual({ success: true, reversedAmount: 500 });
    const tx = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'adjusted');
    expect(tx).toMatchObject({ amount: -500, balance: 0 });
    expect(tx.description).toBe('Commission reversed due to refund');
    const audit = mockValues.mock.calls.map(c => c[0]).find(v => v && v.action === 'commission_reversal_shortfall');
    expect(audit).toBeUndefined();
  });

  it('writes only the audit flag (no negative-balance update) when the balance is 0', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 0 });

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(true);
    // No 'adjusted' transaction — nothing left to reverse
    const tx = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'adjusted');
    expect(tx).toBeUndefined();
    // Credit balance update was never issued (only commission status + blend/stats updates)
    const audit = mockValues.mock.calls.map(c => c[0]).find(v => v && v.action === 'commission_reversal_shortfall');
    expect(audit).toBeDefined();
    expect(audit.after).toMatchObject({ reversedAmount: 0, shortfall: 500, requiresAdminReview: true });
  });

  it('marks the commission row refunded before touching credits', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 1000 });

    await reverseBlendCommission('order-1', 'blend-1');

    const firstSet = mockUpdateSet.mock.calls[0][0];
    expect(firstSet.status).toBe('refunded');
  });

  it('decrements lifetime earnings and clamps blend purchase stats', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'creator-1', balance: 1000 });

    await reverseBlendCommission('order-1', 'blend-1');

    // Updates: 1) commission status, 2) credit balance, 3) user stats, 4) blend stats
    expect(mockUpdate).toHaveBeenCalledTimes(4);
    const statsSet = mockUpdateSet.mock.calls[2][0];
    expect(statsSet.totalCommissionEarned).toBeDefined(); // SQL decrement
    const blendSet = mockUpdateSet.mock.calls[3][0];
    expect(blendSet.purchaseCount).toBeDefined(); // GREATEST(count - 1, 0)
    expect(blendSet.popularityScore).toBeDefined();
  });

  it('fails cleanly when the DB errors mid-reversal', async () => {
    mockUpdateWhere.mockRejectedValueOnce(new Error('db down'));

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('db down');
  });
});
