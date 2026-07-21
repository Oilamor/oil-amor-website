/**
 * Jest Configuration
 * Unit and integration testing setup
 */

import type { Config } from 'jest'

const config: Config = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Transform
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Coverage
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/page.tsx',
    '!app/**/layout.tsx',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  // Coverage ratchet: thresholds sit just below the current actuals
  // (38.17% lines / 36.84% stmts / 30.71% branches / 27.84% funcs as of the
  // July 2026 hardening pass, up from 6.4%). CI now fails if coverage
  // regresses; raise these numbers as coverage grows — never lower them.
  // The remaining gap is mostly app/ UI surfaces (e.g. mixing-atelier).
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 27,
      lines: 38,
      statements: 36,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
  ],
  
  // Transform ESM modules
  transformIgnorePatterns: [
    '/node_modules/(?!(nanoid|uncrypto|@upstash/redis)/)',
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
}

export default config
