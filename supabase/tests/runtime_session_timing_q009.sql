-- Q009 / WORK-RESERVOIR-01
-- Mathematical regression fixture for prometeo_control_session_timing.
-- Covers: pre-T0 backfill, simultaneous events, missing next event,
-- open-session boundary, RETRY_LENGTH returning to WORK, and conservation.
-- Expected: every boolean is true.

with
session_fixture as (
  select
    '00000000-0000-0000-0000-000000000009'::uuid session_id,
    '2026-09-22 00:00:00+00'::timestamptz t0,
    '2026-09-22 00:00:10+00'::timestamptz end_at
),
raw_events(event_id,session_id,created_at,phase,state) as (
  values
    (1,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-21 23:59:59+00'::timestamptz,'ENTER','ENTER'),
    (2,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-22 00:00:00+00'::timestamptz,'BOOT','FIRST_SERVER_CONTACT'),
    (3,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-22 00:00:02+00'::timestamptz,'WAIT',null),
    (4,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-22 00:00:02+00'::timestamptz,'WAIT_RESULT','WAIT_TIMEOUT_CONTINUE'),
    (5,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-22 00:00:05+00'::timestamptz,'WAIT_RESULT','WORK'),
    (6,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-22 00:00:08+00'::timestamptz,'PUBLISH',null),
    (7,'00000000-0000-0000-0000-000000000009'::uuid,'2026-09-22 00:00:09+00'::timestamptz,'PUBLISH_RESULT','RETRY_LENGTH')
),
ranked as (
  select r.*,
         row_number() over(partition by session_id,created_at order by event_id desc) as rn
  from raw_events r
),
effective as (
  select r.*,
         lead(created_at) over(partition by session_id order by created_at,event_id) as next_at
  from ranked r
  where rn=1
),
intervals as (
  select e.*,
         greatest(e.created_at,s.t0) as start_at,
         least(coalesce(e.next_at,s.end_at),s.end_at) as stop_at,
         case
           when e.phase='BOOT' then 'BOOT'
           when e.state='WORK' or e.phase='CHECKPOINT' then 'WORK'
           when e.phase='PUBLISH' then 'PUBLISH'
           when e.phase='PUBLISH_RESULT' and e.state in ('RETRY_LENGTH','RETRY_CHILDREN') then 'WORK'
           when e.phase='PUBLISH_RESULT' and e.state in ('STALE_LEASE','WAIT','WAIT_TIMEOUT_CONTINUE','PARKED','PAUSED') then 'WAIT'
           when e.phase in ('WAIT','WAIT_RESULT') then 'WAIT'
           when e.phase in ('PREFLIGHT','ENTER','CONTRACT_COMPAT') then 'COORDINATION'
           else 'OTHER'
         end as bucket
  from effective e join session_fixture s using(session_id)
),
dur as (
  select bucket,
         greatest(0,extract(epoch from (stop_at-start_at))*1000)::bigint as ms
  from intervals
  where stop_at>start_at
),
agg as (
  select
    coalesce(sum(ms) filter(where bucket='BOOT'),0) boot_ms,
    coalesce(sum(ms) filter(where bucket='WAIT'),0) wait_ms,
    coalesce(sum(ms) filter(where bucket='WORK'),0) work_ms,
    coalesce(sum(ms) filter(where bucket='PUBLISH'),0) publish_ms,
    coalesce(sum(ms) filter(where bucket='COORDINATION'),0) coordination_ms,
    coalesce(sum(ms) filter(where bucket='OTHER'),0) other_ms
  from dur
)
select
  boot_ms=2000 as boot_ok,
  wait_ms=3000 as wait_ok,
  work_ms=4000 as work_ok,
  publish_ms=1000 as publish_ok,
  coordination_ms=0 as pret0_clipped_ok,
  (boot_ms+wait_ms+work_ms+publish_ms+coordination_ms+other_ms)=10000 as conservation_ok
from agg;
