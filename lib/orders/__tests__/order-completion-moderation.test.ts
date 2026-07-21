/**
 * Order Completion — moderation flag wiring tests
 *
 * Pins the 2026-07-21 moderation queue wiring on the server-side share path:
 * processCommunityBlendShares runs the same flagBlendContent check as the
 * interactive publish flow and forwards moderationStatus to publishBlendFn,
 * and completeOrderProcessing passes it through to publishBlendRecord
 * (Stripe webhook path — no user session exists there).
 */

// ---------------------------------------------------------------------------
// Mocks (same setup as order-completion.test.ts)
// ---------------------------------------------------------------------------

const mockSaveBlendToLibrary = jest.fn();
const mockTrackReferral = jest.fn();
jest.mock('@/lib/brand-ambassador', () => ({
  saveBlendToLibrary: (...args: unknown[]) => mockSaveBlendToLibrary(...args),
  trackReferral: (...args: unknown[]) => mockTrackReferral(...args),
  extractShareCodeFromUrl: jest.fn(),
}));

const mockValidateCustomMixServer = jest.fn();
jest.mock('@/lib/safety/server-validation', () => ({
  validateCustomMixServer: (mix: unknown) => mockValidateCustomMixServer(mix),
}));

const mockUnlockRefillForCustomer = jest.fn();
jest.mock('@/lib/refill/eligibility', () => ({
  unlockRefillForCustomer: (...args: unknown[]) => mockUnlockRefillForCustomer(...args),
}));

const mockDbUpdateWhere = jest.fn().mockResolvedValue([]);
const mockDb = {
  update: jest.fn(() => ({
    set: jest.fn(() => ({ where: mockDbUpdateWhere })),
  })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

const mockCreateUnlockedRefill = jest.fn();
jest.mock('@/lib/refill/unlocked-refills', () => ({
  createUnlockedRefill: (...args: unknown[]) => mockCreateUnlockedRefill(...args),
}));

const mockInsertCommunityBlend = jest.fn();
const mockPublishBlendRecord = jest.fn();
jest.mock('@/lib/community-blends/blend-store', () => ({
  insertCommunityBlend: (...args: unknown[]) => mockInsertCommunityBlend(...args),
  publishBlendRecord: (...args: unknown[]) => mockPublishBlendRecord(...args),
}));

const mockRecordBlendPurchase = jest.fn();
jest.mock('@/lib/community-blends/actions', () => ({
  recordBlendPurchase: (...args: unknown[]) => mockRecordBlendPurchase(...args),
}));

import type { Order } from '@/lib/context/user-context';
import { processCommunityBlendShares, completeOrderProcessing } from '../order-completion';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mixOrder(intendedUse?: string): Order {
  return {
    id: 'order-1',
    customerId: 'user-1',
    date: new Date().toISOString(),
    status: 'processing',
    total: 45,
    items: [
      {
        oilId: '',
        name: 'Calm Nights',
        size: '30ml',
        type: 'pure',
        price: 45,
        customMix: {
          recipeName: 'Calm Nights',
          mode: 'carrier',
          carrierRatio: 30,
          totalVolume: 30,
          intendedUse,
          oils: [
            { oilId: 'lavender', oilName: 'Lavender', ml: 5.4, percentage: 60 },
            { oilId: 'lemon', oilName: 'Lemon', ml: 3.6, percentage: 40 },
          ],
          safetyScore: 95,
          safetyRating: 'safe',
          safetyWarnings: [],
          labCertified: true,
          shareToCommunity: true,
        },
      },
    ],
  };
}

const passingValidation = {
  canProceed: true,
  errors: [],
  safetyScore: 95,
  safetyRating: 'safe',
  safetyWarnings: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateCustomMixServer.mockReturnValue(passingValidation);
  mockSaveBlendToLibrary.mockResolvedValue({ success: true, blendId: 'ub-1', shareCode: 'OIL-AAAA-1111' });
  mockCreateUnlockedRefill.mockResolvedValue({ success: true, refillId: 'r-1' });
  mockRecordBlendPurchase.mockResolvedValue({ success: true, commissionAmount: 100 });
  mockInsertCommunityBlend.mockResolvedValue({ blendId: 'b-1', slug: 'blend-slug' });
  mockPublishBlendRecord.mockResolvedValue({ id: 'b-1', slug: 'blend-slug', creatorId: 'user-1' });
});

// ---------------------------------------------------------------------------
// processCommunityBlendShares — flag check forwards moderationStatus
// ---------------------------------------------------------------------------

describe('processCommunityBlendShares moderation flags', () => {
  it('forwards moderationStatus approved for clean content', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    const publishBlendFn = jest.fn().mockResolvedValue({ success: true, slug: 'calm-nights' });

    const results = await processCommunityBlendShares(mixOrder('better sleep'), createBlendFn, publishBlendFn);

    expect(results[0].success).toBe(true);
    expect(publishBlendFn).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'b-1', moderationStatus: 'approved' })
    );
  });

  it('forwards moderationStatus flagged when intendedUse contains PII', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    const publishBlendFn = jest.fn().mockResolvedValue({ success: true, slug: 'calm-nights' });

    // intendedUse is interpolated into the generated description/story
    const results = await processCommunityBlendShares(
      mixOrder('sleep — reach me at ada@example.com'),
      createBlendFn,
      publishBlendFn
    );

    expect(results[0].success).toBe(true); // flagged ≠ rejected: queued for review
    expect(publishBlendFn).toHaveBeenCalledWith(
      expect.objectContaining({ moderationStatus: 'flagged' })
    );
  });

  it('forwards moderationStatus flagged when the blend name contains profanity', async () => {
    const order = mixOrder();
    order.items[0].customMix!.recipeName = 'my shit blend';

    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    const publishBlendFn = jest.fn().mockResolvedValue({ success: true, slug: 'x' });

    await processCommunityBlendShares(order, createBlendFn, publishBlendFn);

    expect(publishBlendFn).toHaveBeenCalledWith(
      expect.objectContaining({ moderationStatus: 'flagged' })
    );
  });
});

// ---------------------------------------------------------------------------
// completeOrderProcessing — webhook path passes the status to publishBlendRecord
// ---------------------------------------------------------------------------

describe('completeOrderProcessing moderation pass-through', () => {
  it('publishes clean order shares as approved via publishBlendRecord', async () => {
    await completeOrderProcessing(mixOrder('better sleep'), 'user-1', []);

    expect(mockPublishBlendRecord).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'b-1', moderationStatus: 'approved' })
    );
  });

  it('publishes flagged order shares as flagged via publishBlendRecord', async () => {
    await completeOrderProcessing(mixOrder('call 0412 345 678 for oils'), 'user-1', []);

    expect(mockPublishBlendRecord).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'b-1', moderationStatus: 'flagged' })
    );
  });
});
