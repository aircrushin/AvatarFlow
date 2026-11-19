import type { Metadata } from 'next';
import { repos } from '@/lib/db';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';
import EventIntroClient from './EventIntroClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Event pages are private, time-bound campaign instances. They are marked
 * noindex so they don't dilute the marketing site with thin/duplicate content,
 * but still carry accurate titles + Open Graph tags for social sharing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let name = '品牌头像互动活动';
  let description = '参与品牌头像互动，生成并分享你的专属头像。';

  try {
    const event = await repos().events.getBySlug(slug);
    if (event) {
      name = event.name;
      description =
        event.subtitle ||
        (event.description || '').slice(0, 120) ||
        description;
    }
  } catch {
    // If the data layer is unreachable, fall back to generic metadata rather
    // than failing the whole page.
  }

  const title = `${name} · AvatarFlow`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/e/${slug}` },
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: absoluteUrl(`/e/${slug}`),
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function EventIntroPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EventIntroClient slug={slug} />;
}
