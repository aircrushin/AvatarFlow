import 'server-only';
import { storageMode } from '@/lib/config';
import { localStorage } from './local';
import { r2Storage } from './r2';
import type { StorageAdapter } from './types';

let cached: StorageAdapter | undefined;

export function storage(): StorageAdapter {
  if (!cached) cached = storageMode() === 'r2' ? r2Storage : localStorage;
  return cached;
}

export type { StorageAdapter, StoredObject } from './types';
