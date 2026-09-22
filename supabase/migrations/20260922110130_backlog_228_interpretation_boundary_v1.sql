-- BACKLOG-228: deterministic boundary for when interpretation requires cognition.
-- The boundary routes work; it does not call an AI/model and does not replace exact checks.

create or replace function public.forge_interpretation_boundary_v1(p_signal jsonb)
returns jsonb
language plpgsql
immutable
parallel safe
set search_path to 'public','pg_temp'
as $$
declare
  v jsonb := coalesce(p_signal,'null'::jsonb);
  v_kind text;
  v_route text;
  v_reason text;
  v_required boolean;
begin
  if jsonb_typeof(v) <> 'object' then
    return jsonb_build_object(
      'ok',false,
      'state','INTERPRETATION_BOUNDARY_INVALID',
      'route','UNCLASSIFIED',
      'cognitive_required',null,
      'reason_code','SIGNAL_MUST_BE_OBJECT',
      'policy_ref','BACKLOG-228'
    );
  end if;

  v_kind := upper(regexp_replace(
    btrim(coalesce(nullif(v->>'kind',''), nullif(v->>'signal_type',''), '')),
    '[^A-Za-z0-9]+','_','g'
  ));
  v_kind := trim(both '_' from v_kind);

  if v_kind in (
    'ANOMALY',
    'HYPOTHESIS',
    'ARCHITECTURE',
    'ARCHITECTURE_CHANGE',
    'ARCHITECTURAL_CHANGE'
  ) then
    v_route := 'COGNITIVE_INTERPRETATION';
    v_required := true;
    v_reason := case
      when v_kind='ANOMALY' then 'ANOMALY_REQUIRES_INTERPRETATION'
      when v_kind='HYPOTHESIS' then 'HYPOTHESIS_REQUIRES_INTERPRETATION'
      else 'ARCHITECTURE_CHANGE_REQUIRES_INTERPRETATION'
    end;
  elsif v_kind in (
    'DETERMINISTIC_CHECK',
    'EXACT_CHECK',
    'EXACT_COMPARISON',
    'INVARIANT',
    'INVARIANT_CHECK',
    'LOOKUP',
    'COUNT',
    'VALIDATION',
    'SCHEMA_VALIDATION'
  ) then
    v_route := 'DETERMINISTIC';
    v_required := false;
    v_reason := 'MECHANICAL_CHECK_DOES_NOT_REQUIRE_INTERPRETATION';
  else
    v_route := 'UNCLASSIFIED';
    v_required := null;
    v_reason := case
      when v_kind='' then 'SIGNAL_KIND_REQUIRED'
      else 'UNKNOWN_SIGNAL_KIND'
    end;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','INTERPRETATION_BOUNDARY_ROUTED',
    'kind',nullif(v_kind,''),
    'route',v_route,
    'cognitive_required',v_required,
    'reason_code',v_reason,
    'source_ref',nullif(btrim(v->>'source_ref'),''),
    'policy_ref','BACKLOG-228',
    'contract',jsonb_build_object(
      'cognitive_scope',jsonb_build_array('ANOMALY','HYPOTHESIS','ARCHITECTURE_CHANGE'),
      'unknown_policy','UNCLASSIFIED',
      'model_invocation','OUT_OF_SCOPE'
    )
  );
end;
$$;

comment on function public.forge_interpretation_boundary_v1(jsonb) is
  'BACKLOG-228 deterministic routing boundary: anomalies, hypotheses and architecture changes require cognitive interpretation; exact checks remain deterministic; unknown kinds remain unclassified.';

create or replace function public.forge_interpretation_boundary_v1_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_anomaly jsonb;
  v_hypothesis jsonb;
  v_architecture jsonb;
  v_validation jsonb;
  v_invariant jsonb;
  v_unknown jsonb;
  v_invalid jsonb;
  v_volatility "char";
  v_security_definer boolean;
begin
  v_anomaly := public.forge_interpretation_boundary_v1(
    jsonb_build_object('kind','ANOMALY','source_ref','smoke://anomaly')
  );
  v_hypothesis := public.forge_interpretation_boundary_v1(
    jsonb_build_object('kind','hypothesis','source_ref','smoke://hypothesis')
  );
  v_architecture := public.forge_interpretation_boundary_v1(
    jsonb_build_object('kind','architecture-change','source_ref','smoke://architecture')
  );
  v_validation := public.forge_interpretation_boundary_v1(
    jsonb_build_object('kind','schema validation','source_ref','smoke://validation')
  );
  v_invariant := public.forge_interpretation_boundary_v1(
    jsonb_build_object('kind','INVARIANT_CHECK','source_ref','smoke://invariant')
  );
  v_unknown := public.forge_interpretation_boundary_v1(
    jsonb_build_object('kind','MAYBE_SOMETHING_NEW','source_ref','smoke://unknown')
  );
  v_invalid := public.forge_interpretation_boundary_v1('[]'::jsonb);

  select p.provolatile,p.prosecdef
    into v_volatility,v_security_definer
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='forge_interpretation_boundary_v1'
    and pg_get_function_identity_arguments(p.oid)='p_signal jsonb';

  if v_anomaly->>'route' <> 'COGNITIVE_INTERPRETATION'
     or (v_anomaly->>'cognitive_required')::boolean is not true
     or v_hypothesis->>'route' <> 'COGNITIVE_INTERPRETATION'
     or v_architecture->>'route' <> 'COGNITIVE_INTERPRETATION'
     or v_validation->>'route' <> 'DETERMINISTIC'
     or (v_validation->>'cognitive_required')::boolean is not false
     or v_invariant->>'route' <> 'DETERMINISTIC'
     or v_unknown->>'route' <> 'UNCLASSIFIED'
     or v_unknown->'cognitive_required' <> 'null'::jsonb
     or coalesce((v_invalid->>'ok')::boolean,true)
     or v_invalid->>'route' <> 'UNCLASSIFIED'
     or v_volatility <> 'i'
     or v_security_definer
  then
    raise exception 'forge interpretation boundary v1 smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','INTERPRETATION_BOUNDARY_V1_SMOKE_OK',
    'anomaly_requires_cognition','PASS',
    'hypothesis_requires_cognition','PASS',
    'architecture_change_requires_cognition','PASS',
    'mechanical_validation_stays_deterministic','PASS',
    'invariant_stays_deterministic','PASS',
    'unknown_is_not_guessed','PASS',
    'invalid_input_fails_closed','PASS',
    'boundary_is_immutable','PASS',
    'boundary_is_security_invoker','PASS'
  );
end;
$$;
