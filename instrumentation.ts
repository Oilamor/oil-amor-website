import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Sentry v10 exports this at runtime but TypeScript resolution in instrumentation.ts doesn't resolve it
export const onRequestError = (Sentry as any).captureRequestError
