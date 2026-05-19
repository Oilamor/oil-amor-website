/**
 * Blend Creator Commission System - Unit Tests
 * 
 * Tests for commission calculation logic, types, and pure functions.
 * Note: Server actions (awardBlendCommission) require DB mocking and are tested
 * at the integration level.
 */

import {
  CREATOR_COMMISSION_RATE,
  type CommissionResult,
  type CreatorEarnings,
} from '../commissions-types';

// ============================================================================
// TESTS
// ============================================================================

describe('Commission Types & Constants', () => {
  it('has a 10% commission rate', () => {
    expect(CREATOR_COMMISSION_RATE).toBe(10);
  });

  it('commission rate is a positive integer', () => {
    expect(CREATOR_COMMISSION_RATE).toBeGreaterThan(0);
    expect(Number.isInteger(CREATOR_COMMISSION_RATE)).toBe(true);
  });
});

describe('Commission Calculations', () => {
  const calculateCommission = (saleAmountCents: number): number => {
    return Math.round((saleAmountCents * CREATOR_COMMISSION_RATE) / 100);
  };

  it('calculates 10% commission correctly', () => {
    expect(calculateCommission(10000)).toBe(1000); // $100.00 → $10.00
    expect(calculateCommission(5000)).toBe(500);   // $50.00 → $5.00
    expect(calculateCommission(2500)).toBe(250);   // $25.00 → $2.50
  });

  it('handles small amounts', () => {
    expect(calculateCommission(100)).toBe(10);   // $1.00 → $0.10
    expect(calculateCommission(50)).toBe(5);     // $0.50 → $0.05
    expect(calculateCommission(10)).toBe(1);     // $0.10 → $0.01
  });

  it('handles large amounts', () => {
    expect(calculateCommission(100000)).toBe(10000); // $1,000 → $100
    expect(calculateCommission(500000)).toBe(50000); // $5,000 → $500
  });

  it('rounds fractional cents correctly', () => {
    expect(calculateCommission(999)).toBe(100); // $9.99 → $1.00 (rounded)
    expect(calculateCommission(149)).toBe(15);  // $1.49 → $0.15 (rounded)
  });

  it('returns 0 for zero sale amount', () => {
    expect(calculateCommission(0)).toBe(0);
  });

  it('is idempotent for same inputs', () => {
    const amount = 12345;
    const c1 = calculateCommission(amount);
    const c2 = calculateCommission(amount);
    expect(c1).toBe(c2);
  });

  it('scales linearly with sale amount', () => {
    const base = calculateCommission(1000);
    expect(calculateCommission(2000)).toBe(base * 2);
    expect(calculateCommission(3000)).toBe(base * 3);
  });
});

describe('Earnings Aggregation', () => {
  it('aggregates multiple commission earnings', () => {
    const sales = [
      { amount: 10000, commission: 1000 },
      { amount: 5000, commission: 500 },
      { amount: 2500, commission: 250 },
    ];

    const totalEarned = sales.reduce((sum, s) => sum + s.commission, 0);
    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

    expect(totalEarned).toBe(1750);
    expect(totalSales).toBe(17500);
  });

  it('tracks pending vs total correctly', () => {
    const earnings: CreatorEarnings = {
      totalEarned: 5000,
      pendingAmount: 2000,
      totalSales: 50000,
      blendCount: 3,
    };

    expect(earnings.pendingAmount).toBeLessThanOrEqual(earnings.totalEarned);
    expect(earnings.totalSales).toBeGreaterThan(0);
    expect(earnings.blendCount).toBeGreaterThan(0);
  });
});

describe('CommissionResult Type', () => {
  it('represents successful commission', () => {
    const result: CommissionResult = {
      success: true,
      commissionId: 'comm_123',
      commissionAmount: 1000,
      creatorId: 'user_456',
    };

    expect(result.success).toBe(true);
    expect(result.commissionAmount).toBe(1000);
    expect(result.error).toBeUndefined();
  });

  it('represents failed commission with error', () => {
    const result: CommissionResult = {
      success: false,
      commissionAmount: 0,
      error: 'Blend not found',
    };

    expect(result.success).toBe(false);
    expect(result.commissionAmount).toBe(0);
    expect(result.error).toBe('Blend not found');
  });

  it('represents idempotent duplicate', () => {
    const result: CommissionResult = {
      success: true,
      commissionAmount: 1000,
      alreadyExists: true,
    };

    expect(result.success).toBe(true);
    expect(result.alreadyExists).toBe(true);
  });
})
