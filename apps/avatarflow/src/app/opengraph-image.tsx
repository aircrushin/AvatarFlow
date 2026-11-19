import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const alt = `${SITE_NAME} — Brand avatar interaction platform`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Auto-generated social share card. Text is intentionally ASCII-only so it
 * renders with the built-in font without bundling a CJK font (keeps the
 * edge image route lightweight and portable across deploy targets).
 */
export default function Image() {
  const host = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#16181d',
          color: '#f7f8f5',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#c8f056',
              marginRight: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16181d',
            }}
          >
            A
          </div>
          {SITE_NAME}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Every scan,
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#c8f056' }}>
            a brand moment.
          </div>
          <div style={{ fontSize: 28, color: '#b9bec7', marginTop: 28 }}>
            Branded avatar campaigns for teams and events.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#8b9099' }}>{host}</div>
      </div>
    ),
    size,
  );
}
