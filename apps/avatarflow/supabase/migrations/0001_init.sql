-- AvatarFlow initial schema.
-- Target: Supabase PostgreSQL. Apply via Supabase SQL editor or the CLI.
-- Service role key bypasses RLS; anon clients only read active public events.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  generation_limit integer check (generation_limit is null or generation_limit > 0),
  theme jsonb not null default '{}'::jsonb,
  styles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

create index if not exists idx_events_slug on public.events (slug);
create index if not exists idx_events_status on public.events (status);

-- ---------------------------------------------------------------------------
-- avatar_generations
-- ---------------------------------------------------------------------------
create table if not exists public.avatar_generations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  style_name text not null,
  seed_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_generations_event on public.avatar_generations (event_id);
create index if not exists idx_generations_event_created
  on public.avatar_generations (event_id, created_at desc);

-- ---------------------------------------------------------------------------
-- event_analytics
-- ---------------------------------------------------------------------------
create table if not exists public.event_analytics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  event_type text not null
    check (event_type in ('page_view', 'avatar_generate', 'avatar_download', 'share_click')),
  visitor_id uuid,
  bucket text not null,
  created_at timestamptz not null default now(),
  -- Dedupe: one event type per visitor per 30-second bucket.
  constraint uq_analytics_dedupe unique (event_id, event_type, visitor_id, bucket)
);

create index if not exists idx_analytics_event on public.event_analytics (event_id);
create index if not exists idx_analytics_event_type
  on public.event_analytics (event_id, event_type);
create index if not exists idx_analytics_created
  on public.event_analytics (event_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.avatar_generations enable row level security;
alter table public.event_analytics enable row level security;
alter table public.admins enable row level security;

-- Public (anon) read of active events only.
drop policy if exists "public read active events" on public.events;
create policy "public read active events"
  on public.events for select
  to anon, authenticated
  using (status = 'active');

-- No anon write policies: all writes go through the service-role server.
-- Generations and analytics are write-only from the server; anon has no access.
