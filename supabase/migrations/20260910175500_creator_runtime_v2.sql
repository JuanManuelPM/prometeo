-- Creator runtime v2: multiple YouTube grants, resumable external jobs, global worker leasing.

alter table public.creator_provider_connections add column if not exists connection_key text not null default 'default';
alter table public.creator_oauth_states add column if not exists context jsonb not null default '{}'::jsonb;
alter table public.creator_channels add column if not exists youtube_connection_id uuid references public.creator_provider_connections(id) on delete set null;

alter table public.creator_provider_connections drop constraint if exists creator_provider_connections_owner_id_kind_provider_key;
drop index if exists creator_provider_connections_owner_id_kind_provider_key;
create unique index if not exists creator_provider_connections_owner_kind_provider_connection_uidx
  on public.creator_provider_connections(owner_id,kind,provider,connection_key);

create or replace function public.creator_claim_jobs(p_owner uuid, p_worker text, p_limit integer default 5)
returns setof public.creator_jobs
language plpgsql security definer set search_path='public' as $$
begin
  return query
  with picked as (
    select id from public.creator_jobs
    where owner_id=p_owner
      and status in ('QUEUED','RETRY','WAITING_EXTERNAL')
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

create or replace function public.creator_claim_any_jobs(p_worker text, p_limit integer default 10)
returns setof public.creator_jobs
language plpgsql security definer set search_path='public' as $$
begin
  return query
  with picked as (
    select id from public.creator_jobs
    where status in ('QUEUED','RETRY','WAITING_EXTERNAL')
      and available_at<=now()
      and (lease_until is null or lease_until<now())
      and attempt_count < max_attempts
      and actual_cost_cents <= max_cost_cents
    order by priority asc, created_at asc
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,10),50))
  )
  update public.creator_jobs j
     set status='RUNNING', lease_owner=p_worker, lease_until=now()+interval '4 minutes', last_heartbeat_at=now(), attempt_count=attempt_count+1, updated_at=now()
   where j.id in (select id from picked)
  returning j.*;
end $$;

revoke all on function public.creator_claim_any_jobs(text,integer) from public, anon, authenticated;
grant execute on function public.creator_claim_any_jobs(text,integer) to service_role;

create or replace function public.creator_worker_secret_matches(p_candidate text)
returns boolean language sql security definer set search_path='' as $$
  select exists(
    select 1 from vault.decrypted_secrets
    where name='creator:worker:cron' and decrypted_secret=p_candidate
  );
$$;
revoke all on function public.creator_worker_secret_matches(text) from public, anon, authenticated;
grant execute on function public.creator_worker_secret_matches(text) to service_role;

-- Generate a private machine-only cron secret without ever materializing it in GitHub.
do $$
begin
  if not exists(select 1 from vault.secrets where name='creator:worker:cron') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'creator:worker:cron','Creator worker cron bearer');
  end if;
end $$;
