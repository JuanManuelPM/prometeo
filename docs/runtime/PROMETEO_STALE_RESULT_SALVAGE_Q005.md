# Q005 — Stale result salvage

## Principle

A late result is **evidence/candidate**, never a canonical output merely because its content may be useful. Staleness means the lease authority is gone; preserving bytes must not silently restore that authority.

The current `prometeo_publish_core` calls the stale reaper before looking up the lease. When the lease is no longer current it emits `STALE_RESULT_REJECTED` and returns `STALE_LEASE`, but the submitted output is discarded. The rejection event stores the raw lease token and may lack `project_id/job_key` because the lease row has already been cleared. Separately, `prometeo_outputs` has a primary key only on `(project_id,job_key)`; inserting late content there would collide with or overwrite the single canonical result.

## Durable candidate lane

Introduce an append-only `prometeo_stale_candidates` (or equivalent evidence store). Ingestion happens after authority validation has failed, but before returning STALE_LEASE, and must never call the canonical output path.

Minimum provenance:

- `candidate_id` immutable UUID.
- `attempt_id` or `lease_fingerprint`; never persist a new raw lease token.
- `project_id`, `job_key`, `generation`.
- original `worker_code`, `agent_id`, `session_id`.
- original lease start/expiry and `received_at`.
- `stale_reason_code`: LEASE_EXPIRED, SUPERSEDED, JOB_ALREADY_DONE, AGENT_MISMATCH, UNKNOWN.
- `output_text` or immutable artifact reference, plus `content_sha256`, word/char counts and sanitized meta.
- `base_canonical_sha256` captured at assignment time when a canonical result already existed.
- lifecycle `status`: CANDIDATE, CONFLICT, CONSUMED_AS_EVIDENCE, PROMOTED, REJECTED, SUPERSEDED.
- decision metadata: reviewer/decision ref, decided_at, reason.

Provenance must be recoverable even after the job row loses its lease token. The clean solution is an immutable attempt ledger created at assignment time, keyed by attempt_id/lease_fingerprint and containing project/job/generation/worker/session/lease window. As a compatibility backfill, historical JOB_ASSIGNED/RESCUE_ASSIGNED events can be consulted, but future logic should not depend on searching raw tokens inside event JSON.

## Conflict classification

Before any promotion, lock candidate plus current job/canonical state and classify:

- generation mismatch -> `CONFLICT_GENERATION`.
- current job still LEASED -> `CONFLICT_ACTIVE_LEASE`; never steal authority from the active worker.
- canonical exists and differs from the candidate's captured base -> `CONFLICT_CANONICAL_CHANGED`.
- canonical exists without divergence -> `RECONCILE_REQUIRED`; useful evidence may still differ semantically.
- canonical absent, same generation, no active lease -> `ELIGIBLE_EMPTY_REVIEW`.

Candidate ingestion itself always has `direct_canonical_write=false`.

## Promotion

Promotion is a separate, explicit action with fresh authority and CAS. A candidate cannot promote itself.

For `ELIGIBLE_EMPTY_REVIEW`, an authorized reviewer may promote only if the current generation, job status and canonical absence still match the reviewed snapshot. The canonical insert records `promoted_from_candidate_id` and candidate content hash.

If a canonical output already exists, do **not** overwrite it directly. Create a reconciliation decision/job that compares canonical and candidate. A later normal publish may incorporate the candidate, or an explicit canonical-revision mechanism may replace it only after archiving the previous canonical and checking expected SHA. The stale candidate remains immutable evidence either way.

Promotion must be idempotent: once PROMOTED/REJECTED/CONSUMED, repeated decisions return the existing disposition. Every decision gets an append-only event with candidate_id, before/after canonical hashes, reviewer, reason and resulting output/ref.

## Privacy and safety

Do not store credentials, connector secrets or raw lease tokens in candidate provenance. Hash/fingerprint lease identity. Candidate content is untrusted evidence and must not be executed as instructions merely because it was submitted by a former worker.

## Verification

`supabase/tests/runtime_stale_result_salvage_q005.sql` models five decision cases: empty same-generation candidate, existing canonical, changed canonical, generation change and active replacement lease. The fixture asserts the expected conflict/eligibility state and that ingestion never directly writes canonical output.
