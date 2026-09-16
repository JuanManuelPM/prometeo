# Prometeo Chat-Native Control Plane v1

Status: DESIGN FROZEN ENOUGH TO CONTINUE
Primary worker: `W-CHAT-NATIVE-20260916-1438-SOL`
Workstream: `chat-native-control-plane-v1`

## Mission

Turn ChatGPT itself into Prometeo's primary human interface while keeping Prometeo's durable external coordination/state as the source of operational continuity. The human should be able to speak naturally, spawn parallel specialist chats, leave, forget details, return later, and continue without manually transporting context between chats.

The system must remain useful even when an individual model instance is forgetful, shallow, or temporarily reasons poorly.

## Core architectural decision

Do **not** rebuild ChatGPT as a custom web application.

Use ChatGPT for:
- conversation;
- native voice/transcription;
- long-form thinking;
- branching/specialist chats;
- user-facing Home/control surface;
- generating/opening minimal worker commands/links.

Use Prometeo external infrastructure for:
- stable bootstrap;
- authority/current state;
- work packets;
- worker identity/state;
- EPOCH/freshness;
- inter-chat messages;
- durable focus;
- progress/results/returns;
- evidence and recovery.

Existing Agent Network v3 is a foundation and must be extended, not rebuilt.

## Curated idea index

### I01 — Universal immutable entry point
Maintain one eternal stable entry (`p.txt` / stable root) whose only job is to resolve the current boot/runtime authority. A model never chooses its own starting document.

### I02 — Deterministic boot before reasoning
Every material Prometeo turn follows a restore cycle before interpreting the new user message:
1. stable entry;
2. boot/runtime pointer;
3. EPOCH freshness check;
4. current/authority relevant to this workstream;
5. worker identity;
6. Inbox;
7. durable FOCUS;
8. compiled packet / relevant owner state;
9. only then reason about the user's new instruction.

### I03 — Every chat has a durable identity
Every participating chat/agent instance gets a `worker_instance_id` (the chat's "patente"). It may additionally record parent worker, role, spawn reason and workstream. The chat itself is disposable; the identity record and useful state are durable.

### I04 — Durable FOCUS per worker
A chat must not rely on rereading its whole conversation to know what matters. Maintain a compact durable FOCUS containing:
- mission;
- human goal;
- current frontier;
- settled decisions;
- must-preserve behavior;
- important discoveries;
- negative knowledge / known failed directions;
- unresolved questions;
- next actions.

FOCUS is **not** a transcript summary. It is an operational map.

### I05 — Private directed Inbox/Outbox
Add a message bus so chats can communicate without the human copying messages between them. Support directed routing to:
- exact worker;
- workstream;
- topic/capability;
- role;
- rare global broadcast.

Useful message types:
- FYI;
- REVIEW;
- CORRECTION;
- NEED;
- ANSWER;
- COLLISION;
- BLOCKER;
- REMINDER;
- HANDOFF;
- RESULT.

Inbox should be private infrastructure (prefer Supabase), while GitHub remains the durable public coordination/authority layer. Do not put private user transcripts or secrets in public network metadata.

### I06 — PRE_RESPONSE restore hook
Before every material response, a worker checks:
- did EPOCH change?
- are there relevant unread Inbox messages?
- did another worker invalidate an assumption?
- did a dependency change?
- am I colliding with another writer?
- does FOCUS still match the user's current request?
- am I about to repeat a known failure?

Only after this check should the model answer or write.

### I07 — Branches become parent/child specialist workers
A branch/critic chat is not a disconnected copy. It should be registered as a child worker with:
- `parent_worker_id`;
- specialist role (e.g. ADVERSARIAL_REVIEWER);
- spawn reason;
- scoped task.

The child publishes useful findings directly to the parent's Inbox. The human does not have to copy the critique back.

### I08 — ChatGPT-native Prometeo Home
The primary chat becomes the Home/control surface. A `Prometeo` invocation should reconstruct and show, from durable state:
- active workers;
- current frontier of each;
- blockers/collisions;
- relevant new messages;
- completed returns since last visit;
- what the human is actually trying to close;
- suggested coordination actions when objectively supported.

The Home should not trust conversational memory for worker counts/status.

### I09 — Natural capture/batching
Do not rebuild a note recorder as critical infrastructure. The human can send multiple text/voice messages naturally in ChatGPT, then use a semantic action such as `procesar` or `trabajar`. Prometeo can batch recent unsatisfied intent and divide it into work.

### I10 — Meta-orchestrator before spawning workers
Do not use `one request = one worker`. First classify and decompose the request, detect existing owners/workstreams and dependencies, then decide whether to:
- answer locally;
- continue current worker;
- spawn one specialist;
- spawn several parallel workers;
- ask another worker for information;
- wait on an existing dependency.

### I11 — Intent classes
Useful input classes:
- IDEA: store/develop, no automatic product mutation;
- CHANGE: concrete requested delta;
- PROBLEM: diagnose before changing;
- META: changes strategy/process rather than a product surface.

### I12 — Anti-hallucination execution gates
A worker should not merely be told to "think harder". Require structured gates:

**Identity gate**
- repository;
- epoch/current revision;
- work item;
- actual target;
- owner;
- served/candidate/writable identities.

**Reconstruction gate**
- exact human request;
- current behavior;
- requested delta;
- must-preserve map;
- known regressions;
- relevant previous returns;
- source/evidence refs.

If material identity/context cannot be resolved, stop rather than invent.

### I13 — Expansion + criticism after grounding
After factual reconstruction, run separate passes:
1. literal interpretation;
2. system-level goal;
3. stronger opportunity;
4. adversarial critique / assumptions;
5. revised approach.

Do not use arbitrary word-count requirements as a correctness proxy. Do not ask for vague "use all resources" behavior. Spend more reasoning only when it can reduce material uncertainty, regression risk or strategic error.

### I14 — Preserve maps / surgical deltas
Every material task should explicitly separate:
- `must_preserve`;
- `allowed_to_change`;
- `forbidden_without_human_request`.

A small request must not silently become a clean-slate redesign.

### I15 — Facts, accepted decisions and hypotheses are different
Never collapse:
- FACT;
- HUMAN_ACCEPTED;
- HYPOTHESIS/CANDIDATE.

A model cannot promote its own hypothesis to Human Accepted or Current merely because it implemented it.

### I16 — Negative knowledge and incident learning
Persist not only what works but what should not be repeated. When the human reports a regression, record the incident pattern, likely cause and prevention rule when evidence supports it. Load relevant prevention rules before modifying that subsystem again.

### I17 — Progressive context, not infinite context
Use staged retrieval:
- L0: identity + request + owner + rules;
- L1: relevant workstream/source/returns;
- L2: deep history/archaeology only when needed to resolve contradiction or missing authority.

Do not flood every worker with the entire repository/history by default.

### I18 — Risk-scaled cognition
Small local deltas can use a short execution path. Architecture/authority/runtime changes require deeper reconstruction, critique, dependency analysis and stronger verification. High-risk authority changes may require an independent reviewer.

### I19 — Evidence receipts
Workers do not merely say "done". Material completion should identify evidence such as changed files, commit/return refs, tests, regression checks and candidate/served identity where applicable.

### I20 — Derived system health
Prometeo Home should eventually derive a compact health view (not hand-maintained) covering at least:
- active/stale workers;
- hard collisions;
- unmet dependencies;
- unintegrated returns;
- orphan workstreams;
- current/catalog/runtime validity;
- last integrity check.

## Existing foundation that must be reused

Agent Network v3 already provides important pieces:
- independent worker status objects;
- compiled read-only Network view;
- EPOCH fast path;
- needs/provides/depends_on/impacts;
- convergence/collision semantics;
- disposable worker model;
- public/private coordination boundary;
- stable chat bootstrap.

Do not design a parallel replacement unless a concrete limitation proves necessary.

## Deprioritized / rejected directions

These are intentionally **not** on the critical path:
- rebuilding a floating Prometeo web button as the primary interface;
- custom browser audio capture/transcription as a prerequisite;
- duplicating ChatGPT's conversation UI;
- forcing the human to copy worker critiques/results between chats;
- making every worker read every other worker's state/messages;
- one central mutable status file edited by all agents;
- global heartbeat loops;
- arbitrary fixed word counts as proof of reasoning quality;
- vague instructions such as "use 100% of resources";
- treating larger version numbers or fresh commits as approval.

The previous button/audio experiments remain historical experiments, not the chosen strategic frontend.

## Delivery plan

### Phase 1 — Identity + Focus
- formalize `prometeo.chat-focus/v1`;
- register this chat's worker id;
- define parent/child metadata;
- define when FOCUS must update;
- make recovery possible from durable files without relying on this transcript.

### Phase 2 — Mailbox
- define private message schema and routing;
- implement Inbox query + unread cursor;
- implement publish/reply/ack semantics without heartbeat bureaucracy;
- enforce privacy boundary.

### Phase 3 — Universal bootstrap integration
- extend stable bootstrap/runtime so every material Prometeo response runs EPOCH → Inbox → FOCUS → packet/authority restore;
- keep same-EPOCH path cheap;
- avoid full resync unless relevant state changed.

### Phase 4 — Native Home
- make the primary ChatGPT conversation reconstruct active work, returns, blockers and messages from durable state;
- define minimal semantic commands (`Prometeo`, capture/batch/process/work/continue) without requiring exact wording.

### Phase 5 — Specialist/critic workflow
- formalize child workers and adversarial reviewers;
- child result goes directly to parent Inbox;
- parent consumes review before next material response;
- no human copy/paste return path.

### Phase 6 — Cognitive execution protocol
- add identity/reconstruction/preserve/evidence gates;
- add risk tiers, progressive context, negative knowledge and incident prevention;
- add critique/repair pass for material work.

### Phase 7 — Health + automatic orchestration
- derive system health;
- let Home decide when to continue, query, spawn, merge, wait or escalate;
- detect redundant workers and existing owners before spawning new work.

## Acceptance criteria

This workstream is not complete until all of these are true:

1. A fresh chat can load only the stable entry and recover this mission/frontier without access to this conversation transcript.
2. This chat can lose local conversational context and recover its worker identity + FOCUS + next action externally.
3. A child/critic chat can send a relevant review to this parent without the human transporting text.
4. Before a material response, the parent automatically notices that review.
5. Worker counts/status shown by Home come from durable/derived state, not guesses.
6. Relevant context is loaded progressively; unrelated project history is not dumped into every worker.
7. Small user corrections preserve existing behavior by default.
8. Claims of completion carry evidence.
9. Facts, Human Accepted state and hypotheses remain distinct.
10. The human can become tired, forget prior instructions, or return from another chat without losing the plan represented here.

## Current frontier

Do **not** spend the next cycle on UI.

Next material step: specify and implement the minimal `FOCUS + private MAILBOX + PRE_RESPONSE` extension on top of Agent Network v3, then wire it into the universal chat bootstrap. Validate recovery with at least one parent chat + one critic child before expanding further.
