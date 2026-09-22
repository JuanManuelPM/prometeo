-- BACKLOG-143: learn observed duration by Blueprint phase.

create or replace view public.blueprint_phase_duration_summary
with (security_invoker=true)
as
with phase_catalog as (
  select
    j.blueprint_id,
    j.phase,
    max(j.phase_name) as phase_name,
    count(*)::bigint as configured_jobs,
    min(j.min_words)::integer as min_words,
    max(j.max_words)::integer as max_words
  from public.blueprint_jobs j
  group by j.blueprint_id,j.phase
),
observed as (
  select
    o.blueprint_id,
    o.phase,
    count(*)::bigint as completed_samples,
    sum(o.elapsed_ms)::bigint as total_elapsed_ms,
    round(avg(o.elapsed_ms)::numeric,1) as avg_elapsed_ms,
    round(percentile_cont(0.5) within group (order by o.elapsed_ms)::numeric,1) as median_elapsed_ms,
    round(percentile_cont(0.9) within group (order by o.elapsed_ms)::numeric,1) as p90_elapsed_ms,
    min(o.elapsed_ms)::bigint as min_elapsed_ms,
    max(o.elapsed_ms)::bigint as max_elapsed_ms,
    sum(o.word_count)::bigint as total_words,
    round(avg(o.word_count)::numeric,1) as avg_words,
    round(
      case when sum(o.word_count) > 0
        then (sum(o.elapsed_ms)::numeric / sum(o.word_count)::numeric) * 1000
        else null
      end,
      1
    ) as elapsed_ms_per_1000_words,
    min(o.published_at) as first_sample_at,
    max(o.published_at) as last_sample_at
  from public.blueprint_outputs o
  group by o.blueprint_id,o.phase
)
select
  p.blueprint_id,
  p.phase,
  p.phase_name,
  p.configured_jobs,
  p.min_words,
  p.max_words,
  coalesce(o.completed_samples,0)::bigint as completed_samples,
  round(
    case when p.configured_jobs > 0
      then 100.0 * coalesce(o.completed_samples,0)::numeric / p.configured_jobs::numeric
      else 0
    end,
    1
  ) as sample_coverage_pct,
  o.total_elapsed_ms,
  o.avg_elapsed_ms,
  o.median_elapsed_ms,
  o.p90_elapsed_ms,
  o.min_elapsed_ms,
  o.max_elapsed_ms,
  o.total_words,
  o.avg_words,
  o.elapsed_ms_per_1000_words,
  o.first_sample_at,
  o.last_sample_at
from phase_catalog p
left join observed o
  on o.blueprint_id=p.blueprint_id
 and o.phase=p.phase;

create or replace function public.blueprint_phase_duration_summary_smoke_test(
  p_blueprint_id text default 'FORGE-BLUEPRINT-84-01'
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_phase_count integer;
  v_summary_count integer;
  v_output_count integer;
  v_sample_count integer;
  v_bad_count integer;
  v_rows jsonb;
begin
  select count(distinct phase)
    into v_phase_count
  from public.blueprint_jobs
  where blueprint_id=p_blueprint_id;

  select count(*), coalesce(sum(completed_samples),0)::integer,
         count(*) filter (
           where completed_samples < 0
              or sample_coverage_pct < 0
              or sample_coverage_pct > 100
              or (completed_samples > 0 and (
                   avg_elapsed_ms is null
                   or median_elapsed_ms is null
                   or p90_elapsed_ms is null
                   or total_elapsed_ms is null
                 ))
         )
    into v_summary_count,v_sample_count,v_bad_count
  from public.blueprint_phase_duration_summary
  where blueprint_id=p_blueprint_id;

  select count(*)
    into v_output_count
  from public.blueprint_outputs
  where blueprint_id=p_blueprint_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.phase),'[]'::jsonb)
    into v_rows
  from (
    select phase,phase_name,completed_samples,sample_coverage_pct,
           avg_elapsed_ms,median_elapsed_ms,p90_elapsed_ms,
           elapsed_ms_per_1000_words
    from public.blueprint_phase_duration_summary
    where blueprint_id=p_blueprint_id
    order by phase
  ) x;

  if v_phase_count=0
     or v_summary_count <> v_phase_count
     or v_sample_count <> v_output_count
     or v_bad_count <> 0 then
    raise exception 'B143 phase duration summary smoke failed';
  end if;

  return jsonb_build_object(
    'ok',true,
    'state','BLUEPRINT_PHASE_DURATION_SUMMARY_SMOKE_OK',
    'blueprint_id',p_blueprint_id,
    'phase_count',v_phase_count,
    'output_samples',v_output_count,
    'rows',v_rows
  );
end;
$$;