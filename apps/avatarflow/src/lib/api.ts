import { NextResponse } from 'next/server';

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiOk<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 200 });
}

/** Normalizes thrown errors from repos/auth into API responses. */
export function handleError(err: unknown): NextResponse {
  const e = err as Error & { status?: number };
  if (e?.status === 401) return apiError('未授权', 401);
  if (e?.message === 'SLUG_CONFLICT') return apiError('该活动路径已被占用', 409);
  if (e?.message === 'STYLE_NOT_ALLOWED') return apiError('不允许的头像风格', 400);
  console.error('[api]', err);
  return apiError('服务器内部错误', 500);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
