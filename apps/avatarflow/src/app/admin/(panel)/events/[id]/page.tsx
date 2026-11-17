import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repos } from '@/lib/db';
import { EventEditor } from './EventEditor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await repos().events.getById(id);
  if (!event) notFound();

  const tabs = [
    { href: `/admin/events/${id}`, label: '配置', active: true },
    { href: `/admin/events/${id}/analytics`, label: '数据统计', active: false },
    { href: `/admin/events/${id}/assets`, label: '素材管理', active: false },
  ];

  return (
    <main style={{ maxWidth: 820 }}>
      <Link href="/admin/events" className="faint" style={{ fontSize: 13 }}>← 活动列表</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '20px 0 24px' }}>
        <div>
          <p className="eyebrow">Edit event</p>
          <h1 style={{ fontSize: 26, letterSpacing: '-0.025em', margin: '8px 0 0' }}>{event.name}</h1>
        </div>
        <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ minHeight: 38, fontSize: 13 }}>预览活动 ↗</a>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} style={{ padding: '10px 16px', fontSize: 14, borderBottom: t.active ? '2px solid var(--ink)' : '2px solid transparent', color: t.active ? 'var(--ink)' : 'var(--ink-faint)' }}>
            {t.label}
          </Link>
        ))}
      </div>

      <EventEditor event={event} />
    </main>
  );
}
