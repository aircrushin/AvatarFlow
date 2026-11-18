import { describe, expect, it } from 'vitest';
import { isWechatBrowser, svgToDataUrl } from '../src/lib/wechat';

describe('isWechatBrowser', () => {
  it('detects WeChat built-in browser', () => {
    expect(isWechatBrowser('Mozilla/5.0 iPhone MicroMessenger/8.0')).toBe(true);
  });

  it('detects WeCom (wxwork) browser', () => {
    expect(isWechatBrowser('Mozilla/5.0 wxwork/4.0')).toBe(true);
  });

  it('returns false for regular mobile browsers', () => {
    expect(isWechatBrowser('Mozilla/5.0 iPhone Safari/605.1')).toBe(false);
    expect(isWechatBrowser('Mozilla/5.0 Android Chrome/120')).toBe(false);
  });
});

describe('svgToDataUrl', () => {
  it('produces a data URL that preserves unicode and markup', () => {
    const svg = '<svg><text>你好</text></svg>';
    const url = svgToDataUrl(svg);
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    const encoded = url.slice('data:image/svg+xml;charset=utf-8,'.length);
    expect(decodeURIComponent(encoded)).toBe(svg);
  });
});
