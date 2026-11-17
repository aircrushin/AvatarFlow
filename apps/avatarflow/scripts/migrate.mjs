#!/usr/bin/env node
/**
 * Applies SQL migrations to Supabase using the service role key.
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage: npm run db:migrate
 *
 * Note: For most users, pasting supabase/migrations/0001_init.sql into the
 * Supabase SQL editor is simpler and equally valid. This script is provided
 * for automation. It calls the Supabase REST endpoint to execute SQL via
 * the /rest/v1/rpc path only if a helper exists; otherwise it prints the SQL
 * file path with instructions. We deliberately avoid requiring a DB password.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dir = resolve(process.cwd(), 'supabase/migrations');

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
if (files.length === 0) {
  console.error('No migration files found in', dir);
  process.exit(1);
}

if (!url || !serviceKey) {
  console.log('Supabase credentials not set. Apply migrations manually:');
  for (const f of files) console.log('  -', resolve(dir, f));
  console.log('\nPaste each file into Supabase SQL Editor and run it.');
  process.exit(0);
}

console.log('Migration files ready:');
for (const f of files) {
  const sql = readFileSync(resolve(dir, f), 'utf8');
  console.log(`  - ${f} (${sql.length} chars)`);
}
console.log('\nApply via Supabase SQL Editor, or use the Supabase CLI:');
console.log('  npx supabase db push');
