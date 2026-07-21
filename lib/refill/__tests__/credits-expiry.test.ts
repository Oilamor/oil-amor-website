/**
 * Credits — partial-use expiry fix + cents-unit consistency tests
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn(() => ({
  set: jest.fn(() => ({ where: mockUpdateWhere })),
}));

const mockDb = {
  query: {
    creditTransactions: { findFirst: jest.fn(), findMany: jest.fn() },
    customerCredits: { findFirst: jest.fn() },
    customers: { findFirst: jest.fn() },
    foreverBottles: { findMany: jest.fn() },
    orders: { findFirst: jest.fn(), findMany: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import { processExpiredCredits, REFILL_CREDIT_AMOUNT } from '../credits';
import { getRefillRules, calculateFinalPrice } from '../eligibility';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Unit consistency (would have caught the cents/dollars mix)
// ---------------------------------------------------------------------------

describe('cents unit consistency', () => {
  it('REFILL_CREDIT_AMOUNT is 500 cents ($5.00)', () => {
    expect(REFILL_CREDIT_AMOUNT).toBe(500);
  });

  it('REFILL_RULES prices are integer cents and internally consistent', () => {
    const rules = getRefillRules();

    expect(rules.standardRefillPrice).toBe(3500);
    expect(rules.returnCreditAmount).toBe(500);
    expect(rules.effectiveRefillPrice).toBe(3000);
    // effective = standard - credit, all in the same unit
    expect(rules.standardRefillPrice - rules.returnCreditAmount).toBe(rules.effectiveRefillPrice);
    // The return credit amount equals the credit ledger unit
    expect(rules.returnCreditAmount).toBe(REFILL_CREDIT_AMOUNT);
  });

  it('calculateFinalPrice subtracts a cents balance from a cents price', () => {
    // $5.00 credit against the $30.00 effective price → $25.00
    const result = calculateFinalPrice(500);
    expect(result).toEqual({ basePrice: 3000, creditDiscount: 500, finalPrice: 2500 });
  });

  it('calculateFinalPrice caps credit at the price', () => {
    const result = calculateFinalPrice(999999);
    expect(result.finalPrice).toBe(0);
    expect(result.creditDiscount).toBe(3000);
  });

  it('calculateFinalPrice ignores credits when disabled or zero', () => {
    expect(calculateFinalPrice(0).finalPrice).toBe(3000);
    expect(calculateFinalPrice(500, false).finalPrice).toBe(3000);
  });
});

// ---------------------------------------------------------------------------
// Partial-use credit expiry (regression: only full amounts expired)
// ---------------------------------------------------------------------------

describe('processExpiredCredits', () => {
  const expiredTxn = {
    id: 'txn-1',
    customerId: 'cust-1',
    type: 'earned',
    amount: 500,
    expiresAt: new Date('2020-01-01'),
  };

  it('expires the full amount when the credit is untouched', async () => {
    mockDb.query.creditTransactions.findMany.mockResolvedValue([expiredTxn]);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'cust-1',
      balance: 500,
    });

    const result = await processExpiredCredits();

    expect(result).toEqual({ expired: 1, totalAmount: 500 });
    const expiry = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'expired');
    expect(expiry).toMatchObject({ amount: -500, balance: 0 });
  });

  it('expires the REMAINING balance of a partially used credit', async () => {
    mockDb.query.creditTransactions.findMany.mockResolvedValue([expiredTxn]);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'cust-1',
      balance: 200, // customer already used 300 of the 500
    });

    const result = await processExpiredCredits();

    // Previously this returned { expired: 0, totalAmount: 0 } and the
    // remaining 200 cents never expired
    expect(result).toEqual({ expired: 1, totalAmount: 200 });
    const expiry = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'expired');
    expect(expiry).toMatchObject({ amount: -200, balance: 0 });
    expect(expiry.description).toMatch(/remaining 200 of 500/i);
  });

  it('records a zero marker for fully used credits so they are not rescanned', async () => {
    mockDb.query.creditTransactions.findMany.mockResolvedValue([expiredTxn]);
    mockDb.query.customerCredits.findFirst.mockResolvedValue({
      customerId: 'cust-1',
      balance: 0,
    });

    const result = await processExpiredCredits();

    expect(result).toEqual({ expired: 0, totalAmount: 0 });
    const marker = mockValues.mock.calls.map(c => c[0]).find(v => v && v.type === 'expired');
    expect(marker).toMatchObject({
      amount: 0,
      metadata: expect.objectContaining({ originalTransactionId: 'txn-1' }),
    });
    // Balance must not be touched
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('skips customers with no credit record', async () => {
    mockDb.query.creditTransactions.findMany.mockResolvedValue([expiredTxn]);
    mockDb.query.customerCredits.findFirst.mockResolvedValue(null);

    const result = await processExpiredCredits();

    expect(result).toEqual({ expired: 0, totalAmount: 0 });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('processes multiple expired credits across customers', async () => {
    mockDb.query.creditTransactions.findMany.mockResolvedValue([
      expiredTxn,
      { ...expiredTxn, id: 'txn-2', customerId: 'cust-2', amount: 500 },
    ]);
    mockDb.query.customerCredits.findFirst
      .mockResolvedValueOnce({ customerId: 'cust-1', balance: 500 })
      .mockResolvedValueOnce({ customerId: 'cust-2', balance: 100 });

    const result = await processExpiredCredits();

    expect(result).toEqual({ expired: 2, totalAmount: 600 });
  });
});
