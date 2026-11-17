#!/usr/bin/env node
/**
 * Verify the active Supabase binding.
 *
 * Two independent checks:
 *   1. Management API + database/query — works even when *.supabase.co is blocked
 *      by a local firewall/proxy (requires .supabase-token or SUPABASE_ACCESS_TOKEN).
 *   2. REST data plane via the publishable/secret keys — the path the app uses.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy
  || process.env.HTTP_PROXY || process.env.http_proxy;
if (proxyUrl) setGlobalDispatcher(new ProxyAgent(proxyUrl));

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(APP_ROOT, '.env.local');
const TOKEN_PATH = resolve(APP_ROOT, '.supabase-token');

function loadFile(path) {
  const result = {};
  if (!existsSync(path)) return result;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) result[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return result;
}

const env = { ...loadFile(ENV_PATH), ...process.env };
const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const publicKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const secretKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const ref = (env.SUPABASE_PROJECT_REF || '').trim();
const token = (env.SUPABASE_ACCESS_TOKEN || '').trim()
  || (existsSync(TOKEN_PATH) ? readFileSync(TOKEN_PATH, 'utf8').trim() : '');

if (!url || !publicKey || !secretKey) {
  console.error('Supabase is not bound: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must all be set.');
  process.exit(1);
}

console.log(`Project: ${url}`);
let dbOk = false;

if (token && ref) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `select table_name from information_schema.tables
                where table_schema='public'
                  and table_name in ('admins','events','event_analytics','avatar_generations')
                order by table_name`,
      }),
    });
    const rows = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(rows).slice(0, 160));
    const names = (Array.isArray(rows) ? rows : []).map((r) => r.table_name);
    console.log(`  Management API DB : OK (${names.join(', ')})`);
    dbOk = names.length === 4;
  } catch (error) {
    console.log(`  Management API DB : FAILED (${error.message})`);
  }
}

async function restCheck(label, key) {
  try {
    const res = await fetch(`${url}/rest/v1/events?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = res.ok ? '' : (await res.text()).slice(0, 120);
    console.log(`  REST ${label.padEnd(12)}: ${res.ok ? 'OK' : `HTTP ${res.status} ${body}`}`);
    return res.ok;
  } catch (error) {
    console.log(`  REST ${label.padEnd(12)}: unreachable (${error.message})`);
    return false;
  }
}

const serviceRest = await restCheck('service key', secretKey);
const publicRest = await restCheck('public key', publicKey);

if (dbOk && serviceRest && publicRest) {
  console.log('Supabase binding is fully healthy.');
} else if (dbOk) {
  console.log('Database binding OK. REST data plane is unreachable from this network — the app will need a network that can reach *.supabase.co.');
} else {
  console.error('Supabase binding verification failed.');
  process.exit(1);
}
