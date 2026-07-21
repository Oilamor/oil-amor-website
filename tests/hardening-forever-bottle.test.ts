/**
 * Hardening: Forever Bottle serial numbers (lib/refill/forever-bottle.ts)
 *
 * Regression tests for the 2026-07-21 fix: generateSerialNumber stripped
 * '-' and '_' from nanoid(6), so ~9% of serials came out shorter than 6
 * characters and failed the module's own isValidSerialNumber. The
 * generator must now always produce serials the validator accepts.
 */

// db and next/cache are imported by the module under test but are not used
// by the serial generator — mock them so the import has no side effects.
jest.mock('@/lib/db', () => ({ db: {} }))
jest.mock('next/cache', () => ({ revalidateTag: jest.fn() }))

const mockNanoid = jest.fn()
jest.mock('nanoid', () => ({
  nanoid: (...args: unknown[]) => mockNanoid(...args),
}))

import { generateSerialNumber, isValidSerialNumber } from '@/lib/refill/forever-bottle'

beforeEach(() => {
  mockNanoid.mockReset()
})

describe('generateSerialNumber', () => {
  it('produces validator-accepted serials across many draws of the real alphabet', () => {
    // Simulate nanoid's real 64-char URL alphabet — '-' and '_' included,
    // which is what made ~9% of serials come out short before the fix.
    // (The real nanoid package is ESM and cannot be loaded by jest here.)
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    mockNanoid.mockImplementation((size: number = 21) =>
      Array.from({ length: size }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
    )
    for (let i = 0; i < 500; i++) {
      expect(isValidSerialNumber(generateSerialNumber())).toBe(true)
    }
  })

  it('keeps drawing when nanoid returns only strippable characters', () => {
    mockNanoid
      .mockReturnValueOnce('------')
      .mockReturnValueOnce('______')
      .mockReturnValueOnce('a1b2c3')
    expect(generateSerialNumber()).toBe('FA-A1B2C3')
    expect(mockNanoid).toHaveBeenCalledTimes(3)
  })

  it('collects valid characters across draws and truncates to exactly 6', () => {
    mockNanoid
      .mockReturnValueOnce('ab-_cd')
      .mockReturnValueOnce('efghij')
    expect(generateSerialNumber()).toBe('FA-ABCDEF')
  })
})

describe('isValidSerialNumber', () => {
  it('accepts the canonical format and rejects short/long/lowercase/malformed', () => {
    expect(isValidSerialNumber('FA-A3F9K2')).toBe(true)
    expect(isValidSerialNumber('FA-A3F9')).toBe(false) // short — the old bug's output shape
    expect(isValidSerialNumber('FA-A3F9K2Z')).toBe(false)
    expect(isValidSerialNumber('FA-a3f9k2')).toBe(false)
    expect(isValidSerialNumber('A3F9K2')).toBe(false)
    expect(isValidSerialNumber('FA-A3F9-2')).toBe(false)
  })
})
