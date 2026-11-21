// Emit Worker secrets as a JSON object on stdout for `wrangler secret bulk`.
// Reads .env.local at runtime so secrets never enter the repository.
// Usage: node scripts/cf-secrets.mjs | npx wrangler secret bulk avatarflow
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_PASSWORD_HASH',
  'ADMIN_SESSION_SECRET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
];

const envText = await readFile(resolve(process.cwd(), '.env.local'), 'utf8');
const env = new Map();
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx < 0) continue;
  env.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim());
}

const missing = KEYS.filter((key) => !env.get(key));
if (missing.length) {
  console.error('Missing secrets in .env.local:', missing.join(', '));
  process.exit(1);
}

const secrets = Object.fromEntries(KEYS.map((key) => [key, env.get(key)]));
process.stdout.write(JSON.stringify(secrets) + '\n');
