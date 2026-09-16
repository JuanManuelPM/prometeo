# Prometeo Chat Object / Parallel Worker Index v2

Status: CURRENT CURATED INDEX
Canonical full blueprint: `PRODUCT_BLUEPRINT_V2.md`
Current durable Chat Object: `CHAT_OBJECT.json`
Workstream: `chat-native-control-plane-v1`

## Core idea

The primary product is **not an Inbox between chats**. It is a system where a long-lived working identity exists outside any one ChatGPT conversation as a **durable Chat Object**.

Any fresh ChatGPT conversation can reincarnate that object, reconstruct what it is doing, and continue. The main Chat Object can also prepare many durable jobs in advance; fresh one-shot worker chats launch from tiny codes, mark execution state, leave durable returns and disappear. The parent sees worker progress/results as part of its own durable work state.

Normal coordination path:

`Chat Object -> prepared JOB -> independent Worker Run -> durable RETURN -> parent/steward integration`

Directed messages/events are optional for exceptional questions/collisions/corrections, not the center of the architecture.

---

## Objectives

### O01 — Reincarnation
Abandon any main conversation at any time; a new chat can select the same durable Chat Object and continue the exact frontier.

### O02 — Durable intelligence
Mission, objectives, architecture, design decisions, rules, negative knowledge, shared dependencies, worker state and next actions live outside the transcript.

### O03 — Self-documentation
While the main chat designs/builds, material insights are distilled into its durable Chat Object instead of being trapped in prose history.

### O04 — Parallel scale
The main Chat Object can prepare many jobs, keep doing useful work, and let several disposable worker chats execute them in parallel.

### O05 — Tiny human transport
The human should copy only `Prometeo`, a menu number, or a short launch code such as `Prometeo P-CC-04`; never a long prompt/context/return.

### O06 — Observable worker state
Parent derives PREPARED/STARTED/WORKING/RETURNED/DONE/boundary state from durable run evidence and knows partial/full batch completion.

### O07 — Safe convergence
One parent/steward reconciles overlapping candidate results; workers do not self-promote to canonical truth.

### O08 — Conversation erasure tolerance
Correct operation cannot depend on an old ChatGPT transcript, though ChatGPT history can be optional archaeology/evidence when available.

---

## Identity model

Do not collapse these identities:

- `project_id` — human umbrella.
- `chat_object_id` — durable conversational/operational identity that reincarnates.
- `workstream_id` — durable execution/coordination scope.
- `batch_id` — group of delegated parallel work.
- `work_item_id` — one prepared durable task.
- `worker_instance_id` — disposable execution/incarnation identity.
- menu number / launch code — temporary human-friendly alias only.
- platform conversation id — optional evidence only when exposed.

Current object:

`chat-object-prometeo-chat-control-main`

---

## Architecture

### A01 — Stable boot/Home
`Prometeo` loads stable entry. Fresh/unbound chat gets Home. Menu number resolves to project and preferred Chat Object.

### A02 — Durable Chat Object
`CHAT_OBJECT.json` is the manifest representing the main working identity. It points to FOCUS, blueprint/design, rules, Work Board, Shared Graph, PACK and evidence.

### A03 — FOCUS
Compact current objectives/frontier/blockers/open questions. Not a transcript summary.

### A04 — Design Board
`PRODUCT_BLUEPRINT_V2.md` captures architecture, rationale, ideas, hypotheses, current target and acceptance tests.

### A05 — Rules / negative knowledge
Persist invariants, must-preserve behavior, failed directions and prevention rules so reincarnated chats do not repeat settled regressions.

### A06 — Shared Graph
Track shared capabilities/owners/dependencies/adapters/workstreams. Reuse shared infrastructure instead of duplicating it locally.

### A07 — Work Board
`WORK_BOARD.json` indexes batches, prepared Work Items, launch codes and derived worker/result state.

### A08 — Prepublished jobs
A worker task exists before the worker conversation. Each `JOB.json` contains mission, context refs, preserve rules, scope, return contract and completion boundary.

### A09 — One-shot worker chats
Fresh chat receives `Prometeo <launch_code>`, resolves exact JOB, writes independent STARTED/run state, executes, writes RETURN/evidence, marks DONE/boundary and may disappear.

### A10 — Derived Control Room
Parent derives worker/batch status from independent run/return objects. No shared mutable central worker-status file.

### A11 — Parent/steward integration
Parent reads returns, detects conflicts, accepts/rejects/supersedes candidates, updates durable Chat Object state and optionally launches another batch.

### A12 — Progressive retrieval
Load compact Chat Object state first. Deep repository/chat archaeology only when needed to resolve a contradiction/missing detail.

### A13 — Optional targeted events
A small message/event path may later support questions/collisions/urgent corrections. It does not replace JOB/run/RETURN orchestration.

---

## Existing Prometeo pieces to reuse

### E01 — Stable Prometeo entry/bootstrap
Keep one stable boot authority.

### E02 — Agent Network v3
Reuse independent worker statuses, derived Network, convergence, NEEDS/PROVIDES/DEPENDS_ON/IMPACTS and no-global-lock semantics.

### E03 — EPOCH
Reuse as cheap freshness check.

### E04 — Compiled Work Packets
Reuse progressive relevant context instead of full repository rereads.

### E05 — Execution Packets
Reuse the existing principle that execution/recovery must not depend on chat identity; extend as/prep for delegated JOBs.

### E06 — RETURN
Reuse durable result/evidence. Add parent consumption states: UNCONSUMED/REVIEWED/INTEGRATED/REJECTED/SUPERSEDED/FOLLOWUP_REQUIRED.

### E07 — Current/Catalog/Lineage
Keep product authority separate from Chat Object memory/orchestration.

### E08 — Historical Planner/Compiler pattern
Preserve: `Planner/Compiler -> prebuilt jobs -> N workers -> returns -> validator/reconciler -> one Steward/Merger`.

### E09 — Recovery Sweep / worker batches
Preserve durable per-worker progress/return and parallel recovery patterns.

### E10 — SESSION_RETURN / rehydration lineage
Recover/reuse where concrete implementation still exists instead of inventing another incompatible return/recovery scheme.

---

## Problems detected

### P01
Long chats end or become unwieldy; useful state is trapped in transcript.

### P02
A fresh chat cannot reliably know what it is, what was decided or what not to break.

### P03
Previous parallel workflows often required the human to copy long prompts/context/results.

### P04
Parent cannot rely on conversational memory to know which workers actually started/finished.

### P05
Important design intelligence gets rediscovered because it was never converted to structured durable state.

### P06
Workers may rebuild capabilities that already have shared owners.

### P07
Parallel outputs can conflict without explicit integration authority.

### P08
Latest commit / candidate / worker says DONE can be confused with Current/Human Accepted/Served.

---

## New conclusions from the current iteration

### N01
`Chat Object` is the primary abstraction; Inbox is secondary.

### N02
Project and Chat Object are separate so one project may later have multiple durable working identities.

### N03
A Chat Object needs FOCUS + Design Board + Rules + Shared Graph + Work Board, not just a summary file.

### N04
Worker feedback normally returns through durable run/RETURN state, not conversational messages.

### N05
Jobs are compiled before a worker chat exists. Worker launch text is only an address.

### N06
The main Chat Object keeps working while child jobs run; worker progress is ambient state, not a blocking mode.

### N07
Worker lifecycle must support partial batch awareness: e.g. 5 started, 3 returned, 2 working.

### N08
Prometeo should use this mechanism to build itself. First batch `B-CHATOBJ-01` has six prepared jobs.

---

## First prepared self-building batch

`B-CHATOBJ-01`

- `P-CC-01` — runtime/compiler extension audit.
- `P-CC-02` — adversarial Chat Object/Work Item schema review.
- `P-CC-03` — tiny worker launch resolver.
- `P-CC-04` — Worker Run + batch status compiler.
- `P-CC-05` — fresh-chat reincarnation test harness.
- `P-CC-06` — historical architecture recovery + simplification review.

The jobs exist under `work-items/<work_item_id>/JOB.json`.

---

## Missing pieces

### M01
Wire runtime/compiler to natively compile `chat_object_id`, `work_item_id`, batch/run state and return-consumption state.

### M02
Make `Prometeo <launch_code>` fully executable end-to-end, including automatic independent run creation/STARTED.

### M03
Implement/compile derived Work Board state from independent run/return objects.

### M04
Create return-consumption/integration ledger.

### M05
Automatically bind a fresh reincarnation identity to a Chat Object.

### M06
Prove fresh-chat reincarnation with tests and actual second-chat trial.

### M07
Run first batch through disposable chats and integrate the six returns.

### M08
Bind Facultad and Alumnos to their own durable Chat Objects after recovering their exact current state.

### M09
Only then add targeted private event/message transport where JOB/run/RETURN proves insufficient.

---

## Errors not to repeat

1. Do not reduce the product to Inbox/Outbox.
2. Do not make transcript the database.
3. Do not make the human copy long prompts, context or returns.
4. Do not launch workers before durable JOBs exist.
5. Do not infer STARTED/DONE from silence or chat claims.
6. Do not make all workers mutate one central status file.
7. Do not block the main Chat Object merely because workers are running.
8. Do not broadcast all worker chatter.
9. Do not duplicate shared capabilities before owner discovery.
10. Do not allow worker candidates to self-promote to canonical truth.
11. Do not reread all history/network every turn.
12. Do not rebuild ChatGPT conversation/audio UI on the critical path.
13. Do not confuse FOCUS with a transcript summary.
14. Do not treat a higher version/newer commit as Human Accepted/Current/Served.
15. Do not rebuild old Prometeo mechanisms before checking whether Planner/Compiler/SESSION_RETURN/Execution Packet/Recovery infrastructure can be reused.

---

## Current frontier

The conceptual product is now defined and the first six jobs are prepublished. Next implementation frontier is:

1. update PACK/FOCUS/identity/runtime semantics to Chat Object model;
2. make launch codes and independent run state executable;
3. compile parent batch state;
4. run the first parallel self-building batch;
5. integrate returns through this Chat Object;
6. test full parent conversation erasure + reincarnation.
