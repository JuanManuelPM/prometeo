-- BACKLOG-182 · TEST_EVIDENCE_V1 null guard fix
-- The initial validator treated jsonb_typeof(NULL) as SQL NULL, allowing a missing
-- frontier.tests array through the first branch. Make absence explicitly invalid.

create or replace function public.prometeo_frontier_test_evidence_validate(
  p_meta jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'public','pg_temp'
as $$
declare
  v_outcome text := upper(btrim(coalesce(p_meta #>> '{frontier,outcome}','')));
  v_tests jsonb := p_meta #> '{frontier,tests}';
  v_bad integer := 0;
begin
  if v_outcome <> 'IMPLEMENTED' then
    return jsonb_build_object(
      'ok',true,
      'state','TEST_EVIDENCE_NOT_REQUIRED',
      'outcome',nullif(v_outcome,'')
    );
  end if;

  if coalesce(jsonb_typeof(v_tests),'null') <> 'array'
     or coalesce(jsonb_array_length(v_tests),0)=0 then
    return jsonb_build_object(
      'ok',false,
      'state','TEST_EVIDENCE_REQUIRED',
      'reason','IMPLEMENTED_REQUIRES_NONEMPTY_FRONTIER_TESTS'
    );
  end if;

  select count(*) into v_bad
  from jsonb_array_elements(v_tests) t
  where jsonb_typeof(t) <> 'object'
     or nullif(btrim(coalesce(t->>'name','')),'') is null
     or upper(btrim(coalesce(t->>'status',''))) <> 'PASS'
     or nullif(btrim(coalesce(t->>'evidence_ref','')),'') is null;

  if v_bad > 0 then
    return jsonb_build_object(
      'ok',false,
      'state','TEST_EVIDENCE_INVALID',
      'reason','EVERY_TEST_REQUIRES_NAME_PASS_AND_EVIDENCE_REF',
      'invalid_count',v_bad
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','TEST_EVIDENCE_VALID',
    'test_count',jsonb_array_length(v_tests)
  );
end;
$$;
