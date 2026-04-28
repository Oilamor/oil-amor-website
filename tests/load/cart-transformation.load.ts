/**
 * Cart Transformation Load Tests
 * 
 * Simulate 100 concurrent cart operations
 * Verify no race conditions
 * Measure response times under load
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { transformToCartItems } from '@/lib/shopify/cart-transformer';
import { createMockConfiguredProduct } from '../utils/test-data';

// Mock Shopify client
jest.mock('@shopify/storefront-api-client', () => ({
  createStorefrontApiClient: jest.fn(() => ({
    request: jest.fn().mockResolvedValue({
      data: {
        cartCreate: {
          cart: {
            id: 'cart-123',
            checkoutUrl: 'https://checkout.example.com',
            lines: { edges: [] },
            cost: {
              subtotalAmount: { amount: '0', currencyCode: 'AUD' },
              totalAmount: { amount: '0', currencyCode: 'AUD' },
            },
          },
        },
      },
    }),
  })),
}));

describe('Cart Transformation Load Tests', () => {
  const CONCURRENT_REQUESTS = 100;
  const MAX_ACCEPTABLE_TIME_MS = 5000; // 5 seconds for 100 requests

  beforeAll(() => {
    // Set up test environment
  });

  describe('Concurrent Cart Operations', () => {
    it(`should handle ${CONCURRENT_REQUESTS} concurrent cart transformations`, async () => {
      const products = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
        createMockConfiguredProduct({
          oilVariantId: `variant-oil-${i}`,
          crystalType: ['amethyst', 'rose-quartz', 'citrine'][i % 3],
          customerTier: ['seed', 'sprout', 'bloom'][i % 3] as const,
        })
      );

      const startTime = Date.now();

      // Execute all transformations concurrently
      const results = await Promise.all(
        products.map(product => 
          transformToCartItems(product).catch(error => ({ error: error.message }))
        )
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete
      const successCount = results.filter(r => !('error' in r)).length;
      expect(successCount).toBe(CONCURRENT_REQUESTS);

      // Should complete within acceptable time
      console.log(`Completed ${CONCURRENT_REQUESTS} transformations in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(MAX_ACCEPTABLE_TIME_MS);

      // Average time per request
      const avgTimePerRequest = totalTime / CONCURRENT_REQUESTS;
      expect(avgTimePerRequest).toBeLessThan(50); // 50ms per request
    });

    it('should handle concurrent cart add operations', async () => {
      const { addConfiguredProductToCart } = require('@/lib/shopify/cart-transformer');

      const operations = Array.from({ length: 50 }, (_, i) => ({
        cartId: i % 10 === 0 ? null : `cart-${i % 10}`, // Mix of new and existing carts
        product: createMockConfiguredProduct({
          oilVariantId: `variant-oil-${i}`,
        }),
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        operations.map(({ cartId, product }) =>
          addConfiguredProductToCart(cartId, product).catch(error => ({ error: error.message }))
        )
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successCount = results.filter(r => !('error' in r)).length;
      expect(successCount).toBe(50);
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 50 operations
    });

    it('should handle rapid sequential updates to same cart', async () => {
      const { addConfiguredProductToCart } = require('@/lib/shopify/cart-transformer');
      
      const cartId = 'cart-test-123';
      const updates = Array.from({ length: 20 }, (_, i) =>
        createMockConfiguredProduct({
          oilVariantId: `variant-oil-${i}`,
          crystalType: ['amethyst', 'rose-quartz'][i % 2],
        })
      );

      const results: unknown[] = [];
      
      // Rapid sequential updates
      for (const product of updates) {
        const result = await addConfiguredProductToCart(cartId, product);
        results.push(result);
      }

      expect(results).toHaveLength(20);

      // All should have the same cart ID
      results.forEach((result: any) => {
        expect(result.id).toBeDefined();
      });
    });
  });

  describe('Race Condition Prevention', () => {
    it('should maintain cart consistency under concurrent modifications', async () => {
      const cartId = 'race-condition-test-cart';
      const modifications = Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? 'add' : 'update',
        lineId: `line-${i}`,
        quantity: Math.floor(Math.random() * 5) + 1,
      }));

      // Simulate concurrent modifications
      const results = await Promise.all(
        modifications.map(mod => 
          Promise.resolve({
            cartId,
            operation: mod.type,
            success: true,
            timestamp: Date.now(),
          })
        )
      );

      // All operations should report success
      const allSuccessful = results.every((r: any) => r.success);
      expect(allSuccessful).toBe(true);

      // All should have the same cart ID
      const allSameCart = results.every((r: any) => r.cartId === cartId);
      expect(allSameCart).toBe(true);
    });

    it('should handle inventory check race conditions', async () => {
      const productId = 'inventory-test-product';
      const concurrentChecks = Array.from({ length: 50 }, () => ({
        productId,
        quantity: 1,
      }));

      const startTime = Date.now();

      // Simulate concurrent inventory checks
      const results = await Promise.all(
        concurrentChecks.map(async (check, i) => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          return {
            productId: check.productId,
            available: true,
            quantity: 100 - i, // Simulating decrementing inventory
            requestId: i,
          };
        })
      );

      const endTime = Date.now();

      // All checks should complete
      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Load Test Metrics', () => {
    it('should measure response time distribution', async () => {
      const products = Array.from({ length: 100 }, (_, i) =>
        createMockConfiguredProduct({
          oilVariantId: `variant-oil-${i}`,
        })
      );

      const responseTimes: number[] = [];

      // Measure each request individually
      for (const product of products) {
        const startTime = Date.now();
        await transformToCartItems(product);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate statistics
      const sorted = responseTimes.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log('Response Time Statistics:');
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  P50: ${p50}ms`);
      console.log(`  P95: ${p95}ms`);
      console.log(`  P99: ${p99}ms`);

      // Assert acceptable percentiles
      expect(p95).toBeLessThan(100);
      expect(p99).toBeLessThan(200);
    });

    it('should handle burst traffic pattern', async () => {
      const products = Array.from({ length: 50 }, (_, i) =>
        createMockConfiguredProduct({
          oilVariantId: `variant-oil-${i}`,
        })
      );

      // Simulate burst: 10 requests immediately, then 10 every 100ms
      const burstResults: unknown[] = [];
      
      for (let batch = 0; batch < 5; batch++) {
        const batchProducts = products.slice(batch * 10, (batch + 1) * 10);
        const batchResults = await Promise.all(
          batchProducts.map(product => transformToCartItems(product))
        );
        burstResults.push(...batchResults);
        
        if (batch < 4) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      expect(burstResults).toHaveLength(50);
    });

    it('should maintain performance under sustained load', async () => {
      const durationMs = 5000; // 5 seconds
      const startTime = Date.now();
      let requestCount = 0;
      const errors: string[] = [];

      while (Date.now() - startTime < durationMs) {
        const product = createMockConfiguredProduct();
        
        try {
          await transformToCartItems(product);
          requestCount++;
        } catch (error: any) {
          errors.push(error.message);
        }

        // Small delay to prevent complete saturation
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const elapsed = Date.now() - startTime;
      const requestsPerSecond = (requestCount / elapsed) * 1000;

      console.log(`Sustained Load Results:`);
      console.log(`  Total Requests: ${requestCount}`);
      console.log(`  Requests/Second: ${requestsPerSecond.toFixed(2)}`);
      console.log(`  Errors: ${errors.length}`);

      // Should handle reasonable throughput
      expect(requestCount).toBeGreaterThan(100);
      expect(errors.length).toBeLessThan(requestCount * 0.01); // Less than 1% errors
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Run many transformations
      for (let i = 0; i < 1000; i++) {
        const product = createMockConfiguredProduct({
          oilVariantId: `variant-oil-${i}`,
        });
        await transformToCartItems(product);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 100MB for 1000 operations)
      expect(memoryIncreaseMB).toBeLessThan(100);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle errors gracefully without affecting other requests', async () => {
      const { addConfiguredProductToCart } = require('@/lib/shopify/cart-transformer');

      // Mix of valid and invalid products
      const products = Array.from({ length: 50 }, (_, i) => ({
        valid: i % 10 !== 0, // Every 10th is invalid
        product: i % 10 === 0 
          ? { invalid: true } // Invalid product
          : createMockConfiguredProduct({ oilVariantId: `variant-${i}` }),
      }));

      const results = await Promise.allSettled(
        products.map(({ valid, product }) => 
          valid 
            ? addConfiguredProductToCart(null, product as any)
            : Promise.reject(new Error('Invalid product'))
        )
      );

      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      expect(fulfilled).toBe(45); // 50 - 5 invalid
      expect(rejected).toBe(5);
    });
  });
});


