#!/usr/bin/env tsx
/**
 * Production Environment Validation
 * Run: npx tsx scripts/validate-env.ts
 */

const REQUIRED_SERVER = [
  'DATABASE_URL',
  'SANITY_PROJECT_ID',
  'SANITY_API_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'ADMIN_API_KEY',
  'IRON_SESSION_PASSWORD',
] as const;

const REQUIRED_CLIENT = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_APP_URL',
] as const;

const OPTIONAL_BUT_RECOMMENDED = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'AUSPOST_API_KEY',
  'AUSPOST_API_SECRET',
  'SENTRY_DSN',
] as const;

const DEAD_SHOPIFY_VARS = [
  'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN',
  'NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN',
  'SHOPIFY_STOREFRONT_API_VERSION',
  'SHOPIFY_ADMIN_API_TOKEN',
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
] as const;

function check(name: string): { present: boolean; preview: string } {
  const value = process.env[name];
  if (!value) return { present: false, preview: 'MISSING' };
  const preview = value.length > 8 
    ? `${value.slice(0, 4)}...${value.slice(-4)}` 
    : '****';
  return { present: true, preview };
}

console.log('\n🔴 REQUIRED SERVER VARIABLES');
console.log('─'.repeat(50));
let missingRequired = 0;
for (const name of REQUIRED_SERVER) {
  const { present, preview } = check(name);
  const icon = present ? '✅' : '❌';
  if (!present) missingRequired++;
  console.log(`${icon} ${name.padEnd(30)} ${preview}`);
}

console.log('\n🔵 REQUIRED CLIENT VARIABLES');
console.log('─'.repeat(50));
for (const name of REQUIRED_CLIENT) {
  const { present, preview } = check(name);
  const icon = present ? '✅' : '❌';
  if (!present) missingRequired++;
  console.log(`${icon} ${name.padEnd(30)} ${preview}`);
}

console.log('\n🟡 OPTIONAL BUT RECOMMENDED');
console.log('─'.repeat(50));
for (const name of OPTIONAL_BUT_RECOMMENDED) {
  const { present, preview } = check(name);
  const icon = present ? '✅' : '⚠️';
  console.log(`${icon} ${name.padEnd(30)} ${preview}`);
}

console.log('\n🗑️  DEAD SHOPIFY VARIABLES (should be removed)');
console.log('─'.repeat(50));
let deadCount = 0;
for (const name of DEAD_SHOPIFY_VARS) {
  const { present, preview } = check(name);
  if (present) {
    deadCount++;
    console.log(`🟥 ${name.padEnd(30)} ${preview} ← REMOVE THIS`);
  }
}
if (deadCount === 0) {
  console.log('✅ None found — good cleanup!');
}

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';
console.log('\n' + '═'.repeat(50));
console.log(`SKIP_ENV_VALIDATION: ${skipValidation ? '🔴 ENABLED (dangerous in prod)' : '🟢 disabled'}`);
console.log(`Missing required: ${missingRequired}`);
console.log(`Dead Shopify vars: ${deadCount}`);

if (missingRequired > 0 || deadCount > 0 || skipValidation) {
  console.log('\n⚠️  ACTION REQUIRED before deploying:');
  if (skipValidation) console.log('   1. Remove SKIP_ENV_VALIDATION from Production environment');
  if (deadCount > 0) console.log('   2. Delete all Shopify variables from Vercel');
  if (missingRequired > 0) console.log('   3. Add the missing required variables above');
  process.exit(1);
} else {
  console.log('\n🎉 All environment variables look good for production!');
  process.exit(0);
}
