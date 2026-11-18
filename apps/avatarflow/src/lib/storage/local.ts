import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StorageAdapter, StoredObject } from './types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export const localStorage: StorageAdapter = {
  async put({ key, body }) {
    const safeKey = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    const dest = path.join(UPLOAD_DIR, safeKey);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return {
      key: safeKey,
      // Relative URL: the browser resolves it against whichever host serves
      // the app, so it works on localhost and after deployment without a
      // build-time NEXT_PUBLIC_APP_URL.
      url: `/uploads/${safeKey.split(path.sep).join('/')}`,
    };
  },
  async remove(key) {
    const safeKey = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    try {
      await fs.unlink(path.join(UPLOAD_DIR, safeKey));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  },
};
