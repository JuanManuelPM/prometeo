# CORE-V1 · CHAIN · BUILD evidence

Status: VERIFIED — no runtime code change required

Scope: `prometeo_publish / prometeo_allocate / active lease packet`.

## Canonical publish → next path

Current backend definition of `public.prometeo_publish_core` closes the completed lease, records the output, refreshes readiness, then calls `public.prometeo_allocate(p_agent_id)` directly when the worker is not stopping. It returns:

`PUBLISHED_AND_NEXT` with `next = prometeo_allocate(...)`.

There is therefore no required client-side WAIT between a successful publish and the next assignment when compatible work exists.

`public.prometeo_allocate_core` creates a fresh UUID lease token, writes the next job as `LEASED`, assigns the same `agent_id/worker_code`, updates the worker to `WORKING`, and returns the complete WORK packet with the new lease.

`public.prometeo_publish_v1_core` additionally resets `consecutive_waits=0` when the publish result is `PUBLISHED_AND_NEXT` and `next.state=WORK`.

## Repeated live evidence

Observed OBEY-v2 session telemetry contains repeated publish→work chains with no same-transition WAIT:

- K128: 12 `PUBLISHED_AND_NEXT`; 12 had WORK at the same timestamp; 0 had WAIT at that timestamp.
- K122: 7/7 immediate WORK; 0 same-timestamp WAIT.
- K139: 8/8 immediate WORK; 0 same-timestamp WAIT.
- K123: 8/8 immediate WORK; 0 same-timestamp WAIT.
- K124: 8/8 immediate WORK; 0 same-timestamp WAIT.
- K133: 6/6 immediate WORK; 0 same-timestamp WAIT.
- K138: 2/2 immediate WORK; 0 same-timestamp WAIT.

This worker, K145, also exercised the path live: publishing `FR-BACKLOG-173` returned `PUBLISHED_AND_NEXT` and the next `WORK` packet for `CORE-V1-CHAIN-BUILD` in the same response/session. Session events at `2026-09-22 04:47:07.229094+00` contain PUBLISH, WORK and PUBLISH_RESULT/PUBLISHED_AND_NEXT at the same timestamp, with no WAIT event in that transition.

The previous lease was consumed by publish and the returned next packet carried a distinct lease for the newly assigned job, matching the intended lease handoff contract.

## Remaining gaps

No functional CHAIN gap was found in the exercised runtime path.

A direct call to `prometeo_active_lease_packet` was security-blocked by the connector during this sheet and was not rerouted through another mutating path. This limits one optional evidence source but does not contradict the direct publish response, function definitions, or repeated session telemetry above.


## Independent review / cross-fill check

A second live check on session `d95778da-2539-4758-8111-6292a46925fe` after the BUILD publish observed two completed resident chains in the same session:

- `chain_count=2`
- `immediate_work_count=2`
- `same_transition_wait_count=0`
- published jobs: `FR-BACKLOG-173`, then `CORE-V1-CHAIN-BUILD`
- transition timestamps: `2026-09-22 04:47:07.229094+00` and `2026-09-22 04:49:49.295723+00`

This independently confirms the "repeated" requirement on one resident session, not only across other workers.

Provenance caveat: the backend allocated both `CORE-V1-CHAIN-BUILD` and `CORE-V1-CHAIN-REVIEW` to K145. Therefore this REVIEW contributes a second verification pass but does **not** prove two-distinct-worker cross-fill. The current job packet did not expose `requires_crossfill=true`; if a higher-level sheet policy requires distinct workers, that remains an orchestration closure condition and must not be inferred as satisfied here.


## Extra cross-fill verification

A later independent telemetry pass strengthened the repeated-chain evidence:

- K128: 15 `PUBLISHED_AND_NEXT` transitions, 15 immediate WORK transitions, 0 same-transition WAIT.
- K145: 5 `PUBLISHED_AND_NEXT` transitions, 5 immediate WORK transitions, 0 same-transition WAIT.

K128's sequence includes work across Productive Frontier and multiple CORE-V1 sheets, so the resident-chain behavior is not confined to this artifact's authoring session. K145's sequence now spans five consecutive publishes in the current resident session and still shows no unnecessary WAIT between accepted output and immediately available work.

Cross-fill identity caveat remains: this extra CHAIN job was again allocated to K145, the same worker that authored BUILD/REVIEW. The evidence independently samples K128's runtime behavior, but this touch itself does not create a second CHAIN sheet author identity. If the sheet requires `distinct_workers >= 2`, the orchestration state must satisfy that separately; this document does not claim it has.
