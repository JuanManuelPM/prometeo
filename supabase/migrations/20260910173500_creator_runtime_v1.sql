-- Prometeo creator runtime v1: provider-agnostic durable core.
-- Secrets live only in Supabase Vault. Assets live in private Storage.

create extension if not exists pgcrypto;

create table if not exists public.creator_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  slug text not null,
  title text not null,
  youtube_channel_id text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ARCHIVED')),
  world jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, slug)
);
create unique index if not exists creator_channels_owner_youtube_uidx on public.creator_channels(owner_id, youtube_channel_id) where youtube_channel_id is not null;

create table if not exists public.creator_stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid not null references public.creator_channels(id) on delete cascade,
  title text not null,
  summary text not null default '',
  status text not null default 'IDEA' check (status in ('IDEA','DEVELOPING','APPROVED','ARCHIVED')),
  version integer not null default 1,
  story_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists creator_stories_channel_idx on public.creator_stories(channel_id, updated_at desc);

create table if not exists public.creator_videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid not null references public.creator_channels(id) on delete cascade,
  story_id uuid references public.creator_stories(id) on delete set null,
  title text not null,
  hook text not null default '',
  state text not null default 'IDEA' check (state in ('IDEA','PREPARED','GENERATING','VALIDATING','READY','PUBLISHING','PUBLISHED','BLOCKED','FAILED','ARCHIVED')),
  format text not null default 'SHORT_9_16',
  target_duration_ms integer,
  scheduled_at timestamptz,
  published_at timestamptz,
  youtube_video_id text,
  idempotency_key text,
  creative jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  estimated_cost_cents integer not null default 0 check (estimated_cost_cents >= 0),
  actual_cost_cents integer not null default 0 check (actual_cost_cents >= 0),
  max_cost_cents integer not null default 500 check (max_cost_cents >= 0),
  max_regenerations integer not null default 3 check (max_regenerations between 0 and 20),
  regeneration_count integer not null default 0 check (regeneration_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, idempotency_key)
);
create index if not exists creator_videos_channel_state_idx on public.creator_videos(channel_id, state, coalesce(scheduled_at,published_at,created_at));
create unique index if not exists creator_videos_youtube_uidx on public.creator_videos(owner_id, youtube_video_id) where youtube_video_id is not null;

create table if not exists public.creator_scripts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  version integer not null,
  script text not null,
  voice_script text,
  structure jsonb not null default '[]'::jsonb,
  score jsonb not null default '{}'::jsonb,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique(video_id, version)
);

create table if not exists public.creator_scenes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  script_id uuid references public.creator_scripts(id) on delete set null,
  scene_no integer not null,
  start_ms integer not null default 0,
  end_ms integer not null default 0,
  spoken_text text not null default '',
  visual_goal text not null default '',
  scene_spec jsonb not null default '{}'::jsonb,
  provider text,
  provider_operation_id text,
  asset_id uuid,
  validation jsonb not null default '{}'::jsonb,
  state text not null default 'PLANNED' check (state in ('PLANNED','QUEUED','GENERATING','READY','INVALID','FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(video_id, scene_no)
);

create table if not exists public.creator_prompts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  scene_id uuid references public.creator_scenes(id) on delete cascade,
  kind text not null,
  provider text not null,
  conceptual jsonb not null default '{}'::jsonb,
  compiled_text text not null,
  compiler_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid references public.creator_channels(id) on delete cascade,
  video_id uuid references public.creator_videos(id) on delete cascade,
  scene_id uuid references public.creator_scenes(id) on delete cascade,
  kind text not null check (kind in ('IMAGE','VIDEO_SCENE','VOICE','MUSIC','SFX','THUMBNAIL','MASTER','SUBTITLE','OTHER')),
  bucket text not null default 'creator-assets',
  object_path text not null,
  mime_type text,
  byte_size bigint,
  duration_ms integer,
  sha256 text,
  provider text,
  provider_asset_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(owner_id, object_path)
);

alter table public.creator_scenes drop constraint if exists creator_scenes_asset_fk;
alter table public.creator_scenes add constraint creator_scenes_asset_fk foreign key(asset_id) references public.creator_assets(id) on delete set null;

create table if not exists public.creator_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid references public.creator_channels(id) on delete cascade,
  video_id uuid references public.creator_videos(id) on delete cascade,
  story_id uuid references public.creator_stories(id) on delete cascade,
  kind text not null,
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','WAITING_EXTERNAL','WAITING_AUTH','BLOCKED','RETRY','SUCCEEDED','FAILED','CANCELLED')),
  provider text,
  provider_operation_id text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error jsonb,
  idempotency_key text not null,
  priority integer not null default 100,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  estimated_cost_cents integer not null default 0,
  actual_cost_cents integer not null default 0,
  max_cost_cents integer not null default 500,
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_until timestamptz,
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, idempotency_key)
);
create index if not exists creator_jobs_claim_idx on public.creator_jobs(status, available_at, priority, created_at);
create index if not exists creator_jobs_video_idx on public.creator_jobs(video_id, created_at);

create table if not exists public.creator_job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.creator_jobs(id) on delete cascade,
  owner_id uuid not null,
  event text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists creator_job_events_job_idx on public.creator_job_events(job_id,id);

create table if not exists public.creator_video_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  version integer not null,
  master_asset_id uuid references public.creator_assets(id) on delete set null,
  scene_manifest jsonb not null default '[]'::jsonb,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique(video_id, version)
);

create table if not exists public.creator_validation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  video_version_id uuid references public.creator_video_versions(id) on delete cascade,
  kind text not null check (kind in ('DETERMINISTIC','SEMANTIC','NOVELTY','PUBLICATION')),
  status text not null check (status in ('PASS','FAIL','WARN')),
  score numeric,
  findings jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid not null references public.creator_channels(id) on delete cascade,
  video_id uuid not null references public.creator_videos(id) on delete cascade,
  platform text not null default 'YOUTUBE',
  external_id text,
  status text not null default 'PREPARED' check (status in ('PREPARED','WAITING_AUTH','UPLOADING','PRIVATE','SCHEDULED','PUBLIC','FAILED')),
  scheduled_at timestamptz,
  published_at timestamptz,
  request jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, platform, idempotency_key),
  unique(owner_id, platform, external_id)
);

create table if not exists public.creator_analytics_snapshots (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  channel_id uuid not null references public.creator_channels(id) on delete cascade,
  video_id uuid references public.creator_videos(id) on delete cascade,
  captured_at timestamptz not null,
  source text not null default 'SIMULATED' check (source in ('SIMULATED','YOUTUBE_ANALYTICS')),
  metrics jsonb not null,
  created_at timestamptz not null default now(),
  unique(owner_id, video_id, captured_at, source)
);
create index if not exists creator_analytics_channel_time_idx on public.creator_analytics_snapshots(channel_id,captured_at);

create table if not exists public.creator_experiments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid not null references public.creator_channels(id) on delete cascade,
  video_id uuid references public.creator_videos(id) on delete cascade,
  hypothesis text not null,
  dimensions jsonb not null default '{}'::jsonb,
  outcome jsonb not null default '{}'::jsonb,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETE','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_provider_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind text not null,
  provider text not null,
  mode text not null default 'MOCK' check (mode in ('MOCK','CONFIGURED','VERIFIED_REAL','BLOCKED')),
  vault_secret_id uuid,
  vault_aux_secret_id uuid,
  external_account_id text,
  scopes text[] not null default '{}',
  verified_at timestamptz,
  expires_at timestamptz,
  last_probe jsonb not null default '{}'::jsonb,
  last_error jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, kind, provider)
);

create table if not exists public.creator_oauth_states (
  state text primary key,
  owner_id uuid not null,
  provider text not null,
  return_to text,
  code_verifier text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_external_work (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  channel_id uuid not null references public.creator_channels(id) on delete cascade,
  story_id uuid references public.creator_stories(id) on delete cascade,
  video_id uuid references public.creator_videos(id) on delete cascade,
  task text not null,
  context_version integer not null default 1,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN' check (status in ('OPEN','CLAIMED','RETURNED','APPLIED','CANCELLED')),
  claim_token_hash text,
  result jsonb,
  claimed_at timestamptz,
  returned_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.creator_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['creator_channels','creator_stories','creator_videos','creator_scenes','creator_jobs','creator_publications','creator_experiments','creator_provider_connections','creator_external_work'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.creator_touch_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.creator_claim_jobs(p_owner uuid, p_worker text, p_limit integer default 5)
returns setof public.creator_jobs
language plpgsql security definer set search_path='public' as $$
begin
  return query
  with picked as (
    select id from public.creator_jobs
    where owner_id=p_owner
      and status in ('QUEUED','RETRY')
      and available_at<=now()
      and (lease_until is null or lease_until<now())
      and attempt_count < max_attempts
      and actual_cost_cents <= max_cost_cents
    order by priority asc, created_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,5),20))
  )
  update public.creator_jobs j
     set status='RUNNING', lease_owner=p_worker, lease_until=now()+interval '4 minutes', last_heartbeat_at=now(), attempt_count=attempt_count+1, updated_at=now()
   where j.id in (select id from picked)
  returning j.*;
end $$;

create or replace function public.creator_recover_stale_jobs()
returns integer language plpgsql security definer set search_path='public' as $$
declare n integer;
begin
  update public.creator_jobs
     set status=case when attempt_count>=max_attempts then 'FAILED' else 'RETRY' end,
         available_at=case when attempt_count>=max_attempts then available_at else now()+interval '15 seconds' end,
         lease_owner=null, lease_until=null, updated_at=now(),
         error=coalesce(error,'{}'::jsonb)||jsonb_build_object('recovered_stale_lease_at',now())
   where status='RUNNING' and lease_until<now();
  get diagnostics n=row_count;
  return n;
end $$;

create or replace function public.creator_vault_store(p_owner uuid, p_kind text, p_secret text)
returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; nm text := 'creator:'||p_owner::text||':'||p_kind;
begin
  if p_secret is null or length(p_secret)<1 then raise exception 'EMPTY_SECRET'; end if;
  select id into sid from vault.secrets where name=nm limit 1;
  if sid is null then
    sid := vault.create_secret(p_secret,nm,'Prometeo creator runtime secret');
  else
    perform vault.update_secret(sid,p_secret,nm,'Prometeo creator runtime secret',null);
  end if;
  return sid;
end $$;

create or replace function public.creator_vault_read(p_secret_id uuid)
returns text language sql security definer set search_path='' as $$
  select decrypted_secret from vault.decrypted_secrets where id=p_secret_id;
$$;

revoke all on function public.creator_claim_jobs(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.creator_recover_stale_jobs() from public, anon, authenticated;
revoke all on function public.creator_vault_store(uuid,text,text) from public, anon, authenticated;
revoke all on function public.creator_vault_read(uuid) from public, anon, authenticated;
grant execute on function public.creator_claim_jobs(uuid,text,integer) to service_role;
grant execute on function public.creator_recover_stale_jobs() to service_role;
grant execute on function public.creator_vault_store(uuid,text,text) to service_role;
grant execute on function public.creator_vault_read(uuid) to service_role;

-- User-facing tables are protected even if accessed outside Edge Functions.
do $$ declare t text; begin
  foreach t in array array['creator_channels','creator_stories','creator_videos','creator_scripts','creator_scenes','creator_prompts','creator_assets','creator_jobs','creator_job_events','creator_video_versions','creator_validation_runs','creator_publications','creator_analytics_snapshots','creator_experiments','creator_provider_connections','creator_external_work'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I_owner_all on public.%I',t,t);
    execute format('create policy %I_owner_all on public.%I for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid())',t,t);
  end loop;
end $$;

alter table public.creator_oauth_states enable row level security;
drop policy if exists creator_oauth_states_owner_all on public.creator_oauth_states;
create policy creator_oauth_states_owner_all on public.creator_oauth_states for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('creator-assets','creator-assets',false,1048576000,array['video/mp4','video/webm','audio/mpeg','audio/wav','audio/ogg','image/jpeg','image/png','image/webp','text/vtt','application/json'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists creator_assets_read_own on storage.objects;
create policy creator_assets_read_own on storage.objects for select to authenticated using(bucket_id='creator-assets' and (storage.foldername(name))[1]=auth.uid()::text);

-- Fixture tenant is intentionally synthetic and never maps to auth.users.
insert into public.creator_channels(id,owner_id,slug,title,status,world,settings)
values('c1000000-0000-4000-8000-000000000001','cafe0000-0000-4000-8000-000000000001','frutidrama','Frutidrama','ACTIVE',
       '{"premise":"telenovela vertical con personajes-fruta","tone":"melodrama absurdo","characters":["Banana","Frutilla","Durazno","Limón","Sandía"]}',
       '{"fixture":true,"target_format":"SHORT_9_16"}')
on conflict(id) do nothing;

insert into public.creator_stories(id,owner_id,channel_id,title,summary,status,story_data)
values
('c2000000-0000-4000-8000-000000000001','cafe0000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','La boda secreta de Banana','Banana se casa con Durazno. Frutilla aparece con un compromiso anterior.','APPROVED','{"fixture":true}'),
('c2000000-0000-4000-8000-000000000002','cafe0000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','La herencia de Sandía','El testamento sólo premia a quien nunca le haya mentido a la abuela.','APPROVED','{"fixture":true}')
on conflict(id) do nothing;
