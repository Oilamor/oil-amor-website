#!/bin/bash

# =============================================================================
# Oil Amor — Production Deployment Script
# =============================================================================
# Thin, truthful deploy pipeline:
#   1. Validate environment variables (scripts/validate-env.ts)
#   2. Lint            (npm run lint)
#   3. Type check      (npm run type-check)
#   4. Unit tests      (npx jest)
#   5. Production build (npm run build)
#   6. Deploy to Vercel (vercel --prod)
#
# Prerequisites: Node.js 20+, npm, and the Vercel CLI (`npm i -g vercel`),
# with the project already linked (`vercel link`). Env vars must exist in
# .env.local (see .env.template).
# =============================================================================

set -e  # Exit on any error

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> [1/6] Validating environment variables"
if [ ! -f ".env.local" ]; then
    echo "ERROR: .env.local not found. Copy .env.template and fill in the values." >&2
    exit 1
fi
npx tsx scripts/validate-env.ts

echo "==> [2/6] Linting"
npm run lint

echo "==> [3/6] Type checking"
npm run type-check

echo "==> [4/6] Running unit tests"
npx jest

echo "==> [5/6] Building for production"
npm run build

echo "==> [6/6] Deploying to Vercel (production)"
if ! command -v vercel &> /dev/null; then
    echo "ERROR: Vercel CLI not found. Install with: npm i -g vercel" >&2
    exit 1
fi
if [ ! -d ".vercel" ]; then
    echo "ERROR: Vercel project not linked. Run 'vercel link' first." >&2
    exit 1
fi
vercel --prod --yes

echo "==> Deployment complete"
