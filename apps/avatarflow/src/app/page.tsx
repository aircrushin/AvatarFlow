import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_DESCRIPTION, SITE_TITLE, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const capabilities = [
  {
    n: '01',
    title: '品牌视觉定制',
    desc: '上传 Logo、设定品牌色，头像自动带上你的品牌识别。不是套模板，是为活动单独配置。',
  },
  {
    n: '02',
    title: '活动 H5 搭建',
    desc: '一个独立链接，扫码即玩。无需下载 App，微信内置浏览器直接打开。',
  },
  {
    n: '03',
    title: '参与者互动体验',
    desc: '选风格、随机生成、微调参数、实时预览。几秒钟得到一张属于自己的头像。',
  },
  {
    n: '04',
    title: '传播素材',
    desc: '高清 PNG 直接下载，品牌贴纸与背景一体化输出，随手分享到朋友圈。',
  },
  {
    n: '05',
    title: '活动数据统计',
    desc: '访问、生成、下载、分享四类事件按活动与时间聚合，支持导出 CSV。',
  },
];

const softwareStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AvatarFlow',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: absoluteUrl('/'),
  description: SITE_DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '699',
    priceCurrency: 'CNY',
    description: '试点服务起步价',
  },
};

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData) }}
      />
      <header style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <Link href="/" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            AvatarFlow<span style={{ color: 'var(--ink-faint)' }}>.</span>
          </Link>
          <nav style={{ display: 'flex', gap: 24, fontSize: 14, color: 'var(--ink-soft)' }}>
            <Link href="/showcase">案例展示</Link>
            <Link href="/admin">管理后台</Link>
          </nav>
        </div>
      </header>

      <section className="container" style={{ padding: '96px 0 88px' }}>
        <p className="eyebrow">企业品牌头像互动平台</p>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', lineHeight: 1.06, letterSpacing: '-0.035em', fontWeight: 600, maxWidth: 900, margin: '20px 0 24px' }}>
          让每一次扫码，
          <br />
          都成为一次品牌曝光。
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--ink-soft)', maxWidth: 620, margin: '0 0 36px' }}>
          AvatarFlow 帮活动策划公司、品牌营销团队和企业 HR 快速搭建专属头像互动 H5。
          配置品牌元素，生成一个链接，参与者扫码即可创作并分享自己的品牌头像。
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/showcase" className="btn btn-accent">查看演示活动</Link>
          <Link href="/admin" className="btn btn-ghost">进入管理后台</Link>
        </div>
      </section>

      <section style={{ background: 'var(--surface)', borderBlock: '1px solid var(--line)' }}>
        <div className="container" style={{ padding: '72px 0' }}>
          <p className="eyebrow">核心能力</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0, marginTop: 32 }}>
            {capabilities.map((c) => (
              <div key={c.n} style={{ padding: '28px 28px 28px 0', borderTop: '1px solid var(--line)' }}>
                <div className="mono faint" style={{ fontSize: 12, marginBottom: 18 }}>{c.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 10px' }}>{c.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-soft)', margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '80px 0' }}>
        <p className="eyebrow">合作方式</p>
        <h2 style={{ fontSize: 32, letterSpacing: '-0.02em', margin: '16px 0 40px' }}>从一次定制服务开始</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="faint" style={{ fontSize: 13 }}>试点</div>
            <div style={{ fontSize: 28, fontWeight: 600, margin: '10px 0' }}>¥699</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>首批试点报价，用于验证真实活动场景。</p>
          </div>
          <div className="card" style={{ padding: 24, borderColor: 'var(--ink)' }}>
            <div style={{ fontSize: 13 }}>标准服务</div>
            <div style={{ fontSize: 28, fontWeight: 600, margin: '10px 0' }}>¥1,999</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>含品牌配置、活动搭建与上线支持。</p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div className="faint" style={{ fontSize: 13 }}>企业定制</div>
            <div style={{ fontSize: 28, fontWeight: 600, margin: '10px 0' }}>¥4,999 起</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>深度品牌定制与专属装饰元素。</p>
          </div>
        </div>
        <p className="faint" style={{ fontSize: 12, marginTop: 20 }}>
          以上为服务报价参考，非已验证市场价格。具体以实际沟通为准。
        </p>
      </section>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '28px 0', color: 'var(--ink-faint)', fontSize: 13 }}>
        <div className="container">© {new Date().getFullYear()} AvatarFlow · 基于 DiceBear 开源引擎构建</div>
      </footer>
    </main>
  );
}
