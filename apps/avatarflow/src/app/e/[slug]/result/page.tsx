'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/client';
import { blobToDataUrl, isWechatBrowser, svgToDataUrl } from '@/lib/wechat';
import type { PublicEvent } from '@/lib/types';

export default function ResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [preview, setPreview] = useState('');
  const [seed, setSeed] = useState('');
  const [styleName, setStyleName] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [inWechat, setInWechat] = useState(false);
  // PNG data URL shown for long-press saving inside WeChat (a.download ignored).
  const [saveImage, setSaveImage] = useState('');

  useEffect(() => {
    let active = true;
    setInWechat(isWechatBrowser());
    params.then(async ({ slug: s }) => {
      setSlug(s);
      // Prefer the raw SVG text saved by the create page: a data URL survives
      // navigation and can be long-pressed in WeChat, unlike a blob: URL.
      const svg = sessionStorage.getItem('avatarflow_svg');
      setPreview(svg ? svgToDataUrl(svg) : (sessionStorage.getItem('avatarflow_preview') ?? ''));
      setSeed(sessionStorage.getItem('avatarflow_seed') ?? '');
      setStyleName(sessionStorage.getItem('avatarflow_style') ?? '');
      try {
        const res = await fetch(`/api/public/events/${s}`);
        const data = await res.json();
        if (active && res.ok) setEvent(data);
      } catch {
        // Preview still works from session storage.
      }
    });
    return () => {
      active = false;
    };
  }, [params]);

  const downloadPng = async () => {
    if (!seed || !styleName) {
      setError('会话已失效，请返回重新生成。');
      return;
    }
    setDownloading(true);
    setError('');
    try {
      const res = await fetch(`/api/public/events/${slug}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleName, seed, format: 'png', size: 1024 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '下载失败');
      }
      const blob = await res.blob();
      if (inWechat) {
        // WeChat's webview ignores the download attribute. Show a real PNG
        // <img> instead so the user can long-press to save to the album.
        const dataUrl = await blobToDataUrl(blob);
        setSaveImage(dataUrl);
        setNotice('长按下方图片保存到相册');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avatarflow-${slug}-${seed.slice(0, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice('已开始下载');
      }
      void track(slug, 'avatar_download');
    } catch (e) {
      setError(e instanceof Error ? e.message : '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const share = async () => {
    const url = window.location.origin + `/e/${slug}`;
    void track(slug, 'share_click');
    if (inWechat) {
      setNotice('点击右上角「···」→「分享给朋友」即可分享活动');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.name ?? 'AvatarFlow', text: '来生成你的品牌头像', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice('活动链接已复制，快分享给朋友');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setNotice(`活动链接：${url}`);
    }
  };

  const primary = event?.theme.primaryColor ?? 'var(--ink)';

  return (
    <main style={{ minHeight: '100vh', background: event?.theme.backgroundColor ?? 'var(--paper)', paddingBottom: 40 }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-ghost" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => router.push(`/e/${slug}/create`)}>
            ← 重新生成
          </button>
          <span className="eyebrow" style={{ color: primary }}>生成结果</span>
        </div>

        <div className="card" style={{ padding: 16, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="头像结果" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="muted">暂无预览</span>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 15, margin: '20px 0 24px', fontWeight: 500 }}>
          {event?.name ?? '你的品牌头像'}
        </p>

        {notice && <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{notice}</p>}
        {error && <p className="error-msg" style={{ fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}

        {saveImage && (
          <div className="card" style={{ padding: 12, marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 13, marginBottom: 10, fontWeight: 500 }}>长按下方图片保存到相册</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={saveImage} alt="长按保存头像" style={{ width: '100%', maxWidth: 320, borderRadius: 8 }} />
          </div>
        )}

        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <button className="btn btn-accent" disabled={downloading} onClick={downloadPng} style={{ minHeight: 50, background: primary, color: '#fff' }}>
            {downloading ? '生成中…' : (inWechat ? '生成可保存图片' : '下载高清 PNG')}
          </button>
          <button className="btn btn-ghost" onClick={share} style={{ minHeight: 50 }}>分享活动</button>
        </div>

        <p className="faint" style={{ fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
          {inWechat
            ? '微信内请先点「生成可保存图片」，再长按图片保存到相册。'
            : '下载失败时，可长按上方预览图保存，或截图后使用。'}
        </p>
      </div>
    </main>
  );
}
