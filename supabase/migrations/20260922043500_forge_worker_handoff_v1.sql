-- BACKLOG-19: enforce real worker-to-worker handoff for critique/verification,
-- plus an explicit CONTINUE handoff primitive for other dependency chains.

create table if not exists public.forge_task_handoffs (
  goal_id text not null,
  consumer_task_key text not null,
  producer_task_key text not null,
  handoff_mode text not null check (handoff_mode in ('CONTINUE','CRITIQUE','VERIFY')),
  require_distinct_worker boolean not null default true,
  evidence_ref text not null check (btrim(evidence_ref) <> ''),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance)='object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (goal_id,consumer_task_key,producer_task_key),
  foreign key (goal_id,consumer_task_key)
    references public.forge_tasks(goal_id,task_key) on delete cascade,
  foreign key (goal_id,producer_task_key)
    references public.forge_tasks(goal_id,task_key) on delete cascade
);

create index if not exists forge_task_handoffs_producer_idx
on public.forge_task_handoffs(goal_id,producer_task_key);

alter table public.forge_task_handoffs enable row level security;

create or replace function public.forge_task_handoff_require(
  p_goal_id text,
  p_consumer_task_key text,
  p_producer_task_key text,
  p_handoff_mode text,
  p_evidence_ref text,
  p_provenance jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_mode text := upper(coalesce(nullif(btrim(p_handoff_mode),''),''));
  v_evidence text := nullif(btrim(p_evidence_ref),'');
  v_inserted integer;
begin
  if v_mode not in ('CONTINUE','CRITIQUE','VERIFY') then
    return jsonb_build_object('ok',false,'state','INVALID_HANDOFF_MODE');
  end if;
  if v_evidence is null then
    return jsonb_build_object('ok',false,'state','HANDOFF_EVIDENCE_REQUIRED');
  end if;
  if jsonb_typeof(coalesce(p_provenance,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_PROVENANCE');
  end if;
  if not exists(
    select 1 from public.forge_tasks
    where goal_id=p_goal_id and task_key=p_consumer_task_key
  ) or not exists(
    select 1 from public.forge_tasks
    where goal_id=p_goal_id and task_key=p_producer_task_key
  ) then
    return jsonb_build_object('ok',false,'state','HANDOFF_TASK_NOT_FOUND');
  end if;
  if not exists(
    select 1 from public.forge_task_dependencies
    where goal_id=p_goal_id
      and task_key=p_consumer_task_key
      and depends_on_task_key=p_producer_task_key
  ) then
    return jsonb_build_object('ok',false,'state','HANDOFF_DEPENDENCY_REQUIRED');
  end if;

  insert into public.forge_task_handoffs(
    goal_id,consumer_task_key,producer_task_key,handoff_mode,
    require_distinct_worker,evidence_ref,provenance
  ) values (
    p_goal_id,p_consumer_task_key,p_producer_task_key,v_mode,
    true,v_evidence,coalesce(p_provenance,'{}'::jsonb)
  )
  on conflict (goal_id,consumer_task_key,producer_task_key) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'ok',true,
    'state',case when v_inserted=1 then 'HANDOFF_REQUIRED' else 'HANDOFF_ALREADY_REQUIRED' end,
    'goal_id',p_goal_id,
    'consumer_task_key',p_consumer_task_key,
    'producer_task_key',p_producer_task_key,
    'handoff_mode',v_mode,
    'require_distinct_worker',true
  );
end;
$$;

create or replace function public.forge_task_handoff_conflict(
  p_goal_id text,
  p_consumer_task_key text,
  p_worker_code text
) returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select exists(
    select 1
    from public.forge_task_handoffs h
    join public.forge_outputs o
      on o.goal_id=h.goal_id
     and o.task_key=h.producer_task_key
    where h.goal_id=p_goal_id
      and h.consumer_task_key=p_consumer_task_key
      and h.require_distinct_worker
      and o.worker_code=p_worker_code
  );
$$;

create or replace function public.forge_task_dependency_auto_handoff()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_family text;
  v_mode text;
begin
  select c.family into v_family
  from public.forge_tasks t
  join public.forge_cards c on c.card_id=t.card_id
  where t.goal_id=new.goal_id and t.task_key=new.task_key;

  if v_family='CRITIQUE' then
    v_mode := 'CRITIQUE';
  elsif v_family='VERIFICATION' then
    v_mode := 'VERIFY';
  else
    return new;
  end if;

  insert into public.forge_task_handoffs(
    goal_id,consumer_task_key,producer_task_key,handoff_mode,
    require_distinct_worker,evidence_ref,provenance
  ) values (
    new.goal_id,new.task_key,new.depends_on_task_key,v_mode,true,
    'auto://forge_task_dependency/' || new.goal_id || '/' || new.task_key || '/' || new.depends_on_task_key,
    jsonb_build_object(
      'source','AUTO_CARD_FAMILY',
      'family',v_family,
      'backlog_id',19
    )
  )
  on conflict (goal_id,consumer_task_key,producer_task_key) do nothing;

  return new;
end;
$$;

drop trigger if exists forge_task_dependency_auto_handoff_trigger
on public.forge_task_dependencies;

create trigger forge_task_dependency_auto_handoff_trigger
after insert on public.forge_task_dependencies
for each row
execute function public.forge_task_dependency_auto_handoff();

-- Backfill existing critique/verification dependency edges without rewriting historical outputs.
insert into public.forge_task_handoffs(
  goal_id,consumer_task_key,producer_task_key,handoff_mode,
  require_distinct_worker,evidence_ref,provenance
)
select
  d.goal_id,
  d.task_key,
  d.depends_on_task_key,
  case c.family when 'CRITIQUE' then 'CRITIQUE' else 'VERIFY' end,
  true,
  'backfill://forge_task_dependency/' || d.goal_id || '/' || d.task_key || '/' || d.depends_on_task_key,
  jsonb_build_object(
    'source','BACKLOG-19-BACKFILL',
    'family',c.family,
    'historical_only',true
  )
from public.forge_task_dependencies d
join public.forge_tasks t
  on t.goal_id=d.goal_id and t.task_key=d.task_key
join public.forge_cards c
  on c.card_id=t.card_id
where c.family in ('CRITIQUE','VERIFICATION')
on conflict (goal_id,consumer_task_key,producer_task_key) do nothing;

-- Patch the allocator at its READY-task selection point.
-- This is deliberately fail-closed: if the known marker disappears, the migration aborts
-- instead of silently leaving handoff enforcement disconnected.
do $$
declare
  v_def text;
  v_patched text;
  v_marker text := E'where t.goal_id=p_goal_id and t.status=''READY''\n    and (';
  v_replacement text := E'where t.goal_id=p_goal_id and t.status=''READY''\n    and not public.forge_task_handoff_conflict(t.goal_id,t.task_key,v_worker.worker_code)\n    and (';
begin
  v_def := pg_get_functiondef('public.forge_allocate(text,text)'::regprocedure);

  if position('forge_task_handoff_conflict' in v_def) = 0 then
    if position(v_marker in v_def) = 0 then
      raise exception 'BACKLOG-19 allocator patch marker not found';
    end if;
    v_patched := replace(v_def,v_marker,v_replacement);
    if v_patched=v_def then
      raise exception 'BACKLOG-19 allocator patch made no change';
    end if;
    execute v_patched;
  end if;
end;
$$;

create or replace function public.forge_task_handoff_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_self_conflict boolean;
  v_other_conflict boolean;
  v_fixture jsonb;
  v_allocator_patched boolean;
  v_auto_rules integer;
begin
  -- Historical evidence: FORGE-8-01/T11 depends on T10; both were produced by K008.
  -- The new invariant must exclude K008 from T11 while permitting a worker
  -- that did not produce T10.
  v_self_conflict := public.forge_task_handoff_conflict('FORGE-8-01','T11','K008');
  v_other_conflict := public.forge_task_handoff_conflict('FORGE-8-01','T11','K001');

  select count(*) into v_auto_rules
  from public.forge_task_handoffs
  where goal_id='FORGE-8-01'
    and consumer_task_key in ('T08','T11','T12')
    and handoff_mode in ('CRITIQUE','VERIFY');

  select position(
    'forge_task_handoff_conflict' in
    pg_get_functiondef('public.forge_allocate(text,text)'::regprocedure)
  ) > 0 into v_allocator_patched;

  -- Explicit CONTINUE primitive: use an existing historical dependency as a
  -- temporary fixture and clean it afterwards.
  delete from public.forge_task_handoffs
  where goal_id='FORGE-8-01' and consumer_task_key='T05' and producer_task_key='T01';

  v_fixture := public.forge_task_handoff_require(
    'FORGE-8-01','T05','T01','CONTINUE',
    'smoke://backlog-19/continue',
    jsonb_build_object('fixture',true)
  );

  if not v_self_conflict
     or v_other_conflict
     or v_auto_rules < 1
     or not v_allocator_patched
     or v_fixture->>'state' <> 'HANDOFF_REQUIRED'
     or not public.forge_task_handoff_conflict('FORGE-8-01','T05','K001')
  then
    delete from public.forge_task_handoffs
    where goal_id='FORGE-8-01' and consumer_task_key='T05' and producer_task_key='T01';
    raise exception 'BACKLOG-19 worker handoff smoke failed';
  end if;

  delete from public.forge_task_handoffs
  where goal_id='FORGE-8-01' and consumer_task_key='T05' and producer_task_key='T01';

  return jsonb_build_object(
    'ok',true,
    'state','WORKER_HANDOFF_SMOKE_OK',
    'historical_self_review_detected','PASS',
    'same_worker_excluded','PASS',
    'different_worker_allowed','PASS',
    'critique_verification_backfill_rules',v_auto_rules,
    'explicit_continue_handoff','PASS',
    'allocator_enforcement','PASS',
    'fixture_cleaned',not exists(
      select 1 from public.forge_task_handoffs
      where goal_id='FORGE-8-01' and consumer_task_key='T05' and producer_task_key='T01'
    )
  );
end;
$$;

select public.forge_task_handoff_smoke_test();
