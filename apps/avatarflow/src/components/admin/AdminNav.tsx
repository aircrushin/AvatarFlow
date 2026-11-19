'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconEvents, IconOverview, IconPlus } from './icons';

const items = [
  { href: '/admin', label: '总览', icon: IconOverview, match: (p: string) => p === '/admin' },
  {
    href: '/admin/events',
    label: '活动管理',
    icon: IconEvents,
    match: (p: string) => p.startsWith('/admin/events') && p !== '/admin/events/new',
  },
  { href: '/admin/events/new', label: '新建活动', icon: IconPlus, match: (p: string) => p === '/admin/events/new' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-nav" aria-label="后台导航">
      <div className="adm-nav-label">工作台</div>
      {items.map(({ href, label, icon: Icon, match }) => (
        <Link key={href} href={href} className="adm-nav-item" aria-current={match(pathname) ? 'page' : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
