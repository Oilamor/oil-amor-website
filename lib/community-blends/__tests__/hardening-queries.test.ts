/**
 * Hardening tests — lib/community-blends/queries.ts
 *
 * Pins the actual SQL built for listing filters (published + community only),
 * sort columns, rating aggregation math, blend stats distribution, and the
 * hasUserPurchasedBlend qualification matrix. Where-clause assertions use
 * drizzle's PgDialect to render the real query the mock DB receives.
 */

import { PgDialect } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Chainable select mock
// ---------------------------------------------------------------------------

interface SelectChain {
  from: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => Promise<unknown>;
}

function makeSelectChain(result: unknown[]): SelectChain {
  const chain = {} as SelectChain;
  for (const m of ['from', 'where', 'orderBy', 'limit', 'offset'] as const) {
    chain[m] = jest.fn(() => chain);
  }
  chain.then = (onF, onR) => Promise.resolve(result).then(onF, onR);
  return chain;
}

let selectChain: SelectChain;

const mockDb = {
  select: jest.fn(() => selectChain),
  query: {
    communityBlends: { findFirst: jest.fn() },
    blendRatings: { findFirst: jest.fn() },
    orders: { findFirst: jest.fn() },
  },
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

import {
  listCommunityBlends,
  getBlendBySlug,
  getBlendById,
  getUserBlends,
  getFeaturedBlends,
  getBlendStats,
  hasUserPurchasedBlend,
  getUserRating,
} from '../queries';

const dialect = new PgDialect();

function renderWhere(call: jest.Mock, index = 0): { sql: string; params: unknown[] } {
  const cond = call.mock.calls[index][0];
  const q = dialect.sqlToQuery(cond);
  return { sql: q.sql, params: q.params };
}

function blendRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'blend-1',
    name: 'Calm Nights',
    slug: 'calm-nights',
    creatorId: 'creator-1',
    creatorName: 'Ada',
    ratingSum: 9,
    ratingCount: 2,
    viewCount: 10,
    purchaseCount: 3,
    popularityScore: 42,
    publishedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  selectChain = makeSelectChain([]);
});

// ---------------------------------------------------------------------------
// listCommunityBlends — visibility filter + sort + aggregation
// ---------------------------------------------------------------------------

describe('listCommunityBlends filters', () => {
  it('only returns published, community-visible blends', async () => {
    await listCommunityBlends();

    const { sql, params } = renderWhere(selectChain.where);
    expect(sql).toContain('"status"');
    expect(sql).toContain('"visibility"');
    expect(params).toEqual(['published', 'community']);
  });

  it('adds the creator filter when creatorId is given', async () => {
    await listCommunityBlends({ creatorId: 'creator-9' });

    // The creator branch rebuilds the query — inspect the LAST where call
    const last = selectChain.where.mock.calls.length - 1;
    const { sql, params } = renderWhere(selectChain.where, last);
    expect(sql).toContain('"creator_id"');
    expect(params).toEqual(['published', 'community', 'creator-9']);
  });

  it('forwards limit and offset to the query', async () => {
    await listCommunityBlends({ limit: 5, offset: 40 });

    expect(selectChain.limit).toHaveBeenCalledWith(5);
    expect(selectChain.offset).toHaveBeenCalledWith(40);
  });

  it('defaults to limit 20 / offset 0', async () => {
    await listCommunityBlends();

    expect(selectChain.limit).toHaveBeenCalledWith(20);
    expect(selectChain.offset).toHaveBeenCalledWith(0);
  });
});

describe('listCommunityBlends sort columns', () => {
  const cases: Array<[string, string]> = [
    ['popular', 'popularity_score'],
    ['newest', 'published_at'],
    ['rated', 'rating_sum'],
    ['purchased', 'purchase_count'],
  ];

  it.each(cases)('sortBy=%s orders by %s descending', async (sortBy, column) => {
    await listCommunityBlends({ sortBy: sortBy as never });

    const orderArg = selectChain.orderBy.mock.calls[0][0];
    const { sql } = dialect.sqlToQuery(orderArg);
    expect(sql).toContain(column);
    expect(sql.toLowerCase()).toContain('desc');
  });
});

describe('listCommunityBlends rating math', () => {
  it('computes averageRating as ratingSum / ratingCount', async () => {
    selectChain = makeSelectChain([blendRow({ ratingSum: 9, ratingCount: 2 })]);

    const [blend] = await listCommunityBlends();

    expect(blend.averageRating).toBe(4.5);
    expect(blend.ratingCount).toBe(2);
  });

  it('returns averageRating 0 when there are no ratings (no divide-by-zero)', async () => {
    selectChain = makeSelectChain([blendRow({ ratingSum: 0, ratingCount: 0 })]);

    const [blend] = await listCommunityBlends();

    expect(blend.averageRating).toBe(0);
  });

  it('returns an empty array when no blends match', async () => {
    const blends = await listCommunityBlends();
    expect(blends).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getBlendBySlug / getBlendById
// ---------------------------------------------------------------------------

describe('getBlendBySlug', () => {
  it('returns null when the slug does not exist', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    expect(await getBlendBySlug('nope')).toBeNull();
  });

  it('returns the blend with its ratings and computed average', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(
      blendRow({ ratingSum: 13, ratingCount: 3, ratings: [{ id: 'r1' }] })
    );

    const detail = await getBlendBySlug('calm-nights');

    expect(detail).not.toBeNull();
    expect(detail!.averageRating).toBeCloseTo(13 / 3, 5);
    expect(detail!.ratings).toEqual([{ id: 'r1' }]);
  });

  it('defaults ratings to an empty array when the relation is missing', async () => {
    const row = blendRow();
    delete (row as Record<string, unknown>).ratings;
    mockDb.query.communityBlends.findFirst.mockResolvedValue(row);

    const detail = await getBlendBySlug('calm-nights');

    expect(detail!.ratings).toEqual([]);
  });
});

describe('getBlendById', () => {
  it('returns null when the id does not exist', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    expect(await getBlendById('missing')).toBeNull();
  });

  it('computes averageRating from sum/count', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(
      blendRow({ ratingSum: 10, ratingCount: 4 })
    );

    const blend = await getBlendById('blend-1');

    expect(blend!.averageRating).toBe(2.5);
  });

  it('queries by the given id', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    await getBlendById('blend-xyz');

    const cond = mockDb.query.communityBlends.findFirst.mock.calls[0][0].where;
    const { params } = dialect.sqlToQuery(cond);
    expect(params).toEqual(['blend-xyz']);
  });
});

// ---------------------------------------------------------------------------
// getUserBlends / getFeaturedBlends
// ---------------------------------------------------------------------------

describe('getUserBlends', () => {
  it('filters by the creator id', async () => {
    await getUserBlends('user-7');

    const { sql, params } = renderWhere(selectChain.where);
    expect(sql).toContain('"creator_id"');
    expect(params).toEqual(['user-7']);
  });

  it('maps each blend with its computed average rating', async () => {
    selectChain = makeSelectChain([
      blendRow({ id: 'a', ratingSum: 8, ratingCount: 2 }),
      blendRow({ id: 'b', ratingSum: 0, ratingCount: 0 }),
    ]);

    const blends = await getUserBlends('user-7');

    expect(blends.map(b => b.averageRating)).toEqual([4, 0]);
  });
});

describe('getFeaturedBlends', () => {
  it('requires published + community + at least 3 ratings', async () => {
    await getFeaturedBlends();

    const { params } = renderWhere(selectChain.where);
    expect(params).toEqual(['published', 'community', 3]);
  });

  it('forwards the limit and orders by popularity', async () => {
    await getFeaturedBlends(8);

    expect(selectChain.limit).toHaveBeenCalledWith(8);
    const orderArg = selectChain.orderBy.mock.calls[0][0];
    expect(dialect.sqlToQuery(orderArg).sql).toContain('popularity_score');
  });
});

// ---------------------------------------------------------------------------
// getBlendStats
// ---------------------------------------------------------------------------

describe('getBlendStats', () => {
  it('returns null when the blend does not exist', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    expect(await getBlendStats('missing')).toBeNull();
  });

  it('builds a 1–5 star distribution and caps recentRatings at 5', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(
      blendRow({ ratingSum: 20, ratingCount: 5, viewCount: 99, purchaseCount: 7 })
    );
    const ratings = [
      { id: 'r1', rating: 5 },
      { id: 'r2', rating: 5 },
      { id: 'r3', rating: 4 },
      { id: 'r4', rating: 3 },
      { id: 'r5', rating: 3 },
      { id: 'r6', rating: 1 }, // 6th rating — excluded from recentRatings
    ];
    selectChain = makeSelectChain(ratings);

    const stats = await getBlendStats('blend-1');

    expect(stats).toMatchObject({
      viewCount: 99,
      purchaseCount: 7,
      ratingCount: 5,
      averageRating: 4,
    });
    expect(stats!.distribution).toEqual({ 5: 2, 4: 1, 3: 2, 2: 0, 1: 1 });
    expect(stats!.recentRatings).toHaveLength(5);
  });

  it('ignores out-of-range ratings in the distribution', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(blendRow());
    selectChain = makeSelectChain([
      { id: 'r1', rating: 0 },
      { id: 'r2', rating: 6 },
      { id: 'r3', rating: 4 },
    ]);

    const stats = await getBlendStats('blend-1');

    expect(stats!.distribution).toEqual({ 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 });
  });
});

// ---------------------------------------------------------------------------
// hasUserPurchasedBlend — qualification matrix
// ---------------------------------------------------------------------------

describe('hasUserPurchasedBlend query construction', () => {
  it('requires ownership, blend in items, captured payment, and non-cancelled/refunded status', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    await hasUserPurchasedBlend('user-1', 'blend-1');

    const cond = mockDb.query.orders.findFirst.mock.calls[0][0].where;
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(params).toContain('user-1'); // ownership
    expect(params).toContain('blend-1'); // blend must appear in items
    expect(sql).toContain('EXISTS'); // jsonb items check
    expect(sql).toContain("'captured'"); // actually paid
    expect(sql).toContain("'cancelled'");
    expect(sql).toContain("'refunded'");
  });

  it('restricts to the claimed order when orderId is provided', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    await hasUserPurchasedBlend('user-1', 'blend-1', 'order-42');

    const cond = mockDb.query.orders.findFirst.mock.calls[0][0].where;
    const { params } = dialect.sqlToQuery(cond);
    expect(params).toContain('order-42');
  });

  it('treats an empty-string orderId as no orderId (no empty param)', async () => {
    mockDb.query.orders.findFirst.mockResolvedValue(null);

    await hasUserPurchasedBlend('user-1', 'blend-1', '');

    const cond = mockDb.query.orders.findFirst.mock.calls[0][0].where;
    const { params } = dialect.sqlToQuery(cond);
    expect(params).not.toContain('');
  });
});

describe('hasUserPurchasedBlend result matrix', () => {
  it.each([
    ['owned, paid order containing the blend', { id: 'o1' }, true],
    ['order owned by someone else / not found', null, false],
    ['unpaid order (no captured payment)', null, false],
    ['cancelled order', null, false],
    ['refunded order', null, false],
    ['order without the blend in items', null, false],
  ])('returns %s → %s', async (_label, row, expected) => {
    mockDb.query.orders.findFirst.mockResolvedValue(row);

    expect(await hasUserPurchasedBlend('user-1', 'blend-1', 'order-1')).toBe(expected);
  });

  it('returns false instead of throwing when the DB is down', async () => {
    mockDb.query.orders.findFirst.mockRejectedValue(new Error('connection reset'));

    await expect(hasUserPurchasedBlend('user-1', 'blend-1')).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getUserRating
// ---------------------------------------------------------------------------

describe('getUserRating', () => {
  it('returns the rating row when one exists', async () => {
    const rating = { id: 'r1', userId: 'u1', blendId: 'b1', rating: 4 };
    mockDb.query.blendRatings.findFirst.mockResolvedValue(rating);

    expect(await getUserRating('u1', 'b1')).toEqual(rating);
  });

  it('returns null (not undefined) when the user has not rated', async () => {
    mockDb.query.blendRatings.findFirst.mockResolvedValue(undefined);

    expect(await getUserRating('u1', 'b1')).toBeNull();
  });

  it('scopes the lookup to both user and blend', async () => {
    mockDb.query.blendRatings.findFirst.mockResolvedValue(null);

    await getUserRating('user-3', 'blend-8');

    const cond = mockDb.query.blendRatings.findFirst.mock.calls[0][0].where;
    const { params } = dialect.sqlToQuery(cond);
    expect(params).toEqual(['user-3', 'blend-8']);
  });
});
