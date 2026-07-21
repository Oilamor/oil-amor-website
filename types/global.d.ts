/**
 * Global Type Declarations
 * Missing module declarations for dependencies
 */

// ============================================================================
// UPSTASH REDIS
// ============================================================================

declare module '@upstash/redis' {
  export interface RedisConfig {
    url: string
    token: string
    retry?: {
      retries: number
      backoff: (retryCount: number) => number
    }
  }

  export type RedisValue = string | number | boolean | object | null

  export interface SetOptions {
    ex?: number
    px?: number
    nx?: boolean
    xx?: boolean
  }

  export type PipelineResult<T = unknown> = T[]

  export class Redis {
    constructor(config: RedisConfig)
    
    // String operations
    get<T = string>(key: string): Promise<T | null>
    set(key: string, value: RedisValue, options?: SetOptions): Promise<string>
    setex(key: string, seconds: number, value: RedisValue): Promise<string>
    del(...keys: string[]): Promise<number>
    expire(key: string, seconds: number): Promise<number>
    ttl(key: string): Promise<number>
    
    // Hash operations
    hget<T = string>(key: string, field: string): Promise<T | null>
    hset(key: string, fields: Record<string, RedisValue>): Promise<number>
    hgetall<T = Record<string, string>>(key: string): Promise<T | null>
    hdel(key: string, field: string): Promise<number>
    
    // List operations
    lpush<T>(key: string, value: T): Promise<number>
    rpop<T>(key: string): Promise<T | null>
    llen(key: string): Promise<number>
    lrange<T>(key: string, start: number, stop: number): Promise<T[]>
    
    // Set operations
    sadd<T>(key: string, member: T): Promise<number>
    srem<T>(key: string, member: T): Promise<number>
    smembers<T>(key: string): Promise<T[]>
    sismember<T>(key: string, member: T): Promise<number>
    
    // Sorted set operations
    zadd(key: string, member: { score: number; member: string }): Promise<number>
    zrem(key: string, member: string): Promise<number>
    zrangebyscore<T>(key: string, min: number | string, max: number | string): Promise<T[]>
    zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>
    zcard(key: string): Promise<number>
    
    // Utility
    ping(): Promise<string>
    keys(pattern: string): Promise<string[]>
    flushdb(): Promise<string>
    
    // Pipeline
    pipeline(): RedisPipeline
  }

  export interface RedisPipeline {
    get(key: string): RedisPipeline
    set(key: string, value: RedisValue): RedisPipeline
    setex(key: string, seconds: number, value: RedisValue): RedisPipeline
    del(key: string): RedisPipeline
    zremrangebyscore(key: string, min: number | string, max: number | string): RedisPipeline
    zcard(key: string): RedisPipeline
    zadd(key: string, member: { score: number; member: string }): RedisPipeline
    expire(key: string, seconds: number): RedisPipeline
    exec<T = unknown[]>(): Promise<T>
  }
}

// ============================================================================
// SENTRY
// ============================================================================

declare module '@sentry/nextjs' {
  export interface Event {
    exception?: {
      values?: Array<{
        type?: string
        value?: string
      }>
    }
    request?: {
      headers?: Record<string, string>
      url?: string
    }
    tags?: Record<string, string>
  }

  export interface Scope {
    setTag(key: string, value: string): void
    setContext(key: string, value: Record<string, unknown>): void
  }

  export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'

  export interface Integration {
    name: string
  }

  export interface SentryInitOptions {
    dsn?: string
    environment?: string
    release?: string
    beforeSend?: (event: Event) => Event | null
    tracesSampleRate?: number
    profilesSampleRate?: number
    tracePropagationTargets?: (string | RegExp)[]
    replaysSessionSampleRate?: number
    replaysOnErrorSampleRate?: number
    integrations?: Integration[]
    debug?: boolean
    enabled?: boolean
    initialScope?: {
      tags?: Record<string, string>
    }
  }

  export function init(options: SentryInitOptions): void
  export function captureException(error: unknown): void
  export function captureMessage(message: string, level?: SeverityLevel | { level?: SeverityLevel; tags?: Record<string, string>; extra?: Record<string, unknown> }): void
  export function withScope(callback: (scope: Scope) => void): void
  
  export function browserProfilingIntegration(): Integration
  export function replayIntegration(options?: {
    maskAllInputs?: boolean
    maskAllText?: boolean
    blockAllMedia?: boolean
    networkDetailAllowUrls?: string[]
    networkCaptureBodies?: boolean
  }): Integration
  export function breadcrumbsIntegration(options?: {
    console?: boolean
    dom?: boolean
    fetch?: boolean
    history?: boolean
    sentry?: boolean
    xhr?: boolean
  }): Integration
  export function globalHandlersIntegration(options?: {
    onerror?: boolean
    onunhandledrejection?: boolean
  }): Integration
}

// ============================================================================
// PG (PostgreSQL)
// ============================================================================

declare module 'pg' {
  export interface PoolConfig {
    host?: string
    port?: number
    database?: string
    user?: string
    password?: string
    ssl?: boolean | object
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
  }

  export interface FieldDef {
    name: string
    tableID: number
    columnID: number
    dataTypeID: number
    dataTypeSize: number
    dataTypeModifier: number
    format: string
  }

  export interface QueryResult<T = unknown> {
    rows: T[]
    rowCount: number
    command: string
    oid: number
    fields: FieldDef[]
  }

  export interface PoolClient {
    query<T = unknown>(sql: string, values?: unknown[]): Promise<QueryResult<T>>
    release(err?: Error): void
  }

  export class Pool {
    constructor(config?: PoolConfig)
    query<T = unknown>(sql: string, values?: unknown[]): Promise<QueryResult<T>>
    connect(): Promise<PoolClient>
    end(): Promise<void>
    on(event: 'error', callback: (err: Error, client: PoolClient) => void): void
  }

  export class Client {
    constructor(config?: PoolConfig)
    connect(): Promise<void>
    query<T = unknown>(sql: string, values?: unknown[]): Promise<QueryResult<T>>
    end(): Promise<void>
  }
}
