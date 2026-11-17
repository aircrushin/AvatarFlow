'use client';

import { useState } from 'react';

export function LogoUpload({ eventId, currentUrl }: { eventId: string; currentUrl: string | null }) {
  const [url, setUrl] = useState(currentUrl);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/upload`, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '上传失败');
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="当前 Logo" style={{ height: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 16 }} />
      )}
      <label className="btn btn-ghost" style={{ cursor: 'pointer', minHeight: 38, fontSize: 13 }}>
        {uploading ? '上传中…' : '选择文件上传'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      {url && <p className="faint mono" style={{ fontSize: 11, marginTop: 10, wordBreak: 'break-all' }}>{url}</p>}
      {error && <p className="error-msg" style={{ fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

export function QrPanel({ eventId, slug }: { eventId: string; slug: string }) {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const src = `/api/admin/events/${eventId}/qrcode?format=${format}`;

  return (
    <div>
      <div style={{ width: 180, height: 180, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="活动二维码" style={{ width: 160, height: 160 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="btn btn-ghost" style={{ minHeight: 34, fontSize: 12 }} onClick={() => setFormat('png')}>PNG</button>
        <button className="btn btn-ghost" style={{ minHeight: 34, fontSize: 12 }} onClick={() => setFormat('svg')}>SVG</button>
        <a className="btn" href={src} download style={{ minHeight: 34, fontSize: 12, marginLeft: 'auto' }}>下载</a>
      </div>
      <p className="faint mono" style={{ fontSize: 11 }}>/e/{slug}</p>
    </div>
  );
}
