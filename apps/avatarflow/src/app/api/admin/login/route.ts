import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, clientIp, handleError } from '@/lib/api';
import { requireAdminSecrets } from '@/lib/config';
import { setSessionCookie, verifyPassword } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({ password: z.string().min(1).max(256) });

export async function POST(req: Request) {
  try {
    if (!rateLimit(`login:${clientIp(req)}`, 10, 60_000)) {
      return apiError('尝试次数过多，请稍后再试', 429);
    }
    requireAdminSecrets();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError('密码不能为空', 400);
    if (!verifyPassword(parsed.data.password)) return apiError('密码错误', 401);
    await setSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
