create table if not exists public.prometeo_capacity_samples (
  sample_id bigint generated always as identity primary key,
  observed_at timestamptz not null default clock_timestamp(),
  reason text not null,
  project_id text,
  source_event_id bigint,
  ready_jobs integer not null check (ready_jobs >= 0),
  leased_jobs integer not null check (leased_jobs >= 0),
  working_workers integer not null check (working_workers >= 0),
  waiting_workers integer not null check (waiting_workers >= 0),
  assignable_slots integer not null check (assignable_slots >= 0),
  completed_outputs bigint not null check (completed_outputs >= 0),
  completed_words bigint not null check (completed_words >= 0),
  retry_length_count bigint not null check (retry_length_count >= 0),
  stale_lease_count bigint not null check (stale_lease_count >= 0),
  rescue_count bigint not null check (rescue_count >= 0),
  supply_sufficient boolean generated always as (ready_jobs >= working_workers) stored
);

create unique index if not exists prometeo_capacity_samples_source_event_uidx
  on public.prometeo_capacity_samples(source_event_id)
  where source_event_id is not null;

create index if not exists prometeo_capacity_samples_project_observed_idx
  on public.prometeo_capacity_samples(project_id, observed_at desc);

alter table public.prometeo_capacity_samples enable row level security;

create or replace function public.prometeo_capacity_capture(
  p_reason text,
  p_project_id text,
  p_source_event_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ready integer := 0;
  v_leased integer := 0;
  v_working integer := 0;
  v_waiting integer := 0;
  v_max_parallelism integer := 0;
  v_outputs bigint := 0;
  v_words bigint := 0;
  v_retry bigint := 0;
  v_stale bigint := 0;
  v_rescue bigint := 0;
  v_sample_id bigint;
begin
  if p_source_event_id is not null then
    select sample_id into v_sample_id
    from public.prometeo_capacity_samples
    where source_event_id = p_source_event_id;
    if found then
      return v_sample_id;
    end if;
  end if;

  select count(*)::integer
  into v_ready
  from public.prometeo_jobs j
  where j.status = 'READY'
    and (p_project_id is null or j.project_id = p_project_id);

  select count(*)::integer
  into v_leased
  from public.prometeo_jobs j
  where j.status = 'LEASED'
    and (p_project_id is null or j.project_id = p_project_id);

  select count(*)::integer
  into v_working
  from public.prometeo_workers w
  where w.status = 'WORKING'
    and (p_project_id is null or w.current_project_id = p_project_id);

  select count(*)::integer
  into v_waiting
  from public.prometeo_workers w
  where w.status = 'WAITING'
    and (
      p_project_id is null
      or w.next_project_id = p_project_id
      or w.next_project_id is null
    );

  if p_project_id is not null then
    select coalesce(max_parallelism,0)
    into v_max_parallelism
    from public.prometeo_projects
    where project_id = p_project_id;
    v_max_parallelism := coalesce(v_max_parallelism,0);
  end if;

  select count(*)::bigint, coalesce(sum(o.word_count),0)::bigint
  into v_outputs, v_words
  from public.prometeo_outputs o
  where p_project_id is null or o.project_id = p_project_id;

  select
    count(*) filter (where e.event_type = 'OUTPUT_REJECTED_LENGTH')::bigint,
    count(*) filter (where e.event_type = 'STALE_RESULT_REJECTED')::bigint,
    count(*) filter (where e.event_type = 'RESCUE_ASSIGNED')::bigint
  into v_retry, v_stale, v_rescue
  from public.prometeo_events e
  where p_project_id is null or e.project_id = p_project_id;

  insert into public.prometeo_capacity_samples(
    reason, project_id, source_event_id,
    ready_jobs, leased_jobs, working_workers, waiting_workers, assignable_slots,
    completed_outputs, completed_words,
    retry_length_count, stale_lease_count, rescue_count
  ) values (
    coalesce(nullif(btrim(p_reason),''),'TRANSITION'),
    p_project_id,
    p_source_event_id,
    v_ready,
    v_leased,
    v_working,
    v_waiting,
    greatest(v_max_parallelism - v_working, 0),
    v_outputs,
    v_words,
    v_retry,
    v_stale,
    v_rescue
  )
  on conflict (source_event_id) where source_event_id is not null
  do nothing
  returning sample_id into v_sample_id;

  if v_sample_id is null and p_source_event_id is not null then
    select sample_id into v_sample_id
    from public.prometeo_capacity_samples
    where source_event_id = p_source_event_id;
  end if;

  return v_sample_id;
end;
$$;

create or replace function public.prometeo_capacity_sample_from_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.event_type = any(array[
    'JOB_ASSIGNED',
    'JOB_COMPLETED',
    'ENTER',
    'PARKED',
    'LEASE_EXPIRED',
    'RESCUE_ASSIGNED',
    'OUTPUT_REJECTED_LENGTH',
    'STALE_RESULT_REJECTED'
  ]::text[]) then
    perform public.prometeo_capacity_capture(new.event_type, new.project_id, new.event_id);
  end if;
  return new;
end;
$$;

drop trigger if exists prometeo_capacity_sample_event_trg on public.prometeo_events;
create trigger prometeo_capacity_sample_event_trg
after insert on public.prometeo_events
for each row
execute function public.prometeo_capacity_sample_from_event();

create or replace function public.prometeo_capacity_samples_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_supply_true boolean;
  v_supply_false boolean;
  v_zero_delta boolean;
begin
  delete from public.prometeo_capacity_samples
  where source_event_id in (-163000001,-163000002,-163000003);

  insert into public.prometeo_capacity_samples(
    reason, project_id, source_event_id,
    ready_jobs, leased_jobs, working_workers, waiting_workers, assignable_slots,
    completed_outputs, completed_words, retry_length_count, stale_lease_count, rescue_count
  ) values
    ('SMOKE','SMOKE-163',-163000001,8,2,4,1,4,10,1000,2,1,1),
    ('SMOKE','SMOKE-163',-163000002,8,2,4,1,4,10,1000,2,1,1),
    ('SMOKE','SMOKE-163',-163000003,2,2,4,1,0,11,1100,2,1,1);

  insert into public.prometeo_capacity_samples(
    reason, project_id, source_event_id,
    ready_jobs, leased_jobs, working_workers, waiting_workers, assignable_slots,
    completed_outputs, completed_words, retry_length_count, stale_lease_count, rescue_count
  ) values (
    'SMOKE_DUP','SMOKE-163',-163000002,
    99,99,99,99,0,99,9999,99,99,99
  )
  on conflict (source_event_id) where source_event_id is not null do nothing;

  select count(*) into v_count
  from public.prometeo_capacity_samples
  where source_event_id in (-163000001,-163000002,-163000003);

  select supply_sufficient into v_supply_true
  from public.prometeo_capacity_samples
  where source_event_id = -163000001;

  select not supply_sufficient into v_supply_false
  from public.prometeo_capacity_samples
  where source_event_id = -163000003;

  select (
    b.completed_outputs - a.completed_outputs = 0
    and b.completed_words - a.completed_words = 0
    and b.retry_length_count - a.retry_length_count = 0
    and b.stale_lease_count - a.stale_lease_count = 0
    and b.rescue_count - a.rescue_count = 0
  )
  into v_zero_delta
  from public.prometeo_capacity_samples a
  join public.prometeo_capacity_samples b
    on a.source_event_id = -163000001
   and b.source_event_id = -163000002;

  delete from public.prometeo_capacity_samples
  where source_event_id in (-163000001,-163000002,-163000003);

  return jsonb_build_object(
    'ok', v_count = 3 and v_supply_true and v_supply_false and v_zero_delta,
    'state', case
      when v_count = 3 and v_supply_true and v_supply_false and v_zero_delta
        then 'CAPACITY_SAMPLES_SMOKE_OK'
      else 'CAPACITY_SAMPLES_SMOKE_FAILED'
    end,
    'dedupe', case when v_count = 3 then 'PASS' else 'FAIL' end,
    'zero_delta', case when v_zero_delta then 'PASS' else 'FAIL' end,
    'supply_sufficient', case when v_supply_true then 'PASS' else 'FAIL' end,
    'supply_limited', case when v_supply_false then 'PASS' else 'FAIL' end,
    'fixture_cleaned', true
  );
exception when others then
  delete from public.prometeo_capacity_samples
  where source_event_id in (-163000001,-163000002,-163000003);
  return jsonb_build_object(
    'ok',false,
    'state','CAPACITY_SAMPLES_SMOKE_ERROR',
    'error',sqlerrm,
    'fixture_cleaned',true
  );
end;
$$;

revoke all on table public.prometeo_capacity_samples from anon, authenticated;
revoke execute on function public.prometeo_capacity_capture(text,text,bigint) from public, anon, authenticated;
revoke execute on function public.prometeo_capacity_sample_from_event() from public, anon, authenticated;
revoke execute on function public.prometeo_capacity_samples_smoke_test() from public, anon, authenticated;

comment on table public.prometeo_capacity_samples is
'Server-side capacity snapshots for BACKLOG-163 diminishing-returns experiments. Counters are cumulative so analysis derives deltas without double counting.';
