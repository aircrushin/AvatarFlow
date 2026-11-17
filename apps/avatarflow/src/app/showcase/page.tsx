import Link from 'next/link';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ShowcasePage() {
  const events = (await repos().events.list()).filter(
    (e) => ['active', 'expired'].includes(effectiveStatus(e)),
  );

  return (
    <main className="container" style={{ padding: '72px 0' }}>
      <Link href="/" className="faint" style={{ fontSize: 13 }}>← 返回首页</Link>
      <p className="eyebrow" style={{ marginTop: 40 }}>案例展示</p>
      <h1 style={{ fontSize: 40, letterSpacing: '-0.03em', margin: '16px 0 12px' }}>演示活动</h1>
      <p className="muted" style={{ maxWidth: 560, lineHeight: 1.7, marginBottom: 40 }}>
        以下是已发布的活动。点击任意活动即可进入头像定制流程。
      </p>

      {events.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>还没有已发布的活动</p>
          <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
            在管理后台创建一个活动并设为「active」后，它会显示在这里。
          </p>
          <Link href="/admin/events/new" className="btn">前往创建</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {events.map((e) => (
            <Link key={e.id} href={`/e/${e.slug}`} className="card" style={{ padding: 24, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyebrow">{effectiveStatus(e)}</span>
                <span className="faint mono" style={{ fontSize: 11 }}>/e/{e.slug}</span>
              </div>
              <h2 style={{ fontSize: 20, margin: '18px 0 8px' }}>{e.name}</h2>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{e.subtitle || e.description.slice(0, 60)}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
