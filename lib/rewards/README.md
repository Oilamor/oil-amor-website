# Crystal Circle Rewards System

A gamified loyalty system for Oil Amor that makes customers feel like they're progressing through a sacred journey.

## Overview

The Crystal Circle rewards system features:

- **5 Tier Progression**: Seed → Sprout → Bloom → Radiance → Luminary
- **Chain Unlock System**: Silver → Gold → Sterling → 14k Gold-filled
- **Charm Collection**: Collectible charms unlocked via purchases and tier achievements
- **Account Credit Management**: $5 refill returns and spend tracking

## Tier Structure

| Tier | Min Spend | Key Benefits |
|------|-----------|--------------|
| Seed | $0 | Standard shipping, member pricing |
| Sprout | $150 | Free shipping, Silver chain unlocked |
| Bloom | $350 | Gold chain, free charm every 3rd purchase |
| Radiance | $700 | Sterling chain, quarterly crystal box, 10% off refills |
| Luminary | $1500 | 14k gold-filled chain, 15% off refills, annual retreat |

## Quick Start

```typescript
import {
  getCustomerRewardsProfile,
  updateCustomerSpend,
  calculateTier,
  CRYSTAL_CIRCLE_TIERS
} from './rewards';

// Get customer profile
const profile = await getCustomerRewardsProfile('customer-id');

// Process an order
const result = await updateCustomerSpend('customer-id', {
  orderId: 'order-123',
  orderTotal: 150,
  items: [...],
  isRefill: false
});

// Check if tier upgraded
if (result.tierUpgraded) {
  console.log(`Customer upgraded to ${result.profile.currentTier}!`);
}
```

## File Structure

```
lib/rewards/
├── index.ts                    # Main exports
├── tiers.ts                    # Tier configuration & calculations
├── customer-rewards.ts         # Profile management & spend tracking
├── chain-system.ts             # Chain catalog & availability
├── charm-system.ts             # Charm collection & unlocking
├── notifications.ts            # Email & in-app notifications
├── rewards-store.ts            # Redis-backed persistent storage for rewards data
└── README.md                   # This file
```

## Integration Points

### Redis
- Persistent rewards data storage (no TTL)
- Profile caching with 1 hour TTL
- Real-time tier lookups

### Klaviyo
- Tier upgrade emails
- Charm unlock notifications
- Birthday gift reminders
- Quarterly box notifications

### Redis
- Profile caching (1 hour TTL)
- Real-time tier lookups

### Sanity
- Persistent profile storage
- Credit transaction history
- Activity logs

## Environment Variables

```bash
# Sanity
SANITY_PROJECT_ID=xxx
SANITY_DATASET=production
SANITY_API_TOKEN=xxx

# Redis (Upstash REST — primary storage for rewards data)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Klaviyo
KLAVIYO_PUBLIC_API_KEY=xxx
KLAVIYO_PRIVATE_API_KEY=xxx
```

## Testing

```bash
# Run rewards system tests
npm test -- rewards

# Run specific test file
npm test -- tiers.test.ts
```

## API Reference

See individual file documentation for detailed API information:
- [tiers.ts](./tiers.ts) - Tier calculations
- [customer-rewards.ts](./customer-rewards.ts) - Profile management
- [chain-system.ts](./chain-system.ts) - Chain system
- [charm-system.ts](./charm-system.ts) - Charm collection
