# PROMETEO · SUPABASE DISK RECOVERY + RETENTION V1

Status: **CANDIDATE RUNBOOK · diagnostic/recovery aid, not a new source owner**

Incident evidence:
- `coordination/canaries/page-change-pipeline-v1/control-plane-diagnosis-latest.json`
- archived diagnosis: `coordination/canaries/page-change-pipeline-v1/control-plane-diagnosis-20260928.json`

## Current boundary

PostgreSQL cannot complete recovery because WAL temp files cannot be written:

`could not write to file "pg_wal/xlogtemp.*": No space left on device`

This is below PostgREST and below Page Change. PGRST000/PGRST002 and Capture HTTP 500 are downstream symptoms.

Do **not** attempt schema-cache reloads, migrations, VACUUM, retention DELETEs or Page Change repairs while PostgreSQL cannot finish startup.

## Phase 0 · restore startup headroom

Required external/platform action:

1. Restore database disk headroom through the Supabase project/platform layer.
2. Do not pause/restore the project merely as a speculative repair for full disk.
3. Do not delete unknown data or reset the project.
4. After headroom exists, require PostgreSQL to reach `ready to accept connections`.

The connected Prometeo tooling currently exposes no database-disk resize action, so this boundary cannot be crossed from the worker runtime itself.

## Phase 1 · prove recovery before product work

Run read-only checks first:

```sql
select now() as checked_at,
       pg_database_size(current_database()) as database_bytes,
       pg_size_pretty(pg_database_size(current_database())) as database_size;
```

Confirm PostgREST/RPC and Capture bootstrap respond again. Only then rerun the Page Change canary.

Do not promote Control Room V11 merely because PostgreSQL starts.

## Phase 2 · measure what actually consumes database disk

Before defining retention, collect evidence:

```sql
select n.nspname as schema_name,
       c.relname as relation_name,
       c.relkind,
       pg_total_relation_size(c.oid) as total_bytes,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
       pg_relation_size(c.oid) as table_bytes,
       pg_size_pretty(pg_relation_size(c.oid)) as table_size,
       pg_indexes_size(c.oid) as index_bytes,
       pg_size_pretty(pg_indexes_size(c.oid)) as index_size
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname not in ('pg_catalog','information_schema')
  and c.relkind in ('r','m')
order by pg_total_relation_size(c.oid) desc
limit 50;
```

Measure row counts/age distribution for high-churn Prometeo relations if they are among the largest, especially:

- `prometeo_worker_job_events_v1`
- `prometeo_worker_session_events`
- `prometeo_worker_sessions_v1`
- `prometeo_events`
- `prometeo_work_graph_v1`
- `prometeo_cognitive_frontier_artifacts_v1`
- `prometeo_work_context_events_v1`
- Page Change / Capture execution tables

These are **audit candidates, not presumed culprits**.

Also inspect WAL/replication pressure after recovery. Do not assume table rows alone caused disk exhaustion.

## Phase 3 · retention design law

Prometeo needs two different histories:

1. **Canonical durable history**: decisions, promoted artifacts, work outcomes, verification, claims/RETURNs, accepted/rejected knowledge. Preserve.
2. **High-frequency operational telemetry**: heartbeats, repeated progress/session events and disposable diagnostic samples. Bound it when safe.

Any retention policy must:

- preserve reconstructibility of accepted work;
- preserve security/audit evidence required for claims and verification;
- preserve enough aggregate history for Statistics;
- never use `ACTIVE` rows as a deletion proxy;
- avoid deleting rows referenced by current work, evidence or Work Context;
- aggregate before pruning where historical charts depend on raw telemetry;
- have a dry-run projection with rows/bytes that would be removed;
- be introduced as an explicit migration only after measurements identify the actual pressure.

## Phase 4 · prevention candidates after measurement

Choose only evidence-supported controls:

- aggregate old high-frequency telemetry into daily summaries;
- bounded retention for raw heartbeat/progress events;
- archive terminal session telemetry before pruning;
- indexes only where they reduce real query/maintenance cost;
- scheduled cleanup with an explicit retention window;
- disk-growth alerting before WAL loses startup headroom;
- a Control Room diagnostic for database headroom/control-plane availability.

Do not add all of these by default. Human enthusiasm is not a storage engine.

## Recovery acceptance

The incident is not closed until:

1. PostgreSQL reports ready and direct SQL works;
2. PostgREST/RPC works;
3. Capture bootstrap works;
4. Page Change canary reaches WORKER_POOL;
5. ordinary allocator remains healthy;
6. largest relations/WAL pressure are measured;
7. prevention work is based on those measurements;
8. V11 still remains CANDIDATE until real worker post-claim private packet + RETURN + human review pass.

