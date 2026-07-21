/**
 * Hardening: lib/utils.ts + lib/utils/type-guards.ts
 *
 * Covers the utilities NOT already pinned by lib/utils/__tests__/utils.test.ts
 * and tests/site-url.test.ts: edge cases for cn/formatPrice/formatDate/slugify/
 * truncateText/generateId/throttle/debounce plus every type guard.
 */

import {
  cn,
  formatPrice,
  formatDate,
  slugify,
  generateId,
  truncateText,
  throttle,
  debounce,
  isTouchDevice,
  prefersReducedMotion,
} from '@/lib/utils'
import {
  isString,
  isNumber,
  isObject,
  isDefined,
  isCart,
  isCartItem,
  isOil,
  isCrystal,
  isValidEmail,
} from '@/lib/utils/type-guards'

describe('cn (class merging)', () => {
  it('merges arrays and nested conditional objects', () => {
    expect(cn(['px-2', 'py-1'], { hidden: false, block: true })).toBe('px-2 py-1 block')
  })

  it('resolves tailwind conflicts keeping the last utility', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2')
    expect(cn('px-2', 'p-4')).toBe('p-4')
  })

  it('returns an empty string for no usable input', () => {
    expect(cn()).toBe('')
    expect(cn('', undefined, null, false)).toBe('')
  })

  it('deduplicates repeated classes', () => {
    expect(cn('px-2', 'px-2')).toBe('px-2')
  })
})

describe('formatPrice (Intl, dollars — not cents)', () => {
  it('formats zero and integers without forced decimals', () => {
    expect(formatPrice(0)).toBe('$0')
    expect(formatPrice(45)).toBe('$45')
  })

  it('keeps up to two decimals and rounds beyond that', () => {
    expect(formatPrice(45.5)).toBe('$45.5')
    expect(formatPrice(45.99)).toBe('$45.99')
    expect(formatPrice(45.999)).toBe('$46')
  })

  it('formats negative amounts', () => {
    expect(formatPrice(-10.5)).toContain('10.5')
    expect(formatPrice(-10.5)).toContain('-')
  })

  it('honours the currency argument', () => {
    expect(formatPrice(100, 'USD')).toContain('100')
  })
})

describe('formatDate', () => {
  it('accepts Date instances', () => {
    const result = formatDate(new Date(2024, 0, 15))
    expect(result).toContain('15')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  it('formats ISO strings', () => {
    expect(formatDate('2024-12-25T00:00:00Z')).toContain('2024')
  })

  it('throws a RangeError for unparseable input (does not silently render garbage)', () => {
    expect(() => formatDate('not-a-date')).toThrow(RangeError)
  })
})

describe('slugify edge cases', () => {
  it.each([
    ['', ''],
    ['!!!', ''],
    ['   ', ''],
    ['--already--slugged--', 'already-slugged'],
    ['a---b', 'a-b'],
    ['UPPER CASE', 'upper-case'],
    ['dots.and,commas', 'dots-and-commas'],
    ['Café au lait', 'caf-au-lait'],
    ['100% Pure & Natural', '100-pure-natural'],
    ['oils/blends', 'oils-blends'],
  ])('slugify(%j) = %j', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it('output is always URL-safe for arbitrary input', () => {
    const inputs = ['Tea Tree Oil!', '  weird\tspacing\n', 'emoji 😀 test', '___']
    for (const input of inputs) {
      expect(slugify(input)).toMatch(/^[a-z0-9-]*$/)
    }
  })
})

describe('truncateText', () => {
  it('returns text unchanged at or below the limit', () => {
    expect(truncateText('hello', 5)).toBe('hello')
    expect(truncateText('hi', 10)).toBe('hi')
  })

  it('truncates with ellipsis above the limit', () => {
    expect(truncateText('hello world', 5)).toBe('hello...')
  })

  it('trims trailing whitespace before appending the ellipsis', () => {
    expect(truncateText('hello world', 6)).toBe('hello...')
  })

  it('handles empty strings and zero limit', () => {
    expect(truncateText('', 5)).toBe('')
    expect(truncateText('abc', 0)).toBe('...')
  })
})

describe('generateId', () => {
  it('produces lowercase alphanumeric ids of bounded length', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]+$/)
      expect(id.length).toBeLessThanOrEqual(13)
      expect(id.length).toBeGreaterThan(0)
    }
  })

  it('produces distinct ids across a batch', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('throttle (fake timers)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('fires on the leading edge and suppresses calls within the window', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    throttled('b')
    throttled('c')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('allows the next call after the window passes', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)
    throttled()
    jest.advanceTimersByTime(100)
    throttled()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not fire trailing calls (trailing invocation is dropped)', () => {
    const fn = jest.fn()
    const throttled = throttle(fn, 100)
    throttled()
    throttled()
    jest.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('debounce (fake timers)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('collapses bursts into a single trailing call with the last args', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    debounced('c')
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('resets the timer on each call', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)
    debounced()
    jest.advanceTimersByTime(90)
    debounced()
    jest.advanceTimersByTime(90)
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(10)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('supports separate invocations after quiet periods', () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 100)
    debounced()
    jest.advanceTimersByTime(100)
    debounced()
    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('environment probes in jsdom', () => {
  it('isTouchDevice is false without touch support', () => {
    expect(isTouchDevice()).toBe(false)
  })

  it('prefersReducedMotion reflects the matchMedia mock (no reduction)', () => {
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('type guards: primitives', () => {
  it.each([
    ['x', true],
    ['', true],
    [1, false],
    [null, false],
    [undefined, false],
    [{}, false],
  ])('isString(%j) = %s', (value, expected) => {
    expect(isString(value)).toBe(expected)
  })

  it.each([
    [1, true],
    [0, true],
    [-3.14, true],
    [NaN, false],
    ['1', false],
    [Infinity, true],
    [null, false],
  ])('isNumber(%j) = %s', (value, expected) => {
    expect(isNumber(value)).toBe(expected)
  })

  it('isObject rejects arrays, null and primitives', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
    expect(isObject([])).toBe(false)
    expect(isObject(null)).toBe(false)
    expect(isObject('obj')).toBe(false)
    expect(isObject(42)).toBe(false)
  })

  it('isDefined rejects only null and undefined', () => {
    expect(isDefined(0)).toBe(true)
    expect(isDefined('')).toBe(true)
    expect(isDefined(false)).toBe(true)
    expect(isDefined(null)).toBe(false)
    expect(isDefined(undefined)).toBe(false)
  })
})

describe('type guards: domain shapes', () => {
  it('isCart requires id, items array and summary object', () => {
    expect(isCart({ id: 'c1', items: [], summary: {} })).toBe(true)
    expect(isCart({ id: 'c1', items: [] })).toBe(false)
    expect(isCart({ id: 'c1', items: {}, summary: {} })).toBe(false)
    expect(isCart({ items: [], summary: {} })).toBe(false)
    expect(isCart(null)).toBe(false)
    expect(isCart('cart')).toBe(false)
  })

  it('isCartItem requires id, variantId and quantity', () => {
    expect(isCartItem({ id: 'i1', variantId: 'v1', quantity: 2 })).toBe(true)
    expect(isCartItem({ id: 'i1', variantId: 'v1', quantity: '2' })).toBe(false)
    expect(isCartItem({ id: 'i1', quantity: 2 })).toBe(false)
    expect(isCartItem([])).toBe(false)
  })

  it('isOil requires id, slug and name strings', () => {
    expect(isOil({ id: 'lavender', slug: 'lavender-essential-oil', name: 'Lavender' })).toBe(true)
    expect(isOil({ id: 'lavender', slug: 'x' })).toBe(false)
    expect(isOil({ id: 1, slug: 'x', name: 'n' })).toBe(false)
    expect(isOil(undefined)).toBe(false)
  })

  it('isCrystal requires id, slug and name strings', () => {
    expect(isCrystal({ id: 'amethyst', slug: 'amethyst', name: 'Amethyst' })).toBe(true)
    expect(isCrystal({ id: 'amethyst', name: 'Amethyst' })).toBe(false)
    expect(isCrystal({})).toBe(false)
  })
})

describe('isValidEmail', () => {
  it.each([
    'sam@example.com',
    'a.b+tag@sub.domain.co',
    'x@y.zz',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each([
    '',
    'not-an-email',
    'missing@tld',
    '@no-local.com',
    'spaces in@address.com',
    'double@@at.com',
  ])('rejects %j', (email) => {
    expect(isValidEmail(email)).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isValidEmail(undefined)).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(42)).toBe(false)
    expect(isValidEmail({})).toBe(false)
  })
})
