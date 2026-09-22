-- CORE-V1 · CLOSURE REVIEW
-- Independent transactional smoke for the cross-fill barrier.
-- Proves that missing second-worker evidence keeps the product in CONTRACT,
-- and that satisfying the cross-fill count allows MERGE without touching live CORE-V1.

create or replace function public.prometeo_project_closure_crossfill_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_suffix text := substr(md5(clock_timestamp()::text || random()::text),1,10);
  v_project text := '__CLOSURE_XFILL_SMOKE_PROJECT__'||v_suffix;
  v_product text := '__CLOSURE_XFILL_SMOKE_PRODUCT__'||v_suffix;
  v_merge text := 'MERGE';
  v_phase_contract text;
  v_phase_merge text;
  v_merge_before text;
  v_merge_after text;
  v_spawn_after_contract boolean;
  v_cross_job_created boolean;
  v_rollback_marker boolean := false;
begin
  begin
    insert into public.prometeo_projects(
      project_id,title,objective,status,priority,
      min_parallelism,desired_parallelism,max_parallelism,
      allow_spawn,max_jobs,auto_close,work_plane,started_at
    ) values(
      v_project,'Closure cross-fill smoke','transactional fixture','RUNNING',1,
      0,1,1,true,20,true,'PRODUCTION',clock_timestamp()
    );

    insert into public.prometeo_products(
      product_id,project_id,title,objective,status,sequence_no,
      acceptance,started_at
    ) values(
      v_product,v_project,'Closure cross-fill smoke product',
      'prove cross-fill blocks merge until second-worker evidence exists',
      'CONTRACT',999998,
      jsonb_build_object(
        'merge_job',v_merge,
        'verify_job','VERIFY',
        'stop_after_done',true,
        'crossfill_required',true,
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
      'Cross-fill smoke sheet '||g,
      'closure cross-fill smoke',
      'fixture',
      true,
      (g=1),
      'DONE',
      'B'||g,
      'R'||g
    from generate_series(1,10) g;

    update public.prometeo_product_sheets
    set distinct_workers=1
    where product_id=v_product and sheet_key='S01';

    insert into public.prometeo_jobs(
      project_id,job_key,title,objective,instruction,status,priority,
      generation,lease_seconds,min_words,max_words
    ) values(
      v_project,v_merge,'Merge','fixture merge','fixture','BLOCKED',1,0,300,0,20
    );

    perform public.prometeo_night_shift_tick();

    select status into v_phase_contract
    from public.prometeo_products where product_id=v_product;
    select status into v_merge_before
    from public.prometeo_jobs where project_id=v_project and job_key=v_merge;
    select allow_spawn into v_spawn_after_contract
    from public.prometeo_projects where project_id=v_project;
    select exists(
      select 1 from public.prometeo_jobs
      where project_id=v_project
        and job_key=v_product||'-S01-CROSSFILL'
    ) into v_cross_job_created;

    if v_phase_contract <> 'CONTRACT'
       or v_merge_before <> 'BLOCKED'
       or v_spawn_after_contract is not false
       or not v_cross_job_created
    then
      raise exception 'cross-fill gate assertion failed before second worker: %,%,%,%',
        v_phase_contract,v_merge_before,v_spawn_after_contract,v_cross_job_created;
    end if;

    update public.prometeo_product_sheets
    set distinct_workers=2
    where product_id=v_product and sheet_key='S01';

    perform public.prometeo_night_shift_tick();

    select status into v_phase_merge
    from public.prometeo_products where product_id=v_product;
    select status into v_merge_after
    from public.prometeo_jobs where project_id=v_project and job_key=v_merge;

    if v_phase_merge <> 'MERGE' or v_merge_after <> 'READY' then
      raise exception 'cross-fill gate assertion failed after second worker: %,%',
        v_phase_merge,v_merge_after;
    end if;

    raise exception using
      errcode='P0001',
      message='__PROMETEO_CLOSURE_XFILL_SMOKE_ROLLBACK__';

  exception
    when sqlstate 'P0001' then
      if sqlerrm <> '__PROMETEO_CLOSURE_XFILL_SMOKE_ROLLBACK__' then
        raise;
      end if;
      v_rollback_marker := true;
  end;

  if not v_rollback_marker
     or exists(select 1 from public.prometeo_projects where project_id=v_project)
     or exists(select 1 from public.prometeo_products where product_id=v_product)
  then
    raise exception 'closure cross-fill smoke rollback failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','PROJECT_CLOSURE_CROSSFILL_SMOKE_OK',
    'before_second_worker',jsonb_build_object(
      'product_status',v_phase_contract,
      'merge_status',v_merge_before,
      'allow_spawn',v_spawn_after_contract,
      'crossfill_job_created',v_cross_job_created
    ),
    'after_second_worker',jsonb_build_object(
      'product_status',v_phase_merge,
      'merge_status',v_merge_after
    ),
    'fixture_rolled_back',true
  );
end;
$$;

select public.prometeo_project_closure_crossfill_smoke_test();
