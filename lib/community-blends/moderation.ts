/**
 * Community Blend Publish Hygiene
 *
 * Server-side sanitization and lightweight content flagging for user
 * supplied blend text (name / description / story).
 *
 * - sanitizeBlendText strips all HTML (XSS). It is deliberately
 *   dependency-free: isomorphic-dompurify pulls jsdom on the server, which
 *   cannot resolve its assets inside a bundled Next.js API route.
 * - flagBlendContent runs a minimal profanity/PII pattern check. It FLAGS
 *   (returns a list of reasons for logging/review) and never throws —
 *   moderation is best-effort until a real moderation queue exists.
 *   TODO: moderation queue requires a schema column (e.g.
 *   community_blends.moderation_status) — out of scope for now; flags are
 *   currently only logged and returned to the caller.
 */

// ============================================================================
// SANITIZATION
// ============================================================================

/**
 * Strip all HTML tags/attributes from user supplied text, returning plain
 * text. Comments and script/style blocks are removed with their contents;
 * every other tag keeps its text. Output is stored plain and React escapes
 * it again at render time.
 */
export function sanitizeBlendText(text: string): string {
  return stripAllHtml(text).trim();
}

function stripAllHtml(input: string): string {
  let out = input
    .replace(/<!--[\s\S]*?-->/g, '')
    // Script/style blocks go with their contents (DOMPurify parity).
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    // An unclosed script/style swallows the rest of the string.
    .replace(/<(script|style)\b[^>]*>[\s\S]*$/gi, '');

  // Repeat to fixpoint so split constructions like `<scr<script>ipt>`
  // collapse fully instead of reassembling a tag.
  let previous: string;
  do {
    previous = out;
    out = out.replace(/<[^>]*>?/g, '');
  } while (out !== previous);

  return decodeBasicEntities(out);
}

function decodeBasicEntities(input: string): string {
  return input.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (entity, body: string) => {
      const lower = body.toLowerCase();
      try {
        if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
        if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
      } catch {
        return entity; // out-of-range code point — keep the raw entity
      }
      switch (lower) {
        case 'amp': return '&';
        case 'lt': return '<';
        case 'gt': return '>';
        case 'quot': return '"';
        case 'apos': return "'";
        case 'nbsp': return ' ';
        default: return entity;
      }
    }
  );
}

// ============================================================================
// CONTENT FLAGGING (profanity / PII) — flags, never crashes
// ============================================================================

// Minimal profanity list — intentionally short; a real moderation queue
// with a maintained list is tracked as follow-up work.
const PROFANITY_PATTERNS: RegExp[] = [
  /\bfuck(?:ing|er|ed)?\b/i,
  /\bshit(?:ty|ted)?\b/i,
  /\bcunt\b/i,
  /\bnigg(?:er|a)\b/i,
  /\bwhore\b/i,
  /\bslut\b/i,
];

// Minimal PII patterns — blends are public, so emails / phone numbers /
// card-like digit runs should not appear in published text.
const PII_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'email address', pattern: /[\w.+-]+@[\w-]+\.[\w.]+/i },
  { label: 'phone number', pattern: /(?:\+?\d[\d\s().-]{7,}\d)/ },
  { label: 'card-like number', pattern: /\b(?:\d[ -]*?){13,16}\b/ },
];

/**
 * Check blend text for profanity/PII. Returns a list of human-readable
 * flags (empty array = clean). Never throws.
 */
export function flagBlendContent(text: string): string[] {
  const flags: string[] = [];

  try {
    for (const pattern of PROFANITY_PATTERNS) {
      if (pattern.test(text)) {
        flags.push(`profanity matched: ${pattern.source}`);
      }
    }
    for (const { label, pattern } of PII_PATTERNS) {
      if (pattern.test(text)) {
        flags.push(`possible PII (${label})`);
      }
    }
  } catch {
    // Flagging is best-effort — never crash publish on a bad pattern
  }

  return flags;
}
