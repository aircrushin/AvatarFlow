import { notFound } from 'next/navigation';
import { repos } from '@/lib/db';
import { percent } from '@/lib/format';
import { IconDownload } from '@/components/admin/icons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAYS = 7;

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await repos().events.getById(id);
  if (!event) notFound();

  const [counts, sparse, generationCount] = await Promise.all([
    repos().analytics.countByType(id),
    repos().analytics.dailySeries(id, DAYS),
    repos().generations.countForEvent(id),
  ]);

  // The repository only returns days that have events (keyed by UTC date).
  const byDay = new Map(sparse.map((d) => [d.day, d.count]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const day = new Date(Date.now() - (DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, count: byDay.get(day) ?? 0 };
  });
  const maxDay = Math.max(1, ...series.map((d) => d.count));
  const weekTotal = series.reduce((a, d) => a + d.count, 0);

  const views = counts.page_view;
  const funnel = [
    { label: '页面访问', value: views },
    { label: '头像生成', value: counts.avatar_generate },
    { label: '头像下载', value: counts.avatar_download },
    { label: '分享点击', value: counts.share_click },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="adm-rise">
      <section className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-label">页面访问</div>
          <div className="adm-stat-value">{views.toLocaleString()}</div>
          <div className="adm-stat-foot">按访客去重</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-label">头像生成</div>
          <div className="adm-stat-value">{counts.avatar_generate.toLocaleString()}</div>
          <div className="adm-stat-foot">人均生成 <b>{views > 0 ? (counts.avatar_generate / views).toFixed(1) : '—'}</b> 次</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-label">头像下载</div>
          <div className="adm-stat-value">{counts.avatar_download.toLocaleString()}</div>
          <div className="adm-stat-foot">生成后下载 <b>{percent(counts.avatar_download, counts.avatar_generate)}</b></div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-label">分享点击</div>
          <div className="adm-stat-value">{counts.share_click.toLocaleString()}</div>
          <div className="adm-stat-foot">访问占比 <b>{percent(counts.share_click, views)}</b></div>
        </div>
      </section>

      <div className="adm-grid-2" style={{ marginTop: 16 }}>
        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2 className="adm-card-title">近 7 天互动趋势</h2>
              <p className="adm-card-desc">全部事件合计 · 本周 <span className="adm-mono" style={{ color: 'var(--a-ink)' }}>{weekTotal.toLocaleString()}</span> 次</p>
            </div>
            <a href={`/api/admin/events/${id}/analytics?format=csv`} className="adm-btn adm-btn-ghost adm-btn-sm">
              <IconDownload />导出 CSV
            </a>
          </div>
          <div className="adm-card-body">
            <div className="adm-bars" role="img" aria-label="近 7 天每日互动次数">
              {series.map((d, i) => (
                <div key={d.day} className="adm-bar" title={`${d.day}：${d.count} 次`}>
                  <div className="adm-bar-fill" data-zero={d.count === 0} style={{ height: `${(d.count / maxDay) * 100}%`, animationDelay: `${i * 40}ms` }}>
                    <span className="adm-bar-value">{d.count > 0 ? d.count : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="adm-bar-axis">
              {series.map((d, i) => (
                <span key={d.day} style={i === series.length - 1 ? { color: 'var(--a-ink)', fontWeight: 600 } : undefined}>
                  {i === series.length - 1 ? '今天' : d.day.slice(5).replace('-', '/')}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2 className="adm-card-title">参与漏斗</h2>
              <p className="adm-card-desc">从访问到分享的各环节人次</p>
            </div>
          </div>
          <div className="adm-card-body">
            <div className="adm-funnel">
              {funnel.map((f, i) => (
                <div key={f.label} className="adm-funnel-row">
                  <span className="adm-muted">{f.label}</span>
                  <div className="adm-funnel-track">
                    <div className="adm-funnel-fill" style={{ width: `${(f.value / funnelMax) * 100}%`, animationDelay: `${i * 60}ms`, opacity: 1 - i * 0.18 }} />
                  </div>
                  <span className="adm-mono" style={{ textAlign: 'right' }}>
                    {f.value.toLocaleString()}
                    {i > 0 && f.value <= views && <span className="adm-faint" style={{ marginLeft: 6, fontSize: 11 }}>{percent(f.value, views)}</span>}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--a-line)', fontSize: 12.5 }} className="adm-faint">
              累计生成记录 <span className="adm-mono" style={{ color: 'var(--a-ink)' }}>{generationCount.toLocaleString()}</span> 条
              {event.generationLimit ? <> · 上限 <span className="adm-mono">{event.generationLimit.toLocaleString()}</span></> : null}
              。仅保存种子哈希，不保存原始种子或个人信息。
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
