import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { repos } from '@/lib/db';
import { isStyleAllowed } from '@/lib/dicebear/engine';
import { updateEventSchema } from '@/lib/validation';
import type { EventFull } from '@/lib/types';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const event = await repos().events.getById(id);
    if (!event) return apiError('活动不存在', 404);
    return NextResponse.json(event);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? '参数不合法', 400);
    }
    const patch = parsed.data;

    if (patch.styles) {
      for (const s of patch.styles) {
        if (!isStyleAllowed(s.styleName)) {
          return apiError(`风格 ${s.styleName} 不在允许列表中`, 400);
        }
      }
    }

    const cleaned: Partial<EventFull> = { ...patch } as Partial<EventFull>;
    const updated = await repos().events.update(id, cleaned);
    if (!updated) return apiError('活动不存在', 404);
    return NextResponse.json(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const ok = await repos().events.remove(id);
    if (!ok) return apiError('活动不存在', 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
