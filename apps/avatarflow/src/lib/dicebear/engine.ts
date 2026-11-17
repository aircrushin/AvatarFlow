import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { Avatar, OptionsDescriptor, Style } from '@dicebear/core';
import type { EventTheme } from '@/lib/types';
import { STYLE_REGISTRY, type StyleMeta } from './registry.generated';

const ALLOWED = new Map<string, StyleMeta>(STYLE_REGISTRY.map((s) => [s.name, s]));

/** Names of vendored CC0 definitions, imported statically for bundling. */
import blobs from './styles/blobs.json';
import cats from './styles/cats.json';
import clay from './styles/clay.json';
import critters from './styles/critters.json';
import dogs from './styles/dogs.json';
import gaze from './styles/gaze.json';
import glass from './styles/glass.json';
import initialFace from './styles/initial-face.json';
import initials from './styles/initials.json';
import lorelei from './styles/lorelei.json';
import loreleiNeutral from './styles/lorelei-neutral.json';
import marbles from './styles/marbles.json';
import notionists from './styles/notionists.json';
import notionistsNeutral from './styles/notionists-neutral.json';
import openPeeps from './styles/open-peeps.json';
import pixelArt from './styles/pixel-art.json';
import pixelArtNeutral from './styles/pixel-art-neutral.json';
import shapes from './styles/shapes.json';
import thumbs from './styles/thumbs.json';
import waves from './styles/waves.json';

const DEFINITIONS: Record<string, unknown> = {
  blobs,
  cats,
  clay,
  critters,
  dogs,
  gaze,
  glass,
  'initial-face': initialFace,
  initials,
  lorelei,
  'lorelei-neutral': loreleiNeutral,
  marbles,
  notionists,
  'notionists-neutral': notionistsNeutral,
  'open-peeps': openPeeps,
  'pixel-art': pixelArt,
  'pixel-art-neutral': pixelArtNeutral,
  shapes,
  thumbs,
  waves,
};

// Defense in depth: every vendored definition must actually be CC0, and must
// appear in the registry. A mismatch throws at module load, failing closed.
for (const [name, def] of Object.entries(DEFINITIONS)) {
  if (!ALLOWED.has(name)) throw new Error(`Style not in whitelist: ${name}`);
  const license = (def as { meta?: { license?: { name?: string } } }).meta?.license?.name;
  if (!license?.toUpperCase().includes('CC0')) {
    throw new Error(`Style ${name} is not CC0 (${license ?? 'unknown'})`);
  }
}

const styleCache = new Map<string, Style>();

function getStyle(name: string): Style {
  const cached = styleCache.get(name);
  if (cached) return cached;
  if (!ALLOWED.has(name)) throw new Error('STYLE_NOT_ALLOWED');
  const def = DEFINITIONS[name];
  if (!def) throw new Error('STYLE_NOT_FOUND');
  const style = new Style(def);
  styleCache.set(name, style);
  return style;
}

export function listStyles(): StyleMeta[] {
  return STYLE_REGISTRY;
}

export function isStyleAllowed(name: string): boolean {
  return ALLOWED.has(name);
}

/** Dynamically derived configurable parameters for a given style. */
export function describeStyle(name: string): Record<string, unknown> {
  return new OptionsDescriptor(getStyle(name)).toJSON() as Record<string, unknown>;
}

export function newSeed(): string {
  return randomBytes(16).toString('hex');
}

/** One-way hash of a seed. Raw seeds are never persisted. */
export function hashSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

export interface RenderOptions {
  styleName: string;
  seed: string;
  size: number;
  options?: Record<string, string | number | boolean>;
  backgroundColor?: string;
}

/**
 * Renders an avatar SVG using the full (validating) @dicebear/core build.
 * We deliberately do not use `/lite` because validation is what keeps
 * scripts / event handlers / external refs out of the generated SVG.
 */
export function renderAvatarSvg(input: RenderOptions): string {
  const { styleName, seed, size, options = {}, backgroundColor } = input;
  const style = getStyle(styleName);
  const avatar = new Avatar(style, {
    seed,
    size,
    ...(backgroundColor ? { backgroundColor } : {}),
    ...options,
  } as ConstructorParameters<typeof Avatar>[1]);
  return avatar.toString();
}
