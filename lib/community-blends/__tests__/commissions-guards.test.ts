/**
 * Commission System — self-dealing guard, history query, reversal robustness
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
});

// ---------------------------------------------------------------------------
// Self-dealing guard
// ---------------------------------------------------------------------------

describe('awardBlendCommission self-dealing guard', () => {
  it('awards no commission when the purchaser is the creator', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);
    mockDb.query.communityBlends.findFirst.mockResolvedValue(publishedBlend);

    const result = await awardBlendCommission('blend-1', 'order-1', 'creator-1', 5000);

    expect(result.success).toBe(true);
    expect(result.commissionAmount).toBe(0);
    expect(result.creatorId).toBe('creator-1');
    // No commission record, no stats update, no credit insert
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('awards 10% commission to the creator for a genuine purchase', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);
    mockDb.query.communityBlends.findFirst.mockResolvedValue(publishedBlend);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    expect(result.success).toBe(true);
    expect(result.commissionAmount).toBe(500); // 10% of 5000 cents
    expect(result.creatorId).toBe('creator-1');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('is idempotent — returns existing commission for the same order+blend', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue({
      id: 'c1',
      commissionAmount: 500,
    });

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects when the blend is not published', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      ...publishedBlend,
      status: 'draft',
    });

    const result = await awardBlendCommission('blend-1', 'order-1', 'buyer-2', 5000);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not published/i);
  });
});

// ---------------------------------------------------------------------------
// Commission history query (was a broken raw IN clause)
// ---------------------------------------------------------------------------

describe('getCreatorCommissionHistory', () => {
  it('returns commission history with blend names joined', async () => {
    mockDb.query.blendCommissions.findMany.mockResolvedValue([
      { id: 'c1', blendId: 'blend-1', saleAmount: 5000, commissionAmount: 500, createdAt: new Date('2026-01-01') },
      { id: 'c2', blendId: 'blend-2', saleAmount: 3000, commissionAmount: 300, createdAt: new Date('2026-01-02') },
    ]);
    mockDb.query.communityBlends.findMany.mockResolvedValue([
      { id: 'blend-1', name: 'Calm Nights' },
      { id: 'blend-2', name: 'Morning Sun' },
    ]);

    const history = await getCreatorCommissionHistory('creator-1');

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ id: 'c1', blendName: 'Calm Nights', commissionAmount: 500 });
    expect(history[1]).toMatchObject({ id: 'c2', blendName: 'Morning Sun', commissionAmount: 300 });
  });

  it('does not query blends when there are no commissions', async () => {
    mockDb.query.blendCommissions.findMany.mockResolvedValue([]);

    const history = await getCreatorCommissionHistory('creator-1');

    expect(history).toEqual([]);
    expect(mockDb.query.communityBlends.findMany).not.toHaveBeenCalled();
  });

  it('deduplicates blend ids and falls back for missing blends', async () => {
    mockDb.query.blendCommissions.findMany.mockResolvedValue([
      { id: 'c1', blendId: 'blend-1', saleAmount: 5000, commissionAmount: 500, createdAt: new Date() },
      { id: 'c2', blendId: 'blend-1', saleAmount: 5000, commissionAmount: 500, createdAt: new Date() },
      { id: 'c3', blendId: 'blend-gone', saleAmount: 1000, commissionAmount: 100, createdAt: new Date() },
    ]);
    mockDb.query.communityBlends.findMany.mockResolvedValue([
      { id: 'blend-1', name: 'Calm Nights' },
    ]);

    const history = await getCreatorCommissionHistory('creator-1');

    expect(history).toHaveLength(3);
    expect(history[2].blendName).toBe('Unknown Blend');
  });
});

// ---------------------------------------------------------------------------
// Reversal robustness
// ---------------------------------------------------------------------------

describe('reverseBlendCommission', () => {
  const commission = {
    id: 'comm-1',
    creatorId: 'creator-1',
    blendId: 'blend-1',
    orderId: 'order-1',
    commissionAmount: 500,
    status: 'purchased',
  };

  it('reverses the full amount when the creator has sufficient balance', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(commission);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'creator-1',
      balance: 1000,
    });

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(true);
    expect(result.reversedAmount).toBe(500);
    // Reversal transaction for the full amount
    const reversal = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.type === 'adjusted');
    expect(reversal).toMatchObject({ amount: -500, balance: 500 });
    // No shortfall audit record
    const audit = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.action === 'commission_reversal_shortfall');
    expect(audit).toBeUndefined();
  });

  it('reverses as far as possible and flags admin review on shortfall', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(commission);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'creator-1',
      balance: 200, // creator already spent 300 of the credit
    });

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(true);
    // Partial reversal transaction
    const reversal = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.type === 'adjusted');
    expect(reversal).toMatchObject({ amount: -200, balance: 0 });
    // Audit log flag for admin review
    const audit = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.action === 'commission_reversal_shortfall');
    expect(audit).toBeDefined();
    expect(audit.entityId).toBe('order-1');
    expect(audit.after).toMatchObject({
      reversedAmount: 200,
      shortfall: 300,
      creatorId: 'creator-1',
      requiresAdminReview: true,
    });
  });

  it('flags admin review when the creator has no credit record at all', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(commission);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(true);
    const audit = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.action === 'commission_reversal_shortfall');
    expect(audit).toBeDefined();
    expect(audit.after).toMatchObject({ shortfall: 500 });
  });

  it('fails cleanly when the commission was already reversed', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue({
      ...commission,
      status: 'refunded',
    });

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already reversed/i);
  });

  it('fails cleanly when no commission record exists', async () => {
    mockDb.query.blendCommissions.findFirst.mockResolvedValue(null);

    const result = await reverseBlendCommission('order-1', 'blend-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
