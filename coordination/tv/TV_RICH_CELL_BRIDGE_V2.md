# TV Rich Cell Bridge v2

Canonical relation: `public.prometeo_tv_rich_cell_bridge_v2`

Read only for anon/authenticated. INSERT/UPDATE/DELETE are denied.

Top-level fields:
`schema, synthetic, demo_fallback_allowed, source, batch_id, status, domain_goal, focus_domains, worker_limit, observed_at, global, grids, workers, recent_artifacts, recent_events`.

The bridge exposes the latest 100-cell window for every logical grid, while `total_cells`, `max_cell_no` and `window_count` preserve elastic growth beyond 100.

Artifacts are canonical only. Event payloads remove packet/agent tokens. Artifact slot remains hidden while `global.artifact_slot_visible=false`.
