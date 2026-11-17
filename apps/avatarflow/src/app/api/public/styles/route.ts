import { NextResponse } from 'next/server';
import { listStyles } from '@/lib/dicebear/engine';

export const runtime = 'nodejs';

/** Public metadata for all whitelisted (CC0) styles. No secrets exposed. */
export async function GET() {
  return NextResponse.json({
    styles: listStyles().map(({ previewSeed: _previewSeed, ...rest }) => rest),
  });
}
