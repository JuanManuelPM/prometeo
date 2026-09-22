-- BACKLOG-168: runtime mirror of the canonical seven-section registry.
-- Source of truth: docs/cognitive-forge/forge-sections.v1.json
-- Git blob at implementation time: f4e7fca3c133090832540e692ba2eb2d92b92a10

create table if not exists public.forge_section_registry (
  registry_version integer not null,
  section_id text not null,
  order_no integer not null,
  title text not null,
  source_ref text not null,
  source_blob_sha text not null,
  created_at timestamptz not null default now(),
  primary key (registry_version, section_id),
  unique (registry_version, order_no)
);

insert into public.forge_section_registry(
  registry_version,section_id,order_no,title,source_ref,source_blob_sha
)
values
  (1,'fundamentos',1,'Fundamentos','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10'),
  (1,'planificacion',2,'Planificación','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10'),
  (1,'ejecucion',3,'Ejecución','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10'),
  (1,'aprendizaje',4,'Aprendizaje','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10'),
  (1,'visualizacion',5,'Visualización','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10'),
  (1,'experimento',6,'Experimento','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10'),
  (1,'evaluacion',7,'Evaluación','docs/cognitive-forge/forge-sections.v1.json','f4e7fca3c133090832540e692ba2eb2d92b92a10')
on conflict (registry_version,section_id) do update
set order_no=excluded.order_no,
    title=excluded.title,
    source_ref=excluded.source_ref,
    source_blob_sha=excluded.source_blob_sha;

create or replace function public.forge_section_registry_snapshot_v1()
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'schema','prometeo.forge-section-registry/v1',
    'version',1,
    'source_ref',min(source_ref),
    'source_blob_sha',min(source_blob_sha),
    'section_count',count(*),
    'sections',coalesce(jsonb_agg(
      jsonb_build_object('id',section_id,'order',order_no,'title',title)
      order by order_no
    ),'[]'::jsonb)
  )
  from public.forge_section_registry
  where registry_version=1
$function$;

create or replace function public.forge_section_registry_smoke_test()
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_count integer;
  v_distinct_ids integer;
  v_distinct_orders integer;
  v_min_order integer;
  v_max_order integer;
  v_sources integer;
  v_hashes integer;
begin
  select
    count(*),count(distinct section_id),count(distinct order_no),
    min(order_no),max(order_no),count(distinct source_ref),count(distinct source_blob_sha)
  into
    v_count,v_distinct_ids,v_distinct_orders,
    v_min_order,v_max_order,v_sources,v_hashes
  from public.forge_section_registry
  where registry_version=1;

  if v_count<>7
     or v_distinct_ids<>7
     or v_distinct_orders<>7
     or v_min_order<>1
     or v_max_order<>7
     or v_sources<>1
     or v_hashes<>1
  then
    return jsonb_build_object(
      'ok',false,'state','SECTION_REGISTRY_SMOKE_FAILED',
      'count',v_count,'distinct_ids',v_distinct_ids,
      'distinct_orders',v_distinct_orders,
      'min_order',v_min_order,'max_order',v_max_order,
      'source_refs',v_sources,'source_hashes',v_hashes
    );
  end if;

  return jsonb_build_object(
    'ok',true,'state','SECTION_REGISTRY_SMOKE_OK',
    'section_count',v_count,
    'registry',public.forge_section_registry_snapshot_v1()
  );
end;
$function$;

create or replace function public.forge_global_build_directives_compile(
  p_sections jsonb
)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_expected text[];
  v_registry_ref text;
  v_registry_hash text;
  v_ids text[];
  v_bad integer;
  v_units jsonb;
  v_sections jsonb;
  v_dup integer;
  v_dangling integer;
  v_payload jsonb;
  v_hash text;
begin
  select
    array_agg(section_id order by order_no),
    min(source_ref),
    min(source_blob_sha)
  into v_expected,v_registry_ref,v_registry_hash
  from public.forge_section_registry
  where registry_version=1;

  if coalesce(array_length(v_expected,1),0)<>7 then
    return jsonb_build_object('ok',false,'state','REGISTRY_INVALID','reason','SEVEN_SECTION_REGISTRY_REQUIRED');
  end if;

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
      'unit_id',u->>'unit_id','title',u->>'title','kind',u->>'kind',
      'target_ref',u->>'target_ref','depends_on',u->'depends_on',
      'acceptance',u->'acceptance','source_refs',u->'source_refs'
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
    'section_registry_ref',v_registry_ref,
    'section_registry_blob_sha',v_registry_hash,
    'sections',v_sections,
    'implementation_units',v_units
  );

  v_hash:='md5:'||md5(v_payload::text);

  return v_payload || jsonb_build_object(
    'ok',true,'state','COMPILED','system_spec_hash',v_hash,
    'implementation_unit_count',jsonb_array_length(v_units),
    'directive_source','EXPLICIT_SECTION_IMPLEMENTATION_UNITS',
    'narrative_derivation',false,'authority_granted',false
  );
end;
$function$;