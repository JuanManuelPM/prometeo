-- AUTO-Q01010: stop blind reservoir template duplication.
-- At most one active AUTO job (READY/LEASED) per reservoir_class.

create or replace function public.prometeo_replenish_reservoir(
  p_target_ready integer default 30,
  p_max_create integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ready integer;
  v_total integer;
  v_need integer;
  v_make integer;
  v_n bigint;
  v_key text;
  v_title text;
  v_objective text;
  v_instruction text;
  v_class text;
  v_created integer:=0;
  v_missing integer:=0;
begin
  select count(*) filter(where status='READY'),count(*)
  into v_ready,v_total
  from public.prometeo_jobs
  where project_id='WORK-RESERVOIR-01';

  v_need:=greatest(0,least(coalesce(p_target_ready,30),60)-v_ready);
  v_make:=least(v_need,greatest(0,coalesce(p_max_create,15)),greatest(0,490-v_total));

  for v_class in
    select x.class_name
    from (values
      ('STATE_TRUTH'),('BOTTLENECK'),('REGRESSION'),('OUTPUT_REVIEW'),
      ('RUNTIME_KNOWLEDGE'),('DEPENDENCY'),('BACKLOG'),('SECURITY_TOOLING'),
      ('DOCS_RECONCILE'),('RESERVOIR_QUALITY')
    ) as x(class_name)
    where not exists(
      select 1 from public.prometeo_jobs j
      where j.project_id='WORK-RESERVOIR-01'
        and j.status in ('READY','LEASED')
        and coalesce((j.input_context->>'autofill')::boolean,false)=true
        and j.input_context->>'reservoir_class'=x.class_name
    )
    order by x.class_name
  loop
    v_missing:=v_missing+1;
    exit when v_created>=v_make;

    v_n:=nextval('public.prometeo_reservoir_job_seq');
    v_key:='AUTO-Q'||lpad(v_n::text,5,'0');

    case v_class
      when 'STATE_TRUTH' then
        v_title:='State truth audit '||v_n;
        v_objective:='Encontrar una discrepancia real entre jobs, sessions, events y visualización.';
        v_instruction:='Inspeccioná el estado actual de Prometeo y elegí UNA discrepancia verificable entre scheduler, liveness, eventos o /control/. Si existe una corrección pequeña, reversible y segura, aplicala y verificá. Si requiere trabajo mayor, describí exactamente el follow-up necesario. No inventes actividad.';
      when 'BOTTLENECK' then
        v_title:='Runtime bottleneck '||v_n;
        v_objective:='Reducir un cuello observable de la cohorte más reciente.';
        v_instruction:='Usá timing por sesión/cohorte y eventos recientes. Identificá la fase con mayor pérdida o demora útil (PREFLIGHT, ENTER, WAIT, WORK, PUBLISH). Proponé y, si es pequeño, aplicá UN cambio medible. Conservá baseline y evidencia.';
      when 'REGRESSION' then
        v_title:='Runtime regression '||v_n;
        v_objective:='Probar un invariante crítico del runtime.';
        v_instruction:='Elegí un invariante todavía relevante: idempotencia, lease fencing, WAIT→WORK, checkpoint, PARKED, revival, death classification o launch assignment. Ejecutá un smoke reproducible. Si falla, aplicá la reparación mínima o dejá un diagnóstico reproducible.';
      when 'OUTPUT_REVIEW' then
        v_title:='Recent output review '||v_n;
        v_objective:='Revisar calidad downstream de un output reciente.';
        v_instruction:='Tomá un output reciente no revisado conceptualmente, verificá si downstream puede usarlo sin inventar decisiones y detectá huecos, contradicciones o falta de evidencia. Producí correcciones concretas o evidencia de aceptación.';
      when 'RUNTIME_KNOWLEDGE' then
        v_title:='Runtime learning '||v_n;
        v_objective:='Extraer aprendizaje durable de sesiones, morgue o supervivencia.';
        v_instruction:='Compará evidencia reciente de éxito y fracaso. Proponé máximo 2 RuntimeRule candidates con trigger, acción, evidencia a favor/en contra, excepciones y criterio de promoción. No promociones por una sola observación.';
      when 'DEPENDENCY' then
        v_title:='Dependency unblock '||v_n;
        v_objective:='Encontrar trabajo bloqueado o secuencias que puedan avanzar.';
        v_instruction:='Inspeccioná proyectos y dependencias. Encontrá una dependencia innecesaria, proyecto terminado que siga abierto, job que pueda pasar a READY o síntesis que ya tenga insumos. Aplicá sólo transiciones justificadas por evidencia.';
      when 'BACKLOG' then
        v_title:='Backlog to execution '||v_n;
        v_objective:='Convertir una necesidad durable en trabajo ejecutable sin duplicar.';
        v_instruction:='Revisá backlog/documentación/Guide State y seleccioná un ítem pendiente real que todavía no esté implementado ni duplicado. Convertílo en una especificación ejecutable o en el cambio pequeño correspondiente, con verificación y provenance.';
      when 'SECURITY_TOOLING' then
        v_title:='Tool reliability '||v_n;
        v_objective:='Reducir fallos observables de herramientas/autoridad.';
        v_instruction:='Revisá bloqueos/rate limits/tool failures recientes. Elegí un patrón y separá evidencia de hipótesis. Proponé o aplicá una reducción de tool calls, backoff, authority wording o reason_code que sea compatible con seguridad.';
      when 'DOCS_RECONCILE' then
        v_title:='Docs reconcile '||v_n;
        v_objective:='Mantener documentación y runtime alineados.';
        v_instruction:='Compará una parte de la documentación operativa con backend/protocolo actual. Corregí una divergencia concreta o dejá evidencia de que sigue vigente. No reescribas documentos enteros sin necesidad.';
      else
        v_title:='Reservoir quality '||v_n;
        v_objective:='Asegurar que la reserva siga siendo trabajo útil y no busywork.';
        v_instruction:='Auditá una muestra de jobs/outputs del Work Reservoir. Detectá duplicación, bajo valor, colisiones o clases sobreusadas. Proponé y, si es seguro, aplicá un ajuste para aumentar utilidad por worker.';
    end case;

    perform public.prometeo_add_job(
      'WORK-RESERVOIR-01',v_key,v_title,v_objective,v_instruction,
      jsonb_build_object(
        'reservoir_class',v_class,
        'autofill',true,
        'reservoir_seq',v_n,
        'created_at',clock_timestamp(),
        'dedupe_mode','ONE_ACTIVE_AUTOFILL_PER_CLASS'
      ),
      80,0,600,450,1000,'[]'::jsonb
    );
    v_created:=v_created+1;
  end loop;

  return jsonb_build_object(
    'state','RESERVOIR_OK',
    'ready_before',v_ready,
    'created',v_created,
    'requested_create',v_make,
    'missing_classes_seen',v_missing,
    'target_ready',p_target_ready,
    'dedupe_mode','ONE_ACTIVE_AUTOFILL_PER_CLASS',
    'server_time',clock_timestamp()
  );
end;
$function$;
