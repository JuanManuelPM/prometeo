-- F002: reproducible observed-cause classification for frozen worker postmortems.
-- Raw detector reason remains in prometeo_worker_deaths.reason.
-- inferred_cause is never used to compute or overwrite observed_cause.

create or replace function public.prometeo_observed_death_cause(p_death_id bigint)
returns text
language sql
stable
set search_path to 'public'
as $function$
with d as (
  select *
  from public.prometeo_worker_deaths
  where death_id=p_death_id
),
ev as (
  select e.*
  from public.prometeo_events e
  join d on d.agent_id=e.agent_id
  where e.created_at<=d.detected_at
    and e.created_at>=coalesce(d.joined_at,'-infinity'::timestamptz)
),
facts as (
  select
    bool_or(event_type in ('JOB_ASSIGNED','RESCUE_ASSIGNED')) as ever_assigned,
    max(created_at) filter(where event_type in ('JOB_ASSIGNED','RESCUE_ASSIGNED')) as last_assigned_at,
    max(created_at) filter(where event_type='LEASE_EXPIRED') as last_lease_expired_at,
    bool_or(event_type='STALE_RESULT_REJECTED') as has_stale,
    bool_or(event_type='CHECKPOINT' and payload->>'milestone'='TOOL_ERROR') as has_tool_error,
    bool_or(event_type='CHECKPOINT' and payload->>'milestone'='TOOL_ERROR' and lower(payload::text) like '%security%') as has_security_error,
    bool_or(
      event_type='CHECKPOINT' and payload->>'milestone'='TOOL_ERROR'
      and (
        lower(payload::text) like '%rate_limit%'
        or lower(payload::text) like '%rate limit%'
        or lower(payload::text) like '%retry-after%'
        or lower(payload::text) like '%retry_after%'
      )
    ) as has_rate_limit,
    (array_agg(event_type order by created_at desc,event_id desc))[1] as last_event_type
  from ev
),
outs as (
  select max(o.published_at) as last_publish_at
  from public.prometeo_outputs o
  join d on d.worker_code=o.worker_code
  where o.published_at<=d.detected_at
    and o.published_at>=coalesce(d.joined_at,'-infinity'::timestamptz)
)
select case
  when coalesce(f.has_security_error,false) then 'SECURITY_BLOCK'
  when coalesce(f.has_rate_limit,false) then 'RATE_LIMIT'
  when coalesce(f.has_tool_error,false) then 'TOOL_ERROR'
  when coalesce(f.has_stale,false) then 'STALE_RESULT_REJECTED'
  when f.last_lease_expired_at is not null
       and (o.last_publish_at is null or f.last_lease_expired_at>o.last_publish_at)
    then 'LEASE_EXPIRED'
  when o.last_publish_at is not null
       and (f.last_assigned_at is null or f.last_assigned_at<=o.last_publish_at)
    then 'SILENCE_AFTER_PUBLISH'
  when not coalesce(f.ever_assigned,false) and o.last_publish_at is null
    then 'NEVER_WORKED'
  when f.last_event_type='PARKED' then 'PARKED_SILENCE'
  when d.reason like 'WAIT_SILENCE%' then 'WAIT_SILENCE'
  else 'LIVENESS_SILENCE'
end
from d
cross join facts f
cross join outs o;
$function$;

create or replace function public.prometeo_enforce_postmortem_observed_cause_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  new.observed_cause:=public.prometeo_observed_death_cause(new.death_id);
  return new;
end;
$function$;

drop trigger if exists trg_prometeo_postmortem_observed_cause_v1
on public.prometeo_worker_postmortems;

create trigger trg_prometeo_postmortem_observed_cause_v1
before insert or update of death_id,observed_cause
on public.prometeo_worker_postmortems
for each row
execute function public.prometeo_enforce_postmortem_observed_cause_v1();

update public.prometeo_worker_postmortems p
set observed_cause=public.prometeo_observed_death_cause(p.death_id)
where p.observed_cause is distinct from public.prometeo_observed_death_cause(p.death_id);

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conname='prometeo_worker_postmortems_inference_requires_observed'
      and conrelid='public.prometeo_worker_postmortems'::regclass
  ) then
    alter table public.prometeo_worker_postmortems
      add constraint prometeo_worker_postmortems_inference_requires_observed
      check(inferred_cause is null or observed_cause is not null);
  end if;
end $$;

create or replace view public.prometeo_worker_postmortem_metrics_v1 as
select
  p.observed_cause,
  case when p.recovered_at is not null then 'RECOVERED' else 'UNRECOVERED' end as recovery_state,
  count(*)::integer as postmortems,
  count(*) filter(where p.inferred_cause is not null)::integer as with_inference,
  sum(p.publish_count)::bigint as publishes,
  sum(p.checkpoint_count)::bigint as checkpoints,
  sum(p.tool_failure_count)::bigint as tool_failures,
  round(avg(p.work_pct),1) as avg_work_pct,
  round(avg(p.wait_pct),1) as avg_wait_pct
from public.prometeo_worker_postmortems p
group by p.observed_cause,
         case when p.recovered_at is not null then 'RECOVERED' else 'UNRECOVERED' end;
