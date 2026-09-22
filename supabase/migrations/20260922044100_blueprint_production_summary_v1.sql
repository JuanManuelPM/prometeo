-- BACKLOG-151: aggregate Blueprint production in words per unit time.
-- Distinguishes wall-clock throughput (parallel production) from worker-time-normalized throughput.

create or replace view public.blueprint_production_summary as
with observed as (
  select
    o.blueprint_id,
    count(*)::bigint as completed_outputs,
    count(distinct o.worker_code)::integer as observed_workers,
    sum(o.word_count)::bigint as total_words,
    sum(o.elapsed_ms)::bigint as total_worker_elapsed_ms,
    min(o.published_at) as first_output_at,
    max(o.published_at) as last_output_at
  from public.blueprint_outputs o
  group by o.blueprint_id
)
select
  p.blueprint_id,
  p.completed_outputs,
  p.observed_workers,
  p.total_words,
  p.total_worker_elapsed_ms,
  p.first_output_at,
  p.last_output_at,
  round(extract(epoch from (p.last_output_at-p.first_output_at))::numeric,3) as observed_wall_seconds,
  round(
    case
      when extract(epoch from (p.last_output_at-p.first_output_at)) > 0
      then p.total_words::numeric
           / extract(epoch from (p.last_output_at-p.first_output_at))::numeric
           * 60
      else null
    end,
    1
  ) as wall_words_per_minute,
  round(
    case
      when p.total_worker_elapsed_ms > 0
      then p.total_words::numeric / (p.total_worker_elapsed_ms::numeric / 60000)
      else null
    end,
    1
  ) as worker_time_words_per_minute
from observed p;

comment on view public.blueprint_production_summary is
'BACKLOG-151: aggregate Blueprint production. wall_words_per_minute measures parallel run output over observed wall time; worker_time_words_per_minute normalizes by summed persisted worker elapsed_ms.';
