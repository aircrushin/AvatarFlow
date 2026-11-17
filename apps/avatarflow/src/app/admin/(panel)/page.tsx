import Link from 'next/link';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const events = await repos().events.list();
  const active = events.filter((e) => effectiveStatus(e) === 'active').length;
  const totalGenerations = await Promise.all(
    events.map((e) => repos().generations.countForEvent(e.id)),
  ).then((counts) => counts.reduce((a, b) => a + b, 0));

  const stats = [
    { label: '活动总数', value: events.length },
    { label: '进行中', value: active },
    { label: '累计生成', value: totalGenerations },
  ];

  return (
    <main>
      <p className="eyebrow">Overview</p>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.025em', margin: '10px 0 32px' }}>数据总览</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 40 }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: 22 }}>
            <div className="faint" style={{ fontSize: 13, marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>最近活动</h2>
          <Link href="/admin/events/new" className="btn btn-accent" style={{ minHeight: 36, fontSize: 13 }}>新建活动</Link>
        </div>
        {events.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>还没有活动。创建第一个活动以开始。</p>
        ) : (
          <div>
            {events.slice(0, 6).map((e) => (
              <Link key={e.id} href={`/admin/events/${e.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{e.name}</div>
                  <div className="faint mono" style={{ fontSize: 12, marginTop: 4 }}>/e/{e.slug}</div>
                </div>
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: effectiveStatus(e) === 'active' ? '#e6f4d0' : '#eef0eb' }}>
                  {effectiveStatus(e)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
