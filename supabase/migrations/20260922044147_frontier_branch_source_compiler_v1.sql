-- GUIDE-BRANCH-SOURCE-COMPILER-V1
-- Deterministically compile structured branch candidates from Productive Frontier outputs
-- into bounded, deduplicated frontier sources. Free-text discoveries are never compiled.

create or replace function public.prometeo_frontier_compile_branch_candidates_v1(
  p_origin jsonb,
  p_candidates jsonb,
  p_max_create integer default 3
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_limit integer := least(3,greatest(0,coalesce(p_max_create,3)));
  v_created integer := 0;
  v_seen integer := 0;
  v_rejected integer := 0;
  v_decisions jsonb := '[]'::jsonb;
  v_c jsonb;
  v_ord bigint;
  v_key text;
  v_title text;
  v_summary text;
  v_work_kind text;
  v_priority integer;
  v_acceptance jsonb;
  v_bad_acceptance integer;
  v_fingerprint text;
  v_source_ref text;
  v_job_key text;
  v_reason text;
  v_seen_keys text[] := array[]::text[];
  v_seen_fingerprints text[] := array[]::text[];
  v_origin_project text := nullif(btrim(coalesce(p_origin->>'project_id','')),'');
  v_origin_job text := nullif(btrim(coalesce(p_origin->>'job_key','')),'');
  v_origin_generation integer := case
    when jsonb_typeof(p_origin->'generation')='number' then (p_origin->>'generation')::integer
    else null
  end;
begin
  if jsonb_typeof(coalesce(p_origin,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_BRANCH_ORIGIN','reason','ORIGIN_NOT_OBJECT');
  end if;

  if v_origin_project is null or v_origin_job is null or v_origin_generation is null then
    return jsonb_build_object('ok',false,'state','INVALID_BRANCH_ORIGIN','reason','OUTPUT_IDENTITY_REQUIRED');
  end if;

  if jsonb_typeof(p_candidates) <> 'array' then
    return jsonb_build_object(
      'ok',true,'state','NO_STRUCTURED_BRANCH_CANDIDATES',
      'created',0,'seen',0,'rejected',0,'limit',v_limit,'decisions','[]'::jsonb
    );
  end if;

  for v_c,v_ord in
    select value,ordinality
    from jsonb_array_elements(p_candidates) with ordinality
  loop
    v_seen := v_seen + 1;
    v_reason := null;

    if jsonb_typeof(v_c) <> 'object' then
      v_reason := 'CANDIDATE_NOT_OBJECT';
    end if;

    v_key := upper(regexp_replace(btrim(coalesce(v_c->>'source_key','')),'[^A-Za-z0-9_-]','','g'));
    v_title := btrim(coalesce(v_c->>'title',''));
    v_summary := btrim(coalesce(v_c->>'summary',''));
    v_work_kind := upper(btrim(coalesce(v_c->>'work_kind','')));
    v_acceptance := v_c->'acceptance';

    if v_reason is null and (length(v_key) < 3 or length(v_key) > 100) then
      v_reason := 'INVALID_SOURCE_KEY';
    elsif v_reason is null and (v_title='' or length(v_title)>240) then
      v_reason := 'TITLE_REQUIRED';
    elsif v_reason is null and (v_summary='' or length(v_summary)>2000) then
      v_reason := 'SUMMARY_REQUIRED';
    elsif v_reason is null and coalesce(v_c->'necessary','false'::jsonb) <> 'true'::jsonb then
      v_reason := 'NOT_NECESSARY';
    elsif v_reason is null and coalesce(v_c->'independent','false'::jsonb) <> 'true'::jsonb then
      v_reason := 'NOT_INDEPENDENT';
    elsif v_reason is null and coalesce(v_c->'verifiable','false'::jsonb) <> 'true'::jsonb then
      v_reason := 'NOT_VERIFIABLE';
    elsif v_reason is null and v_work_kind not in ('BUILD','EXPERIMENT','HYBRID','UNCLASSIFIED') then
      v_reason := 'INVALID_WORK_KIND';
    elsif v_reason is null and (jsonb_typeof(v_acceptance) <> 'array' or jsonb_array_length(v_acceptance)=0) then
      v_reason := 'ACCEPTANCE_REQUIRED';
    end if;

    if v_reason is null then
      select count(*) into v_bad_acceptance
      from jsonb_array_elements(v_acceptance) a
      where jsonb_typeof(a) <> 'string'
         or nullif(btrim(a #>> '{}'),'') is null;
      if v_bad_acceptance > 0 then
        v_reason := 'INVALID_ACCEPTANCE';
      end if;
    end if;

    if v_reason is null then
      v_priority := 100;
      if jsonb_typeof(v_c->'priority')='number' then
        begin
          v_priority := greatest(0,least(1000,(v_c->>'priority')::integer));
        exception when others then
          v_priority := 100;
        end;
      end if;

      v_fingerprint := 'md5:' || md5(
        lower(v_title) || E'\n' ||
        lower(v_summary) || E'\n' ||
        coalesce(v_acceptance::text,'[]')
      );
      v_source_ref := coalesce(
        nullif(btrim(v_c->>'source_ref'),''),
        format(
          'prometeo_outputs:%s/%s/%s#branch_candidates[%s]',
          v_origin_project,v_origin_job,v_origin_generation,v_ord
        )
      );
      v_job_key := 'FR-' || regexp_replace(v_key,'[^A-Z0-9_-]','','g');

      if v_key = any(v_seen_keys) or v_fingerprint = any(v_seen_fingerprints) then
        v_reason := 'DUPLICATE_IN_OUTPUT';
      elsif exists(
        select 1
        from public.prometeo_frontier_sources s
        where s.source_key=v_key
           or s.source_payload->>'branch_fingerprint'=v_fingerprint
           or (
             lower(s.title)=lower(v_title)
             and lower(s.summary)=lower(v_summary)
           )
      ) then
        v_reason := 'DUPLICATE_SOURCE';
      elsif exists(
        select 1
        from public.prometeo_jobs j
        where j.project_id='PRODUCTIVE-FRONTIER-01'
          and j.job_key=v_job_key
      ) then
        v_reason := 'DUPLICATE_JOB';
      elsif v_created >= v_limit then
        v_reason := 'BOUND_REACHED';
      end if;
    end if;

    if v_reason is null then
      insert into public.prometeo_frontier_sources(
        source_key,source_type,source_ref,source_status,title,summary,
        source_payload,priority,state,work_kind
      )
      values(
        v_key,
        'BRANCH_DISCOVERY',
        v_source_ref,
        'READY',
        v_title,
        v_summary,
        jsonb_build_object(
          'schema','prometeo.frontier-branch-source/v1',
          'compiler','prometeo_frontier_compile_branch_candidates_v1',
          'branch_fingerprint',v_fingerprint,
          'origin_output',jsonb_build_object(
            'project_id',v_origin_project,
            'job_key',v_origin_job,
            'generation',v_origin_generation,
            'candidate_ordinal',v_ord
          ),
          'acceptance',v_acceptance,
          'candidate',v_c
        ),
        v_priority,
        'NEW',
        v_work_kind
      )
      on conflict(source_key) do nothing;

      if found then
        v_created := v_created + 1;
        v_seen_keys := array_append(v_seen_keys,v_key);
        v_seen_fingerprints := array_append(v_seen_fingerprints,v_fingerprint);
        v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
          'ordinal',v_ord,'source_key',v_key,'decision','CREATED'
        ));
      else
        v_rejected := v_rejected + 1;
        v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
          'ordinal',v_ord,'source_key',v_key,'decision','REJECTED','reason','DUPLICATE_RACE'
        ));
      end if;
    else
      v_rejected := v_rejected + 1;
      v_decisions := v_decisions || jsonb_build_array(jsonb_build_object(
        'ordinal',v_ord,
        'source_key',nullif(v_key,''),
        'decision','REJECTED',
        'reason',v_reason
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'state','BRANCH_SOURCE_COMPILE_RESULT',
    'origin',jsonb_build_object(
      'project_id',v_origin_project,
      'job_key',v_origin_job,
      'generation',v_origin_generation
    ),
    'seen',v_seen,
    'created',v_created,
    'rejected',v_rejected,
    'limit',v_limit,
    'decisions',v_decisions
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object(
      'ok',false,'state','INVALID_BRANCH_CANDIDATE',
      'reason','INVALID_NUMERIC_FIELD',
      'created',v_created,'seen',v_seen,'rejected',v_rejected
    );
end;
$$;

create or replace function public.prometeo_frontier_compile_output_branches_v1(
  p_project_id text,
  p_job_key text,
  p_generation integer,
  p_max_create integer default 3
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_meta jsonb;
begin
  select o.meta into v_meta
  from public.prometeo_outputs o
  where o.project_id=p_project_id
    and o.job_key=p_job_key
    and o.generation=p_generation;

  if not found then
    return jsonb_build_object(
      'ok',false,'state','OUTPUT_NOT_FOUND',
      'project_id',p_project_id,'job_key',p_job_key,'generation',p_generation
    );
  end if;

  return public.prometeo_frontier_compile_branch_candidates_v1(
    jsonb_build_object(
      'project_id',p_project_id,
      'job_key',p_job_key,
      'generation',p_generation
    ),
    v_meta #> '{frontier,branch_candidates}',
    p_max_create
  );
end;
$$;

create or replace function public.prometeo_frontier_compile_output_branches_trg()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if new.project_id='PRODUCTIVE-FRONTIER-01'
     and jsonb_typeof(new.meta #> '{frontier,branch_candidates}')='array' then
    perform public.prometeo_frontier_compile_branch_candidates_v1(
      jsonb_build_object(
        'project_id',new.project_id,
        'job_key',new.job_key,
        'generation',new.generation
      ),
      new.meta #> '{frontier,branch_candidates}',
      3
    );
  end if;
  return new;
exception when others then
  -- Branch compilation must never invalidate an otherwise valid PUBLISH.
  return new;
end;
$$;

drop trigger if exists trg_prometeo_frontier_compile_output_branches_v1
on public.prometeo_outputs;

create trigger trg_prometeo_frontier_compile_output_branches_v1
after insert on public.prometeo_outputs
for each row
execute function public.prometeo_frontier_compile_output_branches_trg();

create or replace function public.prometeo_frontier_branch_audit_contract()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare
  v_audit_marker constant text := 'BRANCH_AUDIT_V1';
  v_candidate_marker constant text := 'BRANCH_CANDIDATES_V1';
  v_audit_contract constant text := E'\n\nBRANCH_AUDIT_V1\nAntes de PUBLISH, auditá los descubrimientos hechos durante WORK. Creá child sólo cuando TODAS se cumplan: (a) trabajo necesario para el objetivo o una dependencia descubierta; (b) independiente del cierre que ya hiciste en el padre; (c) tiene output/aceptación verificable; (d) no duplica source/job existente; (e) no es busywork ni una reformulación. Si cumple, delegalo en vez de absorberlo silenciosamente. Máximo 3. En meta.frontier.branch_audit incluí candidates_seen, spawned, closed_in_parent y zero_reason cuando spawned=0. zero_reason debe ser uno de NONE_INDEPENDENT, ALL_CLOSED_IN_PARENT, DUPLICATE, NOT_NECESSARY o BLOCKED. No optimices spawned: calidad y necesidad mandan.';
  v_candidate_contract constant text := E'\n\nBRANCH_CANDIDATES_V1\nSi durante WORK descubrís trabajo independiente que NO cerraste en el padre y merece convertirse en nueva fuente durable, agregalo sólo como objeto estructurado en meta.frontier.branch_candidates[]. Cada candidato debe incluir: source_key estable (A-Z/0-9/_/-), title, summary, necessary=true, independent=true, verifiable=true, acceptance[] no vacío y work_kind=BUILD|EXPERIMENT|HYBRID|UNCLASSIFIED; priority y source_ref son opcionales. No conviertas discoveries[] de texto libre automáticamente. No incluyas duplicados, busywork, reformulaciones ni trabajo ya cerrado en el padre. Máximo 3 fuentes serán compiladas por output; el backend vuelve a deduplicar contra sources y jobs existentes.';
begin
  if new.project_id='PRODUCTIVE-FRONTIER-01'
     and new.job_key like 'FR-%' then
    if position(v_audit_marker in coalesce(new.instruction,''))=0 then
      new.instruction := coalesce(new.instruction,'') || v_audit_contract;
    end if;
    if position(v_candidate_marker in coalesce(new.instruction,''))=0 then
      new.instruction := coalesce(new.instruction,'') || v_candidate_contract;
    end if;
  end if;
  return new;
end;
$$;

-- Backfill the structured-candidate contract into queued, not-yet-leased Frontier jobs.
update public.prometeo_jobs
set instruction=instruction
where project_id='PRODUCTIVE-FRONTIER-01'
  and status='READY'
  and job_key like 'FR-%'
  and position('BRANCH_CANDIDATES_V1' in coalesce(instruction,''))=0;

create or replace function public.prometeo_frontier_branch_source_compiler_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_prefix text := 'BRANCH-SMOKE-' || upper(substr(md5(clock_timestamp()::text),1,8));
  v_origin jsonb;
  v_candidates jsonb;
  v_repeat jsonb;
  v_first jsonb;
  v_count integer;
begin
  v_origin := jsonb_build_object(
    'project_id','PRODUCTIVE-FRONTIER-01',
    'job_key','__SMOKE_BRANCH_COMPILER__',
    'generation',0
  );

  v_candidates := jsonb_build_array(
    jsonb_build_object(
      'source_key',v_prefix||'-A','title','Smoke A','summary','Independent verified smoke task A',
      'necessary',true,'independent',true,'verifiable',true,
      'acceptance',jsonb_build_array('A is verifiably complete'),'work_kind','BUILD','priority',0
    ),
    jsonb_build_object(
      'source_key',v_prefix||'-A','title','Smoke A duplicate','summary','Duplicate key must be rejected',
      'necessary',true,'independent',true,'verifiable',true,
      'acceptance',jsonb_build_array('duplicate rejected'),'work_kind','BUILD','priority',0
    ),
    jsonb_build_object(
      'source_key',v_prefix||'-NOISE','title','Noise','summary','Not necessary',
      'necessary',false,'independent',true,'verifiable',true,
      'acceptance',jsonb_build_array('must not create'),'work_kind','BUILD','priority',0
    ),
    jsonb_build_object(
      'source_key',v_prefix||'-B','title','Smoke B','summary','Independent verified smoke task B',
      'necessary',true,'independent',true,'verifiable',true,
      'acceptance',jsonb_build_array('B is verifiably complete'),'work_kind','EXPERIMENT','priority',0
    ),
    jsonb_build_object(
      'source_key',v_prefix||'-C','title','Smoke C','summary','Independent verified smoke task C',
      'necessary',true,'independent',true,'verifiable',true,
      'acceptance',jsonb_build_array('C is verifiably complete'),'work_kind','HYBRID','priority',0
    ),
    jsonb_build_object(
      'source_key',v_prefix||'-D','title','Smoke D','summary','Fourth valid task exceeds output bound',
      'necessary',true,'independent',true,'verifiable',true,
      'acceptance',jsonb_build_array('D would be verifiably complete'),'work_kind','BUILD','priority',0
    )
  );

  v_first := public.prometeo_frontier_compile_branch_candidates_v1(v_origin,v_candidates,3);

  v_repeat := public.prometeo_frontier_compile_branch_candidates_v1(
    v_origin,
    jsonb_build_array(
      v_candidates->0,
      v_candidates->3,
      v_candidates->4,
      v_candidates->2
    ),
    3
  );

  select count(*) into v_count
  from public.prometeo_frontier_sources
  where source_key like v_prefix || '%';

  if v_first->>'state' <> 'BRANCH_SOURCE_COMPILE_RESULT'
     or (v_first->>'created')::integer <> 3
     or (v_first->>'seen')::integer <> 6
     or (v_first->>'rejected')::integer <> 3
     or (v_repeat->>'created')::integer <> 0
     or v_count <> 3 then
    delete from public.prometeo_frontier_sources where source_key like v_prefix || '%';
    raise exception 'branch source compiler smoke failed: first %, repeat %, count %',v_first,v_repeat,v_count;
  end if;

  delete from public.prometeo_frontier_sources
  where source_key like v_prefix || '%';

  return jsonb_build_object(
    'ok',true,
    'state','BRANCH_SOURCE_COMPILER_SMOKE_OK',
    'first_created',v_first->'created',
    'first_rejected',v_first->'rejected',
    'repeat_created',v_repeat->'created',
    'bounded_to',3,
    'duplicate_noise_no_growth',true,
    'fixture_cleaned',not exists(
      select 1 from public.prometeo_frontier_sources where source_key like v_prefix || '%'
    )
  );
exception when others then
  delete from public.prometeo_frontier_sources where source_key like v_prefix || '%';
  raise;
end;
$$;