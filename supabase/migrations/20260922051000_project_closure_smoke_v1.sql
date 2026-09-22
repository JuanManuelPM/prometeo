-- CORE-V1 · CLOSURE
-- Transactional smoke for the real finite-product state machine.
-- The fixture is rolled back entirely, including night-shift side effects.

create or replace function public.prometeo_project_closure_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_suffix text := substr(md5(clock_timestamp()::text || random()::text),1,10);
  v_project text := '__CLOSURE_SMOKE_PROJECT__'||v_suffix;
  v_product text := '__CLOSURE_SMOKE_PRODUCT__'||v_suffix;
  v_merge text := 'MERGE';
  v_verify text := 'VERIFY';
  v_gate text := 'GATE';
  v_phase_fill text;
  v_phase_contract text;
  v_phase_merge text;
  v_phase_verify text;
  v_phase_done text;
  v_project_done text;
  v_spawn_after_contract boolean;
  v_jobs_before_repeat integer;
  v_jobs_after_repeat integer;
  v_repeat_state text;
  v_rollback_marker boolean := false;
begin
  begin
    insert into public.prometeo_projects(
      project_id,title,objective,status,priority,
      min_parallelism,desired_parallelism,max_parallelism,
      allow_spawn,max_jobs,auto_close,work_plane,started_at
    ) values(
      v_project,'Closure smoke project','transactional fixture','RUNNING',1,
      0,1,1,true,20,true,'PRODUCTION',clock_timestamp()
    );

    insert into public.prometeo_products(
      product_id,project_id,title,objective,status,sequence_no,
      acceptance,started_at
    ) values(
      v_product,v_project,'Closure smoke product','exercise finite closure','FILL',999999,
      jsonb_build_object(
        'merge_job',v_merge,
        'verify_job',v_verify,
        'stop_after_done',true,
        'crossfill_required',false,
        'all_required_sheets_done',true
      ),
      clock_timestamp()
    );

    insert into public.prometeo_product_sheets(
      product_id,sheet_key,title,objective,artifact_scope,
      required,requires_crossfill,status,build_job_key,review_job_key
    )
    select
      v_product,
      'S'||lpad(g::text,2,'0'),
      'Smoke sheet '||g,
      'closure smoke',
      'fixture',
      true,false,
      case when g<=6 then 'DONE' else 'OPEN' end,
      'B'||g,
      'R'||g
    from generate_series(1,10) g;

    insert into public.prometeo_jobs(
      project_id,job_key,title,objective,instruction,status,priority,
      generation,lease_seconds,min_words,max_words
    ) values
      (v_project,v_gate,'Gate','fixture gate','fixture','READY',1,0,300,0,20),
      (v_project,v_merge,'Merge','fixture merge','fixture','BLOCKED',1,0,300,0,20),
      (v_project,v_verify,'Verify','fixture verify','fixture','BLOCKED',1,0,300,0,20);

    insert into public.prometeo_job_dependencies(
      project_id,job_key,depends_on_project_id,depends_on_job_key
    ) values
      (v_project,v_merge,v_project,v_gate),
      (v_project,v_verify,v_project,v_merge);

    perform public.prometeo_night_shift_tick();
    select status into v_phase_fill
    from public.prometeo_products where product_id=v_product;

    update public.prometeo_product_sheets
    set status='DONE'
    where product_id=v_product and sheet_key='S07';

    perform public.prometeo_night_shift_tick();
    select status into v_phase_contract
    from public.prometeo_products where product_id=v_product;
    select allow_spawn into v_spawn_after_contract
    from public.prometeo_projects where project_id=v_project;

    update public.prometeo_product_sheets
    set status='DONE'
    where product_id=v_product and status<>'DONE';
    update public.prometeo_jobs
    set status='DONE',completed_at=clock_timestamp()
    where project_id=v_project and job_key=v_gate;

    perform public.prometeo_night_shift_tick();
    select status into v_phase_merge
    from public.prometeo_products where product_id=v_product;

    update public.prometeo_jobs
    set status='DONE',completed_at=clock_timestamp()
    where project_id=v_project and job_key=v_merge;

    perform public.prometeo_night_shift_tick();
    select status into v_phase_verify
    from public.prometeo_products where product_id=v_product;

    update public.prometeo_jobs
    set status='DONE',completed_at=clock_timestamp()
    where project_id=v_project and job_key=v_verify;

    insert into public.prometeo_outputs(
      project_id,job_key,generation,worker_code,output_text,meta,
      word_count,char_count,elapsed_ms,rescued
    ) values(
      v_project,v_verify,0,'KSMOKE','acceptance pass',
      jsonb_build_object('acceptance_pass',true),
      2,15,1,false
    );

    perform public.prometeo_night_shift_tick();
    select status into v_phase_done
    from public.prometeo_products where product_id=v_product;
    select status into v_project_done
    from public.prometeo_projects where project_id=v_project;

    select count(*) into v_jobs_before_repeat
    from public.prometeo_jobs where project_id=v_project;

    perform public.prometeo_night_shift_tick();

    select status into v_repeat_state
    from public.prometeo_products where product_id=v_product;
    select count(*) into v_jobs_after_repeat
    from public.prometeo_jobs where project_id=v_project;

    if v_phase_fill <> 'FILL'
       or v_phase_contract <> 'CONTRACT'
       or v_spawn_after_contract is not false
       or v_phase_merge <> 'MERGE'
       or v_phase_verify <> 'VERIFY'
       or v_phase_done <> 'DONE'
       or v_project_done <> 'DONE'
       or v_repeat_state <> 'DONE'
       or v_jobs_before_repeat <> v_jobs_after_repeat
    then
      raise exception 'closure smoke assertion failed: %,%,%,%,%,%,%,%,%',
        v_phase_fill,v_phase_contract,v_spawn_after_contract,
        v_phase_merge,v_phase_verify,v_phase_done,v_project_done,
        v_jobs_before_repeat,v_jobs_after_repeat;
    end if;

    raise exception using
      errcode='P0001',
      message='__PROMETEO_CLOSURE_SMOKE_ROLLBACK__';

  exception
    when sqlstate 'P0001' then
      if sqlerrm <> '__PROMETEO_CLOSURE_SMOKE_ROLLBACK__' then
        raise;
      end if;
      v_rollback_marker := true;
  end;

  if not v_rollback_marker
     or exists(select 1 from public.prometeo_projects where project_id=v_project)
     or exists(select 1 from public.prometeo_products where product_id=v_product)
  then
    raise exception 'closure smoke rollback failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','PROJECT_CLOSURE_SMOKE_OK',
    'phases',jsonb_build_array(
      v_phase_fill,v_phase_contract,v_phase_merge,v_phase_verify,v_phase_done
    ),
    'contract_closed_spawn',not v_spawn_after_contract,
    'project_done',v_project_done='DONE',
    'repeat_done_state',v_repeat_state,
    'jobs_before_repeat',v_jobs_before_repeat,
    'jobs_after_repeat',v_jobs_after_repeat,
    'done_created_no_jobs',v_jobs_before_repeat=v_jobs_after_repeat,
    'fixture_rolled_back',true
  );
end;
$$;

select public.prometeo_project_closure_smoke_test();
