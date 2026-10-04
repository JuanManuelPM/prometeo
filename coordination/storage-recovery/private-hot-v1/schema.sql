-- PROMETEO PRIMARY HOT V1
-- Intentionally tiny. Apply ONLY to the fresh private-HOT Supabase project.
-- No scheduler, worker telemetry, history, liveness, statistics or CURRENT authority.

create extension if not exists pgcrypto;

create table if not exists public.prometeo_primary_hot_workspaces_v1 (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.prometeo_primary_hot_requests_v1 (
  workspace_id uuid not null references public.prometeo_primary_hot_workspaces_v1(id) on delete cascade,
  request_id text not null,
  work_item_id text not null unique,
  page_id text not null,
  private_text text not null,
  state text not null default 'STORED' check (state in ('STORED','QUEUED','RETURNED','EXPIRED')),
  return_path text not null,
  wake_token_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  returned_at timestamptz,
  expires_at timestamptz not null default (now() + interval '72 hours'),
  primary key (workspace_id, request_id)
);

create index if not exists prometeo_primary_hot_requests_expiry_v1
  on public.prometeo_primary_hot_requests_v1(expires_at);

alter table public.prometeo_primary_hot_workspaces_v1 enable row level security;
alter table public.prometeo_primary_hot_requests_v1 enable row level security;

revoke all on public.prometeo_primary_hot_workspaces_v1 from anon, authenticated;
revoke all on public.prometeo_primary_hot_requests_v1 from anon, authenticated;
grant all on public.prometeo_primary_hot_workspaces_v1 to service_role;
grant all on public.prometeo_primary_hot_requests_v1 to service_role;

-- Deliberately no public RPCs, triggers, realtime publication, heartbeat tables or write-on-read hooks.
