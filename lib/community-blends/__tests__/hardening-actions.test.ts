/**
 * Hardening tests — lib/community-blends/actions.ts
 *
 * Complements actions-identity.test.ts: rating aggregation bookkeeping
 * (ratingSum/ratingCount), rating update-vs-insert, share-link creation
 * (share counting), recordBlendPurchase pass-through, and view increments.
 */

const mockGetSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession(),
}));

const mockHasUserPurchasedBlend = jest.fn();
jest.mock('../queries', () => ({
  hasUserPurchasedBlend: (...args: unknown[]) => mockHasUserPurchasedBlend(...args),
}));

const mockAwardBlendCommission = jest.fn();
jest.mock('../commissions', () => ({
  awardBlendCommission: (...args: unknown[]) => mockAwardBlendCommission(...args),
}));

// select chain for the rating aggregation query
let selectResult: Array<{ sum: number | null; count: number }> = [{ sum: 0, count: 0 }];
const mockSelectWhere = jest.fn(() =>
  Promise.resolve(selectResult)
);
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  query: {
    blendRatings: { findFirst: jest.fn() },
    communityBlends: { findFirst: jest.fn() },
  },
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

import { rateBlend, createShareLink, recordBlendPurchase, incrementBlendView } from '../actions';

const loggedIn = (customerId = 'user-1') => ({
  isLoggedIn: true,
  customerId,
  email: 'u@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
});

beforeEach(() => {
  jest.clearAllMocks();
  selectResult = [{ sum: 0, count: 0 }];
  mockGetSession.mockResolvedValue(loggedIn());
  mockDb.query.blendRatings.findFirst.mockResolvedValue(null);
  mockHasUserPurchasedBlend.mockResolvedValue(false);
});

// ---------------------------------------------------------------------------
// rateBlend — aggregation bookkeeping
// ---------------------------------------------------------------------------

describe('rateBlend aggregation updates', () => {
  it('writes the recalculated sum and count onto the blend', async () => {
    selectResult = [{ sum: 13, count: 3 }];

    const result = await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 4 });

    expect(result.success).toBe(true);
    // First update is the blend's ratingSum/ratingCount (no existing rating path)
    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.ratingSum).toBe(13);
    expect(setPayload.ratingCount).toBe(3);
    expect(setPayload.updatedAt).toBeInstanceOf(Date);
  });

  it('falls back to 0/0 when the aggregation query returns no rows', async () => {
    selectResult = [];

    await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 5 });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.ratingSum).toBe(0);
    expect(setPayload.ratingCount).toBe(0);
  });

  it('falls back to 0 when the aggregation sum is null', async () => {
    selectResult = [{ sum: null, count: 0 }];

    await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 5 });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.ratingSum).toBe(0);
  });
});

describe('rateBlend insert vs update', () => {
  it('inserts a new rating when the user has not rated this blend', async () => {
    await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 5, review: 'Lovely' });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        blendId: 'blend-1',
        userId: 'user-1',
        rating: 5,
        review: 'Lovely',
        verifiedPurchase: false,
        orderId: null,
      })
    );
    // Only the blend stats update ran (no rating-row update)
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('updates the existing rating row instead of inserting a duplicate', async () => {
    mockDb.query.blendRatings.findFirst.mockResolvedValue({ id: 'rating-9' });
    mockHasUserPurchasedBlend.mockResolvedValue(true);

    const result = await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 2, orderId: 'order-1' });

    expect(result.success).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
    // First update = existing rating row; second = blend stats
    const ratingSet = mockUpdateSet.mock.calls[0][0];
    expect(ratingSet).toMatchObject({ rating: 2, verifiedPurchase: true, orderId: 'order-1' });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('clears orderId on update when verification fails', async () => {
    mockDb.query.blendRatings.findFirst.mockResolvedValue({ id: 'rating-9' });
    mockHasUserPurchasedBlend.mockResolvedValue(false);

    await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 3, orderId: 'fake-order' });

    const ratingSet = mockUpdateSet.mock.calls[0][0];
    expect(ratingSet.verifiedPurchase).toBe(false);
    expect(ratingSet.orderId).toBeNull();
  });

  it('rejects ratings outside 1–5 before touching the DB', async () => {
    for (const rating of [0, 6, -1]) {
      const result = await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/between 1 and 5/i);
    }
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns a failure result (never throws) when the DB errors', async () => {
    mockInsertValues.mockRejectedValueOnce(new Error('db down'));

    const result = await rateBlend({ blendId: 'blend-1', userName: 'Ada', rating: 5 });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/failed to submit rating/i);
  });
});

// ---------------------------------------------------------------------------
// createShareLink — share counting / identity
// ---------------------------------------------------------------------------

describe('createShareLink', () => {
  it('records the session user as the share author', async () => {
    mockGetSession.mockResolvedValue(loggedIn('user-5'));

    const result = await createShareLink({ blendId: 'blend-1' });

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'blend-1', sharedBy: 'user-5', platform: 'link' })
    );
  });

  it('allows anonymous shares (no session) recorded as "anonymous"', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: false });

    const result = await createShareLink({ blendId: 'blend-1' });

    expect(result.success).toBe(true);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sharedBy: 'anonymous' })
    );
  });

  it('generates a unique shr_ token per call and honors the platform', async () => {
    const r1 = await createShareLink({ blendId: 'blend-1', platform: 'instagram' });
    const r2 = await createShareLink({ blendId: 'blend-1', platform: 'instagram' });

    expect(r1.shareToken).toMatch(/^shr_\d+_[a-z0-9]+$/);
    expect(r2.shareToken).toMatch(/^shr_\d+_[a-z0-9]+$/);
    expect(r1.shareToken).not.toBe(r2.shareToken);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'instagram' })
    );
  });

  it('fails cleanly when the insert fails', async () => {
    mockInsertValues.mockRejectedValueOnce(new Error('db down'));

    const result = await createShareLink({ blendId: 'blend-1' });

    expect(result.success).toBe(false);
    expect(result.shareToken).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// recordBlendPurchase — server-to-server pass-through
// ---------------------------------------------------------------------------

describe('recordBlendPurchase', () => {
  it('delegates to awardBlendCommission and surfaces the amount', async () => {
    mockAwardBlendCommission.mockResolvedValue({ success: true, commissionAmount: 450 });

    const result = await recordBlendPurchase('blend-1', 'order-1', 'buyer-2', 4500);

    expect(mockAwardBlendCommission).toHaveBeenCalledWith('blend-1', 'order-1', 'buyer-2', 4500);
    expect(result).toEqual({ success: true, commissionAmount: 450 });
  });

  it('still reports success when the commission award itself fails (purchase was recorded)', async () => {
    mockAwardBlendCommission.mockResolvedValue({ success: false, commissionAmount: 0, error: 'Blend not found' });

    const result = await recordBlendPurchase('gone', 'order-1', 'buyer-2', 4500);

    expect(result.success).toBe(true);
    expect(result.commissionAmount).toBe(0);
  });

  it('fails cleanly when the commission module throws', async () => {
    mockAwardBlendCommission.mockRejectedValue(new Error('boom'));

    const result = await recordBlendPurchase('blend-1', 'order-1', 'buyer-2', 4500);

    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });
});

// ---------------------------------------------------------------------------
// incrementBlendView
// ---------------------------------------------------------------------------

describe('incrementBlendView', () => {
  it('increments the view counter for the blend', async () => {
    await incrementBlendView('blend-1');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdateSet.mock.calls[0][0].viewCount).toBeDefined();
  });

  it('swallows DB errors (view counting is best-effort)', async () => {
    mockUpdateWhere.mockRejectedValueOnce(new Error('db down'));

    await expect(incrementBlendView('blend-1')).resolves.toBeUndefined();
  });
});
