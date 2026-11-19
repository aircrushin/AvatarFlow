/**
 * Central SEO / site metadata.
 *
 * All public URLs are derived from a single configurable base so that
 * canonical tags, Open Graph tags, sitemap and robots stay consistent
 * across local development and production deployments.
 */

/** Canonical public origin, without a trailing slash. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

export const SITE_NAME = 'AvatarFlow';
export const SITE_TITLE = 'AvatarFlow — 企业品牌头像互动平台';
export const SITE_DESCRIPTION =
  '企业上传 Logo，配置品牌色与头像风格，几分钟内生成可扫码参与的移动端头像互动活动，让每一次扫码都成为一次品牌曝光。';

/** Chinese keywords targeted at the B2B buyers of the product. */
export const SITE_KEYWORDS = [
  '品牌头像',
  '头像互动',
  '企业头像生成器',
  '活动H5',
  '扫码互动',
  '品牌营销工具',
  '年会互动',
  '活动数据统计',
  'AvatarFlow',
];

export const SITE_LOCALE = 'zh_CN';

/**
 * Build an absolute public URL from a root-relative path.
 * e.g. absoluteUrl('/showcase') -> 'https://example.com/showcase'
 */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}
