import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('server-only', () => ({}));

import {
  decodeImage,
  encodePng,
  alphaOver,
  svgToRgba,
  resizeImage,
  type Raster,
} from '../src/lib/media/image-codec';

function solid(width: number, height: number, rgba: [number, number, number, number]): Raster {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0];
    data[i + 1] = rgba[1];
    data[i + 2] = rgba[2];
    data[i + 3] = rgba[3];
  }
  return { data, width, height };
}

function pixelAt(img: Raster, x: number, y: number): [number, number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}

describe('image-codec (WASM pipeline)', () => {
  it('decodes PNG bytes produced by sharp to RGBA', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 227, g: 33, b: 39, alpha: 1 } },
    }).png().toBuffer();
    const img = decodeImage(new Uint8Array(png));
    expect([img.width, img.height]).toEqual([8, 8]);
    const [r, g, b, a] = pixelAt(img, 4, 4);
    expect(r).toBeGreaterThan(220);
    expect(g).toBeLessThan(50);
    expect(b).toBeLessThan(50);
    expect(a).toBe(255);
  });

  it('encodes RGBA back to a valid PNG', async () => {
    const png = encodePng(solid(6, 6, [52, 138, 221, 255]));
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(6);
    expect(meta.format).toBe('png');
  });

  it('composites semi-transparent source over background', () => {
    const bg = solid(4, 4, [52, 138, 221, 255]);
    const src = solid(4, 4, [227, 33, 39, 128]);
    const out = alphaOver(bg, src);
    const [r, g, b, a] = pixelAt(out, 1, 1);
    expect(a).toBe(255);
    // 50% red over blue: red channel pulled up, green/blue pulled down.
    expect(r).toBeGreaterThan(120);
    expect(r).toBeLessThan(180);
    expect(g).toBeGreaterThan(60);
    expect(g).toBeLessThan(110);
    expect(b).toBeGreaterThan(100);
    expect(b).toBeLessThan(160);
  });

  it('renders SVG text with the bundled font', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#348ADD"/><text x="60" y="28" font-family="Geist" font-size="20" fill="#fff" text-anchor="middle">HELLO</text></svg>`;
    const withText = await svgToRgba(svg, 120);
    const plain = await svgToRgba(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#348ADD"/></svg>`,
      120,
    );
    // A text-free baseline must differ where glyphs are painted.
    expect(Buffer.from(withText.data).equals(Buffer.from(plain.data))).toBe(false);
  });

  it('resizes to an exact size', () => {
    const img = resizeImage(solid(10, 10, [0, 255, 0, 255]), 20, 20);
    expect([img.width, img.height]).toEqual([20, 20]);
    expect(pixelAt(img, 10, 10)).toEqual([0, 255, 0, 255]);
  });
});
