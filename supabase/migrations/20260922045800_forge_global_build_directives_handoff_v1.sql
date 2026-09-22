-- BACKLOG-178-BUILD-DIRECTIVES-HANDOFF
-- Deterministic System Spec -> Build Graph handoff. Directives must be explicit machine data.

create or replace function public.forge_global_build_directives_compile(
  p_sections jsonb
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_expected text[] := array[
    'fundamentos','planificacion','ejecucion','aprendizaje',
    'visualizacion','experimento','evaluacion'
  ];
  v_ids text[];
  v_bad integer;
  v_units jsonb;
  v_sections jsonb;
  v_dup integer;
  v_dangling integer;
  v_payload jsonb;
  v_hash text;
begin
  if jsonb_typeof(coalesce(p_sections,'null'::jsonb)) <> 'array' then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','SECTIONS_ARRAY_REQUIRED');
  end if;

  if jsonb_array_length(p_sections) <> 7 then
    return jsonb_build_object(
      'ok',false,'state','WAITING_INPUTS','reason','EXACTLY_SEVEN_SECTIONS_REQUIRED',
      'section_count',jsonb_array_length(p_sections)
    );
  end if;

  select array_agg(x->>'section_id' order by x->>'section_id')
  into v_ids
  from jsonb_array_elements(p_sections) x;

  if v_ids <> (select array_agg(x order by x) from unnest(v_expected) x) then
    return jsonb_build_object('ok',false,'state','INPUT_INVALID','reason','SECTION_REGISTRY_MISMATCH');
  end if;

  select count(*) into v_bad
  from jsonb_array_elements(p_sections) s
  where coalesce(s->>'schema','') <> 'prometeo.forge-section-spec/v1'
     or jsonb_typeof(coalesce(s->'implementation_units','null'::jsonb)) <> 'array';

  if v_bad > 0 then
    return jsonb_build_object(
      'ok',false,'state','WAITING_BUILD_DIRECTIVES',
      'reason','SECTION_IMPLEMENTATION_UNITS_REQUIRED',
      'invalid_section_count',v_bad,
      'required_contract','prometeo.forge-implementation-unit/v1'
    );
  end if;

  with raw as (
    select s->>'section_id' as section_id,u as unit
    from jsonb_array_elements(p_sections) s
    cross join lateral jsonb_array_elements(s->'implementation_units') u
  )
  select count(*) into v_bad
  from raw
  where nullif(btrim(coalesce(unit->>'unit_id','')),'') is null
     or nullif(btrim(coalesce(unit->>'title','')),'') is null
     or coalesce(unit->>'kind','') not in ('BUILD','MIGRATION','TEST','CONFIG','DOC')
     or nullif(btrim(coalesce(unit->>'target_ref','')),'') is null
     or jsonb_typeof(coalesce(unit->'depends_on','null'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(unit->'acceptance','null'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(unit->'acceptance','[]'::jsonb)) = 0
     or jsonb_typeof(coalesce(unit->'source_refs','null'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(unit->'source_refs','[]'::jsonb)) = 0
     or exists (
       select 1 from jsonb_array_elements_text(coalesce(unit->'acceptance','[]'::jsonb)) a
       where nullif(btrim(a),'') is null
     )
     or exists (
       select 1 from jsonb_array_elements_text(coalesce(unit->'source_refs','[]'::jsonb)) r
       where nullif(btrim(r),'') is null
     )
     or exists (
       select 1 from jsonb_array_elements_text(coalesce(unit->'depends_on','[]'::jsonb)) d
       where nullif(btrim(d),'') is null
     );

  if v_bad > 0 then
    return jsonb_build_object(
      'ok',false,'state','INPUT_INVALID','reason','INVALID_IMPLEMENTATION_UNIT',
      'invalid_count',v_bad
    );
  end if;

  with raw as (
    select u->>'unit_id' as unit_id
    from jsonb_array_elements(p_sections) s
    cross join lateral jsonb_array_elements(s->'implementation_units') u
  )
  select count(*)-count(distinct unit_id) into v_dup from raw;

  if v_dup > 0 then
    return jsonb_build_object(
      'ok',false,'state','INPUT_INVALID','reason','DUPLICATE_UNIT_ID',
      'duplicate_count',v_dup
    );
  end if;

  with raw as (
    select u
    from jsonb_array_elements(p_sections) s
    cross join lateral jsonb_array_elements(s->'implementation_units') u
  ),
  ids as (
    select u->>'unit_id' as unit_id from raw
  ),
  deps as (
    select r.u->>'unit_id' as unit_id,d as dep_id
    from raw r
    cross join lateral jsonb_array_elements_text(r.u->'depends_on') d
  )
  select count(*) into v_dangling
  from deps d
  left join ids i on i.unit_id=d.dep_id
  where i.unit_id is null;

  if v_dangling > 0 then
    return jsonb_build_object(
      'ok',false,'state','INPUT_INVALID','reason','DANGLING_DEPENDENCY',
      'dangling_count',v_dangling
    );
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'section_id',s->>'section_id',
      'section_version',coalesce((s->>'section_version')::integer,1),
      'section_hash','md5:'||md5((s - 'implementation_units')::text)
    )
    order by array_position(v_expected,s->>'section_id')
  ),'[]'::jsonb)
  into v_sections
  from jsonb_array_elements(p_sections) s;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'unit_id',u->>'unit_id',
      'title',u->>'title',
      'kind',u->>'kind',
      'target_ref',u->>'target_ref',
      'depends_on',u->'depends_on',
      'acceptance',u->'acceptance',
      'source_refs',u->'source_refs'
    )
    order by u->>'unit_id'
  ),'[]'::jsonb)
  into v_units
  from jsonb_array_elements(p_sections) s
  cross join lateral jsonb_array_elements(s->'implementation_units') u;

  if jsonb_array_length(v_units)=0 then
    return jsonb_build_object(
      'ok',false,'state','WAITING_BUILD_DIRECTIVES',
      'reason','NON_EMPTY_IMPLEMENTATION_UNITS_REQUIRED'
    );
  end if;

  v_payload:=jsonb_build_object(
    'schema','prometeo.cognitive-forge-system-spec/v1',
    'compile_state','COMPILED',
    'section_registry_ref','docs/cognitive-forge/forge-sections.v1.json',
    'sections',v_sections,
    'implementation_units',v_units
  );

  v_hash:='md5:'||md5(v_payload::text);

  return v_payload || jsonb_build_object(
    'ok',true,
    'state','COMPILED',
    'system_spec_hash',v_hash,
    'implementation_unit_count',jsonb_array_length(v_units),
    'directive_source','EXPLICIT_SECTION_IMPLEMENTATION_UNITS',
    'narrative_derivation',false,
    'authority_granted',false
  );
end;
$function$;

comment on function public.forge_global_build_directives_compile(jsonb) is
  'BACKLOG-178 handoff: compile seven section specs with explicit machine-readable implementation_units into a deterministic COMPILED System Spec consumable by forge_build_graph_compile. Never derives build work from narrative prose.';

create or replace function public.forge_global_build_directives_smoke_test()
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_ids text[] := array[
    'fundamentos','planificacion','ejecucion','aprendizaje',
    'visualizacion','experimento','evaluacion'
  ];
  v_forward jsonb;
  v_reverse jsonb;
  v_a jsonb;
  v_b jsonb;
  v_graph jsonb;
  v_missing jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'schema','prometeo.forge-section-spec/v1',
      'section_id',section_id,
      'section_version',1,
      'source_interfaces',jsonb_build_array(
        jsonb_build_object(
          'point_id','FIX-'||lpad(ord::text,2,'0'),
          'interface_version',1,
          'source_hash','sha256:fixture-'||ord::text
        )
      ),
      'implementation_units',jsonb_build_array(
        jsonb_build_object(
          'unit_id','U'||lpad(ord::text,2,'0'),
          'title','Fixture unit '||section_id,
          'kind','BUILD',
          'target_ref','forge://fixture/'||section_id,
          'depends_on',case when ord=1 then '[]'::jsonb else jsonb_build_array('U'||lpad((ord-1)::text,2,'0')) end,
          'acceptance',jsonb_build_array('fixture acceptance '||section_id),
          'source_refs',jsonb_build_array('forge://section/'||section_id)
        )
      )
    )
    order by ord
  )
  into v_forward
  from unnest(v_ids) with ordinality q(section_id,ord);

  select jsonb_agg(x order by ord desc)
  into v_reverse
  from jsonb_array_elements(v_forward) with ordinality q(x,ord);

  v_a:=public.forge_global_build_directives_compile(v_forward);
  v_b:=public.forge_global_build_directives_compile(v_reverse);
  v_graph:=public.forge_build_graph_compile(v_a);

  v_missing:=public.forge_global_build_directives_compile(
    jsonb_set(v_forward,'{0}',(v_forward->0)-'implementation_units',false)
  );

  if coalesce((v_a->>'ok')::boolean,false) is not true
     or v_a->>'state'<>'COMPILED'
     or v_a->>'compile_state'<>'COMPILED'
     or v_a->>'directive_source'<>'EXPLICIT_SECTION_IMPLEMENTATION_UNITS'
     or coalesce((v_a->>'narrative_derivation')::boolean,true) is not false
     or jsonb_array_length(v_a->'implementation_units')<>7
     or v_a->'implementation_units' is distinct from v_b->'implementation_units'
     or v_a->>'system_spec_hash' is distinct from v_b->>'system_spec_hash'
     or v_graph->>'state'<>'BUILD_GRAPH_READY'
     or (v_graph->>'node_count')::integer<>7
     or v_missing->>'state'<>'WAITING_BUILD_DIRECTIVES'
  then
    return jsonb_build_object(
      'ok',false,'state','GLOBAL_BUILD_DIRECTIVES_SMOKE_FAILED',
      'forward',v_a,'reverse',v_b,'graph',v_graph,'missing_case',v_missing
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','GLOBAL_BUILD_DIRECTIVES_SMOKE_OK',
    'system_spec_hash',v_a->>'system_spec_hash',
    'implementation_unit_count',jsonb_array_length(v_a->'implementation_units'),
    'graph_state',v_graph->>'state',
    'graph_hash',v_graph->>'graph_hash',
    'node_count',(v_graph->>'node_count')::integer,
    'deterministic_reorder','PASS',
    'explicit_machine_directives','PASS',
    'narrative_derivation',false
  );
end;
$function$;
