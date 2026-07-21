/**
 * Hardening tests — lib/orders/types.ts + lib/orders/status-helpers.ts
 *
 * Runtime validation of the status-transition state machine: allowed/denied
 * edges, email triggers, note requirements, and display helpers.
 */

import {
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  getTransitionEmailTemplate,
} from '../types';
import { getStatusColor, getStatusLabel, getNextStatuses } from '../status-helpers';
import type { OrderStatus } from '@/lib/db/schema/orders';

// ---------------------------------------------------------------------------
// isValidStatusTransition — full matrix
// ---------------------------------------------------------------------------

describe('isValidStatusTransition', () => {
  const allowed: Array<[OrderStatus, OrderStatus]> = [
    ['pending', 'confirmed'],
    ['pending', 'cancelled'],
    ['confirmed', 'blending'],
    ['confirmed', 'cancelled'],
    ['blending', 'quality-check'],
    ['blending', 'cancelled'],
    ['quality-check', 'ready-to-ship'],
    ['quality-check', 'blending'],
    ['ready-to-ship', 'shipped'],
    ['ready-to-ship', 'cancelled'],
    ['shipped', 'delivered'],
    ['delivered', 'refunded'],
  ];

  it.each(allowed)('allows %s → %s', (from, to) => {
    expect(isValidStatusTransition(from, to)).toBe(true);
  });

  const denied: Array<[OrderStatus, OrderStatus]> = [
    ['shipped', 'cancelled'],     // explicitly defined as not allowed
    ['cancelled', 'pending'],     // explicitly defined as not allowed
    ['pending', 'shipped'],       // undefined edge
    ['pending', 'delivered'],
    ['blending', 'shipped'],
    ['delivered', 'pending'],
    ['delivered', 'cancelled'],
    ['refunded', 'pending'],
    ['cancelled', 'confirmed'],
    ['shipped', 'pending'],
    ['confirmed', 'delivered'],
    ['quality-check', 'delivered'],
  ];

  it.each(denied)('denies %s → %s', (from, to) => {
    expect(isValidStatusTransition(from, to)).toBe(false);
  });

  it('denies self-transitions (no no-op edges defined)', () => {
    const statuses: OrderStatus[] = [
      'pending', 'confirmed', 'processing', 'blending', 'quality-check',
      'ready-to-ship', 'shipped', 'delivered', 'cancelled', 'refunded',
    ];
    for (const s of statuses) {
      expect(isValidStatusTransition(s, s)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// getTransitionEmailTemplate
// ---------------------------------------------------------------------------

describe('getTransitionEmailTemplate', () => {
  const withEmail: Array<[OrderStatus, OrderStatus, string]> = [
    ['pending', 'confirmed', 'order_confirmed'],
    ['pending', 'cancelled', 'order_cancelled'],
    ['confirmed', 'blending', 'blend_mixing'],
    ['quality-check', 'ready-to-ship', 'order_ready'],
    ['ready-to-ship', 'shipped', 'order_shipped'],
    ['shipped', 'delivered', 'order_delivered'],
  ];

  it.each(withEmail)('triggers "%2" for %s → %s', (from, to, template) => {
    expect(getTransitionEmailTemplate(from, to)).toBe(template);
  });

  it('has no email for internal moves', () => {
    expect(getTransitionEmailTemplate('blending', 'quality-check')).toBeUndefined();
    expect(getTransitionEmailTemplate('quality-check', 'blending')).toBeUndefined();
    expect(getTransitionEmailTemplate('delivered', 'refunded')).toBeUndefined();
  });

  it('returns undefined for invalid transitions', () => {
    expect(getTransitionEmailTemplate('shipped', 'cancelled')).toBeUndefined();
    expect(getTransitionEmailTemplate('pending', 'delivered')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// VALID_STATUS_TRANSITIONS integrity
// ---------------------------------------------------------------------------

describe('VALID_STATUS_TRANSITIONS integrity', () => {
  it('requires a note for cancellations mid-production and refunds', () => {
    const noteRequired = VALID_STATUS_TRANSITIONS.filter(t => t.requiresNote);
    expect(noteRequired.map(t => `${t.from}→${t.to}`)).toEqual(
      expect.arrayContaining(['blending→cancelled', 'quality-check→blending', 'ready-to-ship→cancelled', 'delivered→refunded'])
    );
  });

  it('has no duplicate edges', () => {
    const edges = VALID_STATUS_TRANSITIONS.map(t => `${t.from}→${t.to}`);
    expect(new Set(edges).size).toBe(edges.length);
  });

  it('disallowed edges carry no email trigger', () => {
    const disallowed = VALID_STATUS_TRANSITIONS.filter(t => !t.allowed);
    for (const t of disallowed) {
      expect(t.triggersEmail).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// status-helpers display functions
// ---------------------------------------------------------------------------

describe('status-helpers', () => {
  it('getNextStatuses returns the reachable states', () => {
    expect(getNextStatuses('pending')).toEqual(['confirmed', 'cancelled']);
    expect(getNextStatuses('blending')).toEqual(['quality-check', 'cancelled']);
    expect(getNextStatuses('shipped')).toEqual(['delivered']);
  });

  it('getNextStatuses returns [] for terminal states', () => {
    expect(getNextStatuses('cancelled')).toEqual([]);
    expect(getNextStatuses('refunded')).toEqual([]);
  });

  it('getStatusLabel maps every known status and falls back to the raw value', () => {
    expect(getStatusLabel('blending')).toBe('Mixing');
    expect(getStatusLabel('quality-check')).toBe('Quality Check');
    expect(getStatusLabel('ready-to-ship')).toBe('Ready to Ship');
    expect(getStatusLabel('bogus' as OrderStatus)).toBe('bogus');
  });

  it('getStatusColor maps every known status and falls back to gray', () => {
    expect(getStatusColor('pending')).toBe('gray');
    expect(getStatusColor('delivered')).toBe('green');
    expect(getStatusColor('cancelled')).toBe('red');
    expect(getStatusColor('bogus' as OrderStatus)).toBe('gray');
  });
});
