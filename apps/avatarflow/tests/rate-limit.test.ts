import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { rateLimit } from '../src/lib/rate-limit';

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

  it('isolates different keys', () => {
    const k1 = `k1-${Math.random()}`;
    const k2 = `k2-${Math.random()}`;
    expect(rateLimit(k1, 1)).toBe(true);
    expect(rateLimit(k2, 1)).toBe(true);
  });
});
