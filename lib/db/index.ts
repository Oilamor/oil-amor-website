/**
 * Database Connection
 * 
 * Central database client for all refill modules and services.
 * Uses Drizzle ORM with node-postgres for type-safe database access.
 * 
 * NOTE: The pool is created lazily on first query execution. This prevents
 * crashes during build, static generation, or in client contexts where
 * DATABASE_URL may not be available.
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient } from 'pg'
import * as schema from './schema'
import { logger } from '@/lib/logging/logger'

/**
 * PostgreSQL connection pool with optimized settings for production
 * 
 * SSL/TLS is controlled entirely by the DATABASE_URL connection string.
 * Managed providers (Neon, Supabase, Vercel Postgres, AWS RDS, etc.)
 * include SSL parameters in their connection strings. We do NOT override
 * ssl here because:
 *  1. It breaks connection-string SSL configuration
 *  2. rejectUnauthorized: false enables MITM attacks
 *  3. ssl: true can fail with self-signed certs without proper CA config
 * 
 * If you need custom SSL (e.g. private CA), append ?sslmode=verify-ca&sslrootcert=/path/to/ca.crt
 * to your DATABASE_URL or set the PGSSLROOTCERT environment variable.
 */
let poolInstance: Pool | null = null
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    // Return a dummy pool that throws only when connect/query is called.
    // This prevents crashes during Next.js build/static analysis while
    // still failing fast at runtime if DATABASE_URL is missing.
    return createDummyPool()
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  } as ConstructorParameters<typeof Pool>[0])

  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', err instanceof Error ? err : new Error(String(err)))
  })

  return pool
}

function createDummyPool(): Pool {
  const throwNotConfigured = () => {
    throw new Error('DATABASE_URL is required')
  }

  return {
    connect: throwNotConfigured,
    query: throwNotConfigured,
    end: async () => {},
    on: () => {},
    removeListener: () => {},
    emit: () => false,
    once: () => {},
    listenerCount: () => 0,
    listeners: () => [],
    off: () => {},
    addListener: () => {},
    prependListener: () => {},
    prependOnceListener: () => {},
    eventNames: () => [],
    rawListeners: () => [],
    setMaxListeners: () => {},
    getMaxListeners: () => 0,
    removeAllListeners: () => {},
    _checkSize: throwNotConfigured,
    _pulseQueue: throwNotConfigured,
    _clients: [],
    _expiring: new Map(),
    _idle: [],
    _pendingQueue: [],
    _all: new Set(),
    _count: 0,
    _idleCount: 0,
    _pendingQueueSize: 0,
    _isFull: () => false,
    _isEmpty: () => true,
    _release: throwNotConfigured,
    _acquire: throwNotConfigured,
    _verify: throwNotConfigured,
    _create: throwNotConfigured,
    _destroy: throwNotConfigured,
    options: {},
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
    expiredCount: 0,
    ending: false,
    ended: false,
    pass: throwNotConfigured,
  } as unknown as Pool
}

function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = createPool()
  }
  return poolInstance
}

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema })
  }
  return dbInstance
}

// ============================================================================
// LAZY DB PROXY
// Only creates the Drizzle instance on first property access.
// Safe for Next.js builds because dummy pool never throws on property access.
// ============================================================================

function createLazyProxy<T extends object>(): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const realDb = getDb()
      const value = (realDb as any)[prop]

      if (typeof value === 'function') {
        return value.bind(realDb)
      }

      if (value !== null && typeof value === 'object') {
        return createNestedLazyProxy(value)
      }

      return value
    },
  })
}

function createNestedLazyProxy<T extends object>(target: T): T {
  return new Proxy({} as T, {
    get(_dummy, prop) {
      const value = (target as any)[prop]
      if (typeof value === 'function') {
        return value.bind(target)
      }
      if (value !== null && typeof value === 'object') {
        return createNestedLazyProxy(value)
      }
      return value
    },
  })
}

/**
 * Drizzle ORM database client with schema
 * 
 * Usage:
 *   import { db } from '@/lib/db'
 *   const bottles = await db.select().from(foreverBottles)
 *   const user = await db.query.users.findFirst({ where: eq(users.id, id) })
 */
export const db = createLazyProxy<ReturnType<typeof drizzle<typeof schema>>>()

/**
 * Database type for use in function signatures
 */
export type DB = ReturnType<typeof drizzle<typeof schema>>

/**
 * Raw pool for transactions or direct queries when needed.
 * Also lazily initialised — safe to import anywhere.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const realPool = getPool()
    const value = (realPool as any)[prop]
    if (typeof value === 'function') {
      return value.bind(realPool)
    }
    return value
  }
})

/**
 * Graceful shutdown helper
 */
export async function closeDatabase(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end()
    poolInstance = null
    dbInstance = null
  }
}
