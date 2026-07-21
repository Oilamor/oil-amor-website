/**
 * Hardening tests — lib/orders/order-enricher.ts
 *
 * scaleRecipe math (ratio, rounding, carrier derivation), refill enrichment
 * from batch records and original orders, community-blend enrichment
 * (commission math, customMix preservation vs DB-recipe fallback), and
 * batch routing in enrichOrderItems.
 */

const mockGetBatchRecord = jest.fn();
jest.mock('@/lib/batch/records', () => ({
  getBatchRecord: (...args: unknown[]) => mockGetBatchRecord(...args),
}));

const mockDb = {
  query: {
    orders: { findFirst: jest.fn() },
    communityBlends: { findFirst: jest.fn() },
  },
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

import { scaleRecipe, enrichRefillItem, enrichCommunityBlendItem, enrichOrderItems } from '../order-enricher';
import type { EnrichedOrderItem } from '../types';

beforeEach(() => {
  jest.clearAllMocks();
});

function baseItem(overrides: Partial<EnrichedOrderItem> = {}): EnrichedOrderItem {
  return {
    id: 'item-1',
    name: 'Item',
    type: 'pure_oil',
    unitPrice: 30,
    quantity: 1,
    totalPrice: 30,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scaleRecipe
// ---------------------------------------------------------------------------

describe('scaleRecipe', () => {
  const oils = [
    { oilName: 'Lavender', ml: 3, percentage: 60 },
    { oilName: 'Lemon', ml: 2, percentage: 40 },
  ];

  it('scales oil ml by the volume ratio, rounded to 1 decimal', () => {
    const scaled = scaleRecipe(oils, undefined, undefined, 30, 100, 'pure');

    // ratio 100/30 = 3.333… → 3 × 3.333 = 10.0, 2 × 3.333 = 6.7
    expect(scaled.oils).toEqual([
      { oilName: 'Lavender', ml: 10, percentage: 60 },
      { oilName: 'Lemon', ml: 6.7, percentage: 40 },
    ]);
    expect(scaled.totalVolume).toBe(100);
  });

  it('preserves percentages untouched (only ml scales)', () => {
    const scaled = scaleRecipe(oils, 'jojoba', 25, 30, 60, 'carrier');

    expect(scaled.oils.map(o => o.percentage)).toEqual([60, 40]);
  });

  it('scales the provided carrier ml by the same ratio', () => {
    const scaled = scaleRecipe(oils, 'jojoba', 25, 30, 60, 'carrier');

    expect(scaled.carrierOil).toBe('jojoba');
    expect(scaled.carrierMl).toBe(50); // 25 × 2
  });

  it('derives carrier ml from the target volume when not provided', () => {
    const scaled = scaleRecipe(oils, 'jojoba', undefined, 30, 60, 'carrier');

    // 60 − (6 + 4) = 50
    expect(scaled.carrierMl).toBe(50);
  });

  it('returns no carrierMl for pure mode even with a carrier oil name', () => {
    const scaled = scaleRecipe(oils, 'jojoba', 25, 30, 60, 'pure');

    expect(scaled.carrierMl).toBeUndefined();
  });

  it('handles downscaling (target smaller than source)', () => {
    const scaled = scaleRecipe(oils, undefined, undefined, 100, 30, 'pure');

    expect(scaled.oils[0].ml).toBe(0.9); // 3 × 0.3
    expect(scaled.oils[1].ml).toBe(0.6); // 2 × 0.3
  });

  it('identity scaling keeps values stable', () => {
    const scaled = scaleRecipe(oils, 'jojoba', 25, 30, 30, 'carrier');

    expect(scaled.oils.map(o => o.ml)).toEqual([3, 2]);
    expect(scaled.carrierMl).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// enrichRefillItem
// ---------------------------------------------------------------------------

describe('enrichRefillItem', () => {
  it('returns the same item when it is not a refill', async () => {
    const item = baseItem();

    expect(await enrichRefillItem(item)).toBe(item);
    expect(mockGetBatchRecord).not.toHaveBeenCalled();
  });

  it('returns the item unchanged when no recipe source resolves', async () => {
    const item = baseItem({ isRefill: true, sourceVolume: 30, targetVolume: 100 });

    expect(await enrichRefillItem(item)).toBe(item);
  });

  it('returns the item unchanged when volumes are missing', async () => {
    mockGetBatchRecord.mockResolvedValue({
      blendName: 'Night Mix',
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 9, percentage: 100 }],
      size: 30,
    });
    const item = baseItem({ isRefill: true, originalBatchId: 'batch-1' }); // no volumes

    expect(await enrichRefillItem(item)).toBe(item);
  });

  it('scales the batch recipe to the target volume (100-carrierRatio math)', async () => {
    mockGetBatchRecord.mockResolvedValue({
      blendName: 'Night Mix',
      carrierOil: 'jojoba',
      carrierPercentage: 70, // 70% of the source volume is carrier
      oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 9, percentage: 100 }],
      size: 30,
      safetyScore: 97,
      safetyWarnings: ['dilute before use'],
    });
    const item = baseItem({
      type: 'refill',
      isRefill: true,
      originalBatchId: 'batch-1',
      sourceVolume: 30,
      targetVolume: 100,
    });

    const enriched = await enrichRefillItem(item);

    // Oils: 9ml × (100/30) = 30ml
    expect(enriched.scaledRecipe!.oils).toEqual([{ oilName: 'Lavender', ml: 30, percentage: 100 }]);
    // Carrier: sourceVolume × 70/100 = 21ml → × (100/30) = 70ml; 30 + 70 = 100 total
    expect(enriched.scaledRecipe!.carrierMl).toBe(70);
    expect(enriched.scaledRecipe!.totalVolume).toBe(100);
    expect(enriched.customMix).toMatchObject({
      name: 'Night Mix',
      mode: 'carrier',
      totalVolume: 100,
      carrierOil: 'jojoba',
      carrierPercentage: 70,
      carrierMl: 70,
      safetyScore: 97,
      safetyWarnings: ['dilute before use'],
    });
    // Batch id format OA-YYMMDD-XXXX
    expect(enriched.customMix!.batchId).toMatch(/^OA-\d{6}-[A-Z0-9]{4}$/);
  });

  it('treats a batch without a carrier oil as pure mode', async () => {
    mockGetBatchRecord.mockResolvedValue({
      blendName: 'Pure Mix',
      oils: [{ oilId: 'myrrh', oilName: 'Myrrh', ml: 10, percentage: 100 }],
      size: 10,
    });
    const item = baseItem({
      type: 'refill', isRefill: true, originalBatchId: 'b-2', sourceVolume: 10, targetVolume: 50,
    });

    const enriched = await enrichRefillItem(item);

    expect(enriched.customMix!.mode).toBe('pure');
    expect(enriched.scaledRecipe!.carrierMl).toBeUndefined();
    expect(enriched.scaledRecipe!.oils[0].ml).toBe(50);
  });

  it('falls back to the original order customMix when there is no batch', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue({
      id: 'order-orig',
      items: [
        { name: 'Some oil' },
        {
          customMix: {
            recipeName: 'Original Mix',
            mode: 'carrier',
            carrierOilId: 'jojoba',
            carrierRatio: 70,
            totalVolume: 30,
            oils: [{ oilId: 'lavender', oilName: 'Lavender', ml: 9, percentage: 100 }],
            safetyScore: 90,
            safetyRating: 'safe',
            safetyWarnings: [],
          },
        },
      ],
    });
    const item = baseItem({
      type: 'refill', isRefill: true, originalOrderId: 'order-orig', sourceVolume: 30, targetVolume: 100,
    });

    const enriched = await enrichRefillItem(item);

    expect(enriched.customMix!.name).toBe('Original Mix');
    expect(enriched.scaledRecipe!.oils[0].ml).toBe(30);
    expect(enriched.scaledRecipe!.carrierMl).toBe(70);
  });

  it('returns the item unchanged when the original order has no customMix item', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue({ id: 'order-orig', items: [{ name: 'plain oil' }] });
    const item = baseItem({
      type: 'refill', isRefill: true, originalOrderId: 'order-orig', sourceVolume: 30, targetVolume: 100,
    });

    expect(await enrichRefillItem(item)).toBe(item);
  });
});

// ---------------------------------------------------------------------------
// enrichCommunityBlendItem
// ---------------------------------------------------------------------------

describe('enrichCommunityBlendItem', () => {
  it('returns the same item when there is no communityBlendId', async () => {
    const item = baseItem({ type: 'community_blend' });

    expect(await enrichCommunityBlendItem(item)).toBe(item);
    expect(mockDb.query.communityBlends.findFirst).not.toHaveBeenCalled();
  });

  it('returns the item unchanged when the blend no longer exists', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);
    const item = baseItem({ type: 'community_blend', communityBlendId: 'gone' });

    expect(await enrichCommunityBlendItem(item)).toBe(item);
  });

  it('computes a 10% commission on the item total (cents → dollars)', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'blend-1', name: 'Calm Nights', creatorId: 'creator-1', creatorName: 'Ada', recipe: {},
    });
    const item = baseItem({ type: 'community_blend', communityBlendId: 'blend-1', totalPrice: 42.5 });

    const enriched = await enrichCommunityBlendItem(item);

    expect(enriched.commissionRate).toBe(10);
    expect(enriched.commissionAmount).toBe(4.25); // 4250 cents × 10% = 425 → $4.25
    expect(enriched).toMatchObject({
      communityBlendName: 'Calm Nights',
      communityBlendCreatorId: 'creator-1',
      communityBlendCreatorName: 'Ada',
    });
  });

  it('rounds the commission to whole cents before converting back to dollars', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'blend-1', name: 'X', creatorId: 'c', creatorName: 'C', recipe: {},
    });
    // $33.33 → 3333 cents × 10% = 333.3 → round 333 → $3.33
    const item = baseItem({ type: 'community_blend', communityBlendId: 'blend-1', totalPrice: 33.33 });

    const enriched = await enrichCommunityBlendItem(item);

    expect(enriched.commissionAmount).toBe(3.33);
  });

  it('preserves an existing customMix from the cart (scaled recipe wins)', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'blend-1',
      name: 'Calm Nights',
      creatorId: 'creator-1',
      creatorName: 'Ada',
      recipe: { mode: 'pure', bottleSize: 30, oils: [{ oilId: 'x', name: 'X', ml: 30 }] },
    });
    const existingMix = {
      name: 'Scaled Mix', mode: 'carrier' as const, totalVolume: 100,
      oils: [{ oilId: '', oilName: 'Lavender', ml: 30, percentage: 100 }],
      safetyScore: 95, safetyRating: 'safe', safetyWarnings: [], batchId: 'OA-260101-ABCD',
    };
    const item = baseItem({ type: 'community_blend', communityBlendId: 'blend-1', customMix: existingMix });

    const enriched = await enrichCommunityBlendItem(item);

    expect(enriched.customMix).toBe(existingMix); // identity — untouched
  });

  it('falls back to the DB recipe when the item has no customMix', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'blend-1',
      name: 'Calm Nights',
      creatorId: 'creator-1',
      creatorName: 'Ada',
      recipe: {
        mode: 'carrier',
        bottleSize: 30,
        carrierOilId: 'jojoba',
        oils: [
          { oilId: 'lavender', name: 'Lavender', ml: 5.4 },
          { oilId: 'lemon', oilName: 'Lemon', ml: 3.6 },
        ],
      },
      crystalId: 'amethyst',
    });
    const item = baseItem({ type: 'community_blend', communityBlendId: 'blend-1', bottleSize: 30 });

    const enriched = await enrichCommunityBlendItem(item);

    expect(enriched.customMix).toMatchObject({
      name: 'Calm Nights',
      mode: 'carrier',
      totalVolume: 30,
      carrierOil: 'jojoba',
      crystal: 'amethyst',
    });
    // oilName maps from `name` when `oilName` is absent; ml preserved
    expect(enriched.customMix!.oils).toEqual([
      { oilId: 'lavender', oilName: 'Lavender', ml: 5.4, percentage: 0 },
      { oilId: 'lemon', oilName: 'Lemon', ml: 3.6, percentage: 0 },
    ]);
    expect(enriched.customMix!.batchId).toMatch(/^OA-\d{6}-[A-Z0-9]{4}$/);
  });

  it('leaves customMix undefined when the blend has no recipe oils', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'blend-1', name: 'Empty', creatorId: 'c', creatorName: 'C', recipe: {},
    });
    const item = baseItem({ type: 'community_blend', communityBlendId: 'blend-1' });

    const enriched = await enrichCommunityBlendItem(item);

    expect(enriched.customMix).toBeUndefined();
    expect(enriched.communityBlendName).toBe('Empty');
  });
});

// ---------------------------------------------------------------------------
// enrichOrderItems routing
// ---------------------------------------------------------------------------

describe('enrichOrderItems', () => {
  it('routes refills and community blends, leaving other items untouched', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue({
      id: 'blend-1', name: 'Calm Nights', creatorId: 'c', creatorName: 'C', recipe: {},
    });
    const plain = baseItem({ id: 'p', type: 'pure_oil' });
    const refill = baseItem({ id: 'r', type: 'refill', isRefill: true });
    const community = baseItem({ id: 'c', type: 'community_blend', communityBlendId: 'blend-1' });

    const enriched = await enrichOrderItems([plain, refill, community]);

    expect(enriched).toHaveLength(3);
    expect(enriched[0]).toBe(plain); // untouched
    expect(enriched[1]).toBe(refill); // refill with no resolvable recipe — same object
    expect(enriched[2].communityBlendName).toBe('Calm Nights');
  });

  it('returns an empty array for no items', async () => {
    expect(await enrichOrderItems([])).toEqual([]);
  });
});
