/**
 * Credit & Bottle Restoration tests (refund/cancellation contract)
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn(() => ({
  set: jest.fn(() => ({ where: mockUpdateWhere })),
}));

const mockDb = {
  query: {
    creditTransactions: { findFirst: jest.fn() },
    customerCredits: { findFirst: jest.fn() },
    foreverBottleHistory: { findMany: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

const mockGetForeverBottleById = jest.fn();
jest.mock('@/lib/refill/forever-bottle', () => ({
  getForeverBottleById: (...args: unknown[]) => mockGetForeverBottleById(...args),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import {
  restoreCustomerCredits,
  restoreRefillCredit,
  releaseBottleLock,
} from '../credit-restore';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// restoreCustomerCredits / restoreRefillCredit
// ---------------------------------------------------------------------------

describe('restoreCustomerCredits', () => {
  it('creates a credit balance and transaction when none exists', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await restoreCustomerCredits('cust-1', 500, 'refund-order-1');

    // customer_credits insert + credit_transactions insert
    expect(mockInsert).toHaveBeenCalledTimes(2);
    const txn = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'earned');
    expect(txn).toMatchObject({
      customerId: 'cust-1',
      type: 'earned',
      amount: 500,
      balance: 500,
    });
  });

  it('adds to an existing balance', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'cust-1',
      balance: 300,
    });

    await restoreCustomerCredits('cust-1', 500, 'refund-order-1');

    expect(mockUpdate).toHaveBeenCalled();
    const txn = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'earned');
    expect(txn).toMatchObject({ amount: 500, balance: 800 });
  });

  it('is idempotent by (customerId, reason)', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue({
      id: 'txn-existing',
      metadata: { restoreReason: 'refund-order-1' },
    });

    await restoreCustomerCredits('cust-1', 500, 'refund-order-1');

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects non-positive or non-integer amounts', async () => {
    await expect(restoreCustomerCredits('cust-1', 0, 'r')).rejects.toThrow();
    await expect(restoreCustomerCredits('cust-1', -100, 'r')).rejects.toThrow();
    await expect(restoreCustomerCredits('cust-1', 5.5, 'r')).rejects.toThrow();
  });
});

describe('restoreRefillCredit', () => {
  it('restores a refill credit with a transaction record', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await restoreRefillCredit('cust-1', 500, 'refill-refund-order-2');

    const txn = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'earned');
    expect(txn).toMatchObject({ customerId: 'cust-1', amount: 500 });
    expect(txn.description).toMatch(/refill credit restored/i);
  });
});

// ---------------------------------------------------------------------------
// releaseBottleLock
// ---------------------------------------------------------------------------

describe('releaseBottleLock', () => {
  it('is a no-op when the bottle is not locked', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-1',
      status: 'active',
      currentFillLevel: 80,
      customerId: 'cust-1',
    });

    await releaseBottleLock('bottle-1', 'refund');

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns an in-transit bottle to empty when its fill level is 0', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-1',
      status: 'in-transit',
      currentFillLevel: 0,
      customerId: 'cust-1',
    });
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([]);

    await releaseBottleLock('bottle-1', 'refund-order-1');

    expect(mockUpdate).toHaveBeenCalled();
    const historyInsert = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.eventType === 'lock-released');
    expect(historyInsert).toMatchObject({
      bottleId: 'bottle-1',
      metadata: expect.objectContaining({
        reason: 'refund-order-1',
        previousStatus: 'in-transit',
        restoredStatus: 'empty',
      }),
    });
  });

  it('restores the pre-lock status from bottle history when available', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-1',
      status: 'in-transit',
      currentFillLevel: 0,
      customerId: 'cust-1',
    });
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([
      { eventType: 'return-shipped', metadata: { previousStatus: 'active' } },
    ]);

    await releaseBottleLock('bottle-1', 'cancelled');

    const historyInsert = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.eventType === 'lock-released');
    expect(historyInsert.metadata.restoredStatus).toBe('active');
  });

  it('throws when the bottle does not exist', async () => {
    mockGetForeverBottleById.mockResolvedValue(null);

    await expect(releaseBottleLock('nope', 'refund')).rejects.toThrow(/not found/i);
  });
});
