/**
 * Client-side helpers for mobile in-app browsers (WeChat, WeCom, etc.).
 * Pure functions; safe to import from client components only.
 */

/** Detect WeChat / WeCom built-in browsers, where a.download is unreliable. */
export function isWechatBrowser(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /MicroMessenger|wxwork/i.test(ua);
}

/**
 * Encode an SVG string into a data URL. Unlike blob: URLs, data URLs survive
 * page navigation and can be long-pressed to save in WeChat's webview.
 */
export function svgToDataUrl(svg: string): string {
  // encodeURIComponent handles unicode correctly for both UTF-8 SVG payloads.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Turn a Blob into a data URL via FileReader. Used to show a real PNG <img>
 * that WeChat users can long-press and save (a.download is ignored there).
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片处理失败'));
    reader.readAsDataURL(blob);
  });
}
