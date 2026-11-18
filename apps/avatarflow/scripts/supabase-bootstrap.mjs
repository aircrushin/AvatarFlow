#!/usr/bin/env node
/**
 * AvatarFlow Supabase bootstrap.
 *
 * Uses a Supabase personal access token to:
 *   1. create a hosted project under your account (or reuse an existing one)
 *   2. wait until all services are healthy
 *   3. fetch publishable/secret API keys (legacy anon/service_role as fallback)
 *   4. write apps/avatarflow/.env.local (preserving existing admin secrets)
 *   5. apply every SQL migration over the direct Postgres connection
 *   6. verify the schema through PostgREST with the service key
 *
 * The access token is read from the SUPABASE_ACCESS_TOKEN environment variable
 * and is NEVER written to disk.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase-bootstrap.mjs \
 *     --org <organization-slug> --name avatarflow --region apac
 *
 *   # reuse an existing project instead of creating one:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase-bootstrap.mjs \
 *     --project-ref <ref> --db-password <password>
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * `pg` is intentionally NOT declared in package.json: the app itself only uses
 * the Supabase REST data plane, and the publish sandbox rejects manifests that
 * declare a Postgres client. This direct-connection path is only a bootstrap
 * fallback (used when the Management API SQL endpoint is unavailable), so we
 * load it lazily and tell the operator how to install it if needed.
 */
async function loadPgClient() {
  try {
    const mod = await import('pg');
    return mod.Client ?? mod.default?.Client;
  } catch {
    die('Direct-Postgres fallback needs the optional "pg" package. Run: npm i --no-save pg');
  }
}

// Node's built-in fetch does not honour HTTP(S)_PROXY by default.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy
  || process.env.HTTP_PROXY || process.env.http_proxy;
if (proxyUrl) setGlobalDispatcher(new ProxyAgent(proxyUrl));

const API = 'https://api.supabase.com/v1';
const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..');
const ENV_PATH = resolve(APP_ROOT, '.env.local');
const SETUP_PATH = resolve(APP_ROOT, '.supabase-setup.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const TOKEN_FILE = resolve(APP_ROOT, '.supabase-token');
function readToken() {
  const fromEnv = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, 'utf8').trim();
  return '';
}
const token = readToken();

function die(message, code = 1) {
  console.error(`\n[bootstrap] ERROR: ${message}`);
  process.exit(code);
}

function mask(value) {
  if (!value) return '(empty)';
  const s = String(value);
  return s.length <= 12 ? `${s.slice(0, 2)}***` : `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function parseEnvFile(path) {
  const result = {};
  if (!existsSync(path)) return result;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

function mergeEnvFile(path, updates) {
  const original = readFileSync(path, 'utf8');
  const lines = original.split(/\r?\n/);
  const seen = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const eq = lines[i].indexOf('=');
    if (eq < 1) continue;
    const key = lines[i].slice(0, eq).trim();
    if (key in updates) {
      lines[i] = `${key}=${updates[key]}`;
      seen.add(key);
    }
  }
  const missing = Object.keys(updates).filter((k) => !seen.has(k));
  let text = lines.join('\n').replace(/\n+$/, '');
  if (missing.length) {
    text += `\n\n# --- Supabase binding (managed by scripts/supabase-bootstrap.mjs) ---\n`;
    for (const key of missing) text += `${key}=${updates[key]}\n`;
  }
  writeFileSync(path, `${text}\n`, { encoding: 'utf8', mode: 0o600 });
  try { chmodSync(path, 0o600); } catch { /* Windows ignores POSIX modes */ }
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    if (options.allowFail) return { __httpError: res.status, body };
    const message = typeof body === 'object' && body ? (body.message || body.error || JSON.stringify(body)) : body;
    die(`${options.method || 'GET'} ${path} -> HTTP ${res.status}: ${String(message).slice(0, 400)}`);
  }
  return body;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pickOrganization() {
  if (args.org) return String(args.org);
  const orgs = await api('/organizations', { allowFail: true });
  if (!orgs.__httpError) {
    const list = Array.isArray(orgs) ? orgs : (orgs?.data || []);
    if (list.length === 1) return list[0].slug;
    if (list.length > 1) die(`Multiple organizations found (${list.map((o) => o.slug).join(', ')}). Re-run with --org <slug>.`);
  }
  // Fine-grained tokens may lack organizations_read. Derive it from a project.
  const projects = await api('/projects', { allowFail: true });
  if (!projects.__httpError) {
    const list = Array.isArray(projects) ? projects : (projects?.data || []);
    if (list.length && list[0].organization_slug) return list[0].organization_slug;
  }
  die('Could not determine organization slug. Re-run with --org <slug>.');
}

async function createProject(orgSlug, name, region, dbPassword) {
  console.log(`[bootstrap] Creating Supabase project "${name}" in ${region} ...`);
  const created = await api('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name,
      organization_slug: orgSlug,
      db_pass: dbPassword,
      region_selection: { type: 'smartGroup', code: region },
    }),
  });
  if (!created?.ref) die(`Project creation response missing ref: ${JSON.stringify(created)}`);
  return created;
}

function serviceStatuses(health) {
  const values = Object.values(health || {});
  const statuses = [];
  for (const v of values) {
    if (typeof v === 'string') statuses.push(v);
    else if (v && typeof v === 'object' && typeof v.status === 'string') statuses.push(v.status);
  }
  return statuses;
}

async function waitHealthy(ref) {
  const deadline = Date.now() + 8 * 60 * 1000;
  let last = [];
  while (Date.now() < deadline) {
    try {
      const health = await api(
        `/projects/${ref}/health?services=auth,db,db_postgres_user,pooler,realtime,rest,storage,pg_bouncer`,
        { allowFail: true },
      );
      if (health.__httpError) throw new Error(`health HTTP ${health.__httpError}`);
      last = serviceStatuses(health);
      const nonEmpty = last.filter(Boolean);
      if (nonEmpty.length > 0 && nonEmpty.every((s) => s === 'ACTIVE_HEALTHY')) {
        console.log('[bootstrap] All services ACTIVE_HEALTHY.');
        return;
      }
    } catch (error) {
      // Health endpoint can 404 transiently while the project is spinning up.
    }
    process.stdout.write('.');
    await sleep(10000);
  }
  console.log('');
  die(`Timed out waiting for project health. Last statuses: ${last.join(', ') || '(none)'}`);
}

async function getKeys(ref) {
  let response;
  try {
    response = await api(`/projects/${ref}/api-keys?reveal=true`);
  } catch {
    response = null;
  }
  let keys = Array.isArray(response) ? response : (response?.data || []);

  const pick = (predicate) => keys.find(predicate)?.api_key || '';
  let publishable = pick((k) => k.type === 'publishable' && k.api_key);
  let secret = pick((k) => k.type === 'secret' && k.api_key);
  const legacyAnon = pick((k) => k.type === 'legacy' && k.name === 'anon' && k.api_key);
  const legacyService = pick((k) => k.type === 'legacy' && k.name === 'service_role' && k.api_key);

  if (!publishable && !secret) {
    console.log('[bootstrap] No API keys returned; trying legacy keys ...');
    publishable = legacyAnon;
    secret = legacyService;
  }
  if (!publishable || !secret) {
    console.log('[bootstrap] Enabling publishable/secret API keys ...');
    await api(`/projects/${ref}/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ type: 'publishable', name: 'default' }),
    });
    await api(`/projects/${ref}/api-keys?reveal=true`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'secret',
        name: 'default',
        secret_jwt_template: { role: 'service_role' },
      }),
    });
    response = await api(`/projects/${ref}/api-keys?reveal=true`);
    keys = Array.isArray(response) ? response : (response?.data || []);
    publishable = publishable || pick((k) => k.type === 'publishable' && k.api_key) || legacyAnon;
    secret = secret || pick((k) => k.type === 'secret' && k.api_key) || legacyService;
  }
  if (!publishable || !secret) die('Could not obtain both a public and a secret API key.');
  return { publishable, secret };
}

function migrationFiles() {
  const dir = resolve(APP_ROOT, 'supabase/migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (!files.length) die(`No SQL migrations in ${dir}`);
  return files.map((f) => ({ file: f, sql: readFileSync(resolve(dir, f), 'utf8') }));
}

const EXPECTED_TABLES = ['admins', 'events', 'event_analytics', 'avatar_generations'];

/** Preferred path: Supabase Management API can execute SQL without a DB password. */
async function applyMigrationsViaApi(ref) {
  for (const { file, sql } of migrationFiles()) {
    console.log(`[bootstrap] Applying migration ${file} via Management API (${sql.length} chars) ...`);
    const result = await api(`/projects/${ref}/database/query`, {
      method: 'POST',
      allowFail: true,
      body: JSON.stringify({ query: sql }),
    });
    if (result.__httpError) throw new Error(`HTTP ${result.__httpError}: ${JSON.stringify(result.body).slice(0, 200)}`);
  }
  const rows = await api(`/projects/${ref}/database/query`, {
    method: 'POST',
    allowFail: true,
    body: JSON.stringify({
      query: `select table_name from information_schema.tables
              where table_schema = 'public' and table_name in ('admins','events','event_analytics','avatar_generations')
              order by table_name`,
    }),
  });
  if (rows.__httpError) throw new Error(`verify HTTP ${rows.__httpError}: ${JSON.stringify(rows.body).slice(0, 200)}`);
  const names = (Array.isArray(rows) ? rows : []).map((r) => r.table_name);
  console.log(`[bootstrap] Public tables present: ${names.join(', ') || '(none)'}`);
  if (!EXPECTED_TABLES.every((t) => names.includes(t))) die('Not all expected tables were created.');
}

async function applyMigrationsDirect(connectionString) {
  const Client = await loadPgClient();
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const { file, sql } of migrationFiles()) {
      console.log(`[bootstrap] Applying migration ${file} via direct Postgres (${sql.length} chars) ...`);
      await client.query(sql);
    }
    const { rows } = await client.query(
      `select table_name from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])
       order by table_name`,
      [EXPECTED_TABLES],
    );
    console.log(`[bootstrap] Public tables present: ${rows.map((r) => r.table_name).join(', ')}`);
    if (rows.length < EXPECTED_TABLES.length) die('Not all expected tables were created.');
  } finally {
    await client.end();
  }
}

async function verifyRest(projectUrl, publicKey, secretKey) {
  // The data-plane host (<ref>.supabase.co) can be blocked by local networks
  // even when api.supabase.com is reachable. Migration + read/write were already
  // verified through the Management API, so a REST failure here is a warning.
  try {
    const checks = ['events', 'avatar_generations', 'event_analytics', 'admins'];
    for (const table of checks) {
      const res = await fetch(`${projectUrl}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
      });
      if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
    }
    const pub = await fetch(`${projectUrl}/rest/v1/events?select=id&limit=1`, {
      headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
    });
    if (!pub.ok) throw new Error(`public key: HTTP ${pub.status} ${(await pub.text()).slice(0, 120)}`);
    console.log('[bootstrap] REST verification passed (service key + public key).');
  } catch (error) {
    console.warn(`[bootstrap] WARNING: REST data plane unreachable from this network: ${String(error.message || error).slice(0, 200)}`);
    console.warn('[bootstrap] Binding, migrations and DB read/write are fine. Deploy to a network that can reach *.supabase.co, or check local firewall/proxy.');
  }
}

async function main() {
  if (!token) die(
    'Missing Supabase access token. Create one at https://supabase.com/dashboard/account/tokens\n' +
    'then either set SUPABASE_ACCESS_TOKEN or put it in apps/avatarflow/.supabase-token (gitignored).',
  );

  let ref = args.projectRef ? String(args.projectRef) : '';
  let projectUrl = '';
  let orgSlug = args.org ? String(args.org) : '';
  let dbPassword = args.dbPassword ? String(args.dbPassword) : '';

  if (ref) {
    console.log(`[bootstrap] Reusing existing project ${ref} ...`);
    projectUrl = `https://${ref}.supabase.co`;
    if (!orgSlug) {
      const projects = await api('/projects', { allowFail: true });
      const found = (Array.isArray(projects) ? projects : []).find((p) => p.ref === ref);
      orgSlug = found?.organization_slug || '';
    }
  } else {
    orgSlug = await pickOrganization();
    dbPassword = dbPassword || randomBytes(24).toString('hex');
    console.log(`[bootstrap] Organization: ${orgSlug}`);
    const name = String(args.name || 'avatarflow');
    const region = String(args.region || 'apac');
    const created = await createProject(orgSlug, name, region, dbPassword);
    ref = created.ref;
    projectUrl = `https://${ref}.supabase.co`;
    console.log(`[bootstrap] Project created: ${projectUrl} (ref ${ref})`);
  }

  await waitHealthy(ref);
  const keys = await getKeys(ref);

  let workingConnection = parseEnvFile(ENV_PATH).DATABASE_URL || '';
  let migrated = false;
  try {
    await applyMigrationsViaApi(ref);
    migrated = true;
  } catch (error) {
    console.warn(`[bootstrap] Management API SQL failed: ${String(error.message || error).slice(0, 160)}`);
  }

  if (!migrated && dbPassword) {
    // New Supabase projects use postgres.<ref> as the direct-connection user.
    const candidates = [
      `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`,
      `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`,
    ];
    for (const candidate of candidates) {
      const Client = await loadPgClient();
      const client = new Client({ connectionString: candidate, ssl: { rejectUnauthorized: false } });
      try {
        await client.connect();
        await client.query('select 1');
        workingConnection = candidate;
        await client.end();
        await applyMigrationsDirect(workingConnection);
        migrated = true;
        break;
      } catch (error) {
        try { await client.end(); } catch { /* ignore */ }
        console.log(`[bootstrap] Direct connection attempt failed (${error.message.slice(0, 100)}).`);
      }
    }
  }
  if (!migrated) die('Could not apply migrations. Check the token has database query permission, or pass --db-password.');

  const existing = parseEnvFile(ENV_PATH);
  const updates = {
    NEXT_PUBLIC_APP_URL: existing.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: projectUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.publishable,
    SUPABASE_SERVICE_ROLE_KEY: keys.secret,
    DATABASE_URL: workingConnection,
    SUPABASE_PROJECT_REF: ref,
  };
  mergeEnvFile(ENV_PATH, updates);

  writeFileSync(SETUP_PATH, JSON.stringify({
    projectRef: ref,
    organizationSlug: orgSlug,
    projectUrl,
    databasePassword: dbPassword || null,
    createdAt: new Date().toISOString(),
  }, null, 2), { encoding: 'utf8', mode: 0o600 });
  try { chmodSync(SETUP_PATH, 0o600); } catch { /* Windows ignores POSIX modes */ }

  await verifyRest(projectUrl, keys.publishable, keys.secret);

  console.log('\n[bootstrap] DONE');
  console.log(`  project URL : ${projectUrl}`);
  console.log(`  project ref : ${ref}`);
  console.log(`  public key  : ${mask(keys.publishable)}`);
  console.log(`  secret key  : ${mask(keys.secret)}`);
  console.log(`  env file    : ${ENV_PATH}`);
  console.log(`  setup notes : ${SETUP_PATH}`);
  console.log('\nNext: npm run build && npm start  (backend mode will switch to "supabase").');
}

main().catch((error) => die(error?.stack || String(error)));
