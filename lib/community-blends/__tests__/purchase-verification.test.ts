/**
 * hasUserPurchasedBlend tests
 * Verified-purchase ratings must be backed by a real paid order.
 */

const mockDb = {
  query: {
    orders: { findFirst: jest.fn() },
  },
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

import { hasUserPurchasedBlend } from '../queries';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('hasUserPurchasedBlend', () => {
  it('returns true when a matching paid order exists', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue({ id: 'order-1' });

    const result = await hasUserPurchasedBlend('user-1', 'blend-1');

    expect(result).toBe(true);
    expect(mockDb.query.orders.findFirst).toHaveBeenCalledTimes(1);
  });

  it('returns false when no qualifying order exists', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    const result = await hasUserPurchasedBlend('user-1', 'blend-1');

    expect(result).toBe(false);
  });

  it('scopes the check to a specific order when orderId is given', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue({ id: 'order-9' });

    const result = await hasUserPurchasedBlend('user-1', 'blend-1', 'order-9');

    expect(result).toBe(true);
    // The where clause must include the order restriction — a second
    // condition set was built (eq on orders.id is included in the `and`)
    const call = mockDb.query.orders.findFirst.mock.calls[0][0];
    expect(call.where).toBeDefined();
  });

  it('returns false when the claimed order belongs to someone else', async () => {
    // DB returns nothing because customerId doesn't match
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    const result = await hasUserPurchasedBlend('user-1', 'blend-1', 'other-users-order');

    expect(result).toBe(false);
  });

  it('returns false (never throws) when the query fails', async () => {
    mockDb.query.orders.findFirst.mockRejectedValue(new Error('db down'));

    const result = await hasUserPurchasedBlend('user-1', 'blend-1');

    expect(result).toBe(false);
  });
});
