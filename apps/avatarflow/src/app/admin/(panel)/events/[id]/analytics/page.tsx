import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repos } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await repos().events.getById(id);
  if (!event) notFound();

  const [counts, series, generationCount] = await Promise.all([
    repos().analytics.countByType(id),
    repos().analytics.dailySeries(id, 7),
    repos().generations.countForEvent(id),
  ]);

  const cards = [
    { label: '页面访问', value: counts.page_view },
    { label: '头像生成', value: counts.avatar_generate },
    { label: '头像下载', value: counts.avatar_download },
    { label: '分享点击', value: counts.share_click },
  ];

  const maxDay = Math.max(1, ...series.map((d) => d.count));

  return (
    <main style={{ maxWidth: 820 }}>
      <Link href={`/admin/events/${id}`} className="faint" style={{ fontSize: 13 }}>← 返回配置</Link>
      <p className="eyebrow" style={{ marginTop: 20 }}>Analytics</p>
      <h1 style={{ fontSize: 26, letterSpacing: '-0.025em', margin: '8px 0 28px' }}>数据统计 · {event.name}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        {cards.map((c) => (
          <div key={c.label} className="card" style={{ padding: 18 }}>
            <div className="faint" style={{ fontSize: 12, marginBottom: 10 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>{c.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>近 7 天活动趋势</h2>
          <a href={`/api/admin/events/${id}/analytics?format=csv`} className="btn btn-ghost" style={{ minHeight: 34, fontSize: 12 }}>导出 CSV</a>
        </div>
        {series.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>暂无数据</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {series.map((d) => (
              <div key={d.day} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 40px', gap: 12, alignItems: 'center', fontSize: 13 }}>
                <span className="mono faint">{d.day}</span>
                <div style={{ height: 8, background: '#eef0eb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(d.count / maxDay) * 100}%`, background: 'var(--ink)' }} />
                </div>
                <span className="mono" style={{ textAlign: 'right' }}>{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>生成统计</h2>
        <p className="muted" style={{ fontSize: 14 }}>累计生成头像 <strong style={{ color: 'var(--ink)' }}>{generationCount.toLocaleString()}</strong> 次（仅保存种子哈希，不保存原始种子）。</p>
      </div>
    </main>
  );
}
