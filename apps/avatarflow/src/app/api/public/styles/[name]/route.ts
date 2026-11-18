import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { isStyleAllowed, styleControls } from '@/lib/dicebear/engine';

export const runtime = 'nodejs';

/** Tunable options for one whitelisted style. Unknown styles are rejected. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    if (!isStyleAllowed(name)) return apiError('不允许的头像风格', 404);
    return NextResponse.json({ controls: styleControls(name) });
  } catch (err) {
    return handleError(err);
  }
}
