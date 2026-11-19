'use client';

import { useRouter } from 'next/navigation';
import { IconLogout } from './admin/icons';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="adm-nav-item"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
      }}
    >
      <IconLogout />
      退出登录
    </button>
  );
}
