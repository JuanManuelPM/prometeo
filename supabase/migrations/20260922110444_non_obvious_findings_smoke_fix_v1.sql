
-- BACKLOG-219 smoke fixture correction: use the canonical bound skill_ref shape.

create or replace function public.forge_non_obvious_findings_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_project text := 'NON-OBVIOUS-FINDINGS-SMOKE';
  v_job text := 'SMOKE-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
  v_agent text := 'smoke-agent-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  v_lease text := gen_random_uuid()::text;
  v_bundle jsonb;
  v_bad_meta jsonb;
  v_good_meta jsonb;
  v_bad jsonb;
  v_good jsonb;
  v_output text := repeat('validated ',760);
  v_ops jsonb := jsonb_build_array(
    'inventory_repeated_work','cluster_duplicates','find_shared_engine','propose_deduplication'
  );
  v_skill_ref jsonb := jsonb_build_object(
    'skill_id','DEEP_DUPLICATION_HUNTER',
    'version_no',1,
    'binding_source','JOB',
    'binding_provenance','smoke://backlog-219'
  );
  v_good_findings jsonb;
begin
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;

  insert into public.prometeo_projects(
    project_id,title,objective,status,priority,
    min_parallelism,desired_parallelism,max_parallelism,
    allow_spawn,max_jobs,auto_close,work_plane
  ) values(
    v_project,'Non-obvious findings smoke',
    'Ephemeral project for BACKLOG-219 runtime enforcement.',
    'PAUSED',0,0,0,1,false,5,false,'CONTROL'
  );

  insert into public.prometeo_jobs(
    project_id,job_key,title,objective,instruction,input_context,status,
    priority,required_rank,lease_seconds,min_words,max_words,
    assigned_agent_id,assigned_worker_code,lease_token,
    lease_started_at,lease_expires_at
  ) values(
    v_project,v_job,'Non-obvious finding fixture',
    'Verify runtime finding quality gate.','Smoke fixture only.',
    jsonb_build_object('skill_ref',v_skill_ref),
    'LEASED',0,0,900,1,5000,
    v_agent,'SMOKE',v_lease,clock_timestamp(),clock_timestamp()+interval '10 minutes'
  );

  v_bundle := public.forge_skill_execution_bundle('DEEP_DUPLICATION_HUNTER',1);

  v_good_findings := jsonb_build_array(
    jsonb_build_object(
      'type','FINDING','ref','finding://one',
      'evidence_refs',jsonb_build_array('smoke://finding/one'),
      'novelty',jsonb_build_object(
        'basis','CROSS_SOURCE',
        'source_scan_refs',jsonb_build_array('smoke://source/a','smoke://source/b')
      ),
      'decision_impact',jsonb_build_object(
        'action','MERGE','decision_ref','decision://shared-engine',
        'before_ref','decision-state://duplicated',
        'after_ref','decision-state://shared',
        'evidence_refs',jsonb_build_array('smoke://decision/one')
      )
    ),
    jsonb_build_object(
      'type','FINDING','ref','finding://two',
      'evidence_refs',jsonb_build_array('smoke://finding/two'),
      'novelty',jsonb_build_object(
        'basis','DERIVED_CONSTRAINT',
        'source_scan_refs',jsonb_build_array('smoke://source/c')
      ),
      'decision_impact',jsonb_build_object(
        'action','REPRIORITIZE','decision_ref','decision://priority',
        'before_ref','decision-state://later',
        'after_ref','decision-state://now',
        'evidence_refs',jsonb_build_array('smoke://decision/two')
      )
    ),
    jsonb_build_object(
      'type','CAPABILITY','ref','capability://dedupe',
      'evidence_refs',jsonb_build_array('smoke://capability')
    )
  );

  v_bad_meta := jsonb_build_object(
    'deep_skill_execution',jsonb_build_object(
      'status','COMPLETE',
      'tool_calls_used',4,
      'operations_completed',v_ops,
      'outputs',jsonb_build_array(
        jsonb_build_object(
          'type','FINDING','ref','finding://one',
          'evidence_refs',jsonb_build_array('smoke://finding/one')
        ),
        v_good_findings->1,
        v_good_findings->2
      ),
      'evidence_refs',jsonb_build_array('smoke://execution')
    )
  );

  v_good_meta := jsonb_build_object(
    'deep_skill_execution',jsonb_build_object(
      'status','COMPLETE',
      'tool_calls_used',4,
      'operations_completed',v_ops,
      'outputs',v_good_findings,
      'evidence_refs',jsonb_build_array('smoke://execution')
    )
  );

  v_bad := public.forge_deep_skill_pre_publish(v_agent,v_lease,v_output,v_bad_meta,'[]'::jsonb);
  v_good := public.forge_deep_skill_pre_publish(v_agent,v_lease,v_output,v_good_meta,'[]'::jsonb);

  if v_bundle->'runtime_policies'->'non_obvious_findings'->>'schema'
       <> 'prometeo.non-obvious-finding-policy/v1'
     or v_bad->>'state' <> 'RETRY_SKILL_CONTRACT'
     or v_bad->>'reason' <> 'FINDING_NOVELTY_REQUIRED'
     or coalesce((v_good->>'ok')::boolean,false) is not true
     or v_good->'non_obvious_findings'->>'state' <> 'NON_OBVIOUS_FINDINGS_VALID'
  then
    raise exception 'BACKLOG-219 smoke failed: bundle %, bad %, good %',v_bundle,v_bad,v_good;
  end if;

  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;

  return jsonb_build_object(
    'ok',true,
    'state','NON_OBVIOUS_FINDINGS_SMOKE_OK',
    'policy_exposed_in_bundle','PASS',
    'missing_novelty_blocked','PASS',
    'decision_delta_required','PASS',
    'valid_findings_publishable','PASS',
    'fixture_cleaned',not exists(select 1 from public.prometeo_projects where project_id=v_project)
  );
exception when others then
  delete from public.prometeo_jobs where project_id=v_project;
  delete from public.prometeo_projects where project_id=v_project;
  return jsonb_build_object(
    'ok',false,'state','NON_OBVIOUS_FINDINGS_SMOKE_FAILED','error',sqlerrm
  );
end;
$function$;
