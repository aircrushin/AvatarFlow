import { NextResponse } from 'next/server';
import { apiError, clientIp, handleError } from '@/lib/api';
import { config } from '@/lib/config';
import { repos } from '@/lib/db';
import { composePng, composeSvg } from '@/lib/dicebear/compose';
import { hashSeed, isStyleAllowed, newSeed } from '@/lib/dicebear/engine';
import { canGenerate } from '@/lib/events';
import { rateLimit } from '@/lib/rate-limit';
import { generateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ip = clientIp(req);
    if (!rateLimit(`gen:${ip}:${slug}`, config.limits.generatePerMinute)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfterSeconds: 60 },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return apiError('参数不合法', 400);
    const input = parsed.data;

    // Whitelist check BEFORE any rendering. Never render a style not allowed.
    if (!isStyleAllowed(input.styleName)) return apiError('不允许的头像风格', 400);

    const event = await repos().events.getBySlug(slug);
    if (!event) return apiError('活动不存在', 404);

    // Style must be one the organizer enabled for this event.
    const styleEnabled = event.styles.some((s) => s.styleName === input.styleName);
    if (!styleEnabled) return apiError('该风格未在此活动中启用', 400);

    const available = await canGenerate(event);
    if (!available.ok) return apiError(available.reason, 403);

    // Client may pass a seed to reproduce an avatar; otherwise generate one.
    const seed = input.seed?.trim() || newSeed();

    if (input.format === 'svg') {
      const svg = composeSvg({
        theme: event.theme,
        styleName: input.styleName,
        seed,
        size: input.size,
        options: input.options,
      });
      await repos().generations.record({
        eventId: event.id,
        styleName: input.styleName,
        seedHash: hashSeed(seed),
      });
      await repos().analytics.record({ eventId: event.id, eventType: 'avatar_generate' });
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const png = await composePng({
      theme: event.theme,
      styleName: input.styleName,
      seed,
      size: input.size,
      options: input.options,
    });
    await repos().generations.record({
      eventId: event.id,
      styleName: input.styleName,
      seedHash: hashSeed(seed),
    });
    await repos().analytics.record({ eventId: event.id, eventType: 'avatar_generate' });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'no-store',
        'X-Seed-Id': hashSeed(seed).slice(0, 12),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
