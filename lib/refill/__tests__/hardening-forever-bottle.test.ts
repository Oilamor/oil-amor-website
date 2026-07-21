/**
 * Hardening tests — Forever Bottle state machine
 *
 * Covers serial number generation/validation, registration, fill-level and
 * status transitions, refill counting, retirement, eligibility, and the
 * environmental impact helper. DB is fully mocked.
 */

// Controlled nanoid: serials need deterministic values per test
jest.mock('nanoid', () => ({ nanoid: jest.fn() }));

const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({
  returning: mockReturning,
  onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
}));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

const mockDb = {
  query: {
    foreverBottles: { findFirst: jest.fn(), findMany: jest.fn() },
    foreverBottleHistory: { findMany: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

import { nanoid } from 'nanoid';
import {
  registerForeverBottle,
  getCustomerForeverBottles,
  getForeverBottleById,
  getForeverBottleBySerial,
  getBottleHistory,
  updateBottleFillLevel,
  updateBottleStatus,
  setBottleReturnLabel,
  incrementRefillCount,
  retireBottle,
  checkBottleRetirementEligibility,
  isValidSerialNumber,
  isBottleEligibleForRefill,
  getBottleEnvironmentalImpact,
} from '../forever-bottle';

const mockNanoid = nanoid as unknown as jest.Mock;

function makeBottleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bottle-1',
    customerId: 'cust-1',
    serialNumber: 'FA-A3F9K2',
    oilType: 'lavender',
    capacity: '100ml',
    purchaseDate: new Date('2025-01-01'),
    status: 'active',
    currentFillLevel: 100,
    refillCount: 0,
    metadata: { orderId: 'order-1', productVariantId: 'var-1', purchasePrice: 8500 },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

/** Find the inserted value matching a predicate across all insert() calls */
function insertedValue(pred: (v: Record<string, unknown>) => boolean) {
  return mockValues.mock.calls.map(c => c[0]).find(v => v && pred(v));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNanoid.mockImplementation((len?: number) =>
    len === 6 ? 'a3f9k2' : 'generated-id'
  );
  // Echo the inserted bottle row back from .returning()
  mockReturning.mockImplementation(() =>
    Promise.resolve([{ ...mockValues.mock.calls[0]?.[0] }])
  );
});

// ---------------------------------------------------------------------------
// isValidSerialNumber
// ---------------------------------------------------------------------------

describe('isValidSerialNumber', () => {
  it('accepts the FA-XXXXXX format', () => {
    expect(isValidSerialNumber('FA-A3F9K2')).toBe(true);
    expect(isValidSerialNumber('FA-000000')).toBe(true);
    expect(isValidSerialNumber('FA-ZZZZZZ')).toBe(true);
  });

  it('rejects wrong prefix, lowercase, wrong length, and junk', () => {
    expect(isValidSerialNumber('fa-A3F9K2')).toBe(false);
    expect(isValidSerialNumber('FB-A3F9K2')).toBe(false);
    expect(isValidSerialNumber('FA-a3f9k2')).toBe(false);
    expect(isValidSerialNumber('FA-A3F9K')).toBe(false);
    expect(isValidSerialNumber('FA-A3F9K22')).toBe(false);
    expect(isValidSerialNumber('FA-A3F9K!')).toBe(false);
    expect(isValidSerialNumber('')).toBe(false);
    expect(isValidSerialNumber('FAA3F9K2')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerForeverBottle
// ---------------------------------------------------------------------------

describe('registerForeverBottle', () => {
  const input = {
    customerId: 'cust-1',
    oilType: 'lavender',
    orderId: 'order-1',
    productVariantId: 'var-1',
    purchasePrice: 8500,
  };

  it('registers a bottle with a valid FA-XXXXXX serial', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    const bottle = await registerForeverBottle(input);

    expect(bottle.serialNumber).toBe('FA-A3F9K2');
    expect(isValidSerialNumber(bottle.serialNumber)).toBe(true);
  });

  it('creates the bottle active, full, and never refilled', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await registerForeverBottle(input);

    const row = insertedValue(v => v.serialNumber === 'FA-A3F9K2');
    expect(row).toMatchObject({
      customerId: 'cust-1',
      oilType: 'lavender',
      capacity: '100ml',
      status: 'active',
      currentFillLevel: 100,
      refillCount: 0,
      metadata: { orderId: 'order-1', productVariantId: 'var-1', purchasePrice: 8500 },
    });
  });

  it('writes a purchased history event with the initial fill level', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await registerForeverBottle(input);

    const event = insertedValue(v => v.eventType === 'purchased');
    expect(event).toMatchObject({
      metadata: expect.objectContaining({
        orderId: 'order-1',
        purchasePrice: 8500,
        initialFillLevel: 100,
      }),
    });
  });

  it('regenerates the serial on collision and uses the unique one', async () => {
    const serials = ['aaaaaa', 'bbbbbb'];
    mockNanoid.mockImplementation((len?: number) =>
      len === 6 ? serials.shift()! : 'generated-id'
    );
    mockDb.query.foreverBottles.findFirst
      .mockResolvedValueOnce({ id: 'existing-bottle' }) // first candidate taken
      .mockResolvedValueOnce(null);                     // second is free

    const bottle = await registerForeverBottle(input);

    expect(mockDb.query.foreverBottles.findFirst).toHaveBeenCalledTimes(2);
    expect(bottle.serialNumber).toBe('FA-BBBBBB');
  });

  it('throws after 10 serial collisions', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue({ id: 'always-taken' });

    await expect(registerForeverBottle(input))
      .rejects.toThrow(/unique serial number/i);
    expect(mockDb.query.foreverBottles.findFirst).toHaveBeenCalledTimes(10);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('defaults null fill/refill columns on the returned bottle', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);
    mockReturning.mockImplementation(() =>
      Promise.resolve([{ ...mockValues.mock.calls[0]?.[0], currentFillLevel: null, refillCount: null }])
    );

    const bottle = await registerForeverBottle(input);

    expect(bottle.currentFillLevel).toBe(100);
    expect(bottle.refillCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

describe('bottle retrieval', () => {
  it('getCustomerForeverBottles maps rows with defaults for null columns', async () => {
    mockDb.query.foreverBottles.findMany.mockResolvedValue([
      makeBottleRow({ currentFillLevel: null, refillCount: null }),
    ]);

    const bottles = await getCustomerForeverBottles('cust-1');

    expect(bottles).toHaveLength(1);
    expect(bottles[0].currentFillLevel).toBe(0);
    expect(bottles[0].refillCount).toBe(0);
    expect(bottles[0].capacity).toBe('100ml');
  });

  it('getForeverBottleById returns null when missing', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(getForeverBottleById('nope')).resolves.toBeNull();
  });

  it('getForeverBottleById applies the same defaults', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ currentFillLevel: null, refillCount: null })
    );

    const bottle = await getForeverBottleById('bottle-1');

    expect(bottle).not.toBeNull();
    expect(bottle!.currentFillLevel).toBe(0);
    expect(bottle!.refillCount).toBe(0);
  });

  it('getForeverBottleBySerial returns the bottle when found', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow());

    const bottle = await getForeverBottleBySerial('FA-A3F9K2');

    expect(bottle).not.toBeNull();
    expect(bottle!.serialNumber).toBe('FA-A3F9K2');
  });

  it('getBottleHistory passes events through', async () => {
    const events = [
      { id: 'e2', bottleId: 'bottle-1', eventType: 'refilled', timestamp: new Date() },
      { id: 'e1', bottleId: 'bottle-1', eventType: 'purchased', timestamp: new Date() },
    ];
    mockDb.query.foreverBottleHistory.findMany.mockResolvedValue(events);

    await expect(getBottleHistory('bottle-1')).resolves.toEqual(events);
  });
});

// ---------------------------------------------------------------------------
// updateBottleFillLevel
// ---------------------------------------------------------------------------

describe('updateBottleFillLevel', () => {
  it('rejects fill levels outside 0–100ml', async () => {
    await expect(updateBottleFillLevel('bottle-1', -1)).rejects.toThrow(/between 0 and 100/);
    await expect(updateBottleFillLevel('bottle-1', 101)).rejects.toThrow(/between 0 and 100/);
    expect(mockDb.query.foreverBottles.findFirst).not.toHaveBeenCalled();
  });

  it('accepts the 0 and 100 boundaries', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow());

    await expect(updateBottleFillLevel('bottle-1', 0)).resolves.toBeUndefined();
    await expect(updateBottleFillLevel('bottle-1', 100)).resolves.toBeUndefined();
  });

  it('transitions an active bottle to empty at 0ml', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'active', currentFillLevel: 40 })
    );

    await updateBottleFillLevel('bottle-1', 0);

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      currentFillLevel: 0,
      status: 'empty',
    }));
  });

  it('keeps an in-transit bottle in-transit even at 0ml', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'in-transit', currentFillLevel: 10 })
    );

    await updateBottleFillLevel('bottle-1', 0);

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      currentFillLevel: 0,
      status: 'in-transit',
    }));
  });

  it('reactivates an empty bottle when refilled above 0', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'empty', currentFillLevel: 0 })
    );

    await updateBottleFillLevel('bottle-1', 100);

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      currentFillLevel: 100,
      status: 'active',
    }));
  });

  it('keeps an active bottle active at a partial fill', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'active', currentFillLevel: 80 })
    );

    await updateBottleFillLevel('bottle-1', 30);

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      currentFillLevel: 30,
      status: 'active',
    }));
  });

  it('throws when the bottle does not exist', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(updateBottleFillLevel('nope', 50)).rejects.toThrow(/not found/i);
  });

  it('records the level change in history', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'active', currentFillLevel: 55 })
    );

    await updateBottleFillLevel('bottle-1', 20);

    const event = insertedValue(v => v.eventType === 'refilled');
    expect(event).toMatchObject({
      bottleId: 'bottle-1',
      metadata: { previousLevel: 55, newLevel: 20 },
    });
  });
});

// ---------------------------------------------------------------------------
// updateBottleStatus
// ---------------------------------------------------------------------------

describe('updateBottleStatus', () => {
  it('throws when the bottle does not exist', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(updateBottleStatus('nope', 'active')).rejects.toThrow(/not found/i);
  });

  it('maps in-transit to a return-shipped history event', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ status: 'empty' }));

    await updateBottleStatus('bottle-1', 'in-transit');

    const event = insertedValue(v => v.eventType === 'return-shipped');
    expect(event).toMatchObject({
      metadata: expect.objectContaining({ previousStatus: 'empty', newStatus: 'in-transit' }),
    });
  });

  it('maps retired to a retired history event', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow());

    await updateBottleStatus('bottle-1', 'retired');

    const event = insertedValue(v => v.eventType === 'retired');
    expect(event).toBeDefined();
  });

  it('merges caller metadata into the history event', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow());

    await updateBottleStatus('bottle-1', 'active', { orderId: 'order-9' });

    const event = insertedValue(v => v.eventType === 'refilled');
    expect(event).toMatchObject({
      metadata: expect.objectContaining({ orderId: 'order-9', newStatus: 'active' }),
    });
  });
});

// ---------------------------------------------------------------------------
// setBottleReturnLabel
// ---------------------------------------------------------------------------

describe('setBottleReturnLabel', () => {
  const label = {
    trackingNumber: 'TGE123',
    generatedAt: '2025-06-01T00:00:00.000Z',
    expiresAt: '2025-07-01T00:00:00.000Z',
  };

  it('locks the bottle in-transit with the label attached', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ status: 'empty' }));

    await setBottleReturnLabel('bottle-1', label);

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in-transit',
      returnLabel: label,
    }));
  });

  it('writes a return-shipped history event with the tracking number', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow());

    await setBottleReturnLabel('bottle-1', label);

    const event = insertedValue(v => v.eventType === 'return-shipped');
    expect(event).toMatchObject({
      metadata: expect.objectContaining({ trackingNumber: 'TGE123' }),
    });
  });

  it('throws when the bottle does not exist', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(setBottleReturnLabel('nope', label)).rejects.toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// incrementRefillCount
// ---------------------------------------------------------------------------

describe('incrementRefillCount', () => {
  it('increments the count, refills to 100ml, and marks the bottle refilled', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ refillCount: 4, status: 'in-transit', currentFillLevel: 0 })
    );

    const newCount = await incrementRefillCount('bottle-1');

    expect(newCount).toBe(5);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      refillCount: 5,
      currentFillLevel: 100,
      status: 'refilled',
    }));
  });

  it('writes a refilled history event with the new count', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ refillCount: 0 }));

    await incrementRefillCount('bottle-1');

    const event = insertedValue(v => v.eventType === 'refilled');
    expect(event).toMatchObject({
      metadata: { refillCount: 1, filledTo: 100 },
    });
  });

  it('throws when the bottle does not exist', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(incrementRefillCount('nope')).rejects.toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// retireBottle
// ---------------------------------------------------------------------------

describe('retireBottle', () => {
  it('retires a bottle and zeroes its fill level', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ refillCount: 7, currentFillLevel: 60 })
    );

    await retireBottle('bottle-1', 'damaged', 'cracked neck');

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'retired',
      currentFillLevel: 0,
    }));
  });

  it('writes a retired history event with reason and cycle counts', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ refillCount: 7 }));

    await retireBottle('bottle-1', 'max-cycles-reached');

    const event = insertedValue(v => v.eventType === 'retired');
    expect(event).toMatchObject({
      metadata: expect.objectContaining({
        reason: 'max-cycles-reached',
        finalRefillCount: 7,
        totalCycles: 8,
      }),
    });
  });

  it('refuses to retire an already retired bottle', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ status: 'retired' }));

    await expect(retireBottle('bottle-1', 'damaged')).rejects.toThrow(/already retired/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('throws when the bottle does not exist', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(retireBottle('nope', 'lost')).rejects.toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// checkBottleRetirementEligibility
// ---------------------------------------------------------------------------

describe('checkBottleRetirementEligibility', () => {
  it('flags bottles at the 50-cycle maximum', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ refillCount: 50 }));

    await expect(checkBottleRetirementEligibility('bottle-1')).resolves.toEqual({
      shouldRetire: true,
      reason: 'max-cycles-reached',
      currentCycles: 50,
      maxCycles: 50,
    });
  });

  it('allows bottles below the maximum', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ refillCount: 49 }));

    const result = await checkBottleRetirementEligibility('bottle-1');

    expect(result.shouldRetire).toBe(false);
    expect(result.currentCycles).toBe(49);
    expect(result.maxCycles).toBe(50);
  });

  it('throws when the bottle does not exist', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(checkBottleRetirementEligibility('nope')).rejects.toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// isBottleEligibleForRefill
// ---------------------------------------------------------------------------

describe('isBottleEligibleForRefill', () => {
  it('rejects a missing bottle', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(null);

    await expect(isBottleEligibleForRefill('nope')).resolves.toEqual({
      eligible: false,
      reason: 'Bottle not found',
    });
  });

  it('rejects a retired bottle', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ status: 'retired' }));

    const result = await isBottleEligibleForRefill('bottle-1');

    expect(result).toEqual({ eligible: false, reason: 'Bottle has been retired' });
  });

  it('rejects an in-transit bottle (concurrent refill guard)', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(makeBottleRow({ status: 'in-transit' }));

    const result = await isBottleEligibleForRefill('bottle-1');

    expect(result).toEqual({ eligible: false, reason: 'Bottle is already in transit' });
  });

  it('rejects a bottle at maximum refill cycles', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'empty', refillCount: 50 })
    );

    const result = await isBottleEligibleForRefill('bottle-1');

    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/maximum refill cycles \(50\)/i);
  });

  it('accepts an active bottle below the cycle limit', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'active', refillCount: 49 })
    );

    await expect(isBottleEligibleForRefill('bottle-1')).resolves.toEqual({ eligible: true });
  });

  it('accepts an empty bottle (the normal refill case)', async () => {
    mockDb.query.foreverBottles.findFirst.mockResolvedValue(
      makeBottleRow({ status: 'empty', currentFillLevel: 0, refillCount: 3 })
    );

    await expect(isBottleEligibleForRefill('bottle-1')).resolves.toEqual({ eligible: true });
  });
});

// ---------------------------------------------------------------------------
// getBottleEnvironmentalImpact
// ---------------------------------------------------------------------------

describe('getBottleEnvironmentalImpact', () => {
  it('returns zeros for a never-refilled bottle', () => {
    expect(getBottleEnvironmentalImpact(0)).toEqual({
      bottlesSaved: 0,
      glassRecycledKg: 0,
      oilKeptLiters: 0,
      treesEquivalent: 0,
    });
  });

  it('computes impact for 20 refills', () => {
    expect(getBottleEnvironmentalImpact(20)).toEqual({
      bottlesSaved: 20,
      glassRecycledKg: 4,
      oilKeptLiters: 2,
      treesEquivalent: 0.5,
    });
  });

  it('rounds fractional values to one decimal', () => {
    const impact = getBottleEnvironmentalImpact(1);

    expect(impact.glassRecycledKg).toBe(0.2);
    expect(impact.oilKeptLiters).toBe(0.1);
    expect(impact.treesEquivalent).toBe(0);
  });
});
