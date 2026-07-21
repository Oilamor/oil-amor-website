/**
 * Order Completion tests
 *
 * - carrierRatio percent-vs-fraction regression (CRITICAL unit bug)
 * - safety re-validation on share
 * - recipe-priced blends (no flat $35)
 * - referral credit computed on merchandise subtotal (excl. GST + shipping)
 * - 30ml refill-unlock wiring
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

import type { Order } from '@/lib/context/user-context';
import {
  processCommunityBlendShares,
  trackBlendReferral,
  orderContains30mlBottle,
  completeOrderProcessing,
} from '../order-completion';
import { calculateBlendPriceCents } from '@/lib/community-blends/pricing';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function carrierMixOrder(): Order {
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
          carrierRatio: 30, // PERCENT — 30% of volume is essential oils
          totalVolume: 30,
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
  safetyScore: 88,
  safetyRating: 'caution',
  safetyWarnings: ['Contains citrus — avoid sun exposure'],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateCustomMixServer.mockReturnValue(passingValidation);
  mockSaveBlendToLibrary.mockResolvedValue({ success: true, blendId: 'ub-1', shareCode: 'OIL-AAAA-1111' });
  mockCreateUnlockedRefill.mockResolvedValue({ success: true, refillId: 'r-1' });
});

// ---------------------------------------------------------------------------
// carrierRatio percent math (regression: was treated as 0–1 fraction)
// ---------------------------------------------------------------------------

describe('processCommunityBlendShares carrierRatio math', () => {
  it('treats carrierRatio as a PERCENT for strength (not × 100)', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });

    await processCommunityBlendShares(carrierMixOrder(), createBlendFn);

    const recipe = createBlendFn.mock.calls[0][0].recipe;
    expect(recipe.strength).toBe(30); // was 3000 with the fraction bug
  });

  it('computes oil ml from totalVolume × carrierRatio/100 × percentage/100', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });

    await processCommunityBlendShares(carrierMixOrder(), createBlendFn);

    const recipe = createBlendFn.mock.calls[0][0].recipe;
    // 30ml × 30% = 9ml essential oils; 60/40 split
    expect(recipe.oils[0].ml).toBeCloseTo(5.4, 2);
    expect(recipe.oils[1].ml).toBeCloseTo(3.6, 2);
    // All ml must be positive (the fraction bug made these negative)
    for (const oil of recipe.oils) {
      expect(oil.ml).toBeGreaterThan(0);
    }
    // Total essential oil volume = 30% of 30ml
    const totalOilMl = recipe.oils.reduce((s: number, o: { ml: number }) => s + o.ml, 0);
    expect(totalOilMl).toBeCloseTo(9, 1);
  });

  it('uses 100% essential oils for pure blends', async () => {
    const order = carrierMixOrder();
    order.items[0].customMix!.mode = 'pure';
    order.items[0].customMix!.carrierRatio = undefined;
    order.items[0].customMix!.totalVolume = 10;

    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    await processCommunityBlendShares(order, createBlendFn);

    const recipe = createBlendFn.mock.calls[0][0].recipe;
    expect(recipe.strength).toBe(100);
    const totalOilMl = recipe.oils.reduce((s: number, o: { ml: number }) => s + o.ml, 0);
    expect(totalOilMl).toBeCloseTo(10, 1);
  });

  it('prices the blend from the recipe via the pricing engine (not flat $35)', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });

    await processCommunityBlendShares(carrierMixOrder(), createBlendFn);

    const input = createBlendFn.mock.calls[0][0];
    expect(input.price).not.toBe(3500);
    expect(input.price).toBe(
      calculateBlendPriceCents({
        mode: 'carrier',
        bottleSize: 30,
        strength: 30,
        oils: [
          { oilId: 'lavender', ml: 5.4 },
          { oilId: 'lemon', ml: 3.6 },
        ],
      })
    );
  });

  it('stores the server-computed safety fields on the recipe', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });

    await processCommunityBlendShares(carrierMixOrder(), createBlendFn);

    const recipe = createBlendFn.mock.calls[0][0].recipe;
    expect(recipe.safetyScore).toBe(88);
    expect(recipe.safetyRating).toBe('caution');
    expect(recipe.safetyWarnings).toEqual(['Contains citrus — avoid sun exposure']);
  });

  it('sanitizes the blend name before creating', async () => {
    const order = carrierMixOrder();
    order.items[0].customMix!.recipeName = '<b>Calm</b> Nights';

    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });
    await processCommunityBlendShares(order, createBlendFn);

    expect(createBlendFn.mock.calls[0][0].name).toBe('Calm Nights');
  });
});

// ---------------------------------------------------------------------------
// Safety re-validation
// ---------------------------------------------------------------------------

describe('processCommunityBlendShares safety re-validation', () => {
  it('does not create or publish a mix that fails server validation', async () => {
    mockValidateCustomMixServer.mockReturnValue({
      canProceed: false,
      errors: ['Total essential oil concentration exceeds safe dermal limit'],
      safetyScore: 20,
      safetyRating: 'dangerous',
      safetyWarnings: [],
    });

    const createBlendFn = jest.fn();
    const publishBlendFn = jest.fn();

    const results = await processCommunityBlendShares(carrierMixOrder(), createBlendFn, publishBlendFn);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toMatch(/safety validation failed/i);
    expect(createBlendFn).not.toHaveBeenCalled();
    expect(publishBlendFn).not.toHaveBeenCalled();
  });

  it('passes the mix to the server validator with oils, volume and carrierRatio', async () => {
    const createBlendFn = jest.fn().mockResolvedValue({ success: true, blendId: 'b-1' });

    await processCommunityBlendShares(carrierMixOrder(), createBlendFn);

    expect(mockValidateCustomMixServer).toHaveBeenCalledWith(
      expect.objectContaining({
        totalVolume: 30,
        carrierRatio: 30,
        oils: [
          { oilId: 'lavender', ml: 5.4, percentage: 60 },
          { oilId: 'lemon', ml: 3.6, percentage: 40 },
        ],
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Referral math — merchandise subtotal only
// ---------------------------------------------------------------------------

describe('trackBlendReferral', () => {
  it('computes the referral base on merchandise subtotal, not order.total', async () => {
    mockTrackReferral.mockResolvedValue({ success: true, creditEarned: 1000 });

    const order: Order = {
      id: 'order-9',
      customerId: 'buyer-2',
      date: new Date().toISOString(),
      status: 'processing',
      total: 115, // 100 merchandise + 10 GST + 5 shipping
      items: [
        { oilId: 'lavender', name: 'Lavender 30ml', size: '30ml', type: 'pure', price: 50, quantity: 2, itemType: 'standard-oil' },
        { oilId: '', name: 'Shipping', size: '', type: 'pure', price: 15, itemType: 'shipping' },
      ],
    };

    const result = await trackBlendReferral({ order, referringShareCode: 'OIL-ABCD-1234' });

    expect(mockTrackReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        shareCode: 'OIL-ABCD-1234',
        orderId: 'order-9',
        purchaseAmount: 10000, // $100 merchandise in cents — not $115 total
        referredUserId: 'buyer-2',
      })
    );
    expect(result.success).toBe(true);
  });

  it('does nothing when there is no share code', async () => {
    const result = await trackBlendReferral({ order: carrierMixOrder(), referringShareCode: null });

    expect(result.success).toBe(true);
    expect(mockTrackReferral).not.toHaveBeenCalled();
  });

  it('does nothing when the merchandise subtotal is zero', async () => {
    const order: Order = {
      id: 'order-10',
      customerId: 'buyer-2',
      date: new Date().toISOString(),
      status: 'processing',
      total: 5,
      items: [
        { oilId: '', name: 'Shipping', size: '', type: 'pure', price: 5, itemType: 'shipping' },
      ],
    };

    const result = await trackBlendReferral({ order, referringShareCode: 'OIL-ABCD-1234' });

    expect(result.success).toBe(true);
    expect(mockTrackReferral).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 30ml refill unlock wiring
// ---------------------------------------------------------------------------

describe('orderContains30mlBottle', () => {
  it('detects by item size', () => {
    const order = carrierMixOrder(); // size '30ml'
    expect(orderContains30mlBottle(order)).toBe(true);
  });

  it('detects by item name', () => {
    const order = carrierMixOrder();
    order.items[0].size = '';
    order.items[0].name = 'Lavender Essential Oil 30ml';
    expect(orderContains30mlBottle(order)).toBe(true);
  });

  it('returns false for non-30ml orders', () => {
    const order = carrierMixOrder();
    order.items[0].size = '10ml';
    order.items[0].name = 'Lavender Essential Oil';
    expect(orderContains30mlBottle(order)).toBe(false);
  });
});

describe('completeOrderProcessing refill unlock', () => {
  it('stamps the order and unlocks refill when a 30ml bottle is purchased', async () => {
    const order: Order = {
      id: 'order-30',
      customerId: 'user-1',
      date: new Date().toISOString(),
      status: 'processing',
      total: 50,
      items: [
        { oilId: 'lavender', name: 'Lavender Essential Oil', size: '30ml', type: 'pure', price: 50 },
      ],
    };

    await completeOrderProcessing(order, 'user-1', []);

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDbUpdateWhere).toHaveBeenCalled();
    expect(mockUnlockRefillForCustomer).toHaveBeenCalledWith('user-1');
  });

  it('does not unlock refill for orders without a 30ml item', async () => {
    const order: Order = {
      id: 'order-10ml',
      customerId: 'user-1',
      date: new Date().toISOString(),
      status: 'processing',
      total: 25,
      items: [
        { oilId: 'lavender', name: 'Lavender Essential Oil', size: '10ml', type: 'pure', price: 25 },
      ],
    };

    await completeOrderProcessing(order, 'user-1', []);

    expect(mockUnlockRefillForCustomer).not.toHaveBeenCalled();
  });
});
