/**
 * Sentry Client Configuration
 * Error tracking and performance monitoring for the browser
 */

import * as Sentry from '@sentry/nextjs'

// ============================================================================
// SENTRY INITIALIZATION
// ============================================================================

Sentry.init({
  // DSN from environment
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.npm_package_version,
  
  // ==========================================================================
  // ERROR TRACKING
  // ==========================================================================
  
  // Capture all errors
  beforeSend(event) {
    // Filter out specific errors we don't want to track
    if (event.exception?.values?.[0]) {
      const errorType = event.exception.values[0].type
      const errorMessage = event.exception.values[0].value || ''
      
      // Ignore common browser extensions errors
      if (
        errorMessage.includes('chrome-extension') ||
        errorMessage.includes('moz-extension') ||
        errorMessage.includes('safari-extension')
      ) {
        return null
      }
      
      // Ignore specific non-actionable errors
      const ignoredErrors = [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications.',
        'Non-Error exception captured',
        'Network Error',
        'Failed to fetch',
        'cancelled',
        'CancellationError',
      ]
      
      if (ignoredErrors.some(msg => errorMessage.includes(msg))) {
        return null
      }
    }
    
    // Sanitize sensitive data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
        delete event.request.headers['X-CSRF-Token']
      }
      
      // Mask sensitive data in URL
      if (event.request.url) {
        event.request.url = event.request.url.replace(
          /(token|password|secret|key)=([^&]+)/gi,
          '$1=[REDACTED]'
        )
      }
    }
    
    // Add custom tags
    event.tags = {
      ...event.tags,
      runtime: 'browser',
      route: window.location.pathname,
    }
    
    return event
  },
  
  // ==========================================================================
  // PERFORMANCE MONITORING
  // ==========================================================================
  
  // Traces sample rate - 100% in development, configurable in production
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  
  // Profiles sample rate for performance profiling
  profilesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
  
  // Enable distributed tracing
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.oilamor\.com/,
    /^https:\/\/.*\.sanity\.io/,
  ],
  
  // ==========================================================================
  // REPLAYS (Session Recording)
  // ==========================================================================
  
  // Enable session replay for error investigation
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions
  
  integrations: [
    // Browser profiling
    Sentry.browserProfilingIntegration(),
    
    // Session replay with privacy controls
    Sentry.replayIntegration({
      // Mask all inputs by default
      maskAllInputs: true,
      // Mask specific text content
      maskAllText: false,
      // Block media elements
      blockAllMedia: true,
      // Network details to capture
      networkDetailAllowUrls: [
        window.location.origin,
        'https://cdn.sanity.io',
      ],
      // Don't capture these network requests
      networkCaptureBodies: false,
    }),
    
    // Breadcrumbs for console and navigation
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      sentry: true,
      xhr: true,
    }),
    
    // Global handlers for uncaught errors
    Sentry.globalHandlersIntegration({
      onerror: true,
      onunhandledrejection: true,
    }),
  ],
  
  // ==========================================================================
  // DEBUG & DEVELOPMENT
  // ==========================================================================
  
  // Debug mode in development
  debug: process.env.NODE_ENV === 'development',
  
  // Don't send errors in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
  
  // ==========================================================================
  // CONTEXT & EXTRA DATA
  // ==========================================================================
  
  initialScope: {
    tags: {
      app: 'oil-amor',
      tier: 'tier-1',
    },
  },
})

// ============================================================================
// CUSTOM ERROR HANDLERS
// ============================================================================

// Log initialization
if (process.env.NODE_ENV === 'development') {
  console.log('[Sentry] Client SDK initialized')
}

// Export navigation instrumentation hook for Next.js App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
