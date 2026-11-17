import Link from 'next/link';
import { repos } from '@/lib/db';
import { effectiveStatus } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const events = await repos().events.list();

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <p className="eyebrow">Events</p>
          <h1 style={{ fontSize: 28, letterSpacing: '-0.025em', margin: '10px 0 0' }}>活动管理</h1>
        </div>
        <Link href="/admin/events/new" className="btn">+ 新建活动</Link>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-faint)', fontSize: 12 }}>
              <th style={{ padding: '14px 18px', fontWeight: 500 }}>活动</th>
              <th style={{ padding: '14px 18px', fontWeight: 500 }}>路径</th>
              <th style={{ padding: '14px 18px', fontWeight: 500 }}>状态</th>
              <th style={{ padding: '14px 18px', fontWeight: 500 }}>更新时间</th>
              <th style={{ padding: '14px 18px' }} />
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--ink-faint)' }}>暂无活动</td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 500 }}>{e.name}</td>
                <td style={{ padding: '14px 18px' }} className="mono faint" >/e/{e.slug}</td>
                <td style={{ padding: '14px 18px' }}>{effectiveStatus(e)}</td>
                <td style={{ padding: '14px 18px' }} className="faint" >{new Date(e.updatedAt).toLocaleString('zh-CN')}</td>
                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                  <Link href={`/admin/events/${e.id}`} className="btn btn-ghost" style={{ minHeight: 32, fontSize: 12, padding: '0 12px' }}>编辑</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
