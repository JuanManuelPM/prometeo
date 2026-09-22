-- Q005 / WORK-RESERVOIR-01
-- Read-only decision fixture for stale-result salvage.
-- A stale payload is never a canonical output by ingestion alone.
-- Expected: every row ok=true.

with cases(id,candidate_generation,current_generation,canonical_exists,base_sha,current_sha,job_status,expected) as (
  values
    ('empty_same_gen',1,1,false,null,null,'DONE','ELIGIBLE_EMPTY_REVIEW'),
    ('canonical_same_base',1,1,true,'aaa','aaa','DONE','RECONCILE_REQUIRED'),
    ('canonical_changed',1,1,true,'aaa','bbb','DONE','CONFLICT_CANONICAL_CHANGED'),
    ('generation_changed',1,2,false,null,null,'READY','CONFLICT_GENERATION'),
    ('active_job',1,1,false,null,null,'LEASED','CONFLICT_ACTIVE_LEASE')
),
classified as (
  select *,
    case
      when candidate_generation<>current_generation then 'CONFLICT_GENERATION'
      when job_status='LEASED' then 'CONFLICT_ACTIVE_LEASE'
      when canonical_exists and base_sha is distinct from current_sha then 'CONFLICT_CANONICAL_CHANGED'
      when canonical_exists then 'RECONCILE_REQUIRED'
      else 'ELIGIBLE_EMPTY_REVIEW'
    end as actual
  from cases
)
select id,actual,expected,(actual=expected) as ok,
       false as direct_canonical_write_on_ingest
from classified
order by id;
