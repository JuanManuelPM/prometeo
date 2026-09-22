# Prometeo TV Grid Read Bridge v1

Status: **ACTIVE READ-ONLY VISUAL CONTRACT**
Owner: GUIDE-2 / runtime coordination
Consumer: GUIDE-1 / TV visual layer
Canonical resource: `public.prometeo_tv_grid_bridge_v1`

## Purpose

TV must visualize real Grid Lab state without reading internal orchestration tables directly and without fabricating workers when the experiment is idle.

The bridge is a derived projection. It has no scheduling, mutation or authority semantics.

## Browser read

The existing TV client already has a Supabase REST base and publishable browser key.

Read only:

```
GET /rest/v1/prometeo_tv_grid_bridge_v1?select=*
```

Expected result: one row.

Recommended polling interval comes from `poll_ms` (currently 1200 ms).

Do not query these internal tables from TV after cutover:
- grid_lab_runs
- grid_lab_tasks
- grid_lab_members
- grid_lab_events
- grid_lab_outputs
- grid_lab_member_incarnations
- grid_batch_dashboard

## Security contract

For `anon` and `authenticated`:
- SELECT: yes
- INSERT: no
- UPDATE: no
- DELETE: no

The projection intentionally excludes:
- agent_id
- packet_token
- prompts
- output text
- worker result payloads beyond safe visual metrics

## Truth flags

Every row exposes:
- `synthetic=false`
- `demo_fallback_allowed=false`
- `source=SUPABASE_GRID_LAB_CANONICAL_PROJECTION`

TV must obey these literally.

If state is `ARMED` and workers=0, render an idle/waiting-real-workers state.
Do NOT synthesize movement, fake workers, fake deaths or fake task completion.

## Top-level fields

- schema
- synthetic
- demo_fallback_allowed
- source
- launch_batch
- experiment_id
- observed_at
- poll_ms
- state
- global
- grids
- last_dead_worker
- recent_events

## global

Contains:
- grids
- expected_workers
- members
- active_workers
- dead_workers
- tasks
- ready
- leased
- done
- rescued
- evaluation_pass
- evaluation_fail
- canonical_outputs
- progress_pct
- quality_pass_pct

## grids[]

One item per real grid:
- run_id
- grid_no
- status
- worker_limit
- members / active_members / dead_members
- task_count / ready / leased / done / rescued
- pass / fail / progress_pct
- p50_ms / p90_ms / throughput_5m
- started_at / sealed_at / finished_at
- tasks[]
- workers[]
- recent_events[]

### tasks[]

Safe visual task state only:
- task_no
- status
- worker_code
- difficulty
- rescue_count
- attempt_count
- lease_started_at
- lease_expires_at
- completed_at
- evaluation_status

### workers[]

Safe logical worker projection:
- seat_no
- worker_code
- status
- current_task_no
- tasks_done
- rescues_done
- joined_at
- last_seen_at
- incarnation_count

### recent_events[]

Safe visual events:
- event_id
- at
- worker_code
- task_no
- event_type
- visual

No raw operational token is exposed.

## last_dead_worker

Null until a real Grid Lab incarnation dies/replaces.

When present:
- run_id
- grid_no
- seat_no
- worker_code
- status
- joined_at
- death_at
- tasks_done
- timeline[]

This is the sole data source for the TV "last fallen worker" strip.

## Current verified snapshot

At bridge creation:
- experiment: GRID-10X100X2-V1
- launch_batch: GRID-10X100X2-V1-C-E0
- state: ARMED
- grids: 10
- expected workers: 20
- members: 0
- tasks: 1000
- ready: 1000
- leased: 0
- done: 0
- synthetic: false
- demo_fallback_allowed: false

## Cutover requirements for GUIDE-1

1. Read Guide Mesh context first.
2. Create a Work Trace for `tv/ai-real-bridge-cutover`.
3. Limit mutation to `tv/ai/index.html` and its served gh-pages counterpart.
4. Replace direct `grid_batch_dashboard` + raw `grid_lab_members/events` reads with this bridge.
5. Delete/disable automatic demo generation from the normal route.
6. A demo may exist only behind an explicit developer query like `?demo=1`; it must never activate automatically.
7. When the bridge says ARMED/0 workers, visually show the real empty state.
8. Do not write to Supabase.
9. Do not change scheduler/runtime/experiment state.
10. Verify the served page reads the bridge and does not fabricate activity.

## Separation law

```
Grid Lab canonical state/events
        ↓
prometeo_tv_grid_bridge_v1
        ↓   READ ONLY
TV / GUIDE-1 visual code
```

TV never reads authority from its own local state and never feeds visual state back into Grid Lab.
