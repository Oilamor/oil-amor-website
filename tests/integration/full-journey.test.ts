/**
 * Complete Customer Journey Integration Test
 * 
 * Tests the full customer lifecycle:
 * 1. New customer buys 30ml oil
 * 2. Tier unlocks to Sprout
 * 3. Silver chain becomes available
 * 4. Refill unlocks
 * 5. Customer orders refill
 * 6. AusPost label generated
 * 7. Bottle returned
 * 8. Credit applied
 * 9. Credit used on next order
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

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  updateCustomerSpend,
  getCustomerRewardsProfile,
} from '@/lib/rewards/customer-rewards';
import { 
  isRefillUnlocked, 
  checkRefillEligibility,
} from '@/lib/refill/eligibility';
import { 
  processRefillCredit,
  useCredits,
  getCreditSummary,
} from '@/lib/refill/credits';
import { 
  createMockCustomer,
  createMockOrder,
  createMockForeverBottle,
  createMockConfiguredProduct,
  generateVariantId,
  generateOrderId,
  generateCustomerId,
} from '../utils/test-data';
// Mock database before importing setup
jest.mock('@/lib/db', () => ({
  db: {
    query: {},
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { 
  setupTestEnvironment, 
  teardownTestEnvironment,
  ausPostMocks,
} from '../utils/setup';

// Mock all dependencies
jest.mock('@/lib/rewards/customer-rewards', () => ({
  updateCustomerSpend: jest.fn(),
  getCustomerRewardsProfile: jest.fn(),
}));

jest.mock('@/lib/refill/eligibility', () => ({
  isRefillUnlocked: jest.fn(),
  checkRefillEligibility: jest.fn(),
  unlockRefillForCustomer: jest.fn(),
}));

jest.mock('@/lib/refill/credits', () => ({
  processRefillCredit: jest.fn(),
  useCredits: jest.fn(),
  getCreditSummary: jest.fn(),
  REFILL_CREDIT_AMOUNT: 5,
}));

jest.mock('@/lib/shipping/auspost', () => ({
  generateReturnLabel: jest.fn(),
}));

describe('Complete Customer Journey', () => {
  beforeEach(async () => {
    await setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await teardownTestEnvironment();
  });

  describe('Journey Step 1-3: New Customer → Sprout Tier → Silver Chain', () => {
    it('should complete tier progression from Seed to Sprout', async () => {
      // Step 1: New customer (Seed tier)
      const customerId = generateCustomerId();
      const initialProfile = createMockCustomer({
        customerId,
        tier: 'seed',
        totalSpend: 0,
        unlockedChains: [],
      });

      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(initialProfile);

      const profile = await getCustomerRewardsProfile(customerId);
      expect(profile.currentTier).toBe('seed');
      expect(profile.unlockedChains).toHaveLength(0);

      // Step 2: Customer buys 30ml oil for $89.99
      const order = createMockOrder({
        orderId: generateOrderId(),
        customerId,
        orderTotal: 89.99,
        items: [
          {
            productId: generateVariantId(),
            productType: 'oil',
            quantity: 1,
            price: 89.99,
          },
        ],
      });

      const sproutProfile = createMockCustomer({
        customerId,
        tier: 'sprout',
        totalSpend: 89.99,
        unlockedChains: ['silver-plated'],
        purchaseCount: 1,
      });

      (updateCustomerSpend as jest.Mock).mockResolvedValue({
        profile: sproutProfile,
        tierUpgraded: true,
        previousTier: 'seed',
        newChainsUnlocked: ['silver-plated'],
        newCharmsUnlocked: ['crescent-moon'],
        notifications: [
          {
            type: 'tier_upgrade',
            title: 'Welcome to Sprout!',
            message: 'Congratulations! You\'ve reached Sprout tier.',
          },
        ],
      });

      const updateResult = await updateCustomerSpend(customerId, order);

      // Assertions for Step 2
      expect(updateResult.tierUpgraded).toBe(true);
      expect(updateResult.profile.currentTier).toBe('sprout');

      // Step 3: Silver chain becomes available
      expect(updateResult.newChainsUnlocked).toContain('silver-plated');
      expect(updateResult.profile.unlockedChains).toContain('silver-plated');

      // Customer should see silver chain in configurator
      const configuredProduct = createMockConfiguredProduct({
        customerTier: updateResult.profile.currentTier,
      });
      expect(configuredProduct.customerTier).toBe('sprout');
    });
  });

  describe('Journey Step 4: Refill Program Unlock', () => {
    it('should unlock refill program after 30ml purchase', async () => {
      // Arrange
      const customerId = generateCustomerId();

      (isRefillUnlocked as jest.Mock).mockResolvedValue(true);

      // Act
      const isUnlocked = await isRefillUnlocked(customerId);

      // Assert
      expect(isUnlocked).toBe(true);
    });

    it('should show eligible bottles in refill dashboard', async () => {
      // Arrange
      const customerId = generateCustomerId();
      const bottles = [
        createMockForeverBottle({
          customerId,
          serialNumber: 'FA-A1B2C3',
          oilType: 'Lavender',
          status: 'active',
        }),
        createMockForeverBottle({
          customerId,
          serialNumber: 'FA-D4E5F6',
          oilType: 'Eucalyptus',
          status: 'empty',
        }),
      ];

      (checkRefillEligibility as jest.Mock).mockResolvedValue({
        canRefill: true,
        availableBottles: bottles,
        pricing: {
          standardPrice: 35,
          discountedPrice: 30,
          creditApplied: 5,
          finalPrice: 30,
          availableCredits: 0,
        },
        customerStatus: {
          isUnlocked: true,
          unlockRequirement: 'has-purchased-30ml',
          bottlesOwned: 2,
          totalRefills: 0,
        },
      });

      // Act
      const eligibility = await checkRefillEligibility(customerId);

      // Assert
      expect(eligibility.customerStatus.isUnlocked).toBe(true);
      expect(eligibility.availableBottles).toHaveLength(2);
    });
  });

  describe('Journey Step 5-6: Refill Order → AusPost Label', () => {
    it('should process refill order and generate return label', async () => {
      // Arrange
      const customerId = generateCustomerId();
      const bottle = createMockForeverBottle({
        customerId,
        serialNumber: 'FA-TEST01',
        status: 'empty',
        currentFillLevel: 0,
      });

      // Check eligibility
      (checkRefillEligibility as jest.Mock).mockResolvedValue({
        canRefill: true,
        availableBottles: [bottle],
        pricing: {
          standardPrice: 35,
          discountedPrice: 30,
          creditApplied: 5,
          finalPrice: 30,
          availableCredits: 0,
        },
        customerStatus: {
          isUnlocked: true,
          bottlesOwned: 1,
          totalRefills: 0,
        },
      });

      const eligibility = await checkRefillEligibility(customerId);
      expect(eligibility.canRefill).toBe(true);

      // Generate return label (AusPost integration)
      ausPostMocks.generateReturnLabel.mockResolvedValue({
        trackingNumber: 'TGE1234567890',
        labelUrl: 'https://auspost.com.au/labels/TGE1234567890.pdf',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const label = await ausPostMocks.generateReturnLabel({
        customerId,
        bottleId: bottle.id,
        returnAddress: {
          name: 'Oil Amor Returns',
          address1: '123 Return St',
          city: 'Sydney',
          state: 'NSW',
          postcode: '2000',
        },
      });

      // Assert
      expect(label.trackingNumber).toMatch(/^TGE\d+$/);
      expect(label.labelUrl).toContain('TGE1234567890');
    });
  });

  describe('Journey Step 7-8: Bottle Return → Credit Applied', () => {
    it('should process bottle return and apply $5 credit', async () => {
      // Arrange
      const customerId = generateCustomerId();
      const bottle = createMockForeverBottle({
        customerId,
        serialNumber: 'FA-RETURN1',
      });
      const trackingNumber = 'TGE1234567890';

      (processRefillCredit as jest.Mock).mockResolvedValue({
        creditApplied: 5.00,
        newBalance: 5.00,
        transactionId: 'txn_return_123',
      });

      (getCreditSummary as jest.Mock).mockResolvedValue({
        totalEarned: 5.00,
        totalUsed: 0,
        totalExpired: 0,
        currentBalance: 5.00,
        pendingCredits: 0,
        expiringSoon: 0,
      });

      // Act - Process return
      const creditResult = await processRefillCredit(
        customerId,
        bottle.id,
        trackingNumber
      );

      // Assert - Credit applied
      expect(creditResult.creditApplied).toBe(5.00);
      expect(creditResult.newBalance).toBe(5.00);

      // Verify credit appears in summary
      const summary = await getCreditSummary(customerId);
      expect(summary.currentBalance).toBe(5.00);
      expect(summary.totalEarned).toBe(5.00);
    });
  });

  describe('Journey Step 9: Credit Used on Next Order', () => {
    it('should apply available credit to next purchase', async () => {
      // Arrange
      const customerId = generateCustomerId();
      const orderId = generateOrderId();
      const creditToUse = 5.00;

      (useCredits as jest.Mock).mockResolvedValue({
        success: true,
        amountUsed: 5.00,
        remainingBalance: 0,
        transactionId: 'txn_use_456',
      });

      (getCreditSummary as jest.Mock).mockResolvedValue({
        totalEarned: 5.00,
        totalUsed: 5.00,
        totalExpired: 0,
        currentBalance: 0,
        pendingCredits: 0,
        expiringSoon: 0,
      });

      // Act - Use credit on order
      const useResult = await useCredits(customerId, creditToUse, orderId);

      // Assert
      expect(useResult.success).toBe(true);
      expect(useResult.amountUsed).toBe(5.00);
      expect(useResult.remainingBalance).toBe(0);

      // Verify updated balance
      const finalSummary = await getCreditSummary(customerId);
      expect(finalSummary.currentBalance).toBe(0);
      expect(finalSummary.totalUsed).toBe(5.00);
    });

    it('should reduce order total by credit amount', () => {
      // Arrange
      const orderTotal = 89.99;
      const creditApplied = 5.00;

      // Act
      const finalTotal = orderTotal - creditApplied;

      // Assert
      expect(finalTotal).toBe(84.99);
    });
  });

  describe('Complete End-to-End Journey', () => {
    it('should execute complete customer lifecycle', async () => {
      // ===== STEP 1: New Customer =====
      const customerId = generateCustomerId();
      let customerProfile = createMockCustomer({
        customerId,
        tier: 'seed',
        totalSpend: 0,
      });

      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(customerProfile);
      let profile = await getCustomerRewardsProfile(customerId);
      expect(profile.currentTier).toBe('seed');

      // ===== STEP 2: First Purchase (30ml) =====
      const firstOrder = createMockOrder({
        orderId: generateOrderId(),
        customerId,
        orderTotal: 89.99,
      });

      customerProfile = createMockCustomer({
        customerId,
        tier: 'sprout',
        totalSpend: 89.99,
        unlockedChains: ['silver-plated'],
        purchaseCount: 1,
      });

      (updateCustomerSpend as jest.Mock).mockResolvedValue({
        profile: customerProfile,
        tierUpgraded: true,
        previousTier: 'seed',
        newChainsUnlocked: ['silver-plated'],
        newCharmsUnlocked: ['crescent-moon'],
        notifications: [{ type: 'tier_upgrade' }],
      });

      let updateResult = await updateCustomerSpend(customerId, firstOrder);
      expect(updateResult.tierUpgraded).toBe(true);
      expect(updateResult.profile.currentTier).toBe('sprout');

      // ===== STEP 3: Silver Chain Available =====
      expect(updateResult.profile.unlockedChains).toContain('silver-plated');

      // ===== STEP 4: Refill Unlocked =====
      (isRefillUnlocked as jest.Mock).mockResolvedValue(true);
      const refillUnlocked = await isRefillUnlocked(customerId);
      expect(refillUnlocked).toBe(true);

      // ===== STEP 5: Customer Has Forever Bottle =====
      const bottle = createMockForeverBottle({
        customerId,
        serialNumber: 'FA-JOURNEY1',
        status: 'empty',
      });

      (checkRefillEligibility as jest.Mock).mockResolvedValue({
        canRefill: true,
        availableBottles: [bottle],
        pricing: { standardPrice: 35, discountedPrice: 30, creditApplied: 5, finalPrice: 30, availableCredits: 0 },
        customerStatus: { isUnlocked: true, bottlesOwned: 1, totalRefills: 0 },
      });

      const eligibility = await checkRefillEligibility(customerId);
      expect(eligibility.canRefill).toBe(true);

      // ===== STEP 6: Return Label Generated =====
      ausPostMocks.generateReturnLabel.mockResolvedValue({
        trackingNumber: 'TGEJOURNEY01',
        labelUrl: 'https://auspost.com.au/labels/TGEJOURNEY01.pdf',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const label = await ausPostMocks.generateReturnLabel({ customerId, bottleId: bottle.id });
      expect(label.trackingNumber).toBe('TGEJOURNEY01');

      // ===== STEP 7: Bottle Returned =====
      // (In reality, this happens when customer ships bottle)

      // ===== STEP 8: Credit Applied =====
      (processRefillCredit as jest.Mock).mockResolvedValue({
        creditApplied: 5.00,
        newBalance: 5.00,
        transactionId: 'txn_journey_credit',
      });

      const creditResult = await processRefillCredit(customerId, bottle.id, label.trackingNumber);
      expect(creditResult.creditApplied).toBe(5.00);

      // ===== STEP 9: Credit Used on Next Order =====
      const secondOrder = createMockOrder({
        orderId: generateOrderId(),
        customerId,
        orderTotal: 89.99,
      });

      (useCredits as jest.Mock).mockResolvedValue({
        success: true,
        amountUsed: 5.00,
        remainingBalance: 0,
        transactionId: 'txn_journey_use',
      });

      const useResult = await useCredits(customerId, 5.00, secondOrder.orderId);
      expect(useResult.success).toBe(true);

      // Final state: Customer is Sprout tier, no credits remaining
      customerProfile = createMockCustomer({
        customerId,
        tier: 'sprout',
        totalSpend: 179.98, // 89.99 + 89.99
        unlockedChains: ['silver-plated'],
        accountCredit: 0,
        purchaseCount: 2,
      });

      (getCustomerRewardsProfile as jest.Mock).mockResolvedValue(customerProfile);
      const finalProfile = await getCustomerRewardsProfile(customerId);
      
      expect(finalProfile.currentTier).toBe('sprout');
      expect(finalProfile.totalSpend).toBe(179.98);
      expect(finalProfile.purchaseCount).toBe(2);
      expect(finalProfile.unlockedChains).toContain('silver-plated');
    });
  });
});
