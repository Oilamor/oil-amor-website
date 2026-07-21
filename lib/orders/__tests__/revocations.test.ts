/**
 * revokeOrderUnlocks tests
 */

const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
const mockDb = {
  delete: jest.fn(() => ({ where: mockDeleteWhere })),
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

import { revokeOrderUnlocks } from '../revocations';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('revokeOrderUnlocks', () => {
  it('deletes unlocks granted by the order', async () => {
    await revokeOrderUnlocks('order-1');

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a second call succeeds with no rows deleted', async () => {
    await revokeOrderUnlocks('order-1');
    await revokeOrderUnlocks('order-1');

    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });
});
