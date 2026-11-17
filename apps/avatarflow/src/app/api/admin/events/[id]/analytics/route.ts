import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { repos } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const event = await repos().events.getById(id);
    if (!event) return apiError('活动不存在', 404);

    const url = new URL(req.url);
    const format = url.searchParams.get('format');

    if (format === 'csv') {
      const rows = await repos().analytics.exportRows(id);
      const header = 'id,event_id,event_type,created_at';
      const lines = rows.map((r) =>
        [r.id, r.eventId, r.eventType, r.createdAt]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      );
      const csv = [header, ...lines].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="analytics-${event.slug}.csv"`,
        },
      });
    }

    const daysRaw = Number.parseInt(url.searchParams.get('days') ?? '7', 10);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 7;
    const [counts, series, generationCount] = await Promise.all([
      repos().analytics.countByType(id),
      repos().analytics.dailySeries(id, days),
      repos().generations.countForEvent(id),
    ]);
    return NextResponse.json({ counts, series, generationCount });
  } catch (err) {
    return handleError(err);
  }
}
