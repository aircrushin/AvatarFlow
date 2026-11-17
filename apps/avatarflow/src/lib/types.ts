/** Domain model. Shared between the data layer, API and UI. */

export type EventStatus = 'draft' | 'active' | 'paused' | 'expired';

export interface EventRecord {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  status: EventStatus;
  startsAt: string | null;
  endsAt: string | null;
  generationLimit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventTheme {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  avatarBackground: string;
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  stickerEnabled: boolean;
  stickerText: string;
  instructions: string;
  contact: string;
}

export interface EventStyle {
  styleName: string;
  styleOptions: Record<string, unknown>;
  sortOrder: number;
}

export interface EventFull extends EventRecord {
  theme: EventTheme;
  styles: EventStyle[];
}

/** Fields safe to expose on a public event endpoint. */
export interface PublicEvent {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  status: EventStatus;
  theme: EventTheme;
  styles: Array<{
    styleName: string;
    styleOptions: Record<string, unknown>;
  }>;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'avatar_generate'
  | 'avatar_download'
  | 'share_click';

export interface AnalyticsRecord {
  id: string;
  eventId: string;
  eventType: AnalyticsEventType;
  createdAt: string;
}

export interface GenerationRecord {
  id: string;
  eventId: string;
  styleName: string;
  /** Hash of the seed. Raw seed / personal data is never stored. */
  seedHash: string;
  createdAt: string;
}

export const DEFAULT_THEME: EventTheme = {
  logoUrl: null,
  primaryColor: '#1F2933',
  secondaryColor: '#C8FF5A',
  backgroundColor: '#F6F7F4',
  avatarBackground: '#FFFFFF',
  borderEnabled: true,
  borderColor: '#1F2933',
  borderWidth: 8,
  stickerEnabled: false,
  stickerText: '',
  instructions: '生成一个属于你的品牌头像，下载后分享给朋友。',
  contact: '',
};
