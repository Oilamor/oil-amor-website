/**
 * Moderation publish wiring tests
 *
 * Pins the 2026-07-21 moderation queue wiring:
 * - actions.publishBlend runs flagBlendContent on the sanitized text and
 *   publishes flagged content with moderation_status='flagged' (clean
 *   content → 'approved'). The flow runs through the REAL blend-store so
 *   the UPDATE payload itself is asserted, not just a mocked hand-off.
 * - blend-store.publishBlendRecord defaults moderationStatus to 'approved'
 *   and stamps 'flagged' when the caller passes it.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('../queries', () => ({
  hasUserPurchasedBlend: jest.fn().mockResolvedValue(false),
}));

// DB mock — relational query + update chain with returning()
const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({
  returning: mockUpdateReturning,
  then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(undefined).then(onF, onR),
}));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  update: mockUpdate,
  query: {
    communityBlends: { findFirst: jest.fn() },
  },
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

import { publishBlend } from '../actions';
import { publishBlendRecord } from '../blend-store';

const loggedIn = (customerId = 'user-1') => ({
  isLoggedIn: true,
  customerId,
  email: 'u@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
});

const publishedRow = { id: 'b1', slug: 'calm-nights', creatorId: 'user-1' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(loggedIn());
  mockUpdateReturning.mockResolvedValue([publishedRow]);
});

// ---------------------------------------------------------------------------
// publishBlend → moderation_status from content flags
// ---------------------------------------------------------------------------

describe('publishBlend moderation wiring', () => {
  it('publishes clean content as approved', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'b1',
      name: 'Calm Nights',
      description: 'Lavender and chamomile for restful evenings.',
      story: 'Made for my grandmother.',
    });

    const result = await publishBlend({ blendId: 'b1', orderId: 'o1', consentToShare: true });

    expect(result.success).toBe(true);
    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.moderationStatus).toBe('approved');
    expect(result.contentFlags).toBeUndefined();
  });

  it('publishes flagged content (PII) as flagged and returns the flags', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'b1',
      name: 'Calm Nights',
      description: 'Email me at ada@example.com for the recipe.',
      story: null,
    });

    const result = await publishBlend({ blendId: 'b1', orderId: 'o1', consentToShare: true });

    expect(result.success).toBe(true);
    expect(result.contentFlags).toBeDefined();
    expect(result.contentFlags!.length).toBeGreaterThan(0);
    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.moderationStatus).toBe('flagged');
  });

  it('publishes flagged content (profanity) as flagged', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'b1',
      name: 'This shit rocks',
      description: null,
      story: null,
    });

    const result = await publishBlend({ blendId: 'b1', orderId: 'o1', consentToShare: true });

    expect(result.success).toBe(true);
    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.moderationStatus).toBe('flagged');
  });
});

// ---------------------------------------------------------------------------
// publishBlendRecord — default + explicit moderation status
// ---------------------------------------------------------------------------

describe('publishBlendRecord moderation status', () => {
  it('defaults moderationStatus to approved when not provided', async () => {
    await publishBlendRecord({ blendId: 'b1', creatorId: 'user-1', orderId: 'o1' });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.moderationStatus).toBe('approved');
  });

  it('stamps flagged when the caller passes flagged', async () => {
    await publishBlendRecord({ blendId: 'b1', creatorId: 'user-1', orderId: 'o1', moderationStatus: 'flagged' });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.moderationStatus).toBe('flagged');
  });
});
