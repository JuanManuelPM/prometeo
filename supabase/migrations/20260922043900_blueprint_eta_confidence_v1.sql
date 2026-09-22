-- BACKLOG-147: objective evidence backing Blueprint ETA estimates.
-- No synthetic confidence score: expose sample and phase coverage directly.

create or replace view public.blueprint_eta_confidence as
select
  s.blueprint_id,
  sum(s.configured_jobs)::bigint as configured_jobs,
  sum(s.completed_samples)::bigint as evidence_samples,
  round(
    case when sum(s.configured_jobs)>0
      then 100.0*sum(s.completed_samples)::numeric/sum(s.configured_jobs)::numeric
      else 0::numeric end,
    1
  ) as sample_coverage_pct,
  count(*)::integer as configured_phases,
  count(*) filter(where s.completed_samples>0)::integer as observed_phases,
  round(
    100.0*(count(*) filter(where s.completed_samples>0))::numeric
      / nullif(count(*),0)::numeric,
    1
  ) as phase_coverage_pct,
  min(s.completed_samples)::bigint as weakest_phase_samples,
  max(s.completed_samples)::bigint as strongest_phase_samples,
  min(s.first_sample_at) filter(where s.first_sample_at is not null) as first_evidence_at,
  max(s.last_sample_at) filter(where s.last_sample_at is not null) as last_evidence_at,
  jsonb_agg(
    jsonb_build_object(
      'phase',s.phase,
      'phase_name',s.phase_name,
      'configured_jobs',s.configured_jobs,
      'completed_samples',s.completed_samples,
      'sample_coverage_pct',s.sample_coverage_pct,
      'median_elapsed_ms',s.median_elapsed_ms,
      'p90_elapsed_ms',s.p90_elapsed_ms,
      'first_sample_at',s.first_sample_at,
      'last_sample_at',s.last_sample_at
    )
    order by s.phase
  ) as phase_evidence
from public.blueprint_phase_duration_summary s
group by s.blueprint_id;

comment on view public.blueprint_eta_confidence is
'BACKLOG-147: objective evidence surface for ETA confidence. Shows sample/phase coverage and timing evidence without inventing a synthetic confidence score.';
