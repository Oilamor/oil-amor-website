/**
 * Return Workflow — refill order pricing JSONB unit consistency
 *
 * Regression test for the mixed-unit JSON:
 * { standardPrice: 35, creditApplied: 500, finalPrice: 30 }
 * All values must now be integer cents.
 *
 * 2026-07-21: algorithm-driven refill pricing — standardPrice is computed by
 * the cost-based engine per oil (lavender 100ml → 3095 cents), never a flat
 * fee. At initiation no credit has been applied yet (the checkout route
 * applies credits afterwards via updateRefillOrderPricing), so the stored
 * finalPrice equals the standardPrice.
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockDb = {
  query: {
    refillOrders: { findFirst: jest.fn(), findMany: jest.fn() },
  },
  insert: mockInsert,
  update: jest.fn(() => ({
    set: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
  })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/shipping/auspost', () => ({
  generateReturnLabel: jest.fn().mockResolvedValue({
    trackingNumber: 'TGE123',
    labelUrl: 'https://example.com/label.pdf',
    expiresAt: new Date('2030-01-01'),
  }),
  trackReturn: jest.fn(),
  verifyBottleReceived: jest.fn(),
}));

const mockGetForeverBottleById = jest.fn();
jest.mock('@/lib/refill/forever-bottle', () => ({
  getForeverBottleById: (...args: unknown[]) => mockGetForeverBottleById(...args),
  isBottleEligibleForRefill: jest.fn().mockResolvedValue({ eligible: true }),
  updateBottleStatus: jest.fn(),
  setBottleReturnLabel: jest.fn().mockResolvedValue(undefined),
  incrementRefillCount: jest.fn(),
  checkBottleRetirementEligibility: jest.fn(),
  retireBottle: jest.fn(),
}));

import { initiateRefillOrder } from '../return-workflow';

const ADDRESS = {
  firstName: 'A',
  lastName: 'B',
  address1: '1 St',
  city: 'Sydney',
  province: 'NSW',
  zip: '2000',
  country: 'AU',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetForeverBottleById.mockResolvedValue({
    id: 'bottle-1',
    customerId: 'cust-1',
    oilType: 'lavender',
    status: 'empty',
    currentFillLevel: 0,
    refillCount: 0,
  });
});

describe('initiateRefillOrder pricing', () => {
  it('writes the engine-computed price in integer cents', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', {
      customerAddress: ADDRESS,
    });

    const inserted = mockValues.mock.calls.map(c => c[0]).find(v => v && v.pricing);
    expect(inserted).toBeDefined();
    // Lavender 100ml pure refill = 3095 cents ($30.95), computed by
    // lib/refill/pricing from wholesale cost — not the old flat 3500.
    expect(inserted.pricing).toEqual({
      standardPrice: 3095,
      creditApplied: 0,
      finalPrice: 3095,
    });
  });

  it('returns the computed pricing so the checkout route charges the same amount', async () => {
    const result = await initiateRefillOrder('cust-1', 'bottle-1', {
      customerAddress: ADDRESS,
    });

    expect(result.pricing).toEqual({
      standardPrice: 3095,
      creditApplied: 0,
      finalPrice: 3095,
    });
  });

  it('computes per-oil prices — a luxury oil costs more, never a flat fee', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-2',
      customerId: 'cust-1',
      oilType: 'myrrh',
      status: 'empty',
      currentFillLevel: 0,
      refillCount: 0,
    });

    const result = await initiateRefillOrder('cust-1', 'bottle-2', {
      customerAddress: ADDRESS,
    });

    // Myrrh 100ml pure refill = 17895 cents ($178.95) — above the $100
    // wholesale oil cost the old flat $35 was selling below.
    expect(result.pricing.standardPrice).toBe(17895);
    expect(result.pricing.standardPrice).toBeGreaterThan(10000);
  });

  it('rejects bottles whose oil cannot be engine-priced (never falls back to 0 or flat)', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-3',
      customerId: 'cust-1',
      oilType: 'ghost-oil',
      status: 'empty',
      currentFillLevel: 0,
      refillCount: 0,
    });

    await expect(
      initiateRefillOrder('cust-1', 'bottle-3', { customerAddress: ADDRESS })
    ).rejects.toThrow(/unknown oil/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
