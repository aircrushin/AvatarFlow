import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { extractBrandColors } from '@/lib/brand-color';
import { repos } from '@/lib/db';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** Re-extract brand colors from a previously uploaded logo. Does not persist. */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const event = await repos().events.getById(id);
    if (!event) return apiError('活动不存在', 404);

    const logoUrl = event.theme.logoUrl;
    if (!logoUrl) return apiError('尚未上传品牌 Logo', 400);

    const bytes = await storage().get(logoUrl);
    if (!bytes) return apiError('Logo 文件不存在，请重新上传', 404);

    const colors = await extractBrandColors(bytes);
    if (!colors) return apiError('未能从 Logo 中识别颜色，请手动设置', 422);

    return NextResponse.json(colors);
  } catch (err) {
    return handleError(err);
  }
}
