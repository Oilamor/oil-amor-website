/**
 * Test Setup and Teardown
 * 
 * Shared test setup utilities for database cleanup, Redis flush,
 * and third-party API mocks.
 */

import { Redis } from 'ioredis';
import { db } from '@/lib/db';
import { 
  customers, 
  orders, 
  foreverBottles, 
  foreverBottleHistory,
  creditTransactions,
  customerCredits,
} from '@/lib/db/schema-refill';

// ============================================================================
// Test Environment Detection
// ============================================================================

export const isCI = process.env.CI === 'true';
export const isTestEnv = process.env.NODE_ENV === 'test';

// ============================================================================
// Redis Setup
// ============================================================================

let redis: Redis | null = null;

export function getTestRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 15, // Use separate DB for tests
      lazyConnect: true,
    });
  }
  return redis;
}

export async function flushTestRedis(): Promise<void> {
  const client = getTestRedis();
  await client.flushdb();
}

export async function closeTestRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// ============================================================================
// Database Setup
// ============================================================================

export async function cleanupTestDatabase(): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  await db.delete(foreverBottleHistory);
  await db.delete(foreverBottles);
  await db.delete(creditTransactions);
  await db.delete(customerCredits);
  await db.delete(orders);
  await db.delete(customers);
}

export async function truncateTable(tableName: string): Promise<void> {
  // Use raw query for truncation
  await db.execute(`TRUNCATE TABLE ${tableName} CASCADE`);
}

// ============================================================================
// AusPost Mock Setup
// ============================================================================

export interface AusPostLabelResponse {
  trackingNumber: string;
  labelUrl: string;
  expiryDate: Date;
}

export const ausPostMocks = {
  generateReturnLabel: jest.fn(),
  trackShipment: jest.fn(),
  validateAddress: jest.fn(),
};

export function setupAusPostMocks(): void {
  // Default mock implementations
  ausPostMocks.generateReturnLabel.mockResolvedValue({
    trackingNumber: 'TGE1234567890',
    labelUrl: 'https://test.auspost.com.au/labels/TGE1234567890.pdf',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  ausPostMocks.trackShipment.mockResolvedValue({
    trackingNumber: 'TGE1234567890',
    status: 'in_transit',
    events: [
      {
        timestamp: new Date(),
        status: 'Picked up',
        location: 'Sydney NSW',
      },
    ],
  });

  ausPostMocks.validateAddress.mockResolvedValue({
    valid: true,
    normalizedAddress: {
      street: '123 Test St',
      city: 'Sydney',
      state: 'NSW',
      postcode: '2000',
    },
  });
}

export function resetAusPostMocks(): void {
  Object.values(ausPostMocks).forEach(mock => mock.mockReset());
}

// ============================================================================
// Sanity Mock Setup
// ============================================================================

export const sanityMocks = {
  fetch: jest.fn(),
  create: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

export function setupSanityMocks(): void {
  sanityMocks.fetch.mockResolvedValue(null);
  sanityMocks.create.mockImplementation((doc: unknown) => 
    Promise.resolve({ _id: `mock-${Date.now()}`, ...doc as object })
  );
  sanityMocks.patch.mockReturnValue({
    set: jest.fn().mockReturnThis(),
    commit: jest.fn().mockResolvedValue({}),
  });
}

export function resetSanityMocks(): void {
  Object.values(sanityMocks).forEach(mock => mock.mockReset());
}

// ============================================================================
// Global Test Setup
// ============================================================================

export async function setupTestEnvironment(): Promise<void> {
  // Ensure we're in test mode
  if (!isTestEnv) {
    throw new Error('Tests must run with NODE_ENV=test');
  }

  // Set up all mocks
  setupAusPostMocks();
  setupSanityMocks();

  // Clean up any existing test data
  await cleanupTestDatabase();
  await flushTestRedis();
}

export async function teardownTestEnvironment(): Promise<void> {
  // Clean up
  await cleanupTestDatabase();
  await flushTestRedis();
  await closeTestRedis();

  // Reset mocks
  resetAusPostMocks();
  resetSanityMocks();
}

// ============================================================================
// Jest Setup File Integration
// ============================================================================

// This function should be called in jest.setup.ts
export function initializeJestSetup(): void {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    // Clean state between tests
    await cleanupTestDatabase();
    await flushTestRedis();
    resetAusPostMocks();
    resetSanityMocks();
  });
}

// ============================================================================
// Test Helpers
// ============================================================================

export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForAsyncOperation<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<T> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await operation();
      if (result) return result;
    } catch {
      // Retry
    }
    await waitFor(intervalMs);
  }
  
  throw new Error(`Async operation timed out after ${timeoutMs}ms`);
}

// ============================================================================
// Performance Measurement
// ============================================================================

export interface PerformanceResult {
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

export async function measurePerformance<T>(
  operation: () => Promise<T>
): Promise<{ result: T; performance: PerformanceResult }> {
  const memoryBefore = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  
  const result = await operation();
  
  const endTime = performance.now();
  const memoryAfter = process.memoryUsage().heapUsed;
  
  return {
    result,
    performance: {
      duration: endTime - startTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
    },
  };
}

export function assertPerformance(
  result: PerformanceResult,
  maxDurationMs: number,
  maxMemoryDeltaBytes?: number
): void {
  expect(result.duration).toBeLessThan(maxDurationMs);
  
  if (maxMemoryDeltaBytes !== undefined) {
    expect(result.memoryDelta).toBeLessThan(maxMemoryDeltaBytes);
  }
}
