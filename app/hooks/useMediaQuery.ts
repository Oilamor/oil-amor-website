/**
 * useMediaQuery Hook
 * Responsive design hook for detecting viewport size changes
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { BREAKPOINTS } from '@/app/lib/constants'
// Define device mode type locally
export type DeviceMode = 'mobile' | 'tablet' | 'desktop'

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)
    
    // Set initial value
    setMatches(media.matches)

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    media.addEventListener('change', listener)

    // Cleanup
    return () => {
      media.removeEventListener('change', listener)
    }
  }, [query])

  return matches
}

/**
 * Hook to get current device mode (mobile, tablet, desktop)
 * @returns Current DeviceMode
 */
export function useViewMode(): DeviceMode {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.mobile}px)`)
  const isTablet = useMediaQuery(`(max-width: ${BREAKPOINTS.tablet}px)`)

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}

/**
 * Hook to detect if device is touch-enabled
 * @returns boolean
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    setIsTouch(
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0
    )
  }, [])

  return isTouch
}

/**
 * Hook to debounce a value
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for intersection observer
 * @param options - IntersectionObserver options
 * @returns Ref callback and intersection state
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [(node: Element | null) => void, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [observer, setObserver] = useState<IntersectionObserver | null>(null)

  const refCallback = useCallback((node: Element | null) => {
    if (observer) {
      observer.disconnect()
    }

    if (node) {
      const newObserver = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry.isIntersecting)
        },
        { threshold: 0.1, ...options }
      )
      newObserver.observe(node)
      setObserver(newObserver)
    }
  }, [options, observer])

  useEffect(() => {
    return () => {
      if (observer) {
        observer.disconnect()
      }
    }
  }, [observer])

  return [refCallback, isIntersecting]
}
