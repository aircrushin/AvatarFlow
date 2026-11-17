import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AvatarFlow — 企业品牌头像互动平台',
    template: '%s · AvatarFlow',
  },
  description:
    '企业上传 Logo，配置品牌色与头像风格，几分钟内生成可扫码参与的移动端头像互动活动。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f7f8f5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
