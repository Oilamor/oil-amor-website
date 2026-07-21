/**
 * Oil Amor Refill Program - Main Export File
 * Re-exports all modules for convenient imports
 */

// ============================================================================
// FOREVER BOTTLE SYSTEM
// ============================================================================

export {
  // Types
  type ForeverBottle,
  type BottleStatus,
  type BottleHistoryEvent,
  type BottleRegistrationInput,
  type RetirementReason,
  
  // Core functions
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
  
  // Validation
  isValidSerialNumber,
  isBottleEligibleForRefill,
  
  // Utilities
  getBottleEnvironmentalImpact,
} from './forever-bottle';

// ============================================================================
// SHIPPING (AUSPOST)
// ============================================================================

export {
  // Types
  type Address,
  type AusPostLabel,
  type TrackingEvent,
  type TrackingResult,
  type AusPostWebhookPayload,
  type ShipmentRequest,
  
  // Label management
  generateReturnLabel,
  getActiveReturnLabel,
  cancelReturnLabel,
  regenerateReturnLabel,
  
  // Tracking
  trackReturn,
  verifyBottleReceived,
  getShipmentByTrackingNumber,
  
  // Webhooks
  handleTrackingWebhook,
} from '../shipping/auspost';

// ============================================================================
// RETURN WORKFLOW
// ============================================================================

export {
  // Types
  type RefillOrderResult,
  type BottleReturnResult,
  type InspectionResult,
  type RefillOrder,
  type RefillOrderStatus,
  
  // Order lifecycle
  initiateRefillOrder,
  processBottleReturn,
  manuallyMarkReturned,
  inspectReturnedBottle,
  completeRefillOrder,
  cancelRefillOrder,
  updateRefillOrderPricing,
  
  // Queries
  getCustomerRefillOrders,
  getRefillOrderById,
  getIncomingReturns,
  
  // Maintenance
  updateInTransitOrders,
} from './return-workflow';

// ============================================================================
// CREDIT SYSTEM
// ============================================================================

export {
  // Constants
  REFILL_CREDIT_AMOUNT,
  
  // Types
  type CreditTransaction,
  type CreditValidationResult,
  type CreditSummary,
  
  // Core functions
  processRefillCredit,
  useCredits,
  adjustCreditBalance,
  
  // Validation
  validateCreditUsage,
  
  // Queries
  getCreditHistory,
  getCreditSummary,
  getExpiringCredits,
  
  // Maintenance
  processExpiredCredits,
  
  // Admin
  transferCredits,
  getAllCreditBalances,
} from './credits';

// ============================================================================
// ELIGIBILITY ENGINE
// ============================================================================

export {
  // Constants
  getRefillRules,
  
  // Types
  type RefillEligibility,
  type Customer,
  
  // Eligibility checks
  isRefillUnlocked,
  checkRefillEligibility,
  checkBottleRefillEligibility,
  previewUnlockEligibility,
  
  // Customer management
  unlockRefillForCustomer,
  lockRefillForCustomer,
  
  // Pricing
  calculateFinalPrice,
  
  // Bulk operations
  getBulkEligibilityStatus,
  getPendingUnlocks,
} from './eligibility';

// ============================================================================
// CONSTANTS
// ============================================================================

export const REFILL_RULES = {
  // Customer must have purchased at least one 30ml bottle
  unlockRequirement: 'has-purchased-30ml',
  
  // Forever Bottles are 100ml only
  foreverBottleSize: '100ml',
  
  // ALL PRICES ARE INTEGER CENTS (AUD) — convert at display boundaries.
  // Mirrors REFILL_RULES in ./eligibility (single source: getRefillRules()).
  //
  // 2026-07-21: algorithm-driven refill pricing — NO flat refill price.
  // Prices are computed per-oil by ./pricing (cost-based engine); the only
  // money constant here is the bottle-return CREDIT.
  
  // Credit applied when bottle returned ($5.00)
  returnCreditAmount: 500,
  
  // Return label expires after 30 days
  labelExpiryDays: 30,
  
  // Credit expires after 12 months
  creditExpiryMonths: 12,
  
  // Maximum refills per bottle before mandatory retirement
  maxRefillCycles: 50,
  
  // Bottles inspected every 10 refills
  inspectionFrequency: 10,
} as const;

// ============================================================================
// REFILL PRICING (cost-based engine — integer cents)
// ============================================================================

export {
  getOilRefillPriceCents,
  getBlendRefillPriceCents,
  getCheapestOilRefillPriceCents,
  type RefillBlendRecipe,
} from './pricing';
