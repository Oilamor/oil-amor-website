/**
 * Hardening: structured logger (lib/logging/logger.ts)
 *
 * Pins log levels, transport resilience (a failing Sentry transport must never
 * throw into app code), child-logger context merging, and the current
 * redaction contract (none — context passes through verbatim; see report).
 *
 * NOTE: jest.setup.ts globally mocks both '@/lib/logging/logger' and
 * '@sentry/nextjs' for all suites. We unmock the logger to test the real
 * implementation; the Sentry mock from jest.setup is reused (it is the same
 * jest.fn the real logger module will import).
 */

jest.unmock('@/lib/logging/logger')

import { logger, createRequestLogger, LogLevel } from '@/lib/logging/logger'
import { captureMessage } from '@sentry/nextjs'

const mockCaptureMessage = captureMessage as jest.Mock

describe('logger: log levels', () => {
  it('exposes the five canonical levels', () => {
    expect(LogLevel.DEBUG).toBe('debug')
    expect(LogLevel.INFO).toBe('info')
    expect(LogLevel.WARN).toBe('warn')
    expect(LogLevel.ERROR).toBe('error')
    expect(LogLevel.FATAL).toBe('fatal')
  })

  it('suppresses debug at the default INFO minimum level', () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})
    logger.debug('hidden message')
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it('logs info via console.info with service tag and message', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('hello world')
    expect(infoSpy).toHaveBeenCalledTimes(1)
    const [prefix, , message] = infoSpy.mock.calls[0]
    expect(String(prefix)).toContain('[INFO]')
    expect(String(prefix)).toContain('[oil-amor]')
    expect(message).toBe('hello world')
  })

  it('routes warn to console.warn and error/fatal to console.error', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logger.warn('careful')
    logger.error('broken')
    logger.fatal('very broken')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(String(errorSpy.mock.calls[0][0])).toContain('[ERROR]')
    expect(String(errorSpy.mock.calls[1][0])).toContain('[FATAL]')
  })

  it('serializes error name and message into the console output payload', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('payment failed', new TypeError('stripe exploded'))
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const errorStr = errorSpy.mock.calls[0][4] as string
    expect(errorStr).toContain('TypeError')
    expect(errorStr).toContain('stripe exploded')
  })

  it('passes context objects through to the console transport verbatim', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    // NOTE: logger.ts implements NO redaction — whatever lands in context is
    // emitted. This pins current behavior; redaction is a reported gap.
    logger.info('with context', { orderId: 'OA-1', total: 4200 })
    const contextStr = infoSpy.mock.calls[0][3] as string
    expect(contextStr).toContain('"orderId": "OA-1"')
    expect(contextStr).toContain('"total": 4200')
  })
})

describe('logger: Sentry transport resilience', () => {
  const SENTRY_VAR = 'SENTRY_DSN'
  let savedDsn: string | undefined

  beforeEach(() => {
    savedDsn = process.env[SENTRY_VAR]
    process.env[SENTRY_VAR] = 'https://examplePublicKey@o0.ingest.sentry.io/0'
  })

  afterEach(() => {
    if (savedDsn === undefined) delete process.env[SENTRY_VAR]
    else process.env[SENTRY_VAR] = savedDsn
  })

  it('forwards entries to Sentry with mapped severity when DSN is set', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('sentry me', { orderId: 'OA-9' })
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'sentry me',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ service: 'oil-amor', log_level: 'warn' }),
        extra: expect.objectContaining({ orderId: 'OA-9' }),
      })
    )
  })

  it('maps fatal to Sentry fatal and error to error', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('e1')
    logger.fatal('f1')
    expect(mockCaptureMessage).toHaveBeenCalledWith('e1', expect.objectContaining({ level: 'error' }))
    expect(mockCaptureMessage).toHaveBeenCalledWith('f1', expect.objectContaining({ level: 'fatal' }))
  })

  it('a throwing Sentry transport does not break logging', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockCaptureMessage.mockImplementationOnce(() => {
      throw new Error('sentry is down')
    })
    expect(() => logger.info('still works')).not.toThrow()
    // The transport failure itself is reported on console.error.
    expect(errorSpy).toHaveBeenCalledWith(
      'Transport sentry failed:',
      expect.any(Error)
    )
  })

  it('does not call Sentry when DSN is unset', () => {
    delete process.env[SENTRY_VAR]
    jest.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('quiet')
    expect(mockCaptureMessage).not.toHaveBeenCalled()
  })
})

describe('logger: time()', () => {
  it('resolves with the function result and logs completion with duration', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    const result = await logger.time('load catalog', () => 42)
    expect(result).toBe(42)
    expect(infoSpy).toHaveBeenCalled()
    const lastCall = infoSpy.mock.calls[infoSpy.mock.calls.length - 1]
    expect(lastCall[2]).toBe('load catalog completed')
    expect(String(lastCall[3])).toContain('"duration"')
  })

  it('logs completion even when the timed function rejects, then propagates', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    await expect(
      logger.time('failing op', () => Promise.reject(new Error('nope')))
    ).rejects.toThrow('nope')
    expect(infoSpy).toHaveBeenCalled()
    const lastCall = infoSpy.mock.calls[infoSpy.mock.calls.length - 1]
    expect(lastCall[2]).toBe('failing op completed')
  })
})

describe('logger: child loggers', () => {
  it('child logger merges default context into every entry', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    const child = logger.child({ requestId: 'req-123' })
    child.info('child says hi', { extra: true })
    const contextStr = infoSpy.mock.calls[0][3] as string
    expect(contextStr).toContain('"requestId": "req-123"')
    expect(contextStr).toContain('"extra": true')
  })

  it('call-site context overrides child defaults on key collision', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    const child = logger.child({ requestId: 'req-123', route: '/default' })
    child.info('override', { route: '/actual' })
    const contextStr = infoSpy.mock.calls[0][3] as string
    expect(contextStr).toContain('"route": "/actual"')
    expect(contextStr).not.toContain('/default')
  })

  it('createRequestLogger stamps requestId, userId and timestamp', () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    const reqLogger = createRequestLogger('req-abc', 'user-42')
    reqLogger.info('request handled')
    const contextStr = infoSpy.mock.calls[0][3] as string
    expect(contextStr).toContain('"requestId": "req-abc"')
    expect(contextStr).toContain('"userId": "user-42"')
    expect(contextStr).toContain('"timestamp"')
  })
})
