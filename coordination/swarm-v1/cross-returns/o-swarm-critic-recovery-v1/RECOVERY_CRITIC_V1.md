# Recovery / stale / retry adversarial audit v1

Status: CANDIDATE CRITIC RETURN MATERIAL — NO AUTHORITY PROMOTION
Opportunity: `O-SWARM-CRITIC-RECOVERY-V1`
Run: `RUN-SWARM-RECOVERY-20260917T0914-sol56`
Worker: `wc-chat-20260917T0913-0300-sol56-recoverycritic`
Observed public epoch before write: `P3-4605c53d3ba3`
Observed live main before write: `96cfeeead6086f1527afb880f3810d4f741f76f8`

## Verdict

`PARTIAL / BLOCK PRODUCTION PROMOTION OF RECOVERY SEMANTICS` until the falsifications below are repaired and independently exercised. The implementation has useful preserve-first primitives and its existing 11 tests pass according to the builder return, but four safety/liveness gaps remain visible in the executable API and one runtime-contract split exists between generated candidate claims and recovery claims already persisted in the repository.

This verdict is scoped to lease/stale/retry semantics. It does not modify Current, Human Accepted or Served authority.

## Evidence inspected

- `scripts/swarm-lease-lib.mjs` blob `e652f42bb09680749f04c973bd5697af63e8fdb6`.
- `scripts/swarm-stale-scan.mjs` blob `5fc22ffeb3608c9ae1009d06997fbeac7a125a5b`.
- `tests/swarm-lease-retry-v1.test.mjs` blob `72cdf44cc1147cfdc8f0d422e8547ca21181e76b`.
- Builder return `coordination/opportunities/returns/O-SWARM-LEASE-RETRY-BUILD-V1/RUN-O-SWARM-LEASE-RETRY-BUILD-V1-20260917T0043-SOL56.json`.
- Real recovery claim `coordination/opportunities/recovery-claims/O-SWARM-KERNEL-IMPLEMENT-V1/REC-O-SWARM-KERNEL-IMPLEMENT-V1-20260917T0906-SOL56.json`.
- Current universal queue and binding stale-recovery / worker / authority contracts loaded by the `/wc` v3.0 bootstrap.

## Falsification 1 — retry-safety gate is bypassed by `READ_ONLY_RECOVERY`

### Current executable path

`evaluateRecovery()` currently rejects unsafe retry only when this expression is false:

`retryable || recovery_mode === 'ISOLATED_CANDIDATE' || recovery_mode === 'READ_ONLY_RECOVERY'`

Therefore `READ_ONLY_RECOVERY` itself satisfies the retry-safety gate even when `retryable=false`.

### Minimal falsifier

Use a subject with:
- exclusive CLAIM;
- STARTED;
- last heartbeat >= 30 minutes old;
- binding 20/30 minute policy;
- `retryable: false`;
- `recovery_mode: 'READ_ONLY_RECOVERY'`;
- `target_refetched: true`;
- no terminal RETURN/DONE;
- no active overlap reported.

Current result is capable of reaching `RECOVERY_ELIGIBLE / APPEND_RECOVERY_CLAIM` instead of preserving `RETRY_SAFETY_UNPROVEN`.

### Required repair

Separate *observation safety* from *execution retry safety*. Read-only scanning may classify stale state, but `recovery_eligible=true` and recovery-attempt generation must require explicit retry safety evidence for any path that can seed a recovery run. A read-only mode should emit `STALE_SUSPECT` or `RECOVERY_CANDIDATE_REQUIRES_RETRY_PROOF`, not execution eligibility.

## Falsification 2 — overlap uncertainty is collapsed to “no overlap”

### Current executable path

`active_overlap` defaults to `false` in `evaluateRecovery()`. `scanSubjects()` passes `subject.active_overlap === true`, so missing evidence is also converted to false. `buildRecoveryAttempt()` then writes the string `NO_ACTIVE_OVERLAP_AT_EVALUATION` whenever eligibility passes.

There is no required receipt/reference proving how the overlap check was computed.

### Minimal falsifier

Two workers scan the same stale opportunity from the same snapshot. Both omit `active_overlap` because neither has independently reconstructed write scopes. Both can classify the subject as recovery-eligible. If they use distinct recovery attempt IDs, both candidate paths are unique and neither collides at file creation.

### Required repair

Make overlap state tri-valued: `PROVEN_NONE | FOUND | UNKNOWN`. `UNKNOWN` must park. Require an `overlap_check_ref` or a deterministic computed set of active writer scopes + evidence head. Never serialize `NO_ACTIVE_OVERLAP_AT_EVALUATION` unless the proof is present.

## Falsification 3 — no recovery-generation fence prevents two unique recovery attempts

### Current executable path

`buildRecoveryAttempt()` derives the recovery claim path from caller-provided `recovery_attempt_id`. Two workers can choose different IDs, so create-if-absent on the individual files does not provide uniqueness for the recovery generation of one original run.

### Race

1. Worker A and B observe the same stale original run.
2. Both see no recovery claim in their snapshot.
3. A creates `REC-A.json`; B creates `REC-B.json`.
4. Both are append-only and individually valid.
5. Both can seed recovery runs against the same original attempt.

This is a duplicate recovery race, not prevented by per-file atomic creation.

### Required repair

Add a deterministic recovery-generation pin/fence keyed by original opportunity + original run + stale generation, created atomically before a recovery run can start. Unique recovery evidence files may remain append-only, but only the winner of the generation fence receives execution authority. Late/losing recovery candidates remain evidence.

## Falsification 4 — a bare recovery-attempt signal can postpone recovery without proving liveness

`RECOVERY_ATTEMPT` is included in `SIGNAL_KINDS`, so it resets `latestSignal()` age. If a recovery claim/attempt is appended but no recovery run starts or heartbeats, that bare attempt can defer another recovery for a full threshold window. Repeated abandoned attempts can therefore create a recovery deadlock/liveness delay.

Required repair: track liveness per attempt lineage. A recovery claim may establish ownership/fence, but only STARTED/HEARTBEAT/CHECKPOINT should refresh worker liveness. If the recovery claimant never starts, the fence itself needs a bounded lease/expiry/recovery rule.

## Falsification 5 — runtime recovery-claim contract is split

The current builder emits candidate claims with schema `prometeo.recovery-claim/v1`, fields such as `created_at`, `recovery_worker_instance_id`, `intended_write_mode`, and `eligibility_checks`.

A real repository recovery claim inspected during this run uses `prometeo.opportunity-recovery-claim/v1`, fields such as `recovery_claimed_at`, `worker_instance_id`, `write_mode`, and a structured `eligibility` object.

This is not proof that a consumer is currently broken, but it is an unbounded compatibility risk: a scanner/executor/control-room pipeline cannot be called operational until one canonical schema or an explicit version adapter is proven against both historical and newly generated claims.

Required repair: define canonical recovery-claim schema + migration/adapter contract; add fixture tests using the existing real claim as historical input.

## Late-return reconciliation boundary

`reconcileLateReturn()` correctly preserves both returns and forbids newest-wins/auto-promotion at the pure-function level. During this audit, repository code search did not locate a durable `recovery-reconciliation` artifact/consumer. Treat late-return reconciliation as `PRIMITIVE_PROVEN / END-TO-END UNPROVEN` until the stress verifier demonstrates:

1. original attempt returns late;
2. recovery attempt also returns;
3. both immutable returns remain addressable;
4. a durable reconciliation artifact is written;
5. a validator/steward dispositions both;
6. no recency-only promotion occurs.

## Existing tests: useful but incomplete

The builder return reports 11/11 passing tests. Those tests cover thresholds, newer heartbeat, terminal return, missing policy, CAS mismatch, explicit `active_overlap=true`, append-only lineage, pure late-return reconciliation, and scanner non-mutation.

Add at minimum these adversarial tests:

1. `retryable=false + READ_ONLY_RECOVERY` must never yield executable recovery eligibility.
2. missing overlap proof must yield `UNKNOWN/PARK`, not infer false.
3. two distinct recovery IDs for one stale generation must produce exactly one execution-authorized fence winner.
4. recovery claim without STARTED must not count as worker heartbeat indefinitely; fence lease must expire/recover.
5. historical `prometeo.opportunity-recovery-claim/v1` fixture and new canonical candidate must normalize to one internal contract.
6. durable late-return reconciliation integration test, not pure function only.

## Deduplicated dispositions / next work

### D1 — repair owner: existing lease/retry lane

Do **not** create a second competing implementation. Route F1–F5 as a bounded hardening follow-up to the existing owner artifacts from `O-SWARM-LEASE-RETRY-BUILD-V1` (`scripts/swarm-lease-lib.mjs`, `scripts/swarm-stale-scan.mjs`, `tests/swarm-lease-retry-v1.test.mjs`). The original return is immutable; the fix should be a new run/follow-up opportunity or steward disposition, not rewriting evidence.

Suggested dedup fingerprint:
`prometeo|swarm-lease-retry|retry-proof+overlap-proof+generation-fence+schema-adapter|v2`

### D2 — testing journey already exists

Do not create a duplicate broad testing task. Feed these exact falsifiers into `O-SWARM-CRITIC-TESTING-V1` and into the dependency-gated `O-SWARM-50-WORKER-STRESS-VERIFY-V1`.

### D3 — production gate

`/w` recovery semantics must remain unpromoted until independent verification demonstrates the repaired cases under concurrent workers. A green 11-case unit suite is insufficient because the missing cases are exactly at the caller/evidence/concurrency boundary.

## Final critic disposition

- Preserve-first primitives: useful.
- 20/30 minute thresholds: represented.
- Terminal RETURN suppression: represented.
- CAS mismatch handling: represented.
- Late-return pure reconciliation: useful primitive.
- Retry-safety proof: **FAIL / bypassable**.
- Overlap proof: **FAIL / absence collapses to false**.
- Recovery generation uniqueness: **FAIL / no deterministic execution fence**.
- Recovery-claim schema compatibility: **PARTIAL / split contract**.
- End-to-end late-return disposition: **UNPROVEN**.

Result: `PARTIAL`, with concrete blocking repairs above. No global authority mutation performed.
