/**
 * Brand Ambassador — self-referral guard tests
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdate = jest.fn(() => ({
  set: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
}));

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

import { trackReferral } from '../index';

const ownedBlend = {
  id: 'blend-1',
  userId: 'owner-1',
  shareCode: 'OIL-ABCD-1234',
  isDeleted: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('trackReferral', () => {
  it('blocks self-referral — owner buying via their own share code', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);

    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'owner-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/self-referral/i);
    // No referral record, no stats update, no credit
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('awards 10% credit for a genuine referral', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    expect(result.success).toBe(true);
    expect(result.creditEarned).toBe(1000); // 10% of 10000 cents
    expect(mockInsert).toHaveBeenCalled();
  });

  it('awards credit when the purchaser is a guest (no referredUserId)', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(ownedBlend);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await trackReferral({
      shareCode: 'OIL-ABCD-1234',
      orderId: 'order-1',
      purchaseAmount: 5000,
    });

    expect(result.success).toBe(true);
    expect(result.creditEarned).toBe(500);
  });

  it('rejects an invalid share code', async () => {
    mockDb.query.userBlends.findFirst.mockResolvedValue(null);

    const result = await trackReferral({
      shareCode: 'OIL-NOPE-0000',
      orderId: 'order-1',
      purchaseAmount: 10000,
      referredUserId: 'buyer-2',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid share code/i);
  });
});
