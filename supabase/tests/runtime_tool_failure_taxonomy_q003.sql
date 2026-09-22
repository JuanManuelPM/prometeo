-- Q003 / WORK-RESERVOIR-01
-- Durable classification fixture for observable tool/control-plane failures.
-- Expected: all rows ok=true.

with cases(id,control_state,http_status,provider_code,error_origin,error_text,expected) as (
  values
    ('rate',null,429,null,'connector','HTTP 429 Too Many Requests','TOOL_RATE_LIMITED'),
    ('security',null,null,null,'harness','OpenAI blocked tool call because request safety state could not be determined','TOOL_SECURITY_BLOCKED'),
    ('connector',null,null,'42601','connector','Supabase HttpException: SQL syntax error','TOOL_CONNECTOR_ERROR'),
    ('stale','STALE_LEASE',null,null,'control_plane','LEASE_NOT_CURRENT','CONTROL_STALE_LEASE'),
    ('unknown',null,null,null,null,'operation failed','TOOL_UNKNOWN')
),
classified as (
  select *,
    case
      when control_state='STALE_LEASE' then 'CONTROL_STALE_LEASE'
      when lower(coalesce(error_text,'')) like '%blocked%security%'
        or lower(coalesce(error_text,'')) like '%safety state%' then 'TOOL_SECURITY_BLOCKED'
      when http_status=429
        or upper(coalesce(provider_code,'')) in ('RESOURCE_EXHAUSTED','RATE_LIMITED') then 'TOOL_RATE_LIMITED'
      when error_origin='connector' then 'TOOL_CONNECTOR_ERROR'
      else 'TOOL_UNKNOWN'
    end as actual
  from cases
)
select id,actual,expected,(actual=expected) as ok
from classified
order by id;
