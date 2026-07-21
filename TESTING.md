# Testing Guide

## Overview

Oil Amor uses a comprehensive testing strategy:

- **Unit Tests** - Jest + React Testing Library
- **E2E Tests** - Playwright
- **Coverage Target** - 70%+

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- consolidation.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific test
npx playwright test home.spec.ts

# Run on specific browser
npx playwright test --project=chromium
```

## Test Structure

```
├── app/
│   └── components/
│       └── __tests__/          # Component tests
├── lib/
│   ├── cart/
│   │   └── __tests__/          # Cart manager tests
│   └── utils/
│       └── __tests__/          # Utility tests
├── tests/
│   └── e2e/                    # Playwright E2E tests
│       ├── home.spec.ts
│       ├── cart.spec.ts
│       └── contact.spec.ts
└── lib/test-utils/             # Test utilities & mocks
```

## Writing Tests

### Unit Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
  
  it('handles click', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('add to cart', async ({ page }) => {
  await page.goto('/oils/lavender')
  await page.getByText('Add to Collection').click()
  await expect(page.getByText('Your Selection')).toBeVisible()
})
```

## Mock Data

Use `createMockCart()`, `createMockOil()`, `createMockCrystal()` from `lib/test-utils` for consistent test data.

## Coverage

Coverage reports are generated in `coverage/` directory. View HTML report:

```bash
open coverage/lcov-report/index.html
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

View test results in GitHub Actions tab.
