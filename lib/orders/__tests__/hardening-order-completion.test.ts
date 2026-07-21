/**
 * Hardening tests — lib/orders/order-completion.ts
 *
 * Complements order-completion.test.ts: unlock tier matrix, share extraction
 * fallbacks, best-effort semantics across all side effects, commission
 * wiring for blend items, referral exclusions, XP math, and 30ml detection
 * boundaries.
 */

// ---------------------------------------------------------------------------
// Mocks
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

import type { Order, UnlockedOil } from '@/lib/context/user-context';
import {
  processOrderCompletion,
  applyUnlocks,
  hasEnhancedAccess,
  getOilUnlockTier,
  getAvailableRefillTypes,
  extractCommunityBlendShares,
  processCommunityBlendShares,
  trackBlendReferral,
  calculateOrderXP,
  orderContains30mlBottle,
  completeOrderProcessing,
} from '../order-completion';

const passingValidation = {
  canProceed: true,
  errors: [],
  safetyScore: 95,
  safetyRating: 'safe',
  safetyWarnings: [],
};

function oilItem(oilId: string, type: 'pure' | 'enhanced' = 'pure', price = 30) {
  return { oilId, name: `${oilId} oil`, size: '30ml', type, price };
}

function orderOf(items: Order['items'], overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'user-1',
    date: new Date().toISOString(),
    status: 'processing',
    total: items.reduce((s, i) => s + i.price * (i.quantity || 1), 0),
    items,
    ...overrides,
  };
}

const unlock = (oilId: string, type: 'pure' | 'enhanced'): UnlockedOil => ({
  oilId,
  unlockedAt: '2026-01-01',
  unlockedBy: 'order-0',
  type,
});

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
// processOrderCompletion — unlock matrix
// ---------------------------------------------------------------------------

describe('processOrderCompletion unlock matrix', () => {
  it('unlocks a new oil as pure', () => {
    const result = processOrderCompletion(orderOf([oilItem('lavender')]), []);

    expect(result.success).toBe(true);
    expect(result.newUnlocks).toHaveLength(1);
    expect(result.newUnlocks[0]).toMatchObject({ oilId: 'lavender', type: 'pure', unlockedBy: 'order-1' });
    expect(result.upgradedUnlocks).toHaveLength(0);
  });

  it('unlocks a new oil as enhanced', () => {
    const result = processOrderCompletion(orderOf([oilItem('lemon', 'enhanced')]), []);

    expect(result.newUnlocks[0].type).toBe('enhanced');
  });

  it('upgrades an existing pure unlock to enhanced', () => {
    const result = processOrderCompletion(
      orderOf([oilItem('lavender', 'enhanced')]),
      [unlock('lavender', 'pure')]
    );

    expect(result.newUnlocks).toHaveLength(0);
    expect(result.upgradedUnlocks).toEqual([{ oilId: 'lavender', from: 'pure', to: 'enhanced' }]);
  });

  it('does nothing when the oil is already unlocked as enhanced', () => {
    const result = processOrderCompletion(
      orderOf([oilItem('lavender', 'enhanced')]),
      [unlock('lavender', 'enhanced')]
    );

    expect(result.newUnlocks).toHaveLength(0);
    expect(result.upgradedUnlocks).toHaveLength(0);
  });

  it('does not downgrade an enhanced unlock when a pure item is purchased', () => {
    const result = processOrderCompletion(
      orderOf([oilItem('lavender', 'pure')]),
      [unlock('lavender', 'enhanced')]
    );

    expect(result.newUnlocks).toHaveLength(0);
    expect(result.upgradedUnlocks).toHaveLength(0);
  });

  it('keeps an existing pure unlock when a pure item is re-purchased', () => {
    const result = processOrderCompletion(
      orderOf([oilItem('lavender')]),
      [unlock('lavender', 'pure')]
    );

    expect(result.newUnlocks).toHaveLength(0);
  });

  it('records an error for items without an oilId and reports failure', () => {
    const result = processOrderCompletion(orderOf([oilItem(''), oilItem('lemon')]), []);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0]).toMatch(/no oilId/i);
    // The valid item is still processed
    expect(result.newUnlocks).toEqual([expect.objectContaining({ oilId: 'lemon' })]);
  });

  it('handles an order with no items', () => {
    const result = processOrderCompletion(orderOf([]), []);

    expect(result.success).toBe(true);
    expect(result.newUnlocks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyUnlocks / tier helpers
// ---------------------------------------------------------------------------

describe('applyUnlocks', () => {
  it('adds new unlocks and applies upgrades without touching others', () => {
    const existing = [unlock('lavender', 'pure'), unlock('lemon', 'enhanced')];
    const result = processOrderCompletion(
      orderOf([oilItem('lavender', 'enhanced'), oilItem('myrrh', 'pure')]),
      existing
    );

    const updated = applyUnlocks(existing, result);

    expect(updated).toHaveLength(3);
    expect(updated.find(u => u.oilId === 'lavender')!.type).toBe('enhanced');
    expect(updated.find(u => u.oilId === 'lemon')!.type).toBe('enhanced');
    expect(updated.find(u => u.oilId === 'myrrh')!.type).toBe('pure');
    // Input not mutated
    expect(existing.find(u => u.oilId === 'lavender')!.type).toBe('pure');
  });
});

describe('unlock tier helpers', () => {
  const unlocks = [unlock('lavender', 'enhanced'), unlock('lemon', 'pure')];

  it('hasEnhancedAccess only for enhanced unlocks', () => {
    expect(hasEnhancedAccess('lavender', unlocks)).toBe(true);
    expect(hasEnhancedAccess('lemon', unlocks)).toBe(false);
    expect(hasEnhancedAccess('myrrh', unlocks)).toBe(false);
  });

  it('getOilUnlockTier returns the tier or null', () => {
    expect(getOilUnlockTier('lavender', unlocks)).toBe('enhanced');
    expect(getOilUnlockTier('lemon', unlocks)).toBe('pure');
    expect(getOilUnlockTier('myrrh', unlocks)).toBeNull();
  });

  it('getAvailableRefillTypes derives pure/enhanced availability from the tier', () => {
    expect(getAvailableRefillTypes('lavender', unlocks)).toEqual({ pure: true, enhanced: true });
    expect(getAvailableRefillTypes('lemon', unlocks)).toEqual({ pure: true, enhanced: false });
    expect(getAvailableRefillTypes('myrrh', unlocks)).toEqual({ pure: false, enhanced: false });
  });
});

// ---------------------------------------------------------------------------
// extractCommunityBlendShares
// ---------------------------------------------------------------------------

function mixItem(overrides: Record<string, unknown> = {}) {
  return {
    oilId: '',
    name: 'Mix',
    size: '30ml',
    type: 'pure' as const,
    price: 45,
    customMix: {
      recipeName: 'Night Mix',
      mode: 'carrier' as const,
      carrierRatio: 30,
      totalVolume: 30,
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 9, percentage: 100 }],
      safetyScore: 95,
      safetyRating: 'safe',
      safetyWarnings: [],
      labCertified: true,
      shareToCommunity: true,
      ...overrides,
    },
  };
}

describe('extractCommunityBlendShares', () => {
  it('extracts only items that consented to share', () => {
    const order = orderOf([
      mixItem(),
      mixItem({ shareToCommunity: false }),
      oilItem('lavender'),
    ]);

    const shares = extractCommunityBlendShares(order);

    expect(shares).toHaveLength(1);
    expect(shares[0].shouldShare).toBe(true);
  });

  it('falls back to the order customerId when the mix has no creatorId', () => {
    const shares = extractCommunityBlendShares(orderOf([mixItem()], { customerId: 'user-9' }));

    expect(shares[0].creatorId).toBe('user-9');
  });

  it('falls back to "anonymous" when neither mix nor order has a customer', () => {
    const order = orderOf([mixItem()]);
    // @ts-expect-error deliberately missing customerId
    delete order.customerId;

    const shares = extractCommunityBlendShares(order);

    expect(shares[0].creatorId).toBe('anonymous');
    expect(shares[0].creatorName).toBe('Anonymous Alchemist');
  });

  it('uses the mix creator identity when present', () => {
    const shares = extractCommunityBlendShares(orderOf([mixItem({ creatorId: 'c-1', creatorName: 'Ada' })]));

    expect(shares[0].creatorId).toBe('c-1');
    expect(shares[0].creatorName).toBe('Ada');
  });
});

// ---------------------------------------------------------------------------
// processCommunityBlendShares — best-effort semantics
// ---------------------------------------------------------------------------

describe('processCommunityBlendShares best-effort', () => {
  it('a mix failing safety validation does not block other shares', async () => {
    mockValidateCustomMixServer
      .mockReturnValueOnce({ canProceed: false, errors: ['too strong'], safetyScore: 10, safetyRating: 'dangerous', safetyWarnings: [] })
      .mockReturnValueOnce(passingValidation);

    const order = orderOf([mixItem({ recipeName: 'Bad Mix' }), mixItem({ recipeName: 'Good Mix' })]);
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });

    const results = await processCommunityBlendShares(order, createBlendFn);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ success: false, blendName: 'Bad Mix' });
    expect(results[0].error).toMatch(/too strong/);
    expect(results[1]).toMatchObject({ success: true, blendName: 'Good Mix' });
    expect(createBlendFn).toHaveBeenCalledTimes(1);
  });

  it('a throwing createBlendFn is captured per-share and processing continues', async () => {
    const order = orderOf([mixItem({ recipeName: 'Boom' }), mixItem({ recipeName: 'Fine' })]);
    const createBlendFn = jest.fn()
      .mockRejectedValueOnce(new Error('db exploded'))
      .mockResolvedValueOnce({ success: true, blendId: 'b-2' });

    const results = await processCommunityBlendShares(order, createBlendFn);

    expect(results[0]).toMatchObject({ success: false, blendName: 'Boom', error: 'db exploded' });
    expect(results[1]).toMatchObject({ success: true, blendName: 'Fine', blendId: 'b-2' });
  });

  it('surfaces publish failures on the share result', async () => {
    const order = orderOf([mixItem()]);
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    const publishBlendFn = jest.fn().mockResolvedValue({ success: false, error: 'not owned' });

    const results = await processCommunityBlendShares(order, createBlendFn, publishBlendFn);

    expect(results[0]).toMatchObject({ success: false, blendId: 'b-1', error: 'not owned' });
  });

  it('reports creation failure without calling publish', async () => {
    const order = orderOf([mixItem()]);
    const createBlendFn = jest.fn().mockResolvedValue({ success: false, error: 'insert failed' });
    const publishBlendFn = jest.fn();

    const results = await processCommunityBlendShares(order, createBlendFn, publishBlendFn);

    expect(results[0]).toMatchObject({ success: false, error: 'insert failed' });
    expect(publishBlendFn).not.toHaveBeenCalled();
  });

  it('publishes through to the slug on the happy path', async () => {
    const order = orderOf([mixItem()]);
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    const publishBlendFn = jest.fn().mockResolvedValue({ success: true, slug: 'night-mix' });

    const results = await processCommunityBlendShares(order, createBlendFn, publishBlendFn);

    expect(results[0]).toEqual({ success: true, blendName: 'Night Mix', blendId: 'b-1', slug: 'night-mix', error: undefined });
    expect(publishBlendFn).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'b-1', orderId: 'order-1', consentToShare: true })
    );
  });
});

// ---------------------------------------------------------------------------
// trackBlendReferral — exclusions and rounding
// ---------------------------------------------------------------------------

describe('trackBlendReferral exclusions', () => {
  it('excludes gift cards from the referral base', async () => {
    mockTrackReferral.mockResolvedValue({ success: true, creditEarned: 500 });
    const order = orderOf([
      { ...oilItem('lavender'), price: 50, itemType: 'standard-oil' as const },
      { oilId: '', name: 'Gift Card', size: '', type: 'pure' as const, price: 100, itemType: 'gift-card' as const },
    ]);

    await trackBlendReferral({ order, referringShareCode: 'OIL-XXXX-YYYY' });

    expect(mockTrackReferral).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseAmount: 5000 }) // only the oil
    );
  });

  it('excludes shipping and rounds fractional dollars to cents', async () => {
    mockTrackReferral.mockResolvedValue({ success: true, creditEarned: 100 });
    const order = orderOf([
      { ...oilItem('lavender'), price: 19.99, itemType: 'standard-oil' as const },
      { oilId: '', name: 'Shipping', size: '', type: 'pure' as const, price: 9.95, itemType: 'shipping' as const },
    ]);

    await trackBlendReferral({ order, referringShareCode: 'OIL-XXXX-YYYY' });

    expect(mockTrackReferral).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseAmount: 1999 })
    );
  });

  it('multiplies by quantity and defaults quantity to 1', async () => {
    mockTrackReferral.mockResolvedValue({ success: true, creditEarned: 100 });
    const order = orderOf([
      { ...oilItem('lavender'), price: 10, quantity: 3, itemType: 'standard-oil' as const },
      { ...oilItem('lemon'), price: 7.5, itemType: 'standard-oil' as const },
    ]);

    await trackBlendReferral({ order, referringShareCode: 'OIL-XXXX-YYYY' });

    expect(mockTrackReferral).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseAmount: 3750 }) // 3000 + 750
    );
  });

  it('returns a failure result (never throws) when tracking errors', async () => {
    mockTrackReferral.mockRejectedValue(new Error('referral service down'));
    const order = orderOf([{ ...oilItem('lavender'), itemType: 'standard-oil' as const }]);

    const result = await trackBlendReferral({ order, referringShareCode: 'OIL-XXXX-YYYY' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('referral service down');
  });

  it('passes userAgent and ipAddress through to the tracker', async () => {
    mockTrackReferral.mockResolvedValue({ success: true, creditEarned: 0 });
    const order = orderOf([{ ...oilItem('lavender'), itemType: 'standard-oil' as const }]);

    await trackBlendReferral({
      order,
      referringShareCode: 'OIL-XXXX-YYYY',
      userAgent: 'Mozilla/5.0',
      ipAddress: '1.2.3.4',
    });

    expect(mockTrackReferral).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: 'Mozilla/5.0', referrerIp: '1.2.3.4' })
    );
  });
});

// ---------------------------------------------------------------------------
// calculateOrderXP
// ---------------------------------------------------------------------------

describe('calculateOrderXP', () => {
  it('awards 50 base XP for an empty order', () => {
    expect(calculateOrderXP(orderOf([]), [])).toBe(50);
  });

  it('adds 25 XP per unique oil (duplicates counted once)', () => {
    const order = orderOf([oilItem('lavender'), oilItem('lavender'), oilItem('lemon')]);

    expect(calculateOrderXP(order, [])).toBe(50 + 2 * 25);
  });

  it('adds 50 XP for the first enhanced purchase of an oil', () => {
    const order = orderOf([oilItem('lavender', 'enhanced')]);

    expect(calculateOrderXP(order, [])).toBe(50 + 25 + 50);
  });

  it('adds the enhanced bonus when upgrading from pure', () => {
    const order = orderOf([oilItem('lavender', 'enhanced')]);

    expect(calculateOrderXP(order, [unlock('lavender', 'pure')])).toBe(50 + 25 + 50);
  });

  it('does not add the enhanced bonus when already enhanced', () => {
    const order = orderOf([oilItem('lavender', 'enhanced')]);

    expect(calculateOrderXP(order, [unlock('lavender', 'enhanced')])).toBe(50 + 25);
  });
});

// ---------------------------------------------------------------------------
// orderContains30mlBottle boundaries
// ---------------------------------------------------------------------------

describe('orderContains30mlBottle boundaries', () => {
  it.each([
    ['size "30ml"', { size: '30ml', name: 'Lavender' }],
    ['size "30 ml" with space', { size: '30 ml', name: 'Lavender' }],
    ['size "30ML" uppercase', { size: '30ML', name: 'Lavender' }],
    ['name containing 30ml', { size: '', name: 'Lavender Essential Oil 30ml' }],
    ['name containing 30 ml', { size: '', name: 'Lavender 30 ml bottle' }],
  ])('detects %s', (_label, item) => {
    expect(orderContains30mlBottle(orderOf([{ ...oilItem('lavender'), ...item }]))).toBe(true);
  });

  it.each([
    ['10ml size', { size: '10ml', name: 'Lavender' }],
    ['130ml size does not false-match', { size: '130ml', name: 'Lavender' }],
    ['300ml name does not false-match', { size: '', name: 'Lavender 300ml' }],
    ['30 percent strength text', { size: '', name: 'Lavender 30 percent' }],
  ])('does not fire for %s', (_label, item) => {
    expect(orderContains30mlBottle(orderOf([{ ...oilItem('lavender'), ...item }]))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// completeOrderProcessing — orchestration
// ---------------------------------------------------------------------------

describe('completeOrderProcessing orchestration', () => {
  it('awards commission for blend items with price×quantity in cents', async () => {
    const order = orderOf([
      { ...oilItem(''), name: 'Calm Nights', blendId: 'blend-1', price: 42.5, quantity: 2 },
    ]);

    const result = await completeOrderProcessing(order, 'buyer-2', []);

    expect(mockRecordBlendPurchase).toHaveBeenCalledWith('blend-1', 'order-1', 'buyer-2', 8500);
    expect(result.commissionResults).toEqual([
      { blendId: 'blend-1', success: true, commissionAmount: 100 },
    ]);
  });

  it('does not award commissions for non-blend items', async () => {
    await completeOrderProcessing(orderOf([oilItem('lavender')]), 'user-1', []);

    expect(mockRecordBlendPurchase).not.toHaveBeenCalled();
  });

  it('blocks unsafe shared mixes via server re-validation (nothing created or published)', async () => {
    mockValidateCustomMixServer.mockReturnValue({
      canProceed: false,
      errors: ['Total essential oil concentration exceeds safe dermal limit'],
      safetyScore: 15,
      safetyRating: 'dangerous',
      safetyWarnings: [],
    });
    const order = orderOf([mixItem()]);

    const result = await completeOrderProcessing(order, 'user-1', []);

    expect(result.communityShares).toHaveLength(1);
    expect(result.communityShares[0].success).toBe(false);
    expect(mockInsertCommunityBlend).not.toHaveBeenCalled();
    expect(mockPublishBlendRecord).not.toHaveBeenCalled();
  });

  it('creates and publishes consented mixes through the session-free store', async () => {
    const order = orderOf([mixItem()]);

    const result = await completeOrderProcessing(order, 'user-1', []);

    expect(mockInsertCommunityBlend).toHaveBeenCalledWith(
      expect.objectContaining({ creatorId: 'user-1', consentToShare: true, originalOrderId: 'order-1' })
    );
    expect(mockPublishBlendRecord).toHaveBeenCalledWith(
      expect.objectContaining({ blendId: 'b-1', creatorId: 'user-1', orderId: 'order-1' })
    );
    expect(result.communityShares[0]).toMatchObject({ success: true, slug: 'blend-slug' });
  });

  it('a failing library save does not fail the rest of the pipeline', async () => {
    mockSaveBlendToLibrary.mockRejectedValue(new Error('library unavailable'));
    const order = orderOf([mixItem(), oilItem('lavender')]);

    const result = await completeOrderProcessing(order, 'user-1', []);

    expect(result.savedBlends[0].success).toBe(false);
    expect(result.savedBlends[0].error).toBe('library unavailable');
    // Everything else still ran
    expect(result.communityShares[0].success).toBe(true);
    expect(result.unlockResult.newUnlocks).toHaveLength(1);
    expect(result.xpEarned).toBeGreaterThan(0);
  });

  it('a failing refill unlock does not fail the pipeline', async () => {
    mockCreateUnlockedRefill.mockRejectedValue(new Error('refill store down'));
    const order = orderOf([mixItem()]);

    const result = await completeOrderProcessing(order, 'user-1', []);

    expect(result.unlockedRefills[0].success).toBe(false);
    expect(result.unlockedRefills[0].error).toBe('refill store down');
    expect(result.communityShares[0].success).toBe(true);
  });

  it('a failing order-stamp for the 30ml unlock is logged but not thrown', async () => {
    mockDbUpdateWhere.mockRejectedValueOnce(new Error('db down'));
    const order = orderOf([oilItem('lavender')]); // size 30ml

    await expect(completeOrderProcessing(order, 'user-1', [])).resolves.toMatchObject({ orderId: 'order-1' });
  });

  it('skips the refill-program unlock when userId is empty', async () => {
    const order = orderOf([oilItem('lavender')]); // 30ml item

    await completeOrderProcessing(order, '', []);

    expect(mockUnlockRefillForCustomer).not.toHaveBeenCalled();
  });

  it('forwards referral options and returns the result', async () => {
    mockTrackReferral.mockResolvedValue({ success: true, creditEarned: 250 });
    const order = orderOf([{ ...oilItem('lavender'), price: 25, itemType: 'standard-oil' as const }]);

    const result = await completeOrderProcessing(order, 'user-1', [], { referringShareCode: 'OIL-AAAA-BBBB' });

    expect(result.referralResult).toEqual({ success: true, creditEarned: 250, error: undefined });
  });
});
