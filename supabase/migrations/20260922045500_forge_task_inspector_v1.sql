-- BACKLOG-125: durable task inspector for Cognitive Forge.
-- Exposes task context without inferring undocumented cognitive-object relations.

create or replace function public.forge_task_inspect(
  p_goal_id text,
  p_task_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_goal public.forge_goals%rowtype;
  v_task public.forge_tasks%rowtype;
  v_card public.forge_cards%rowtype;
  v_inputs jsonb;
  v_outputs jsonb;
  v_plumes jsonb;
  v_tools jsonb;
begin
  select * into v_goal from public.forge_goals where goal_id=p_goal_id;
  if not found then
    return jsonb_build_object('ok',false,'state','GOAL_NOT_FOUND','goal_id',p_goal_id,'task_key',p_task_key);
  end if;

  select * into v_task from public.forge_tasks where goal_id=p_goal_id and task_key=p_task_key;
  if not found then
    return jsonb_build_object('ok',false,'state','TASK_NOT_FOUND','goal_id',p_goal_id,'task_key',p_task_key);
  end if;

  select * into v_card from public.forge_cards where card_id=v_task.card_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'task_key',dep.task_key,'title',dep.title,'card_id',dep.card_id,'status',dep.status,
      'outputs',coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'generation',o.generation,'worker_code',o.worker_code,'output',o.output_text,
            'word_count',o.word_count,'rescued',o.rescued,'elapsed_ms',o.elapsed_ms,'published_at',o.published_at
          ) order by o.generation,o.published_at
        )
        from public.forge_outputs o
        where o.goal_id=dep.goal_id and o.task_key=dep.task_key
      ),'[]'::jsonb)
    ) order by dep.sort_no,dep.task_key
  ),'[]'::jsonb)
  into v_inputs
  from public.forge_task_dependencies d
  join public.forge_tasks dep
    on dep.goal_id=d.goal_id and dep.task_key=d.depends_on_task_key
  where d.goal_id=p_goal_id and d.task_key=p_task_key;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'generation',o.generation,'worker_code',o.worker_code,'output',o.output_text,
      'word_count',o.word_count,'char_count',o.char_count,'rescued',o.rescued,
      'elapsed_ms',o.elapsed_ms,'published_at',o.published_at
    ) order by o.generation,o.published_at
  ),'[]'::jsonb)
  into v_outputs
  from public.forge_outputs o
  where o.goal_id=p_goal_id and o.task_key=p_task_key;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'plume_id',p.plume_id,'name',p.name,'trigger_text',p.trigger_text,
      'main_question',p.main_question,'followup_questions',p.followup_questions,
      'corrects',p.corrects,'when_not_to_use',p.when_not_to_use,
      'status',p.status,'source_goal_id',p.source_goal_id
    ) order by p.plume_id
  ),'[]'::jsonb)
  into v_plumes
  from public.forge_plumes p
  where p.source_goal_id=p_goal_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'tool_id',t.tool_id,'name',t.name,'problem',t.problem,'prerequisites',t.prerequisites,
      'procedure_text',t.procedure_text,'verification_text',t.verification_text,
      'known_failures',t.known_failures,'status',t.status,'source_goal_id',t.source_goal_id
    ) order by t.tool_id
  ),'[]'::jsonb)
  into v_tools
  from public.forge_tools t
  where t.source_goal_id=p_goal_id;

  return jsonb_build_object(
    'ok',true,'state','TASK_INSPECTION','schema','prometeo.forge-task-inspection/v1',
    'association_policy',jsonb_build_object(
      'plumes','EXACT_SOURCE_GOAL_ONLY','tools','EXACT_SOURCE_GOAL_ONLY','inference','DISALLOWED'
    ),
    'goal',jsonb_build_object(
      'goal_id',v_goal.goal_id,'title',v_goal.title,'objective',v_goal.objective,
      'constraints',v_goal.constraints,'status',v_goal.status
    ),
    'task',jsonb_build_object(
      'task_key',v_task.task_key,'title',v_task.title,'objective',v_task.objective,
      'status',v_task.status,'card_id',v_task.card_id,'input_context',v_task.input_context,
      'output_type',v_task.output_type,'generation',v_task.generation,
      'parent_task_key',v_task.parent_task_key,'depth',v_task.depth
    ),
    'card',case when v_card.card_id is null then null else jsonb_build_object(
      'card_id',v_card.card_id,'family',v_card.family,'name',v_card.name,'purpose',v_card.purpose,
      'role_text',v_card.role_text,'instruction',v_card.instruction,
      'required_questions',v_card.required_questions,'output_type',v_card.output_type,
      'may_spawn_children',v_card.may_spawn_children
    ) end,
    'plumes',v_plumes,'tools',v_tools,'inputs',v_inputs,'outputs',v_outputs
  );
end;
$function$;

comment on function public.forge_task_inspect(text,text) is
  'BACKLOG-125: inspect one Forge task with Goal, Card, exact-source Goal Plumes/Tools, dependency inputs, and task outputs. Never infers provenance from textual similarity.';

create or replace function public.forge_task_inspect_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_goal_id text;
  v_task_key text;
  v_result jsonb;
  v_missing jsonb;
begin
  select t.goal_id,t.task_key
  into v_goal_id,v_task_key
  from public.forge_tasks t
  join public.forge_goals g on g.goal_id=t.goal_id
  order by case when t.status='DONE' then 0 else 1 end,t.created_at,t.task_key
  limit 1;

  if v_goal_id is null then
    return jsonb_build_object('ok',false,'state','NO_TASK_FIXTURE');
  end if;

  v_result:=public.forge_task_inspect(v_goal_id,v_task_key);
  v_missing:=public.forge_task_inspect(v_goal_id,'__MISSING_TASK__');

  if coalesce((v_result->>'ok')::boolean,false) is not true
     or v_result->>'state'<>'TASK_INSPECTION'
     or v_result->>'schema'<>'prometeo.forge-task-inspection/v1'
     or jsonb_typeof(v_result->'goal')<>'object'
     or jsonb_typeof(v_result->'task')<>'object'
     or not (v_result ? 'card')
     or jsonb_typeof(v_result->'plumes')<>'array'
     or jsonb_typeof(v_result->'tools')<>'array'
     or jsonb_typeof(v_result->'inputs')<>'array'
     or jsonb_typeof(v_result->'outputs')<>'array'
     or v_result#>>'{association_policy,inference}'<>'DISALLOWED'
     or v_missing->>'state'<>'TASK_NOT_FOUND'
  then
    return jsonb_build_object(
      'ok',false,'state','TASK_INSPECTOR_SMOKE_FAILED',
      'goal_id',v_goal_id,'task_key',v_task_key,'result',v_result,'missing_case',v_missing
    );
  end if;

  return jsonb_build_object(
    'ok',true,'state','TASK_INSPECTOR_SMOKE_OK',
    'goal_id',v_goal_id,'task_key',v_task_key,
    'plumes',jsonb_array_length(v_result->'plumes'),
    'tools',jsonb_array_length(v_result->'tools'),
    'inputs',jsonb_array_length(v_result->'inputs'),
    'outputs',jsonb_array_length(v_result->'outputs'),
    'association_inference','DISALLOWED'
  );
end;
$function$;
