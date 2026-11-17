import { NextResponse } from 'next/server';
import { apiError, handleError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { config } from '@/lib/config';
import { repos } from '@/lib/db';
import { storage } from '@/lib/storage';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** Validates file content by magic bytes, not by the declared extension. */
function validateImage(bytes: Buffer, mime: string): boolean {
  if (mime === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/webp') {
    return (
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mime === 'image/svg+xml') {
    const head = bytes.subarray(0, 512).toString('utf8').toLowerCase();
    return head.includes('<svg') && !head.includes('<script') && !head.includes('onload=');
  }
  return false;
}

function sanitizeSvg(bytes: Buffer): Buffer {
  const text = bytes.toString('utf8');
  // Strip scripts and event handlers. SVG is untrusted input.
  const cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
  return Buffer.from(cleaned, 'utf8');
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const event = await repos().events.getById(id);
    if (!event) return apiError('活动不存在', 404);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return apiError('未提供文件', 400);
    if (file.size > config.limits.logoMaxBytes) return apiError('文件过大', 413);

    const mime = file.type;
    const ext = MIME_EXT[mime];
    if (!ext) return apiError('仅支持 PNG / JPEG / WebP / SVG', 415);

    let bytes: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
    if (!validateImage(bytes, mime)) return apiError('文件内容与声明的类型不符', 415);
    if (mime === 'image/svg+xml') bytes = sanitizeSvg(bytes);

    const key = `logos/${event.id}/${randomUUID()}.${ext}`;
    const stored = await storage().put({ key, body: bytes, contentType: mime });

    const updated = await repos().events.update(id, {
      theme: { ...event.theme, logoUrl: stored.url },
    });
    if (!updated) return apiError('活动不存在', 404);
    return NextResponse.json({ url: stored.url });
  } catch (err) {
    return handleError(err);
  }
}
