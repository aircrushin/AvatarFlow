import { describe, expect, it } from 'vitest';
import { slugFromName } from '../src/lib/slug';

describe('slugFromName', () => {
  it('slugifies latin names', () => {
    expect(slugFromName('2026 Spring Brand')).toBe('2026-spring-brand');
    expect(slugFromName('  Hello, World! ')).toBe('hello-world');
  });

  it('strips accents', () => {
    expect(slugFromName('Café Day')).toBe('cafe-day');
  });

  it('gives Chinese names a stable event id', () => {
    const slug = slugFromName('浏览器实测活动');
    expect(slug).toMatch(/^event-[a-z0-9]+$/);
    expect(slugFromName('浏览器实测活动')).toBe(slug);
    expect(slugFromName('另一个活动')).not.toBe(slug);
  });

  it('returns empty for a blank name', () => {
    expect(slugFromName('   ')).toBe('');
  });
});
