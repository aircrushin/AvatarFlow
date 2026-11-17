import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nav = [
  { href: '/admin', label: '总览' },
  { href: '/admin/events', label: '活动管理' },
  { href: '/admin/events/new', label: '新建活动' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate: unauthenticated users never receive admin UI.
  if (!(await isAdmin())) redirect('/admin/login');

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f2' }}>
      <aside style={{ width: 224, position: 'fixed', inset: '0 auto 0 0', background: '#16181d', color: '#e9ebe5', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <Link href="/admin" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', padding: '0 8px 24px' }}>
          AvatarFlow<span style={{ color: '#7d828a' }}>.</span>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: '10px 12px', borderRadius: 6, fontSize: 14, color: '#b9bdb4' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid #2c2f35', paddingTop: 8 }}>
          <Link href="/" style={{ display: 'block', fontSize: 12, color: '#7d828a', padding: '8px 12px' }}>← 查看站点</Link>
          <LogoutButton />
        </div>
      </aside>
      <div style={{ marginLeft: 224, padding: '40px 48px 80px' }}>{children}</div>
    </div>
  );
}
