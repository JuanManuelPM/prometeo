# Autonomous Swarm Operating Model v1

Status: BINDING TARGET MODEL
Owner: `chat-object-prometeo-chat-control-main`
Purpose: turn Prometeo from a parent that manually prepares numbered workers into a durable self-assigning swarm where the human can usually send only `.` to a bound parent, or the same generic bootstrap to any number of fresh worker chats.

## 0. Human contract

The normal human role is intentionally tiny.

### Bound parent
The human may send only:

`.`

The parent MUST reconstruct current durable state, inspect workers/returns/opportunities, perform useful work, and either continue autonomously or surface the smallest real platform/human boundary.

The human MUST NOT be required to remember:
- what batch is active;
- which chats were launched;
- which workers returned;
- what the plan was;
- which project needs attention;
- what prompt each worker needs;
- which result should be copied back;
- what the next wave should be.

### Fresh parent
A fresh conversation needs one stable reincarnation locator until there is native/global Prometeo resolution. That locator reconstructs the durable parent Chat Object and current frontier.

### Fresh generic worker
Target interaction is the SAME prompt for every fresh worker chat:

`PROMETEO → https://juanmanuelpm.github.io/prometeo/w`

The worker does not receive a manually selected number or JOB. It discovers current durable opportunities, claims exactly one safely, announces/persists the claim, works it, returns durably, then looks again for useful safe continuation before becoming idle.

The `/w` entrypoint is a TARGET interface until its claim/queue protocol is implemented and canary-tested. Never pretend it is operational before then.

---

# 1. Core shift: from assigned workers to self-assigning workers

Old flow:

`parent chooses JOB -> human opens chat -> pastes unique code -> worker executes`

Target flow:

`Planner publishes opportunities -> human opens any number of identical workers -> each worker independently selects + atomically claims one opportunity -> executes -> returns -> rechecks world`

This removes the human as worker allocator and removes the need for numbered clipboard commands.

Workers are fungible execution shells; durable opportunity identity is not tied to a conversation.

---

# 2. Opportunity Queue

Prometeo maintains a durable queue of work that MAY be claimed.

An opportunity is not necessarily implementation. Types include:
- BUILD
- RESEARCH
- ARCHAEOLOGY
- CRITIQUE
- VERIFY
- TEST
- INTEGRATE_ASSIST
- RECOVERY
- PROJECT_DISCOVERY
- CONTEXT_COMPILE
- PLAN
- COMPACT
- DOCUMENT

Minimum opportunity fields:
- `opportunity_id`
- `project_id`
- `chat_object_id` or unresolved project root
- `campaign_id`
- `priority`
- `type`
- `mission`
- `dependencies`
- `required_capabilities`
- `read_scope`
- `write_scope`
- `authority_class`
- `claim_mode`
- `return_contract`
- `created_from` (human intent / return / incident / planner / worker proposal)
- `status`: `PREPARED | READY | BLOCKED | CLAIMED | STARTED | RETURNED | DONE | FAILED | STALE | SUPERSEDED`

The queue is derived/canonical enough for execution but does NOT confer Current/Human Accepted/Served authority on returned content.

---

# 3. Claim / pin protocol

The user's remembered "pin" is an atomic durable claim.

A generic worker:
1. boots `/w`;
2. loads global continuity head + queue;
3. filters READY opportunities compatible with its available tools/model/context;
4. ranks by global priority, dependency readiness, information value and collision risk;
5. attempts an atomic claim on the best candidate;
6. if the claim loses a race, reloads and tries the next candidate;
7. after successful claim, persists `STARTED` before material work.

Recommended storage:

`coordination/opportunities/claims/<opportunity_id>.json`

Create-if-absent acts as the first simple compare-and-swap. If creation fails because the claim exists, the worker MUST NOT overwrite it and must select another opportunity.

The claim contains:
- opportunity_id
- run_id
- worker_instance_id
- claimed_at
- claim_epoch/head
- lease/heartbeat policy if required
- write_scope

This is the machine-readable signal that makes "worker is working" externally observable.

---

# 4. Worker lifecycle

Normal lifecycle:

`READY -> CLAIMED -> STARTED -> WORKING -> RETURNED -> DONE`

Exceptional:

`BOUNDARY | FAILED | STALE | CANCELLED | SUPERSEDED`

Truth rules:
- missing claim/run = NOT_LAUNCHED / NOT_CLAIMED;
- claim without STARTED = CLAIMED but not yet substantive work;
- STARTED without recent heartbeat/progress may become STALE;
- RETURNED means durable result exists;
- DONE requires durable return unless job explicitly defines a no-return terminal;
- silence is never evidence of work;
- worker chat disappearance is recoverable state, not a reason for human archaeology.

---

# 5. After-job continuation: workers should not waste the remaining chat

A worker that finishes its assigned opportunity MUST perform a POST_RETURN scan before going idle.

It may do ONE of the following, in priority order:

1. **Claim another READY opportunity** if:
   - it still has sufficient context/tool capability;
   - scopes do not create unsafe shared writes;
   - its previous job does not require a fresh independent critic;
   - the queue protocol allows multi-claim sessions.

2. **Perform a bounded follow-up verification/critique** if the completed job's contract explicitly authorizes it.

3. **Create proposal(s) for future work** in its own append-only proposal scope when it detects:
   - missing dependencies;
   - a useful critic;
   - an implementation follow-up;
   - an unresolved contradiction;
   - a new test/vaccine;
   - a project opportunity.

4. **Assist convergence read-only** by producing a comparison/coverage artifact if a parent-visible return batch is ready and the role allows it.

5. If no safe useful work exists, persist `IDLE_NO_SAFE_WORK` and stop.

Workers MUST NOT manufacture work merely to stay busy. More compute is useful only when it reduces uncertainty, completes dependencies, improves evidence, or produces reusable artifacts.

---

# 6. Worker proposals: future planning from every edge

Every worker may notice work the parent did not pre-plan.

Therefore each run may append proposals under its isolated subtree:

`.../runs/<run_id>/proposals/<proposal_id>.json`

A proposal contains:
- problem/opportunity noticed;
- evidence;
- expected value;
- dependencies;
- suggested role/type;
- estimated independence/collision risk;
- whether it should be immediate or parked;
- suggested falsification/test.

Proposals are CANDIDATES, not automatically READY jobs.

Planner/Compiler (or a safe queue compiler) consumes proposals, deduplicates them, resolves dependencies/owners and promotes useful ones into the Opportunity Queue.

This is how workers can "prepare the next five chats" without the human having to invent them.

---

# 7. Planner / Compiler becomes continuous metabolism

Planner is not a one-time planning document.

It continuously consumes:
- human goals;
- current project/campaign frontier;
- worker RETURNs;
- incidents;
- Goldens/Vaccines;
- worker proposals;
- blocked dependencies;
- stale/failed runs;
- unintegrated returns;
- project discovery results.

It emits:
- new opportunities;
- dependency changes;
- critic/verifier jobs;
- integration opportunities;
- retries/supersessions;
- project-level next waves;
- parked future work.

The planner optimizes for:
- highest expected value;
- information gain;
- unblock value;
- parallel independence;
- low collision risk;
- explicit falsification;
- low human friction.

Do not optimize for keeping 20 chats busy at any cost.

---

# 8. Multi-root Prometeo: "duplicate the parent" correctly

Do not literally clone one parent transcript.

Create/recover multiple durable root Chat Objects/campaign controllers over the same substrate.

Initial roots already registered:
- `project-prometeo-chat-control`: Prometeo itself;
- `project-facultad`: faculty/study ecosystem;
- `project-alumnos`: tutoring/students ecosystem.

Current registry says Facultad and Alumnos still require durable discovery/binding. Those become explicit PROJECT_DISCOVERY opportunities.

Target topology:

`GLOBAL PROMETEO CONTROL PLANE`

-> Prometeo root / system evolution

-> Facultad root / courses, exams, study systems, materials

-> Alumnos root / students, classes, material pipelines, scheduling/teaching systems

-> future roots as durable projects appear

Each root owns:
- mission;
- project north;
- FOCUS;
- campaigns;
- opportunity queue slice;
- memory/context pointers;
- workers/returns;
- next actions.

A global allocator may prioritize READY work across roots, while owner/steward authority remains project-scoped.

This achieves the user's intuition that "you become all the chats" without conflating identities or authorities.

---

# 9. Global worker allocator

Generic `/w` workers should be able to take useful work across projects.

Selection order should consider:
1. urgent real deadlines/blockers;
2. ready integration needed to unlock many dependents;
3. high-value project frontier;
4. stale/failure recovery;
5. high-information critic/test;
6. safe background work;
7. future planning/compaction.

The allocator must respect:
- privacy boundaries;
- required tools/connectors;
- project-specific authority;
- user deadlines;
- model capability;
- write collision risk.

Workers never infer sensitive personal priorities merely from unrelated history; project priorities come from durable project state and explicit user goals.

---

# 10. Parent `. ` protocol

A bound parent's response to `.` is an execution cycle, not a conversational acknowledgement.

PRE_RESPONSE cycle:
1. load stable entry + Continuity Head;
2. load bound Chat Object + FOCUS + governing method;
3. refresh relevant worker claims/runs/returns;
4. consume newly returned evidence that can be safely consumed;
5. inspect Planner queue/proposals/blockers;
6. perform the highest-value work possible in this parent session;
7. if implementation can proceed safely, execute it;
8. if more parallel workers would materially accelerate the frontier, ensure opportunities are prepared;
9. only ask human to open chats when the platform cannot spawn them itself;
10. persist changed frontier before responding.

Human-visible response should normally be tiny:
- what changed;
- whether human action is genuinely required;
- if required, one reusable command and a count, not a long explanation.

The detailed reasoning/state belongs in durable artifacts, not in text the user must read.

---

# 11. Continuity Head: one machine-readable "what now"

Prometeo needs one compact global entry that any successor, Live screen or worker can read first.

Target file:

`coordination/CONTINUITY_HEAD.json`

It should contain pointers/derived summary only, not duplicate whole memories:
- current schema/version/epoch;
- active root Chat Objects;
- active campaigns;
- number of READY/CLAIMED/STARTED/RETURNED/DONE/FAILED/STALE opportunities;
- high-priority blockers;
- unconsumed returns;
- current parent frontier per root;
- generic worker bootstrap;
- fresh parent reincarnation bootstrap;
- queue pointer;
- event/progress ledger pointer;
- Live data pointer;
- last meaningful progress event;
- minimum next human boundary, if any.

If this parent chat disappears, a fresh successor starts from Continuity Head instead of relying on the transcript.

---

# 12. Prometeo Live is passive telemetry, not the brain

Live must NEVER become required for correctness.

Its job is ambient visibility from a TV/secondary screen.

Default visual state:
- black background;
- no title/logo/header noise;
- one subtle animated activity light/ring when workers are active;
- giant short counts:
  - `N trabajando`
  - `N terminaron`
  - `N esperando señal`
  - `N con problema` only when nonzero;
- one short natural-language line such as `Juntando arquitectura` or `2 chats todavía están investigando`;
- a small progress trace, not fake percentage;
- one discreet toggle containing all technical detail/recovery commands.

Do NOT show historical old batches by default once they are irrelevant.

The detailed toggle may include:
- exact worker IDs/states;
- project roots;
- batches;
- returns;
- blockers;
- recovery commands;
- copy generic worker prompt;
- copy parent reincarnation prompt;
- event ledger.

Live is read-only projection of durable control state.

---

# 13. Real progress metric

Do not invent a percentage of an undefined project.

Maintain an append-only `PROGRESS_EVENTS` ledger.

Meaningful event examples:
- worker STARTED;
- worker RETURN durable;
- return integrated;
- dependency/gate cleared;
- incident resolved;
- capability canary passed;
- architecture decision accepted;
- implementation test passed;
- new project root successfully reincarnated;
- stale work recovered;
- human friction removed.

Live can bucket these events by 2-hour windows and draw a simple activity/progress graph.

A higher score can weight events by impact/unblock value, but raw event counts and categories must remain inspectable.

No cron is required merely to draw two-hour buckets; the page can bucket timestamped durable events at render time. A periodic compiler may later derive richer metrics.

---

# 14. Resource utilization principle

Available chats are abundant but not free of coordination cost.

Target behavior:
- use many workers when work is truly parallelizable;
- give each independent ownership or read-only scope;
- reserve fresh independent agents for criticism where independence matters;
- allow useful multi-job continuation after a worker returns;
- avoid idling a capable chat when safe high-value work exists;
- avoid duplicate low-information work;
- measure parallel speedup versus integration entropy.

The success metric is not `% of chats occupied`.
It is `useful durable progress per human intervention and per coordination cost`.

---

# 15. Self-improving loop

The full target metabolism is:

`human goal`
-> Root/Project North
-> Planner/Compiler
-> Opportunity Queue
-> generic workers claim
-> STARTED / work / RETURN
-> Validator/Steward
-> Memory/Canon/Current updates through proper authority
-> incidents/vaccines/proposals
-> Planner recompiles
-> next opportunities
-> repeat

Parent chats and worker chats may disappear at any point. Durable state must be sufficient to continue.

---

# 16. What is currently missing before this is real

Do not confuse target model with implemented capability.

Still required:
1. reconcile B-BIGPIC-01 returns into Architecture/Method vNext;
2. implement canonical Opportunity Queue schema;
3. implement atomic claim/lease protocol;
4. implement generic `/w` worker bootstrap and resolver;
5. implement queue compiler from Planner + worker proposals;
6. implement POST_RETURN continuation policy;
7. create global Continuity Head compiler;
8. bind Facultad root through durable discovery;
9. bind Alumnos root through durable discovery;
10. implement progress-event ledger/derived two-hour telemetry;
11. reduce Live to passive minimal projection;
12. canary-test multiple simultaneous identical generic workers for collision safety;
13. test worker loss, stale claim, retry and supersession;
14. test parent deletion/reincarnation while multiple projects/campaigns are active;
15. test no-human-result-transport across several generations of worker waves.

---

# 17. Immediate strategic order

Current priority is NOT Live cosmetics.

1. Finish/resolve remaining B-BIGPIC-01 scouts.
2. Converge the full batch into a compact Architecture/Active Method vNext.
3. Make the first implementation campaign specifically the autonomous swarm kernel:
   - Opportunity Queue;
   - atomic claims;
   - generic worker bootstrap `/w`;
   - Continuity Head;
   - Planner/queue compiler;
   - post-return continuation;
   - stale/retry semantics;
   - multi-worker collision canary.
4. In parallel, create PROJECT_DISCOVERY work for Facultad and Alumnos so multiple root Chat Objects become real.
5. Once the kernel works, move Prometeo itself onto the generic queue and stop manually preparing most numbered worker prompts.
6. Then use the same machinery for Facultad and Alumnos.
7. Keep Live as a thin passive view over the same control state.

This is the transition from "Prometeo can launch workers" to "Prometeo continuously creates, allocates, integrates and regenerates useful work across durable project selves."
