import Link from 'next/link';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';
import { relativeTime } from '@/lib/format';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { IconArrowRight, IconPlus, IconSparkle } from '@/components/admin/icons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const events = await repos().events.list();
  const perEvent = await Promise.all(
    events.map(async (e) => {
      const [generations, counts] = await Promise.all([
        repos().generations.countForEvent(e.id),
        repos().analytics.countByType(e.id),
      ]);
      return { event: e, status: effectiveStatus(e), generations, views: counts.page_view, downloads: counts.avatar_download };
    }),
  );

  const sum = (key: 'generations' | 'views' | 'downloads') => perEvent.reduce((a, r) => a + r[key], 0);
  const active = perEvent.filter((r) => r.status === 'active').length;
  const drafts = perEvent.filter((r) => r.status === 'draft').length;
  const views = sum('views');
  const generations = sum('generations');
  const downloads = sum('downloads');

  const recent = [...perEvent]
    .sort((a, b) => Date.parse(b.event.updatedAt) - Date.parse(a.event.updatedAt))
    .slice(0, 6);

  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <main className="adm-page">
      <header className="adm-head adm-rise">
        <div>
          <div className="adm-crumbs">{today}</div>
          <h1 className="adm-title">数据总览</h1>
          <p className="adm-sub">所有活动的参与情况一览。</p>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin/events/new" className="adm-btn adm-btn-lime"><IconPlus />新建活动</Link>
        </div>
      </header>

      <section className="adm-stats adm-rise adm-rise-1">
        <div className="adm-stat">
          <div className="adm-stat-label">活动总数</div>
          <div className="adm-stat-value">{events.length.toLocaleString()}</div>
          <div className="adm-stat-foot">其中草稿 <b>{drafts}</b> 个</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-label"><span className="adm-badge" data-status="active" style={{ height: 18, fontSize: 11 }}>进行中</span></div>
          <div className="adm-stat-value">{active.toLocaleString()}</div>
          <div className="adm-stat-foot">当前对外开放的活动</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-label">页面访问</div>
          <div className="adm-stat-value">{views.toLocaleString()}</div>
          <div className="adm-stat-foot">按访客去重</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-label">累计生成</div>
          <div className="adm-stat-value">{generations.toLocaleString()}</div>
          <div className="adm-stat-foot">头像下载 <b>{downloads.toLocaleString()}</b> 次</div>
        </div>
      </section>

      <section className="adm-card adm-rise adm-rise-2" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div className="adm-card-head">
          <div>
            <h2 className="adm-card-title">最近更新</h2>
            <p className="adm-card-desc">按最近修改时间排序</p>
          </div>
          {events.length > 0 && (
            <Link href="/admin/events" className="adm-btn adm-btn-quiet adm-btn-sm">全部活动<IconArrowRight /></Link>
          )}
        </div>

        {events.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-art"><IconSparkle /></div>
            <h3>创建你的第一个品牌头像活动</h3>
            <p>上传 Logo、设定品牌色并挑选头像风格，几分钟内即可生成一个扫码可玩的活动页面。</p>
            <Link href="/admin/events/new" className="adm-btn"><IconPlus />新建活动</Link>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>活动</th>
                <th style={{ width: 120 }}>状态</th>
                <th style={{ width: 110, textAlign: 'right' }}>访问</th>
                <th style={{ width: 110, textAlign: 'right' }}>生成</th>
                <th style={{ width: 150, textAlign: 'right' }}>更新于</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(({ event: e, status, views: v, generations: g }) => (
                <tr key={e.id} className="adm-row-link">
                  <td>
                    <Link href={`/admin/events/${e.id}`} className="adm-row-cover adm-cell-title">{e.name}</Link>
                    <div className="adm-cell-sub adm-mono">/e/{e.slug}</div>
                  </td>
                  <td><StatusBadge status={status} /></td>
                  <td className="adm-mono" style={{ textAlign: 'right', fontSize: 13 }}>{v.toLocaleString()}</td>
                  <td className="adm-mono" style={{ textAlign: 'right', fontSize: 13 }}>{g.toLocaleString()}</td>
                  <td className="adm-faint" style={{ textAlign: 'right', fontSize: 12.5 }}>{relativeTime(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}