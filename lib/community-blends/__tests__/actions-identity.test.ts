/**
 * Community Blends Actions — session identity tests
 *
 * Server actions must derive identity from the iron-session and ignore
 * client-passed creatorId/userId.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession(),
}));

const mockInsertCommunityBlend = jest.fn();
const mockPublishBlendRecord = jest.fn();
jest.mock('../blend-store', () => ({
  insertCommunityBlend: (...args: unknown[]) => mockInsertCommunityBlend(...args),
  publishBlendRecord: (...args: unknown[]) => mockPublishBlendRecord(...args),
}));

const mockHasUserPurchasedBlend = jest.fn();
jest.mock('../queries', () => ({
  hasUserPurchasedBlend: (...args: unknown[]) => mockHasUserPurchasedBlend(...args),
}));

const mockDbInsertValues = jest.fn().mockResolvedValue(undefined);
const mockDbUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockDb = {
  query: {
    communityBlends: { findFirst: jest.fn() },
    blendRatings: { findFirst: jest.fn() },
  },
  insert: jest.fn(() => ({ values: mockDbInsertValues })),
  update: jest.fn(() => ({
    set: jest.fn(() => ({ where: mockDbUpdateWhere })),
  })),
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn().mockResolvedValue([{ sum: 5, count: 1 }]),
    })),
  })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

import {
  createCommunityBlend,
  publishBlend,
  rateBlend,
} from '../actions';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const loggedIn = (customerId = 'user-1') => ({
  isLoggedIn: true,
  customerId,
  email: 'u@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
});

const sampleRecipe = {
  mode: 'pure' as const,
  bottleSize: 30,
  strength: 100,
  oils: [{ oilId: 'lavender', name: 'Lavender', ml: 30 }],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createCommunityBlend
// ---------------------------------------------------------------------------

describe('createCommunityBlend identity', () => {
  it('rejects when there is no session', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: false });

    const result = await createCommunityBlend({
      creatorId: 'attacker',
      creatorName: 'X',
      name: 'Blend',
      recipe: sampleRecipe,
      price: 3000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/authentication/i);
    expect(mockInsertCommunityBlend).not.toHaveBeenCalled();
  });

  it('ignores client-passed creatorId and uses the session customerId', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockInsertCommunityBlend.mockResolvedValue({ blendId: 'b1', slug: 'blend' });

    const result = await createCommunityBlend({
      creatorId: 'attacker-id',
      creatorName: 'Ada',
      name: 'My Blend',
      recipe: sampleRecipe,
      price: 3000,
    });

    expect(result.success).toBe(true);
    expect(mockInsertCommunityBlend).toHaveBeenCalledWith(
      expect.objectContaining({ creatorId: 'real-user' })
    );
  });

  it('falls back to the session display name when creatorName is empty', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockInsertCommunityBlend.mockResolvedValue({ blendId: 'b1', slug: 'blend' });

    await createCommunityBlend({
      creatorName: '',
      name: 'My Blend',
      recipe: sampleRecipe,
      price: 3000,
    });

    expect(mockInsertCommunityBlend).toHaveBeenCalledWith(
      expect.objectContaining({ creatorName: 'Ada Lovelace' })
    );
  });
});

// ---------------------------------------------------------------------------
// publishBlend
// ---------------------------------------------------------------------------

describe('publishBlend identity + hygiene', () => {
  it('rejects when there is no session', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: false });

    const result = await publishBlend({
      blendId: 'b1',
      creatorId: 'attacker',
      orderId: 'o1',
      consentToShare: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/authentication/i);
    expect(mockPublishBlendRecord).not.toHaveBeenCalled();
  });

  it('requires consent', async () => {
    mockGetSession.mockResolvedValue(loggedIn());

    const result = await publishBlend({
      blendId: 'b1',
      orderId: 'o1',
      consentToShare: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/consent/i);
  });

  it('enforces ownership with the session id, not the client-passed creatorId', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'b1',
      name: 'My Blend',
      description: null,
      story: null,
    });
    mockPublishBlendRecord.mockResolvedValue({ slug: 'my-blend', creatorId: 'real-user' });

    const result = await publishBlend({
      blendId: 'b1',
      creatorId: 'someone-else', // must be ignored
      orderId: 'o1',
      consentToShare: true,
    });

    expect(result.success).toBe(true);
    expect(mockPublishBlendRecord).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'b1', creatorId: 'real-user', orderId: 'o1' })
    );
  });

  it('sanitizes blend name/description/story at publish', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'b1',
      name: '<b>Bold</b> Blend',
      description: '<script>alert(1)</script>Nice',
      story: null,
    });
    mockPublishBlendRecord.mockResolvedValue({ slug: 'bold-blend', creatorId: 'real-user' });

    await publishBlend({ blendId: 'b1', orderId: 'o1', consentToShare: true });

    expect(mockPublishBlendRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bold Blend',
        description: 'Nice',
      })
    );
  });

  it('returns error when the record is not found / not owned', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'b1',
      name: 'Blend',
      description: null,
      story: null,
    });
    mockPublishBlendRecord.mockResolvedValue(null);

    const result = await publishBlend({ blendId: 'b1', orderId: 'o1', consentToShare: true });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found or not owned/i);
  });
});

// ---------------------------------------------------------------------------
// rateBlend
// ---------------------------------------------------------------------------

describe('rateBlend identity + verified purchase', () => {
  const baseInput = {
    blendId: 'blend-1',
    userId: 'attacker',
    userName: 'Attacker',
    rating: 5,
  };

  it('rejects when there is no session', async () => {
    mockGetSession.mockResolvedValue({ isLoggedIn: false });

    const result = await rateBlend(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/authentication/i);
  });

  it('rates with the session identity, ignoring client-passed userId', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockDb.query.blendRatings.findFirst.mockResolvedValue(null);
    mockHasUserPurchasedBlend.mockResolvedValue(false);

    const result = await rateBlend(baseInput);

    expect(result.success).toBe(true);
    expect(mockHasUserPurchasedBlend).toHaveBeenCalledWith('real-user', 'blend-1', undefined);
    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'real-user', verifiedPurchase: false, orderId: null })
    );
  });

  it('marks verifiedPurchase only when purchase verification passes', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockDb.query.blendRatings.findFirst.mockResolvedValue(null);
    mockHasUserPurchasedBlend.mockResolvedValue(true);

    await rateBlend({ ...baseInput, orderId: 'order-9' });

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedPurchase: true, orderId: 'order-9' })
    );
  });

  it('does not mark verifiedPurchase just because an orderId was supplied', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));
    mockDb.query.blendRatings.findFirst.mockResolvedValue(null);
    mockHasUserPurchasedBlend.mockResolvedValue(false);

    await rateBlend({ ...baseInput, orderId: 'fake-order' });

    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedPurchase: false, orderId: null })
    );
  });

  it('validates the rating range', async () => {
    mockGetSession.mockResolvedValue(loggedIn('real-user'));

    const result = await rateBlend({ ...baseInput, rating: 6 });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/between 1 and 5/i);
  });
});
