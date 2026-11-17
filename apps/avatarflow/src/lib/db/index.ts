import 'server-only';
import { backendMode } from '@/lib/config';
import { localRepositories } from './local';
import { supabaseRepositories } from './supabase';
import type { Repositories } from './types';

let cached: Repositories | undefined;

/** Returns the active repository set based on environment configuration. */
export function repos(): Repositories {
  if (!cached) {
    cached = backendMode() === 'supabase' ? supabaseRepositories : localRepositories;
  }
  return cached;
}

export type { Repositories } from './types';
