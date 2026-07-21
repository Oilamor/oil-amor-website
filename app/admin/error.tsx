'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logging/logger'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Admin segment error boundary error', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a080c] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <span className="text-6xl text-[#c9a227] mb-6 block">◈</span>
        <h1 className="font-display text-4xl text-[#f5f3ef] mb-4">
          Something went wrong
        </h1>
        <p className="text-[#a69b8a] mb-8">
          The admin console hit an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#c9a227] text-[#0a080c] text-sm uppercase tracking-wide hover:bg-[#f5e6c8] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
