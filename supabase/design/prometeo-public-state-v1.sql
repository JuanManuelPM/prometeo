-- DESIGN ONLY. DO NOT APPLY TO PRODUCTION.
-- This file is intentionally outside supabase/migrations/.
-- It documents the proposed backend shape for Prometeo Public State v1.
-- A future integrator must review auth/capability assumptions and create a new migration.

create table public.prometeo_state_entries (
  workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  channel text not null check (channel ~ '^[a-z][a-z0-9-]{0,62}$'),
  key text not null check (key ~ '^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$'),
  value_json jsonb not null,
  version bigint not null check (version > 0),
  source text not null,
  source_version bigint not null check (source_version > 0),
  schema_id text,
  visibility text not null default 'workspace'
    check (visibility in ('workspace','channel','public_anonymous')),
  history_mode text not null default 'none'
    check (history_mode in ('none','changes')),
  operation_id text,
  source_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  provenance jsonb not null default '{}'::jsonb,
  primary key (workspace_id, channel, key),
  unique (workspace_id, channel, key, operation_id)
);

create index prometeo_state_entries_channel_updated_idx
  on public.prometeo_state_entries(workspace_id, channel, updated_at desc);
create index prometeo_state_entries_expiry_idx
  on public.prometeo_state_entries(expires_at)
  where expires_at is not null;

create table public.prometeo_state_events (
  workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  event_id text not null,
  channel text not null,
  key text not null,
  value_json jsonb not null,
  version bigint not null,
  source text not null,
  source_version bigint not null,
  schema_id text,
  visibility text not null,
  operation_id text,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz,
  provenance jsonb not null default '{}'::jsonb,
  primary key (workspace_id, event_id),
  foreign key (workspace_id, channel, key)
    references public.prometeo_state_entries(workspace_id, channel, key) on delete cascade
);

create index prometeo_state_events_key_version_idx
  on public.prometeo_state_events(workspace_id, channel, key, version desc);

-- Policy registry. Exact implementation may live in code/config instead, but the
-- server needs an authoritative definition equivalent to these fields.
create table public.prometeo_state_definitions (
  workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  channel text not null,
  key text not null,
  source text not null,
  schema_id text,
  allowed_visibilities text[] not null default array['workspace']::text[],
  history_mode text not null default 'none' check (history_mode in ('none','changes')),
  allow_public_anonymous boolean not null default false,
  max_value_bytes integer not null default 16384 check (max_value_bytes > 0),
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, channel, key)
);

-- Optional channel authorization model for scopes narrower than the whole
-- workspace. Do not activate `friends` or similar sharing until the server can
-- resolve an authenticated actor/capability to one of these grants.
create table public.prometeo_state_channel_grants (
  workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  channel text not null,
  subject_kind text not null check (subject_kind in ('workspace','capability','user','surface')),
  subject_id text not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  source_prefix text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, channel, subject_kind, subject_id)
);

-- Match current Prometeo private-backend posture: tables are private and a
-- reviewed Edge Function/service layer performs authorization + validation.
alter table public.prometeo_state_entries enable row level security;
alter table public.prometeo_state_events enable row level security;
alter table public.prometeo_state_definitions enable row level security;
alter table public.prometeo_state_channel_grants enable row level security;

revoke all on public.prometeo_state_entries from anon, authenticated;
revoke all on public.prometeo_state_events from anon, authenticated;
revoke all on public.prometeo_state_definitions from anon, authenticated;
revoke all on public.prometeo_state_channel_grants from anon, authenticated;

-- Write algorithm to implement in a reviewed RPC/Edge Function transaction:
-- 1. authenticate workspace + actor/capability;
-- 2. resolve definition and channel grant;
-- 3. validate key/value/schema/visibility/size and public-anonymous opt-in;
-- 4. SELECT current entry FOR UPDATE;
-- 5. reject different source unless explicit ownership transfer exists;
-- 6. source_version lower -> STALE_SOURCE_VERSION;
-- 7. source_version equal + identical value -> idempotent return, no version bump;
-- 8. source_version equal + different value -> SOURCE_VERSION_CONFLICT;
-- 9. optional expected_version mismatch -> VERSION_CONFLICT;
-- 10. advance entry.version by 1 and upsert current value;
-- 11. if history_mode='changes', append one prometeo_state_events row;
-- 12. commit, then emit private Realtime Broadcast notification if enabled.
--
-- Anonymous/public reads should be served by a sanitized endpoint selecting only
-- definitions with allow_public_anonymous=true AND entries with
-- visibility='public_anonymous'. Never grant anonymous direct table access merely
-- for convenience.
