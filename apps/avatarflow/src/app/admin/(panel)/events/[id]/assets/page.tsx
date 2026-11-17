import Link from 'next/link';
import { notFound } from 'next/navigation';
import { repos } from '@/lib/db';
import { QrPanel, LogoUpload } from './widgets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await repos().events.getById(id);
  if (!event) notFound();

  return (
    <main style={{ maxWidth: 820 }}>
      <Link href={`/admin/events/${id}`} className="faint" style={{ fontSize: 13 }}>← 返回配置</Link>
      <p className="eyebrow" style={{ marginTop: 20 }}>Assets</p>
      <h1 style={{ fontSize: 26, letterSpacing: '-0.025em', margin: '8px 0 28px' }}>素材管理 · {event.name}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>品牌 Logo</h2>
          <p className="faint" style={{ fontSize: 12, marginBottom: 18 }}>PNG / JPEG / WebP / SVG，最大 2MB</p>
          <LogoUpload eventId={event.id} currentUrl={event.theme.logoUrl} />
        </section>

        <section className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>活动二维码</h2>
          <p className="faint" style={{ fontSize: 12, marginBottom: 18 }}>扫码直达活动页面</p>
          <QrPanel eventId={event.id} slug={event.slug} />
        </section>
      </div>
    </main>
  );
}
