-- AUTO-Q01150 · Work Reservoir publish-budget hint
-- Keep hard bounds 450..1000; add a visible target 500..850 and a cohort tag.

create or replace function public.prometeo_reservoir_publish_budget_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $fn$
begin
  if new.project_id='WORK-RESERVOIR-01'
     and lower(coalesce(new.input_context->>'autofill','false'))='true'
     and not coalesce(new.input_context,'{}'::jsonb) ? 'publish_budget_version'
  then
    new.instruction :=
      rtrim(coalesce(new.instruction,'')) ||
      E'\n\nPUBLISH CONTRACT · RESERVOIR V1. El output final debe quedar entre 450 y 1000 palabras; apuntá a 500-850 palabras antes de llamar PUBLISH. No rellenes: usá el margen para baseline, evidencia, cambio, verificación y límites.';

    new.input_context :=
      coalesce(new.input_context,'{}'::jsonb) ||
      jsonb_build_object(
        'publish_budget_version','RESERVOIR_V1_500_850',
        'publish_target_min_words',500,
        'publish_target_max_words',850
      );
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_prometeo_reservoir_publish_budget_v1 on public.prometeo_jobs;

create trigger trg_prometeo_reservoir_publish_budget_v1
before insert on public.prometeo_jobs
for each row
execute function public.prometeo_reservoir_publish_budget_v1();

create or replace function public.prometeo_reservoir_publish_budget_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $smoke$
declare
  v_key text := '__RESERVOIR_BUDGET_SMOKE__'||substr(md5(clock_timestamp()::text||random()::text),1,10);
  v_instruction text;
  v_context jsonb;
  v_rolled_back boolean := false;
begin
  begin
    perform public.prometeo_add_job(
      'WORK-RESERVOIR-01',
      v_key,
      'Reservoir budget smoke',
      'verify publish budget trigger',
      'fixture instruction',
      jsonb_build_object('autofill',true,'reservoir_class','SMOKE'),
      1,0,420,450,1000,'[]'::jsonb
    );

    select instruction,input_context
      into v_instruction,v_context
    from public.prometeo_jobs
    where project_id='WORK-RESERVOIR-01' and job_key=v_key;

    if v_instruction not ilike '%500-850 palabras%'
       or v_context->>'publish_budget_version' <> 'RESERVOIR_V1_500_850'
       or (v_context->>'publish_target_min_words')::integer <> 500
       or (v_context->>'publish_target_max_words')::integer <> 850
    then
      raise exception 'reservoir publish budget assertion failed';
    end if;

    raise exception using
      errcode='P0001',
      message='__PROMETEO_RESERVOIR_BUDGET_SMOKE_ROLLBACK__';

  exception
    when sqlstate 'P0001' then
      if sqlerrm <> '__PROMETEO_RESERVOIR_BUDGET_SMOKE_ROLLBACK__' then
        raise;
      end if;
      v_rolled_back := true;
  end;

  if not v_rolled_back
     or exists(
       select 1 from public.prometeo_jobs
       where project_id='WORK-RESERVOIR-01' and job_key=v_key
     )
  then
    raise exception 'reservoir publish budget rollback failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','RESERVOIR_PUBLISH_BUDGET_SMOKE_OK',
    'hard_bounds',jsonb_build_array(450,1000),
    'target_bounds',jsonb_build_array(500,850),
    'version','RESERVOIR_V1_500_850',
    'fixture_rolled_back',true
  );
end;
$smoke$;

select public.prometeo_reservoir_publish_budget_smoke_test();
