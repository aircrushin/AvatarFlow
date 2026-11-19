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
    <div className="adm-grid-2 adm-grid-2-alt adm-rise">
      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2 className="adm-card-title">品牌 Logo</h2>
            <p className="adm-card-desc">显示在活动页顶部，替换后即时生效</p>
          </div>
        </div>
        <div className="adm-card-body">
          <LogoUpload eventId={event.id} currentUrl={event.theme.logoUrl} />
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2 className="adm-card-title">活动二维码</h2>
            <p className="adm-card-desc">用于海报、展台与现场物料，扫码直达活动页</p>
          </div>
        </div>
        <div className="adm-card-body">
          <QrPanel eventId={event.id} slug={event.slug} />
        </div>
      </section>
    </div>
  );
}
