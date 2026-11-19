import Link from 'next/link';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';
import { relativeTime } from '@/lib/format';
import type { EventStatus } from '@/lib/types';
import { STATUS_LABEL, StatusBadge } from '@/components/admin/StatusBadge';
import { IconChart, IconEvents, IconExternal, IconPlus } from '@/components/admin/icons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILTERS: Array<EventStatus | 'all'> = ['all', 'active', 'draft', 'paused', 'expired'];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const filter = (FILTERS as string[]).includes(raw ?? '') ? (raw as EventStatus | 'all') : 'all';

  const events = await repos().events.list();
  const rows = await Promise.all(
    events.map(async (e) => ({
      event: e,
      status: effectiveStatus(e),
      generations: await repos().generations.countForEvent(e.id),
    })),
  );
  rows.sort((a, b) => Date.parse(b.event.updatedAt) - Date.parse(a.event.updatedAt));

  const countOf = (f: EventStatus | 'all') => (f === 'all' ? rows.length : rows.filter((r) => r.status === f).length);
  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <main className="adm-page">
      <header className="adm-head adm-rise">
        <div>
          <h1 className="adm-title">活动管理</h1>
          <p className="adm-sub">管理所有品牌头像活动的配置、状态与数据。</p>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/events/new" className="adm-btn adm-btn-lime"><IconPlus />新建活动</Link>
        </div>
      </header>

      <div className="adm-rise adm-rise-1" style={{ marginBottom: 14 }}>
        <nav className="adm-seg" aria-label="按状态筛选">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === 'all' ? '/admin/events' : `/admin/events?status=${f}`}
              aria-current={filter === f ? 'page' : undefined}
              scroll={false}
            >
              {f === 'all' ? '全部' : STATUS_LABEL[f]}
              <span className="adm-count">{countOf(f)}</span>
            </Link>
          ))}
        </nav>
      </div>

      <section className="adm-card adm-rise adm-rise-2" style={{ overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-art"><IconEvents /></div>
            <h3>{rows.length === 0 ? '还没有活动' : `没有「${STATUS_LABEL[filter as EventStatus]}」的活动`}</h3>
            <p>{rows.length === 0 ? '新建一个活动，配置品牌元素后即可生成扫码链接。' : '切换筛选条件查看其他活动。'}</p>
            {rows.length === 0 && <Link href="/admin/events/new" className="adm-btn"><IconPlus />新建活动</Link>}
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>活动</th>
                <th style={{ width: 120 }}>状态</th>
                <th style={{ width: 100, textAlign: 'right' }}>生成</th>
                <th style={{ width: 130 }}>上限</th>
                <th style={{ width: 130 }}>更新于</th>
                <th style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {visible.map(({ event: e, status, generations }) => (
                <tr key={e.id} className="adm-row-link">
                  <td>
                    <Link href={`/admin/events/${e.id}`} className="adm-row-cover adm-cell-title">{e.name}</Link>
                    <div className="adm-cell-sub">
                      <span className="adm-mono">/e/{e.slug}</span>
                      {e.subtitle && <span> · {e.subtitle}</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={status} /></td>
                  <td className="adm-mono" style={{ textAlign: 'right', fontSize: 13 }}>{generations.toLocaleString()}</td>
                  <td className="adm-faint" style={{ fontSize: 12.5 }}>
                    {e.generationLimit ? <UsageMeter used={generations} limit={e.generationLimit} /> : '不限'}
                  </td>
                  <td className="adm-faint" style={{ fontSize: 12.5 }}>{relativeTime(e.updatedAt)}</td>
                  <td>
                    <div className="adm-row-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Link href={`/admin/events/${e.id}/analytics`} className="adm-btn adm-btn-quiet adm-btn-sm" title="数据统计" aria-label="数据统计"><IconChart /></Link>
                      <a href={`/e/${e.slug}`} target="_blank" rel="noreferrer" className="adm-btn adm-btn-quiet adm-btn-sm" title="打开活动页" aria-label="打开活动页"><IconExternal /></a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span className="adm-mono" style={{ fontSize: 11.5 }}>{used.toLocaleString()} / {limit.toLocaleString()}</span>
      <span style={{ height: 4, width: 88, borderRadius: 2, background: '#eceee8', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: pct >= 90 ? 'var(--a-red)' : 'var(--a-ink)' }} />
      </span>
    </div>
  );
}
