/**
 * Central runtime configuration.
 *
 * Security rule: the Supabase SERVICE ROLE key and R2 secret key are never
 * imported from client code. This module is server-only; importing it from a
 * client component will fail the build thanks to the `server-only` guard.
 */
import 'server-only';

function str(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  appUrl: str('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  admin: {
    // Password auth for the single admin. A SHA-256 hash of the password.
    passwordHash: str('ADMIN_PASSWORD_HASH'),
    // Secret used to sign the session cookie.
    sessionSecret: str('ADMIN_SESSION_SECRET'),
    email: str('ADMIN_EMAIL', 'admin@avatarflow.local'),
  },

  supabase: {
    url: str('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: str('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    // Server-only. Never expose to the browser.
    serviceRoleKey: str('SUPABASE_SERVICE_ROLE_KEY'),
  },

  r2: {
    accountId: str('R2_ACCOUNT_ID'),
    accessKeyId: str('R2_ACCESS_KEY_ID'),
    secretAccessKey: str('R2_SECRET_ACCESS_KEY'),
    bucket: str('R2_BUCKET', 'avatarflow'),
    publicUrl: str('R2_PUBLIC_URL'),
  },

  limits: {
    logoMaxBytes: int('LOGO_MAX_BYTES', 2 * 1024 * 1024),
    // Each preview render, "regenerate" click and final download hits this
    // endpoint. 30/min was too tight for normal preview-driven editing.
    generatePerMinute: int('GENERATE_RATE_LIMIT', 60),
    trackPerMinute: int('TRACK_RATE_LIMIT', 60),
  },
} as const;

export type BackendMode = 'supabase' | 'local';

/**
 * Supabase is used only when URL + anon key + service role key are all present.
 * Otherwise the local JSON-file backend is used so the project runs offline.
 */
export function backendMode(): BackendMode {
  const { url, anonKey, serviceRoleKey } = config.supabase;
  return url && anonKey && serviceRoleKey ? 'supabase' : 'local';
}

/** R2 is used only when all required credentials are present. */
export function storageMode(): 'r2' | 'local' {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config.r2;
  return accountId && accessKeyId && secretAccessKey && bucket ? 'r2' : 'local';
}

export function requireAdminSecrets(): void {
  if (!config.admin.passwordHash || !config.admin.sessionSecret) {
    throw new Error(
      'Admin auth is not configured. Set ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET.',
    );
  }
}
