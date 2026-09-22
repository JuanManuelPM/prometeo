-- BACKLOG-159 benchmark gate hardening.
-- Future runs must have an unmet dependency so prometeo_refresh_ready cannot release them early.

select pg_advisory_xact_lock(hashtext('prometeo-global-control'));

do $$
declare
  r record;
  prev record;
  i integer;
  v_gate text;
begin
  if exists(
    select 1
    from public.prometeo_jobs
    where project_id='SCALING-BENCH-159'
      and input_context->>'benchmark_run_id'<>'SCALING159-R01-W1'
      and started_at is not null
  ) then
    raise exception 'benchmark gate correction refused: a future run already started';
  end if;

  for r in
    select * from public.prometeo_scaling_benchmark_runs
    where sequence_no between 2 and 6
    order by sequence_no
  loop
    select * into prev
    from public.prometeo_scaling_benchmark_runs
    where sequence_no=r.sequence_no-1;

    v_gate:='SCALING159-GATE-R' || lpad(r.sequence_no::text,2,'0');

    insert into public.prometeo_jobs(
      project_id,job_key,title,objective,instruction,input_context,status,
      priority,required_rank,lease_seconds,min_words,max_words,is_rescue,generation
    ) values (
      'SCALING-BENCH-159',v_gate,
      'Internal benchmark gate ' || r.run_id,
      'Internal scheduler gate; never execute by a worker.',
      'INTERNAL GATE. No debe asignarse.',
      jsonb_build_object('benchmark_gate_for',r.run_id,'previous_run_id',prev.run_id),
      'BLOCKED',9999,4,60,1,20,false,0
    )
    on conflict (project_id,job_key) do nothing;

    for i in 1..32 loop
      insert into public.prometeo_job_dependencies(
        project_id,job_key,depends_on_project_id,depends_on_job_key
      ) values (
        'SCALING-BENCH-159',v_gate,
        'SCALING-BENCH-159',prev.run_id || '-J' || lpad(i::text,2,'0')
      )
      on conflict do nothing;
    end loop;

    insert into public.prometeo_job_dependencies(
      project_id,job_key,depends_on_project_id,depends_on_job_key
    )
    select
      'SCALING-BENCH-159',j.job_key,
      'SCALING-BENCH-159',v_gate
    from public.prometeo_jobs j
    where j.project_id='SCALING-BENCH-159'
      and j.input_context->>'benchmark_run_id'=r.run_id
    on conflict do nothing;

    update public.prometeo_jobs
    set status='BLOCKED'
    where project_id='SCALING-BENCH-159'
      and input_context->>'benchmark_run_id'=r.run_id
      and started_at is null
      and status='READY';
  end loop;
end;
$$;

create or replace function public.prometeo_scaling_benchmark_gate_release_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_run_id text;
  v_seq integer;
  v_next_seq integer;
  v_gate text;
begin
  if new.project_id<>'SCALING-BENCH-159' or new.status<>'DONE' or old.status='DONE' then
    return new;
  end if;

  v_run_id:=new.input_context->>'benchmark_run_id';
  if v_run_id is null then
    return new;
  end if;

  if exists(
    select 1 from public.prometeo_jobs j
    where j.project_id='SCALING-BENCH-159'
      and j.input_context->>'benchmark_run_id'=v_run_id
      and j.status<>'DONE'
  ) then
    return new;
  end if;

  select sequence_no into v_seq
  from public.prometeo_scaling_benchmark_runs
  where run_id=v_run_id;

  v_next_seq:=v_seq+1;
  if v_next_seq>6 then
    return new;
  end if;

  v_gate:='SCALING159-GATE-R' || lpad(v_next_seq::text,2,'0');

  update public.prometeo_jobs
  set status='DONE',
      started_at=coalesce(started_at,clock_timestamp()),
      completed_at=coalesce(completed_at,clock_timestamp())
  where project_id='SCALING-BENCH-159'
    and job_key=v_gate
    and status='BLOCKED';

  return new;
end;
$$;

drop trigger if exists trg_scaling_benchmark_gate_release_v1 on public.prometeo_jobs;
create trigger trg_scaling_benchmark_gate_release_v1
after update of status on public.prometeo_jobs
for each row
when (new.project_id='SCALING-BENCH-159' and new.status='DONE')
execute function public.prometeo_scaling_benchmark_gate_release_v1();

select public.prometeo_refresh_ready();
