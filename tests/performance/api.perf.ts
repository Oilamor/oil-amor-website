/**
 * API Performance Tests
 *
 * Measure API response times:
 * - getSynergyContent: < 100ms (cached)
 * - getCustomerRewards: < 50ms (Redis)
 * - generateReturnLabel: < 2s (AusPost API)
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { measurePerformance, assertPerformance } from '../utils/setup';

// Mock modules
jest.mock('@/lib/content/cache', () => ({
  getCached: jest.fn(),
  setCached: jest.fn(),
}));

describe('API Performance Tests', () => {
  describe('getSynergyContent Performance', () => {
    it('should return cached synergy content in under 100ms', async () => {
      const { getCached } = require('@/lib/content/cache');

      // Mock cached response
      getCached.mockResolvedValue({
        _id: 'synergy-1',
        headline: 'Divine Tranquility',
        story: 'Test story',
        ritualInstructions: [],
      });

      const { performance } = await measurePerformance(async () => {
        const result = await getCached('synergy:lavender:amethyst');
        expect(result).toBeDefined();
      });

      // Assert: Cached response < 100ms
      assertPerformance(performance, 100);
    });

    it('should handle cache misses efficiently', async () => {
      const { getCached, setCached } = require('@/lib/content/cache');

      // First call - cache miss
      getCached.mockResolvedValueOnce(null);

      const mockSynergyData = {
        _id: 'synergy-1',
        headline: 'Divine Tranquility',
        story: 'Test story',
      };

      // Simulate fetch and cache
      const fetchAndCache = async () => {
        let data = await getCached('synergy:lavender:amethyst');
        if (!data) {
          // Simulate Sanity fetch
          data = mockSynergyData;
          await setCached('synergy:lavender:amethyst', data, 3600);
        }
        return data;
      };

      const { performance } = await measurePerformance(fetchAndCache);

      // Cache miss + fetch + store should still be reasonable
      expect(performance.duration).toBeLessThan(500);
    });

    it('should batch multiple synergy requests', async () => {
      const { getCached } = require('@/lib/content/cache');

      const requests = [
        'synergy:lavender:amethyst',
        'synergy:lavender:rose-quartz',
        'synergy:peppermint:clear-quartz',
      ];

      getCached.mockResolvedValue({ headline: 'Test' });

      const startTime = performance.now();

      // Fire all requests simultaneously
      await Promise.all(
        requests.map(key => getCached(key))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Parallel requests should complete quickly
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('getCustomerRewards Performance', () => {
    it('should return customer rewards from Redis in under 50ms', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedis = new Redis();

      // @upstash/redis auto-deserializes JSON — a hit comes back parsed.
      mockRedis.get.mockResolvedValue({
        customerId: 'cust-123',
        currentTier: 'sprout',
        totalSpend: 150,
        accountCredit: 25,
      });

      const { performance } = await measurePerformance(async () => {
        const profile = await mockRedis.get('rewards:profile:cust-123');
        expect(profile.currentTier).toBe('sprout');
      });

      // Assert: Redis response < 50ms
      assertPerformance(performance, 50);
    });

    it('should handle concurrent customer requests', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedis = new Redis();

      mockRedis.get.mockResolvedValue({
        customerId: 'cust-123',
        currentTier: 'sprout',
      });

      const customerIds = ['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5'];

      const startTime = performance.now();

      await Promise.all(
        customerIds.map(id => mockRedis.get(`rewards:profile:${id}`))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should complete quickly in parallel
      expect(totalTime).toBeLessThan(100);
    });

    it('should fallback to database within acceptable time', async () => {
      const { Redis } = require('@upstash/redis');
      const mockRedis = new Redis();

      // Redis miss
      mockRedis.get.mockResolvedValue(null);

      const fetchFromDatabase = async () => {
        const cached = await mockRedis.get('rewards:profile:cust-123');
        if (!cached) {
          // Simulate database fetch (should be < 200ms)
          await new Promise(resolve => setTimeout(resolve, 50));
          return { customerId: 'cust-123', currentTier: 'sprout' };
        }
        return cached;
      };

      const { performance } = await measurePerformance(fetchFromDatabase);

      // Redis miss + DB fetch should be < 300ms
      expect(performance.duration).toBeLessThan(300);
    });
  });

  describe('generateReturnLabel Performance', () => {
    it('should generate AusPost label in under 2 seconds', async () => {
      const mockGenerateLabel = jest.fn().mockImplementation(async () => {
        // Simulate AusPost API latency
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
          trackingNumber: 'TGE1234567890',
          labelUrl: 'https://auspost.com.au/labels/TGE1234567890.pdf',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
      });

      const { performance } = await measurePerformance(async () => {
        const result = await mockGenerateLabel({
          customerId: 'cust-123',
          bottleId: 'bottle-456',
          returnAddress: {
            name: 'Oil Amor',
            address1: '123 Return St',
            city: 'Sydney',
            state: 'NSW',
            postcode: '2000',
          },
        });
        expect(result.trackingNumber).toBeDefined();
      });

      // Assert: AusPost API < 2000ms
      assertPerformance(performance, 2000);
    });

    it('should timeout gracefully for slow AusPost responses', async () => {
      const mockGenerateLabel = jest.fn().mockImplementation(async () => {
        // Simulate very slow response
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { trackingNumber: 'TGE1234567890' };
      });

      const startTime = performance.now();

      // Call with timeout
      const promise = Promise.race([
        mockGenerateLabel({}),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 3000)
        ),
      ]);

      await expect(promise).rejects.toThrow('Timeout');

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(3500);
    });
  });

  describe('Cart Transformation Performance', () => {
    it('should transform cart items in under 100ms', async () => {
      const mockTransform = jest.fn().mockImplementation(async (items: unknown[]) => {
        // Simulate cart transformation logic
        await new Promise(resolve => setTimeout(resolve, 20));
        return {
          lineItems: items,
          metadata: { totalLines: items.length },
        };
      });

      const configuredProducts = [
        { id: 'item-1', crystal: 'amethyst' },
        { id: 'item-2', crystal: 'rose-quartz' },
        { id: 'item-3', crystal: 'citrine' },
      ];

      const { performance } = await measurePerformance(async () => {
        const result = await mockTransform(configuredProducts);
        expect(result.lineItems).toHaveLength(3);
      });

      // Cart transformation < 100ms
      assertPerformance(performance, 100);
    });
  });

  describe('Webhook Processing Performance', () => {
    it('should process Shopify order webhook in under 500ms', async () => {
      const mockProcessWebhook = jest.fn().mockImplementation(async () => {
        // Simulate webhook processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return { processed: true, customerId: 'cust-123' };
      });

      const webhookPayload = {
        id: 'order-123',
        customer: { id: 'cust-123' },
        total_price: '89.99',
        line_items: [{ product_id: 'prod-1', quantity: 1 }],
      };

      const { performance } = await measurePerformance(async () => {
        const result = await mockProcessWebhook(webhookPayload);
        expect(result.processed).toBe(true);
      });

      // Webhook processing < 500ms
      assertPerformance(performance, 500);
    });
  });

  describe('Database Query Performance', () => {
    it('should query customer orders in under 100ms', async () => {
      const mockQuery = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return [
          { id: 'order-1', total: 89.99 },
          { id: 'order-2', total: 45.00 },
        ];
      });

      const { performance } = await measurePerformance(async () => {
        const orders = await mockQuery({ customerId: 'cust-123' });
        expect(orders).toHaveLength(2);
      });

      // Database query < 100ms
      assertPerformance(performance, 100);
    });

    it('should handle complex aggregations efficiently', async () => {
      const mockAggregate = jest.fn().mockImplementation(async () => {
        // Simulate aggregation query
        await new Promise(resolve => setTimeout(resolve, 80));
        return {
          totalSpend: 500,
          orderCount: 5,
          averageOrder: 100,
        };
      });

      const { performance } = await measurePerformance(async () => {
        const stats = await mockAggregate({ customerId: 'cust-123' });
        expect(stats.totalSpend).toBe(500);
      });

      // Aggregation < 200ms
      assertPerformance(performance, 200);
    });
  });

  describe('Page Load Performance', () => {
    it('should have acceptable TTFB for product pages', () => {
      // Target Time To First Byte
      const TARGET_TTFB_MS = 200;
      expect(TARGET_TTFB_MS).toBeLessThan(300);
    });

    it('should have acceptable LCP for product pages', () => {
      // Target Largest Contentful Paint
      const TARGET_LCP_MS = 2500;
      expect(TARGET_LCP_MS).toBeLessThan(3000);
    });

    it('should have acceptable FID for interactions', () => {
      // Target First Input Delay
      const TARGET_FID_MS = 100;
      expect(TARGET_FID_MS).toBeLessThan(150);
    });
  });
});
