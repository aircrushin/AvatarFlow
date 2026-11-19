import type { EventStatus } from '@/lib/types';

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft: '草稿',
  active: '进行中',
  paused: '已暂停',
  expired: '已结束',
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className="adm-badge" data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}
