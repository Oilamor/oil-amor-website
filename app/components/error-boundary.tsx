/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly fallback UI
 */

'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from './ui/Button'
import { logger } from '@/lib/logging/logger'

// ============================================================================
// ERROR BOUNDARY PROPS & STATE
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnChange?: unknown[]
  sectionName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

// ============================================================================
// ERROR FALLBACK UI
// ============================================================================

function DefaultErrorFallback({
  error,
  errorId,
  onReset,
  sectionName,
}: {
  error: Error
  errorId: string | null
  onReset: () => void
  sectionName?: string
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#c9a227]/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#c9a227]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl text-[#f5f3ef] mb-3">
          Something went wrong
        </h2>

        {/* Description */}
        <p className="text-[#a69b8a] mb-6 leading-relaxed">
          {sectionName ? (
            <>We encountered an issue loading the {sectionName}. Please try again.</>
          ) : (
            <>We encountered an unexpected issue. Our team has been notified and we&apos;re working on a fix.</>
          )}
        </p>

        {/* Error ID */}
        {errorId && (
          <div className="mb-6 p-3 bg-[#1c181f] rounded-lg">
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a] block mb-1">
              Error Reference
            </span>
            <code className="text-[#c9a227] text-sm font-mono">{errorId}</code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onReset} variant="gold">
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Return Home
          </Button>
        </div>

        {/* Support link */}
        <p className="mt-6 text-[0.75rem] text-[#a69b8a]">
          If this problem persists, please{' '}
          <a
            href="/contact"
            className="text-[#c9a227] hover:underline"
          >
            contact our support team
          </a>
          {errorId && ` and reference error code: ${errorId}`}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID().slice(0, 8).toUpperCase(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate error ID
    const errorId = this.state.errorId || crypto.randomUUID().slice(0, 8).toUpperCase()
    
    // Update state with error info
    this.setState({ errorInfo })

    // Log to Sentry with scope
    Sentry.withScope((scope) => {
      scope.setTag('error_boundary', 'true')
      scope.setTag('error_id', errorId)
      
      if (this.props.sectionName) {
        scope.setTag('section', this.props.sectionName)
      }

      scope.setContext('error_boundary', {
        errorId,
        componentStack: errorInfo.componentStack,
        section: this.props.sectionName,
      })

      Sentry.captureException(error)
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('ErrorBoundary caught an error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when resetOnChange dependencies change
    if (this.state.hasError && this.props.resetOnChange) {
      const hasChanged = this.props.resetOnChange.some(
        (dep, i) => dep !== prevProps.resetOnChange?.[i]
      )
      
      if (hasChanged) {
        this.resetErrorBoundary()
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          onReset={this.resetErrorBoundary}
          sectionName={this.props.sectionName}
        />
      )
    }

    return this.props.children
  }
}

// ============================================================================
// GLOBAL ERROR HANDLER (App Router)
// ============================================================================

'use client'

export function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log to Sentry
  Sentry.captureException(error)

  return (
    <html lang="en">
      <body className="bg-[#0a080c] text-[#f5f3ef]">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-[#c9a227]/10 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-[#c9a227]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="font-display text-3xl text-[#f5f3ef] mb-4">
              Application Error
            </h1>

            <p className="text-[#a69b8a] mb-6 leading-relaxed">
              A critical error has occurred. Our team has been automatically notified.
            </p>

            {error.digest && (
              <div className="mb-6 p-3 bg-[#1c181f] rounded-lg">
                <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[#a69b8a] block mb-1">
                  Error Reference
                </span>
                <code className="text-[#c9a227] text-sm font-mono">{error.digest}</code>
              </div>
            )}

            <button
              onClick={reset}
              className="btn-luxury"
            >
              Try Again
            </button>

            <p className="mt-6 text-[0.75rem] text-[#a69b8a]">
              If the problem persists, please{' '}
              <a href="/contact" className="text-[#c9a227] hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

// ============================================================================
// ASYNC ERROR BOUNDARY HOOK
// ============================================================================

import { useEffect, useState } from 'react'

export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (error) {
      Sentry.captureException(error)
    }
  }, [error])

  const handleError = (err: Error) => {
    setError(err)
  }

  const clearError = () => {
    setError(null)
  }

  return { error, handleError, clearError }
}
