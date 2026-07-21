/**
 * Hardening: community blend moderation (lib/community-blends/moderation.ts)
 *
 * Regression tests for the 2026-07-21 fix: ISO-style calendar dates
 * (e.g. '2026-03-15') were falsely flagged as phone numbers by
 * flagBlendContent. Dates must stay clean while real phone formats,
 * emails, card-like numbers and profanity must keep flagging.
 */

import { flagBlendContent, sanitizeBlendText } from '@/lib/community-blends/moderation'

describe('flagBlendContent phone-number detection', () => {
  it.each([
    '2026-03-15',
    'Blend created on 2026-03-15 for spring',
    '2026/03/15',
    '2026.03.15',
    '2026-3-5',
    'From 2025-01-01 to 2026-12-31',
  ])('does not flag calendar date %j as a phone number', (text) => {
    expect(flagBlendContent(text)).toEqual([])
  })

  it.each([
    '+1 415 555 0132',
    '0412 345 678',
    '(03) 9374 4000',
    '+61 2 9374 4000',
    '415-555-0132',
    'call me on 0412 345 678 now',
    // Date AND phone in the same text — the phone must still flag.
    '2026-03-15 or call +1 415 555 0132',
  ])('still flags real phone number %j', (text) => {
    expect(flagBlendContent(text)).toContain('possible PII (phone number)')
  })

  it('still flags emails and card-like numbers', () => {
    expect(flagBlendContent('reach me at foo@example.com')).toContain('possible PII (email address)')
    expect(flagBlendContent('card 4242 4242 4242 4242')).toContain('possible PII (card-like number)')
  })

  it('still flags profanity', () => {
    expect(flagBlendContent('this is shit')).toEqual(
      expect.arrayContaining([expect.stringContaining('profanity matched')]),
    )
  })
})

describe('sanitizeBlendText (smoke)', () => {
  it('strips HTML and script blocks, keeping text', () => {
    expect(sanitizeBlendText('<b>Calm</b> blend <script>alert(1)</script>')).toBe('Calm blend')
  })
})
