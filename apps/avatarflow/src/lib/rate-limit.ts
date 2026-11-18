import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Next.js dev compiles route handlers in a worker pool. A module-level Map
 * lives in whichever worker handled the request, so a 60/min limit silently
 * becomes 60 per worker. Buckets are stored in a lock file every process on
 * this machine can see. If the disk is not writable, fall back to a
 * process-wide Map (still shared across duplicate module copies via globalThis).
 */
const DATA_DIR = path.join(process.cwd(), '.data');
const STORE = path.join(DATA_DIR, 'rate-limit.json');
const LOCK = path.join(DATA_DIR, 'rate-limit.lock');

function memoryStore(): Map<string, Bucket> {
  const g = globalThis as typeof globalThis & { __avatarflowRateBuckets?: Map<string, Bucket> };
  g.__avatarflowRateBuckets ??= new Map();
  return g.__avatarflowRateBuckets;
}

function readStore(): Record<string, Bucket> {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE, 'utf8')) as Record<string, Bucket>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, Bucket>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${STORE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  try {
    fs.unlinkSync(STORE);
  } catch {
    // first write
  }
  try {
    fs.renameSync(tmp, STORE);
  } catch {
    fs.writeFileSync(STORE, JSON.stringify(data));
    try {
      fs.unlinkSync(tmp);
    } catch {
      // temp file already gone
    }
  }
}

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Returns the lock fd, or undefined when the lock cannot be taken. */
function acquireLock(): number | undefined {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const start = Date.now();
  while (Date.now() - start < 1500) {
    try {
      return fs.openSync(LOCK, 'wx');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') return undefined;
      try {
        const stat = fs.statSync(LOCK);
        if (Date.now() - stat.mtimeMs > 3000) fs.unlinkSync(LOCK);
      } catch {
        // another worker just released it
      }
      sleepMs(5);
    }
  }
  return undefined;
}

function releaseLock(fd: number): void {
  try {
    fs.closeSync(fd);
  } catch {
    // already closed
  }
  try {
    fs.unlinkSync(LOCK);
  } catch {
    // already released
  }
}

function decide(current: Bucket | undefined, limit: number, windowMs: number, now: number): { allowed: boolean; bucket: Bucket } {
  if (!current || current.resetAt <= now) {
    return { allowed: true, bucket: { count: 1, resetAt: now + windowMs } };
  }
  if (current.count >= limit) return { allowed: false, bucket: current };
  return { allowed: true, bucket: { count: current.count + 1, resetAt: current.resetAt } };
}

function consumeMemory(key: string, limit: number, windowMs: number): boolean {
  const store = memoryStore();
  const result = decide(store.get(key), limit, windowMs, Date.now());
  store.set(key, result.bucket);
  return result.allowed;
}

/**
 * Fixed-window limiter. Returns true when the request is allowed.
 * `limit` counts successful admissions in `windowMs` (default 60s).
 */
export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  let fd: number | undefined;
  try {
    fd = acquireLock();
    if (fd === undefined) return consumeMemory(key, limit, windowMs);
    const now = Date.now();
    const store = readStore();
    for (const name of Object.keys(store)) {
      if (store[name]!.resetAt <= now) delete store[name];
    }
    const result = decide(store[key], limit, windowMs, now);
    store[key] = result.bucket;
    writeStore(store);
    return result.allowed;
  } catch {
    return consumeMemory(key, limit, windowMs);
  } finally {
    if (fd !== undefined) releaseLock(fd);
  }
}
