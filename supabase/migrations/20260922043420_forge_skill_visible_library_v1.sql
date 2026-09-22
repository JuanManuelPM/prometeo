-- BACKLOG-119: accepted Skill versions become visible in the permanent library.
-- This is projection-only: it does not grant promotion authority or change maturity.

create or replace view public.forge_skill_library_visible
with (security_invoker = false)
as
select
  s.skill_id,
  s.name,
  s.purpose,
  v.version_no,
  public.forge_skill_definition_hash(s.skill_id, v.version_no) as definition_hash,
  v.created_at as accepted_version_created_at,
  row_number() over (
    partition by s.skill_id
    order by v.version_no desc
  ) = 1 as is_latest_accepted
from public.forge_skills s
join public.forge_skill_versions v
  on v.skill_id = s.skill_id
where s.registry_status = 'ACTIVE'
  and v.maturity_state = 'ACCEPTED';

comment on view public.forge_skill_library_visible is
  'BACKLOG-119 permanent visible Skill library. Every ACTIVE+ACCEPTED version appears automatically; this view never promotes candidates.';

grant select on public.forge_skill_library_visible to anon, authenticated;
