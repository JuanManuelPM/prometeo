# Control Room Stats V1

GitHub-only, event-driven statistics compiler for the V11 candidate.

It reuses durable worker evidence and optional `gh-pages/live` projections. It does **not** create a telemetry stream, scheduler, queue, claim authority, heartbeat loop, or Supabase dependency.

## Output

`latest.json` uses schema `prometeo.control-room-stats/v1` and keeps four diagnostic surfaces separate:

- `useful_output`: evidence-backed productive units, visible change, durable RETURNs.
- `wasted_time`: collisions, no-allocation, beacon-without-claim, unresolved claim-without-return, first non-PASS stages.
- `latency_proxies`: only durable timestamp pairs; no sample means `unknown`.
- `stale_work`: explicit recovery/replaceable evidence from claim-frontier. Wall-clock age alone never marks work stale.

The compiler is deterministic over a repository snapshot plus optional projection snapshot. Missing evidence remains unknown rather than becoming a synthetic zero.
