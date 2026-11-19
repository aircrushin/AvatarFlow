'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconDownload, IconUpload } from '@/components/admin/icons';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

type ExtractedColors = { primaryColor: string; secondaryColor: string } | null;

export function LogoUpload({ eventId, currentUrl }: { eventId: string; currentUrl: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(currentUrl);
  const [colors, setColors] = useState<ExtractedColors>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (file: File) => {
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('仅支持 PNG / JPEG / WebP / SVG 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('文件不能超过 2MB');
      return;
    }
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/upload`, { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '上传失败');
      setUrl(data.url);
      setColors(data.colors ?? null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label
        className="adm-drop"
        data-drag={drag}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        style={url ? { backgroundImage: 'repeating-conic-gradient(#eef0eb 0 25%, #fff 0 50%)', backgroundSize: '16px 16px' } : undefined}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="当前 Logo" />
        ) : (
          <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#fff', border: '1px solid var(--a-line)', marginBottom: 6, color: 'var(--a-ink-2)' }}>
            <IconUpload width={16} height={16} />
          </span>
        )}
        <strong>{uploading ? '上传中…' : url ? '点击或拖入新文件以替换' : '点击上传或拖入文件'}</strong>
        <span>PNG / JPEG / WebP / SVG，最大 2MB，建议透明背景</span>
        <input
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </label>
      {error && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--a-red)' }}>{error}</p>}
      {colors && !error && (
        <div style={{ marginTop: 14 }}>
          <div className="adm-label" style={{ marginBottom: 8 }}>已从 Logo 提取品牌色，并自动应用到活动主题</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['primaryColor', 'secondaryColor'] as const).map((key) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 9px 5px 6px', borderRadius: 8, border: '1px solid var(--a-line)', background: '#fff' }}>
                <span style={{ width: 20, height: 20, borderRadius: 5, background: colors[key], border: '1px solid rgba(0,0,0,0.08)' }} />
                <span style={{ fontSize: 11.5, color: 'var(--a-ink-2)' }}>{key === 'primaryColor' ? '主色' : '辅助色'}</span>
                <span className="adm-mono" style={{ fontSize: 11 }}>{colors[key]}</span>
              </div>
            ))}
          </div>
          <p className="adm-faint" style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.6 }}>
            可在「活动配置 → 品牌主题」中微调。颜色会作用于活动页面与生成的头像。
          </p>
        </div>
      )}
      {url && !error && (
        <p className="adm-mono adm-faint" style={{ margin: '10px 0 0', fontSize: 11, wordBreak: 'break-all' }}>{url}</p>
      )}
    </div>
  );
}

export function QrPanel({ eventId, slug }: { eventId: string; slug: string }) {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const src = `/api/admin/events/${eventId}/qrcode?format=${format}`;

  return (
    <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ padding: 12, borderRadius: 14, background: '#fff', border: '1px solid var(--a-line)', boxShadow: 'var(--a-shadow)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="活动二维码" width={168} height={168} style={{ display: 'block' }} />
      </div>
      <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="adm-label" style={{ marginBottom: 8 }}>格式</div>
          <div className="adm-seg" role="group" aria-label="二维码格式">
            <button type="button" aria-pressed={format === 'png'} onClick={() => setFormat('png')}>PNG · 1024px</button>
            <button type="button" aria-pressed={format === 'svg'} onClick={() => setFormat('svg')}>SVG · 矢量</button>
          </div>
        </div>
        <div>
          <div className="adm-label" style={{ marginBottom: 6 }}>指向地址</div>
          <div className="adm-mono adm-muted">/e/{slug}</div>
        </div>
        <p className="adm-faint" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
          二维码使用活动主色绘制。印刷物料建议使用 SVG。
        </p>
        <a className="adm-btn" href={src} download={`qr-${slug}.${format}`} style={{ alignSelf: 'flex-start' }}>
          <IconDownload />下载二维码
        </a>
      </div>
    </div>
  );
}
