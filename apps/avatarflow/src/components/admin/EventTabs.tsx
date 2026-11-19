'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChart, IconCheck, IconCopy, IconImage, IconSliders } from './icons';

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="adm-btn adm-btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? '已复制' : '复制链接'}
    </button>
  );
}

export function EventTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/admin/events/${id}`;
  const tabs = [
    { href: base, label: '活动配置', icon: IconSliders },
    { href: `${base}/analytics`, label: '数据统计', icon: IconChart },
    { href: `${base}/assets`, label: '素材与二维码', icon: IconImage },
  ];
  return (
    <nav className="adm-tabs" aria-label="活动页签">
      {tabs.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="adm-tab" aria-current={pathname === href ? 'page' : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
