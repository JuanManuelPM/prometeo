# Q005 downstream review — AUTO-Q01024

Reviewed artifact: docs/runtime/PROMETEO_STALE_RESULT_SALVAGE_Q005.md

Status: DESIGN ACCEPTED / RUNTIME IMPLEMENTATION NOT YET READY.

## Accepted invariants

- Stale bytes are evidence only; ingestion never writes canonical output.
- An active replacement lease keeps authority.
- Canonical replacement is a separate authorized action with CAS.
- New provenance must not persist raw lease tokens.
- Candidate/decision history remains immutable and idempotent.

## Gaps downstream must not invent

1. Attempt ledger prerequisite.
Candidate ingestion cannot reliably recover provenance after the reaper clears a lease unless JOB_ASSIGNED/RESCUE_ASSIGNED first create a durable attempt/fingerprint record. Implement this ledger before enabling stale-candidate ingestion.

2. Idempotent ingest key.
Define a unique natural key such as attempt_id + content_sha256, or an equivalent server idempotency key. Duplicate delivery of the same late payload must return one candidate, not append duplicates.

3. Bounded untrusted payload.
Define and enforce a server-side size limit for inline stale output/meta. Oversize content must be rejected or stored through an approved immutable artifact reference. The stale path must not be an unbounded storage channel.

4. Explicit authority.
Candidate ingest, classify and disposition/promotion operations require explicit grants. Candidate disposition and canonical writes must remain unavailable to untrusted clients.

## Fixture scope

supabase/tests/runtime_stale_result_salvage_q005.sql is a decision-classifier fixture. It verifies five classification cases and direct_canonical_write_on_ingest=false. It does not verify persistence, RLS, duplicate-delivery idempotency, attempt-ledger linkage, CAS under concurrency or payload bounds.

## Production acceptance fixture

Before runtime promotion, add a transactional integration fixture covering:

- duplicate stale delivery -> one candidate;
- stale delivery after lease cleanup -> provenance resolves from attempt ledger;
- active replacement lease -> no promotion;
- canonical changed -> CAS conflict;
- unauthorized disposition mutation -> denied;
- oversize inline payload -> bounded rejection;
- repeated promotion/rejection -> same terminal disposition.

This review does not change Q005's safety design. It makes the remaining implementation decisions explicit so a downstream worker does not mistake a validated classifier for a production-ready persistence contract.
