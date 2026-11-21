import 'server-only';

/**
 * WASM image pipeline for Cloudflare Workers.
 *
 * Workers cannot load sharp / @resvg/resvg-js native addons, so all raster work
 * goes through Photon (decode / resize / PNG encode) and resvg-wasm (SVG render).
 * Pixels are straight-alpha RGBA, row-major.
 */
import { PhotonImage, SamplingFilter, resize as photonResize, initPhoton, photonWasmModule } from '@cf-wasm/photon';
import { Resvg, initResvg, resvgWasmModule } from '@cf-wasm/resvg';
import { GEIST_FONT_BASE64 } from '@/assets/geist-font';

export interface Raster {
  data: Uint8Array;
  width: number;
  height: number;
}

const MAX_DECODE_PIXELS = 40_000_000;

let initPromise: Promise<void> | undefined;

/**
 * Initialize both WASM modules exactly once. In Node the packages self-initialize
 * and `init*()` throws on a second call, so detect that via `.ready`. In Workers we
 * must pass the bundled module explicitly.
 */
function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const photonMod = await import('@cf-wasm/photon');
      const resvgMod = await import('@cf-wasm/resvg');
      if (!photonMod.initPhoton.ready) await initPhoton(photonWasmModule);
      if (!resvgMod.initResvg.ready) await initResvg(resvgWasmModule);
    })().catch((err) => {
      initPromise = undefined;
      throw err;
    });
  }
  return initPromise;
}

let fontBuffers: Uint8Array[] | undefined;
function geistFont(): Uint8Array[] {
  if (!fontBuffers) {
    const bin = typeof atob === 'function'
      ? atob(GEIST_FONT_BASE64)
      : Buffer.from(GEIST_FONT_BASE64, 'base64').toString('binary');
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    fontBuffers = [bytes];
  }
  return fontBuffers;
}

function isSvg(bytes: Uint8Array): boolean {
  const sample = new TextDecoder().decode(bytes.subarray(0, 256)).trimStart().toLowerCase();
  return sample.startsWith('<svg') || sample.startsWith('<?xml');
}

/** Decode PNG/JPEG/WebP bytes to straight-alpha RGBA. */
export function decodeImage(bytes: Uint8Array): Raster {
  const image = PhotonImage.new_from_byteslice(bytes);
  try {
    if (image.get_width() * image.get_height() > MAX_DECODE_PIXELS) {
      throw new Error('Image exceeds 40 megapixel limit.');
    }
    return {
      data: image.get_raw_pixels(),
      width: image.get_width(),
      height: image.get_height(),
    };
  } finally {
    image.free();
  }
}

/**
 * Render any SVG to RGBA, applying a bundled font so <text> (brand stickers)
 * survives on Workers where there is no system font directory.
 */
export async function svgToRgba(svg: string, size: number): Promise<Raster> {
  await ensureInit();
  const encoded = new TextEncoder().encode(svg);
  const renderer = await Resvg.async(encoded, {
    font: { fontBuffers: geistFont(), defaultFontFamily: 'Geist' },
    fitTo: { mode: 'width', value: size },
  });
  let png: Uint8Array;
  try {
    png = renderer.render().asPng();
  } finally {
    renderer.free();
  }
  return decodeImage(png);
}

/** Resize to an exact size with Lanczos3 (premultiply-aware to avoid dark fringes). */
export function resizeImage(image: Raster, width: number, height: number): Raster {
  if (image.width === width && image.height === height) return image;
  const pixels = new Uint8Array(image.data);
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]!;
    if (a === 255) continue;
    pixels[i] = Math.round((pixels[i]! * a) / 255);
    pixels[i + 1] = Math.round((pixels[i + 1]! * a) / 255);
    pixels[i + 2] = Math.round((pixels[i + 2]! * a) / 255);
  }
  const src = new PhotonImage(pixels, image.width, image.height);
  const out = photonResize(src, width, height, SamplingFilter.Lanczos3);
  src.free();
  const data = out.get_raw_pixels();
  out.free();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a === 255) continue;
    if (a === 0) {
      data[i] = data[i + 1] = data[i + 2] = 0;
      continue;
    }
    data[i] = Math.min(255, Math.round((data[i]! * 255) / a));
    data[i + 1] = Math.min(255, Math.round((data[i + 1]! * 255) / a));
    data[i + 2] = Math.min(255, Math.round((data[i + 2]! * 255) / a));
  }
  return { data, width, height };
}

/** Standard "source-over" alpha composite of src onto dst (same as sharp.composite). */
export function alphaOver(dst: Raster, src: Raster): Raster {
  if (dst.width !== src.width || dst.height !== src.height) {
    throw new Error('alphaOver requires equal dimensions.');
  }
  const out = new Uint8Array(dst.data.length);
  const d = dst.data;
  const s = src.data;
  for (let i = 0; i < out.length; i += 4) {
    const sa = s[i + 3]! / 255;
    const da = d[i + 3]! / 255;
    const oa = sa + da * (1 - sa);
    if (oa === 0) continue;
    out[i] = Math.round((s[i]! * sa + d[i]! * da * (1 - sa)) / oa);
    out[i + 1] = Math.round((s[i + 1]! * sa + d[i + 1]! * da * (1 - sa)) / oa);
    out[i + 2] = Math.round((s[i + 2]! * sa + d[i + 2]! * da * (1 - sa)) / oa);
    out[i + 3] = Math.round(oa * 255);
  }
  return { data: out, width: dst.width, height: dst.height };
}

/** Encode straight-alpha RGBA to PNG bytes. */
export function encodePng(image: Raster): Buffer {
  const out = new PhotonImage(new Uint8Array(image.data), image.width, image.height);
  try {
    return Buffer.from(out.get_bytes());
  } finally {
    out.free();
  }
}

/**
 * Decode any logo input (raster or SVG) into a bounded RGBA raster.
 * SVG is rendered through resvg with the bundled font; raster via Photon.
 */
export async function decodeLogo(bytes: Buffer, maxSide = 128): Promise<Raster> {
  await ensureInit();
  let raster: Raster;
  if (isSvg(bytes)) {
    raster = await svgToRgba(bytes.toString('utf8'), maxSide);
  } else {
    raster = decodeImage(new Uint8Array(bytes));
  }
  if (Math.max(raster.width, raster.height) > maxSide) {
    const scale = maxSide / Math.max(raster.width, raster.height);
    raster = resizeImage(raster, Math.max(1, Math.round(raster.width * scale)), Math.max(1, Math.round(raster.height * scale)));
  }
  return raster;
}
