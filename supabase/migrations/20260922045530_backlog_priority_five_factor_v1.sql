-- BACKLOG-239 · auditable five-factor backlog prioritization.
-- Scores are explicit evidence-bearing assessments; missing data stays UNSCORED.

create table if not exists public.prometeo_backlog_priority_assessments (
  source_key text primary key
    references public.prometeo_backlog_objects(source_key) on update cascade on delete cascade,
  value_score smallint not null check (value_score between 0 and 5),
  dependency_score smallint not null check (dependency_score between 0 and 5),
  cost_score smallint not null check (cost_score between 0 and 5),
  risk_score smallint not null check (risk_score between 0 and 5),
  unlock_score smallint not null check (unlock_score between 0 and 5),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  rationale text not null,
  evidence_refs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence_refs)='array'),
  assessed_by text not null,
  assessed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.prometeo_backlog_priority_assessments is
'BACKLOG-239 explicit evidence-bearing scores. value/dependency/unlock are benefits; cost/risk are penalties converted to inverse benefit in the ranked view. 0..5 only; no score is inferred from title text.';

alter table public.prometeo_backlog_priority_assessments enable row level security;
drop policy if exists "read backlog priority assessments" on public.prometeo_backlog_priority_assessments;
create policy "read backlog priority assessments"
on public.prometeo_backlog_priority_assessments
for select to anon, authenticated using (true);

grant select on public.prometeo_backlog_priority_assessments to anon, authenticated;

create or replace function public.prometeo_backlog_priority_assess(
  p_source_key text,
  p_value smallint,
  p_dependency smallint,
  p_cost smallint,
  p_risk smallint,
  p_unlock smallint,
  p_confidence numeric,
  p_rationale text,
  p_evidence_refs jsonb,
  p_assessed_by text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v public.prometeo_backlog_priority_assessments%rowtype;
begin
  if not exists(
    select 1 from public.prometeo_backlog_objects b where b.source_key=p_source_key
  ) then
    raise exception 'UNKNOWN_BACKLOG_SOURCE:%',p_source_key;
  end if;

  if p_value not between 0 and 5
     or p_dependency not between 0 and 5
     or p_cost not between 0 and 5
     or p_risk not between 0 and 5
     or p_unlock not between 0 and 5 then
    raise exception 'SCORE_OUT_OF_RANGE';
  end if;

  if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
    raise exception 'CONFIDENCE_OUT_OF_RANGE';
  end if;

  if nullif(btrim(p_rationale),'') is null then
    raise exception 'RATIONALE_REQUIRED';
  end if;

  if nullif(btrim(p_assessed_by),'') is null then
    raise exception 'ASSESSED_BY_REQUIRED';
  end if;

  if p_evidence_refs is null or jsonb_typeof(p_evidence_refs)<>'array' then
    raise exception 'EVIDENCE_REFS_MUST_BE_ARRAY';
  end if;

  insert into public.prometeo_backlog_priority_assessments(
    source_key,value_score,dependency_score,cost_score,risk_score,unlock_score,
    confidence,rationale,evidence_refs,assessed_by,assessed_at,updated_at
  )
  values(
    p_source_key,p_value,p_dependency,p_cost,p_risk,p_unlock,
    p_confidence,p_rationale,p_evidence_refs,p_assessed_by,now(),now()
  )
  on conflict(source_key) do update set
    value_score=excluded.value_score,
    dependency_score=excluded.dependency_score,
    cost_score=excluded.cost_score,
    risk_score=excluded.risk_score,
    unlock_score=excluded.unlock_score,
    confidence=excluded.confidence,
    rationale=excluded.rationale,
    evidence_refs=excluded.evidence_refs,
    assessed_by=excluded.assessed_by,
    assessed_at=excluded.assessed_at,
    updated_at=now()
  returning * into v;

  return jsonb_build_object(
    'state','BACKLOG_PRIORITY_ASSESSED',
    'source_key',v.source_key,
    'assessed_by',v.assessed_by,
    'updated_at',v.updated_at
  );
end;
$function$;

revoke all on function public.prometeo_backlog_priority_assess(
  text,smallint,smallint,smallint,smallint,smallint,numeric,text,jsonb,text
) from public, anon;
grant execute on function public.prometeo_backlog_priority_assess(
  text,smallint,smallint,smallint,smallint,smallint,numeric,text,jsonb,text
) to authenticated, service_role;

create or replace view public.prometeo_backlog_priority_ranked
with (security_invoker=true)
as
with scored as (
  select
    b.backlog_id,b.source_key,b.source_ref,b.title,b.summary,b.state,b.is_terminal,
    b.job_key,b.frontier_state,
    f.priority as frontier_priority,
    a.value_score,a.dependency_score,a.cost_score,a.risk_score,a.unlock_score,
    a.confidence,a.rationale,a.evidence_refs,a.assessed_by,a.updated_at as assessed_updated_at,
    case when a.source_key is null then null::numeric else
      round((
        100.0 * (
          0.30*a.value_score
          + 0.25*a.dependency_score
          + 0.25*a.unlock_score
          + 0.10*(5-a.cost_score)
          + 0.10*(5-a.risk_score)
        ) / 5.0
      ) * a.confidence,1)
    end as priority_score
  from public.prometeo_backlog_objects_live b
  left join public.prometeo_backlog_priority_assessments a on a.source_key=b.source_key
  left join public.prometeo_frontier_sources f on f.source_key=b.source_key
), ranked as (
  select
    s.*,
    case
      when s.is_terminal then 'TERMINAL'
      when s.priority_score is null then 'UNSCORED'
      when s.priority_score >= 80 then 'P0'
      when s.priority_score >= 65 then 'P1'
      when s.priority_score >= 50 then 'P2'
      else 'P3'
    end as priority_band,
    case
      when not s.is_terminal and s.priority_score is not null
      then dense_rank() over(
        partition by s.is_terminal,(s.priority_score is not null)
        order by s.priority_score desc,s.frontier_priority desc nulls last,s.backlog_id
      )
      else null::bigint
    end as assessed_rank
  from scored s
)
select * from ranked;

comment on view public.prometeo_backlog_priority_ranked is
'BACKLOG-239 ranked projection. Formula: 30% value +25% dependency +25% unlocked capacity +10% inverse cost +10% inverse execution risk, then multiplied by confidence. Unassessed items remain UNSCORED; frontier_priority is shown only as legacy/fallback evidence, never silently mixed into the five-factor score.';

grant select on public.prometeo_backlog_priority_ranked to anon, authenticated;