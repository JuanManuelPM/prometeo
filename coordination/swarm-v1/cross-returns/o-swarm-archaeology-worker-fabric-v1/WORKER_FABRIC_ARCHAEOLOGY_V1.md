# Worker Fabric archaeology v1

Status: `CANDIDATE_EVIDENCE_ONLY`
Opportunity: `O-SWARM-ARCHAEOLOGY-WORKER-FABRIC-V1`
Run: `RUN-O-SWARM-ARCHAEOLOGY-WORKER-FABRIC-V1-20260917T0915-SOL56`
Authority: scoped read-only archaeology + own durable return; no shared promotion.

## Executive finding

The bounded current-tree audit did **not** verify a monolithic current component named `Worker Fabric`, nor current modules named `provider adapter`, `collector`, `evaluator`, `integrator` or `challenger` that can safely be imported as an existing subsystem. Stale/historical references to `.wc-bootstrap/runs/*`, `research/deep-lab-v1/*` and older Worker-Fabric-era vocabulary are therefore **not** reusable current implementation evidence by themselves.

What *is* verified in current `main` is a functional descendant: the universal cognitive worker kernel + role-fluid allocator + durable claim/run/return protocol. Together they already embody the important many-worker semantics that a historical Worker Fabric would be expected to provide: interchangeable boot, role allocation, exclusive claims, collision rejection, independent critique/verification roles, bounded authority, durable evidence, recovery and post-return re-entry.

**Route change:** do not create a second Worker Fabric runtime merely to recover the old name. Reuse and harden the current universal-worker contracts. Historical bytes should only contribute clauses/components after exact provenance is reopened and a gap against current behavior is demonstrated.

## Evidence inventory

### Current, reopenable and behaviorally relevant

1. `coordination/workstreams/chat-native-control-plane-v1/UNIVERSAL_COGNITIVE_WORKER_V1.md`
   - binding canary operating model;
   - canonical identical `/wc` bootstrap;
   - roles include `EXECUTE`, `DISCOVER`, `PLAN_LOCAL`, `CRITIQUE`, `VERIFY`, `INTEGRATE_LOCAL`, `CONTEXT_COMPILE`, `RECOVER`, `COMPACT`;
   - explicit generator != evaluator != promoter separation;
   - exact mutation remains claim-protected while read-only cognition may parallelize;
   - section 12 explicitly names historical Worker Fabric / collector / validator / integrator / challenger patterns as reuse targets, while requiring evidence-based ACTIVE/MERGED/SUPERSEDED/RETIRED classification.

2. `coordination/swarm-v1/kernel/UNIVERSAL_COGNITIVE_WORKER_KERNEL_V1.json`
   - current candidate kernel contract;
   - wake sequence: `FETCH -> ... -> CLAIM_PIN -> STARTED -> BUILD_THINK -> TEST_CRITIQUE -> REPAIR -> PERSIST -> RETURN -> RELOAD -> CONTINUE`;
   - exclusive claim contract: `CREATE_IF_ABSENT_EXCLUSIVE`;
   - collision and authority rejection;
   - concrete implementation pointers:
     - `scripts/universal-cognitive-worker-lib.mjs`
     - `scripts/validate-universal-worker.mjs`
     - `tests/universal-cognitive-worker-v1.test.mjs`.

3. `coordination/swarm-v1/kernel/UNIVERSAL_COGNITIVE_WORKER_KERNEL_CANARY_RECEIPT_V1.json`
   - `CANDIDATE_VERIFIED` receipt;
   - 11/11 tests passed against exact source blobs;
   - covers claim/collision/authority filtering, role derivation, preserve-first write scope, context receipt, dependency readiness, post-return exhaustion and CLI pass/fail behavior;
   - truth boundary explicitly says this does not prove broad 50-worker operation, timed unattended recovery, production `/w`, Human Accepted, Current or Served.

4. `coordination/swarm-v1/allocator/ROLE_FLUID_ALLOCATOR_V1.json`
   - tested candidate allocator reusing the kernel;
   - selects prepared/derived-ready/recovery/context/compact/discovery work under explicit gates;
   - rejects active claims, unsafe recovery, live overlapping writers and global-promotion authority;
   - 11/11 local tests passed; repository CI was not observed at receipt time.

5. Live allocator race observed by this run on 2026-09-17:
   - multiple candidate lanes changed from 404/unclaimed to existing between read and attempted create;
   - GitHub create returned `422` requiring an existing-file SHA when another worker won;
   - this worker did not overwrite the winner and re-entered allocation;
   - `O-SWARM-ARCHAEOLOGY-WORKER-FABRIC-V1` was eventually won by an atomic create-if-absent claim.
   This is direct runtime evidence that exclusive durable claims + retry are doing useful coordination work under broad identical-worker concurrency.

### Historical or stale references, not current implementation evidence

During bounded archaeology, older/stale indexes or concurrent recovery material referenced paths such as:
- `.wc-bootstrap/runs/WORKSTREAM_PIPELINE.json`
- `.wc-bootstrap/runs/QC-PIPELINE-WORKER.json`
- historical worker closure/role artifacts
- `research/deep-lab-v1/*` swarm/role/closure/operator artifacts.

These paths were not reopenable in current `main` during this run. Absence does not prove the historical concepts never existed or should be retired; it means exact bytes/lineage remain source debt and must not be silently reconstructed.

A separate opportunity, `O-SWARM-HISTORICAL-WORKER-MECHANISMS-V1`, is concurrently recovering/classifying the broader historical mechanism set. At the last check its recovery run was `STARTED` and no canonical RETURN existed. This run therefore does not duplicate or pre-empt that global classification.

## Historical-pattern -> current-descendant map

| Historical vocabulary | Verified current descendant | Disposition candidate |
| --- | --- | --- |
| interchangeable worker/provider shell | identical `/wc` bootstrap + universal worker kernel | `MERGED_DESCENDANT` |
| worker dispatcher / collector | role-fluid allocator + durable queue/claims/runs/returns | `MERGED_DESCENDANT` |
| validator/evaluator | kernel validator + `VERIFY` role + independent critic law | `MERGED_DESCENDANT` |
| challenger | `CRITIQUE` role + `TEST/CRITIQUE -> REPAIR` wake stages | `MERGED_DESCENDANT` |
| integrator | `INTEGRATE_LOCAL` + local steward model + authority separation | `MERGED_DESCENDANT` |
| worker closure packet | durable `RETURN` + evidence/receipt + post-return re-entry | `MERGED_DESCENDANT` |
| provider adapters | no verified dedicated current module found in bounded audit | `SOURCE_DEBT_OR_GAP`, do not invent |
| old Worker Fabric runtime as one subsystem | no verified monolithic current component found | `DO_NOT_REVIVE_WITHOUT_GAP_PROOF` |

These are behavioral descendant mappings, **not claimed direct code lineage** unless exact historical bytes later prove it.

## What should be reused directly now

Preserve these current contracts as the implementation substrate for many interchangeable chats:

1. **Identical bootstrap, role-fluid execution.** Provider/model identity must not become job identity or authority.
2. **Exclusive durable claim before work.** Keep create-if-absent/CAS semantics and preserve-first behavior.
3. **Typed cognitive roles.** `DISCOVER`, `CRITIQUE`, `VERIFY`, `INTEGRATE_LOCAL`, recovery and context compilation are functional descendants of historical specialized worker stages without requiring separate provider-specific workers.
4. **Generator/evaluator/promoter separation.** A builder may test locally, but important gates still need fresh independent critique/verification and promotion remains separately authorized.
5. **Durable closure.** Claim -> `STARTED` -> checkpoints/evidence -> `RETURN` -> run `DONE` -> allocator re-entry is the closure protocol.
6. **Truth ceilings.** Passing validator/tests is candidate evidence, not proof of production swarm operation, Human Accepted, Current or Served.
7. **Recovery rather than silent takeover.** Stalled work is append-only recovered/superseded; late returns remain evidence.

## Falsified or unsafe assumptions

- **F1 — “Worker Fabric exists by name, therefore reuse its current code.”** Falsified for current `main` in this bounded audit. No monolithic current component was verified.
- **F2 — “A stale tree/path is enough provenance.”** Falsified. Several historical paths could not be reopened in current `main` or `gh-pages`.
- **F3 — “We need a new collector/evaluator/integrator runtime before broad `/wc` concurrency can work.”** Falsified as a prerequisite. Current kernel/allocator plus durable opportunity state already coordinate real concurrent claims; specialized roles provide the behavioral split. This does **not** prove the full canary or unattended factory.
- **F4 — “No search hit means retired/nonexistent.”** Rejected. It establishes source debt only.
- **F5 — “Passing kernel tests proves 50-worker operation.”** Explicitly rejected by the kernel receipt truth boundary.

## Remaining gap

The only Worker-Fabric-specific gap exposed here that is not already clearly covered by current kernel/allocator semantics is **exact historical provenance/lineage**, especially any real provider-adapter or collector/evaluator/integrator implementation clauses that may contain behavior absent from the modern descendant. That gap is already owned by the broader historical-mechanisms recovery lane; opening a duplicate opportunity now would create redundant work.

If that recovery later produces exact bytes, the correct follow-up is a **differential reuse audit**: historical clause/component -> modern descendant -> missing behavior -> testable donor patch. Do not create a compatibility layer merely to preserve old names.

## Deduplication / disposition

- No new opportunity created by this run.
- Current implementation/hardening is already represented by universal kernel/allocator/runtime lanes.
- Historical classification is already represented by `O-SWARM-HISTORICAL-WORKER-MECHANISMS-V1` and its active recovery attempt.
- This artifact should be consumed as route-changing archaeology evidence by later integration/planning, not promoted directly.

## Acceptance result

- runtime evidence inspected: **PASS**
- stale/historical refs separated from current wiring: **PASS**
- direct reuse map produced: **PASS**
- route-changing finding/falsification: **PASS**
- next work deduplicated: **PASS — no new duplicate opportunity**
- global promotion attempted: **NO**
