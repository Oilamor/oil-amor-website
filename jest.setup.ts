/**
 * Jest Setup
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom'

// ============================================================================
// TEXT ENCODER/DECODER POLYFILL (for pg module)
// ============================================================================

import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// ============================================================================
// FETCH POLYFILL (for Shopify API client)
// ============================================================================

if (!global.fetch) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    headers: new Map(),
  })
  global.Request = jest.fn()
  global.Response = jest.fn() as unknown as typeof Response
  global.Headers = jest.fn()
}

// ============================================================================
// WINDOW MOCK
// ============================================================================

// matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
} as unknown as typeof IntersectionObserver

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// scrollTo mock
window.scrollTo = jest.fn()

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
process.env.SENTRY_DSN = 'https://test@sentry.io/123'
process.env.RESEND_API_KEY = 'test-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Mock ioredis
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
    flushdb: jest.fn(),
    flushall: jest.fn(),
  }));
  return {
    __esModule: true,
    default: mockRedis,
    Redis: mockRedis,
  };
})

// Mock @upstash/redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn(),
    lpush: jest.fn(),
    rpop: jest.fn(),
    llen: jest.fn(),
    lrange: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    zrangebyscore: jest.fn(),
    zremrangebyscore: jest.fn(),
    zcard: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    keys: jest.fn(),
    flushdb: jest.fn(),
    pipeline: jest.fn(() => ({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  })),
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((cb) => cb({ setTag: jest.fn(), setContext: jest.fn() })),
  browserProfilingIntegration: jest.fn(),
  replayIntegration: jest.fn(),
  breadcrumbsIntegration: jest.fn(),
  globalHandlersIntegration: jest.fn(),
}))

// Mock logger
jest.mock('@/lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))
