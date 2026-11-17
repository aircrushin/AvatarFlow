import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { repos } from '@/lib/db';
import { isStyleAllowed } from '@/lib/dicebear/engine';
import { createEventSchema } from '@/lib/validation';
import { DEFAULT_THEME, type EventFull } from '@/lib/types';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ events: await repos().events.list() });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? '参数不合法', 400);
    }
    const input = parsed.data;

    for (const s of input.styles) {
      if (!isStyleAllowed(s.styleName)) {
        return apiError(`风格 ${s.styleName} 不在允许列表中`, 400);
      }
    }

    if (await repos().events.slugExists(input.slug)) {
      return apiError('该活动路径已被占用', 409);
    }

    const now = new Date().toISOString();
    const event: EventFull = {
      id: randomUUID(),
      slug: input.slug,
      name: input.name,
      subtitle: input.subtitle,
      description: input.description,
      status: input.status,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      generationLimit: input.generationLimit ?? null,
      createdAt: now,
      updatedAt: now,
      theme: { ...DEFAULT_THEME, ...input.theme },
      styles: input.styles.map((s, i) => ({
        styleName: s.styleName,
        styleOptions: s.styleOptions,
        sortOrder: s.sortOrder ?? i,
      })),
    };
    await repos().events.create(event);
    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
