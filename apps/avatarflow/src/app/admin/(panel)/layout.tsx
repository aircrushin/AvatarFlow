import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { AdminNav } from '@/components/admin/AdminNav';
import { IconExternal } from '@/components/admin/icons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate: unauthenticated users never receive admin UI.
  if (!(await isAdmin())) redirect('/admin/login');

  return (
    <>
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand">
          <span className="adm-brand-mark">A</span>
          AvatarFlow
          <small>Console</small>
        </Link>
        <AdminNav />
        <div className="adm-side-foot">
          <Link href="/" target="_blank" className="adm-nav-item">
            <IconExternal />
            查看官网
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <div className="adm-main">{children}</div>
    </>
  );
}
