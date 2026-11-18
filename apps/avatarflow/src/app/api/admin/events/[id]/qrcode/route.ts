import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { apiError, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/config';
import { repos } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const event = await repos().events.getById(id);
    if (!event) return apiError('活动不存在', 404);

    const url = new URL(req.url);
    const format = url.searchParams.get('format') ?? 'png';
    // Prefer the actual request host (reverse proxies set X-Forwarded-*), so
    // the QR code points at the deployed public domain rather than a build-time
    // NEXT_PUBLIC_APP_URL. Fall back to the configured app URL for local use.
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost ?? req.headers.get('host');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const proto = forwardedProto ?? (host && /localhost|127\.0\.0\.1/.test(host) ? 'http' : 'https');
    const origin = host ? `${proto}://${host}` : config.appUrl.replace(/\/$/, '');
    const target = `${origin.replace(/\/$/, '')}/e/${event.slug}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(target, {
        type: 'svg',
        margin: 2,
        color: { dark: event.theme.primaryColor, light: '#FFFFFF' },
      });
      return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
    }

    const png = await QRCode.toBuffer(target, {
      type: 'png',
      margin: 2,
      width: 1024,
      color: { dark: event.theme.primaryColor, light: '#FFFFFF' },
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${event.slug}.png"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
