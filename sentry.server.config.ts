/**
 * Sentry Server Configuration
 * Error tracking and performance monitoring for the server
 */

import * as Sentry from '@sentry/nextjs'
import { close } from '@sentry/node'

// ============================================================================
// SENTRY SERVER INITIALIZATION
// ============================================================================

Sentry.init({
  // DSN from environment
  dsn: process.env.SENTRY_DSN,

  // Environment
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version,

  // ==========================================================================
  // ERROR TRACKING
  // ==========================================================================

  beforeSend(event) {
    // Filter out specific errors
    if (event.exception?.values?.[0]) {
      const errorMessage = event.exception.values[0].value || ''

      // Ignore specific non-actionable errors
      const ignoredErrors = [
        'Network Error',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
      ]

      if (ignoredErrors.some(msg => errorMessage.includes(msg))) {
        return null
      }
    }

    // Sanitize sensitive data
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
        delete event.request.headers['X-API-Key']
        delete event.request.headers['X-Admin-API-Key']
      }

      // Mask sensitive query params
      const req = event.request as any
      if (req.query_string) {
        if (typeof req.query_string === 'string') {
          req.query_string = req.query_string.replace(
            /(token|password|secret|key)=([^&]+)/gi,
            '$1=[REDACTED]'
          )
        }
      }
    }

    // Add server context
    event.tags = {
      ...event.tags,
      runtime: 'server',
    }

    return event
  },

  // ==========================================================================
  // PERFORMANCE MONITORING
  // ==========================================================================

  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),

  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '1.0'),

  // ==========================================================================
  // DEBUG & DEVELOPMENT
  // ==========================================================================

  debug: process.env.NODE_ENV === 'development',
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // ==========================================================================
  // CONTEXT
  // ==========================================================================

  initialScope: {
    tags: {
      app: 'oil-amor',
      tier: 'tier-1',
    },
  },
})

// ============================================================================
// CUSTOM SERVER ERROR HANDLING
// ============================================================================

// Capture unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  Sentry.withScope((scope) => {
    scope.setContext('promise', {
      reason: reason instanceof Error ? reason.message : String(reason),
    })
    scope.setTag('error_type', 'unhandled_rejection')
    Sentry.captureException(reason)
  })
})

// Capture uncaught exceptions
process.on('uncaughtException', (error) => {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'uncaught_exception')
    Sentry.captureException(error)
  })

  // Give Sentry time to send the error before exiting
  close(2000).then(() => {
    process.exit(1)
  })
})
