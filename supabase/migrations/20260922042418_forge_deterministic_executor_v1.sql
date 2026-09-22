-- BACKLOG-200: deterministic execution primitive for repeatable calculations/procedures.

create or replace function public.forge_deterministic_compute_v1(
  p_operation text,
  p_args jsonb
) returns jsonb
language plpgsql
immutable
set search_path to 'public','pg_temp'
as $$
declare
  v_op text := upper(coalesce(nullif(btrim(p_operation),''),''));
  v_args jsonb := coalesce(p_args,'{}'::jsonb);
  v_a numeric;
  v_b numeric;
  v_result numeric;
  v_scale integer;
  v_values jsonb;
  v_count integer;
  v_bad integer;
  v_steps jsonb;
  v_step jsonb;
  v_step_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_idx integer := 0;
  v_step_id text;
  v_hash text;
begin
  if jsonb_typeof(v_args) <> 'object' then
    return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','ARGS_NOT_OBJECT');
  end if;

  v_hash := 'md5:' || md5(jsonb_build_object('operation',v_op,'args',v_args)::text);

  if v_op = 'PERCENTAGE' then
    if jsonb_typeof(v_args->'numerator') <> 'number'
       or jsonb_typeof(v_args->'denominator') <> 'number' then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','NUMERATOR_DENOMINATOR_REQUIRED','operation',v_op);
    end if;
    v_a := (v_args->>'numerator')::numeric;
    v_b := (v_args->>'denominator')::numeric;
    if v_b = 0 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','DIVISION_BY_ZERO','operation',v_op);
    end if;
    v_result := (v_a / v_b) * 100;
    return jsonb_build_object(
      'ok',true,'state','DETERMINISTIC_RESULT','operation',v_op,
      'result',v_result,'unit','percent','input_hash',v_hash,
      'engine','SQL_WHITELIST_V1','generative_reasoning_used',false,'authority_granted',false
    );

  elsif v_op = 'MEDIAN' then
    v_values := v_args->'values';
    if jsonb_typeof(v_values) <> 'array' or jsonb_array_length(v_values)=0 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','NONEMPTY_NUMERIC_ARRAY_REQUIRED','operation',v_op);
    end if;
    select count(*) into v_bad
    from jsonb_array_elements(v_values) e
    where jsonb_typeof(e) <> 'number';
    if v_bad > 0 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','NON_NUMERIC_ARRAY_MEMBER','operation',v_op);
    end if;
    select percentile_cont(0.5) within group(order by (e #>> '{}')::numeric)
      into v_result
    from jsonb_array_elements(v_values) e;
    return jsonb_build_object(
      'ok',true,'state','DETERMINISTIC_RESULT','operation',v_op,
      'result',v_result,'input_hash',v_hash,'engine','SQL_WHITELIST_V1',
      'generative_reasoning_used',false,'authority_granted',false
    );

  elsif v_op = 'RATE_PER_SECOND' then
    if jsonb_typeof(v_args->'completed') <> 'number'
       or jsonb_typeof(v_args->'elapsed_seconds') <> 'number' then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','COMPLETED_ELAPSED_REQUIRED','operation',v_op);
    end if;
    v_a := (v_args->>'completed')::numeric;
    v_b := (v_args->>'elapsed_seconds')::numeric;
    if v_b <= 0 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','ELAPSED_MUST_BE_POSITIVE','operation',v_op);
    end if;
    v_result := v_a / v_b;
    return jsonb_build_object(
      'ok',true,'state','DETERMINISTIC_RESULT','operation',v_op,
      'result',v_result,'unit','per_second','input_hash',v_hash,'engine','SQL_WHITELIST_V1',
      'generative_reasoning_used',false,'authority_granted',false
    );

  elsif v_op = 'ETA_SECONDS' then
    if jsonb_typeof(v_args->'remaining_units') <> 'number'
       or jsonb_typeof(v_args->'rate_per_second') <> 'number' then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','REMAINING_RATE_REQUIRED','operation',v_op);
    end if;
    v_a := (v_args->>'remaining_units')::numeric;
    v_b := (v_args->>'rate_per_second')::numeric;
    if v_a < 0 or v_b <= 0 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','INVALID_REMAINING_OR_RATE','operation',v_op);
    end if;
    v_result := ceil(v_a / v_b);
    return jsonb_build_object(
      'ok',true,'state','DETERMINISTIC_RESULT','operation',v_op,
      'result',v_result,'unit','seconds','input_hash',v_hash,'engine','SQL_WHITELIST_V1',
      'generative_reasoning_used',false,'authority_granted',false
    );

  elsif v_op = 'ROUND' then
    if jsonb_typeof(v_args->'value') <> 'number' then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','VALUE_REQUIRED','operation',v_op);
    end if;
    v_scale := coalesce((v_args->>'scale')::integer,0);
    if v_scale < 0 or v_scale > 12 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','SCALE_OUT_OF_RANGE','operation',v_op);
    end if;
    v_result := round((v_args->>'value')::numeric,v_scale);
    return jsonb_build_object(
      'ok',true,'state','DETERMINISTIC_RESULT','operation',v_op,
      'result',v_result,'input_hash',v_hash,'engine','SQL_WHITELIST_V1',
      'generative_reasoning_used',false,'authority_granted',false
    );

  elsif v_op = 'BATCH' then
    v_steps := v_args->'steps';
    if jsonb_typeof(v_steps) <> 'array' then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','STEPS_ARRAY_REQUIRED','operation',v_op);
    end if;
    v_count := jsonb_array_length(v_steps);
    if v_count < 1 or v_count > 64 then
      return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','STEP_COUNT_OUT_OF_RANGE','operation',v_op);
    end if;

    for v_step in select value from jsonb_array_elements(v_steps)
    loop
      v_idx := v_idx + 1;
      if jsonb_typeof(v_step) <> 'object'
         or nullif(btrim(v_step->>'operation'),'') is null
         or jsonb_typeof(coalesce(v_step->'args','{}'::jsonb)) <> 'object' then
        return jsonb_build_object('ok',false,'state','DETERMINISTIC_BATCH_ERROR','reason','INVALID_STEP','step_index',v_idx);
      end if;
      if upper(v_step->>'operation') = 'BATCH' then
        return jsonb_build_object('ok',false,'state','DETERMINISTIC_BATCH_ERROR','reason','NESTED_BATCH_FORBIDDEN','step_index',v_idx);
      end if;
      v_step_result := public.forge_deterministic_compute_v1(v_step->>'operation',coalesce(v_step->'args','{}'::jsonb));
      v_step_id := coalesce(nullif(btrim(v_step->>'id'),''),v_idx::text);
      if coalesce((v_step_result->>'ok')::boolean,false) = false then
        return jsonb_build_object(
          'ok',false,'state','DETERMINISTIC_BATCH_ERROR','reason','STEP_FAILED',
          'step_index',v_idx,'step_id',v_step_id,'step_result',v_step_result
        );
      end if;
      v_results := v_results || jsonb_build_array(jsonb_build_object('id',v_step_id,'result',v_step_result));
    end loop;

    return jsonb_build_object(
      'ok',true,'state','DETERMINISTIC_BATCH_RESULT','operation',v_op,
      'results',v_results,'step_count',v_count,'input_hash',v_hash,'engine','SQL_WHITELIST_V1',
      'generative_reasoning_used',false,'authority_granted',false
    );
  end if;

  return jsonb_build_object(
    'ok',false,'state','DETERMINISTIC_OPERATION_UNSUPPORTED','operation',v_op,
    'supported',jsonb_build_array('PERCENTAGE','MEDIAN','RATE_PER_SECOND','ETA_SECONDS','ROUND','BATCH')
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok',false,'state','DETERMINISTIC_INPUT_ERROR','reason','INVALID_NUMERIC_INPUT','operation',v_op);
end;
$$;

create or replace function public.forge_deterministic_execution_smoke_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_pct jsonb;
  v_pct_repeat jsonb;
  v_median jsonb;
  v_rate jsonb;
  v_eta jsonb;
  v_round jsonb;
  v_batch jsonb;
  v_zero jsonb;
  v_unsupported jsonb;
begin
  v_pct := public.forge_deterministic_compute_v1('percentage','{"numerator":25,"denominator":40}'::jsonb);
  v_pct_repeat := public.forge_deterministic_compute_v1('percentage','{"denominator":40,"numerator":25}'::jsonb);
  v_median := public.forge_deterministic_compute_v1('median','{"values":[9,1,5,3]}'::jsonb);
  v_rate := public.forge_deterministic_compute_v1('rate_per_second','{"completed":120,"elapsed_seconds":30}'::jsonb);
  v_eta := public.forge_deterministic_compute_v1('eta_seconds','{"remaining_units":90,"rate_per_second":4}'::jsonb);
  v_round := public.forge_deterministic_compute_v1('round','{"value":3.14159,"scale":2}'::jsonb);
  v_batch := public.forge_deterministic_compute_v1('batch','{"steps":[{"id":"pct","operation":"percentage","args":{"numerator":1,"denominator":4}},{"id":"eta","operation":"eta_seconds","args":{"remaining_units":9,"rate_per_second":2}}]}'::jsonb);
  v_zero := public.forge_deterministic_compute_v1('percentage','{"numerator":1,"denominator":0}'::jsonb);
  v_unsupported := public.forge_deterministic_compute_v1('invent','{}'::jsonb);

  if v_pct->>'state' <> 'DETERMINISTIC_RESULT'
     or (v_pct->>'result')::numeric <> 62.5
     or v_pct->>'result' <> v_pct_repeat->>'result'
     or v_pct->>'input_hash' <> v_pct_repeat->>'input_hash'
     or (v_median->>'result')::numeric <> 4
     or (v_rate->>'result')::numeric <> 4
     or (v_eta->>'result')::numeric <> 23
     or (v_round->>'result')::numeric <> 3.14
     or v_batch->>'state' <> 'DETERMINISTIC_BATCH_RESULT'
     or (v_batch->>'step_count')::integer <> 2
     or v_zero->>'reason' <> 'DIVISION_BY_ZERO'
     or v_unsupported->>'state' <> 'DETERMINISTIC_OPERATION_UNSUPPORTED'
     or v_pct->>'generative_reasoning_used' <> 'false'
     or v_pct->>'authority_granted' <> 'false'
  then
    raise exception 'B200 deterministic execution smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,'state','DETERMINISTIC_EXECUTION_SMOKE_OK',
    'percentage','PASS','median','PASS','rate','PASS','eta','PASS','round','PASS',
    'batch','PASS','stable_repeat','PASS','explicit_errors','PASS',
    'generative_reasoning_used',false,'authority_granted',false
  );
end;
$$;