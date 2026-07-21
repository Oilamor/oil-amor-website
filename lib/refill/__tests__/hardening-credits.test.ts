/**
 * Hardening tests — Refill credit ledger (credits.ts)
 *
 * Pins the cents unit end-to-end, earn/use/adjust flows, the useCredits
 * transactional balance re-check (insufficient → no partial deduction),
 * validation, summaries, expiry helpers, and transfers. DB is fully mocked.
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

// Transaction-scoped mocks (useCredits runs inside db.transaction)
const mockTxLimit = jest.fn();
const mockTxWhere = jest.fn(() => ({ limit: mockTxLimit }));
const mockTxFrom = jest.fn(() => ({ where: mockTxWhere }));
const mockTxSelect = jest.fn(() => ({ from: mockTxFrom }));
const mockTxUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockTxSet = jest.fn(() => ({ where: mockTxUpdateWhere }));
const mockTxUpdate = jest.fn(() => ({ set: mockTxSet }));
const mockTxValues = jest.fn().mockResolvedValue(undefined);
const mockTxInsert = jest.fn(() => ({ values: mockTxValues }));

const mockDb = {
  query: {
    creditTransactions: { findFirst: jest.fn(), findMany: jest.fn() },
    customerCredits: { findFirst: jest.fn(), findMany: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
  transaction: jest.fn((cb: (tx: unknown) => unknown) =>
    Promise.resolve(cb({ select: mockTxSelect, update: mockTxUpdate, insert: mockTxInsert }))
  ),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import {
  REFILL_CREDIT_AMOUNT,
  processRefillCredit,
  useCredits,
  adjustCreditBalance,
  validateCreditUsage,
  getCreditHistory,
  getCreditSummary,
  getExpiringCredits,
  transferCredits,
  getAllCreditBalances,
} from '../credits';

/** Find an inserted credit_transactions row by type */
function insertedTxn(type: string) {
  return mockValues.mock.calls
    .map(c => c[0])
    .find(v => v && v.type === type && v.customerId);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Unit pinning
// ---------------------------------------------------------------------------

describe('REFILL_CREDIT_AMOUNT units', () => {
  it('is 500 integer cents ($5.00 AUD), not dollars', () => {
    expect(REFILL_CREDIT_AMOUNT).toBe(500);
    expect(Number.isInteger(REFILL_CREDIT_AMOUNT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// processRefillCredit (earn)
// ---------------------------------------------------------------------------

describe('processRefillCredit', () => {
  it('creates a new credit record with 500 cents when none exists', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce(null)              // pre-write read
      .mockResolvedValueOnce({ balance: 500 }); // post-write read

    const result = await processRefillCredit('cust-1', 'bottle-1', 'TGE123');

    expect(result.creditApplied).toBe(500);
    expect(result.newBalance).toBe(500);
    const accountRow = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.balance === 500 && v.totalEarned === 500 && !v.type);
    expect(accountRow).toMatchObject({ customerId: 'cust-1', totalUsed: 0 });
  });

  it('adds 500 cents to an existing balance', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 700, totalEarned: 700 })
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 1200, totalEarned: 1200 });

    const result = await processRefillCredit('cust-1', 'bottle-1', 'TGE123');

    expect(mockUpdate).toHaveBeenCalled();
    expect(result.newBalance).toBe(1200);
    const txn = insertedTxn('earned');
    expect(txn).toMatchObject({ amount: 500, balance: 1200 });
  });

  it('writes an earned transaction in cents with an expiry ~12 months out', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue(null);
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ balance: 500 });

    await processRefillCredit('cust-1', 'bottle-1', 'TGE123');

    const txn = insertedTxn('earned');
    expect(txn.type).toBe('earned');
    expect(txn.amount).toBe(500);
    expect(txn.metadata).toMatchObject({
      bottleId: 'bottle-1',
      trackingNumber: 'TGE123',
      creditAmount: 500,
    });
    const twelveMonthsMs = txn.expiresAt.getTime() - txn.createdAt.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    expect(twelveMonthsMs).toBeGreaterThanOrEqual(360 * dayMs);
    expect(twelveMonthsMs).toBeLessThanOrEqual(370 * dayMs);
  });

  it('is idempotent per tracking number — a second credit for the same return throws', async () => {
    mockDb.query.creditTransactions.findFirst.mockResolvedValue({
      id: 'txn-existing',
      metadata: { trackingNumber: 'TGE123' },
    });

    await expect(processRefillCredit('cust-1', 'bottle-1', 'TGE123'))
      .rejects.toThrow(/already applied/i);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useCredits (spend)
// ---------------------------------------------------------------------------

describe('useCredits', () => {
  function primeValidation(balance: number) {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'cust-1', balance });
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]); // pending
  }

  it('deducts cents and writes a negative used transaction', async () => {
    primeValidation(1000);
    mockTxLimit.mockResolvedValue([{ customerId: 'cust-1', balance: 1000, totalUsed: 0 }]);

    const result = await useCredits('cust-1', 300, 'order-1');

    expect(result).toMatchObject({
      success: true,
      amountUsed: 300,
      remainingBalance: 700,
    });
    expect(mockTxSet).toHaveBeenCalledWith(expect.objectContaining({ balance: 700 }));
    const txn = mockTxValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'used');
    expect(txn).toMatchObject({
      amount: -300,
      balance: 700,
      metadata: { orderId: 'order-1', amountUsed: 300 },
    });
  });

  it('allows spending the exact balance down to zero', async () => {
    primeValidation(1000);
    mockTxLimit.mockResolvedValue([{ customerId: 'cust-1', balance: 1000, totalUsed: 0 }]);

    const result = await useCredits('cust-1', 1000, 'order-1');

    expect(result.remainingBalance).toBe(0);
  });

  it('rejects when validation shows insufficient funds — transaction never starts', async () => {
    primeValidation(100);

    await expect(useCredits('cust-1', 300, 'order-1'))
      .rejects.toThrow(/credit usage invalid/i);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('rejects zero and negative amounts', async () => {
    primeValidation(1000);

    await expect(useCredits('cust-1', 0, 'order-1')).rejects.toThrow();
    await expect(useCredits('cust-1', -50, 'order-1')).rejects.toThrow();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('re-checks the balance inside the transaction — no partial deduction on race', async () => {
    // Validation saw 1000, but by the time the transaction reads it is 100.
    primeValidation(1000);
    mockTxLimit.mockResolvedValue([{ customerId: 'cust-1', balance: 100, totalUsed: 0 }]);

    await expect(useCredits('cust-1', 300, 'order-1'))
      .rejects.toThrow(/insufficient credit balance/i);
    // Nothing was written inside the transaction
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  it('throws when the customer has no credit record at all', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]);

    await expect(useCredits('cust-1', 300, 'order-1'))
      .rejects.toThrow(/credit usage invalid/i);
  });
});

// ---------------------------------------------------------------------------
// adjustCreditBalance (admin)
// ---------------------------------------------------------------------------

describe('adjustCreditBalance', () => {
  it('creates a record when none exists (positive adjustment)', async () => {
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ balance: 250 });

    const result = await adjustCreditBalance('cust-1', 250, 'goodwill', 'admin-1');

    const accountRow = mockValues.mock.calls
      .map(c => c[0])
      .find(v => v && v.customerId === 'cust-1' && !v.type);
    expect(accountRow).toMatchObject({ balance: 250, totalEarned: 250, totalUsed: 0 });
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(250);
  });

  it('applies a positive adjustment to an existing record', async () => {
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 100 })
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 350 });

    const result = await adjustCreditBalance('cust-1', 250, 'goodwill', 'admin-1');

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ balance: 350 }));
    expect(result.newBalance).toBe(350);
    const txn = insertedTxn('adjusted');
    expect(txn).toMatchObject({
      amount: 250,
      balance: 350,
      metadata: { adminId: 'admin-1', reason: 'goodwill', previousBalance: 100 },
    });
  });

  it('rejects an adjustment that would drive an existing balance negative', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ customerId: 'cust-1', balance: 100 });

    await expect(adjustCreditBalance('cust-1', -200, 'clawback', 'admin-1'))
      .rejects.toThrow(/negative balance/i);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('allows an adjustment that zeroes the balance exactly', async () => {
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 100 })
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 0 });

    const result = await adjustCreditBalance('cust-1', -100, 'clawback', 'admin-1');

    expect(result.newBalance).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validateCreditUsage
// ---------------------------------------------------------------------------

describe('validateCreditUsage', () => {
  it('is valid when the balance covers the request and the request is positive', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ balance: 1000 });
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]);

    await expect(validateCreditUsage('cust-1', 500)).resolves.toEqual({
      valid: true,
      availableBalance: 1000,
      suggestedUsage: 500,
      pendingCredits: 0,
    });
  });

  it('is invalid for zero or negative requests even with funds available', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ balance: 1000 });
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]);

    const zero = await validateCreditUsage('cust-1', 0);
    const negative = await validateCreditUsage('cust-1', -5);

    expect(zero.valid).toBe(false);
    expect(negative.valid).toBe(false);
  });

  it('is invalid when the request exceeds the balance and suggests the full balance', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ balance: 1000 });
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]);

    const result = await validateCreditUsage('cust-1', 1500);

    expect(result.valid).toBe(false);
    expect(result.suggestedUsage).toBe(1000);
  });

  it('treats a missing credit record as a zero balance', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]);

    const result = await validateCreditUsage('cust-1', 500);

    expect(result.valid).toBe(false);
    expect(result.availableBalance).toBe(0);
    expect(result.suggestedUsage).toBe(0);
  });

  it('sums pending in-transit credits by absolute value', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({ balance: 1000 });
    mockDb.query.creditTransactions.findMany.mockResolvedValue([
      { amount: 500, metadata: { status: 'pending' } },
      { amount: -500, metadata: { status: 'pending' } },
    ]);

    const result = await validateCreditUsage('cust-1', 500);

    expect(result.pendingCredits).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// getCreditHistory / getCreditSummary / getExpiringCredits
// ---------------------------------------------------------------------------

describe('credit history and summary', () => {
  it('getCreditHistory coerces amounts to numbers and dates to Date', async () => {
    mockDb.query.creditTransactions.findMany.mockResolvedValue([
      {
        id: 't1',
        customerId: 'cust-1',
        type: 'earned',
        amount: '500',
        balance: '500',
        description: 'x',
        metadata: { bottleId: 'b1' },
        createdAt: '2025-01-01T00:00:00.000Z',
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const history = await getCreditHistory('cust-1');

    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe(500);
    expect(history[0].balance).toBe(500);
    expect(history[0].createdAt).toBeInstanceOf(Date);
    expect(history[0].expiresAt).toBeInstanceOf(Date);
  });

  it('getCreditSummary returns zeros for a customer with no record', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);
    mockDb.query.creditTransactions.findMany.mockResolvedValue([]);

    await expect(getCreditSummary('cust-1')).resolves.toEqual({
      totalEarned: 0,
      totalUsed: 0,
      totalExpired: 0,
      currentBalance: 0,
      pendingCredits: 0,
      expiringSoon: 0,
    });
  });

  it('getCreditSummary combines the record with expiring and pending sums', async () => {
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      balance: 800,
      totalEarned: 1500,
      totalUsed: 700,
    });
    mockDb.query.creditTransactions.findMany
      .mockResolvedValueOnce([{ amount: 500 }, { amount: -500 }]) // expiring soon
      .mockResolvedValueOnce([{ amount: 500 }]);                  // pending

    const summary = await getCreditSummary('cust-1');

    expect(summary).toMatchObject({
      totalEarned: 1500,
      totalUsed: 700,
      currentBalance: 800,
      expiringSoon: 1000,
      pendingCredits: 500,
    });
  });

  it('getExpiringCredits reports absolute amounts and ceil-ed days remaining', async () => {
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    mockDb.query.creditTransactions.findMany.mockResolvedValue([
      { id: 't1', amount: -500, expiresAt: inTenDays },
    ]);

    const result = await getExpiringCredits('cust-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      transactionId: 't1',
      amount: 500,
      daysRemaining: 10,
    });
    expect(result[0].expiresAt).toEqual(inTenDays);
  });
});

// ---------------------------------------------------------------------------
// transferCredits / getAllCreditBalances
// ---------------------------------------------------------------------------

describe('transferCredits', () => {
  it('moves cents between customers via two adjustments', async () => {
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce({ customerId: 'cust-a', balance: 1000 }) // deduct read
      .mockResolvedValueOnce({ customerId: 'cust-a', balance: 700 })  // deduct post-read
      .mockResolvedValueOnce({ customerId: 'cust-b', balance: 200 })  // add read
      .mockResolvedValueOnce({ customerId: 'cust-b', balance: 500 }); // add post-read

    const result = await transferCredits('cust-a', 'cust-b', 300, 'gift', 'admin-1');

    expect(result).toEqual({ success: true, fromBalance: 700, toBalance: 500 });
    const amounts = mockValues.mock.calls
      .map(c => c[0])
      .filter(v => v && v.type === 'adjusted')
      .map(v => v.amount);
    expect(amounts).toEqual([-300, 300]);
  });
});

describe('getAllCreditBalances', () => {
  it('maps records and converts lastActivity to a Date', async () => {
    mockDb.query.customerCredits.findMany.mockResolvedValue([
      { customerId: 'c1', balance: 900, totalEarned: 1000, totalUsed: 100, updatedAt: '2025-01-01T00:00:00.000Z' },
      { customerId: 'c2', balance: 100, totalEarned: 100, totalUsed: 0, updatedAt: '2025-01-02T00:00:00.000Z' },
    ]);

    const result = await getAllCreditBalances();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ customerId: 'c1', balance: 900 });
    expect(result[0].lastActivity).toBeInstanceOf(Date);
  });

  it('applies the minBalance filter', async () => {
    mockDb.query.customerCredits.findMany.mockResolvedValue([
      { customerId: 'c1', balance: 900, totalEarned: 1000, totalUsed: 100, updatedAt: new Date() },
      { customerId: 'c2', balance: 100, totalEarned: 100, totalUsed: 0, updatedAt: new Date() },
    ]);

    const result = await getAllCreditBalances({ minBalance: 500 });

    expect(result).toHaveLength(1);
    expect(result[0].customerId).toBe('c1');
  });
});
