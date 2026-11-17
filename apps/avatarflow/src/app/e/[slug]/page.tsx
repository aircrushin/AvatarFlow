'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/client';
import type { PublicEvent } from '@/lib/types';

export default function EventIntroPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    params.then(async ({ slug: s }) => {
      setSlug(s);
      try {
        const res = await fetch(`/api/public/events/${s}`);
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error ?? '活动不可用');
          return;
        }
        setEvent(data);
        void track(s, 'page_view');
      } catch {
        if (active) setError('网络错误，请稍后重试');
      }
    });
    return () => {
      active = false;
    };
  }, [params]);

  if (error) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--paper)' }}>
        <div className="card" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>活动暂不可用</p>
          <p className="muted" style={{ fontSize: 14 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p className="muted">加载中…</p>
      </main>
    );
  }

  const theme = event.theme;
  return (
    <main style={{ minHeight: '100vh', background: theme.backgroundColor }}>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '28px 22px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 44 }}>
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt="品牌 Logo" style={{ height: 32, maxWidth: 120, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>AvatarFlow</span>
          )}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.secondaryColor }} />
        </div>

        <div style={{ flex: 1 }}>
          <p className="eyebrow" style={{ color: theme.primaryColor }}>品牌头像互动</p>
          <h1 style={{ fontSize: 36, lineHeight: 1.2, letterSpacing: '-0.03em', margin: '14px 0 12px' }}>
            {event.name}
          </h1>
          {event.subtitle && (
            <p style={{ fontSize: 17, color: theme.primaryColor, opacity: 0.8, marginBottom: 20 }}>{event.subtitle}</p>
          )}
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>
            {event.description || theme.instructions}
          </p>
        </div>

        <div style={{ marginTop: 40 }}>
          <Link
            href={`/e/${slug}/create`}
            className="btn btn-accent"
            style={{ width: '100%', minHeight: 52, fontSize: 16, background: theme.primaryColor, color: '#fff', borderColor: theme.primaryColor }}
          >
            开始生成头像
          </Link>
          {event.status === 'expired' && (
            <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 14 }}>
              活动已结束，仅可浏览。
            </p>
          )}
          {theme.contact && (
            <p className="faint" style={{ fontSize: 12, textAlign: 'center', marginTop: 20 }}>{theme.contact}</p>
          )}
        </div>
      </div>
    </main>
  );
}
