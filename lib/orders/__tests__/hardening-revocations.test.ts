/**
 * Hardening tests — lib/orders/revocations.ts
 *
 * Complements revocations.test.ts: pins the delete target (unlocked_oils
 * filtered by unlockedBy = the given order id only), nonexistent-order
 * no-op, and DB-error propagation.
 */

import { PgDialect } from 'drizzle-orm/pg-core';

const mockInfo = jest.fn();
jest.mock('@/lib/logging/logger', () => ({
  logger: { info: (...a: unknown[]) => mockInfo(...a), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn(() => ({ where: mockDeleteWhere }));
jest.mock('@/lib/db', () => ({ db: { delete: mockDelete } }));

import { revokeOrderUnlocks } from '../revocations';
import { unlockedOils } from '@/lib/db/schema-refill';

const dialect = new PgDialect();

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteWhere.mockResolvedValue(undefined);
});

describe('revokeOrderUnlocks hardening', () => {
  it('deletes from the unlocked_oils table', async () => {
    await revokeOrderUnlocks('order-1');

    expect(mockDelete).toHaveBeenCalledWith(unlockedOils);
  });

  it('targets only rows granted by the given order (unlockedBy = orderId)', async () => {
    await revokeOrderUnlocks('order-42');

    const cond = mockDeleteWhere.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(sql).toContain('"unlocked_by"');
    expect(params).toEqual(['order-42']);
  });

  it('scopes each revocation to its own order — other orders are untouched', async () => {
    await revokeOrderUnlocks('order-A');
    await revokeOrderUnlocks('order-B');

    const condA = mockDeleteWhere.mock.calls[0][0];
    const condB = mockDeleteWhere.mock.calls[1][0];
    expect(dialect.sqlToQuery(condA).params).toEqual(['order-A']);
    expect(dialect.sqlToQuery(condB).params).toEqual(['order-B']);
  });

  it('is a successful no-op for a nonexistent order (zero rows deleted)', async () => {
    mockDeleteWhere.mockResolvedValue([]);

    await expect(revokeOrderUnlocks('no-such-order')).resolves.toBeUndefined();
  });

  it('logs the revocation with the order id', async () => {
    await revokeOrderUnlocks('order-7');

    expect(mockInfo).toHaveBeenCalledWith(
      expect.stringMatching(/revoked oil unlocks/i),
      expect.objectContaining({ orderId: 'order-7' })
    );
  });

  it('propagates DB errors (caller decides how to handle refund flows)', async () => {
    mockDeleteWhere.mockRejectedValue(new Error('db down'));

    await expect(revokeOrderUnlocks('order-1')).rejects.toThrow('db down');
  });
});
