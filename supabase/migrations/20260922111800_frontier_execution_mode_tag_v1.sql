-- AUTO-Q01136 · Productive Frontier CONCLUSION fast path
-- One scoped runtime change: historical conclusions use minimal current-state verification
-- instead of the generic broad investigation path.


create or replace function public.prometeo_frontier_execution_mode(p_source_status text)
returns text
language sql
immutable
as $
  select case
    when upper(btrim(coalesce(p_source_status,'')))='CONCLUSION'
      then 'CONCLUSION_VERIFY_FASTPATH'
    else 'STANDARD'
  end;
$;

create or replace function public.prometeo_frontier_instruction_prefix(p_source_status text)
returns text
language sql
immutable
as $$
  select case
    when upper(btrim(coalesce(p_source_status,'')))='CONCLUSION' then
      'FAST PATH · CONCLUSION. Esta fuente es una conclusión histórica, no una feature pendiente. '||
      'Verificá su vigencia con evidencia actual mínima suficiente: preferí 1-2 lecturas directas de backend/repo. '||
      'Si la evidencia actual la sostiene, publicá ALREADY_DONE sin mutar código/backlog ni abrir children. '||
      'Salí de este fast path sólo si encontrás una contradicción material actual que requiera trabajo nuevo.'||E'\n\n'
    else ''
  end;
$$;

create or replace function public.prometeo_frontier_materialize(
  p_target_ready integer default 120,
  p_max_create integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ready integer;
  v_active integer;
  v_need integer;
  v_created integer:=0;
  s record;
  v_job_key text;
  v_instruction text;
begin
  select
    count(*) filter(where status='READY'),
    count(*) filter(where status in ('READY','LEASED'))
  into v_ready,v_active
  from public.prometeo_jobs
  where project_id='PRODUCTIVE-FRONTIER-01';

  v_need:=greatest(0,least(coalesce(p_target_ready,120),300)-v_ready);

  for s in
    select *
    from public.prometeo_frontier_sources
    where state='NEW'
    order by priority desc,created_at,source_key
    limit least(v_need,greatest(0,coalesce(p_max_create,40)))
  loop
    v_job_key:='FR-'||regexp_replace(upper(s.source_key),'[^A-Z0-9_-]','','g');

    v_instruction :=
      public.prometeo_frontier_instruction_prefix(s.source_status)||
      'PRODUCTIVE FRONTIER ROOT. Fuente durable: '||s.source_key||E'.\n'||
      'Primero verificá contra repo/backend/estado actual si esta necesidad sigue pendiente; no confíes ciegamente en el backlog histórico. '||
      'Si ya está resuelta, reconciliá evidencia y cerrá sin fabricar trabajo. '||
      'Si sigue pendiente y existe una implementación reversible razonable, HACELA y verificá; no entregues sólo análisis. '||
      'Si es demasiado amplia, abrí trabajo independiente real mediante children (máximo 3) y resolvé en este job la parte que sí puedas cerrar. '||
      'Antes de crear cada child comprobá que sea distinto, necesario, verificable y que empuje el objetivo padre. '||
      'En meta.frontier incluí: source_key, outcome (IMPLEMENTED|DECOMPOSED|ALREADY_DONE|BLOCKED), discoveries[], children_reason[], reusable_learning[]. '||
      'Nunca crees children para mantener workers ocupados. Priorizá bytes, migrations, tests, specs ejecutables o decisiones que desbloqueen downstream.';

    insert into public.prometeo_jobs(
      project_id,job_key,title,objective,instruction,input_context,status,
      priority,required_rank,lease_seconds,min_words,max_words
    )
    values(
      'PRODUCTIVE-FRONTIER-01',
      v_job_key,
      s.title,
      'Mover materialmente esta necesidad durable hacia DONE o abrir sus ramas ejecutables reales.',
      v_instruction,
      jsonb_build_object(
        'frontier_source_key',s.source_key,
        'source_type',s.source_type,
        'source_status',s.source_status,
        'frontier_execution_mode',public.prometeo_frontier_execution_mode(s.source_status),
        'source_ref',s.source_ref,
        'source_title',s.title,
        'source_summary',s.summary,
        'source_payload',s.source_payload
      ),
      'READY',
      s.priority,
      0,
      900,
      120,
      1800
    )
    on conflict(project_id,job_key) do nothing;

    if found then
      update public.prometeo_frontier_sources
      set state='MATERIALIZED',materialized_job_key=v_job_key,materialized_at=now()
      where source_key=s.source_key;
      v_created:=v_created+1;
    end if;
  end loop;

  return jsonb_build_object(
    'state','FRONTIER_READY',
    'ready_before',v_ready,
    'active_before',v_active,
    'created',v_created,
    'target_ready',p_target_ready,
    'remaining_sources',(select count(*) from public.prometeo_frontier_sources where state='NEW'),
    'server_time',clock_timestamp()
  );
end;
$function$;

create or replace function public.prometeo_frontier_conclusion_fastpath_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_conclusion text;
  v_other text;
begin
  v_conclusion:=public.prometeo_frontier_instruction_prefix('CONCLUSION');
  v_other:=public.prometeo_frontier_instruction_prefix('DISENADO');

  if v_conclusion not ilike '%ALREADY_DONE%'
     or v_conclusion not ilike '%1-2 lecturas%'
     or coalesce(v_other,'') <> ''
  then
    raise exception 'frontier conclusion fastpath assertion failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','FRONTIER_CONCLUSION_FASTPATH_SMOKE_OK',
    'conclusion_has_fastpath',true,
    'non_conclusion_unchanged',true
  );
end;
$$;

select public.prometeo_frontier_conclusion_fastpath_smoke_test();

create or replace function public.prometeo_frontier_execution_mode_smoke_test()
returns jsonb
language plpgsql
immutable
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if public.prometeo_frontier_execution_mode('CONCLUSION') <> 'CONCLUSION_VERIFY_FASTPATH'
     or public.prometeo_frontier_execution_mode('DISENADO') <> 'STANDARD'
  then
    raise exception 'frontier execution mode assertion failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','FRONTIER_EXECUTION_MODE_SMOKE_OK',
    'conclusion_mode','CONCLUSION_VERIFY_FASTPATH',
    'other_mode','STANDARD'
  );
end;
$$;

select public.prometeo_frontier_execution_mode_smoke_test();
