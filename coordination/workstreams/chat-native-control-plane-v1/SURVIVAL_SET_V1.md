# Prometeo Chat Object Survival Set v1

Status: BINDING PRODUCT REQUIREMENT INDEX
Owner: `chat-object-prometeo-chat-control-main`
Purpose: prevent silent loss of requirements when the human forgets, the parent conversation disappears, a model is replaced, or parallel workers diverge.

This file is deliberately redundant with the blueprint. A future incarnation must use it as a checklist against silent invariant loss.

## S01 — Human memory is optional
Prometeo must keep operating if the human remembers nothing except how to type `Prometeo`, a Home number, or a short worker launch code.

The human is not the durable:
- scheduler;
- collector;
- comparator;
- integrator;
- context bus;
- project memory.

## S02 — Conversation is disposable compute
Any ChatGPT conversation may disappear at any time. No material mission, design, method, rule, worker state, return, failure lesson or next frontier may exist only in that transcript.

## S03 — Durable Chat Object
Every long-lived working identity must have a stable `chat_object_id` with external self-description sufficient for a fresh chat to reincarnate it.

Required durable layers:
- identity;
- mission / human goal / success conditions;
- FOCUS/current frontier;
- architecture/design map;
- accepted decisions vs hypotheses/candidates;
- invariants/must-preserve behavior;
- negative knowledge / regressions / prevention rules;
- shared capability/owner/dependency graph;
- Work Board/batches/jobs/runs/returns;
- evidence/lineage/current refs;
- exact next actions.

## S04 — Fresh-chat reincarnation
A new chat must be able to recover the durable object without the old transcript.

Canonical path:
`Prometeo -> Home -> number -> project_id -> chat_object_id -> reincarnation`

When platform conversation-history search is available, it is optional archaeology/evidence only.

## S05 — Stable names and identity
Menu numbers, launch codes, filenames and human labels are aliases, never durable identity.

Uncertain names/transcribed tokens must not be silently normalized into a new branch/project/object. Preserve uncertainty until resolved.

## S06 — Written Mind / self-documentation
The active Chat Object must convert material reasoning into durable structured state during work.

Persist at least:
- new goals;
- changed assumptions;
- architecture decisions;
- new rules/invariants;
- failures and prevention rules;
- discovered shared owners/capabilities;
- new work items/batches;
- worker-return consumption decisions;
- blocker/frontier changes.

Persist distilled operating truth, not raw transcript dumps.

## S07 — Active Method / Survival Set governs future work
The current method and these survival requirements must be loaded before material architecture/runtime changes. A later chat cannot silently drop them merely because a newer prompt is shorter.

## S08 — Progressive context
Do not flood every reincarnation/worker with all history.

Use:
- L0: identity + request + governing rules;
- L1: relevant Chat Object/workstream/job/current returns;
- L2: deeper Git/ChatGPT archaeology only when a contradiction/gap requires it.

## S09 — Preserve-before-invent / archaeology
Before creating a new mechanism, search for existing Prometeo owners/patterns, including:
- Agent Network;
- EPOCH;
- Work/Execution Packets;
- RETURN / SESSION_RETURN / rehydration;
- Planner/Compiler;
- Recovery Sweep;
- PREPARE / DIRECT / EXECUTE;
- Steward/Merger;
- Context Foundry / source-card / Working Set lineage;
- prior Goldens/vaccines/incidents.

Adopt/extend before rebuilding unless a concrete limitation proves otherwise.

## S10 — Work exists before worker
A delegated worker chat is never the task definition.

Parent prepares a durable JOB first with:
- work_item_id;
- parent chat_object_id;
- mission/why;
- exact context refs;
- baseline/current refs;
- must-preserve map;
- allowed/forbidden write scope;
- verification requirements;
- return contract;
- completion/boundary rules.

Only then may the human launch a fresh worker with a tiny address such as `Prometeo P-CC-04`.

## S11 — One worker / one mission / one return
A normal disposable worker should execute one prepared mission to one durable return, then terminate. Do not turn worker chats into new long-lived undocumented project islands.

## S12 — Worker lifecycle is durable evidence
Parent must never guess whether a worker exists or finished.

Lifecycle:
`PREPARED/DISPATCHABLE -> CLAIMED -> STARTED -> WORKING -> RETURNED -> DONE`

Exceptional terminal states:
`BOUNDARY | FAILED | CANCELLED | SUPERSEDED`

STARTED must be persisted before material execution. DONE requires durable return/evidence.

## S13 — Detect human launch failure
A prepared job with no run object is **not started**. This lets the parent distinguish:
- worker was never launched / human forgot;
- worker started but is still working;
- worker started and hit a boundary;
- worker returned/done.

No inference from silence.

## S14 — Independent worker state
Workers write independent run/status/return objects. Do not make all workers mutate one shared mutable status file. Parent views/counts are derived.

## S15 — Parent keeps working
The parent Chat Object does not block merely because workers are active. It continues its own useful work and refreshes batch state when relevant.

## S16 — Partial/full batch awareness
Parent must be able to derive states such as:
- 6 dispatchable, 0 started;
- 5 started, 1 never launched;
- 5 started, 3 returned, 2 working;
- 5 returned, 1 boundary;
- 6/6 terminal and ready for integration.

When batch completion changes the best next action, the parent should surface it naturally.

## S17 — No human result courier
Worker returns are durable and parent-readable. The human must not have to copy the worker's answer back into the parent chat.

## S18 — Parent/steward integrates
Worker completion is not canonical promotion. One owning parent/steward:
1. reads returns;
2. compares facts/candidates;
3. detects conflicts;
4. checks Current/owners/invariants;
5. accepts/rejects/supersedes outputs;
6. integrates artifacts when authorized;
7. updates Chat Object state;
8. prepares follow-up jobs when useful.

## S19 — Authority separation
Never collapse:
- FACT;
- HYPOTHESIS/CANDIDATE;
- HUMAN_ACCEPTED;
- Current;
- Served;
- worker says DONE;
- newest commit/version.

Workers and Chat Objects coordinate work; they do not manufacture product authority.

## S20 — Shared owner resolution
Before duplicating a reusable capability locally, resolve whether it already has a shared owner. Record NEEDS / PROVIDES / DEPENDS_ON / IMPACTS where useful.

## S21 — Preserve map on changes
For material changes distinguish:
- must_preserve;
- allowed_to_change;
- forbidden_without_human_request.

Small correction != clean-slate redesign.

## S22 — Deep work and critique
For architecture/high-risk work use grounded sequence:
context/reconstruction -> meaningful map -> develop -> execute -> adversarial critique -> repair -> evidence.

Reasoning length/word counts are not evidence of quality.

## S23 — Fresh critic / challenger when risk warrants
Important architecture/authority changes may use a separate critic/challenger worker. The critic returns durable findings; parent/steward decides what survives.

## S24 — No premature parallel scale
Before relying heavily on many parallel workers, prove one complete observed canary cycle:
prepared JOB -> tiny launch -> durable STARTED -> durable RETURN -> DONE -> parent observes/integrates -> parent reincarnates with result intact.

Only then scale the pattern aggressively.

## S25 — Failure/incident learning
If a worker/chat/regression fails, preserve useful negative knowledge and prevention tests/rules so later incarnations do not rediscover the same failure.

## S26 — Source/evidence reopening
Important facts/decisions should carry concrete durable refs that a later incarnation can reopen. Historical source closure matters more than vague memory.

## S27 — Parent conversation loss during active workers
If the parent chat disappears while workers run, a new parent incarnation must reconstruct:
- same chat_object_id;
- same Work Board;
- exact jobs;
- which runs actually started;
- which returned/done;
- which returns are unconsumed;
- exact integration frontier.

## S28 — Worker conversation loss
If a worker chat disappears after writing STARTED but before RETURN, parent must see a non-terminal/stale run rather than incorrectly assuming completion. It may retry/supersede according to explicit policy.

## S29 — Optional targeted events, not Inbox-first architecture
Directed messages/events may later support exceptional questions, collisions or urgent corrections. Normal orchestration remains:
`Chat Object -> JOB -> Run -> RETURN -> parent integration`.

## S30 — ChatGPT-native interface
Do not rebuild conversation UI, voice capture or transcription as a prerequisite when ChatGPT already supplies them. External Prometeo infrastructure should supply continuity, identity, execution state, authority and evidence.

## S31 — Zero-memory human experience
If the human returns disoriented/forgetful and sends only `Prometeo`, Home/reincarnated Chat Object must be able to say, from durable state:
- what this object is;
- what is currently being attempted;
- what workers/jobs exist;
- which ones actually started/returned;
- what has changed since last parent incarnation;
- the smallest safe next human action, if any.

Do not require the human to remember the plan.

## S32 — One canonical recovery point / successor principle
There must always be a clearly identifiable current durable recovery state for the Chat Object. Historical snapshots/returns remain evidence, but a fresh chat needs one current operating head rather than choosing among ambiguous 'latest-looking' files.

## S33 — Update truth / rollback
Material mutations need evidence and, where applicable, rollback/recovery identity. A newer artifact is not automatically the confirmed target head.

## S34 — Provider/model replaceability
The architecture should work with a mediocre/replacement model because deterministic boot, scoped jobs, evidence, rules and authority gates carry the intelligence. Do not depend on one chat being unusually smart forever.

## S35 — Human intervention is a boundary, not normal plumbing
Human action is acceptable for real consent/identity/physical/external boundaries and, currently, opening a fresh ChatGPT worker and pasting a tiny launch code. Do not outsource recoverable orchestration to the human.

---

# Current canary gate

Before launching the full six-worker batch `B-CHATOBJ-01`, prove `B-ZEROMEM-01` end-to-end.

Passing means:
1. Parent prepares pilot job durably.
2. Human opens one new chat and pastes only its short launch command.
3. Worker writes durable STARTED.
4. Worker reconstructs the parent Chat Object without this transcript.
5. Worker writes a durable RETURN proving what it recovered.
6. Worker writes DONE.
7. Parent observes all of this from GitHub without the human copying the worker answer.
8. Parent integrates/records the canary result.
9. A fresh parent chat can later recover that the canary passed.

No full parallel fan-out before this observed cycle passes.
