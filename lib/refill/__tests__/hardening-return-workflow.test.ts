/**
 * Hardening tests — Return workflow orchestration
 *
 * Covers refill-order initiation guards, return processing credit semantics,
 * inspection outcomes, completion, cancellation, and the in-transit poller.
 * DB, AusPost, forever-bottle, and credits are mocked.
 */

const mockValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) }));
const mockInsert = jest.fn(() => ({ values: mockValues }));
const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockSet }));

const mockDb = {
  query: {
    refillOrders: { findFirst: jest.fn(), findMany: jest.fn() },
  },
  insert: mockInsert,
  update: mockUpdate,
};
jest.mock('@/lib/db', () => ({ db: mockDb }));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

const mockGenerateReturnLabel = jest.fn();
const mockTrackReturn = jest.fn();
const mockVerifyBottleReceived = jest.fn();
jest.mock('@/lib/shipping/auspost', () => ({
  generateReturnLabel: (...args: unknown[]) => mockGenerateReturnLabel(...args),
  trackReturn: (...args: unknown[]) => mockTrackReturn(...args),
  verifyBottleReceived: (...args: unknown[]) => mockVerifyBottleReceived(...args),
}));

const mockGetForeverBottleById = jest.fn();
const mockUpdateBottleStatus = jest.fn();
const mockSetBottleReturnLabel = jest.fn();
const mockIncrementRefillCount = jest.fn();
const mockIsBottleEligibleForRefill = jest.fn();
const mockCheckRetirement = jest.fn();
const mockRetireBottle = jest.fn();
jest.mock('@/lib/refill/forever-bottle', () => ({
  getForeverBottleById: (...args: unknown[]) => mockGetForeverBottleById(...args),
  updateBottleStatus: (...args: unknown[]) => mockUpdateBottleStatus(...args),
  setBottleReturnLabel: (...args: unknown[]) => mockSetBottleReturnLabel(...args),
  incrementRefillCount: (...args: unknown[]) => mockIncrementRefillCount(...args),
  isBottleEligibleForRefill: (...args: unknown[]) => mockIsBottleEligibleForRefill(...args),
  checkBottleRetirementEligibility: (...args: unknown[]) => mockCheckRetirement(...args),
  retireBottle: (...args: unknown[]) => mockRetireBottle(...args),
}));

const mockProcessRefillCredit = jest.fn();
jest.mock('@/lib/refill/credits', () => ({
  REFILL_CREDIT_AMOUNT: 500,
  processRefillCredit: (...args: unknown[]) => mockProcessRefillCredit(...args),
}));

import {
  initiateRefillOrder,
  processBottleReturn,
  manuallyMarkReturned,
  inspectReturnedBottle,
  completeRefillOrder,
  cancelRefillOrder,
  getCustomerRefillOrders,
  getRefillOrderById,
  updateInTransitOrders,
} from '../return-workflow';

const ADDRESS = {
  firstName: 'A',
  lastName: 'B',
  address1: '1 St',
  city: 'Sydney',
  province: 'NSW',
  zip: '2000',
  country: 'AU',
};

function makeBottle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bottle-1',
    customerId: 'cust-1',
    oilType: 'lavender',
    status: 'empty',
    currentFillLevel: 0,
    refillCount: 1,
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ro-1',
    customerId: 'cust-1',
    bottleId: 'bottle-1',
    oilType: 'lavender',
    status: 'pending-return',
    returnLabel: { trackingNumber: 'TGE123', labelUrl: 'https://example.com/label.pdf' },
    pricing: { standardPrice: 3500, creditApplied: 500, finalPrice: 3000 },
    metadata: null,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    completedAt: null,
    ...overrides,
  };
}

function insertedOrder() {
  return mockValues.mock.calls.map(c => c[0]).find(v => v && v.pricing);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetForeverBottleById.mockResolvedValue(makeBottle());
  mockIsBottleEligibleForRefill.mockResolvedValue({ eligible: true });
  mockCheckRetirement.mockResolvedValue({ shouldRetire: false, currentCycles: 1, maxCycles: 50 });
  mockGenerateReturnLabel.mockResolvedValue({
    trackingNumber: 'TGE123',
    labelUrl: 'https://example.com/label.pdf',
    expiresAt: new Date('2030-01-01'),
  });
  mockProcessRefillCredit.mockResolvedValue({
    creditApplied: 500,
    newBalance: 500,
    transactionId: 'txn-1',
  });
});

// ---------------------------------------------------------------------------
// initiateRefillOrder — guards
// ---------------------------------------------------------------------------

describe('initiateRefillOrder guards', () => {
  it('rejects an ineligible bottle with the eligibility reason', async () => {
    mockIsBottleEligibleForRefill.mockResolvedValue({
      eligible: false,
      reason: 'Bottle is already in transit',
    });

    await expect(initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS }))
      .rejects.toThrow(/already in transit/i);
    expect(mockGenerateReturnLabel).not.toHaveBeenCalled();
  });

  it('rejects when the bottle record is missing', async () => {
    mockGetForeverBottleById.mockResolvedValue(null);

    await expect(initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS }))
      .rejects.toThrow(/not found/i);
  });

  it('rejects a bottle owned by a different customer', async () => {
    mockGetForeverBottleById.mockResolvedValue(makeBottle({ customerId: 'someone-else' }));

    await expect(initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS }))
      .rejects.toThrow(/does not belong/i);
    expect(mockGenerateReturnLabel).not.toHaveBeenCalled();
  });

  it('requires a customer address before generating a label', async () => {
    await expect(initiateRefillOrder('cust-1', 'bottle-1'))
      .rejects.toThrow(/address is required/i);
    expect(mockGenerateReturnLabel).not.toHaveBeenCalled();
  });
});

describe('initiateRefillOrder success path', () => {
  it('creates the order pending-return with the bottle oil type', async () => {
    const result = await initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS });

    const order = insertedOrder();
    expect(order).toMatchObject({
      customerId: 'cust-1',
      bottleId: 'bottle-1',
      oilType: 'lavender',
      status: 'pending-return',
      returnLabel: {
        trackingNumber: 'TGE123',
        labelUrl: 'https://example.com/label.pdf',
      },
    });
    expect(result.orderId).toBe(order.id);
  });

  it('REGRESSION: writes the pricing JSONB in integer cents (3500/500/3000)', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS });

    expect(insertedOrder().pricing).toEqual({
      standardPrice: 3500,
      creditApplied: 500,
      finalPrice: 3000,
    });
  });

  it('locks the bottle with an ISO-stamped return label', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS });

    expect(mockSetBottleReturnLabel).toHaveBeenCalledWith('bottle-1', expect.objectContaining({
      trackingNumber: 'TGE123',
      expiresAt: '2030-01-01T00:00:00.000Z',
    }));
    const label = mockSetBottleReturnLabel.mock.calls[0][1];
    expect(Number.isNaN(Date.parse(label.generatedAt))).toBe(false);
  });

  it('passes a REFILL- shipment reference and defaults email notification on', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', { customerAddress: ADDRESS });

    expect(mockGenerateReturnLabel).toHaveBeenCalledWith(
      ADDRESS,
      'bottle-1',
      { shipmentReference: 'REFILL-bottle-1', emailNotification: true }
    );
  });

  it('honours emailNotification: false', async () => {
    await initiateRefillOrder('cust-1', 'bottle-1', {
      customerAddress: ADDRESS,
      emailNotification: false,
    });

    expect(mockGenerateReturnLabel).toHaveBeenCalledWith(
      ADDRESS,
      'bottle-1',
      expect.objectContaining({ emailNotification: false })
    );
  });
});

// ---------------------------------------------------------------------------
// processBottleReturn
// ---------------------------------------------------------------------------

describe('processBottleReturn', () => {
  it('throws for an unknown tracking number', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(null);

    await expect(processBottleReturn('NOPE')).rejects.toThrow(/no refill order found/i);
  });

  it('throws when the carrier has not delivered the bottle', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder());
    mockVerifyBottleReceived.mockResolvedValue(false);

    await expect(processBottleReturn('TGE123')).rejects.toThrow(/not been delivered/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks the order received and applies NO credit by default', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder());
    mockVerifyBottleReceived.mockResolvedValue(true);

    const result = await processBottleReturn('TGE123');

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'received' }));
    expect(mockProcessRefillCredit).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      bottleId: 'bottle-1',
      customerId: 'cust-1',
      creditApplied: 0,
      refillOrderId: 'ro-1',
    });
  });

  it('jumps straight to refilling when inspection is skipped', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder());
    mockVerifyBottleReceived.mockResolvedValue(true);

    await processBottleReturn('TGE123', { skipInspection: true });

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'refilling' }));
  });

  it('applies the 500-cent credit only when autoApplyCredit is true', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder());
    mockVerifyBottleReceived.mockResolvedValue(true);

    const result = await processBottleReturn('TGE123', { autoApplyCredit: true });

    expect(mockProcessRefillCredit).toHaveBeenCalledWith('cust-1', 'bottle-1', 'TGE123');
    expect(result.creditApplied).toBe(500);
  });

  it('marks the bottle refilled via the bottle state machine', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder());
    mockVerifyBottleReceived.mockResolvedValue(true);

    await processBottleReturn('TGE123');

    expect(mockUpdateBottleStatus).toHaveBeenCalledWith(
      'bottle-1',
      'refilled',
      expect.objectContaining({ trackingNumber: 'TGE123' })
    );
  });
});

// ---------------------------------------------------------------------------
// manuallyMarkReturned
// ---------------------------------------------------------------------------

describe('manuallyMarkReturned', () => {
  it('throws for an unknown tracking number', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(null);

    await expect(manuallyMarkReturned('NOPE', 'admin-1')).rejects.toThrow(/no refill order/i);
  });

  it('marks received with admin metadata and applies the credit', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder());

    const result = await manuallyMarkReturned('TGE123', 'admin-1');

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'received',
      metadata: expect.objectContaining({ manuallyMarkedBy: 'admin-1' }),
    }));
    expect(mockProcessRefillCredit).toHaveBeenCalledWith('cust-1', 'bottle-1', 'TGE123');
    expect(result.creditApplied).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// inspectReturnedBottle
// ---------------------------------------------------------------------------

describe('inspectReturnedBottle', () => {
  const baseInspection = {
    cracks: false,
    chips: false,
    labelCondition: 'good' as const,
    capCondition: 'good' as const,
    cleanliness: 'clean' as const,
    inspectorId: 'tech-1',
  };

  it('throws when the bottle does not exist', async () => {
    mockGetForeverBottleById.mockResolvedValue(null);

    await expect(inspectReturnedBottle('bottle-1', baseInspection)).rejects.toThrow(/not found/i);
  });

  it('throws when the bottle has no refill order', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(null);

    await expect(inspectReturnedBottle('bottle-1', baseInspection)).rejects.toThrow(/no refill order/i);
  });

  it('moves the order to refilling and keeps the bottle when all checks pass', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'received' }));

    const result = await inspectReturnedBottle('bottle-1', baseInspection);

    expect(result).toEqual({
      canRefill: true,
      cleaningRequired: false,
      damageAssessment: undefined,
      recommendedAction: 'refill',
    });
    // order first marked inspecting, then refilling
    expect(mockSet.mock.calls[0][0]).toMatchObject({ status: 'inspecting' });
    expect(mockSet.mock.calls[1][0]).toMatchObject({ status: 'refilling' });
    expect(mockRetireBottle).not.toHaveBeenCalled();
  });

  it.each([
    ['cracks', { cracks: true }, /cracks/i],
    ['chips', { chips: true }, /chips/i],
    ['a poor label', { labelCondition: 'poor' as const }, /condition too poor/i],
    ['a poor cap', { capCondition: 'poor' as const }, /condition too poor/i],
  ])('retires the bottle for %s', async (_name, override, message) => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'received' }));

    const result = await inspectReturnedBottle('bottle-1', { ...baseInspection, ...override });

    expect(result.canRefill).toBe(false);
    expect(result.recommendedAction).toBe('retire');
    expect(result.damageAssessment).toMatch(message);
    expect(mockSet.mock.calls[1][0]).toMatchObject({ status: 'rejected' });
    expect(mockRetireBottle).toHaveBeenCalledWith('bottle-1', 'damaged', result.damageAssessment);
  });

  it('retires a bottle that hit the maximum refill cycles', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'received' }));
    mockCheckRetirement.mockResolvedValue({ shouldRetire: true, currentCycles: 50, maxCycles: 50 });

    const result = await inspectReturnedBottle('bottle-1', baseInspection);

    expect(result.canRefill).toBe(false);
    expect(result.damageAssessment).toMatch(/maximum refill cycles/i);
    expect(mockRetireBottle).toHaveBeenCalled();
  });

  it('flags cleaning without blocking the refill', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'received' }));

    const result = await inspectReturnedBottle('bottle-1', {
      ...baseInspection,
      cleanliness: 'requires-deep-clean',
    });

    expect(result.canRefill).toBe(true);
    expect(result.cleaningRequired).toBe(true);
    expect(mockSet.mock.calls[1][0]).toMatchObject({ status: 'refilling' });
  });

  it('stores the inspection outcome on the order', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'received' }));

    await inspectReturnedBottle('bottle-1', { ...baseInspection, notes: 'looks fine' });

    expect(mockSet.mock.calls[1][0].inspectionResult).toMatchObject({
      canRefill: true,
      cleaningRequired: false,
      notes: 'looks fine',
      inspectorId: 'tech-1',
    });
  });
});

// ---------------------------------------------------------------------------
// completeRefillOrder
// ---------------------------------------------------------------------------

describe('completeRefillOrder', () => {
  it('throws when the order is missing', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(null);

    await expect(completeRefillOrder('ro-1')).rejects.toThrow(/not found/i);
  });

  it('refuses to complete an order that is not refilling', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'received' }));

    await expect(completeRefillOrder('ro-1')).rejects.toThrow(/cannot complete/i);
    expect(mockIncrementRefillCount).not.toHaveBeenCalled();
  });

  it('completes: increments count, stamps completedAt, reactivates the bottle', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'refilling' }));
    mockIncrementRefillCount.mockResolvedValue(6);

    const result = await completeRefillOrder('ro-1', { notes: 'done' });

    expect(result).toEqual({ success: true, bottleId: 'bottle-1', newRefillCount: 6 });
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      completedAt: expect.any(Date),
      metadata: expect.objectContaining({ completionNotes: 'done', fillLevel: 100 }),
    }));
    expect(mockUpdateBottleStatus).toHaveBeenCalledWith('bottle-1', 'active', expect.objectContaining({
      refillCompleted: true,
      orderId: 'ro-1',
      newRefillCount: 6,
    }));
  });

  it('records a custom fill level in the completion metadata', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'refilling' }));
    mockIncrementRefillCount.mockResolvedValue(2);

    await completeRefillOrder('ro-1', { newFillLevel: 95 });

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ fillLevel: 95 }),
    }));
  });
});

// ---------------------------------------------------------------------------
// cancelRefillOrder
// ---------------------------------------------------------------------------

describe('cancelRefillOrder', () => {
  it('throws when the order is missing', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(null);

    await expect(cancelRefillOrder('ro-1', 'changed mind')).rejects.toThrow(/not found/i);
  });

  it.each(['received', 'inspecting', 'refilling', 'completed', 'rejected'])(
    'refuses to cancel a %s order',
    async (status) => {
      mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status }));

      await expect(cancelRefillOrder('ro-1', 'too late')).rejects.toThrow(/cannot cancel/i);
      expect(mockUpdate).not.toHaveBeenCalled();
    }
  );

  it('cancels a pending-return order with the reason recorded', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'pending-return' }));
    mockGetForeverBottleById.mockResolvedValue(makeBottle({ status: 'empty' }));

    const result = await cancelRefillOrder('ro-1', 'changed mind');

    expect(result).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      status: 'cancelled',
      metadata: expect.objectContaining({ cancellationReason: 'changed mind' }),
    }));
  });

  it('releases an in-transit bottle back to active on cancel', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'in-transit' }));
    mockGetForeverBottleById.mockResolvedValue(makeBottle({ status: 'in-transit' }));

    await cancelRefillOrder('ro-1', 'changed mind');

    expect(mockUpdateBottleStatus).toHaveBeenCalledWith('bottle-1', 'active', expect.objectContaining({
      orderCancelled: true,
      reason: 'changed mind',
    }));
  });

  it('does not touch the bottle when it is not in-transit', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'pending-return' }));
    mockGetForeverBottleById.mockResolvedValue(makeBottle({ status: 'empty' }));

    await cancelRefillOrder('ro-1', 'changed mind');

    expect(mockUpdateBottleStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Order queries
// ---------------------------------------------------------------------------

describe('refill order queries', () => {
  it('getCustomerRefillOrders maps rows to typed orders with Dates', async () => {
    mockDb.query.refillOrders.findMany.mockResolvedValue([
      { ...makeOrder(), createdAt: '2025-06-01T00:00:00.000Z', updatedAt: '2025-06-02T00:00:00.000Z', completedAt: null },
    ]);

    const orders = await getCustomerRefillOrders('cust-1');

    expect(orders).toHaveLength(1);
    expect(orders[0].createdAt).toBeInstanceOf(Date);
    expect(orders[0].pricing).toEqual({ standardPrice: 3500, creditApplied: 500, finalPrice: 3000 });
    expect(orders[0].completedAt).toBeUndefined();
  });

  it('getRefillOrderById returns null when missing', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(null);

    await expect(getRefillOrderById('nope')).resolves.toBeNull();
  });

  it('getRefillOrderById converts completedAt when present', async () => {
    mockDb.query.refillOrders.findFirst.mockResolvedValue(
      makeOrder({ completedAt: '2025-06-05T00:00:00.000Z' })
    );

    const order = await getRefillOrderById('ro-1');

    expect(order!.completedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// updateInTransitOrders
// ---------------------------------------------------------------------------

describe('updateInTransitOrders', () => {
  it('processes delivered returns and counts them', async () => {
    mockDb.query.refillOrders.findMany.mockResolvedValue([makeOrder({ status: 'in-transit' })]);
    mockDb.query.refillOrders.findFirst.mockResolvedValue(makeOrder({ status: 'in-transit' }));
    mockTrackReturn.mockResolvedValue({ status: 'delivered' });
    mockVerifyBottleReceived.mockResolvedValue(true);

    const result = await updateInTransitOrders();

    expect(result).toEqual({ updated: 0, delivered: 1 });
    // delivered orders must NOT auto-apply credit (inspection does that)
    expect(mockProcessRefillCredit).not.toHaveBeenCalled();
  });

  it('touches still-moving orders and counts them as updated', async () => {
    mockDb.query.refillOrders.findMany.mockResolvedValue([makeOrder({ status: 'in-transit' })]);
    mockTrackReturn.mockResolvedValue({ status: 'in-transit' });

    const result = await updateInTransitOrders();

    expect(result).toEqual({ updated: 1, delivered: 0 });
  });

  it('swallows carrier API failures per order', async () => {
    mockDb.query.refillOrders.findMany.mockResolvedValue([makeOrder({ status: 'in-transit' })]);
    mockTrackReturn.mockRejectedValue(new Error('carrier down'));

    const result = await updateInTransitOrders();

    expect(result).toEqual({ updated: 0, delivered: 0 });
  });

  it('returns zeros when nothing is in transit', async () => {
    mockDb.query.refillOrders.findMany.mockResolvedValue([]);

    await expect(updateInTransitOrders()).resolves.toEqual({ updated: 0, delivered: 0 });
    expect(mockTrackReturn).not.toHaveBeenCalled();
  });
});
