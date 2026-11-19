import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

// localStorage imports `server-only`, which throws outside a server context.
vi.mock('server-only', () => ({}));

import { localStorage } from '../src/lib/storage/local';

describe('localStorage.get', () => {
  it('reads back a stored object by its returned URL', async () => {
    const key = `logos/test/${randomUUID()}.png`;
    const body = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const stored = await localStorage.put({ key, body, contentType: 'image/png' });
    try {
      const read = await localStorage.get(stored.url);
      expect(read).not.toBeNull();
      expect(read!.equals(body)).toBe(true);
    } finally {
      await localStorage.remove(key);
    }
  });

  it('returns null for a missing object', async () => {
    const read = await localStorage.get(`/uploads/logos/test/${randomUUID()}.png`);
    expect(read).toBeNull();
  });

  it('returns null for a URL outside the uploads prefix', async () => {
    expect(await localStorage.get('https://example.com/logo.png')).toBeNull();
  });
});
