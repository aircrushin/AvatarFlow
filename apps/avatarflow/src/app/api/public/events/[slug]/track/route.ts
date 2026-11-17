import { NextResponse } from 'next/server';
import { apiError, clientIp, handleError } from '@/lib/api';
import { config } from '@/lib/config';
import { repos } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { trackSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ip = clientIp(req);
    if (!rateLimit(`track:${ip}:${slug}`, config.limits.trackPerMinute)) {
      return apiError('请求过于频繁', 429);
    }

    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return apiError('参数不合法', 400);

    const event = await repos().events.getBySlug(slug);
    if (!event) return apiError('活动不存在', 404);

    const result = await repos().analytics.record({
      eventId: event.id,
      eventType: parsed.data.eventType,
      visitorId: parsed.data.visitorId,
    });
    return NextResponse.json({ ok: true, counted: result.counted });
  } catch (err) {
    return handleError(err);
  }
}
