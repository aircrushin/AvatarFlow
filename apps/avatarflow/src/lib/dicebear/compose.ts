import 'server-only';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { EventTheme } from '@/lib/types';
import { renderAvatarSvg } from './engine';

export interface ComposeInput {
  theme: EventTheme;
  styleName: string;
  seed: string;
  size: number;
  options?: Record<string, string | number | boolean>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Layer 1: brand background. Built from a fixed template with every
 * user-controlled value XML-escaped; user input is never concatenated into
 * a raw SVG structure.
 */
function backgroundSvg(size: number, theme: EventTheme): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${escapeXml(theme.backgroundColor)}"/></svg>`;
}

/**
 * Layer 3: brand decoration that sits ON TOP of the avatar (border + sticker).
 * Kept separate from the background so the sticker is never hidden.
 */
function decorationSvg(size: number, theme: EventTheme): string {
  const { borderEnabled, borderColor, borderWidth, stickerEnabled, stickerText } = theme;
  const border = borderEnabled
    ? `<rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${size - borderWidth}" height="${size - borderWidth}" rx="${Math.round(size * 0.04)}" fill="none" stroke="${escapeXml(borderColor)}" stroke-width="${borderWidth}"/>`
    : '';
  const sticker = stickerEnabled && stickerText.trim()
    ? `<g><rect x="0" y="${size - Math.round(size * 0.11)}" width="${size}" height="${Math.round(size * 0.11)}" fill="${escapeXml(theme.primaryColor)}" opacity="0.95"/><text x="${size / 2}" y="${size - Math.round(size * 0.042)}" font-family="DejaVu Sans,sans-serif" font-size="${Math.round(size * 0.045)}" font-weight="600" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">${escapeXml(stickerText.slice(0, 40))}</text></g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${border}${sticker}</svg>`;
}

/** Renders a full stacked composition to PNG bytes. */
export async function composePng(input: ComposeInput): Promise<Buffer> {
  const { theme, styleName, seed, size, options } = input;

  // Layer 2: avatar, rendered on its own transparent background by the engine.
  // Omitting backgroundColor yields DiceBear's transparent default, which is
  // exactly what we need for compositing over the brand background layer.
  const avatarSvg = renderAvatarSvg({
    styleName,
    seed,
    size,
    options,
  });

  // Layer 1: background. Layer 3: brand decoration on top.
  const bgSvg = backgroundSvg(size, theme);
  const decorSvg = decorationSvg(size, theme);

  const avatarPng = new Resvg(avatarSvg, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();
  const bgPng = new Resvg(bgSvg, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();
  const decorPng = new Resvg(decorSvg, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();

  // Layer 4: export — Background → Avatar → Brand Decoration → PNG.
  return sharp(bgPng)
    .composite([
      { input: avatarPng, top: 0, left: 0 },
      { input: decorPng, top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** SVG-only export (avatar layer, no rasterization). */
export function composeSvg(input: ComposeInput): string {
  return renderAvatarSvg({
    styleName: input.styleName,
    seed: input.seed,
    size: input.size,
    options: input.options,
    backgroundColor: input.theme.avatarBackground,
  });
}
