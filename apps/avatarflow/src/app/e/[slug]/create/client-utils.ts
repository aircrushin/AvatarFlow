'use client';

export function newSeedClient(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The generate endpoint returns SVG text on success and a JSON error object
 * on failure. Reading every response as JSON throws "Unexpected token '<'"
 * on successful renders — handle the two shapes explicitly.
 */
export async function readSvgResponse(res: Response): Promise<string> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = (data as { error?: string }).error;
    throw new Error(message || '生成失败');
  }
  return res.text();
}

export async function track(
  slug: string,
  eventType: 'page_view' | 'avatar_generate' | 'avatar_download' | 'share_click',
): Promise<void> {
  try {
    let id = localStorage.getItem('avatarflow_visitor');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('avatarflow_visitor', id);
    }
    await fetch(`/api/public/events/${slug}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, visitorId: id }),
    });
  } catch {
    // Analytics must never block the flow.
  }
}
