import 'server-only';
import type { EventFull, EventRecord, EventStatus } from '@/lib/types';
import { repos } from '@/lib/db';

/** Minimal shape needed for time/status checks — works for EventRecord and EventFull. */
type StatusLike = Pick<EventRecord, 'status' | 'startsAt' | 'endsAt'>;

export function isEventTimeValid(event: StatusLike, now = new Date()): boolean {
  const ts = now.getTime();
  if (event.startsAt && Date.parse(event.startsAt) > ts) return false;
  if (event.endsAt && Date.parse(event.endsAt) < ts) return false;
  return true;
}

export type Availability = { ok: true } | { ok: false; reason: string };

/** Server-side gate for all public generation. Never trust the client. */
export async function canGenerate(event: EventFull): Promise<Availability> {
  if ((['paused', 'expired', 'draft'] as EventStatus[]).includes(event.status)) {
    return { ok: false, reason: '活动当前未开放生成。' };
  }
  if (!isEventTimeValid(event)) {
    return { ok: false, reason: '活动尚未开始或已经结束。' };
  }
  if (event.generationLimit !== null) {
    const count = await repos().generations.countForEvent(event.id);
    if (count >= event.generationLimit) {
      return { ok: false, reason: '本活动头像生成次数已达上限。' };
    }
  }
  return { ok: true };
}

/** Effective status including time-based expiry. */
export function effectiveStatus(event: StatusLike, now = new Date()): EventStatus {
  if (event.status === 'active' && event.endsAt && Date.parse(event.endsAt) < now.getTime()) {
    return 'expired';
  }
  return event.status;
}
