/**
 * Test Utilities
 * Mock data generators and testing helpers
 */

import { Cart, CartItem, CartSummary } from './cart/types'

// ============================================================================
// CART MOCKS
// ============================================================================

export function createMockCart(overrides: Partial<Cart> = {}): Cart {
  const now = new Date().toISOString()
  
  return {
    id: 'cart_test123',
    items: [],
    summary: createMockCartSummary(),
    subtotal: 0,
    taxTotal: 0,
    shippingEstimate: 0,
    discountTotal: 0,
    total: 0,
    currency: 'AUD',
    itemCount: 0,
    totalQuantity: 0,
    expiresAt: now,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    ...overrides,
  }
}

export function createMockCartItem(overrides: Partial<CartItem> = {}): CartItem {
  const now = new Date().toISOString()
  
  return {
    id: 'line_test123',
    variantId: 'variant_123456789',
    productId: 'product_987654321',
    name: 'Test Essential Oil',
    quantity: 1,
    unitPrice: 49.99,
    price: 49.99,
    currency: 'AUD',
    image: '/images/test-oil.jpg',
    configuration: {
      oilName: 'Lavender',
      crystalName: 'Amethyst',
      bottleSize: '10ml',
    },
    properties: {
      note: 'Test property',
    },
    addedAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createMockCartSummary(overrides: Partial<CartSummary> = {}): CartSummary {
  return {
    subtotal: 49.99,
    totalTax: 5.00,
    totalShipping: 10.00,
    totalDiscounts: 0,
    total: 64.99,
    currency: 'AUD',
    itemCount: 1,
    ...overrides,
  }
}

// ============================================================================
// MOCK REDIS DATA
// ============================================================================

export function createMockRedisCartData(cart: Partial<Cart> = {}): string {
  return JSON.stringify(createMockCart(cart))
}

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create a mock Request object for API testing
 */
export function createMockRequest(options: {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
} = {}): Request {
  const { method = 'GET', url = 'http://localhost:3000/api/test', body, headers = {} } = options
  
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Mock NextRequest for Next.js API route testing
 */
export function createMockNextRequest(options: {
  method?: string
  url?: string
  body?: unknown
  headers?: Record<string, string>
  ip?: string
} = {}): {
  method: string
  url: string
  headers: Headers
  json: () => Promise<unknown>
} {
  const { method = 'GET', url = 'http://localhost:3000/api/test', body, headers = {} } = options
  
  return {
    method,
    url,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as import('next/server').NextRequest
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Check if a string is a valid ISO 8601 date
 */
export function isValidISODate(date: string): boolean {
  const parsed = new Date(date)
  return !isNaN(parsed.getTime()) && parsed.toISOString() === date
}

/**
 * Check if a value is a valid cart ID
 */
export function isValidCartId(id: string): boolean {
  return id.startsWith('cart_') && id.length > 10
}

/**
 * Check if a value is a valid line item ID
 */
export function isValidLineId(id: string): boolean {
  return id.startsWith('line_') && id.length > 10
}
