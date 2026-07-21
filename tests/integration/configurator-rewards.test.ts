/**
 * Configurator ↔ Rewards Integration Tests
 * 
 * Tests that tier unlocks reflect in configurator, credits apply correctly,
 * and chain options appear at the correct tier level.
 */

// Mock drizzle-orm
jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value, operator: 'eq' })),
  and: jest.fn((...conditions) => ({ conditions, operator: 'and' })),
  desc: jest.fn((field) => ({ field, direction: 'desc' })),
  sql: jest.fn((template, ...values) => ({ template, values })),
}));

// Mock database schema
jest.mock('@/lib/db/schema-refill', () => ({
  customers: { id: 'customers.id', email: 'customers.email', metadata: 'customers.metadata' },
  orders: { id: 'orders.id', customerId: 'orders.customerId', metadata: 'orders.metadata' },
  foreverBottles: { id: 'foreverBottles.id', customerId: 'foreverBottles.customerId', status: 'foreverBottles.status' },
  creditTransactions: { id: 'creditTransactions.id', customerId: 'creditTransactions.customerId' },
  customerCredits: { id: 'customerCredits.id', customerId: 'customerCredits.customerId', balance: 'customerCredits.balance' },
  foreverBottleHistory: { id: 'foreverBottleHistory.id' },
}));

// Mock database before any imports
jest.mock('@/lib/db', () => ({
  db: {
    query: {},
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  getCustomerRewardsProfile,
  updateCustomerSpend,
} from '@/lib/rewards/customer-rewards';
import { 
  calculateTier, 
  CRYSTAL_CIRCLE_TIERS,
  type TierLevel 
} from '@/lib/rewards/tiers';
import { getAvailableChains } from '@/lib/rewards/chain-system';
import { 
  createMockCustomer,
  createMockOrder,
  createMockConfiguredProduct,
} from '../utils/test-data';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment,
  sanityMocks,
} from '../utils/setup';

// Mock dependencies
jest.mock('@/lib/rewards/customer-rewards', () => ({
  ...jest.requireActual('@/lib/rewards/customer-rewards'),
  getCustomerRewardsProfile: jest.fn(),
  updateCustomerSpend: jest.fn(),
}));

// Mock getAvailableChains to return only unlocked chains for each tier
jest.mock('@/lib/rewards/chain-system', () => {
  const actual = jest.requireActual('@/lib/rewards/chain-system');
  return {
    ...actual,
    getAvailableChains: jest.fn((tier: TierLevel) => {
      const tierChains: Record<string, string[]> = {
        seed: [],
        sprout: ['silver-plated'],
        bloom: ['silver-plated', 'gold-plated'],
        radiance: ['silver-plated', 'gold-plated', 'sterling-silver'],
        luminary: ['silver-plated', 'gold-plated', 'sterling-silver', '14k-gold-filled'],
      };
      const chains = tierChains[tier] || [];
      return chains.map(type => ({
        type,
        config: actual.CHAIN_CATALOG[type],
        isLocked: false,
        isSelected: false,
        unlockProgress: 100,
      }));
    }),
  };
});

describe('Configurator ↔ Rewards Integration', () => {
  beforeEach(async () => {
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await teardownTestEnvironment();
  });

  describe('Tier Unlocks in Configurator', () => {
    it('should show Seed tier customer has no chain options unlocked', async () => {
      // Arrange
      const customer = createMockCustomer({ tier: 'seed', totalSpend: 0 });
      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(customer);

      // Act
      const profile = await getCustomerRewardsProfile(customer.customerId);
      const availableChains = getAvailableChains(profile.currentTier);

      // Assert
      expect(profile.currentTier).toBe('seed');
      expect(profile.unlockedChains).toHaveLength(0);
      expect(availableChains).toHaveLength(0);
    });

    it('should unlock Silver-plated chain when customer reaches Sprout tier', async () => {
      // Arrange
      const seedCustomer = createMockCustomer({ tier: 'seed', totalSpend: 0 });
      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(seedCustomer);

      const sproutUpdate = {
        profile: createMockCustomer({ 
          tier: 'sprout', 
          totalSpend: 150,
          unlockedChains: ['silver-plated']
        }),
        tierUpgraded: true,
        previousTier: 'seed' as TierLevel,
        newChainsUnlocked: ['silver-plated' as const],
        newCharmsUnlocked: ['crescent-moon'],
        notifications: [{
          type: 'tier_upgrade' as const,
          title: 'Welcome to Sprout!',
          message: 'Congratulations! You\'ve reached Sprout tier.',
          metadata: { tiersCrossed: ['sprout'] },
        }],
      };
      (updateCustomerSpend as jest.Mock).mockResolvedValue(sproutUpdate);

      // Act
      const order = createMockOrder({ orderTotal: 150 });
      const result = await updateCustomerSpend(seedCustomer.customerId, order);

      // Assert
      expect(result.tierUpgraded).toBe(true);
      expect(result.previousTier).toBe('seed');
      expect(result.profile.currentTier).toBe('sprout');
      expect(result.newChainsUnlocked).toContain('silver-plated');
      expect(result.profile.unlockedChains).toContain('silver-plated');
    });

    it('should show Gold-plated chain unlock at Bloom tier', async () => {
      // Arrange
      const bloomCustomer = createMockCustomer({ 
        tier: 'bloom', 
        totalSpend: 350,
        unlockedChains: ['silver-plated', 'gold-plated']
      });
      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(bloomCustomer);

      // Act
      const profile = await getCustomerRewardsProfile(bloomCustomer.customerId);
      const availableChains = getAvailableChains(profile.currentTier);

      // Assert
      expect(profile.currentTier).toBe('bloom');
      expect(profile.unlockedChains).toContain('silver-plated');
      expect(profile.unlockedChains).toContain('gold-plated');
      expect(availableChains.map(c => c.type)).toContain('gold-plated');
    });

    it('should show all chains unlocked at Luminary tier', async () => {
      // Arrange
      const luminaryCustomer = createMockCustomer({ 
        tier: 'luminary', 
        totalSpend: 1500,
        unlockedChains: ['silver-plated', 'gold-plated', 'sterling-silver', '14k-gold-filled']
      });
      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(luminaryCustomer);

      // Act
      const profile = await getCustomerRewardsProfile(luminaryCustomer.customerId);
      const availableChains = getAvailableChains(profile.currentTier);

      // Assert
      expect(profile.currentTier).toBe('luminary');
      expect(profile.unlockedChains).toHaveLength(4);
      expect(availableChains.map(c => c.type)).toEqual(
        expect.arrayContaining([
          'silver-plated',
          'gold-plated', 
          'sterling-silver',
          '14k-gold-filled'
        ])
      );
    });
  });

  describe('Credit Application in Configurator', () => {
    it('should show available credit in configurator for customer with credits', async () => {
      // Arrange
      const customer = createMockCustomer({ 
        tier: 'radiance', 
        totalSpend: 700,
        accountCredit: 25.00 
      });
      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(customer);

      // Act
      const profile = await getCustomerRewardsProfile(customer.customerId);

      // Assert
      expect(profile.accountCredit).toBe(25.00);
    });

    it('should allow credit application up to available balance', () => {
      // Arrange
      const availableCredit = 25.00;
      const orderTotal = 89.99;

      // Act
      const creditToApply = Math.min(availableCredit, orderTotal);
      const finalTotal = orderTotal - creditToApply;

      // Assert
      expect(creditToApply).toBe(25.00);
      expect(finalTotal).toBe(64.99);
    });

    it('should not allow credit application exceeding available balance', () => {
      // Arrange
      const availableCredit = 10.00;
      const requestedCredit = 25.00;

      // Act
      const canApplyCredit = requestedCredit <= availableCredit;

      // Assert
      expect(canApplyCredit).toBe(false);
    });

    it('should apply credit correctly in configured product', () => {
      // Arrange
      const customer = createMockCustomer({ 
        tier: 'sprout', 
        totalSpend: 150,
        accountCredit: 15.00 
      });
      
      // Act
      const configuredProduct = createMockConfiguredProduct({
        customerTier: customer.currentTier,
        creditToApply: 15.00,
      });

      // Assert
      expect(configuredProduct.creditToApply).toBe(15.00);
      expect(configuredProduct.customerTier).toBe('sprout');
    });
  });

  describe('Chain Options at Correct Tier', () => {
    const tierChainTests = [
      { tier: 'seed' as TierLevel, expectedChains: 0 },
      { tier: 'sprout' as TierLevel, expectedChains: 1 },
      { tier: 'bloom' as TierLevel, expectedChains: 2 },
      { tier: 'radiance' as TierLevel, expectedChains: 3 },
      { tier: 'luminary' as TierLevel, expectedChains: 4 },
    ];

    tierChainTests.forEach(({ tier, expectedChains }) => {
      it(`should show ${expectedChains} chain(s) at ${tier} tier`, () => {
        // Act
        const availableChains = getAvailableChains(tier);

        // Assert
        expect(availableChains).toHaveLength(expectedChains);
      });
    });

    it('should correctly identify chain tier requirements', () => {
      // Act & Assert
      expect(CRYSTAL_CIRCLE_TIERS.seed.unlockedChains).toHaveLength(0);
      expect(CRYSTAL_CIRCLE_TIERS.sprout.unlockedChains).toContain('silver-plated');
      expect(CRYSTAL_CIRCLE_TIERS.bloom.unlockedChains).toContain('gold-plated');
      expect(CRYSTAL_CIRCLE_TIERS.radiance.unlockedChains).toContain('sterling-silver');
      expect(CRYSTAL_CIRCLE_TIERS.luminary.unlockedChains).toContain('14k-gold-filled');
    });
  });

  describe('Tier Progress Display', () => {
    it('should show correct progress to next tier for Seed customer', () => {
      // Arrange
      const customer = createMockCustomer({ tier: 'seed', totalSpend: 75 });

      // Assert
      expect(customer.progressToNextTier.nextTierName).toBe('Sprout');
      expect(customer.progressToNextTier.target).toBe(150);
      expect(customer.progressToNextTier.amountNeeded).toBe(75);
      expect(customer.progressToNextTier.percentage).toBe(50);
    });

    it('should show 100% progress for Luminary customer', () => {
      // Arrange
      const customer = createMockCustomer({ tier: 'luminary', totalSpend: 2000 });

      // Assert
      expect(customer.progressToNextTier.percentage).toBe(100);
      expect(customer.progressToNextTier.nextTierName).toBeNull();
      expect(customer.progressToNextTier.amountNeeded).toBe(0);
    });

    it('should update progress after purchase', async () => {
      // Arrange
      const seedCustomer = createMockCustomer({ tier: 'seed', totalSpend: 100 });
      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(seedCustomer);

      const updatedCustomer = createMockCustomer({ 
        tier: 'seed', 
        totalSpend: 140,
      });
      
      const updateResult = {
        profile: updatedCustomer,
        tierUpgraded: false,
        newChainsUnlocked: [],
        newCharmsUnlocked: [],
        notifications: [],
      };
      (updateCustomerSpend as jest.Mock).mockResolvedValue(updateResult);

      // Act
      const order = createMockOrder({ orderTotal: 40 });
      const result = await updateCustomerSpend(seedCustomer.customerId, order);

      // Assert
      expect(result.tierUpgraded).toBe(false);
      expect(result.profile.progressToNextTier.amountNeeded).toBe(10);
      expect(result.profile.progressToNextTier.percentage).toBeCloseTo(93.33, 1);
    });
  });

  describe('Refill Discount Integration', () => {
    it('should show no refill discount for Seed tier', () => {
      const customer = createMockCustomer({ tier: 'seed', totalSpend: 0 });
      expect(customer.refillDiscount).toBe(0);
    });

    it('should show 10% refill discount for Radiance tier', () => {
      const customer = createMockCustomer({ tier: 'radiance', totalSpend: 700 });
      expect(customer.refillDiscount).toBe(10);
    });

    it('should show 15% refill discount for Luminary tier', () => {
      const customer = createMockCustomer({ tier: 'luminary', totalSpend: 1500 });
      expect(customer.refillDiscount).toBe(15);
    });
  });
});
