# CORE-V1 · ADMISSION · REVIEW evidence

Status: VERIFIED BY SAME WORKER — functional checks pass; distinct-worker cross-fill is not claimed.

Scope: `prometeo_bootstrap + OBEY-v2`.

## Independent checks

The BUILD evidence was re-opened from the committed repository and compared against the current active artifacts, rather than accepted from its summary.

Current `AGENTS.md`:
- requires a fresh agent_id;
- requires the first Prometeo server contact to be the single atomic `prometeo_bootstrap` call;
- explicitly forbids splitting initial admission into PREFLIGHT + ENTER;
- forbids repository archaeology, legacy boot, scheduler inspection, or alternate routing before bootstrap completes;
- makes OBEY-v2 authoritative when `/o/` is the invoked protocol.

Current `o/index.html`:
- names the authoritative Supabase project id directly, avoiding pre-bootstrap discovery;
- states that the first operational action is `prometeo_bootstrap`;
- performs PREFLIGHT + ENTER atomically;
- preserves the same agent_id across bounded admission retries;
- retries the same bootstrap operation after admission rate limiting;
- terminates honestly after bounded rate-limit/security failures instead of switching routes;
- forbids GitHub, SQL, scheduler, wait, or documentation as substitutes for failed bootstrap;
- continues only after `bootstrap_complete=true`.

Current generated launcher migration `20260922035200_worker_prompt_atomic_bootstrap_review_q01070.sql` agrees on:
- `ADMISSION → BOOTSTRAP(PREFLIGHT+ENTER)`;
- same-route Retry-After handling;
- no security-block evasion;
- no extra telemetry-only calls.

Repository code search found no current matches for direct `prometeo_preflight(`, direct `prometeo_enter(`, or the stale visible sequence `PREFLIGHT → ENTER`.

## Cross-fill condition

This REVIEW ran as worker `K128`, the same worker that produced the BUILD evidence. A backend query intended to read the sheet's exact `requires_crossfill`/touch state was blocked by connector security and was not retried through another route.

Therefore this artifact does **not** claim that a “two distinct workers” closeout condition has been satisfied. If `requires_crossfill=true`, the functional build is verified but the sheet must remain open for a different worker touch.

## Result

No functional admission defect was found by the independent repository checks. No corrective code change was justified.
