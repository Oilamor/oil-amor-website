/**
 * Return Workflow — refill order pricing JSONB unit consistency
 *
 * Regression test for the mixed-unit JSON:
 * { standardPrice: 35, creditApplied: 500, finalPrice: 30 }
 * All values must now be integer cents.
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
import { REFILL_CREDIT_AMOUNT } from '../credits';

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
  it('writes all pricing fields in integer cents', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', {
      customerAddress: {
        firstName: 'A',
        lastName: 'B',
        address1: '1 St',
        city: 'Sydney',
        province: 'NSW',
        zip: '2000',
        country: 'AU',
      },
    });

    const inserted = mockValues.mock.calls.map(c => c[0]).find(v => v && v.pricing);
    expect(inserted).toBeDefined();
    expect(inserted.pricing).toEqual({
      standardPrice: 3500,
      creditApplied: 500,
      finalPrice: 3000,
    });
  });

  it('creditApplied matches the credit ledger unit (REFILL_CREDIT_AMOUNT)', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', {
      customerAddress: {
        firstName: 'A',
        lastName: 'B',
        address1: '1 St',
        city: 'Sydney',
        province: 'NSW',
        zip: '2000',
        country: 'AU',
      },
    });

    const inserted = mockValues.mock.calls.map(c => c[0]).find(v => v && v.pricing);
    expect(inserted.pricing.creditApplied).toBe(REFILL_CREDIT_AMOUNT);
    // standard - credit = final, all in the same unit
    expect(inserted.pricing.standardPrice - inserted.pricing.creditApplied)
      .toBe(inserted.pricing.finalPrice);
  });
});
