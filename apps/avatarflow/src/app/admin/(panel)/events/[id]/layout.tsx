import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { CopyLinkButton, EventTabs } from '@/components/admin/EventTabs';
import { IconExternal } from '@/components/admin/icons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await repos().events.getById(id);
  if (!event) notFound();

  return (
    <main className="adm-page">
      <div className="adm-crumbs">
        <Link href="/admin/events">活动管理</Link>
        <span aria-hidden>/</span>
        <span style={{ color: 'var(--a-ink-2)' }}>{event.name}</span>
      </div>
      <header className="adm-head" style={{ marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="adm-title">{event.name}</h1>
            <StatusBadge status={effectiveStatus(event)} />
          </div>
          <p className="adm-sub adm-mono" style={{ color: 'var(--a-ink-3)' }}>/e/{event.slug}</p>
        </div>
        <div className="adm-head-actions">
          <CopyLinkButton path={`/e/${event.slug}`} />
          <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer" className="adm-btn">
            <IconExternal />打开活动页
          </a>
        </div>
      </header>
      <EventTabs id={event.id} />
      {children}
    </main>
  );
}
