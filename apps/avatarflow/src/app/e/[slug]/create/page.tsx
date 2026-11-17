'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { newSeedClient, readSvgResponse, track } from './client-utils';
import type { PublicEvent } from '@/lib/types';

type OptionValue = string | number | boolean;

export default function CreatePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState('');
  const [styleName, setStyleName] = useState('');
  const [seed, setSeed] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Record<string, OptionValue>>({});

  // Auto-preview must run at most once per event+style. Without this guard a
  // failed generation (e.g. a 429) leaves preview empty and re-triggers the
  // effect forever, which hammers the generate endpoint and pins it at 429.
  const autoPreviewKey = useRef('');
  const previewUrlRef = useRef('');

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
        if (data.status === 'expired') {
          setError('活动已结束，无法继续生成头像。');
          return;
        }
        setEvent(data);
        if (data.styles[0]) setStyleName(data.styles[0].styleName);
      } catch {
        if (active) setError('网络错误，请稍后重试');
      }
    });
    return () => {
      active = false;
    };
  }, [params]);

  const generate = useCallback(
    async (targetSeed?: string) => {
      if (!styleName) return;
      const useSeed = targetSeed ?? newSeedClient();
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/public/events/${slug}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleName,
            seed: useSeed,
            options,
            format: 'svg',
            size: 512,
          }),
        });
        const svgText = await readSvgResponse(res);
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreview(url);
        setSeed(useSeed);
      } catch (e) {
        setError(e instanceof Error ? e.message : '生成失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    [slug, styleName, options],
  );

  // Auto-generate a preview once when the event and a style are ready.
  // Deliberately does NOT depend on preview/loading: on failure we show the
  // error and let the user retry manually instead of looping forever.
  useEffect(() => {
    if (!event || !styleName) return;
    const key = `${slug}:${styleName}`;
    if (autoPreviewKey.current === key) return;
    autoPreviewKey.current = key;
    void generate();
  }, [event, styleName, slug, generate]);

  const activeOptions = event?.styles.find((s) => s.styleName === styleName)?.styleOptions ?? {};

  const handleResult = () => {
    if (!preview) return;
    sessionStorage.setItem('avatarflow_preview', preview);
    sessionStorage.setItem('avatarflow_seed', seed);
    sessionStorage.setItem('avatarflow_style', styleName);
    void track(slug, 'avatar_download');
    router.push(`/e/${slug}/result`);
  };

  if (error && !event) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card" style={{ padding: 32, maxWidth: 400, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>无法进入定制</p>
          <p className="muted" style={{ fontSize: 14 }}>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: event?.theme.backgroundColor ?? 'var(--paper)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-ghost" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => router.push(`/e/${slug}`)}>
            ← 返回
          </button>
          <span className="eyebrow" style={{ color: event?.theme.primaryColor }}>头像定制</span>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 16, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="头像预览" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="muted">正在生成预览…</span>
          )}
        </div>

        {error && (
          <div className="error-msg" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button
              className="btn btn-ghost"
              disabled={loading}
              onClick={() => generate(seed || undefined)}
              style={{ minHeight: 34, padding: '0 12px', fontSize: 13, flexShrink: 0 }}
            >
              重试
            </button>
          </div>
        )}

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>选择风格</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {event?.styles.map((s) => (
              <button
                key={s.styleName}
                onClick={() => {
                  setStyleName(s.styleName);
                  setPreview('');
                }}
                className="btn btn-ghost"
                style={{
                  minHeight: 38,
                  fontSize: 13,
                  borderColor: styleName === s.styleName ? event.theme.primaryColor : 'var(--line)',
                  background: styleName === s.styleName ? event.theme.primaryColor : 'transparent',
                  color: styleName === s.styleName ? '#fff' : 'var(--ink)',
                }}
              >
                {s.styleName.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {Object.keys(activeOptions).length > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>微调参数</p>
            {Object.entries(activeOptions).map(([key, value]) => (
              <div key={key} className="field" style={{ marginBottom: 10 }}>
                <label>{key}</label>
                <input
                  value={String(value ?? '')}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      [key]: typeof value === 'number' ? Number(e.target.value) : e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => generate(seed)}>
              应用参数
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-ghost" disabled={loading} onClick={() => generate()}>
            {loading ? '生成中…' : '换个头像'}
          </button>
          <button className="btn btn-accent" disabled={loading || !preview} onClick={handleResult} style={{ background: event?.theme.primaryColor, color: '#fff' }}>
            下一步
          </button>
        </div>
      </div>
    </main>
  );
}
