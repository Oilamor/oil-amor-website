/**
 * Guard: Redis client consolidation
 *
 * The app uses a single Redis client — @upstash/redis (REST), via
 * lib/redis/client.ts. ioredis (TCP) was removed. This test walks the
 * lib/ and app/ sources (plus the root middleware) and fails if any
 * ioredis import/require/mock sneaks back in.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCANNED_DIRS = ['lib', 'app'];
const SCANNED_FILES = ['middleware.ts'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IOREDIS_USAGE = /from\s+['"]ioredis['"]|require\(\s*['"]ioredis['"]\)|jest\.mock\(\s*['"]ioredis['"]/;

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      files.push(...walk(full));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

describe('Redis client consolidation (no ioredis)', () => {
  it('lib/ and app/ contain no ioredis imports, requires, or mocks', () => {
    const candidates: string[] = [];
    for (const dir of SCANNED_DIRS) {
      candidates.push(...walk(path.join(process.cwd(), dir)));
    }
    for (const file of SCANNED_FILES) {
      const full = path.join(process.cwd(), file);
      if (fs.existsSync(full)) candidates.push(full);
    }

    const offenders = candidates.filter(file =>
      IOREDIS_USAGE.test(fs.readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
