'use client';

/** Browser-side visitor id, used only for analytics de-duplication. */
export function getVisitorId(): string {
  const key = 'avatarflow_visitor';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function track(
  slug: string,
  eventType: 'page_view' | 'avatar_generate' | 'avatar_download' | 'share_click',
): Promise<void> {
  try {
    await fetch(`/api/public/events/${slug}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, visitorId: getVisitorId() }),
    });
  } catch {
    // Analytics must never block the user flow.
  }
}
