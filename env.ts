/**
 * Environment Variable Validation
 * 
 * Uses t3-env to validate environment variables at runtime and build time.
 * This ensures all required variables are present and correctly typed.
 */

import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),
    
    // Sanity CMS
    SANITY_PROJECT_ID: z.string().min(1),
    SANITY_DATASET: z.string().default('production'),
    SANITY_API_TOKEN: z.string().min(1),
    
    // Redis (Upstash REST — the single Redis client) - Optional
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    
    // Australia Post
    AUSPOST_API_BASE: z.string().url().optional(),
    AUSPOST_API_KEY: z.string().optional(),
    AUSPOST_API_SECRET: z.string().optional(),
    AUSPOST_WEBHOOK_SECRET: z.string().optional(),
    AUSPOST_ACCOUNT_NUMBER: z.string().optional(),
    
    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    
    // Admin
    ADMIN_API_KEY: z.string().min(1), // Bearer token for API access (machine-to-machine)
    ADMIN_PASSWORD_HASH: z.string().optional(), // bcrypt hash for human login (preferred)
    IRON_SESSION_PASSWORD: z.string().min(32),
    ADMIN_SESSION_PASSWORD: z.string().min(32).optional(),
    
    // Resend
    RESEND_API_KEY: z.string().min(1),
    
    // Sentry
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
    SENTRY_PROFILES_SAMPLE_RATE: z.string().optional(),
    SENTRY_ENABLED: z.string().optional(),
    SENTRY_CSP_REPORT_URI: z.string().url().optional(),
    
    // Optional/Development only
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  },
  
  client: {
    // Stripe (public)
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    
    // Sanity (public)
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1),
    
    // App URL
    NEXT_PUBLIC_APP_URL: z.string().url().default('https://oilamor.com'),
    

  },
  
  runtimeEnv: {
    // Server
    DATABASE_URL: process.env.DATABASE_URL,
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_DATASET,
    SANITY_API_TOKEN: process.env.SANITY_API_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AUSPOST_API_BASE: process.env.AUSPOST_API_BASE,
    AUSPOST_API_KEY: process.env.AUSPOST_API_KEY,
    AUSPOST_API_SECRET: process.env.AUSPOST_API_SECRET,
    AUSPOST_WEBHOOK_SECRET: process.env.AUSPOST_WEBHOOK_SECRET,
    AUSPOST_ACCOUNT_NUMBER: process.env.AUSPOST_ACCOUNT_NUMBER,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    ADMIN_SESSION_PASSWORD: process.env.ADMIN_SESSION_PASSWORD,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    IRON_SESSION_PASSWORD: process.env.IRON_SESSION_PASSWORD,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_PROFILES_SAMPLE_RATE: process.env.SENTRY_PROFILES_SAMPLE_RATE,
    SENTRY_ENABLED: process.env.SENTRY_ENABLED,
    SENTRY_CSP_REPORT_URI: process.env.SENTRY_CSP_REPORT_URI,
    
    // Client
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
})
