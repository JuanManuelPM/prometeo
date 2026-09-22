-- BACKLOG-252: every completed Forge Goal leaves two durable products.
-- Product 1 = requested result manifest. Product 2 = capability-improvement candidate, never auto-promoted.

create table if not exists public.forge_goal_products (
  goal_id text not null references public.forge_goals(goal_id) on delete cascade,
  product_kind text not null check (product_kind in ('RESULT','CAPABILITY_CANDIDATE')),
  schema_version text not null default 'prometeo.forge-goal-product/v1',
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs)='array'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (goal_id,product_kind)
);

alter table public.forge_goal_products enable row level security;

create or replace function public.forge_goal_materialize_products(
  p_goal_id text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_goal public.forge_goals%rowtype;
  v_output_refs jsonb := '[]'::jsonb;
  v_evidence_refs jsonb := '[]'::jsonb;
  v_result_inserted integer := 0;
  v_capability_inserted integer := 0;
begin
  select * into v_goal
  from public.forge_goals
  where goal_id=nullif(btrim(p_goal_id),'');

  if not found then
    return jsonb_build_object('ok',false,'state','GOAL_NOT_FOUND');
  end if;

  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'task_key',o.task_key,
        'generation',o.generation,
        'worker_code',o.worker_code,
        'word_count',o.word_count,
        'published_at',o.published_at,
        'output_hash','md5:' || md5(o.output_text)
      )
      order by o.task_key,o.generation
    ),'[]'::jsonb),
    coalesce(jsonb_agg(
      to_jsonb('forge-output://' || o.goal_id || '/' || o.task_key || '/' || o.generation::text)
      order by o.task_key,o.generation
    ),'[]'::jsonb)
  into v_output_refs,v_evidence_refs
  from public.forge_outputs o
  where o.goal_id=v_goal.goal_id;

  insert into public.forge_goal_products(
    goal_id,product_kind,payload,evidence_refs
  ) values (
    v_goal.goal_id,
    'RESULT',
    jsonb_build_object(
      'schema','prometeo.forge-goal-product/v1',
      'kind','RESULT',
      'goal_id',v_goal.goal_id,
      'goal_title',v_goal.title,
      'goal_objective',v_goal.objective,
      'goal_status',v_goal.status,
      'output_refs',v_output_refs,
      'content_location','forge_outputs',
      'claim','Requested result is represented by the completed goal output manifest.'
    ),
    v_evidence_refs
  )
  on conflict (goal_id,product_kind) do nothing;
  get diagnostics v_result_inserted = row_count;

  insert into public.forge_goal_products(
    goal_id,product_kind,payload,evidence_refs
  ) values (
    v_goal.goal_id,
    'CAPABILITY_CANDIDATE',
    jsonb_build_object(
      'schema','prometeo.forge-goal-product/v1',
      'kind','CAPABILITY_CANDIDATE',
      'state','CANDIDATE',
      'goal_id',v_goal.goal_id,
      'source_result_ref','forge-goal-product://' || v_goal.goal_id || '/RESULT',
      'source_objective',v_goal.objective,
      'candidate_question','What reusable Skill, Tool, Plume, Recipe or protocol can be extracted from this completed Goal?',
      'requires_review',true,
      'promotion_allowed',false,
      'next_compiler','forge_skill_candidate_from_learning',
      'claim','This is a potential capability-improvement product, not a promoted capability.'
    ),
    v_evidence_refs
  )
  on conflict (goal_id,product_kind) do nothing;
  get diagnostics v_capability_inserted = row_count;

  return jsonb_build_object(
    'ok',true,
    'state','GOAL_PRODUCTS_MATERIALIZED',
    'goal_id',v_goal.goal_id,
    'result',case when v_result_inserted=1 then 'CREATED' else 'EXISTS' end,
    'capability_candidate',case when v_capability_inserted=1 then 'CREATED' else 'EXISTS' end,
    'output_count',jsonb_array_length(v_output_refs),
    'promotion_allowed',false
  );
end;
$$;

create or replace function public.forge_goal_products_for(
  p_goal_id text
) returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'ok',exists(select 1 from public.forge_goals g where g.goal_id=p_goal_id),
    'state',case
      when exists(select 1 from public.forge_goals g where g.goal_id=p_goal_id)
      then 'GOAL_PRODUCTS'
      else 'GOAL_NOT_FOUND'
    end,
    'goal_id',p_goal_id,
    'items',coalesce(
      jsonb_agg(
        jsonb_build_object(
          'product_kind',p.product_kind,
          'schema_version',p.schema_version,
          'payload',p.payload,
          'evidence_refs',p.evidence_refs,
          'created_at',p.created_at,
          'updated_at',p.updated_at
        )
        order by case p.product_kind when 'RESULT' then 1 else 2 end
      ) filter (where p.goal_id is not null),
      '[]'::jsonb
    )
  )
  from public.forge_goal_products p
  where p.goal_id=p_goal_id;
$$;

create or replace function public.forge_goal_two_product_audit()
returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  with done_goals as (
    select g.goal_id
    from public.forge_goals g
    where g.status='DONE'
  ),
  counts as (
    select d.goal_id,
      count(*) filter(where p.product_kind='RESULT') as result_count,
      count(*) filter(where p.product_kind='CAPABILITY_CANDIDATE') as capability_count
    from done_goals d
    left join public.forge_goal_products p on p.goal_id=d.goal_id
    group by d.goal_id
  )
  select jsonb_build_object(
    'ok',not exists(
      select 1 from counts where result_count<>1 or capability_count<>1
    ),
    'state',case
      when exists(select 1 from counts where result_count<>1 or capability_count<>1)
      then 'TWO_PRODUCT_GAPS'
      else 'TWO_PRODUCT_CONTRACT_OK'
    end,
    'done_goals',(select count(*) from done_goals),
    'complete_goals',(select count(*) from counts where result_count=1 and capability_count=1),
    'gaps',coalesce(
      (select jsonb_agg(jsonb_build_object(
        'goal_id',goal_id,'result_count',result_count,'capability_count',capability_count
      )) from counts where result_count<>1 or capability_count<>1),
      '[]'::jsonb
    )
  );
$$;

create or replace function public.forge_goal_products_after_done()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_result jsonb;
begin
  if new.status='DONE' and old.status is distinct from new.status then
    v_result := public.forge_goal_materialize_products(new.goal_id);
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'Goal product materialization failed for %: %',new.goal_id,v_result;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists forge_goal_products_on_done on public.forge_goals;
create trigger forge_goal_products_on_done
after update of status on public.forge_goals
for each row
when (new.status='DONE' and old.status is distinct from new.status)
execute function public.forge_goal_products_after_done();

-- Backfill all already-completed Goals. Idempotent by (goal_id, product_kind).
do $$
declare
  v_goal record;
  v_result jsonb;
begin
  for v_goal in select goal_id from public.forge_goals where status='DONE'
  loop
    v_result := public.forge_goal_materialize_products(v_goal.goal_id);
    if coalesce((v_result->>'ok')::boolean,false) is not true then
      raise exception 'Goal product backfill failed for %: %',v_goal.goal_id,v_result;
    end if;
  end loop;
end;
$$;

create or replace function public.forge_goal_two_product_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_audit jsonb;
  v_goal_id text;
  v_products jsonb;
  v_result jsonb;
  v_capability jsonb;
  v_trigger_exists boolean;
begin
  v_audit := public.forge_goal_two_product_audit();

  select goal_id into v_goal_id
  from public.forge_goals
  where status='DONE'
  order by finished_at nulls last,goal_id
  limit 1;

  if v_goal_id is not null then
    v_products := public.forge_goal_products_for(v_goal_id);
    select value into v_result
    from jsonb_array_elements(v_products->'items')
    where value->>'product_kind'='RESULT';
    select value into v_capability
    from jsonb_array_elements(v_products->'items')
    where value->>'product_kind'='CAPABILITY_CANDIDATE';
  end if;

  select exists(
    select 1 from pg_trigger
    where tgname='forge_goal_products_on_done' and not tgisinternal
  ) into v_trigger_exists;

  if v_audit->>'state' <> 'TWO_PRODUCT_CONTRACT_OK'
     or not v_trigger_exists
     or (v_goal_id is not null and (
       v_result is null
       or v_capability is null
       or v_capability->'payload'->>'state' <> 'CANDIDATE'
       or v_capability->'payload'->>'promotion_allowed' <> 'false'
     ))
  then
    raise exception 'BACKLOG-252 two-product smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','GOAL_TWO_PRODUCT_SMOKE_OK',
    'audit',v_audit,
    'done_trigger','PASS',
    'sample_goal_id',v_goal_id,
    'result_product','PASS',
    'capability_candidate','PASS',
    'auto_promotion',false
  );
end;
$$;

select public.forge_goal_two_product_smoke_test();
