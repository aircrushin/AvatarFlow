import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createRateLimiter, createMemoryStore, type RateLimitStore } from '../src/lib/rate-limit';

// In-process backend: keeps limit tests fast and deterministic on Windows
// (the file backend does ~9 sync fs ops per call and makes a 60-iteration test
// time out). Production still uses the file backend via the default `rateLimit`.
const rateLimit = createRateLimiter(createMemoryStore());

describe('Rate limiter', () => {
  it('allows requests below the limit', () => {
    const key = `test-allow-${Math.random()}`;
    expect(rateLimit(key, 3)).toBe(true);
    expect(rateLimit(key, 3)).toBe(true);
    expect(rateLimit(key, 3)).toBe(true);
  });

  it('blocks requests above the limit', () => {
    const key = `test-block-${Math.random()}`;
    rateLimit(key, 1);
    expect(rateLimit(key, 1)).toBe(false);
  });

  it('blocks the request after the limit inside one window', () => {
    const key = `test-window-${Math.random()}`;
    for (let i = 0; i < 60; i++) expect(rateLimit(key, 60, 60_000)).toBe(true);
    expect(rateLimit(key, 60, 60_000)).toBe(false);
  });

  it('resets the bucket after the window expires', () => {
    const key = `test-expire-${Math.random()}`;
    expect(rateLimit(key, 1, 20)).toBe(true);
    expect(rateLimit(key, 1, 20)).toBe(false);
    const until = Date.now() + 30;
    while (Date.now() < until) {
      // busy-wait; only needs to outlast the 20ms window
    }
    expect(rateLimit(key, 1, 20)).toBe(true);
  });

  it('isolates different keys', () => {
    const k1 = `k1-${Math.random()}`;
    const k2 = `k2-${Math.random()}`;
    expect(rateLimit(k1, 1)).toBe(true);
    expect(rateLimit(k2, 1)).toBe(true);
  });

  it('falls back to memory when the store throws', () => {
    const broken: RateLimitStore = {
      withLock: () => {
        throw new Error('simulated fs failure');
      },
      read: () => ({}),
      write: () => {},
    };
    const fallbackLimit = createRateLimiter(broken);
    const key = `test-fallback-${Math.random()}`;
    expect(fallbackLimit(key, 1)).toBe(true);
    expect(fallbackLimit(key, 1)).toBe(false);
  });

  it('shares buckets across limiter instances backed by the same memory store', () => {
    const store = createMemoryStore();
    const a = createRateLimiter(store);
    const b = createRateLimiter(store);
    const key = `test-shared-${Math.random()}`;
    expect(a(key, 1)).toBe(true);
    expect(b(key, 1)).toBe(false);
  });
});
