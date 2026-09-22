-- BACKLOG-159 controlled scaling benchmark runner.
-- Six serialized runs over one immutable BENCHMARK_NOP_V1 workload.
-- Conditions alternate 1/2 workers, 32 jobs per run. No run overlaps another.

create table if not exists public.prometeo_scaling_benchmark_runs (
  run_id text primary key,
  sequence_no integer not null unique,
  target_workers integer not null check (target_workers > 0),
  expected_jobs integer not null check (expected_jobs >= 32),
  workload_hash text not null,
  status text not null check (status in ('QUEUED','RUNNING','DONE','INVALID')),
  t_ready timestamptz,
  t_first_lease timestamptz,
  t_first_publish timestamptz,
  t_last_publish timestamptz,
  t_done timestamptz,
  completed_jobs integer not null default 0,
  output_count integer not null default 0,
  actual_max_workers integer,
  distinct_workers integer,
  makespan_ms bigint,
  throughput_jobs_per_s numeric,
  lease_to_publish_median_ms numeric,
  rescues integer not null default 0,
  tool_failures integer not null default 0,
  validator_failures integer not null default 0,
  valid boolean,
  invalid_reasons jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create or replace function public.prometeo_scaling_benchmark_workload_hash_v1()
returns text
language sql
immutable
set search_path to 'public','pg_temp'
as $$
  select 'md5:' || md5(
    'BENCHMARK_NOP_V1|fixture={"id":"F159A","values":[2,3,5,7,11,13,17,19]}'
    || '|instruction=no_tools;count_and_sum;emit_receipt'
    || '|validator=BENCHMARK_NOP_V1 PASS count=8 sum=77 fixture=F159A'
    || '|jobs=32|required_rank=0|lease_seconds=300|min_words=1|max_words=60'
  );
$$;

create or replace function public.prometeo_scaling_benchmark_instruction_v1()
returns text
language sql
immutable
set search_path to 'public','pg_temp'
as $$
  select 'BENCHMARK_NOP_V1. No uses web, herramientas, repositorio, archivos ni backend. '
      || 'Usá solamente este fixture fijo: {"id":"F159A","values":[2,3,5,7,11,13,17,19]}. '
      || 'Calculá cantidad y suma mentalmente. Publicá una sola línea con este recibo: '
      || 'BENCHMARK_NOP_V1 PASS count=8 sum=77 fixture=F159A. No hagas ningún trabajo adicional.';
$$;

create or replace function public.prometeo_scaling_benchmark_run_finalize_v1(p_run_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  r public.prometeo_scaling_benchmark_runs%rowtype;
  v_total integer; v_done integer; v_outputs integer; v_hashes integer;
  v_bad_validator integer; v_distinct integer; v_max_concurrent integer;
  v_first_lease timestamptz; v_first_publish timestamptz;
  v_last_publish timestamptz; v_done_at timestamptz;
  v_makespan_ms bigint; v_throughput numeric; v_median numeric;
  v_rescues integer; v_tool_failures integer;
  v_reasons jsonb := '[]'::jsonb; v_valid boolean;
  n public.prometeo_scaling_benchmark_runs%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  perform pg_advisory_xact_lock(hashtext('scaling-bench-159-rollover'));
  select * into r from public.prometeo_scaling_benchmark_runs where run_id=p_run_id for update;
  if not found then
    return jsonb_build_object('ok',false,'state','RUN_NOT_FOUND','run_id',p_run_id);
  end if;
  if r.status not in ('RUNNING','DONE','INVALID') then
    return jsonb_build_object('ok',true,'state','RUN_NOT_ACTIVE','run_id',p_run_id,'status',r.status);
  end if;

  select count(*),count(*) filter(where status='DONE'),min(started_at),max(completed_at),
         coalesce(sum(rescue_count),0)
  into v_total,v_done,v_first_lease,v_done_at,v_rescues
  from public.prometeo_jobs
  where project_id='SCALING-BENCH-159' and input_context->>'benchmark_run_id'=p_run_id;

  if v_total <> r.expected_jobs or v_done <> r.expected_jobs then
    return jsonb_build_object('ok',true,'state','RUN_INCOMPLETE','run_id',p_run_id,
      'expected_jobs',r.expected_jobs,'jobs',v_total,'done',v_done);
  end if;

  select count(*),min(published_at),max(published_at),count(distinct worker_code),
         percentile_cont(0.5) within group(order by elapsed_ms)
  into v_outputs,v_first_publish,v_last_publish,v_distinct,v_median
  from public.prometeo_outputs
  where project_id='SCALING-BENCH-159' and job_key like p_run_id || '-J%';

  select count(*) into v_bad_validator
  from public.prometeo_outputs
  where project_id='SCALING-BENCH-159' and job_key like p_run_id || '-J%'
    and output_text !~* 'BENCHMARK_NOP_V1[[:space:]]+PASS[[:space:]]+count=8[[:space:]]+sum=77[[:space:]]+fixture=F159A';

  select count(distinct input_context->>'workload_hash') into v_hashes
  from public.prometeo_jobs
  where project_id='SCALING-BENCH-159' and input_context->>'benchmark_run_id'=p_run_id
    and input_context->>'workload_hash'=r.workload_hash;

  with intervals as (
    select started_at s,completed_at e
    from public.prometeo_jobs
    where project_id='SCALING-BENCH-159' and input_context->>'benchmark_run_id'=p_run_id
      and started_at is not null and completed_at is not null
  ), points as (
    select s ts,1 delta from intervals union all select e ts,-1 delta from intervals
  ), scan as (
    select sum(delta) over(order by ts,delta asc rows between unbounded preceding and current row) active
    from points
  )
  select coalesce(max(active),0)::integer into v_max_concurrent from scan;

  select count(*) into v_tool_failures
  from public.prometeo_events
  where project_id='SCALING-BENCH-159' and job_key like p_run_id || '-J%'
    and event_type ilike '%TOOL%';

  if v_total <> r.expected_jobs then v_reasons:=v_reasons||jsonb_build_array('JOB_COUNT_MISMATCH'); end if;
  if v_outputs <> r.expected_jobs then v_reasons:=v_reasons||jsonb_build_array('OUTPUT_COUNT_MISMATCH'); end if;
  if v_hashes <> 1 then v_reasons:=v_reasons||jsonb_build_array('WORKLOAD_HASH_MISMATCH'); end if;
  if v_bad_validator <> 0 then v_reasons:=v_reasons||jsonb_build_array('OUTPUT_VALIDATOR_FAILURE'); end if;
  if v_max_concurrent < 1 or v_distinct < 1 then v_reasons:=v_reasons||jsonb_build_array('WORKER_COUNT_EVIDENCE_MISSING'); end if;
  if v_first_lease is null or v_first_publish is null or v_last_publish is null or v_done_at is null or r.t_ready is null then
    v_reasons:=v_reasons||jsonb_build_array('TIMING_EVIDENCE_MISSING');
  end if;

  v_makespan_ms:=case when r.t_ready is null or v_done_at is null then null
    else greatest(0,round(extract(epoch from(v_done_at-r.t_ready))*1000)::bigint) end;
  v_throughput:=case when v_makespan_ms is null or v_makespan_ms<=0 then null
    else round(r.expected_jobs::numeric/(v_makespan_ms::numeric/1000.0),6) end;
  v_valid:=jsonb_array_length(v_reasons)=0;

  update public.prometeo_scaling_benchmark_runs
  set status=case when v_valid then 'DONE' else 'INVALID' end,
      t_first_lease=v_first_lease,t_first_publish=v_first_publish,t_last_publish=v_last_publish,t_done=v_done_at,
      completed_jobs=v_done,output_count=v_outputs,actual_max_workers=v_max_concurrent,distinct_workers=v_distinct,
      makespan_ms=v_makespan_ms,throughput_jobs_per_s=v_throughput,lease_to_publish_median_ms=v_median,
      rescues=v_rescues,tool_failures=v_tool_failures,validator_failures=v_bad_validator,valid=v_valid,
      invalid_reasons=v_reasons,
      evidence=jsonb_build_object('project_id','SCALING-BENCH-159','job_prefix',p_run_id||'-J',
        'workload_hash',r.workload_hash,'server_timing',true,
        'actual_worker_count_method','max overlapping started_at/completed_at intervals',
        'distinct_worker_receipts',v_distinct),
      finished_at=v_now
  where run_id=p_run_id;

  select * into n from public.prometeo_scaling_benchmark_runs
  where sequence_no>r.sequence_no and status='QUEUED'
  order by sequence_no limit 1 for update;

  if found then
    update public.prometeo_projects
    set status='RUNNING',min_parallelism=n.target_workers,desired_parallelism=n.target_workers,
        max_parallelism=n.target_workers,finished_at=null
    where project_id='SCALING-BENCH-159';
    update public.prometeo_jobs set status='READY'
    where project_id='SCALING-BENCH-159'
      and input_context->>'benchmark_run_id'=n.run_id and status='BLOCKED';
    update public.prometeo_scaling_benchmark_runs set status='RUNNING',t_ready=v_now where run_id=n.run_id;
    insert into public.prometeo_events(project_id,event_type,payload)
    values('SCALING-BENCH-159','BENCHMARK_RUN_ACTIVATED',
      jsonb_build_object('run_id',n.run_id,'target_workers',n.target_workers,'workload_hash',n.workload_hash));
    return jsonb_build_object('ok',true,'state','RUN_FINALIZED_NEXT_ACTIVATED',
      'run_id',p_run_id,'valid',v_valid,'next_run_id',n.run_id,'next_target_workers',n.target_workers);
  end if;

  update public.prometeo_projects set status='DONE',finished_at=v_now where project_id='SCALING-BENCH-159';
  insert into public.prometeo_events(project_id,event_type,payload)
  values('SCALING-BENCH-159','BENCHMARK_COMPLETE',
    jsonb_build_object('last_run_id',p_run_id,'workload_hash',r.workload_hash));
  return jsonb_build_object('ok',true,'state','BENCHMARK_COMPLETE','run_id',p_run_id,'valid',v_valid);
end;
$$;

create or replace function public.prometeo_scaling_benchmark_job_done_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare v_run_id text;
begin
  if new.project_id<>'SCALING-BENCH-159' or new.status<>'DONE' or old.status='DONE' then return new; end if;
  v_run_id:=new.input_context->>'benchmark_run_id';
  if v_run_id is not null then perform public.prometeo_scaling_benchmark_run_finalize_v1(v_run_id); end if;
  return new;
end;
$$;

drop trigger if exists trg_scaling_benchmark_job_done_v1 on public.prometeo_jobs;
create trigger trg_scaling_benchmark_job_done_v1
after update of status on public.prometeo_jobs
for each row
when (new.project_id='SCALING-BENCH-159' and new.status='DONE')
execute function public.prometeo_scaling_benchmark_job_done_v1();

create or replace function public.prometeo_scaling_benchmark_result_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_hash text:=public.prometeo_scaling_benchmark_workload_hash_v1();
  v_runs jsonb; v_groups jsonb; v_group_count integer;
  low_w integer; high_w integer; low_n integer; high_n integer;
  low_tp numeric; high_tp numeric; low_ms numeric; high_ms numeric;
  low_tp_max numeric; high_tp_min numeric; low_ms_min numeric; high_ms_max numeric;
  v_verdict text:='INCONCLUSIVE';
begin
  select coalesce(jsonb_agg(to_jsonb(r) order by r.sequence_no),'[]'::jsonb)
  into v_runs from public.prometeo_scaling_benchmark_runs r;

  with g as (
    select actual_max_workers workers,count(*) filter(where valid) valid_runs,
      percentile_cont(0.5) within group(order by throughput_jobs_per_s) filter(where valid) median_throughput,
      percentile_cont(0.5) within group(order by makespan_ms) filter(where valid) median_makespan_ms,
      min(throughput_jobs_per_s) filter(where valid) min_throughput,
      max(throughput_jobs_per_s) filter(where valid) max_throughput,
      min(makespan_ms) filter(where valid) min_makespan_ms,
      max(makespan_ms) filter(where valid) max_makespan_ms
    from public.prometeo_scaling_benchmark_runs
    where workload_hash=v_hash and actual_max_workers is not null
    group by actual_max_workers
  )
  select coalesce(jsonb_agg(to_jsonb(g) order by workers),'[]'::jsonb),count(*) filter(where valid_runs>=3)
  into v_groups,v_group_count from g;

  if v_group_count>=2 then
    with g as (
      select actual_max_workers workers,count(*) filter(where valid) valid_runs,
        percentile_cont(0.5) within group(order by throughput_jobs_per_s) filter(where valid) median_throughput,
        percentile_cont(0.5) within group(order by makespan_ms) filter(where valid) median_makespan_ms,
        min(throughput_jobs_per_s) filter(where valid) min_throughput,
        max(throughput_jobs_per_s) filter(where valid) max_throughput,
        min(makespan_ms) filter(where valid) min_makespan_ms,
        max(makespan_ms) filter(where valid) max_makespan_ms
      from public.prometeo_scaling_benchmark_runs
      where workload_hash=v_hash and actual_max_workers is not null
      group by actual_max_workers
      having count(*) filter(where valid)>=3
    ), lo as (select * from g order by workers asc limit 1),
       hi as (select * from g order by workers desc limit 1)
    select lo.workers,hi.workers,lo.valid_runs,hi.valid_runs,
      lo.median_throughput,hi.median_throughput,lo.median_makespan_ms,hi.median_makespan_ms,
      lo.max_throughput,hi.min_throughput,lo.min_makespan_ms,hi.max_makespan_ms
    into low_w,high_w,low_n,high_n,low_tp,high_tp,low_ms,high_ms,
      low_tp_max,high_tp_min,low_ms_min,high_ms_max
    from lo,hi;

    if low_w<high_w and low_tp<high_tp and low_ms>high_ms
       and low_tp_max<high_tp_min and low_ms_min>high_ms_max then
      v_verdict:='CONFIRMED';
    elsif low_w<high_w and low_tp>high_tp and low_ms<high_ms
       and low_tp_max>high_tp_min and low_ms_min<high_ms_max then
      v_verdict:='CONTRADICTED';
    else v_verdict:='INCONCLUSIVE';
    end if;
  end if;

  return jsonb_build_object(
    'schema','prometeo.scaling-benchmark-159/v1','workload_hash',v_hash,'verdict',v_verdict,
    'acceptance',jsonb_build_object('min_conditions',2,'min_valid_runs_per_condition',3,
      'qualifying_condition_count',coalesce(v_group_count,0),
      'noise_rule','CONFIRMED requires non-overlapping throughput and makespan ranges in the expected direction'),
    'comparison',jsonb_build_object('lower_workers',low_w,'higher_workers',high_w,
      'lower_valid_runs',low_n,'higher_valid_runs',high_n,
      'lower_median_throughput',low_tp,'higher_median_throughput',high_tp,
      'lower_median_makespan_ms',low_ms,'higher_median_makespan_ms',high_ms),
    'groups',v_groups,'runs',v_runs);
end;
$$;

insert into public.prometeo_projects(
  project_id,title,objective,status,priority,min_parallelism,desired_parallelism,max_parallelism,
  allow_spawn,max_jobs,auto_close,work_plane,started_at
) values (
  'SCALING-BENCH-159','Controlled scaling benchmark 159',
  'Measure identical BENCHMARK_NOP_V1 workload under serialized real-worker concurrency conditions.',
  'RUNNING',260,1,1,1,false,220,false,'CONTROL',now()
) on conflict (project_id) do nothing;

insert into public.prometeo_scaling_benchmark_runs(run_id,sequence_no,target_workers,expected_jobs,workload_hash,status,t_ready)
values
 ('SCALING159-R01-W1',1,1,32,public.prometeo_scaling_benchmark_workload_hash_v1(),'RUNNING',clock_timestamp()),
 ('SCALING159-R02-W2',2,2,32,public.prometeo_scaling_benchmark_workload_hash_v1(),'QUEUED',null),
 ('SCALING159-R03-W1',3,1,32,public.prometeo_scaling_benchmark_workload_hash_v1(),'QUEUED',null),
 ('SCALING159-R04-W2',4,2,32,public.prometeo_scaling_benchmark_workload_hash_v1(),'QUEUED',null),
 ('SCALING159-R05-W1',5,1,32,public.prometeo_scaling_benchmark_workload_hash_v1(),'QUEUED',null),
 ('SCALING159-R06-W2',6,2,32,public.prometeo_scaling_benchmark_workload_hash_v1(),'QUEUED',null)
on conflict (run_id) do nothing;

do $$
declare r record; i integer; v_status text;
begin
  for r in select run_id,sequence_no,target_workers,workload_hash
           from public.prometeo_scaling_benchmark_runs order by sequence_no loop
    v_status:=case when r.sequence_no=1 then 'READY' else 'BLOCKED' end;
    for i in 1..32 loop
      insert into public.prometeo_jobs(
        project_id,job_key,title,objective,instruction,input_context,status,
        priority,required_rank,lease_seconds,min_words,max_words,is_rescue,generation
      ) values (
        'SCALING-BENCH-159',r.run_id||'-J'||lpad(i::text,2,'0'),
        'BENCHMARK_NOP_V1 · '||r.run_id||' · '||lpad(i::text,2,'0'),
        'Produce one deterministic no-tool receipt for controlled scaling measurement.',
        public.prometeo_scaling_benchmark_instruction_v1(),
        jsonb_build_object('benchmark','BENCHMARK_NOP_V1','benchmark_run_id',r.run_id,
          'target_workers',r.target_workers,'ordinal',i,
          'fixture',jsonb_build_object('id','F159A','values',jsonb_build_array(2,3,5,7,11,13,17,19)),
          'workload_hash',r.workload_hash,
          'validator','BENCHMARK_NOP_V1 PASS count=8 sum=77 fixture=F159A'),
        v_status,260,0,300,1,60,false,0
      ) on conflict (project_id,job_key) do nothing;
    end loop;
  end loop;
end;
$$;

insert into public.prometeo_events(project_id,event_type,payload)
values('SCALING-BENCH-159','BENCHMARK_STARTED',
  jsonb_build_object('workload_hash',public.prometeo_scaling_benchmark_workload_hash_v1(),
    'runs',6,'jobs_per_run',32,'condition_order',jsonb_build_array(1,2,1,2,1,2),
    'isolation','DEDICATED_CONTROL_PROJECT'));
