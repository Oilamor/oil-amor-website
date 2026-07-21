/**
 * Hardening tests — lib/community-blends/blend-store.ts
 *
 * Session-free DB layer used by the Stripe webhook path. Pins slug
 * generation/collision handling, publish-time consent stamping, creator
 * stats bookkeeping, and ownership enforcement in the publish UPDATE.
 */

import { PgDialect } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// DB mock — insert/update chains + relational query
// ---------------------------------------------------------------------------

const mockReturning = jest.fn();
const mockOnConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
const mockValues = jest.fn(() => ({
  returning: mockReturning,
  onConflictDoUpdate: mockOnConflictDoUpdate,
}));
const mockInsert = jest.fn(() => ({ values: mockValues }));

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({
  returning: mockUpdateReturning,
  then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(undefined).then(onF, onR),
}));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  insert: mockInsert,
  update: mockUpdate,
  query: {
    communityBlends: { findFirst: jest.fn() },
  },
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

import { insertCommunityBlend, publishBlendRecord } from '../blend-store';

const dialect = new PgDialect();

const recipe = {
  mode: 'carrier' as const,
  bottleSize: 30,
  strength: 30,
  oils: [
    { oilId: 'lavender', name: 'Lavender', ml: 5.4 },
    { oilId: 'lemon', name: 'Lemon', ml: 3.6 },
  ],
};

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    creatorId: 'creator-1',
    creatorName: 'Ada',
    name: 'Calm Nights',
    recipe,
    price: 4200,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOnConflictDoUpdate.mockResolvedValue(undefined);
  mockDb.query.communityBlends.findFirst.mockResolvedValue(null); // no slug collision
  mockReturning.mockResolvedValue([{ id: 'blend-1', slug: 'calm-nights' }]);
});

// ---------------------------------------------------------------------------
// insertCommunityBlend — slugs
// ---------------------------------------------------------------------------

describe('insertCommunityBlend slug generation', () => {
  it('slugifies the blend name', async () => {
    mockReturning.mockResolvedValue([{ id: 'b1', slug: 'my-great-blend' }]);

    const { slug } = await insertCommunityBlend(baseInput({ name: 'My Great Blend!' }));

    expect(slug).toBe('my-great-blend');
    expect(mockValues.mock.calls[0][0].slug).toBe('my-great-blend');
  });

  it('appends -1 when the base slug is taken', async () => {
    mockDb.query.communityBlends.findFirst
      .mockResolvedValueOnce({ id: 'other' }) // calm-nights taken
      .mockResolvedValueOnce(null); // calm-nights-1 free
    mockReturning.mockResolvedValue([{ id: 'b2', slug: 'calm-nights-1' }]);

    const { slug } = await insertCommunityBlend(baseInput());

    expect(slug).toBe('calm-nights-1');
  });

  it('keeps incrementing until a free slug is found', async () => {
    mockDb.query.communityBlends.findFirst
      .mockResolvedValueOnce({ id: 'x' }) // base taken
      .mockResolvedValueOnce({ id: 'y' }) // -1 taken
      .mockResolvedValueOnce(null); // -2 free
    mockReturning.mockResolvedValue([{ id: 'b3', slug: 'calm-nights-2' }]);

    const { slug } = await insertCommunityBlend(baseInput());

    expect(slug).toBe('calm-nights-2');
    expect(mockDb.query.communityBlends.findFirst).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// insertCommunityBlend — draft vs published stamping
// ---------------------------------------------------------------------------

describe('insertCommunityBlend draft/publish stamping', () => {
  it('defaults to draft + private with no consent fields', async () => {
    await insertCommunityBlend(baseInput());

    const values = mockValues.mock.calls[0][0];
    expect(values.status).toBe('draft');
    expect(values.visibility).toBe('private');
    expect(values).not.toHaveProperty('consentToShare');
    expect(values).not.toHaveProperty('consentDate');
    expect(values).not.toHaveProperty('publishedAt');
    expect(values).not.toHaveProperty('purchaseVerifiedAt');
  });

  it('stamps consent + publish timestamps when created as published', async () => {
    await insertCommunityBlend(baseInput({ status: 'published', visibility: 'community', originalOrderId: 'order-1' }));

    const values = mockValues.mock.calls[0][0];
    expect(values.status).toBe('published');
    expect(values.consentToShare).toBe(true);
    expect(values.consentDate).toBeInstanceOf(Date);
    expect(values.publishedAt).toBeInstanceOf(Date);
    expect(values.purchaseVerifiedAt).toBeInstanceOf(Date);
    expect(values.originalOrderId).toBe('order-1');
  });

  it('records creator stats: blendsCreated 1, blendsPublished 0 for drafts', async () => {
    await insertCommunityBlend(baseInput());

    const statsValues = mockValues.mock.calls[1][0];
    expect(statsValues).toMatchObject({
      userId: 'creator-1',
      blendsCreated: 1,
      blendsPublished: 0,
    });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it('records blendsPublished 1 when created as published', async () => {
    await insertCommunityBlend(baseInput({ status: 'published', visibility: 'community' }));

    const statsValues = mockValues.mock.calls[1][0];
    expect(statsValues.blendsPublished).toBe(1);
  });

  it('upserts stats on conflict so repeat creators accumulate counts', async () => {
    await insertCommunityBlend(baseInput({ status: 'published', visibility: 'community' }));

    const conflict = mockOnConflictDoUpdate.mock.calls[0][0];
    // The conflict set must increment blendsCreated (SQL) — not overwrite with 1
    expect(conflict.set.blendsCreated).toBeDefined();
    expect(conflict.set.blendsPublished).toBeDefined();
    expect(conflict.set.updatedAt).toBeInstanceOf(Date);
  });

  it('stores the creator identity exactly as given (no session lookup here)', async () => {
    await insertCommunityBlend(baseInput({ creatorId: 'server-verified-id', creatorName: 'Webhook Name' }));

    const values = mockValues.mock.calls[0][0];
    expect(values.creatorId).toBe('server-verified-id');
    expect(values.creatorName).toBe('Webhook Name');
  });

  it('returns the inserted id and slug from the DB row', async () => {
    mockReturning.mockResolvedValue([{ id: 'uuid-9', slug: 'calm-nights' }]);

    const result = await insertCommunityBlend(baseInput());

    expect(result).toEqual({ blendId: 'uuid-9', slug: 'calm-nights' });
  });
});

// ---------------------------------------------------------------------------
// publishBlendRecord — ownership + stamping
// ---------------------------------------------------------------------------

describe('publishBlendRecord', () => {
  const publishedRow = { id: 'blend-1', slug: 'calm-nights', creatorId: 'creator-1' };

  beforeEach(() => {
    mockUpdateReturning.mockResolvedValue([publishedRow]);
  });

  it('enforces ownership: UPDATE matches both blend id AND creator id', async () => {
    await publishBlendRecord({ blendId: 'blend-1', creatorId: 'creator-1', orderId: 'order-1' });

    const cond = mockUpdateWhere.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(cond);
    expect(sql).toContain('"id"');
    expect(sql).toContain('"creator_id"');
    expect(params).toEqual(['blend-1', 'creator-1']);
  });

  it('returns null and skips stats when the blend is not found / not owned', async () => {
    mockUpdateReturning.mockResolvedValue([]);

    const result = await publishBlendRecord({ blendId: 'blend-1', creatorId: 'attacker', orderId: 'order-1' });

    expect(result).toBeNull();
    // Only the blend UPDATE ran — no userBlendStats update
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('stamps publish fields: status, visibility, consent, order linkage', async () => {
    await publishBlendRecord({ blendId: 'blend-1', creatorId: 'creator-1', orderId: 'order-9' });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload).toMatchObject({
      status: 'published',
      visibility: 'community',
      consentToShare: true,
      originalOrderId: 'order-9',
    });
    expect(setPayload.consentDate).toBeInstanceOf(Date);
    expect(setPayload.publishedAt).toBeInstanceOf(Date);
    expect(setPayload.purchaseVerifiedAt).toBeInstanceOf(Date);
  });

  it('applies sanitized text updates only when provided', async () => {
    await publishBlendRecord({
      blendId: 'blend-1',
      creatorId: 'creator-1',
      orderId: 'order-1',
      name: 'Clean Name',
      description: 'Clean description',
    });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload.name).toBe('Clean Name');
    expect(setPayload.description).toBe('Clean description');
    expect(setPayload).not.toHaveProperty('story');
  });

  it('omits all text fields when none are provided', async () => {
    await publishBlendRecord({ blendId: 'blend-1', creatorId: 'creator-1', orderId: 'order-1' });

    const setPayload = mockUpdateSet.mock.calls[0][0];
    expect(setPayload).not.toHaveProperty('name');
    expect(setPayload).not.toHaveProperty('description');
    expect(setPayload).not.toHaveProperty('story');
  });

  it('bumps blendsPublished for the creator returned by the UPDATE', async () => {
    await publishBlendRecord({ blendId: 'blend-1', creatorId: 'creator-1', orderId: 'order-1' });

    // Second update targets userBlendStats, scoped to the blend's creator
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    const statsCond = mockUpdateWhere.mock.calls[1][0];
    const { params } = dialect.sqlToQuery(statsCond);
    expect(params).toEqual(['creator-1']);
  });

  it('returns the published blend row', async () => {
    const result = await publishBlendRecord({ blendId: 'blend-1', creatorId: 'creator-1', orderId: 'order-1' });

    expect(result).toEqual(publishedRow);
  });
});
