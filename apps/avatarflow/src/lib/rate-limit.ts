import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Storage backend for the limiter. `withLock` serializes the read-modify-write
 * cycle; `read`/`write` persist buckets. Implementations can use a lock file
 * (cross-process sharing in dev), memory (Workers, tests), or Redis
 * (multi-instance production).
 */
export interface RateLimitStore {
  withLock<T>(fn: () => T): T;
  read(): Record<string, Bucket>;
  write(data: Record<string, Bucket>): void;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE = path.join(DATA_DIR, 'rate-limit.json');
const LOCK = path.join(DATA_DIR, 'rate-limit.lock');

/** Buckets shared across duplicate module copies via globalThis. */
function memoryBuckets(): Record<string, Bucket> {
  const g = globalThis as typeof globalThis & { __avatarflowRateBuckets?: Record<string, Bucket> };
  g.__avatarflowRateBuckets ??= {};
  return g.__avatarflowRateBuckets;
}

/** In-process backend. Used in Workers (no fs) and tests. */
export function createMemoryStore(): RateLimitStore {
  const g = globalThis as typeof globalThis & { __avatarflowRateBuckets?: Record<string, Bucket> };
  return {
    withLock: (fn) => fn(),
    read: () => ({ ...memoryBuckets() }),
    write: (data) => {
      g.__avatarflowRateBuckets = data;
    },
  };
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

/**
 * File-backed backend: shares buckets across the Next.js dev worker pool via a
 * lock file. A failed lock or disk I/O is signalled by throwing, which makes
 * the limiter fall back to the in-process store.
 */
const fileStore: RateLimitStore = {
  withLock(fn) {
    const fd = acquireLock();
    if (fd === undefined) throw new Error('rate-limit lock unavailable');
    try {
      return fn();
    } finally {
      releaseLock(fd);
    }
  },
  read: readStore,
  write: writeStore,
};

function decide(
  current: Bucket | undefined,
  limit: number,
  windowMs: number,
  now: number,
): { allowed: boolean; bucket: Bucket } {
  if (!current || current.resetAt <= now) {
    return { allowed: true, bucket: { count: 1, resetAt: now + windowMs } };
  }
  if (current.count >= limit) return { allowed: false, bucket: current };
  return { allowed: true, bucket: { count: current.count + 1, resetAt: current.resetAt } };
}

/** Fallback when the primary store throws (read-only fs, Workers, lock busy). */
function consumeMemory(key: string, limit: number, windowMs: number): boolean {
  const store = createMemoryStore();
  const now = Date.now();
  const data = store.read();
  for (const name of Object.keys(data)) {
    if (data[name]!.resetAt <= now) delete data[name];
  }
  const result = decide(data[key], limit, windowMs, now);
  data[key] = result.bucket;
  store.write(data);
  return result.allowed;
}

/** Build a limiter on top of `store`. */
export function createRateLimiter(store: RateLimitStore) {
  return function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
    try {
      return store.withLock(() => {
        const now = Date.now();
        const data = store.read();
        for (const name of Object.keys(data)) {
          if (data[name]!.resetAt <= now) delete data[name];
        }
        const result = decide(data[key], limit, windowMs, now);
        data[key] = result.bucket;
        store.write(data);
        return result.allowed;
      });
    } catch {
      return consumeMemory(key, limit, windowMs);
    }
  };
}

/** Default limiter: cross-process file backend with in-process fallback. */
export const rateLimit = createRateLimiter(fileStore);
