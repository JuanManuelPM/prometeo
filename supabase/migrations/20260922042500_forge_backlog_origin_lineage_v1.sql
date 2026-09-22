-- BACKLOG-234: normalized backlog -> origin lineage.
-- Origin kinds reuse existing Forge registries; no duplicate copies of Goals/Skills/Tools/Plumes.

create table if not exists public.forge_backlog_origins (
  backlog_id integer not null check (backlog_id > 0),
  origin_kind text not null check (origin_kind in ('GOAL','BLUEPRINT_POINT','SKILL','TOOL','PLUME')),
  origin_id text not null check (btrim(origin_id) <> ''),
  origin_sub_id text not null default '',
  relation_kind text not null default 'ORIGINATES_FROM'
    check (relation_kind in ('ORIGINATES_FROM','DERIVED_FROM','DISCOVERED_FROM')),
  evidence_ref text not null check (btrim(evidence_ref) <> ''),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance)='object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (backlog_id,origin_kind,origin_id,origin_sub_id,relation_kind)
);

create index if not exists forge_backlog_origins_origin_idx
on public.forge_backlog_origins(origin_kind,origin_id,origin_sub_id);

alter table public.forge_backlog_origins enable row level security;

create or replace function public.forge_backlog_origin_validate(
  p_origin_kind text,
  p_origin_id text,
  p_origin_sub_id text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_kind text := upper(coalesce(nullif(btrim(p_origin_kind),''),''));
  v_id text := nullif(btrim(p_origin_id),'');
  v_sub text := coalesce(nullif(btrim(p_origin_sub_id),''),'');
  v_point integer;
  v_ref text;
begin
  if v_kind not in ('GOAL','BLUEPRINT_POINT','SKILL','TOOL','PLUME') or v_id is null then
    return jsonb_build_object('ok',false,'state','INVALID_BACKLOG_ORIGIN_IDENTITY');
  end if;

  if v_kind='GOAL' then
    if not exists(select 1 from public.forge_goals where goal_id=v_id) then
      return jsonb_build_object('ok',false,'state','ORIGIN_NOT_FOUND','origin_kind',v_kind,'origin_id',v_id);
    end if;
    v_ref := 'forge-goal://' || v_id;

  elsif v_kind='BLUEPRINT_POINT' then
    begin
      v_point := v_sub::integer;
    exception when others then
      return jsonb_build_object('ok',false,'state','BLUEPRINT_POINT_REQUIRED','origin_id',v_id);
    end;
    if v_point <= 0
       or not exists(select 1 from public.blueprint_points where blueprint_id=v_id and point_no=v_point)
    then
      return jsonb_build_object('ok',false,'state','ORIGIN_NOT_FOUND','origin_kind',v_kind,'origin_id',v_id,'origin_sub_id',v_sub);
    end if;
    v_ref := 'forge-blueprint://' || v_id || '/point/' || v_point::text;

  elsif v_kind='SKILL' then
    if not exists(select 1 from public.forge_skills where skill_id=v_id) then
      return jsonb_build_object('ok',false,'state','ORIGIN_NOT_FOUND','origin_kind',v_kind,'origin_id',v_id);
    end if;
    v_ref := 'forge-skill://' || v_id;

  elsif v_kind='TOOL' then
    if not exists(select 1 from public.forge_tools where tool_id=v_id) then
      return jsonb_build_object('ok',false,'state','ORIGIN_NOT_FOUND','origin_kind',v_kind,'origin_id',v_id);
    end if;
    v_ref := 'forge-tool://' || v_id;

  elsif v_kind='PLUME' then
    if not exists(select 1 from public.forge_plumes where plume_id=v_id) then
      return jsonb_build_object('ok',false,'state','ORIGIN_NOT_FOUND','origin_kind',v_kind,'origin_id',v_id);
    end if;
    v_ref := 'forge-plume://' || v_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','BACKLOG_ORIGIN_VALID',
    'origin_kind',v_kind,
    'origin_id',v_id,
    'origin_sub_id',v_sub,
    'canonical_ref',v_ref
  );
end;
$$;

create or replace function public.forge_backlog_origin_link(
  p_backlog_id integer,
  p_origin_kind text,
  p_origin_id text,
  p_origin_sub_id text,
  p_relation_kind text,
  p_evidence_ref text,
  p_provenance jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_validation jsonb;
  v_kind text := upper(coalesce(nullif(btrim(p_origin_kind),''),''));
  v_id text := nullif(btrim(p_origin_id),'');
  v_sub text := coalesce(nullif(btrim(p_origin_sub_id),''),'');
  v_relation text := upper(coalesce(nullif(btrim(p_relation_kind),''),'ORIGINATES_FROM'));
  v_evidence text := nullif(btrim(p_evidence_ref),'');
  v_inserted integer;
begin
  if p_backlog_id is null or p_backlog_id <= 0 then
    return jsonb_build_object('ok',false,'state','INVALID_BACKLOG_ID');
  end if;
  if v_relation not in ('ORIGINATES_FROM','DERIVED_FROM','DISCOVERED_FROM') then
    return jsonb_build_object('ok',false,'state','INVALID_BACKLOG_ORIGIN_RELATION');
  end if;
  if v_evidence is null then
    return jsonb_build_object('ok',false,'state','BACKLOG_ORIGIN_EVIDENCE_REQUIRED');
  end if;
  if jsonb_typeof(coalesce(p_provenance,'{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok',false,'state','INVALID_PROVENANCE');
  end if;

  v_validation := public.forge_backlog_origin_validate(v_kind,v_id,v_sub);
  if coalesce((v_validation->>'ok')::boolean,false) is not true then
    return v_validation;
  end if;

  insert into public.forge_backlog_origins(
    backlog_id,origin_kind,origin_id,origin_sub_id,relation_kind,evidence_ref,provenance
  ) values (
    p_backlog_id,v_kind,v_id,v_sub,v_relation,v_evidence,coalesce(p_provenance,'{}'::jsonb)
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'ok',true,
    'state',case when v_inserted=1 then 'BACKLOG_ORIGIN_LINKED' else 'BACKLOG_ORIGIN_ALREADY_LINKED' end,
    'backlog_id',p_backlog_id,
    'origin',v_validation,
    'relation_kind',v_relation,
    'evidence_ref',v_evidence
  );
end;
$$;

create or replace function public.forge_backlog_origins_for(
  p_backlog_id integer
) returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'ok',true,
    'state','BACKLOG_ORIGINS',
    'backlog_id',p_backlog_id,
    'items',coalesce(
      jsonb_agg(
        jsonb_build_object(
          'origin_kind',o.origin_kind,
          'origin_id',o.origin_id,
          'origin_sub_id',nullif(o.origin_sub_id,''),
          'relation_kind',o.relation_kind,
          'evidence_ref',o.evidence_ref,
          'provenance',o.provenance,
          'canonical_ref',(public.forge_backlog_origin_validate(o.origin_kind,o.origin_id,o.origin_sub_id)->>'canonical_ref'),
          'created_at',o.created_at
        )
        order by o.origin_kind,o.origin_id,o.origin_sub_id,o.relation_kind
      ) filter (where o.backlog_id is not null),
      '[]'::jsonb
    )
  )
  from public.forge_backlog_origins o
  where o.backlog_id=p_backlog_id;
$$;

create or replace function public.forge_backlog_origin_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_backlog integer := 999999234;
  v_goal jsonb;
  v_blueprint jsonb;
  v_skill jsonb;
  v_tool jsonb;
  v_plume jsonb;
  v_missing jsonb;
  v_dedup jsonb;
  v_list jsonb;
begin
  delete from public.forge_backlog_origins where backlog_id=v_backlog;

  v_goal := public.forge_backlog_origin_link(
    v_backlog,'GOAL','FORGE-8-01',null,'ORIGINATES_FROM',
    'smoke://backlog-234/goal',jsonb_build_object('fixture',true)
  );
  v_blueprint := public.forge_backlog_origin_link(
    v_backlog,'BLUEPRINT_POINT','FORGE-BLUEPRINT-84-01','1','DERIVED_FROM',
    'smoke://backlog-234/blueprint',jsonb_build_object('fixture',true)
  );
  v_skill := public.forge_backlog_origin_link(
    v_backlog,'SKILL','FORGE_SECTION_INTEGRATOR',null,'DISCOVERED_FROM',
    'smoke://backlog-234/skill',jsonb_build_object('fixture',true)
  );
  v_tool := public.forge_backlog_origin_link(
    v_backlog,'TOOL','tool.github.inspect_modify_publish',null,'DISCOVERED_FROM',
    'smoke://backlog-234/tool',jsonb_build_object('fixture',true)
  );
  v_plume := public.forge_backlog_origin_link(
    v_backlog,'PLUME','plume.really_cant',null,'DISCOVERED_FROM',
    'smoke://backlog-234/plume',jsonb_build_object('fixture',true)
  );
  v_dedup := public.forge_backlog_origin_link(
    v_backlog,'GOAL','FORGE-8-01',null,'ORIGINATES_FROM',
    'smoke://backlog-234/goal',jsonb_build_object('fixture',true)
  );
  v_missing := public.forge_backlog_origin_link(
    v_backlog,'SKILL','__MISSING_SKILL__',null,'ORIGINATES_FROM',
    'smoke://backlog-234/missing',jsonb_build_object('fixture',true)
  );
  v_list := public.forge_backlog_origins_for(v_backlog);

  if v_goal->>'state' <> 'BACKLOG_ORIGIN_LINKED'
     or v_blueprint->>'state' <> 'BACKLOG_ORIGIN_LINKED'
     or v_skill->>'state' <> 'BACKLOG_ORIGIN_LINKED'
     or v_tool->>'state' <> 'BACKLOG_ORIGIN_LINKED'
     or v_plume->>'state' <> 'BACKLOG_ORIGIN_LINKED'
     or v_dedup->>'state' <> 'BACKLOG_ORIGIN_ALREADY_LINKED'
     or v_missing->>'state' <> 'ORIGIN_NOT_FOUND'
     or jsonb_array_length(v_list->'items') <> 5
  then
    raise exception 'BACKLOG-234 origin lineage smoke failed';
  end if;

  delete from public.forge_backlog_origins where backlog_id=v_backlog;

  return jsonb_build_object(
    'ok',true,
    'state','BACKLOG_ORIGIN_SMOKE_OK',
    'origin_kinds',jsonb_build_array('GOAL','BLUEPRINT_POINT','SKILL','TOOL','PLUME'),
    'dedupe','PASS',
    'missing_origin_rejected','PASS',
    'fixture_links',5,
    'fixture_cleaned',not exists(select 1 from public.forge_backlog_origins where backlog_id=v_backlog)
  );
exception
  when others then
    delete from public.forge_backlog_origins where backlog_id=v_backlog;
    raise;
end;
$$;

select public.forge_backlog_origin_smoke_test();
