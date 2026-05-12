/**
 * Security Utilities
 * Helper functions for enterprise-grade security
 */

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS
 * Universal function that works in both browser and Node.js environments
 */
export function sanitizeHtml(input: string): string {
  // First, escape HTML entities
  let sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  // Browser environment: use DOM for additional safety
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = sanitized
    return div.innerHTML
  }
  
  // Node.js environment: return the escaped string directly
  return sanitized
}

/**
 * Sanitize user input for display (no HTML allowed)
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  // Remove any HTML tags
  const noHtml = input.replace(/<[^>]*>/g, '')
  // Trim and limit length
  return noHtml.trim().slice(0, maxLength)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate password strength
 * Enterprise requirements: min 12 chars, mixed case, numbers, special chars
 */
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
} {
  const errors: string[] = []
  let score = 0

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters')
  } else {
    score++
  }

  if (password.length >= 16) score++

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letters')
  } else {
    score++
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letters')
  } else {
    score++
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Must contain numbers')
  } else {
    score++
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain special characters')
  } else {
    score++
  }

  const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong'

  return {
    valid: errors.length === 0,
    errors,
    strength,
  }
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false
  if (token.length !== 64 || storedToken.length !== 64) return false
  
  // Constant-time comparison to prevent timing attacks
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i)
  }
  return result === 0
}

// ============================================================================
// HASHING & ENCRYPTION
// ============================================================================

/**
 * Generate a secure hash using Web Crypto API
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, length)
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate request origin
 */
export function validateOrigin(
  requestOrigin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!requestOrigin) return false
  
  return allowedOrigins.some(origin => {
    if (origin.includes('*')) {
      const regex = new RegExp('^' + origin.replace(/\*/g, '.*') + '$')
      return regex.test(requestOrigin)
    }
    return origin === requestOrigin
  })
}

// ============================================================================
// SECURITY HEADERS HELPER
// ============================================================================

/**
 * Get security headers for API responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
  }
}

// ============================================================================
// RATE LIMITING HELPERS (Client-side)
// ============================================================================

interface RateLimitState {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitState>()

/**
 * Client-side rate limiting for form submissions
 */
export function checkClientRateLimit(
  action: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const key = `client:${action}`
  const state = rateLimitStore.get(key)

  if (!state || now > state.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowMs,
    }
  }

  if (state.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: state.resetTime - now,
    }
  }

  state.count++
  return {
    allowed: true,
    remaining: maxRequests - state.count,
    resetIn: state.resetTime - now,
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface SecurityEvent {
  type: 'auth' | 'access' | 'error' | 'suspicious'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
}

/**
 * Log security events for audit trail
 * In production, send to your logging service (Sentry, DataDog, etc.)
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    return
  }

  // In production, send to your security monitoring service
  // Example: sentry.captureMessage(event.message, { level: event.severity, extra: event.metadata })
  
  // Send to your logging endpoint
  fetch('/api/security/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullEvent),
    keepalive: true,
  }).catch(() => {
    // Silent fail - don't break user experience
  })
}

// ============================================================================
// DATA MASKING
// ============================================================================

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) return '*'.repeat(data.length)
  return data.slice(0, visibleChars) + '*'.repeat(data.length - visibleChars * 2) + data.slice(-visibleChars)
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return maskSensitiveData(email)
  
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length)
  
  return `${maskedLocal}@${domain}`
}

// ============================================================================
// BOT DETECTION
// ============================================================================

/**
 * Simple bot detection based on user agent and behavior
 */
export function isLikelyBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /httpclient/i,
  ]
  
  return botPatterns.some(pattern => pattern.test(userAgent))
}

/**
 * Check for suspicious request patterns
 */
export function detectSuspiciousActivity(
  userAgent: string,
  headers: Headers
): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Check for missing standard headers
  if (!headers.get('accept-language')) {
    reasons.push('Missing Accept-Language header')
  }

  // Check for common bot signatures
  if (isLikelyBot(userAgent)) {
    reasons.push('Bot-like User-Agent')
  }

  // Check for automated tool signatures
  if (userAgent.includes('HeadlessChrome') || userAgent.includes('PhantomJS')) {
    reasons.push('Headless browser detected')
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  }
}
