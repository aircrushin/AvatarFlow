import { describe, it, expect } from 'vitest';
import { createEventSchema, generateSchema, themeSchema, updateEventSchema } from '../src/lib/validation';
import { DEFAULT_THEME } from '../src/lib/types';

describe('Event validation', () => {
  const validEvent = {
    slug: 'spring-brand-2026',
    name: '春季品牌日',
    theme: DEFAULT_THEME,
    styles: [{ styleName: 'lorelei', styleOptions: {}, sortOrder: 0 }],
  };

  it('accepts a valid event', () => {
    expect(createEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(createEventSchema.safeParse({ ...validEvent, slug: 'Invalid Slug!' }).success).toBe(false);
  });

  it('rejects an event with no styles', () => {
    expect(createEventSchema.safeParse({ ...validEvent, styles: [] }).success).toBe(false);
  });

  it('rejects malformed colors', () => {
    const bad = themeSchema.safeParse({ ...DEFAULT_THEME, primaryColor: 'red' });
    expect(bad.success).toBe(false);
  });
});

describe('Update validation', () => {
  it('does not inject create-time defaults into partial updates', () => {
    const result = updateEventSchema.safeParse({ generationLimit: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('status');
      expect(result.data).not.toHaveProperty('name');
    }
  });

  it('accepts an explicit status change', () => {
    const result = updateEventSchema.safeParse({ status: 'paused' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('paused');
  });
});

describe('Generate validation', () => {
  it('accepts default png generation', () => {
    expect(generateSchema.safeParse({ styleName: 'lorelei' }).success).toBe(true);
  });

  it('rejects size outside bounds', () => {
    expect(generateSchema.safeParse({ styleName: 'lorelei', size: 9999 }).success).toBe(false);
  });

  it('rejects unknown format', () => {
    expect(generateSchema.safeParse({ styleName: 'lorelei', format: 'gif' }).success).toBe(false);
  });
});
