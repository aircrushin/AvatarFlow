import { apiError, handleError } from '@/lib/api';
import { isStyleAllowed, listStyles, renderAvatarSvg } from '@/lib/dicebear/engine';

export const runtime = 'nodejs';

/** Static thumbnail for a whitelisted style, rendered with its fixed preview seed. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    if (!isStyleAllowed(name)) return apiError('不允许的头像风格', 404);
    const meta = listStyles().find((s) => s.name === name)!;
    const svg = renderAvatarSvg({ styleName: name, seed: meta.previewSeed, size: 160 });
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
