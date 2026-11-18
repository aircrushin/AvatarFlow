import { describe, it, expect } from 'vitest';
import { renderAvatarSvg, styleControls } from '../src/lib/dicebear/engine';
import { STYLE_REGISTRY } from '../src/lib/dicebear/registry.generated';

// engine imports `server-only`, which throws outside a Next.js server context.
// We stub it so the pure rendering logic can be unit-tested in Node.
import { vi } from 'vitest';
vi.mock('server-only', () => ({}));

describe('Style Registry', () => {
  it('contains only CC0 styles', () => {
    expect(STYLE_REGISTRY.length).toBeGreaterThan(0);
    for (const style of STYLE_REGISTRY) {
      expect(style.license).toContain('CC0');
    }
  });

  it('has complete metadata for every style', () => {
    for (const style of STYLE_REGISTRY) {
      expect(style.name).toBeTruthy();
      expect(style.label).toBeTruthy();
      expect(style.author).toBeTruthy();
      expect(style.licenseUrl).toMatch(/^https:\/\//);
    }
  });

  it('has unique style names', () => {
    const names = STYLE_REGISTRY.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('Avatar rendering', () => {
  it('produces valid SVG markup', () => {
    const svg = renderAvatarSvg({
      styleName: 'lorelei',
      seed: 'test-seed',
      size: 256,
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('is deterministic: same seed reproduces identical SVG', () => {
    const a = renderAvatarSvg({ styleName: 'lorelei', seed: 'repeat-me', size: 256 });
    const b = renderAvatarSvg({ styleName: 'lorelei', seed: 'repeat-me', size: 256 });
    expect(a).toBe(b);
  });

  it('produces different avatars for different seeds', () => {
    const a = renderAvatarSvg({ styleName: 'lorelei', seed: 'alice', size: 256 });
    const b = renderAvatarSvg({ styleName: 'lorelei', seed: 'bob', size: 256 });
    expect(a).not.toBe(b);
  });

  it('rejects styles outside the whitelist', () => {
    expect(() =>
      renderAvatarSvg({ styleName: 'not-a-style', seed: 'x', size: 256 }),
    ).toThrow();
  });

  it('renders every whitelisted style without error', () => {
    for (const style of STYLE_REGISTRY) {
      const svg = renderAvatarSvg({ styleName: style.name, seed: 'smoke', size: 128 });
      expect(svg).toContain('<svg');
    }
  });

  it('accepts a single variant name from the visitor controls', () => {
    const svg = renderAvatarSvg({
      styleName: 'cats',
      seed: 'eyed',
      size: 128,
      options: { eyesVariant: 'happy', rotate: 15 },
    });
    expect(svg).toContain('<svg');
  });
});

describe('Style controls', () => {
  it('exposes a short tunable set for a CC0 style', () => {
    const controls = styleControls('cats');
    const keys = controls.map((c) => c.key);
    expect(keys).toContain('scale');
    expect(keys).toContain('rotate');
    expect(keys).toContain('eyesVariant');
    expect(keys).not.toContain('seed');
    expect(keys).not.toContain('sceneVariant');
    expect(controls.find((c) => c.key === 'eyesVariant')?.values).toContain('happy');
  });

  it('returns nothing for a style outside the whitelist', () => {
    expect(styleControls('avataaars')).toEqual([]);
  });
});
