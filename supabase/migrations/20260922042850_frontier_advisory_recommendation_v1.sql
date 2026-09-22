-- BACKLOG-245: advisory next-pending recommendation without replacing human preferences.

create or replace function public.prometeo_frontier_recommend(
  p_preferences jsonb default '{}'::jsonb,
  p_limit integer default 5
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_preferences jsonb := coalesce(p_preferences,'{}'::jsonb);
  v_limit integer := greatest(1,least(coalesce(p_limit,5),25));
  v_candidates jsonb;
  v_count integer;
begin
  if jsonb_typeof(v_preferences) <> 'object' then
    return jsonb_build_object(
      'ok',false,
      'state','INVALID_PREFERENCES',
      'authority','ADVISORY',
      'mutation_performed',false
    );
  end if;

  if jsonb_typeof(coalesce(v_preferences->'preferred_source_keys','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_preferences->'exclude_source_keys','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_preferences->'preferred_source_types','[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_preferences->'preferred_source_statuses','[]'::jsonb)) <> 'array'
  then
    return jsonb_build_object(
      'ok',false,
      'state','INVALID_PREFERENCE_COLLECTION',
      'authority','ADVISORY',
      'mutation_performed',false
    );
  end if;

  with eligible as (
    select
      s.*,
      (exists (
        select 1 from jsonb_array_elements_text(coalesce(v_preferences->'preferred_source_keys','[]'::jsonb)) x
        where x=s.source_key
      )) as preferred_key,
      (exists (
        select 1 from jsonb_array_elements_text(coalesce(v_preferences->'preferred_source_types','[]'::jsonb)) x
        where x=s.source_type
      )) as preferred_type,
      (exists (
        select 1 from jsonb_array_elements_text(coalesce(v_preferences->'preferred_source_statuses','[]'::jsonb)) x
        where x=s.source_status
      )) as preferred_status
    from public.prometeo_frontier_sources s
    where s.completed_at is null
      and s.state in ('NEW','MATERIALIZED')
      and s.source_status not in ('HECHO','DONE','SUPERSEDED')
      and not exists (
        select 1 from jsonb_array_elements_text(coalesce(v_preferences->'exclude_source_keys','[]'::jsonb)) x
        where x=s.source_key
      )
  ),
  scored as (
    select
      e.*,
      e.priority
        + case when e.preferred_key then 1000 else 0 end
        + case when e.preferred_type then 100 else 0 end
        + case when e.preferred_status then 25 else 0 end
      as recommendation_score
    from eligible e
  ),
  chosen as (
    select *
    from scored
    order by recommendation_score desc, priority desc, created_at, source_key
    limit v_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'source_key',c.source_key,
          'source_type',c.source_type,
          'source_status',c.source_status,
          'title',c.title,
          'summary',c.summary,
          'state',c.state,
          'base_priority',c.priority,
          'recommendation_score',c.recommendation_score,
          'preference_matches',
            (case when c.preferred_key then jsonb_build_array('preferred_source_key') else '[]'::jsonb end)
            || (case when c.preferred_type then jsonb_build_array('preferred_source_type') else '[]'::jsonb end)
            || (case when c.preferred_status then jsonb_build_array('preferred_source_status') else '[]'::jsonb end)
        )
        order by c.recommendation_score desc, c.priority desc, c.created_at, c.source_key
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into v_candidates,v_count
  from chosen c;

  return jsonb_build_object(
    'ok',true,
    'state',case when v_count=0 then 'NO_RECOMMENDATION' else 'RECOMMENDATION_READY' end,
    'authority','ADVISORY',
    'selection_authority','USER_OR_CALLER',
    'mutation_performed',false,
    'preferences_applied',v_preferences,
    'candidate_count',v_count,
    'candidates',v_candidates,
    'scoring',jsonb_build_object(
      'base','frontier_source.priority',
      'preferred_source_key_bonus',1000,
      'preferred_source_type_bonus',100,
      'preferred_source_status_bonus',25,
      'excluded_source_keys','hard_filter'
    ),
    'server_time',clock_timestamp()
  );
end;
$$;

create or replace function public.prometeo_frontier_recommend_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_result jsonb;
  v_count integer;
begin
  v_result := public.prometeo_frontier_recommend(
    jsonb_build_object(
      'preferred_source_types',jsonb_build_array('BACKLOG'),
      'exclude_source_keys',jsonb_build_array('__SMOKE_NONEXISTENT__')
    ),
    2
  );
  v_count := coalesce((v_result->>'candidate_count')::integer,0);

  if v_result->>'ok' <> 'true'
     or v_result->>'authority' <> 'ADVISORY'
     or v_result->>'selection_authority' <> 'USER_OR_CALLER'
     or v_result->>'mutation_performed' <> 'false'
     or v_count > 2
     or jsonb_typeof(v_result->'candidates') <> 'array'
  then
    raise exception 'BACKLOG-245 recommendation smoke failed: %',v_result;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','FRONTIER_RECOMMEND_SMOKE_OK',
    'advisory_only','PASS',
    'no_mutation','PASS',
    'preferences_shape','PASS',
    'limit_guard','PASS',
    'candidate_count',v_count
  );
end;
$$;

select public.prometeo_frontier_recommend_smoke_test();
