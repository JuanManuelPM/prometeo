# Historical Worker Mechanisms Adoption Ledger v1

Status: **SCOPED ARCHAEOLOGY CANDIDATE — NO GLOBAL AUTHORITY PROMOTION**  
Opportunity: `O-SWARM-HISTORICAL-WORKER-MECHANISMS-V1`  
Recovery run: `RUN-O-SWARM-HISTORICAL-WORKER-MECHANISMS-V1-REC3-20260917T1045-SOL56-REC3A`  
Purpose: reconcile named historical mechanisms against exact durable descendants so future workers reuse rather than recreate them.

## Truth boundary

This ledger classifies **functional adoption/disposition from inspected durable evidence**. It does not claim byte-for-byte historical lineage where the original historical bytes were not reopened. Search/path absence is never treated as proof of nonexistence or retirement. Candidate/tested artifacts are not promoted here to `Current`, `Human Accepted`, or `Served`.

Disposition vocabulary used here:
- **ACTIVE** — the mechanism's contract is directly evidenced in a presently used/binding path or durable product loop.
- **MERGED** — the historical behavior is materially represented by one or more current descendants; do not revive it as a parallel subsystem without differential gap proof.
- **SUPERSEDED** — a later explicit owner replaces the historical mechanism and the old mechanism should no longer own the behavior.
- **RETIRED_WITH_REASON** — explicit evidence says the mechanism is intentionally retired. **No named mechanism below is assigned this status from mere absence.**

## Adoption ledger

| Historical mechanism | Disposition | Durable descendant / reuse target | Evidence and boundary |
|---|---|---|---|
| **Worker Fabric** | **MERGED** | Universal Cognitive Worker kernel + role-fluid allocator + durable claim/run/RETURN/recovery lifecycle | `coordination/swarm-v1/kernel/UNIVERSAL_COGNITIVE_WORKER_KERNEL_V1.json`; `coordination/swarm-v1/allocator/ROLE_FLUID_ALLOCATOR_V1.json`; focused archaeology return `O-SWARM-ARCHAEOLOGY-WORKER-FABRIC-V1`. The focused audit found no need for a second monolithic fabric and mapped dispatcher/collector, validator, challenger, integrator and closure behaviors into the current descendant. Literal historical provider-adapter bytes remain source debt. |
| **Prompt OS** | **MERGED** | Agent Runtime/context compilation + binding universal-worker method/recipes | `coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md`; `scripts/build-agent-runtime.mjs`; focused archaeology return `O-SWARM-ARCHAEOLOGY-PROMPT-OS-V1`. Preserve Prompt OS as a cognitive-program dimension, but do not create another control-plane source of truth. |
| **Context Foundry** | **MERGED** | Agent Runtime compiled workstream context + worker L0/L1/L2 receipt contract + `CONTEXT_COMPILE` fallback | `scripts/build-agent-runtime.mjs`; `coordination/workstreams/chat-native-control-plane-v1/UNIVERSAL_COGNITIVE_WORKER_V1.md`; `coordination/swarm-v1/kernel/UNIVERSAL_COGNITIVE_WORKER_KERNEL_V1.json`; `coordination/swarm-v1/allocator/ROLE_FLUID_ALLOCATOR_V1.json`; Prompt OS archaeology return. Exact automatic **per-task** Working Set materialization remains `NOT_PROVEN`; extend the existing compiler/kernel path if that gap survives later verification rather than creating a parallel Foundry. |
| **Working Set** | **ACTIVE** | Bounded worker Working Set/context-receipt contract | Prompt OS archaeology explicitly verifies bounded Working Set/context receipt semantics and kernel L0/L1/L2 validation. Runtime materialization is not fully proven, so ACTIVE here means **contract/reuse owner is active**, not that every intended automation is operational. |
| **Page Change Thread** | **ACTIVE** | Existing P4 page-scoped Capture → OPEN thread → explicit work → immutable execution packet → RETURN → same-page result loop | Focused archaeology return `O-SWARM-ARCHAEOLOGY-PAGE-CHANGE-V1` plus its recovered P4 sources/tests/manifests. The safe bridge boundary is downstream: preserve `page_id/thread_id/work_item_id` and adapt frozen execution packets into swarm work; never build a parallel inbox/capture/result protocol. |
| **Prometeo Execute** | **ACTIVE** | P4 explicit `Trabajar` execution-packet/result state machine | Page Change archaeology verifies explicit work gating, immutable packet creation, execution, durable result ingestion, retry-safe FAILED/BLOCKED restoration, and same-page result routing. Browser-private E2E and deployed Supabase parity remain outside that proof ceiling. |
| **Book / RUNNING** | **MERGED** | Written Book → Canon → Forge dimension + durable method/run/evidence/continuation stack | `coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md` explicitly preserves `Written Book -> Canon -> Forge` as a big-picture dimension and defines the governing `... CAMPAIGN -> RUN -> EVIDENCE / RETURN -> INTEGRATION -> SUCCESSOR` stack. `coordination/workstreams/chat-native-control-plane-v1/ACTIVE_METHOD_VNEXT_CANDIDATE_V2.md` preserves governed execution/critique/integration and durable receipts. Literal historical `Book/RUNNING` artifact lineage was not reopened in this run, so this is **functional MERGED**, not a claim that old bytes were superseded or retired. |
| **Challenger** | **MERGED** | `CRITIQUE` role + `TEST_CRITIQUE -> REPAIR` lifecycle + independent-critic law | `coordination/swarm-v1/kernel/UNIVERSAL_COGNITIVE_WORKER_KERNEL_V1.json`; `ACTIVE_METHOD_VNEXT_CANDIDATE_V2.md`; Worker Fabric archaeology return. Independence remains required where falsification value depends on fresh perspective. |
| **Verifier / Validator** | **MERGED** | `VERIFY` role + worker validator + verification receipts | Kernel declares `VERIFY`, executable validator/test refs and durable truth boundaries; Active Method candidate requires evidence/receipt checks and explicit falsifiers. Candidate/test success is not production authority. |
| **Integrator** | **MERGED** | `INTEGRATE_LOCAL` + local Steward/Merger + separate authority/promotion path | Kernel declares `INTEGRATE_LOCAL`; Master Context names Steward/Merger separately; Active Method candidate requires immutable RETURN verification, semantic atomization, contradiction edges, steward adjudication and a separately authorized host mutation. This separation is stronger than reviving a universal integrator that can silently promote. |

## Preserve-first obligations

1. **Do not create a second Worker Fabric runtime.** Any missing historical behavior must first be demonstrated by a differential audit against kernel + allocator + lifecycle.
2. **Do not create a second Prompt OS / Context Foundry source of truth.** Extend the existing Agent Runtime/context-compile path only after the per-task materialization gap is re-verified.
3. **Do not rebuild Page Change capture/feed/RETURN routing.** P4 already owns the human-facing message/result loop; swarm adaptation starts at the frozen execution packet and ends at one compatible result disposition.
4. **Do not collapse challenger, verifier and integrator back into one authority-bearing worker.** Current descendants deliberately separate critique/verification/local integration from global promotion.
5. **Do not declare Book/RUNNING retired from name/path absence.** Preserve its functional laws through Written Book/Canon/Forge + durable run/evidence/continuation until exact old bytes can be compared.
6. **Do not infer authority from existence, tests, recency or this ledger.** `Current`, `Human Accepted`, and `Served` stay separately controlled.

## Contradictions and bounded gaps

- **Historical name vs current owner:** old subsystem names survive as useful concepts, but the inspected current architecture distributes their behavior across smaller owners. Recreating the old names as runtimes would duplicate capability unless a concrete missing behavior is proven.
- **Working Set contract vs automatic materialization:** bounded context receipts are evidenced; exact automatic per-task materialization was `NOT_PROVEN` by the focused Prompt/Context audit. This is a verification gap, not evidence that Context Foundry is absent.
- **Book/RUNNING literal lineage:** functional laws are visibly preserved, but exact historical artifact bytes were not recovered here. Keep this as source debt; do not fabricate archaeology.
- **Provider adapters / old closure artifacts:** Worker Fabric archaeology identified historical/stale references but did not reopen exact bytes. They remain source debt and may donate only proven missing clauses after provenance recovery.
- **P4 product E2E:** source-level logic and packaged identity are evidenced, while current private browser/Supabase E2E remains outside the archaeology proof ceiling.

## Exact evidence set consumed

- `coordination/opportunities/returns/O-SWARM-ARCHAEOLOGY-PROMPT-OS-V1/RUN-O-SWARM-ARCHAEOLOGY-PROMPT-OS-V1-20260917T0914-SOL56.json`
- `coordination/opportunities/returns/O-SWARM-ARCHAEOLOGY-WORKER-FABRIC-V1/RUN-O-SWARM-ARCHAEOLOGY-WORKER-FABRIC-V1-20260917T0915-SOL56.json`
- `coordination/opportunities/returns/O-SWARM-ARCHAEOLOGY-PAGE-CHANGE-V1/RUN-WC-PAGECHANGE-20260917T0913-5D72.json`
- `coordination/swarm-v1/kernel/UNIVERSAL_COGNITIVE_WORKER_KERNEL_V1.json`
- `coordination/swarm-v1/allocator/ROLE_FLUID_ALLOCATOR_V1.json`
- `coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/ACTIVE_METHOD_VNEXT_CANDIDATE_V2.md`
- predecessor recovery lineage under `coordination/opportunities/runs/O-SWARM-HISTORICAL-WORKER-MECHANISMS-V1/`

## Adoption decision

**Route change:** historical Worker Fabric / Prompt OS / Context Foundry / Page Change / Execute / Book-RUNNING / challenger-verifier-integrator mechanisms should be treated as **donor lineages and behavioral contracts**, not as a mandate to resurrect parallel control planes. Reuse the verified descendants above; open new implementation work only from a falsifiable, deduplicated missing-behavior gap.

This ledger is a scoped archaeology candidate. It mutates no shared project/product authority and makes no `Current`, `Human Accepted`, or `Served` claim.
