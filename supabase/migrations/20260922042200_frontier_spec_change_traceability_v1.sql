-- BACKLOG-186: spec/origin -> technical change traceability.
-- Normalizes Productive Frontier provenance already stored in prometeo_jobs.input_context
-- and prometeo_outputs.meta without inventing missing links.

create or replace view public.prometeo_control_spec_change_trace as
select
  j.project_id,
  j.job_key,
  j.input_context->>'frontier_source_key' as source_key,
  j.input_context->>'source_ref' as source_ref,
  j.input_context->>'source_type' as source_type,
  j.input_context->>'source_title' as source_title,
  o.worker_code,
  o.published_at,
  o.meta->'frontier'->>'outcome' as outcome,
  nullif(o.meta->>'artifact','') as artifact_ref,
  nullif(o.meta->>'github_commit','') as github_commit,
  o.meta->'commit_shas' as commit_shas,
  o.meta->'commits' as commits,
  o.meta->'changed_refs' as changed_refs,
  nullif(o.meta->>'migration','') as migration_ref,
  nullif(o.meta->>'implementation','') as implementation_ref,
  case
    when nullif(j.input_context->>'frontier_source_key','') is null
      or nullif(j.input_context->>'source_ref','') is null
      then 'MISSING_SOURCE'
    when coalesce(o.meta->'frontier'->>'outcome','') = 'IMPLEMENTED'
      and nullif(o.meta->>'artifact','') is null
      and nullif(o.meta->>'github_commit','') is null
      and o.meta->'commit_shas' is null
      and o.meta->'commits' is null
      and o.meta->'changed_refs' is null
      and nullif(o.meta->>'migration','') is null
      and nullif(o.meta->>'implementation','') is null
      then 'MISSING_CHANGE_REF'
    else 'TRACEABLE'
  end as trace_status,
  o.meta as publish_meta
from public.prometeo_jobs j
join public.prometeo_outputs o
  on o.project_id=j.project_id and o.job_key=j.job_key
where j.input_context ? 'frontier_source_key'
   or j.input_context ? 'source_ref';

comment on view public.prometeo_control_spec_change_trace is
'BACKLOG-186: observable origin-to-change trace. IMPLEMENTED rows without any artifact/commit/migration/change reference are flagged MISSING_CHANGE_REF; missing provenance is never inferred.';
