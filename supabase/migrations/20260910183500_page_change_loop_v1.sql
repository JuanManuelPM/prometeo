-- Page Change Loop v1: private projection connecting P4 Captures to disposable execution agents.
create table if not exists public.prometeo_change_threads (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  page_id text not null, page_title text, status text not null default 'OPEN' check (status in ('OPEN','CLOSED')),
  baseline jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_capture_at timestamptz, last_execution_at timestamptz, last_result_at timestamptz, seen_through_at timestamptz
);
create unique index if not exists prometeo_change_threads_one_open_per_page on public.prometeo_change_threads(workspace_id,page_id) where status='OPEN';
create index if not exists prometeo_change_threads_workspace_updated on public.prometeo_change_threads(workspace_id,updated_at desc);

create table if not exists public.prometeo_change_thread_captures (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  thread_id uuid not null references public.prometeo_change_threads(id) on delete cascade, capture_id text not null, revision integer not null check (revision>0),
  revision_ref text not null, digest text, state text not null default 'PENDING' check (state in ('PENDING','SUBMITTED','METABOLIZED','SUPERSEDED')),
  created_at timestamptz not null default now(), submitted_at timestamptz, unique(workspace_id,revision_ref)
);
create index if not exists prometeo_change_thread_captures_thread_state on public.prometeo_change_thread_captures(thread_id,state,created_at);

create table if not exists public.prometeo_project_agent_grants (
  workspace_id uuid primary key references public.prometeo_workspaces(id) on delete cascade, enabled boolean not null default false,
  scope text not null default 'PROMETEO_PROJECT', policy jsonb not null default '{}'::jsonb, approved_at timestamptz, updated_at timestamptz not null default now()
);

create table if not exists public.prometeo_execution_packets (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  thread_id uuid not null references public.prometeo_change_threads(id) on delete cascade, page_id text not null, work_item_id text not null unique,
  packet_token_hash text not null unique, return_token_hash text not null unique, selected_revision_refs text[] not null default '{}', snapshot jsonb not null,
  snapshot_hash text not null, return_path text not null, status text not null default 'READY' check (status in ('READY','CLAIMED','EXECUTING','CANDIDATE_READY','VERIFIED','SERVED','BLOCKED','FAILED')),
  candidate_url text, served_url text, created_at timestamptz not null default now(), expires_at timestamptz not null, claimed_at timestamptz, completed_at timestamptz, last_polled_at timestamptz
);
create index if not exists prometeo_execution_packets_thread_created on public.prometeo_execution_packets(thread_id,created_at desc);

create table if not exists public.prometeo_execution_results (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  thread_id uuid not null references public.prometeo_change_threads(id) on delete cascade, work_item_id text not null unique references public.prometeo_execution_packets(work_item_id) on delete cascade,
  status text not null check (status in ('CANDIDATE_READY','VERIFIED','SERVED','BLOCKED','FAILED')), source text not null default 'AGENT_RETURN',
  summary jsonb not null default '{}'::jsonb, detail jsonb not null default '{}'::jsonb, candidate_url text, served_url text,
  created_at timestamptz not null default now(), seen_at timestamptz
);
create index if not exists prometeo_execution_results_thread_created on public.prometeo_execution_results(thread_id,created_at desc);

create table if not exists public.prometeo_change_attachments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.prometeo_workspaces(id) on delete cascade,
  thread_id uuid not null references public.prometeo_change_threads(id) on delete cascade, page_id text not null, file_name text not null, mime_type text,
  size_bytes bigint not null default 0, digest text, storage_path text not null,
  state text not null default 'PENDING' check (state in ('PENDING','SUBMITTED','METABOLIZED','DELETED')), created_at timestamptz not null default now(), submitted_at timestamptz
);
create index if not exists prometeo_change_attachments_thread_state on public.prometeo_change_attachments(thread_id,state,created_at);

alter table public.prometeo_change_threads enable row level security;
alter table public.prometeo_change_thread_captures enable row level security;
alter table public.prometeo_project_agent_grants enable row level security;
alter table public.prometeo_execution_packets enable row level security;
alter table public.prometeo_execution_results enable row level security;
alter table public.prometeo_change_attachments enable row level security;
revoke all on public.prometeo_change_threads from anon, authenticated;
revoke all on public.prometeo_change_thread_captures from anon, authenticated;
revoke all on public.prometeo_project_agent_grants from anon, authenticated;
revoke all on public.prometeo_execution_packets from anon, authenticated;
revoke all on public.prometeo_execution_results from anon, authenticated;
revoke all on public.prometeo_change_attachments from anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values('prometeo-capture-private','prometeo-capture-private',false,52428800)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;
