-- CORE-V1 GUIDE convergence: growth must contract as a finite product approaches DONE.

create or replace function public.prometeo_convergence_strategy_v1(
  p_status text
) returns jsonb
language sql
immutable
set search_path to 'public','pg_temp'
as $$
  select case upper(coalesce(btrim(p_status),''))
    when 'FILL' then jsonb_build_object(
      'product_phase','FILL',
      'guide_strategy','FILL_REMAINING_SHEETS',
      'effective_growth_mode','FRONTIER_DRIVEN',
      'suppress_growth_guide',false,
      'terminal',false
    )
    when 'CONTRACT' then jsonb_build_object(
      'product_phase','CONTRACT',
      'guide_strategy','CROSSFILL_AND_CLOSE_GAPS',
      'effective_growth_mode','CONVERGE_TO_DONE',
      'suppress_growth_guide',true,
      'terminal',false
    )
    when 'MERGE' then jsonb_build_object(
      'product_phase','MERGE',
      'guide_strategy','MERGE_ONLY',
      'effective_growth_mode','CONVERGE_TO_DONE',
      'suppress_growth_guide',true,
      'terminal',false
    )
    when 'VERIFY' then jsonb_build_object(
      'product_phase','VERIFY',
      'guide_strategy','VERIFY_ONLY',
      'effective_growth_mode','CONVERGE_TO_DONE',
      'suppress_growth_guide',true,
      'terminal',false
    )
    when 'DONE' then jsonb_build_object(
      'product_phase','DONE',
      'guide_strategy','STOP_AFTER_DONE',
      'effective_growth_mode','STOP',
      'suppress_growth_guide',true,
      'terminal',true
    )
    else jsonb_build_object(
      'product_phase',upper(coalesce(btrim(p_status),'UNKNOWN')),
      'guide_strategy','OBSERVE',
      'effective_growth_mode','FRONTIER_DRIVEN',
      'suppress_growth_guide',false,
      'terminal',false
    )
  end;
$$;

create or replace function public.prometeo_product_convergence_v1(
  p_product_id text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  p public.prometeo_products%rowtype;
  v_total integer:=0;
  v_done integer:=0;
  v_cross_missing integer:=0;
  v_touch_total integer:=0;
  v_distinct_touch_workers integer:=0;
  v_progress numeric:=0;
  v_strategy jsonb;
begin
  if nullif(btrim(coalesce(p_product_id,'')),'') is not null then
    select * into p
    from public.prometeo_products
    where product_id=p_product_id
    limit 1;
  else
    select * into p
    from public.prometeo_products
    where status not in ('DONE','FAILED','QUEUED')
    order by sequence_no
    limit 1;

    if not found then
      select * into p
      from public.prometeo_products
      order by sequence_no desc
      limit 1;
    end if;
  end if;

  if p.product_id is null then
    return jsonb_build_object(
      'ok',true,'state','NO_PRODUCT',
      'effective_growth_mode','FRONTIER_DRIVEN',
      'suppress_growth_guide',false
    );
  end if;

  select count(*) filter(where required),
         count(*) filter(where required and status='DONE'),
         count(*) filter(where required and requires_crossfill and distinct_workers<2),
         coalesce(sum(touch_count) filter(where required),0)
    into v_total,v_done,v_cross_missing,v_touch_total
  from public.prometeo_product_sheets
  where product_id=p.product_id;

  select count(distinct worker_code)
    into v_distinct_touch_workers
  from public.prometeo_sheet_touches
  where product_id=p.product_id;

  v_progress:=case when v_total=0 then 0 else round(100.0*v_done::numeric/v_total,1) end;
  v_strategy:=public.prometeo_convergence_strategy_v1(p.status);

  return jsonb_build_object(
    'ok',true,
    'state','PRODUCT_CONVERGENCE',
    'product_id',p.product_id,
    'project_id',p.project_id,
    'product_status',p.status,
    'required_sheets',v_total,
    'done_sheets',v_done,
    'remaining_sheets',greatest(v_total-v_done,0),
    'progress_pct',v_progress,
    'crossfill_missing',v_cross_missing,
    'touch_count',v_touch_total,
    'distinct_touch_workers',v_distinct_touch_workers,
    'merge_job',p.acceptance->>'merge_job',
    'verify_job',p.acceptance->>'verify_job',
    'strategy',v_strategy,
    'guide_strategy',v_strategy->>'guide_strategy',
    'effective_growth_mode',v_strategy->>'effective_growth_mode',
    'suppress_growth_guide',coalesce((v_strategy->>'suppress_growth_guide')::boolean,false),
    'terminal',coalesce((v_strategy->>'terminal')::boolean,false)
  );
end;
$$;

create or replace function public.prometeo_growth_decision()
returns jsonb
language sql
stable
set search_path to 'public','pg_temp'
as $$
  select to_jsonb(m)
    || jsonb_build_object(
      'convergence', public.prometeo_product_convergence_v1(null),
      'effective_growth_mode',
        case
          when coalesce((public.prometeo_product_convergence_v1(null)->>'suppress_growth_guide')::boolean,false)
            then public.prometeo_product_convergence_v1(null)->>'effective_growth_mode'
          else m.growth_mode
        end
    )
  from public.prometeo_frontier_metrics m
  limit 1;
$$;

create or replace function public.prometeo_maybe_schedule_growth_guide()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  m public.prometeo_frontier_metrics%rowtype;
  v_convergence jsonb;
  v_last timestamptz;
  v_job text;
  v_instruction text;
  v_questions jsonb;
begin
  select * into m from public.prometeo_frontier_metrics limit 1;
  v_convergence:=public.prometeo_product_convergence_v1(null);

  if coalesce((v_convergence->>'suppress_growth_guide')::boolean,false) then
    return jsonb_build_object(
      'state','CONVERGENCE_SUPPRESSES_GROWTH',
      'growth_mode',m.growth_mode,
      'effective_growth_mode',v_convergence->>'effective_growth_mode',
      'guide_strategy',v_convergence->>'guide_strategy',
      'convergence',v_convergence
    );
  end if;

  if exists(
    select 1 from public.prometeo_jobs
    where project_id='GUIDE-SENTINEL-01' and status in ('READY','LEASED')
  ) then
    return jsonb_build_object(
      'state','GUIDE_ALREADY_PENDING',
      'growth_mode',m.growth_mode,
      'convergence',v_convergence
    );
  end if;

  select max(created_at) into v_last
  from public.prometeo_growth_guide_runs;

  if v_last is not null and v_last>now()-interval '8 minutes' then
    return jsonb_build_object(
      'state','COOLDOWN',
      'growth_mode',m.growth_mode,
      'last_growth_guide_at',v_last,
      'convergence',v_convergence
    );
  end if;

  if m.growth_mode='BALANCED' then
    return jsonb_build_object(
      'state','NO_GROWTH_TRIGGER',
      'metrics',to_jsonb(m),
      'convergence',v_convergence
    );
  end if;

  v_job:='GROWTH-'||to_char(clock_timestamp(),'YYYYMMDD-HH24MI');

  v_questions:=case m.growth_mode
    when 'EXPAND_FRONTIER' then jsonb_build_array(
      '¿Qué objetivos durables todavía no tienen ramas ejecutables independientes?',
      '¿Cómo llevamos la frontera a 3–5× desired workers sin fabricar busywork?',
      '¿Qué fuentes reales pueden convertirse inmediatamente en trabajo verificable?'
    )
    when 'REDUCE_CONTROL' then jsonb_build_array(
      '¿Qué trabajo de control puede pausarse, compactarse o convertirse en código determinista?',
      '¿Por qué más del 20% de los leases está en meta/control mientras existe frontera productiva?',
      '¿Qué workers deberían volver a producción después de publicar su lease actual?'
    )
    when 'DISCOVERY_MODE' then jsonb_build_array(
      '¿Por qué los outputs consumen ramas pero casi no descubren nuevas?',
      '¿Qué tipos de trabajo deberían producir children útiles y no lo están haciendo?',
      '¿Qué cambio de contrato aumenta productive_branching sin incentivar spam?'
    )
    when 'SCALE_WORKERS' then jsonb_build_array(
      'Si duplicamos workers ahora, ¿qué cuello aparece primero?',
      '¿La frontera es suficientemente independiente para escalar sin concentración?',
      '¿Qué capacidad productiva adicional puede absorberse ya con el mismo prompt humano?'
    )
    else jsonb_build_array(
      '¿Qué limita el crecimiento útil ahora?',
      '¿Qué cambio produce el mayor aumento de frontier width o throughput durable?'
    )
  end;

  v_instruction :=
    'GUIDE MODE: GROWTH / 10X. No hagas el trabajo de un worker común. '||
    'Tu misión es aumentar el crecimiento PRODUCTIVO de Prometeo sin sacrificar evidencia. '||
    'Antes de expandir, inspeccioná input_context.convergence: si el producto finito pasa a CONTRACT/MERGE/VERIFY/DONE, crecimiento deja de ser prioridad y debe regir CONVERGE_TO_DONE. '||
    'Inspeccioná prometeo_frontier_metrics, prometeo_frontier_sources, proyectos/jobs/outputs y estado real del repo. '||
    'Respondé las preguntas de foco. Podés hacer cambios pequeños, reversibles y verificables directamente. '||
    'Si descubrís trabajo profundo, delegalo en PRODUCTIVE-FRONTIER-01 o creá fuentes/jobs deduplicados; no lo resuelvas todo vos. '||
    'Aplicá estas invariantes: frontier objetivo 3–5× desired production workers durante FILL; meta_share objetivo <=20% cuando haya producción disponible; '||
    'productive_branching deseable >=1 mientras queden objetivos amplios; no fabricar busywork; no medir calidad por palabras. '||
    'Antes de publicar, volvé a consultar prometeo_frontier_metrics y prometeo_product_convergence_v1(null) y dejá before/after. '||
    'En meta.guide_report incluí decision GO|HOLD|STOP, headline, findings[], actions_taken[], jobs_created[], questions_answered[], evidence[], next_actions[].';

  perform public.prometeo_add_job(
    'GUIDE-SENTINEL-01',
    v_job,
    'Growth Guide · '||m.growth_mode,
    'Pegar un volantazo de crecimiento basado en frontier, branching, meta share y capacidad sin violar convergencia de productos finitos.',
    v_instruction,
    jsonb_build_object(
      'guide_mode','GROWTH',
      'growth_mode',m.growth_mode,
      'convergence',v_convergence,
      'metrics_before',to_jsonb(m),
      'focus_questions',v_questions
    ),
    1200,0,1200,700,1800,'[]'::jsonb
  );

  insert into public.prometeo_growth_guide_runs(guide_job_key,mode,metrics)
  values(v_job,m.growth_mode,to_jsonb(m)||jsonb_build_object('convergence',v_convergence));

  return jsonb_build_object(
    'state','GROWTH_GUIDE_SCHEDULED',
    'job_key',v_job,
    'growth_mode',m.growth_mode,
    'effective_growth_mode',m.growth_mode,
    'convergence',v_convergence,
    'questions',v_questions,
    'metrics',to_jsonb(m)
  );
end;
$$;

create or replace function public.prometeo_guide_convergence_smoke_test()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_fill jsonb;
  v_contract jsonb;
  v_merge jsonb;
  v_verify jsonb;
  v_done jsonb;
  v_live jsonb;
  v_growth jsonb;
begin
  v_fill:=public.prometeo_convergence_strategy_v1('FILL');
  v_contract:=public.prometeo_convergence_strategy_v1('CONTRACT');
  v_merge:=public.prometeo_convergence_strategy_v1('MERGE');
  v_verify:=public.prometeo_convergence_strategy_v1('VERIFY');
  v_done:=public.prometeo_convergence_strategy_v1('DONE');
  v_live:=public.prometeo_product_convergence_v1('CORE-V1');
  v_growth:=public.prometeo_growth_decision();

  if v_fill->>'effective_growth_mode' <> 'FRONTIER_DRIVEN'
     or v_fill->>'suppress_growth_guide' <> 'false'
     or v_contract->>'effective_growth_mode' <> 'CONVERGE_TO_DONE'
     or v_contract->>'suppress_growth_guide' <> 'true'
     or v_merge->>'guide_strategy' <> 'MERGE_ONLY'
     or v_verify->>'guide_strategy' <> 'VERIFY_ONLY'
     or v_done->>'effective_growth_mode' <> 'STOP'
     or v_done->>'terminal' <> 'true'
     or v_live->>'state' <> 'PRODUCT_CONVERGENCE'
     or v_growth->'convergence' is null
     or v_growth->>'effective_growth_mode' is null then
    raise exception 'CORE GUIDE convergence smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','GUIDE_CONVERGENCE_SMOKE_OK',
    'phase_mapping','PASS',
    'live_product',v_live,
    'growth_decision_has_convergence',true,
    'contract_suppresses_growth',true,
    'merge_suppresses_growth',true,
    'verify_suppresses_growth',true,
    'done_stops_growth',true
  );
end;
$$;