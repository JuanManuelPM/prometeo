# PROMETEO WORKER EVENT STREAM V1

Status: CANARY_BINDING
Issue: https://github.com/JuanManuelPM/prometeo/issues/22

Purpose: reconstruct each launched /wc wave without turning observability into authority or hot-path overhead.

## HARD LAW

Observability is best-effort and non-authoritative.

- GitHub PIN/claim files remain the sole ownership authority.
- Missing/blocked event comments NEVER block allocation, PIN, STARTED, work, RETURN, recovery, or reallocation.
- Event comments never create ownership, recovery debt, or completion.
- Do not retry a blocked telemetry comment before ownership. Continue the real worker path.
- Never launch workers to repair missing telemetry.

## BATCH / POOL

Finite wave:
`BATCH <batch_id> EXPECTED <n>`

Rolling pool:
`POOL <pool_id>`

For POOL, runtime batch_id is `POOL-<pool_id>` and expected_workers=null. Pool membership has no missing/extra semantics and no cohort completion barrier. Workers may arrive continuously; each keeps its own worker_id and normal authority/RETURN laws.

## THREE EVENTS ONLY

Post at most these lifecycle comments to issue #22:

1. ROUTED
   After beacon + one allocator read + candidate selection, immediately before the first real authority attempt.
2. CLAIM_RESULT
   After the bounded claim phase resolves. Summarize attempts in ONE comment.
   outcome is one of WON, COLLISION_EXHAUSTED, NO_COMPATIBLE_CANDIDATE, TRANSPORT_BLOCKED, INVALID_ALLOCATOR.
   If WON, persist STARTED first when required, then set started=true.
3. CLOSE
   Once when the worker/chat chain finally closes: terminal STOP, real boundary/exhaustion, or productive-chain target/hard-cap close. Intermediate RETURN/guide receipts do not emit CLOSE. outcome is RETURNED, NO_ALLOCATION, ABORTED, SUPERSEDED, or other bounded terminal result.

Long-running workers use the existing durable heartbeat mechanism; they do not spam issue comments.

## COMMENT FORMAT

One line:

`PROMETEO_EVENT {"schema":"prometeo.worker-event/v1","batch_id":"WAVE-...","expected_workers":6,"worker_id":"...","event":"ROUTED",...}`

Minimum common fields:
- schema = prometeo.worker-event/v1
- batch_id
- expected_workers or null
- worker_id
- event

ROUTED fields:
- lane
- candidate_id
- candidate_title

CLAIM_RESULT fields:
- outcome
- attempts
- lane
- candidate_id
- authority_ref_or_null
- started (boolean)

CLOSE fields:
- outcome
- job_id_or_null
- result_ref_or_null

GitHub comment `created_at` is the measurement timestamp. Model-authored timestamps are descriptive only.

## RECONCILIATION

`scripts/build-worker-runtime.mjs` compiles issue comments into `gh-pages/live/runtime.json` and cross-checks repo evidence when available:
- beacon by worker_id
- portfolio/guide PIN by worker_id
- no-allocation receipt by worker_id

The compiler reports contradictions rather than silently resolving them.

## UI LAW

Live shows the newest named wave before old recoverable backlog. Historical replaceable jobs remain visible, but they cannot masquerade as members of the current wave.
