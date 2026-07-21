/**
 * Hardening tests — lib/community-blends/moderation.ts
 *
 * Adversarial sanitizeBlendText inputs (split/nested tags, unclosed tags,
 * comments, entities, null bytes, huge strings) and flagBlendContent PII
 * boundaries (phone formats, card digit runs, false-positive-prone text).
 *
 * NOTE (reported, not fixed): entities are decoded AFTER tag stripping, so
 * entity-encoded markup like `&lt;script&gt;` reassembles into literal
 * `<script>` text in the output. This is safe only because the output is
 * stored as plain text and React escapes it at render time — pinned here so
 * any change is deliberate.
 */

import { sanitizeBlendText, flagBlendContent } from '../moderation';

// ---------------------------------------------------------------------------
// sanitizeBlendText — tag splitting / nesting
// ---------------------------------------------------------------------------

describe('sanitizeBlendText adversarial tags', () => {
  it('collapses split-tag constructions like <scr<script>ipt>', () => {
    const result = sanitizeBlendText('<scr<script>ipt>alert(1)</script>');
    expect(result).toBe('');
    expect(result).not.toContain('script');
  });

  it('removes nested script blocks and their contents', () => {
    const result = sanitizeBlendText('<script><script>alert(1)</script></script>after');
    expect(result).not.toContain('alert');
    expect(result).toContain('after');
  });

  it('an unclosed <script> swallows the rest of the string', () => {
    expect(sanitizeBlendText('Safe text<script>alert(1)')).toBe('Safe text');
  });

  it('an unclosed <style> swallows the rest of the string', () => {
    expect(sanitizeBlendText('Safe text<style>body{display:none}')).toBe('Safe text');
  });

  it('removes <style> blocks with their contents', () => {
    expect(sanitizeBlendText('<style>body{display:none}</style>Visible')).toBe('Visible');
  });

  it('is case-insensitive for script/style tags', () => {
    expect(sanitizeBlendText('<SCRIPT>alert(1)</SCRIPT>ok')).toBe('ok');
    expect(sanitizeBlendText('<ScRiPt>alert(1)</sCrIpT>ok')).toBe('ok');
  });

  it('handles stray angle brackets without hanging', () => {
    expect(sanitizeBlendText('<<<div>>>x<<<')).toBe('>>x');
    expect(sanitizeBlendText('<b')).toBe('');
    expect(sanitizeBlendText('<>')).toBe('');
  });

  it('strips tags with attributes including quoted angle brackets', () => {
    expect(sanitizeBlendText('<a href="https://evil.example">link text</a>')).toBe('link text');
    expect(sanitizeBlendText('<img src="x" alt="pic">caption')).toBe('caption');
  });
});

// ---------------------------------------------------------------------------
// sanitizeBlendText — comments
// ---------------------------------------------------------------------------

describe('sanitizeBlendText HTML comments', () => {
  it('removes single-line comments with their contents', () => {
    expect(sanitizeBlendText('a<!-- hidden -->b')).toBe('ab');
  });

  it('removes multi-line comments', () => {
    expect(sanitizeBlendText('x<!-- line1\nline2 -->y')).toBe('xy');
  });

  it('removes comments containing script text', () => {
    const result = sanitizeBlendText('ok<!-- <script>alert(1)</script> -->done');
    expect(result).toBe('okdone');
  });
});

// ---------------------------------------------------------------------------
// sanitizeBlendText — entities
// ---------------------------------------------------------------------------

describe('sanitizeBlendText entities', () => {
  it('decodes named entities', () => {
    expect(sanitizeBlendText('&lt;b&gt; &amp; &quot;x&quot; &apos;y&apos;')).toBe('<b> & "x" \'y\'');
  });

  it('decodes decimal numeric entities', () => {
    expect(sanitizeBlendText('&#60;&#62;')).toBe('<>');
  });

  it('decodes hex numeric entities (any case)', () => {
    expect(sanitizeBlendText('&#x3C;&#X3e;')).toBe('<>');
  });

  it('decodes &nbsp; to a space', () => {
    expect(sanitizeBlendText('Lavender&nbsp;Dreams')).toBe('Lavender Dreams');
  });

  it('leaves unknown entities untouched', () => {
    expect(sanitizeBlendText('&unknown; &amp')).toBe('&unknown; &amp');
  });

  it('keeps out-of-range code points as the raw entity (no crash)', () => {
    expect(sanitizeBlendText('&#x110000;')).toBe('&#x110000;');
  });

  it('decodes &#0; to a literal null byte', () => {
    expect(sanitizeBlendText('&#0;')).toBe('\u0000');
  });

  it('PINNED: entity-encoded tags reassemble into literal markup text after decode', () => {
    // Decoding happens after stripping, so `&lt;script&gt;` becomes the plain
    // text `<script>` — relied on React escaping it at render time.
    expect(sanitizeBlendText('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('<script>alert(1)</script>');
  });
});

// ---------------------------------------------------------------------------
// sanitizeBlendText — robustness
// ---------------------------------------------------------------------------

describe('sanitizeBlendText robustness', () => {
  it('preserves unicode and emoji untouched', () => {
    expect(sanitizeBlendText('Calm 🌿 ünïcödé 日本語 blend')).toBe('Calm 🌿 ünïcödé 日本語 blend');
  });

  it('passes null bytes through unchanged (does not crash)', () => {
    const withNull = 'a\u0000b';
    expect(sanitizeBlendText(withNull)).toBe(withNull);
  });

  it('handles a 100k-character string with interleaved tags', () => {
    const chunk = '<b>lorem ipsum</b> ';
    const long = chunk.repeat(5000); // ~95k chars
    const result = sanitizeBlendText(long);

    expect(result).not.toContain('<');
    expect(result.length).toBeGreaterThan(50000);
    expect(result.startsWith('lorem ipsum')).toBe(true);
  });

  it('PINNED: mangles legitimate math text containing < and >', () => {
    // The naive tag regex treats everything between < and > as a tag.
    // Known false-positive of the dependency-free stripper — pinned so a
    // future proper parser change is a deliberate diff.
    expect(sanitizeBlendText('use when 5 < 6 and 7 > 2 drops')).toBe('use when 5  2 drops');
  });

  it('PINNED: an unclosed < drops the remainder of the string', () => {
    expect(sanitizeBlendText('text > text < more')).toBe('text > text');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeBlendText('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// flagBlendContent — PII boundaries
// ---------------------------------------------------------------------------

describe('flagBlendContent phone formats', () => {
  it.each([
    '+61 400 123 456',
    '(03) 9123 4567',
    '0412-345-678',
    '0412.345.678',
    'call me 123456789',
  ])('flags phone-like text: %s', (text) => {
    const flags = flagBlendContent(text);
    expect(flags.some(f => f.includes('phone'))).toBe(true);
  });

  it('does not flag short digit runs (8 digits is below the phone threshold)', () => {
    expect(flagBlendContent('Order #12345678')).toEqual([]);
  });
});

describe('flagBlendContent card-like digit runs', () => {
  it('flags a 13-digit run (lower card boundary)', () => {
    const flags = flagBlendContent('4111111111111');
    expect(flags.some(f => f.includes('card-like'))).toBe(true);
  });

  it('flags a 16-digit run with dashes', () => {
    const flags = flagBlendContent('4111-1111-1111-1111');
    expect(flags.some(f => f.includes('card-like'))).toBe(true);
  });

  it('flags a 16-digit run with spaces', () => {
    const flags = flagBlendContent('4111 1111 1111 1111');
    expect(flags.some(f => f.includes('card-like'))).toBe(true);
  });

  it('does not flag a 12-digit run as a card (but the phone rule still catches it)', () => {
    const flags = flagBlendContent('123456789012');
    expect(flags.some(f => f.includes('card-like'))).toBe(false);
    expect(flags.some(f => f.includes('phone'))).toBe(true);
  });

  it('flags a 17-digit run only as phone, not card', () => {
    const flags = flagBlendContent('41111111111111111');
    expect(flags.some(f => f.includes('card-like'))).toBe(false);
    expect(flags.some(f => f.includes('phone'))).toBe(true);
  });
});

describe('flagBlendContent false-positive-prone text', () => {
  it.each([
    'blend 2024',
    'Lavender 5ml 30ml',
    'Use 3 drops twice daily',
    'A calming lavender and cedarwood blend for sleep',
  ])('returns no flags for: %s', (text) => {
    expect(flagBlendContent(text)).toEqual([]);
  });

  it('PINNED false positive: an ISO date (2026-03-15) matches the phone pattern', () => {
    // `2026-03-15` is 8 digits+dashes — inside the phone pattern's 9-char
    // window. Flagging is advisory only (never blocks publish), so this is
    // tolerated for now — pinned so tightening the regex is a visible diff.
    const flags = flagBlendContent('Created on 2026-03-15 with love');
    expect(flags.some(f => f.includes('phone'))).toBe(true);
  });
});

describe('flagBlendContent emails and robustness', () => {
  it.each([
    'jane@example.com',
    'a+b@sub.domain.co',
    'JANE.DOE@EXAMPLE.ORG',
  ])('flags email address: %s', (email) => {
    const flags = flagBlendContent(`contact ${email} now`);
    expect(flags.some(f => f.includes('email'))).toBe(true);
  });

  it('does not flag an email-like fragment without a domain', () => {
    expect(flagBlendContent('meet at the @ symbol')).toEqual([]);
  });

  it('never throws on hostile input', () => {
    const hostile = [
      '\u0000'.repeat(100),
      '<script>alert(1)</script>'.repeat(100),
      '🌿'.repeat(1000),
      '1234567890 '.repeat(200),
    ];
    for (const text of hostile) {
      expect(() => flagBlendContent(text)).not.toThrow();
    }
  });

  it('returns an array for every input (flag contract)', () => {
    expect(Array.isArray(flagBlendContent(''))).toBe(true);
    expect(Array.isArray(flagBlendContent('shit happens'))).toBe(true);
  });
});
