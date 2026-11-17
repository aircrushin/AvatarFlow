import type {
  AnalyticsEventType,
  AnalyticsRecord,
  EventFull,
  EventRecord,
  GenerationRecord,
} from '@/lib/types';

/** Storage-agnostic persistence contract. */
export interface EventRepository {
  list(): Promise<EventRecord[]>;
  getById(id: string): Promise<EventFull | null>;
  getBySlug(slug: string): Promise<EventFull | null>;
  create(event: EventFull): Promise<EventFull>;
  update(id: string, patch: Partial<EventFull>): Promise<EventFull | null>;
  remove(id: string): Promise<boolean>;
  slugExists(slug: string): Promise<boolean>;
}

export interface AnalyticsRepository {
  record(input: {
    eventId: string;
    eventType: AnalyticsEventType;
    visitorId?: string;
  }): Promise<{ counted: boolean }>;
  countByType(eventId: string): Promise<Record<AnalyticsEventType, number>>;
  dailySeries(eventId: string, days: number): Promise<Array<{ day: string; count: number }>>;
  exportRows(eventId: string): Promise<AnalyticsRecord[]>;
}

export interface GenerationRepository {
  record(input: {
    eventId: string;
    styleName: string;
    seedHash: string;
  }): Promise<GenerationRecord>;
  countForEvent(eventId: string): Promise<number>;
  recent(eventId: string, limit: number): Promise<GenerationRecord[]>;
}

export interface Repositories {
  events: EventRepository;
  analytics: AnalyticsRepository;
  generations: GenerationRepository;
}
