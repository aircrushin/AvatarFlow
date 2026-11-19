import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * Static marketing pages only. Event pages (/e/[slug]) are intentionally
 * excluded: they are private, time-bound and marked noindex to avoid
 * duplicate / thin content diluting the site's SEO.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/showcase'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];
}
