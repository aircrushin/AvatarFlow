import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AnalyticsEventType,
  AnalyticsRecord,
  EventFull,
  EventRecord,
  GenerationRecord,
} from '@/lib/types';
import type {
  AnalyticsRepository,
  EventRepository,
  GenerationRepository,
  Repositories,
} from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface LocalDB {
  events: EventFull[];
  analytics: AnalyticsRecord[];
  generations: GenerationRecord[];
  /** dedupe key -> timestamp ms */
  dedupe: Record<string, number>;
}

const EMPTY: LocalDB = { events: [], analytics: [], generations: [], dedupe: {} };

// Serialize all writes so concurrent API calls cannot corrupt the JSON file.
let writeChain: Promise<unknown> = Promise.resolve();

async function read(): Promise<LocalDB> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(raw) as LocalDB;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(EMPTY);
    throw err;
  }
}

async function write(db: LocalDB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_FILE);
}

function mutate<T>(fn: (db: LocalDB) => T | Promise<T>): Promise<T> {
  const next = writeChain.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  writeChain = next.catch(() => undefined);
  return next;
}

function toRecord(e: EventFull): EventRecord {
  const { theme: _theme, styles: _styles, ...rest } = e;
  return rest;
}

function publicClone(e: EventFull): EventFull {
  return structuredClone(e);
}

export const localEvents: EventRepository = {
  async list() {
    const db = await read();
    return db.events
      .map(toRecord)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getById(id) {
    const db = await read();
    const found = db.events.find((e) => e.id === id);
    return found ? publicClone(found) : null;
  },
  async getBySlug(slug) {
    const db = await read();
    const found = db.events.find((e) => e.slug === slug);
    return found ? publicClone(found) : null;
  },
  create(event) {
    return mutate((db) => {
      if (db.events.some((e) => e.slug === event.slug)) {
        throw new Error('SLUG_CONFLICT');
      }
      db.events.push(publicClone(event));
      return publicClone(event);
    });
  },
  update(id, patch) {
    return mutate((db) => {
      const idx = db.events.findIndex((e) => e.id === id);
      if (idx === -1) return null;
      const merged: EventFull = {
        ...db.events[idx]!,
        ...patch,
        theme: patch.theme ? { ...db.events[idx]!.theme, ...patch.theme } : db.events[idx]!.theme,
        styles: patch.styles ?? db.events[idx]!.styles,
        updatedAt: new Date().toISOString(),
      };
      if (
        patch.slug &&
        db.events.some((e) => e.id !== id && e.slug === patch.slug)
      ) {
        throw new Error('SLUG_CONFLICT');
      }
      db.events[idx] = merged;
      return publicClone(merged);
    });
  },
  remove(id) {
    return mutate((db) => {
      const before = db.events.length;
      db.events = db.events.filter((e) => e.id !== id);
      db.analytics = db.analytics.filter((a) => a.eventId !== id);
      db.generations = db.generations.filter((g) => g.eventId !== id);
      return db.events.length < before;
    });
  },
  async slugExists(slug) {
    const db = await read();
    return db.events.some((e) => e.slug === slug);
  },
};

/** Dedup window: repeated identical events within 30s count once. */
const DEDUPE_WINDOW_MS = 30_000;

export const localAnalytics: AnalyticsRepository = {
  record({ eventId, eventType, visitorId }) {
    return mutate((db) => {
      const key = visitorId
        ? `${eventId}:${eventType}:${visitorId}`
        : `${eventId}:${eventType}`;
      const now = Date.now();
      const last = db.dedupe[key] ?? 0;
      if (now - last < DEDUPE_WINDOW_MS) return { counted: false };
      db.dedupe[key] = now;
      db.analytics.push({
        id: randomUUID(),
        eventId,
        eventType,
        createdAt: new Date(now).toISOString(),
      });
      return { counted: true };
    });
  },
  async countByType(eventId) {
    const db = await read();
    const counts: Record<AnalyticsEventType, number> = {
      page_view: 0,
      avatar_generate: 0,
      avatar_download: 0,
      share_click: 0,
    };
    for (const a of db.analytics) {
      if (a.eventId === eventId) counts[a.eventType] += 1;
    }
    return counts;
  },
  async dailySeries(eventId, days) {
    const db = await read();
    const byDay = new Map<string, number>();
    const cutoff = Date.now() - days * 86_400_000;
    for (const a of db.analytics) {
      if (a.eventId !== eventId || Date.parse(a.createdAt) < cutoff) continue;
      const day = a.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
  async exportRows(eventId) {
    const db = await read();
    return db.analytics
      .filter((a) => a.eventId === eventId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((a) => ({ ...a }));
  },
};

export const localGenerations: GenerationRepository = {
  record({ eventId, styleName, seedHash }) {
    return mutate((db) => {
      const row: GenerationRecord = {
        id: randomUUID(),
        eventId,
        styleName,
        seedHash,
        createdAt: new Date().toISOString(),
      };
      db.generations.push(row);
      return row;
    });
  },
  async countForEvent(eventId) {
    const db = await read();
    return db.generations.filter((g) => g.eventId === eventId).length;
  },
  async recent(eventId, limit) {
    const db = await read();
    return db.generations
      .filter((g) => g.eventId === eventId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((g) => ({ ...g }));
  },
};

export const localRepositories: Repositories = {
  events: localEvents,
  analytics: localAnalytics,
  generations: localGenerations,
};
