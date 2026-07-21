# Oil Amor Test Suite

Comprehensive testing suite for the Oil Amor e-commerce platform covering integration tests, E2E tests, performance tests, load tests, and contract tests.

## Test Structure

```
tests/
├── integration/           # Integration tests
│   ├── configurator-rewards.test.ts
│   ├── refill-rewards.test.ts
│   ├── shopify-content.test.ts
│   └── full-journey.test.ts
├── e2e/                   # End-to-end tests (Playwright)
│   ├── product-configuration.spec.ts
│   ├── checkout-flow.spec.ts
│   └── refill-circle.spec.ts
├── performance/           # Performance benchmarks
│   ├── configurator.perf.ts
│   └── api.perf.ts
├── load/                  # Load tests
│   └── cart-transformation.load.ts
├── contracts/             # API contract tests
│   └── shopify-api.contract.ts
├── utils/                 # Test utilities
│   ├── test-data.ts
│   └── setup.ts
└── README.md
```

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- configurator-rewards.test.ts

# Run in watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm test -- tests/integration/full-journey.test.ts
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/checkout-flow.spec.ts

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (visible browser)
npx playwright test --headed
```

### Performance Tests

```bash
# Run performance benchmarks
npm run test:performance

# Run with detailed metrics
npm run test:performance -- --verbose
```

### Load Tests

```bash
# Run load tests
npm run test:load

# Run with custom concurrency
npm run test:load -- --concurrency=200
```

### Contract Tests

```bash
# Run contract tests
npm run test:contracts
```

## Test Coverage

### Coverage Targets

| Category | Target |
|----------|--------|
| Unit Tests | 80%+ |
| Integration Tests | 70%+ |
| E2E Tests | Critical paths |
| Performance | All benchmarks pass |
| Load | 100 concurrent users |

### View Coverage Report

```bash
npm run test:coverage
# Then open coverage/lcov-report/index.html
```

## Test Data

Test data factories are located in `tests/utils/test-data.ts`. Use these to create consistent mock data:

```typescript
import { 
  createMockCustomer,
  createMockOrder,
  createMockForeverBottle,
  createMockConfiguredProduct,
} from './utils/test-data';

const customer = createMockCustomer({ tier: 'sprout', totalSpend: 150 });
const order = createMockOrder({ orderTotal: 89.99 });
const bottle = createMockForeverBottle({ status: 'empty' });
```

## Environment Variables

Create a `.env.test` file for test-specific environment variables:

```env
# Test Database
TEST_DATABASE_URL=postgresql://localhost:5432/oil_amor_test

# Test Redis (Upstash REST — mocked in jest.setup.ts for unit/integration runs)
UPSTASH_REDIS_REST_URL=https://test.upstash.io
UPSTASH_REDIS_REST_TOKEN=test-token

# Shopify Test Store
SHOPIFY_TEST_STORE_DOMAIN=test-store.myshopify.com
SHOPIFY_TEST_STOREFRONT_TOKEN=test_token
SHOPIFY_TEST_ADMIN_TOKEN=admin_token

# AusPost Test API
AUSPOST_TEST_API_KEY=test_key
AUSPOST_TEST_API_SECRET=test_secret

# Test Base URL
TEST_BASE_URL=http://localhost:3000
```

## Writing Tests

### Integration Test Example

```typescript
import { describe, it, expect } from '@jest/globals';
import { updateCustomerSpend } from '@/lib/rewards/customer-rewards';
import { createMockCustomer, createMockOrder } from '../utils/test-data';

describe('Customer Rewards Integration', () => {
  it('should upgrade tier on qualifying purchase', async () => {
    const customer = createMockCustomer({ tier: 'seed', totalSpend: 0 });
    const order = createMockOrder({ orderTotal: 150 });
    
    const result = await updateCustomerSpend(customer.customerId, order);
    
    expect(result.tierUpgraded).toBe(true);
    expect(result.profile.currentTier).toBe('sprout');
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should complete checkout flow', async ({ page }) => {
  await page.goto('/oil/lavender-essential-oil');
  
  // Configure product
  await page.click('[data-testid="crystal-option-amethyst"]');
  await page.click('[data-testid="add-to-cart-button"]');
  
  // Verify cart
  await page.goto('/cart');
  await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
});
```

## CI/CD Integration

Tests are configured to run in GitHub Actions on every pull request:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:integration
      - run: npx playwright install
      - run: npm run test:e2e
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in jest.config.ts or playwright.config.ts
2. **Database connection errors**: Ensure test database is running
3. **Redis connection errors**: Ensure Redis is running on port 6379
4. **Playwright browser not found**: Run `npx playwright install`

### Debug Mode

```bash
# Jest debug
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debug
PWDEBUG=1 npx playwright test
```

## Contributing

When adding new tests:

1. Place tests in the appropriate directory
2. Use test data factories for consistency
3. Follow naming conventions: `*.test.ts` for unit/integration, `*.spec.ts` for E2E
4. Ensure tests are independent and can run in parallel
5. Add performance benchmarks for critical paths
6. Update this README with new test categories
