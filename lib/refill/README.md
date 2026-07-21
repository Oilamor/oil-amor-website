# Oil Amor Forever Bottle Refill System

A comprehensive logistics and financial engine for Australia's most sustainable essential oil refill program.

## Overview

The Forever Bottle refill system enables customers to return empty 100ml bottles for refilling at a discounted price, earning $5 store credit for each return. This creates a closed-loop system that reduces waste and rewards sustainable behavior.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│  RefillDashboard.tsx    - Main dashboard for customers          │
│  ForeverBottleCard.tsx  - Individual bottle management          │
│  OrderRefillModal.tsx   - Refill ordering flow                  │
│  ReturnTrackingCard.tsx - Shipment tracking display             │
│  EnvironmentalImpactStats.tsx - Sustainability metrics          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  forever-bottle.ts      - Bottle lifecycle management           │
│  return-workflow.ts     - End-to-end refill orchestration       │
│  credits.ts             - Store credit system                   │
│  eligibility.ts         - Program access control                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  auspost.ts             - Australia Post shipping integration   │
│  shopify-order.ts       - Order processing webhooks             │
│  auspost-tracking.ts    - Tracking webhook handler              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN INTERFACE                            │
├─────────────────────────────────────────────────────────────────┤
│  page.tsx               - Admin dashboard                       │
│  BottleInspectionForm.tsx - Warehouse inspection workflow       │
└─────────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Forever Bottle Registration
- Automatic registration when purchasing a 100ml Forever Bottle
- Unique serial number generation (FA-XXXXXX format)
- Tracks purchase metadata and oil type

### 2. Australia Post Integration
- Prepaid return label generation
- Real-time tracking via webhooks
- Automatic delivery confirmation

### 3. Credit System
- $5 AUD credit per returned bottle
- Credits expire after 12 months
- Automatic application on successful return
- Credit usage for refill purchases

### 4. Eligibility Engine
- Program unlock: Requires 30ml bottle purchase
- Bottle eligibility checks
- Pricing calculation with credit application

### 5. Refill Workflow
```
Order Refill → Generate Label → Customer Ships → 
We Receive → Inspect → Refill → Return to Customer
```

## Business Rules

```typescript
const REFILL_RULES = {
  // Unlock requirements
  unlockRequirement: 'has-purchased-30ml',
  
  // Bottle specifications
  foreverBottleSize: '100ml',
  
  // Pricing (integer cents AUD — divide by 100 for display)
  // 2026-07-21: algorithm-driven refill pricing — there is NO flat refill
  // price. Every refill price is computed per-oil by lib/refill/pricing
  // (cost-based engine: wholesale oil cost / margin divisor + bottle buffer
  // × 1.25 + labor / divisor, rounded to .95). Examples (100ml pure):
  // lavender 3095 ($30.95), myrrh 17895 ($178.95).
  returnCreditAmount: 500,      // $5.00 bottle-return CREDIT (not a price)
  
  // Time limits
  labelExpiryDays: 30,
  creditExpiryMonths: 12,
  
  // Bottle lifecycle
  maxRefillCycles: 50,
  inspectionFrequency: 10,
};
```

## Database Schema

See `lib/db/schema-refill.ts` for complete schema definitions.

### Key Tables

| Table | Purpose |
|-------|---------|
| `forever_bottles` | Master record of all Forever Bottles |
| `refill_orders` | Tracks refill workflow state |
| `credit_transactions` | Audit trail of all credit movements |
| `auspost_shipments` | Shipping label and tracking data |
| `forever_bottle_history` | Event log for audit trail |

## API Endpoints

### Webhooks
- `POST /api/webhooks/shopify-order` - Process new orders
- `POST /api/webhooks/auspost-tracking` - Handle tracking updates

### Customer API
- `GET /api/refill/dashboard` - Get customer dashboard data
- `POST /api/refill/order` - Create refill order
- `GET /api/refill/tracking` - Get tracking information
- `GET /api/refill/credits` - Get credit history

### Admin API
- `GET /api/admin/refill/incoming` - Incoming returns queue
- `GET /api/admin/refill/inspecting` - Bottles under inspection
- `POST /api/admin/refill/inspect` - Submit inspection
- `POST /api/admin/refill/complete` - Complete refill order
- `GET /api/admin/refill/analytics` - Program analytics

## Environment Variables

```env
# Australia Post
AUSPOST_API_KEY=your_api_key
AUSPOST_API_SECRET=your_api_secret
AUSPOST_ACCOUNT_NUMBER=your_account_number
AUSPOST_API_BASE=https://digitalapi.auspost.com.au/shipping/v1
AUSPOST_WEBHOOK_SECRET=your_webhook_secret

# Shopify
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

## Usage Examples

### Register a New Bottle
```typescript
import { registerForeverBottle } from '@/lib/refill';

const bottle = await registerForeverBottle({
  customerId: 'cust_123',
  oilType: 'lavender',
  orderId: 'order_456',
  productVariantId: 'var_789',
  purchasePrice: 45.00,
});
```

### Check Eligibility
```typescript
import { checkRefillEligibility } from '@/lib/refill';

const eligibility = await checkRefillEligibility('cust_123', 'lavender');

if (eligibility.canRefill) {
  console.log('Available bottles:', eligibility.availableBottles);
  console.log('Pricing:', eligibility.pricing);
}
```

### Initiate Refill Order
```typescript
import { initiateRefillOrder } from '@/lib/refill';

const result = await initiateRefillOrder('cust_123', 'bottle_id', {
  customerAddress: {
    name: 'Jane Smith',
    addressLine1: '123 Main St',
    city: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    country: 'AU',
  },
});

console.log('Tracking:', result.returnLabel.trackingNumber);
```

### Process Inspection
```typescript
import { inspectReturnedBottle } from '@/lib/refill';

const inspection = await inspectReturnedBottle('bottle_id', {
  cracks: false,
  chips: false,
  labelCondition: 'good',
  capCondition: 'good',
  cleanliness: 'clean',
  inspectorId: 'admin_123',
});

if (inspection.canRefill) {
  console.log('Credit will be applied automatically');
}
```

## Scheduled Jobs

The following cron jobs should be configured:

1. **Credit Expiration** (Daily at 2 AM)
   ```
   Run: processExpiredCredits()
   Purpose: Mark expired credits as expired
   ```

2. **Tracking Updates** (Every 30 minutes)
   ```
   Run: updateInTransitOrders()
   Purpose: Check status of in-transit shipments
   ```

3. **Label Expiration** (Daily at 3 AM)
   ```
   Run: Cancel expired return labels
   Purpose: Clean up unused labels
   ```

## Testing

### Development Mode
When `NODE_ENV=development`, the Australia Post integration uses simulated responses:
- Mock tracking numbers generated
- Simulated tracking events
- No actual API calls made

### Test Data
```typescript
// Example test bottle
const testBottle = {
  id: 'test_bottle_1',
  serialNumber: 'FA-TEST01',
  oilType: 'lavender',
  capacity: '100ml',
  status: 'active',
  currentFillLevel: 25,
  refillCount: 3,
};
```

## Security Considerations

1. **Webhook Verification**: All webhooks verify HMAC signatures
2. **Customer Isolation**: Customers can only access their own data
3. **Credit Protection**: Credits can only be applied after physical verification
4. **Audit Trail**: All actions logged with timestamps and user IDs

## Error Handling

The system uses typed errors for common scenarios:

```typescript
type RefillError =
  | 'BOTTLE_NOT_FOUND'
  | 'BOTTLE_NOT_ELIGIBLE'
  | 'INSUFFICIENT_CREDIT'
  | 'LABEL_GENERATION_FAILED'
  | 'TRACKING_NOT_FOUND'
  | 'ALREADY_PROCESSED';
```

## Contributing

When adding new features:

1. Update the relevant module in `lib/refill/`
2. Add database migrations if schema changes
3. Update this README
4. Add tests for new functionality
5. Update the admin interface if needed

## License

Private - Oil Amor Pty Ltd
