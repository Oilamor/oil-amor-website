/**
 * Moderation visibility tests — lib/community-blends/queries.ts
 *
 * Pins the 2026-07-21 moderation-queue visibility rules:
 * - Public reads (listCommunityBlends, getFeaturedBlends, getBlendBySlug)
 *   filter to moderation_status='approved'.
 * - getBlendBySlug treats flagged/hidden blends as not found.
 * - getUserBlends (the creator's own library view) is NOT moderation
 *   filtered — owners can see their own flagged/hidden blends.
 */

import { PgDialect } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Chainable select mock (same pattern as hardening-queries.test.ts)
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
  getUserBlends,
  getFeaturedBlends,
} from '../queries';

const dialect = new PgDialect();

function blendRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'blend-1',
    name: 'Calm Nights',
    slug: 'calm-nights',
    creatorId: 'creator-1',
    creatorName: 'Ada',
    moderationStatus: 'approved',
    ratingSum: 0,
    ratingCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  selectChain = makeSelectChain([]);
});

// ---------------------------------------------------------------------------
// Public list/detail queries — approved only
// ---------------------------------------------------------------------------

describe('moderation visibility on public queries', () => {
  it('listCommunityBlends includes the approved filter', async () => {
    await listCommunityBlends();

    const cond = selectChain.where.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(sql).toContain('"moderation_status"');
    expect(params).toContain('approved');
  });

  it('getFeaturedBlends includes the approved filter', async () => {
    await getFeaturedBlends();

    const cond = selectChain.where.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(sql).toContain('"moderation_status"');
    expect(params).toContain('approved');
  });

  it('getBlendBySlug scopes the lookup to approved blends', async () => {
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    await getBlendBySlug('calm-nights');

    const cond = mockDb.query.communityBlends.findFirst.mock.calls[0][0].where;
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(sql).toContain('"slug"');
    expect(sql).toContain('"moderation_status"');
    expect(params).toEqual(['calm-nights', 'approved']);
  });

  it('a flagged blend resolves as not found by slug (treated as hidden)', async () => {
    // The SQL filter excludes the row, so the DB returns nothing — same
    // behavior as an unknown slug.
    mockDb.query.communityBlends.findFirst.mockResolvedValue(null);

    expect(await getBlendBySlug('flagged-blend')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Owner view — NOT moderation filtered
// ---------------------------------------------------------------------------

describe('getUserBlends (owner library view)', () => {
  it('does not apply a moderation filter — owners see their flagged blends', async () => {
    await getUserBlends('creator-1');

    const cond = selectChain.where.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(sql).not.toContain('"moderation_status"');
    expect(params).toEqual(['creator-1']);
  });

  it('returns owner blends including flagged ones', async () => {
    selectChain = makeSelectChain([
      blendRow({ id: 'a', moderationStatus: 'approved' }),
      blendRow({ id: 'b', moderationStatus: 'flagged' }),
    ]);

    const blends = await getUserBlends('creator-1');

    expect(blends).toHaveLength(2);
    expect(blends.map(b => b.id)).toEqual(['a', 'b']);
  });
});
