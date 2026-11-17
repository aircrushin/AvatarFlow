import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';
import { DEFAULT_THEME, type EventFull, type EventRecord } from '@/lib/types';
import type {
  AnalyticsRepository,
  EventRepository,
  GenerationRepository,
  Repositories,
} from './types';

/** Service-role client. Server only. Bypasses RLS deliberately for admin ops. */
function adminClient(): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface EventRow {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  status: EventFull['status'];
  starts_at: string | null;
  ends_at: string | null;
  generation_limit: number | null;
  created_at: string;
  updated_at: string;
  theme: Record<string, unknown> | null;
  styles: Array<Record<string, unknown>> | null;
}

function rowToFull(row: EventRow): EventFull {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle ?? '',
    description: row.description ?? '',
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    generationLimit: row.generation_limit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    theme: { ...DEFAULT_THEME, ...(row.theme ?? {}) } as EventFull['theme'],
    styles: (row.styles ?? []) as unknown as EventFull['styles'],
  };
}

function fullToRow(e: EventFull): Record<string, unknown> {
  return {
    slug: e.slug,
    name: e.name,
    subtitle: e.subtitle,
    description: e.description,
    status: e.status,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    generation_limit: e.generationLimit,
    theme: e.theme,
    styles: e.styles,
    updated_at: e.updatedAt,
  };
}

function toRecord(e: EventFull): EventRecord {
  const { theme: _t, styles: _s, ...rest } = e;
  return rest;
}

export const supabaseEvents: EventRepository = {
  async list() {
    const { data, error } = await adminClient()
      .from('events')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as EventRow[]).map((r) => toRecord(rowToFull(r)));
  },
  async getById(id) {
    const { data, error } = await adminClient()
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToFull(data as EventRow) : null;
  },
  async getBySlug(slug) {
    const { data, error } = await adminClient()
      .from('events')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToFull(data as EventRow) : null;
  },
  async create(event) {
    const { error } = await adminClient().from('events').insert({
      id: event.id,
      ...fullToRow(event),
      created_at: event.createdAt,
    });
    if (error) {
      if (error.code === '23505') throw new Error('SLUG_CONFLICT');
      throw error;
    }
    return event;
  },
  async update(id, patch) {
    const current = await this.getById(id);
    if (!current) return null;
    const merged: EventFull = {
      ...current,
      ...patch,
      theme: patch.theme ? { ...current.theme, ...patch.theme } : current.theme,
      styles: patch.styles ?? current.styles,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await adminClient()
      .from('events')
      .update(fullToRow(merged))
      .eq('id', id);
    if (error) {
      if (error.code === '23505') throw new Error('SLUG_CONFLICT');
      throw error;
    }
    return merged;
  },
  async remove(id) {
    const { error } = await adminClient().from('events').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async slugExists(slug) {
    const { data, error } = await adminClient()
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },
};

/** Dedup via a unique key on (event_id, event_type, visitor_id, bucket). */
export const supabaseAnalytics: AnalyticsRepository = {
  async record({ eventId, eventType, visitorId }) {
    const bucket = String(Math.floor(Date.now() / 30_000));
    const { error } = await adminClient().from('event_analytics').insert({
      event_id: eventId,
      event_type: eventType,
      visitor_id: visitorId ?? null,
      bucket,
    });
    if (error) {
      if (error.code === '23505') return { counted: false };
      throw error;
    }
    return { counted: true };
  },
  async countByType(eventId) {
    const { data, error } = await adminClient()
      .from('event_analytics')
      .select('event_type')
      .eq('event_id', eventId);
    if (error) throw error;
    const counts = {
      page_view: 0,
      avatar_generate: 0,
      avatar_download: 0,
      share_click: 0,
    } as Record<string, number>;
    for (const row of data ?? []) counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    return counts as unknown as ReturnType<AnalyticsRepository['countByType']>;
  },
  async dailySeries(eventId, days) {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await adminClient()
      .from('event_analytics')
      .select('created_at')
      .eq('event_id', eventId)
      .gte('created_at', since);
    if (error) throw error;
    const byDay = new Map<string, number>();
    for (const row of data ?? []) {
      const day = String(row.created_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
  async exportRows(eventId) {
    const { data, error } = await adminClient()
      .from('event_analytics')
      .select('id, event_id, event_type, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: String(r.id),
      eventId: String(r.event_id),
      eventType: r.event_type as never,
      createdAt: String(r.created_at),
    }));
  },
};

function toGenerationRecord(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    styleName: String(row.style_name),
    seedHash: String(row.seed_hash),
    createdAt: String(row.created_at),
  };
}

export const supabaseGenerations: GenerationRepository = {
  async record({ eventId, styleName, seedHash }) {
    const { data, error } = await adminClient()
      .from('avatar_generations')
      .insert({ event_id: eventId, style_name: styleName, seed_hash: seedHash })
      .select('id, event_id, style_name, seed_hash, created_at')
      .single();
    if (error) throw error;
    return toGenerationRecord(data as Record<string, unknown>);
  },
  async countForEvent(eventId) {
    const { count, error } = await adminClient()
      .from('avatar_generations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (error) throw error;
    return count ?? 0;
  },
  async recent(eventId, limit) {
    const { data, error } = await adminClient()
      .from('avatar_generations')
      .select('id, event_id, style_name, seed_hash, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => toGenerationRecord(r as Record<string, unknown>));
  },
};

export const supabaseRepositories: Repositories = {
  events: supabaseEvents,
  analytics: supabaseAnalytics,
  generations: supabaseGenerations,
};
