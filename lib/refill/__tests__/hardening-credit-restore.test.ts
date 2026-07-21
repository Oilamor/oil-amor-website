/**
 * Hardening tests — Credit & bottle restoration edge cases
 *
 * Extends credit-restore.test.ts: idempotency key scoping, amount validation
 * boundaries, restored-credit expiry semantics, and the releaseBottleLock
 * state-restoration matrix (history-derived status, fill fallback, retired
 * bottles never resurrected).
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

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

function insertedEarnedTxn() {
  return mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'earned');
}

function insertedHistoryEvent() {
  return mockValues.mock.calls.map(c => c[0]).find(v => v && v.eventType === 'lock-released');
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// restore amount validation
// ---------------------------------------------------------------------------

describe('restore amount validation', () => {
  it('accepts a 1-cent restore (smallest positive integer)', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await expect(restoreCustomerCredits('cust-1', 1, 'reason-1')).resolves.toBeUndefined();

    const txn = insertedEarnedTxn();
    expect(txn.amount).toBe(1);
  });

  it('accepts very large integer amounts', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await expect(restoreCustomerCredits('cust-1', 10_000_000, 'reason-1')).resolves.toBeUndefined();
  });

  it('rejects NaN, Infinity, and -Infinity', async () => {
    await expect(restoreCustomerCredits('cust-1', NaN, 'r')).rejects.toThrow(/positive integer/);
    await expect(restoreCustomerCredits('cust-1', Infinity, 'r')).rejects.toThrow(/positive integer/);
    await expect(restoreCustomerCredits('cust-1', -Infinity, 'r')).rejects.toThrow(/positive integer/);
    expect(mockDb.query.creditTransactions.findFirst).not.toHaveBeenCalled();
  });

  it('rejects fractional cents', async () => {
    await expect(restoreRefillCredit('cust-1', 500.5, 'r')).rejects.toThrow(/positive integer/);
    await expect(restoreRefillCredit('cust-1', 0.1, 'r')).rejects.toThrow(/positive integer/);
  });
});

// ---------------------------------------------------------------------------
// Idempotency key scoping
// ---------------------------------------------------------------------------

describe('restore idempotency', () => {
  it('applies again under a DIFFERENT reason for the same customer', async () => {
    // No transaction with this (customerId, reason) pair → proceeds
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ balance: 500 });

    await restoreCustomerCredits('cust-1', 500, 'refund-order-2');

    expect(mockInsert).toHaveBeenCalled();
  });

  it('is a no-op when the SAME (customerId, reason) was already restored', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue({
      id: 'txn-prior',
      metadata: { restoreReason: 'refund-order-1' },
    });

    await restoreCustomerCredits('cust-1', 500, 'refund-order-1');

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Restored credit record semantics
// ---------------------------------------------------------------------------

describe('restored credit record', () => {
  it('writes restoreReason into metadata for the idempotency key', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await restoreCustomerCredits('cust-1', 500, 'refund-order-9');

    const txn = insertedEarnedTxn();
    expect(txn.metadata).toMatchObject({
      reason: 'refund-order-9',
      restoreReason: 'refund-order-9',
    });
    expect(Number.isNaN(Date.parse(txn.metadata.restoredAt))).toBe(false);
  });

  it('restored credits carry no expiry (expiresAt null)', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await restoreRefillCredit('cust-1', 500, 'refill-refund-1');

    const txn = insertedEarnedTxn();
    expect(txn.expiresAt).toBeNull();
  });

  it('computes the transaction balance from the pre-restore balance', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ balance: 1250 });

    await restoreRefillCredit('cust-1', 500, 'refill-refund-1');

    const txn = insertedEarnedTxn();
    expect(txn.balance).toBe(1750);
  });

  it('uses the refill-scoped description', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await restoreRefillCredit('cust-1', 500, 'refill-refund-1');

    expect(insertedEarnedTxn().description).toBe('Refill credit restored: refill-refund-1');
  });

  it('uses the generic restore description', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    await restoreCustomerCredits('cust-1', 500, 'goodwill-1');

    expect(insertedEarnedTxn().description).toBe('Credit restored: goodwill-1');
  });
});

// ---------------------------------------------------------------------------
// releaseBottleLock — state restoration matrix
// ---------------------------------------------------------------------------

describe('releaseBottleLock state restoration', () => {
  function lockedBottle(fillLevel = 0) {
    return {
      id: 'bottle-1',
      customerId: 'cust-1',
      status: 'in-transit',
      currentFillLevel: fillLevel,
      returnLabel: { trackingNumber: 'TGE123', generatedAt: 'x', expiresAt: 'y' },
    };
  }

  it('restores the pre-lock status recorded in history (refilled)', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(0));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([
      { eventType: 'return-shipped', metadata: { previousStatus: 'refilled' } },
    ]);

    await releaseBottleLock('bottle-1', 'order-cancelled');

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refilled' }));
    expect(insertedHistoryEvent().metadata.restoredStatus).toBe('refilled');
  });

  it('picks the return-shipped event out of a longer history', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(0));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([
      { eventType: 'refilled', metadata: {} },
      { eventType: 'return-shipped', metadata: { previousStatus: 'empty' } },
      { eventType: 'purchased', metadata: {} },
    ]);

    await releaseBottleLock('bottle-1', 'refund');

    expect(insertedHistoryEvent().metadata.restoredStatus).toBe('empty');
  });

  it('falls back to active when there is no history and the bottle has oil', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(45));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([]);

    await releaseBottleLock('bottle-1', 'refund');

    expect(insertedHistoryEvent().metadata.restoredStatus).toBe('active');
  });

  it('falls back to empty when there is no history and the bottle is drained', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(0));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([]);

    await releaseBottleLock('bottle-1', 'refund');

    expect(insertedHistoryEvent().metadata.restoredStatus).toBe('empty');
  });

  it('never resurrects a retired bottle — a retired previousStatus falls back to fill logic', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(30));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([
      { eventType: 'return-shipped', metadata: { previousStatus: 'retired' } },
    ]);

    await releaseBottleLock('bottle-1', 'refund');

    // fill 30 > 0 → active, not retired
    expect(insertedHistoryEvent().metadata.restoredStatus).toBe('active');
  });

  it('ignores an in-transit previousStatus (cannot restore into a lock)', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(0));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([
      { eventType: 'return-shipped', metadata: { previousStatus: 'in-transit' } },
    ]);

    await releaseBottleLock('bottle-1', 'refund');

    expect(insertedHistoryEvent().metadata.restoredStatus).toBe('empty');
  });

  it('clears the return label when releasing the lock', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(0));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([]);

    await releaseBottleLock('bottle-1', 'refund');

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ returnLabel: null }));
  });

  it('records the release reason and from/to statuses in history', async () => {
    mockGetForeverBottleById.mockResolvedValue(lockedBottle(10));
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([]);

    await releaseBottleLock('bottle-1', 'refund-order-7');

    expect(insertedHistoryEvent()).toMatchObject({
      bottleId: 'bottle-1',
      eventType: 'lock-released',
      metadata: {
        reason: 'refund-order-7',
        previousStatus: 'in-transit',
        restoredStatus: 'active',
      },
    });
  });

  it('is a no-op for retired bottles (never writes anything)', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-1',
      customerId: 'cust-1',
      status: 'retired',
      currentFillLevel: 0,
    });

    await releaseBottleLock('bottle-1', 'refund');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('is a no-op for refilled bottles', async () => {
    mockGetForeverBottleById.mockResolvedValue({
      id: 'bottle-1',
      customerId: 'cust-1',
      status: 'refilled',
      currentFillLevel: 100,
    });

    await releaseBottleLock('bottle-1', 'refund');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('is idempotent — a second release after restoration is a no-op', async () => {
    // First call: locked → released to empty
    mockGetForeverBottleById.mockResolvedValueOnce({
      id: 'bottle-1',
      customerId: 'cust-1',
      status: 'in-transit',
      currentFillLevel: 0,
    });
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue([]);

    await releaseBottleLock('bottle-1', 'refund');
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Second call: bottle now reads back as empty
    mockGetForeverBottleById.mockResolvedValueOnce({
      id: 'bottle-1',
      customerId: 'cust-1',
      status: 'empty',
      currentFillLevel: 0,
    });

    await releaseBottleLock('bottle-1', 'refund');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
