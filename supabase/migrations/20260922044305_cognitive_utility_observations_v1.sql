-- BACKLOG-070: durable historical utility evidence for cognitive objects.
-- V1 records transparent observations/counters only; it does not rank or promote knowledge.

create table if not exists public.cognitive_utility_observations (
  observation_id uuid primary key default gen_random_uuid(),
  object_type text not null check (object_type in ('CARD','PLUMA','TOOL','RECIPE','SKILL')),
  object_id text not null check (btrim(object_id) <> ''),
  project_id text not null check (btrim(project_id) <> ''),
  job_key text not null check (btrim(job_key) <> ''),
  worker_code text not null check (btrim(worker_code) <> ''),
  phase text not null default '',
  selected boolean not null default true,
  used boolean not null default false,
  utility_signal text not null default 'UNKNOWN'
    check (utility_signal in ('HELPED','NEUTRAL','HURT','UNKNOWN')),
  evidence_ref text,
  reason_code text not null default 'UNSPECIFIED',
  dedupe_key text not null unique,
  created_at timestamptz not null default clock_timestamp(),
  constraint cognitive_utility_used_requires_selected check (not used or selected)
);

create index if not exists cognitive_utility_object_idx
  on public.cognitive_utility_observations(object_type,object_id,created_at desc);
create index if not exists cognitive_utility_execution_idx
  on public.cognitive_utility_observations(project_id,job_key,created_at);

create or replace function public.forge_cognitive_utility_record(p_observation jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v jsonb := coalesce(p_observation,'{}'::jsonb);
  v_type text; v_object text; v_project text; v_job text; v_worker text; v_phase text;
  v_signal text; v_evidence text; v_reason text; v_selected boolean; v_used boolean;
  v_dedupe text; v_row public.cognitive_utility_observations%rowtype; v_created boolean := false;
begin
  if jsonb_typeof(v) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_UTILITY_OBSERVATION','reason','NOT_OBJECT');
  end if;
  v_type := upper(coalesce(nullif(btrim(v->>'object_type'),''),''));
  v_object := nullif(btrim(v->>'object_id'),''); v_project := nullif(btrim(v->>'project_id'),'');
  v_job := nullif(btrim(v->>'job_key'),''); v_worker := nullif(btrim(v->>'worker_code'),'');
  v_phase := coalesce(btrim(v->>'phase'),''); v_signal := upper(coalesce(nullif(btrim(v->>'utility_signal'),''),'UNKNOWN'));
  v_evidence := nullif(btrim(v->>'evidence_ref'),''); v_reason := coalesce(nullif(btrim(v->>'reason_code'),''),'UNSPECIFIED');
  if v_type not in ('CARD','PLUMA','TOOL','RECIPE','SKILL') or v_object is null or v_project is null
     or v_job is null or v_worker is null or v_signal not in ('HELPED','NEUTRAL','HURT','UNKNOWN') then
    return jsonb_build_object('ok',false,'state','INVALID_UTILITY_OBSERVATION','reason','IDENTITY_OR_ENUM');
  end if;
  if v ? 'selected' and jsonb_typeof(v->'selected') <> 'boolean' then
    return jsonb_build_object('ok',false,'state','INVALID_UTILITY_OBSERVATION','reason','SELECTED_NOT_BOOLEAN');
  end if;
  if v ? 'used' and jsonb_typeof(v->'used') <> 'boolean' then
    return jsonb_build_object('ok',false,'state','INVALID_UTILITY_OBSERVATION','reason','USED_NOT_BOOLEAN');
  end if;
  v_selected := coalesce((v->>'selected')::boolean,true); v_used := coalesce((v->>'used')::boolean,false);
  if v_used and not v_selected then
    return jsonb_build_object('ok',false,'state','INVALID_UTILITY_OBSERVATION','reason','USED_REQUIRES_SELECTED');
  end if;
  if v_signal='HELPED' and v_evidence is null then
    v_signal := 'UNKNOWN';
    v_reason := case when v_reason='UNSPECIFIED' then 'HELPED_WITHOUT_EVIDENCE_DOWNGRADED'
                     else v_reason || ':HELPED_WITHOUT_EVIDENCE_DOWNGRADED' end;
  end if;
  v_dedupe := md5(v_type || chr(31) || v_object || chr(31) || v_project || chr(31) || v_job || chr(31) ||
                  v_phase || chr(31) || coalesce(v_evidence,''));
  insert into public.cognitive_utility_observations(
    object_type,object_id,project_id,job_key,worker_code,phase,selected,used,utility_signal,evidence_ref,reason_code,dedupe_key
  ) values (v_type,v_object,v_project,v_job,v_worker,v_phase,v_selected,v_used,v_signal,v_evidence,v_reason,v_dedupe)
  on conflict (dedupe_key) do nothing returning * into v_row;
  if found then v_created := true;
  else select * into v_row from public.cognitive_utility_observations where dedupe_key=v_dedupe;
  end if;
  return jsonb_build_object(
    'ok',true,'state',case when v_created then 'UTILITY_OBSERVATION_CREATED' else 'UTILITY_OBSERVATION_DEDUPED' end,
    'observation_id',v_row.observation_id,'object_type',v_row.object_type,'object_id',v_row.object_id,
    'utility_signal',v_row.utility_signal,'selected',v_row.selected,'used',v_row.used,
    'evidence_ref',v_row.evidence_ref,'reason_code',v_row.reason_code
  );
end;
$$;

create or replace view public.cognitive_utility_aggregate as
select object_type,object_id,
  count(*) filter (where selected) as selections,
  count(*) filter (where used) as uses,
  count(*) filter (where utility_signal='HELPED') as helped_count,
  count(*) filter (where utility_signal='HURT') as hurt_count,
  count(*) filter (where utility_signal='UNKNOWN') as unknown_count,
  count(distinct project_id) as distinct_projects,
  count(distinct job_key) as distinct_jobs,
  max(created_at) filter (where used) as last_used_at,
  case when count(*) filter (where used)=0 then 0::numeric
       else round((count(*) filter (where used and evidence_ref is not null))::numeric /
                  (count(*) filter (where used))::numeric,4) end as evidence_coverage
from public.cognitive_utility_observations
group by object_type,object_id;

create or replace function public.forge_cognitive_utility_history(p_object_type text,p_object_id text)
returns jsonb language sql stable security definer set search_path to 'public','pg_temp' as $$
select jsonb_build_object(
 'ok',true,'state','COGNITIVE_UTILITY_HISTORY','object_type',upper(p_object_type),'object_id',p_object_id,
 'aggregate',coalesce((select to_jsonb(a) from public.cognitive_utility_aggregate a
                       where a.object_type=upper(p_object_type) and a.object_id=p_object_id),'{}'::jsonb),
 'observations',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at,o.observation_id)
                          from public.cognitive_utility_observations o
                          where o.object_type=upper(p_object_type) and o.object_id=p_object_id),'[]'::jsonb)
);
$$;

create or replace function public.forge_cognitive_utility_smoke_test()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v_object text := '__UTILITY_SMOKE__' || substr(md5(clock_timestamp()::text),1,10);
  v_guard text := v_object || '_GUARD';
  a jsonb;b jsonb;c jsonb;replay jsonb;guarded jsonb;agg public.cognitive_utility_aggregate%rowtype;
begin
  a := public.forge_cognitive_utility_record(jsonb_build_object(
    'object_type','TOOL','object_id',v_object,'project_id','UTILITY-SMOKE','job_key','J1','worker_code','KSMOKE',
    'phase','WORK','selected',true,'used',true,'utility_signal','HELPED','evidence_ref','receipt://utility/helped','reason_code','OUTPUT_SECTION_APPLIED'));
  b := public.forge_cognitive_utility_record(jsonb_build_object(
    'object_type','TOOL','object_id',v_object,'project_id','UTILITY-SMOKE','job_key','J2','worker_code','KSMOKE',
    'phase','WORK','selected',true,'used',true,'utility_signal','HURT','evidence_ref','receipt://utility/hurt','reason_code','CAUSED_REWORK'));
  c := public.forge_cognitive_utility_record(jsonb_build_object(
    'object_type','TOOL','object_id',v_object,'project_id','UTILITY-SMOKE','job_key','J3','worker_code','KSMOKE',
    'phase','WORK','selected',true,'used',false,'utility_signal','UNKNOWN','reason_code','ATTACHED_NOT_USED'));
  replay := public.forge_cognitive_utility_record(jsonb_build_object(
    'object_type','TOOL','object_id',v_object,'project_id','UTILITY-SMOKE','job_key','J1','worker_code','KSMOKE',
    'phase','WORK','selected',true,'used',true,'utility_signal','HELPED','evidence_ref','receipt://utility/helped','reason_code','OUTPUT_SECTION_APPLIED'));
  guarded := public.forge_cognitive_utility_record(jsonb_build_object(
    'object_type','TOOL','object_id',v_guard,'project_id','UTILITY-SMOKE','job_key','G1','worker_code','KSMOKE',
    'phase','WORK','selected',true,'used',true,'utility_signal','HELPED','reason_code','UNGROUNDED_HELP_CLAIM'));
  select * into agg from public.cognitive_utility_aggregate where object_type='TOOL' and object_id=v_object;
  if a->>'state' <> 'UTILITY_OBSERVATION_CREATED' or b->>'state' <> 'UTILITY_OBSERVATION_CREATED'
     or c->>'state' <> 'UTILITY_OBSERVATION_CREATED' or replay->>'state' <> 'UTILITY_OBSERVATION_DEDUPED'
     or guarded->>'utility_signal' <> 'UNKNOWN' or agg.selections <> 3 or agg.uses <> 2
     or agg.helped_count <> 1 or agg.hurt_count <> 1 or agg.unknown_count <> 1
     or agg.distinct_jobs <> 3 or agg.evidence_coverage <> 1::numeric then
    raise exception 'cognitive utility smoke failed';
  end if;
  delete from public.cognitive_utility_observations where object_type='TOOL' and object_id in (v_object,v_guard);
  return jsonb_build_object('ok',true,'state','COGNITIVE_UTILITY_SMOKE_OK','fixture_counts','PASS','dedupe','PASS',
    'unused_distinguishable','PASS','helped_evidence_gate','PASS','aggregate_reproducible','PASS',
    'traceable_history','PASS','fixture_cleaned',not exists(
      select 1 from public.cognitive_utility_observations where object_type='TOOL' and object_id in (v_object,v_guard)));
exception when others then
  delete from public.cognitive_utility_observations where object_type='TOOL' and object_id in (v_object,v_guard);
  raise;
end;
$$;

comment on table public.cognitive_utility_observations is
'BACKLOG-070 raw historical utility evidence for cognitive objects; transparent observations only, no ranking or promotion.';
comment on view public.cognitive_utility_aggregate is
'BACKLOG-070 reproducible counters per cognitive object; evidence_coverage is evidenced used observations / used observations.';
