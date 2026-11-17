import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';

export const SESSION_COOKIE = 'avatarflow_admin';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sign(payload: string): string {
  return createHmac('sha256', config.admin.sessionSecret).update(payload).digest('hex');
}

/** Constant-time compare of two hex strings of equal expected length. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  if (!config.admin.passwordHash) return false;
  return safeEqual(sha256(password), config.admin.passwordHash.toLowerCase());
}

function createToken(): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature, ...extra] = token.split('.');
  if (!payload || !signature || extra.length > 0) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  const expires = Number.parseInt(payload, 10);
  return Number.isFinite(expires) && expires > Date.now();
}

export async function setSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}

/** Throws a 401-shaped error. API routes translate this to a response. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    const err = new Error('UNAUTHORIZED') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
}
