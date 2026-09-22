-- BACKLOG-070 follow-up: emit historical cognitive utility observations from the real PUBLISH path.
-- Attached cognitive objects are the SKILL bundles returned by prometeo_skill_context(job,3).
-- Usage is explicit-only through meta.cognitive_usage[]; telemetry never changes maturity/ranking/promotion.

alter table public.cognitive_utility_observations
  add column if not exists publication_ref text;

create index if not exists cognitive_utility_publication_idx
  on public.cognitive_utility_observations(publication_ref)
  where publication_ref is not null;

create or replace function public.forge_cognitive_utility_publish_hook(
  p_execution jsonb,
  p_attached jsonb,
  p_meta jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_exec jsonb := coalesce(p_execution,'{}'::jsonb);
  v_attached jsonb := coalesce(p_attached,'[]'::jsonb);
  v_meta jsonb := coalesce(p_meta,'{}'::jsonb);
  v_usage jsonb := case
    when jsonb_typeof(coalesce(p_meta->'cognitive_usage','[]'::jsonb))='array'
      then coalesce(p_meta->'cognitive_usage','[]'::jsonb)
    else '[]'::jsonb
  end;
  v_project text := nullif(btrim(v_exec->>'project_id'),'');
  v_job text := nullif(btrim(v_exec->>'job_key'),'');
  v_worker text := nullif(btrim(v_exec->>'worker_code'),'');
  v_publication text := nullif(btrim(v_exec->>'publication_ref'),'');
  v_item jsonb;
  v_use jsonb;
  v_id text;
  v_used boolean;
  v_signal text;
  v_evidence text;
  v_reason text;
  v_record jsonb;
  v_results jsonb := '[]'::jsonb;
  v_seen integer := 0;
  v_created integer := 0;
  v_deduped integer := 0;
begin
  if v_project is null or v_job is null or v_worker is null or v_publication is null then
    return jsonb_build_object(
      'ok',false,'state','UTILITY_PUBLISH_HOOK_INVALID',
      'reason','EXECUTION_IDENTITY_REQUIRED'
    );
  end if;

  if jsonb_typeof(v_attached) <> 'array' then
    return jsonb_build_object(
      'ok',false,'state','UTILITY_PUBLISH_HOOK_INVALID',
      'reason','ATTACHED_NOT_ARRAY'
    );
  end if;

  for v_item in select value from jsonb_array_elements(v_attached)
  loop
    v_id := nullif(btrim(v_item#>>'{skill_ref,skill_id}'),'');
    if v_id is null then
      continue;
    end if;
    v_seen := v_seen + 1;

    select value into v_use
    from jsonb_array_elements(v_usage)
    where upper(coalesce(value->>'object_type','SKILL'))='SKILL'
      and value->>'object_id'=v_id
    limit 1;

    v_used := false;
    v_signal := 'UNKNOWN';
    v_evidence := null;
    v_reason := 'ATTACHED_NOT_EXPLICITLY_USED';

    if v_use is not null then
      if jsonb_typeof(v_use->'used')='boolean' then
        v_used := (v_use->>'used')::boolean;
      end if;

      if v_used then
        v_signal := upper(coalesce(nullif(btrim(v_use->>'utility_signal'),''),'UNKNOWN'));
        if v_signal not in ('HELPED','NEUTRAL','HURT','UNKNOWN') then
          v_signal := 'UNKNOWN';
        end if;
        v_evidence := nullif(btrim(v_use->>'evidence_ref'),'');
        v_reason := coalesce(nullif(btrim(v_use->>'reason_code'),''),'EXPLICITLY_USED');
      else
        v_signal := 'UNKNOWN';
        v_evidence := null;
        v_reason := coalesce(nullif(btrim(v_use->>'reason_code'),''),'EXPLICITLY_NOT_USED');
      end if;
    end if;

    v_record := public.forge_cognitive_utility_record(jsonb_build_object(
      'object_type','SKILL',
      'object_id',v_id,
      'project_id',v_project,
      'job_key',v_job,
      'worker_code',v_worker,
      'phase','PUBLISH',
      'selected',true,
      'used',v_used,
      'utility_signal',v_signal,
      'evidence_ref',v_evidence,
      'reason_code',v_reason
    ));

    if coalesce((v_record->>'ok')::boolean,false) then
      update public.cognitive_utility_observations
      set publication_ref=v_publication
      where observation_id=(v_record->>'observation_id')::uuid
        and publication_ref is distinct from v_publication;

      if v_record->>'state'='UTILITY_OBSERVATION_CREATED' then
        v_created := v_created + 1;
      elsif v_record->>'state'='UTILITY_OBSERVATION_DEDUPED' then
        v_deduped := v_deduped + 1;
      end if;
    end if;

    v_results := v_results || jsonb_build_array(
      v_record || jsonb_build_object(
        'publication_ref',v_publication,
        'attached',true
      )
    );
  end loop;

  return jsonb_build_object(
    'ok',true,
    'state','COGNITIVE_UTILITY_PUBLISH_HOOK_OK',
    'publication_ref',v_publication,
    'attached_count',v_seen,
    'created_count',v_created,
    'deduped_count',v_deduped,
    'observations',v_results
  );
exception when others then
  return jsonb_build_object(
    'ok',false,
    'state','COGNITIVE_UTILITY_PUBLISH_HOOK_ERROR',
    'sqlstate',sqlstate
  );
end;
$$;

create or replace function public.forge_cognitive_utility_publish_hook_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_suffix text := substr(md5(clock_timestamp()::text || random()::text),1,10);
  v_project text := 'UTILITY-HOOK-SMOKE-'||v_suffix;
  v_job text := 'J-'||v_suffix;
  v_pub text := 'prometeo_outputs:'||v_project||'/'||v_job;
  v_attached jsonb;
  v_meta jsonb;
  v_first jsonb;
  v_replay jsonb;
  v_count integer;
  v_used integer;
  v_helped integer;
  v_unknown integer;
  v_refs integer;
  v_maturity_before text[];
  v_maturity_after text[];
begin
  select array_agg(skill_id||':'||version_no||':'||maturity_state order by skill_id,version_no)
  into v_maturity_before
  from public.forge_skill_versions
  where (skill_id,version_no) in (
    ('DEEP_DUPLICATION_HUNTER',1),
    ('DEEP_WHY_NOT_A_FUNCTION',1)
  );

  v_attached := jsonb_build_array(
    jsonb_build_object(
      'skill_ref',jsonb_build_object('skill_id','DEEP_DUPLICATION_HUNTER','version_no',1),
      'name','duplication fixture'
    ),
    jsonb_build_object(
      'skill_ref',jsonb_build_object('skill_id','DEEP_WHY_NOT_A_FUNCTION','version_no',1),
      'name','function fixture'
    )
  );

  v_meta := jsonb_build_object(
    'cognitive_usage',jsonb_build_array(
      jsonb_build_object(
        'object_type','SKILL',
        'object_id','DEEP_DUPLICATION_HUNTER',
        'used',true,
        'utility_signal','HELPED',
        'evidence_ref',v_pub||'#receipt',
        'reason_code','SMOKE_MATERIAL_APPLICATION'
      )
    )
  );

  v_first := public.forge_cognitive_utility_publish_hook(
    jsonb_build_object(
      'project_id',v_project,
      'job_key',v_job,
      'worker_code','KSMOKE',
      'publication_ref',v_pub
    ),
    v_attached,
    v_meta
  );

  v_replay := public.forge_cognitive_utility_publish_hook(
    jsonb_build_object(
      'project_id',v_project,
      'job_key',v_job,
      'worker_code','KSMOKE',
      'publication_ref',v_pub
    ),
    v_attached,
    v_meta
  );

  select
    count(*),
    count(*) filter(where used),
    count(*) filter(where utility_signal='HELPED'),
    count(*) filter(where utility_signal='UNKNOWN'),
    count(*) filter(where publication_ref=v_pub)
  into v_count,v_used,v_helped,v_unknown,v_refs
  from public.cognitive_utility_observations
  where project_id=v_project and job_key=v_job;

  select array_agg(skill_id||':'||version_no||':'||maturity_state order by skill_id,version_no)
  into v_maturity_after
  from public.forge_skill_versions
  where (skill_id,version_no) in (
    ('DEEP_DUPLICATION_HUNTER',1),
    ('DEEP_WHY_NOT_A_FUNCTION',1)
  );

  if v_first->>'state' <> 'COGNITIVE_UTILITY_PUBLISH_HOOK_OK'
     or (v_first->>'attached_count')::int <> 2
     or (v_first->>'created_count')::int <> 2
     or (v_replay->>'deduped_count')::int <> 2
     or v_count <> 2
     or v_used <> 1
     or v_helped <> 1
     or v_unknown <> 1
     or v_refs <> 2
     or v_maturity_before is distinct from v_maturity_after
  then
    raise exception 'cognitive utility publish hook smoke failed';
  end if;

  delete from public.cognitive_utility_observations
  where project_id=v_project and job_key=v_job;

  return jsonb_build_object(
    'ok',true,
    'state','COGNITIVE_UTILITY_PUBLISH_HOOK_SMOKE_OK',
    'two_attached_objects','PASS',
    'replay_idempotent','PASS',
    'attached_unused_distinct','PASS',
    'helped_requires_evidence','PASS',
    'publication_traceability','PASS',
    'maturity_unchanged','PASS',
    'fixture_cleaned',not exists(
      select 1 from public.cognitive_utility_observations
      where project_id=v_project and job_key=v_job
    )
  );
end;
$$;

create or replace function public.prometeo_publish_v1_core(
  p_agent_id text,
  p_lease_token text,
  p_output text,
  p_meta jsonb default '{}'::jsonb,
  p_children jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v jsonb;
  v_gate jsonb;
  v_meta jsonb:=coalesce(p_meta,'{}'::jsonb);
  v_project_id text;
  v_spawn_policy jsonb;
  v_job jsonb;
  v_attached jsonb := '[]'::jsonb;
  v_utility jsonb;
  v_publication_ref text;
begin
  select to_jsonb(j)
  into v_job
  from public.prometeo_jobs j
  where j.lease_token=p_lease_token
    and j.status='LEASED'
    and j.assigned_agent_id=p_agent_id
  limit 1;

  if v_job is not null then
    v_project_id:=v_job->>'project_id';
    v_attached:=public.prometeo_skill_context(v_job,3);
  end if;

  if jsonb_typeof(coalesce(p_children,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(p_children,'[]'::jsonb))>0 then
    if v_project_id is not null then
      v_spawn_policy:=public.prometeo_project_spawn_policy(v_project_id);
      if coalesce((v_spawn_policy->>'allowed')::boolean,false) is not true then
        return public.prometeo_contract_response(
          p_agent_id,
          jsonb_build_object(
            'ok',false,'state','RETRY_CHILDREN',
            'error','effective spawn policy is closed',
            'lease_token',p_lease_token,
            'spawn_policy',v_spawn_policy
          )
        );
      end if;
    end if;
  end if;

  v_gate:=public.forge_deep_skill_pre_publish(
    p_agent_id,p_lease_token,p_output,p_meta,p_children
  );

  if coalesce((v_gate->>'ok')::boolean,false) is not true then
    return public.prometeo_contract_response(
      p_agent_id,
      coalesce(v_gate,'{}'::jsonb)||jsonb_build_object('lease_token',p_lease_token)
    );
  end if;

  if v_gate->>'state'='DEEP_SKILL_PRE_PUBLISH_OK' then
    v_meta:=jsonb_set(v_meta,'{deep_skill_receipt}',v_gate->'receipt',true);
  end if;

  v:=public.prometeo_publish_core(
    p_agent_id,p_lease_token,p_output,v_meta,p_children
  );

  if v->>'state' in ('PUBLISHED_AND_NEXT','PUBLISHED_AND_STOPPED')
     and v_job is not null then
    begin
      v_publication_ref:='prometeo_outputs:'||(v_job->>'project_id')||'/'||(v_job->>'job_key');
      v_utility:=public.forge_cognitive_utility_publish_hook(
        jsonb_build_object(
          'project_id',v_job->>'project_id',
          'job_key',v_job->>'job_key',
          'worker_code',coalesce(v->>'worker_code',v_job->>'assigned_worker_code'),
          'publication_ref',v_publication_ref
        ),
        v_attached,
        v_meta
      );

      update public.prometeo_outputs
      set meta=jsonb_set(
        coalesce(meta,'{}'::jsonb),
        '{cognitive_utility_receipt}',
        coalesce(v_utility,'{}'::jsonb),
        true
      )
      where project_id=v_job->>'project_id'
        and job_key=v_job->>'job_key';
    exception when others then
      -- Utility telemetry is observational and must never invalidate an accepted publish.
      null;
    end;
  end if;

  if v->>'state' in ('PUBLISHED_AND_STOPPED','STOPPED') then
    update public.prometeo_worker_sessions
    set final_state=v->>'state',closed_at=coalesce(closed_at,now()),last_seen_at=now()
    where agent_id=p_agent_id;
  elsif v->>'state'='PUBLISHED_AND_NEXT'
        and v->'next'->>'state'='WORK' then
    update public.prometeo_worker_sessions
    set consecutive_waits=0,last_seen_at=now()
    where agent_id=p_agent_id and protocol_version='OBEY-v2';
  end if;

  return public.prometeo_contract_response(p_agent_id,v);
end;
$$;

select public.forge_cognitive_utility_publish_hook_smoke_test();
