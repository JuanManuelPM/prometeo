# PROMETEO AGENT NETWORK v3 — EXECUTION FREEZE

Status: `PLAN_FROZEN / PREPARED_FOR_DOT`

This document exists so a future ChatGPT/agent can execute the complete multi-chat coordination upgrade without depending on this conversation. It is planning/coordination only; it is not product authority and does not alter Current, Human Accepted, Served, V53 or P4 acceptance state.

---

# 0. WHY THIS EXISTS

Prometeo already has a durable authority system, Catalog, Current Graph, Lineage, Context Foundry, receipts, Reincarnation, Input Ownership, capability ownership, an Agent Runtime v2, compiled Work Packets, a stable public entrypoint, a legacy-chat bootstrap, a global semantic delta feed and a visible Prometeo Seal.

The remaining failure mode is social/parallel: several already-open chats can continue improving Calendar, YouTube/media, José/Study, PageKit, Navigator, Capture and other surfaces while never loading the new runtime, or while each retains only its own local conversation context. Good discoveries can remain trapped in one chat; two chats can independently duplicate a capability; one can miss that another changed a dependency; the human can again become the middleware who remembers who did what.

The next phase must eliminate that failure mode without creating an agent-management bureaucracy.

North star:

> Many disposable chats should behave like one coordinated Prometeo nervous system. The human should work on products, not administer agents.

Primary efficiency metric:

> `durable_useful_delta_per_turn`

Checks, plans, status writes and receipts are not progress by themselves. Coordination artifacts are justified only when they reduce future reasoning, prevent drift, propagate reusable learning, or remove human friction.

---

# 1. EXISTING AUTHORITY THAT MUST BE PRESERVED

Before any implementation, reincarnate current durable authority from the existing Prometeo boot. Do not infer truth from this document alone.

Preserve these distinctions:

- latest commit != Current;
- Candidate != Human Accepted;
- Human Accepted != Served;
- Served bytes must not be treated as authority merely because they are online;
- V53 remains the human-visible accepted Navigator basis unless Current authority says otherwise;
- V23 remains the accepted physics oracle, not a replacement visible frontend;
- P4 Capture remains a separate candidate/integration workstream;
- Agent Network is coordination infrastructure only and must never write product authority pointers as a side effect of coordination.

Do not redesign V53, add another global visible shell, move Human Accepted pointers, or promote candidate product work while implementing Agent Network.

---

# 2. HUMAN EXPERIENCE TO ACHIEVE

## 2.1 Already-open unaware chats

There is one unavoidable external boundary: an already-open chat that never learned the private meaning of `Prometeo` cannot be retroactively taught by GitHub alone.

Therefore the one-time human action is intentionally tiny:

`PROMETEO → <short bootstrap URL>`

After one successful bootstrap in that conversation, the human should never paste the URL again.

## 2.2 Normal recovery command

`Prometeo` means:

1. RESYNC.
2. RECOVER the last materially unsatisfied human intent.
3. Identify the active workstream/surface.
4. Read the tiny current epoch.
5. If freshness changed, load the current compiled Work Packet; otherwise continue from the already-loaded packet.
6. Reconcile only relevant deltas.
7. Select the correct execution profile.
8. CONTINUE the unfinished human request.
9. End with the correct seal if runtime state was actually loaded.

It must not mean “describe Prometeo”. It must not ask the human to repeat recoverable context.

## 2.3 Dot command

`.` means CONTINUE CURRENT FRONTIER.

If a materially sufficient context/map/specification already exists, dot must not regenerate it. It loads freshness/deltas and resumes execution.

If the current agent has no loaded runtime state, dot first performs a Prometeo resync and then continues the previously agreed next action.

## 2.4 Seal

- `🟣 P✓ · <WORKSTREAM>` = stable runtime + one compiled packet successfully loaded for this work cycle.
- `🟡 P~ · <WORKSTREAM>` = runtime is active, but a genuine human/external authority boundary blocks further continuation.
- `🔴 P! · PROMETEO` = runtime/authority could not be loaded safely.
- no violet seal = human should not assume Prometeo was active.

Never use the violet seal decoratively.

---

# 3. ARCHITECTURE: DO NOT LET EVERY CHAT EDIT ONE SHARED FILE

A literal shared mutable file edited by all workers creates last-writer-wins loss and unnecessary conflict. The correct model is:

```text
worker A status ─┐
worker B status ─┼──> compiler ──> NETWORK.json ──> EPOCH.json
worker C status ─┘                    │
                                     ├──> convergence view
Git branch activity ----------------─┤
PACK/RETURN -------------------------┤
DELTA_FEED --------------------------┘
```

Workers own only their small status/event object. `NETWORK.json`, `EPOCH.json`, convergence outputs and compiled packets are derived read-only artifacts.

This provides a “chat of chats” without putting several agents in contention for one document.

---

# 4. NEW DURABLE OBJECTS

## 4.1 Worker Status

Canonical source pattern:

`coordination/network/workers/<worker_instance_id>.json`

A worker instance is one disposable chat/agent execution identity, not a human account identity. Generate a short random/ULID-style identifier on first material registration. Multiple chats may belong to the same workstream without writing the same file.

Minimum schema:

```json
{
  "schema": "prometeo.worker-status/v1",
  "worker_id": "W-...",
  "workstream_id": "calendar-life-preview",
  "repo": "JuanManuelPM/prometeo",
  "branch": "work/calendar-life-preview",
  "mode": "LAB",
  "profile": "DEEP",
  "state": "ACTIVE",
  "current_intent": "short non-private material intent",
  "frontier": "what is materially next",
  "last_useful_change": "one compact useful-delta summary",
  "known_head": "git sha",
  "write_scope": ["..."],
  "topics": ["calendar", "habits"],
  "depends_on": ["capture.voice-intake"],
  "provides": ["calendar.habits-traces"],
  "needs": [],
  "impacts": ["calendar"],
  "candidate_shared_discoveries": [],
  "epoch_seen": "opaque epoch id",
  "updated_at": "ISO timestamp"
}
```

Rules:

- no transcript content;
- no private Patent content;
- no secrets;
- no detailed user personal data;
- no heartbeat every message;
- update only when a material frontier, dependency, useful change, state or head changes;
- status may become stale; stale does not mean dead.

Worker state enum should at minimum support:

`ACTIVE | WAITING_DEPENDENCY | HUMAN_BOUNDARY | EXTERNAL_BOUNDARY | DONE | STALE | UNKNOWN`

## 4.2 Workstream Pack

Continue existing `coordination/workstreams/<id>/PACK.json` concept.

A workstream is a durable product/capability task scope. Worker status is ephemeral/disposable participation in it.

A future workstream should not require manual insertion into a giant central list. The v3 compiler must discover packs from the workstream directory plus compatibility entries from current `NOW.json`.

## 4.3 NETWORK.json

Published derived artifact:

`agent-runtime/network.json`

Purpose: compact semantic “chat of chats”.

It must contain only coordination metadata needed to understand:

- active/recent workstreams;
- participating workers;
- repo/branch heads;
- current material intent/frontier;
- last useful change;
- write scopes;
- dependencies;
- needs;
- provides;
- impacts;
- convergence candidates;
- hard collisions;
- stale/unknown state;
- packet URLs.

It must not expose private conversation content.

## 4.4 EPOCH.json

Published derived artifact:

`agent-runtime/epoch.json`

This must be intentionally tiny.

Recommended structure:

```json
{
  "schema": "prometeo.epoch/v1",
  "epoch": "E-<short semantic hash>",
  "runtime": 3,
  "network": "<short network hash>",
  "deltas": 12,
  "current": 17,
  "manifest": "/prometeo/agent-runtime/manifest.json"
}
```

The exact numeric revisions may change after reincarnation; do not hardcode example values.

Epoch inputs should include only changes capable of altering agent decisions, such as:

- runtime contract/profile revision;
- workstream registry/worker semantic status;
- global delta feed revision;
- relevant branch heads/workstream activity index;
- authority revision when coordination needs to know Current changed.

Do not bump the semantic epoch for generated timestamps alone.

## 4.5 Convergence output

Published derived artifact:

`agent-runtime/convergence.json`

Each item should distinguish:

- `HARD_WRITE_COLLISION`: overlapping material write scopes likely to conflict;
- `DEPENDENCY_CHANGED`: provider changed something consumed by another active workstream;
- `SHARED_OWNER_CANDIDATE`: two local implementations/discoveries appear to belong to one shared capability;
- `NEED_SATISFIED`: one workstream produced evidence/output another explicitly needed;
- `INFORMATIONAL_IMPACT`: useful cross-chat learning, no write conflict.

Do not turn these into global locks. They are routing signals.

---

# 5. EPOCH PRE-FLIGHT: THE FAST PATH

Every Prometeo worker that is already bootstrapped should use this rule before material work:

```text
read EPOCH
   │
   ├── same as packet/worker epoch_seen
   │      └── continue immediately; no Network/Delta archaeology
   │
   └── changed
          └── load latest compiled Work Packet
                 └── packet already contains only relevant deltas/convergence
```

The agent should not manually read full `NETWORK.json` every turn.

`NETWORK.json` is primarily for routing/debugging and for the compiler. Compiled packets remain the main agent consumption surface.

This is how global awareness becomes cheap enough to use routinely.

---

# 6. WORKSTREAM AUTO-DISCOVERY AND REGISTRATION

## 6.1 Existing active workstream

If conversation intent matches a compiled active workstream, load that packet.

## 6.2 Known Catalog surface without active workstream

Use the generated Catalog surface card + GENERAL packet. Read only what changes the current decision.

GENERAL grants read/recovery context, not material write authority.

## 6.3 Material writes begin on an unregistered surface

Scaffold a small workstream automatically:

- stable workstream id;
- product/capability target;
- repo;
- candidate/work branch;
- write scope;
- human intent;
- already-decided constraints recovered from conversation/source;
- relevant topics/capabilities;
- first worker status.

Do not create a global architecture document for every local change.

## 6.4 External repositories

A workstream may point to another repository such as José. Code remains in its repository. Its coordination status may live as a unique worker/workstream file inside Prometeo so the network compiler has one place to aggregate coordination metadata.

Never claim external repo write capability if the connected tools do not actually permit it.

---

# 7. NEED / PROVIDE / IMPACT / DEPENDENCY SEMANTICS

These fields must be operational, not decorative.

## NEEDS

Something this workstream cannot efficiently finish until another workstream/human/external system provides it.

Examples:

- public Capture recorder contract;
- PageKit release candidate;
- human choice between two visual alternatives.

## PROVIDES

A durable output/capability another workstream may consume.

Examples:

- `capture.voice-intake/v1`;
- `study.hint-ladder/v2`;
- `input.pointer-ownership/v1`.

## DEPENDS_ON

A named capability/workstream whose material change may invalidate assumptions in this workstream.

## IMPACTS

Workstreams/topics that should receive a semantic delta if this change is promoted/accepted enough to matter.

## CANDIDATE_SHARED_DISCOVERY

A reusable law/mechanism discovered in one product but likely owned elsewhere.

Required fields should include:

- short discovery;
- symptom_surface;
- candidate_owner;
- likely_consumers;
- evidence refs;
- confidence.

The system must distinguish where a problem appeared from who should own the reusable solution.

---

# 8. CONVERGENCE DETECTION

The compiler should compute convergence cheaply from declared metadata + Git paths.

## 8.1 Hard write collision

If two active workers/workstreams have overlapping non-derived write scopes and both have material activity, emit a hard collision.

Do not automatically merge or lock. Tell affected packets to reconcile ownership before continuing overlapping writes.

## 8.2 Dependency change

If provider workstream branch/head changes paths associated with a capability in another workstream's `depends_on`, emit only to that consumer.

## 8.3 Shared owner candidate

If two workstreams report similar candidate shared discoveries or both add parallel page-local mechanisms for a known shared capability, emit convergence candidate.

Do not force extraction until evidence supports it.

## 8.4 Need satisfaction

If one workstream's provides/output matches another active need, mark it as potentially satisfied and include evidence pointer. Consumer decides whether it is sufficient.

## 8.5 Informational impact

Global semantic deltas such as Input Ownership or a verified cross-product design law propagate only to matching topics/consumers.

---

# 9. DELTA FEED v2

Keep the current principle:

> Global DELTA_FEED contains only discoveries that can materially change another workstream.

Do not flood it with every commit.

Agent Network v3 should add an automated candidate-delta stage:

```text
worker status / Git activity / returns
          ↓
 candidate semantic deltas
          ↓
 deterministic filters + existing evidence
          ↓
 global delta when cross-workstream relevant
```

Where semantic interpretation cannot be safely automated, keep it as a candidate attached to affected packets rather than pretending it is canonical knowledge.

Local implementation details remain in branch Git history and RETURN.

---

# 10. COMPILED WORK PACKET v3

Upgrade the existing v2 compiler rather than replacing the architecture.

Each v3 packet should include:

1. workstream identity;
2. repo + branch + actual head;
3. mode and default execution profile;
4. short human intent;
5. already-decided constraints;
6. write scope;
7. known failures / do-not-touch;
8. current saved frontier;
9. last useful local delta;
10. worker(s) currently associated with the workstream;
11. `epoch_seen` and current epoch;
12. relevant unseen global deltas;
13. relevant convergence items;
14. relevant dependency changes;
15. unsatisfied needs;
16. newly satisfied needs;
17. branch delta since last known head;
18. relevant upstream-main changes touching scope;
19. conditional read graph;
20. execution profiles;
21. seal metadata.

Packet rule:

> If a fact cannot change the current decision, do not force the agent to read it.

Private Capture/Patent content remains out of public compiled packets.

---

# 11. EXECUTION PROFILES — PRESERVE EXACT INTENT

## FAST

Use for explicit local reversible changes without material architecture ambiguity.

Sequence:

`load packet -> execute -> critique -> repair -> batch falsifying checks`

Do not make title maps for a 5px button adjustment.

## DEEP

Use for structural/design-heavy or materially ambiguous tasks.

Sequence:

1. CONTEXT FIRST: write the material understanding that can change execution.
2. COMPLETE MAP: write all meaningful titles/parts before diving into part one.
3. DEVELOP: resolve important decisions under those headings.
4. EXECUTE: implement as much as possible.
5. CRITIQUE actual output.
6. REPAIR worker-soluble problems in the same cycle.

## EXHAUSTIVE

Use when the human explicitly requests exhaustive/numbered coverage or omission risk is high.

- complete requested map once;
- no filler to satisfy a number;
- freeze plan;
- later turns continue it;
- N/A/DEFER with reason is better than fake work.

## CONTINUE

Use when adequate context/map/spec already exists or user sends dot.

- refresh epoch;
- recover only new deltas;
- resume saved frontier;
- do not restart broad planning.

Loop breaker:

> after the same strategy fails twice without new evidence, change strategy instead of adding more checks.

---

# 12. LEGACY CHAT RECOVERY

The new system must preserve the work of chats that operated before bootstrap.

When a legacy chat receives the bootstrap:

1. Load stable entry/runtime.
2. Infer its current surface/workstream from its own conversation.
3. Recover last materially unsatisfied request from that conversation.
4. Inspect the relevant product source / Git history.
5. If a known head exists, inspect only head delta.
6. Preserve useful work; do not reset because protocol changed.
7. If material writes will continue and no workstream exists, register a scoped workstream + worker status.
8. Record useful discoveries/needs/impacts compactly.
9. Continue the prior task.
10. Seal response.

Repeated `Prometeo` must be idempotent: resyncing twice should not create duplicate workstreams/workers or duplicate semantic deltas.

---

# 13. RETURN IS OPTIONAL ACCELERATION

Do not make the human audit handoffs.

Preferred recovery priority:

1. current compiled packet / worker status;
2. current conversation;
3. LAST_RETURN if fresh;
4. small Git delta from known to actual head;
5. conditional authority/source reads;
6. ask human only after durable recovery paths genuinely fail.

RETURN may contain:

- last useful change;
- next frontier;
- new needs;
- provides;
- shared discovery candidates;
- negative knowledge;
- last epoch seen.

Missing RETURN must not trigger project archaeology.

---

# 14. PRIVACY

Public derived coordination artifacts must never contain:

- raw private transcripts;
- private Patent snapshots;
- credentials;
- Supabase secrets;
- token-gated private data;
- unnecessary personal calendar/finance contents;
- verbatim sensitive conversation text.

Use compact task semantics such as “integrate habits view” instead of private content.

Preserve existing PUBLIC / PROJECT / LOCAL privacy and declassification rules. Agent Network does not create a new declassification path.

---

# 15. SHORT BOOTSTRAP EXPERIENCE

Create a shorter stable public URL, preferably:

`https://juanmanuelpm.github.io/prometeo/p.txt`

It should contain/point to the current legacy bootstrap. The long `.well-known/...` URL remains canonical fallback.

Human one-time message to an unaware open chat should become exactly:

`PROMETEO → https://juanmanuelpm.github.io/prometeo/p.txt`

After successful boot, human uses only `Prometeo` or `.`.

Do not require a paste of this execution document into each chat.

---

# 16. NETWORK COMPILER

Prefer extending `scripts/build-agent-runtime.mjs` or splitting small pure modules if clarity improves. Do not create a separate competing compiler.

Inputs:

- runtime contract;
- execution profiles;
- Catalog/surface registry;
- workstream PACK directory;
- worker status directory;
- LAST_RETURN where present;
- DELTA_FEED;
- Git branch heads and relevant path activity;
- current authority revision metadata only as needed.

Outputs:

- `manifest.json` v3;
- `epoch.json`;
- `network.json`;
- `convergence.json`;
- `activity-index.json`;
- `workstreams/<id>.json` compiled packets;
- `surfaces/<id>.json` route cards;
- GENERAL packet;
- optional compact per-workstream unseen-delta fragment if packet size warrants it.

Derived output must be deterministic apart from explicitly excluded generated timestamps. Hashes should not churn because `generated_at` changed.

---

# 17. NOW / REGISTRY MIGRATION

Current `NOW.json` manually lists active workstreams. Preserve compatibility during migration.

Target:

- `NOW.json` becomes global routing/configuration + compatibility layer;
- workstream discovery primarily scans `coordination/workstreams/*/PACK.json` and status metadata;
- compiler derives active index;
- manual central-array editing is no longer required for every future workstream.

Do not abruptly delete existing `active_workstreams` until v3 compiler and tests prove parity.

---

# 18. PUBLICATION

Create/update a v3 runtime workflow that:

1. checks out main;
2. fetches known worker branches required by current registry;
3. compiles runtime;
4. validates schemas/invariants;
5. publishes only derived coordination artifacts to `gh-pages`;
6. never rewrites product HTML/Navigator pages;
7. publishes `p.txt`, Entry, manifest, epoch, network, convergence, packets and route cards;
8. preserves Pages product bytes outside this derived subtree.

Avoid publisher competition like the earlier shell injection problem.

One owner per published runtime artifact family.

---

# 19. VALIDATION THAT ACTUALLY MATTERS

Do not create a huge ceremonial test suite. Minimum falsifying scenarios:

## Scenario A — unchanged epoch

Worker has current packet and `epoch_seen = current`.

Expected: no Network/Delta crawl; worker continues immediately.

## Scenario B — irrelevant global change

José changes a study-only detail. Calendar epoch changes globally but its refreshed packet contains no material delta from that change.

Expected: Calendar does not read José implementation details.

## Scenario C — relevant dependency change

Capture changes a declared recorder contract consumed by Calendar.

Expected: Calendar packet contains dependency delta before further Capture-dependent implementation.

## Scenario D — disjoint parallel work

Calendar writes Calendar scope; Capture writes shared/capture scope.

Expected: no collision; both proceed.

## Scenario E — hard collision

Two workers declare overlapping `shared/input/**` writes.

Expected: convergence output emits HARD_WRITE_COLLISION to affected packets only.

## Scenario F — shared discovery

José discovers reusable pointer deadzone behavior and marks candidate owner `shared/input`.

Expected: relevant consumers receive candidate semantic delta; unrelated workstreams do not.

## Scenario G — stale/missing RETURN

Worker branch advances several commits without updating RETURN.

Expected: compiler derives small Git delta; no full archaeology.

## Scenario H — legacy chat

A chat that worked before runtime receives `PROMETEO → p.txt`.

Expected: recovers prior intent/work, registers only if needed, continues, produces seal.

## Scenario I — privacy

Worker status attempts to include forbidden private fields.

Expected: validation rejects/strips unsafe public compilation.

## Scenario J — authority

Network is healthy but product candidate is not Human Accepted.

Expected: runtime never reports candidate as Current/Human Accepted/Served solely from Network state.

---

# 20. IMPLEMENTATION ORDER ON DOT

The next dot should execute this order continuously unless a genuine external/human boundary appears:

1. Reincarnate current Prometeo and verify this plan is still applicable.
2. Reconcile main changes since this plan was frozen; preserve newer compatible improvements rather than overwriting them.
3. Create/use candidate branch `candidate/agent-network-v3-20260907`.
4. Load TITLE_INDEX and this EXECUTION_FREEZE; do not regenerate the plan.
5. Audit current Agent Runtime v2 compiler/workflow/Entry/NOW/DELTA/AGENTS.
6. Define JSON schemas or validators for worker status/network/epoch/convergence only where they reduce ambiguity.
7. Implement worker-status discovery.
8. Implement workstream directory auto-discovery with backward-compatible NOW inputs.
9. Implement semantic Network compilation.
10. Implement convergence detection.
11. Implement semantic epoch generation.
12. Upgrade Work Packet compiler to v3.
13. Add short `p.txt` bootstrap publication.
14. Update Entry/AGENTS/runtime contract to v3 semantics without duplicating the same rules in several owners; point to one canonical runtime contract.
15. Update runtime workflow publication ownership.
16. Add only the falsifying tests above plus any test needed for a discovered bug.
17. Run compiler/tests; repair failures and continue.
18. Publish candidate derived runtime artifacts without touching product pages.
19. Verify public Entry -> Epoch -> Manifest -> Packet routing.
20. Simulate at least two workers + one irrelevant delta + one relevant convergence event.
21. Verify legacy bootstrap route.
22. Record durable evidence/RETURN/frontier.
23. If all automatable coordination work is proven, leave clear human instruction for one-time bootstrap of currently open unaware chats.
24. Do not claim those existing chats have actually bootstrapped until the human sends them the one-line message and they respond with a legitimate seal.
25. Stop only at a true human/external boundary, not because a numbered subsection ended.

---

# 21. THINGS THE DOT MUST NOT DO

- Do not re-plan this work from scratch.
- Do not produce another 100-item map to replace TITLE_INDEX.
- Do not add global heartbeat infrastructure.
- Do not add distributed locks unless a concrete collision cannot be handled by branch/write-scope reconciliation.
- Do not require the human to maintain worker IDs, Returns, heads or epochs manually.
- Do not make every chat read NETWORK on every message.
- Do not push private transcript/Patent data into public runtime.
- Do not auto-merge unrelated branches.
- Do not make Agent Network product authority.
- Do not redesign V53.
- Do not turn checks into the main workload.
- Do not stop after creating schemas without implementing the actual compiler/runtime behavior.
- Do not declare open legacy chats synchronized without evidence from those chats.

---

# 22. DEFINITION OF DONE FOR THE AUTOMATABLE PHASE

Agent Network v3 automatable implementation is done when all are true:

- stable Entry points to runtime v3;
- short one-line bootstrap URL is public;
- `epoch.json` is public and semantically stable;
- `network.json` is compiled from independent worker/workstream state rather than hand-maintained chat summaries;
- workstreams can be discovered/scaffolded without central-list ceremony;
- multiple workers can coexist without writing one shared mutable status file;
- compiled Work Packets include only relevant unseen deltas/convergence information;
- unchanged epoch provides a true cheap fast path;
- dependency/impact/need/convergence semantics work in the falsifying scenarios;
- stale RETURN recovery uses Git delta;
- external-repo workstreams can be represented safely;
- public compilation excludes private user payloads;
- runtime workflows publish only derived coordination artifacts;
- product authority remains untouched;
- runtime tests/public verification pass;
- durable Return/frontier explains any remaining human-only step.

Human rollout is a separate empirical step: already-open unaware chats must each receive the one-line bootstrap once. Their violet seal is evidence that a particular chat actually loaded Prometeo; infrastructure cannot manufacture that fact remotely.

---

# 23. THE FINAL OPERATING MODEL

```text
                           HUMAN
                             │
                     normal conversation
                             │
        ┌────────────────────┼─────────────────────┐
        │                    │                     │
     worker A             worker B              worker C
        │                    │                     │
  own status file      own status file      own status file
        │                    │                     │
        └─────────────┬──────┴────────────┬────────┘
                      │                   │
                 Git activity       Workstream packs
                      │                   │
                      └────────┬──────────┘
                               ▼
                         NETWORK COMPILER
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
             EPOCH         NETWORK       CONVERGENCE
                │                              │
                └──────────────┬───────────────┘
                               ▼
                    COMPILED WORK PACKET
                               │
                    relevant deltas only
                               │
                               ▼
                            AGENT
                               │
                         useful work
                               │
                    critique + repair
                               │
                               ▼
                     durable useful delta
```

The human should never again need to be the “chat of chats”.

---

# 24. NEXT-DOT SEMANTICS

For this prepared workstream, the next `.` means:

> Reincarnate current Prometeo, load the frozen Agent Network v3 plan, reconcile only new changes since freeze, then implement the entire automatable Nervous System workstream continuously: independent worker status, auto-discovered workstreams, EPOCH fast path, derived NETWORK, NEED/PROVIDE/IMPACT semantics, convergence detection, relevant delta compilation, Work Packet v3, short bootstrap, publication and falsifying validation. Preserve all current product authority and parallel work. Do not replan, do not create ceremony for its own sake, do not stop between subsections, and stop only at a genuine human/external boundary. Leave durable state so another fresh agent can continue without this conversation.
