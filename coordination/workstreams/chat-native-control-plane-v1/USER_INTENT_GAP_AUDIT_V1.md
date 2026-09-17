# User Intent Gap Audit v1

Status: BINDING GAP LEDGER
Owner: `chat-object-prometeo-chat-control-main`
Purpose: preserve the user's actual operating intent, distinguish target behavior from current reality, and prevent future successors from mistaking specifications or demos for completed capabilities.

## Core user phrases / intents that must survive

1. "Yo solamente debería mandar un punto." The bound parent should reconstruct and execute from durable state without asking the human to remember or design the next step.
2. "No dependemos de ese chat." Any parent/worker conversation may disappear without losing project identity, method, work state or next action.
3. "Vos pasarías a ser todos los chats si lo hacés bien." Many chats should share one durable cognitive operating model and divide useful work, not behave like disconnected assistants.
4. "No estamos llegando al 20% de los recursos." Available parallel chats should be used aggressively when they can create independent durable value; avoid artificial serialization.
5. "Mando el mismo prompt a varios chats." Workers should self-select distinct work through an exclusive durable claim/pin; the human should not number or route them.
6. "Que lo primero que haga sea marcar lo que va a hacer." Claim/STARTED evidence must precede substantive work so other workers can see ownership.
7. "Cuando terminen, revisen y hagan algo útil." POST_RETURN should let workers re-check the system, claim further compatible work, propose future work, verify results, or stop explicitly.
8. "Los otros también pueden ver cómo vienen los demás." Workers/control plane should expose active attempts, returns, blockers and stale states sufficiently for coordination and assistance.
9. "Los chats también pueden planificar a futuro." Workers may append evidence-backed candidate proposals; Planner/Compiler should convert useful proposals into later opportunities.
10. "Prometeo, Facultad, Alumnos..." Multiple roots should progress in parallel over one shared control substrate while preserving root-specific identity, privacy and authority.
11. Live should be passive ambient telemetry: black/minimal, working/done/waiting/problem counts, one short natural-language line, real progress history, technical details behind a toggle, and eventually the minimum human action such as `Abrí N workers`.
12. Progress must be real, not decorative: derive from durable events/results over time rather than fake percentages.
13. A worker that STARTED but never returns must not block forever; the system needs explicit lease/heartbeat/stale/retry/supersession and safe recovery semantics.
14. A fresh successor must recover the same strategic posture, not merely facts. It should load a durable Master Context / Active Method / critical posture and know the checkable stages to the north star.
15. Human-visible output should be brief. Long architecture dumps are internal recovery material, not normal UX.
16. The system should preserve historical Prometeo ideas and indexes; omission must not silently retire a concept.
17. Parent should keep working while workers run and re-check their status during/after its own work when useful.
18. The long-term curve comes from recursive metabolism: results -> integration -> learning -> replanning -> next wave, not simply more simultaneous chats.

## Reality audit

### A. Dot-only parent continuation
Target: user sends `.` and parent acts.
Reality: PARTIAL/PASS for recovery. DOT_CONTINUATION_PROTOCOL and Continuity Head exist and a fresh parent already reincarnated and advanced without transcript restatement.
Gap: the parent is still a chat-turn process; it does not wake itself after the turn ends. True continuous background operation requires an external scheduler/runtime/event trigger.

### B. No dependency on one parent chat
Target: disposable parent.
Reality: MATERIAL PASS for handoff/reincarnation.
Gap: Continuity Head is still manually maintained rather than deterministically compiled from source truth. A stale manual head is still a systemic risk until compiler promotion.

### C. Same mentality / strategic posture in successors
Target: fresh parent understands the whole system and hidden intent.
Reality: PARTIAL. `PROMETEO_MASTER_CONTEXT_V1.md`, Big Picture, Survival Set and Anti-Limitation rules exist.
Gap: loading is protocol-based, not enforced by a hard validator. A successor can still under-read, over-explain or drift. Need a successor parity exam / orientation receipt before strategic parent authority.

### D. "You become all chats"
Target: shared cognition across many disposable chats.
Reality: EARLY PARTIAL. Durable queue/claims/returns create shared state.
Gap: workers currently receive narrow task context. The `/wc` canary does not explicitly load the full Master Context or a compact canonical Cognitive Kernel/METHOD_HEAD. This is good for task isolation, but means workers do not yet share the parent's full strategic posture. Need role-sensitive context compilation: full strategic kernel for planners/stewards, minimal kernel + task context for ordinary workers.

### E. One identical prompt, automatic self-assignment
Target: no numbered prompts/manual routing.
Reality: ACTIVE CANARY. `/wc` + Q-CANARY-SWARM-01 + create-if-absent claim files implement the first real version.
Gap: not production `/w`; queue is hand-seeded, not automatically compiled from goals/returns/proposals.

### F. Pin first, then work
Target: visible ownership before substantive work.
Reality: ACTIVE CANARY. Claim then STARTED is required.
Gap: need canary proof under simultaneous collisions and a validator that rejects work/results lacking a valid claim/STARTED lineage.

### G. Worker keeps producing after first result
Target: workers re-check and continue useful work.
Reality: PARTIAL CANARY. `/wc` allows one additional claim after DONE.
Gap: intentionally bounded; no mature continuous worker metabolism, no dynamic budget, no role switching, no automatic fresh-critic rule during chained work.

### H. Workers see/help other workers
Target: active workers can understand system progress and help rather than duplicate/wait.
Reality: WEAK/PARTIAL. Workers see claims and can reload the queue.
Gap: they do not yet consume a compiled Control Room view of other runs, blockers, return quality, stale risk, or opportunities for read-only assistance. This is a major missing coordination layer.

### I. Workers propose future work
Target: each worker can leave useful next-wave ideas.
Reality: SPEC-ONLY. Proposal opportunity/spec exists conceptually.
Gap: no operational append-only proposal inbox + dedup + Planner promotion loop yet.

### J. Continuous Planner / second-generation work
Target: one goal causes successive worker generations automatically.
Reality: NOT YET OPERATIONAL. Planner/DAG design exists, but current canary queue was manually populated by parent.
Gap: this is one of the largest reasons the growth curve still feels sublinear. Until returns/proposals/incidents automatically compile the next queue, extra workers consume a finite manually prepared batch instead of growing capacity recursively.

### K. Automatic replacement of lost workers
Target: STARTED without signal does not block progress.
Reality: ONE-OFF RECOVERY EXISTS for BIG-09/BIG-13.
Gap: generic lease/heartbeat/STALE/retry/supersession is still specification, not runtime. The recovery lane was manually authorized by parent instead of derived automatically.

### L. Parent works while workers run
Target: no idle waiting.
Reality: PARTIAL/PASS in recent parent behavior: it produced Queue/CHead/Claim/Events specs while BIG-09/13 were pending.
Gap: parent still lacks a compiled work allocator that continuously chooses between integration, planning, spec/build work and worker monitoring. Decision remains model reasoning over files rather than deterministic campaign metabolism.

### M. Multi-root Prometeo / Facultad / Alumnos
Target: independent roots progress concurrently.
Reality: NOT YET OPERATIONAL beyond Prometeo. Facultad/Alumnos are registered and currently have read-only discovery opportunities.
Gap: no durable Chat Objects/Project North/FOCUS/campaign queues bound for Facultad or Alumnos yet; no global allocator across roots.

### N. Live as ambient control screen
Target: black/minimal ambient status, counts, progress trace, hidden details, tells user minimum action.
Reality: PARKED / NOT IMPLEMENTED in the requested final form.
Gap: current Live work should not be mistaken for this target. It still needs a derived Control Room feed, launch-demand calculation, stale/problem signals and progress-event aggregation. It is intentionally lower priority than the core loop.

### O. Real progress history / every ~2 hours
Target: visual trace of meaningful progress over time.
Reality: SPEC-ONLY. Progress Events candidate spec exists.
Gap: no canonical event writer/aggregator, no time-bucket compilation, no durable `meaningful_progress` metric, no scheduled/background 2-hour sampler. On-demand derivation is possible but not yet automatic.

### P. Human should know how many chats to open without thinking
Target: Live/parent says `Abrí N workers` from current demand.
Reality: PARTIAL MANUAL. Continuity Head currently stores a suggested canary wave of 6.
Gap: no algorithm yet deriving N from READY queue depth, dependencies, expected duration, collision risk, root priorities, context/tool compatibility and current active workers.

### Q. Human should not read long parent reports
Target: terse action-oriented UX.
Reality: NOT RELIABLY ENFORCED. Recent successor emitted long summaries.
Gap: need a parent output contract/validator with default response budget, e.g. state + human action + optional toggle/details, while full reasoning stays durable.

### R. Historical Prometeo ideas should not disappear
Target: preserve-before-invent and explicit retirement only.
Reality: PARTIAL. Big Picture + Anti-Limitation + Master Context preserve many recovered concepts.
Gap: known historical source debt remains. Several scouts could not reopen literal older R-era/FABRIC/Prompt-OS artifacts. Need a dedicated historical archaeology/coverage pass and an explicit concept ledger: ACTIVE / MERGED / SUPERSEDED / RETIRED_WITH_REASON.

### S. Context Foundry should prevent context bloat while preserving intelligence
Target: each worker gets exactly the right context, not giant transcript dumps.
Reality: PARTIAL DESIGN. Current `/wc` opportunities contain manually selected `read_scope`.
Gap: no automatic Context Foundry compiler selecting L0/L1/L2 context by role/task/freshness/evidence. This will become a scaling bottleneck as queue/root count grows.

### T. Validation / critics / quality scaling with quantity
Target: more workers should not merely produce more untrusted prose.
Reality: ARCHITECTURE EXISTS, RUNTIME PARTIAL.
Gap: no automatic validator/challenger insertion policy based on risk, novelty, authority or disagreement; no quality score should be invented, but explicit evidence/test gates are needed before integration.

### U. True autonomous background compounding
Target implicit in "avanzar a mil por hora": work should continue even when human leaves.
Reality: NOT PROVIDED BY CHAT TURNS ALONE. A chat executes when invoked; after it responds it does not spontaneously wake later.
Gap: to get real unattended compounding, Prometeo needs an external event loop/scheduler (e.g. GitHub Actions, Supabase/Edge/cron, webhooks or another authorized runtime) that can inspect durable state, dispatch/trigger permitted compute, run compilers and update projections. Chat-only architecture can minimize human prompts but cannot itself create endless background turns.

## Highest-leverage gaps, ordered by compounding value

1. Finish the identical-worker collision canary and validate claims/runs/returns.
2. Close BIGPIC missing domains through recovery returns; promote final architecture/method correctly.
3. Build Planner -> Queue compiler so work generation stops being manually seeded.
4. Build generic stale/retry/supersession so vanished chats never become gates.
5. Build operational POST_RETURN + Proposal pipeline so workers create useful next work.
6. Build Control Room projection so parent/workers can see each other and act on blockers.
7. Build role-sensitive Cognitive Kernel/Context Foundry compilation so successors/workers share the right mentality without loading everything.
8. Bind Facultad + Alumnos as real roots and add global allocator.
9. Add external event loop for true unattended/background metabolism.
10. Only then make Live the passive ambient projection and human launch-demand surface.

## Success criterion for exponential/compound behavior

Do not call the system compounding merely because N chats run in parallel. The transition is demonstrated only when:

1. one human goal enters once;
2. Planner creates wave 1;
3. identical workers self-assign;
4. results + incidents + proposals return durably;
5. Steward/Validator integrate evidence;
6. Planner automatically creates wave 2 without human redesign;
7. stale/lost workers are automatically recovered;
8. parent can disappear and reincarnate mid-loop;
9. at least two roots can progress concurrently;
10. the human intervention count per useful durable result decreases across generations.

Until steps 4-6 run automatically, the system is parallel but not yet self-compounding.
