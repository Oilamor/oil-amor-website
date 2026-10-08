'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { LAUNCH_MODE } from '@/lib/content/launch-pricing'

const STORAGE_KEY = 'oilamor-launch-banner-dismissed'

/**
 * Site-wide launch announcement: 20% launch pricing + made-to-order honesty.
 * Rendered only while LAUNCH_MODE is on; dismissible per browser.
 */
export function LaunchBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(STORAGE_KEY)) setDismissed(false)
    } catch {
      setDismissed(false)
    }
  }, [])

  if (!LAUNCH_MODE || dismissed) return null

  return (
    // Sticky directly beneath the fixed h-20 navigation — on mobile this
    // keeps the bar (and its dismiss button) clear of the hamburger menu.
    <div className="sticky top-20 z-[999] bg-[#c9a227]/10 border-b border-[#c9a227]/30 text-[#f5e6c8]">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-center">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#c9a227]" />
        <p className="text-xs sm:text-sm font-medium">
          Launch offer — 20% off everything (refills excluded) · Every blend is
          made to order and ships within 2–4 weeks
        </p>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            try {
              sessionStorage.setItem(STORAGE_KEY, '1')
            } catch {
              // non-critical
            }
            setDismissed(true)
          }}
          className="shrink-0 -mr-2 p-2.5 rounded-full hover:bg-[#c9a227]/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
