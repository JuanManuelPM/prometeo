-- I008 runtime integration: make control + morgue consume session-first liveness.
-- Validated with a full transactional OBEY-v2 smoke before promotion.

create or replace view public.prometeo_control_worker_liveness as
select
  w.agent_id,
  w.worker_code,
  w.status as durable_status,
  w.current_project_id,
  w.current_job_key,
  w.next_project_id,
  w.jobs_done,
  w.rescues_done,
  w.joined_at,
  coalesce(l.signal_at,w.last_seen_at) as last_seen_at,
  coalesce(l.signal_age_seconds,extract(epoch from(now()-w.last_seen_at))::bigint)::int as silent_seconds,
  coalesce(l.liveness,'SILENT') as liveness
from public.prometeo_workers w
left join public.prometeo_worker_liveness l on l.agent_id=w.agent_id;

create or replace function public.prometeo_detect_dead_workers()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_new integer:=0;
  v_recovered integer:=0;
  v_batch_no integer;
  v_batch_id text;
  v_job_key text;
  v_ids bigint[];
  v_count integer;
  v_context jsonb;
begin
  -- Recovery follows the same session-first liveness truth as detection.
  update public.prometeo_worker_deaths d
  set recovered_at=now()
  from public.prometeo_worker_liveness l
  where d.agent_id=l.agent_id
    and d.recovered_at is null
    and l.liveness<>'DEAD'
    and l.signal_at is not null
    and l.signal_at>d.last_seen_at;
  get diagnostics v_recovered=row_count;

  -- Detect every worker that the versioned session-first projection classifies DEAD.
  -- This intentionally includes OBEY-v2 PARKED workers once their own signal expires.
  insert into public.prometeo_worker_deaths(
    agent_id,worker_code,last_seen_at,joined_at,status_at_detection,reason,
    jobs_done,rescues_done,last_project_id,next_project_id
  )
  select
    w.agent_id,w.worker_code,l.signal_at,w.joined_at,w.status,
    'LIVENESS_DEAD:'||coalesce(l.threshold_version,'UNVERSIONED'),
    w.jobs_done,w.rescues_done,w.last_project_id,w.next_project_id
  from public.prometeo_worker_liveness l
  join public.prometeo_workers w on w.agent_id=l.agent_id
  where l.liveness='DEAD'
    and l.signal_at is not null
    and not exists(
      select 1 from public.prometeo_worker_deaths d
      where d.agent_id=w.agent_id and d.last_seen_at=l.signal_at
    );
  get diagnostics v_new=row_count;

  loop
    select count(*) into v_count
    from public.prometeo_worker_deaths
    where batch_id is null and recovered_at is null;

    exit when v_count<10;

    select coalesce(max((substring(batch_id from 2))::integer),0)+1
      into v_batch_no
    from public.prometeo_death_batches;

    v_batch_id:='D'||lpad(v_batch_no::text,3,'0');
    v_job_key:='MORGUE-'||v_batch_id;

    select array_agg(death_id order by detected_at,death_id)
      into v_ids
    from (
      select death_id,detected_at
      from public.prometeo_worker_deaths
      where batch_id is null and recovered_at is null
      order by detected_at,death_id
      limit 10
    ) x;

    insert into public.prometeo_death_batches(batch_id,death_count,status,review_job_key)
    values(v_batch_id,array_length(v_ids,1),'READY',v_job_key);

    update public.prometeo_worker_deaths
    set batch_id=v_batch_id
    where death_id=any(v_ids);

    select jsonb_build_object(
      'batch_id',v_batch_id,
      'deaths',coalesce(jsonb_agg(jsonb_build_object(
        'death_id',d.death_id,
        'agent_id',d.agent_id,
        'worker_code',d.worker_code,
        'joined_at',d.joined_at,
        'last_seen_at',d.last_seen_at,
        'silent_seconds',extract(epoch from(now()-d.last_seen_at))::int,
        'reason',d.reason,
        'jobs_done',d.jobs_done,
        'rescues_done',d.rescues_done,
        'last_project_id',d.last_project_id,
        'next_project_id',d.next_project_id,
        'recent_events',(
          select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb)
          from (
            select event_type,project_id,job_key,word_count,elapsed_ms,created_at
            from public.prometeo_events e2
            where e2.agent_id=d.agent_id
            order by created_at desc
            limit 20
          ) e
        ),
        'outputs',(
          select coalesce(jsonb_agg(jsonb_build_object(
            'project_id',o.project_id,'job_key',o.job_key,'word_count',o.word_count,
            'elapsed_ms',o.elapsed_ms,'published_at',o.published_at
          ) order by o.published_at desc),'[]'::jsonb)
          from public.prometeo_outputs o
          where o.worker_code=d.worker_code
        )
      ) order by d.death_id),'[]'::jsonb)
    )
    into v_context
    from public.prometeo_worker_deaths d
    where d.death_id=any(v_ids);

    insert into public.prometeo_jobs(
      project_id,job_key,title,objective,instruction,input_context,status,
      priority,required_rank,lease_seconds,min_words,max_words
    )
    values(
      'MORGUE-REVIEW-01',v_job_key,
      'Autopsia colectiva '||v_batch_id,
      'Revisar exactamente 10 expedientes de workers muertos y extraer patrones reutilizables.',
      'Usá el dossier del input_context. Para cada cadáver reconstruí: qué alcanzó a hacer, último estado durable, secuencia de eventos, outputs producidos, señales previas a la muerte, causa probable y si había camino de recuperación. Después compará los 10: patrones compartidos, diferencias entre quienes produjeron algo y quienes murieron temprano, fallos del protocolo, fallos de herramientas, decisiones de scheduler y oportunidades de simplificación. Terminá con: 1) hallazgos confirmados, 2) hipótesis todavía no confirmadas, 3) RuntimeRule candidates, 4) cambios concretos para /o/, 5) métricas que faltan capturar. No inventes chain-of-thought ni causas no observables.',
      v_context,'READY',100,0,600,1600,2600
    );

    insert into public.prometeo_events(project_id,job_key,event_type,payload)
    values(
      'MORGUE-REVIEW-01',v_job_key,'DEATH_BATCH_CREATED',
      jsonb_build_object('batch_id',v_batch_id,'death_ids',to_jsonb(v_ids))
    );
  end loop;

  return jsonb_build_object(
    'ok',true,
    'new_deaths',v_new,
    'recovered',v_recovered,
    'unbatched_deaths',(
      select count(*) from public.prometeo_worker_deaths
      where batch_id is null and recovered_at is null
    ),
    'batches',(select count(*) from public.prometeo_death_batches)
  );
end;
$function$;
