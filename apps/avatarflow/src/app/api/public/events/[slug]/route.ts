import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';
import type { PublicEvent } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const event = await repos().events.getBySlug(slug);
    if (!event) return apiError('活动不存在', 404);

    const status = effectiveStatus(event);
    if (status === 'draft' || status === 'paused') {
      return apiError('活动暂未开放', 403);
    }

    const payload: PublicEvent = {
      slug: event.slug,
      name: event.name,
      subtitle: event.subtitle,
      description: event.description,
      status,
      theme: event.theme,
      styles: [...event.styles]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({ styleName: s.styleName, styleOptions: s.styleOptions })),
    };
    return NextResponse.json(payload);
  } catch (err) {
    return handleError(err);
  }
}
