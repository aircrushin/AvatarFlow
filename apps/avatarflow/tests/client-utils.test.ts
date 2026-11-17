import { describe, expect, it } from 'vitest';
import { readSvgResponse } from '../src/app/e/[slug]/create/client-utils';

describe('readSvgResponse', () => {
  it('reads raw SVG text from a successful generate response', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
    const res = new Response(svg, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
    });
    expect(await readSvgResponse(res)).toBe(svg);
  });

  it('surfaces the API error message from a JSON error response', async () => {
    const res = new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(readSvgResponse(res)).rejects.toThrow('请求过于频繁，请稍后再试');
  });

  it('falls back to a generic message for a non-JSON error body', async () => {
    const res = new Response('<html>bad gateway</html>', { status: 502 });
    await expect(readSvgResponse(res)).rejects.toThrow('生成失败');
  });
});
