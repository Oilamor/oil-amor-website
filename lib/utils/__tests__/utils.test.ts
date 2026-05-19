/**
 * Utility Functions Unit Tests
 */

import { cn, formatPrice, formatDate, slugify, generateId, isClient, throttle, debounce } from '../../utils'

describe('Utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
      expect(cn('px-2', 'px-4')).toBe('px-4') // latter wins
    })

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', true && 'block')).toBe('base block')
    })

    it('handles undefined and null', () => {
      expect(cn('base', undefined, null)).toBe('base')
    })
  })

  describe('formatPrice', () => {
    it('formats AUD prices', () => {
      expect(formatPrice(45)).toBe('$45')
      expect(formatPrice(45.5)).toBe('$45.5')
      expect(formatPrice(45.99)).toBe('$45.99')
    })

    it('formats other currencies', () => {
      expect(formatPrice(100, 'USD')).toContain('100')
    })
  })

  describe('formatDate', () => {
    it('formats dates nicely', () => {
      const result = formatDate('2024-01-15')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })
  })

  describe('slugify', () => {
    it('converts strings to slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('Tea Tree Oil')).toBe('tea-tree-oil')
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
    })

    it('handles special characters', () => {
      expect(slugify('Lavender & Rose')).toBe('lavender-rose')
      expect(slugify('100% Pure')).toBe('100-pure')
    })
  })

  describe('generateId', () => {
    it('generates a non-empty string', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('generates unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('isClient', () => {
    it('returns true in jsdom test environment', () => {
      // jsdom defines window, so isClient returns true
      expect(isClient()).toBe(true)
    })
  })

  describe('throttle', () => {
    it('limits function calls', (done) => {
      let count = 0
      const fn = throttle(() => { count++ }, 50)
      
      fn()
      fn()
      fn()
      expect(count).toBe(1)
      
      setTimeout(() => {
        fn()
        expect(count).toBe(2)
        done()
      }, 60)
    })
  })

  describe('debounce', () => {
    it('delays function execution', (done) => {
      let count = 0
      const fn = debounce(() => { count++ }, 50)
      
      fn()
      fn()
      fn()
      expect(count).toBe(0)
      
      setTimeout(() => {
        expect(count).toBe(1)
        done()
      }, 80)
    })
  })
})
