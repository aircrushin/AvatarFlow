'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
      }}
      style={{ fontSize: 12, color: '#7d828a', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      退出登录
    </button>
  );
}
