import 'server-only';
import { decodeLogo } from '@/lib/media/image-codec';

/** Two HEX colors derived from a brand logo. */
export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Bucket extends Rgb {
  count: number;
  satSum: number;
}

interface Candidate extends Rgb {
  score: number;
  sat: number;
}

/** Pixels below this alpha are treated as transparent background. */
const ALPHA_MIN = 128;
/** Near-white pixels are treated as background, not brand color. */
const WHITE_MIN = 246;
/** 4-bit per channel quantization merges anti-aliasing noise into one bucket. */
const BUCKET_SHIFT = 4;
const MAX_SIDE = 128;
const MIN_SECONDARY_DISTANCE = 64;

function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function distance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** A lighter companion color for single-color logos. */
function tint(color: Rgb): string {
  return toHex({
    r: color.r + (255 - color.r) * 0.45,
    g: color.g + (255 - color.g) * 0.45,
    b: color.b + (255 - color.b) * 0.45,
  });
}

/**
 * Extract a primary and secondary brand color from logo image bytes.
 *
 * Transparent and near-white pixels are ignored. Remaining pixels are
 * quantized into buckets; each bucket is scored by area and saturation so a
 * vivid logo mark wins over a large neutral area. The most distant strong
 * bucket becomes the secondary color. Returns null when the image has no
 * usable pixels (fully transparent or fully white), or cannot be decoded.
 *
 * Supported inputs match the logo upload allowlist: PNG, JPEG, WebP, SVG.
 */
export async function extractBrandColors(bytes: Buffer): Promise<BrandColors | null> {
  let raster: { data: Uint8Array; width: number; height: number };
  try {
    raster = await decodeLogo(bytes, MAX_SIDE);
  } catch {
    return null;
  }

  // WASM pipeline always yields straight-alpha RGBA (4 channels).
  const data = raster.data;
  const channels = 4;

  const buckets = new Map<number, Bucket>();
  let sampled = 0;

  for (let i = 0; i + channels <= data.length; i += channels) {
    const alpha = data[i + 3]!;
    if (alpha < ALPHA_MIN) continue;

    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN) continue;

    const key = ((r >> BUCKET_SHIFT) << 8) | ((g >> BUCKET_SHIFT) << 4) | (b >> BUCKET_SHIFT);
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0, satSum: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.satSum += saturation({ r, g, b });
    bucket.count += 1;
    buckets.set(key, bucket);
    sampled += 1;
  }

  if (sampled === 0) return null;

  const candidates: Candidate[] = Array.from(buckets.values())
    .map((bucket) => {
      const color = {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      };
      const sat = bucket.satSum / bucket.count;
      return { ...color, sat, score: bucket.count * (0.5 + 2 * sat) };
    })
    .sort((a, b) => b.score - a.score);

  const primary = candidates[0]!;
  const distinct = candidates.find((c) => distance(c, primary) >= MIN_SECONDARY_DISTANCE);
  const secondaryColor = distinct ? toHex(distinct) : tint(primary);

  return { primaryColor: toHex(primary), secondaryColor };
}
