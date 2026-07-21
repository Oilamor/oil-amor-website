/**
 * Community Blend Publish Hygiene — sanitization & content flagging tests
 */

import { sanitizeBlendText, flagBlendContent } from '../moderation';

describe('sanitizeBlendText', () => {
  it('strips HTML tags from text', () => {
    expect(sanitizeBlendText('<b>Bold</b> Blend')).toBe('Bold Blend');
  });

  it('removes script tags and their content', () => {
    const result = sanitizeBlendText('<script>alert("xss")</script>Calm Nights');
    expect(result).not.toContain('alert');
    expect(result).toContain('Calm Nights');
  });

  it('strips event handler attributes', () => {
    const result = sanitizeBlendText('<img src=x onerror=alert(1)>Sleep Blend');
    expect(result).not.toContain('onerror');
    expect(result).toContain('Sleep Blend');
  });

  it('trims whitespace', () => {
    expect(sanitizeBlendText('  Lavender Dreams  ')).toBe('Lavender Dreams');
  });

  it('returns empty string for tag-only input', () => {
    expect(sanitizeBlendText('<div></div>')).toBe('');
  });
});

describe('flagBlendContent', () => {
  it('flags profanity', () => {
    const flags = flagBlendContent('This fucking great blend');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.some(f => f.startsWith('profanity'))).toBe(true);
  });

  it('flags email addresses as possible PII', () => {
    const flags = flagBlendContent('Contact me at jane@example.com for more');
    expect(flags.some(f => f.includes('email'))).toBe(true);
  });

  it('flags card-like digit runs as possible PII', () => {
    const flags = flagBlendContent('My card 4111 1111 1111 1111 lol');
    expect(flags.some(f => f.includes('PII'))).toBe(true);
  });

  it('returns no flags for clean blend text', () => {
    expect(flagBlendContent('A calming lavender and cedarwood blend for sleep')).toEqual([]);
  });

  it('never throws on empty or odd input', () => {
    expect(() => flagBlendContent('')).not.toThrow();
    expect(() => flagBlendContent('!!!@@@###')).not.toThrow();
  });
});
