import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';

// brand-color imports `server-only`, which throws outside a server context.
vi.mock('server-only', () => ({}));

import { extractBrandColors } from '../src/lib/brand-color';

type Rgba = { r: number; g: number; b: number; alpha: number };

function solidPng(width: number, height: number, color: Rgba): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  })
    .png()
    .toBuffer();
}

describe('extractBrandColors', () => {
  it('extracts a saturated solid color as primary', async () => {
    const result = await extractBrandColors(await solidPng(64, 64, { r: 227, g: 33, b: 39, alpha: 1 }));
    expect(result).not.toBeNull();
    expect(result!.primaryColor).toBe('#E32127');
    expect(result!.secondaryColor).toMatch(/^#[0-9A-F]{6}$/);
    expect(result!.secondaryColor).not.toBe(result!.primaryColor);
  });

  it('ignores transparent background and picks the opaque mark', async () => {
    const transparent = await solidPng(64, 64, { r: 0, g: 0, b: 0, alpha: 0 });
    const mark = await solidPng(20, 20, { r: 29, g: 41, b: 51, alpha: 1 });
    const combined = await sharp(transparent)
      .composite([{ input: mark, left: 22, top: 22 }])
      .png()
      .toBuffer();
    const result = await extractBrandColors(combined);
    expect(result!.primaryColor).toBe('#1D2933');
  });

  it('ignores a near-white background in favor of dark text', async () => {
    const bg = await solidPng(64, 64, { r: 250, g: 250, b: 250, alpha: 1 });
    const text = await solidPng(20, 20, { r: 20, g: 20, b: 20, alpha: 1 });
    const combined = await sharp(bg)
      .composite([{ input: text, left: 22, top: 22 }])
      .png()
      .toBuffer();
    const result = await extractBrandColors(combined);
    expect(result!.primaryColor).toBe('#141414');
  });

  it('returns two distinct colors for a two-tone logo', async () => {
    const base = await solidPng(64, 64, { r: 52, g: 138, b: 221, alpha: 1 });
    const accent = await solidPng(20, 20, { r: 240, g: 160, b: 32, alpha: 1 });
    const combined = await sharp(base)
      .composite([{ input: accent, left: 22, top: 22 }])
      .png()
      .toBuffer();
    const result = await extractBrandColors(combined);
    expect(result!.primaryColor).toBe('#348ADD');
    expect(result!.secondaryColor).toBe('#F0A020');
  });

  it('returns null for a fully transparent image', async () => {
    const result = await extractBrandColors(await solidPng(32, 32, { r: 255, g: 0, b: 0, alpha: 0 }));
    expect(result).toBeNull();
  });

  it('returns null for a fully white image', async () => {
    const result = await extractBrandColors(await solidPng(32, 32, { r: 255, g: 255, b: 255, alpha: 1 }));
    expect(result).toBeNull();
  });

  it('returns null for undecodable bytes', async () => {
    const result = await extractBrandColors(Buffer.from('not an image'));
    expect(result).toBeNull();
  });

  it('extracts from an SVG logo', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#7F77DD"/></svg>');
    const result = await extractBrandColors(svg);
    expect(result!.primaryColor).toBe('#7F77DD');
  });
});
