# Control Plan / Universal Control — Intent Ledger v1

Status: SCOPED CANDIDATE EVIDENCE
Opportunity: `O-SURFACE-CONTROL_PLAN-INTENT-V1`
Worker: `wc-chat-20260917T0046-0300-sol56-controlintent5c2a`
Authority: read-only synthesis; this file does not make any product state Current, Human Accepted or Served.

## 1. Durable human intent that should govern this surface

| Intent | Strength | Evidence | Control-plan implication |
|---|---|---|---|
| The human should not be the scheduler, memory, result courier, allocator or merger. | BINDING | `PROMETEO_MASTER_CONTEXT_V1.md` §§0,3; `USER_INTENT_GAP_AUDIT_V1.md` intents 1–10 | The control surface should expose/drive durable system state, not ask the human to manually coordinate chats. |
| One identical worker bootstrap should be pasteable into many fresh chats; workers self-select distinct work by durable exclusive claim. | BINDING | Gap Audit intents 5–6; Master Context §§7,17; `CONTINUITY_HEAD.json` `same_worker_prompt_for_all=true` | No numbered prompts or manual routing in normal operation. |
| Claim/STARTED evidence precedes substantive execution. | BINDING | Gap Audit intent 6; Master Context §§5,7 | Visible ownership must be evidence-backed, not inferred from chat presence. |
| A parent or worker chat may disappear without losing identity, frontier or next action. | BINDING | Gap Audit intents 1–2,13–14; Master Context §§0,3,5 | Control Plan must be reconstructible from durable files/evidence rather than a special chat. |
| Parallelism should be aggressive when useful, but never manufacture filler merely to occupy workers. | BINDING | Gap Audit intent 4; Master Context §6; `CONTINUITY_HEAD.json` `worker_count_rule` | Worker-count guidance is demand-derived, not a fixed occupancy target. |
| Workers should be able to observe durable progress of other workers, continue useful work after returns, plan future work and help recover stalls. | BINDING TARGET | Gap Audit intents 7–9,13,17–18; current head `latest_user_intent` | The surface should expose claims/returns/blockers/stale state and next safe opportunities. |
| Multiple roots/surfaces must advance over one substrate while retaining local identity/privacy/authority. | BINDING TARGET | Gap Audit intent 10; Master Context §9; current head `surface_targets` | Control Plan is the global work surface, not a reason to collapse Prometeo/Facultad/Alumnos into one context. |
| Human-visible output should be brief; long architecture/recovery material remains internal. | BINDING UX | Gap Audit intent 15; Master Context §16; current head `parent_output_default` | Default surface communication should be current gate + smallest human action, with details subordinate. |
| Live/telemetry is a passive projection, not the brain/source of truth. | BINDING ARCHITECTURE | Gap Audit intents 11–12; Master Context §§4,10 | Universal Control may display telemetry, but correctness must derive from durable control-plane evidence. |
| Progress must be real and durable, not decorative percentages. | BINDING UX/TRUTH | Gap Audit intent 12; Master Context §10 | Prefer event-derived progress (claim, return, integration, cleared blocker, recovered stale work). |
| Fresh workers should carry guide-grade strategic posture for worker-solvable work while mutation authority stays scoped. | CURRENT DELTA | `CONTINUITY_HEAD.json` `latest_user_intent`, `worker_cognitive_model` | “Universal” means cognitive capability/role fluidity, not global write authority. |

## 2. Recent deltas that materially change older guidance

1. **Launch scale increased from a six-worker first canary to a broad target of ~50 identical fresh `/wc` workers.** The older Master Context recommends an initial wave of 6; the current Continuity Head explicitly provisions 52 READY lanes and sets `broad_launch_canary_target=50`. Treat 6 as historical first-wave guidance, not the current launch ceiling.
2. **Worker posture expanded from narrow execution toward guide-grade, role-fluid cognition.** Current head names roles `EXECUTE`, `DISCOVER`, `PLAN_LOCAL`, `CRITIQUE`, `VERIFY`, `INTEGRATE_LOCAL`, `CONTEXT_COMPILE`, `RECOVER`, `COMPACT`, while keeping authority scoped.
3. **Continuation expanded beyond the older bounded “one additional claim” canary.** Current universal-swarm intent calls for multi-stage same-context continuation and post-return re-entry when safe.
4. **The active surface model is now explicitly four-way:** `control-plan`, `prometeo-mobile`, `facultad-digital`, `alumnos-teacher`. Earlier documents mostly describe Prometeo plus future roots; current head records all four micro-swarms as prepared.
5. **Stale handling now has concrete canary defaults:** heartbeat target 10 min, SUSPECT after 20 min, recovery eligible after 30 min. This is still canary policy, not production proof.
6. **Production `/w` remains gated.** The broader `/wc` canary is intentionally ambitious, but current durable truth still says `production_generic_worker_operational=false` pending broad-wave evidence and independent verification.

## 3. Apparent contradictions and reconciliations

### A. “One worker should not become universal” vs Universal Cognitive Worker
Not a true conflict if “universal” is read correctly. The older anti-hoarding rule rejects turning one context-rich worker into the serial owner of everything. The current Universal Cognitive Worker design gives identical workers a broad cognitive role repertoire while preserving exclusive claims, local scopes and no global authority self-promotion. **Preserve both constraints.**

### B. Aggressive parallelism vs “do not optimize for occupancy”
Not a conflict. The intended objective is maximum **useful independent durable progress**, not maximum number of busy chats. Open many workers when the evidence-derived frontier contains useful non-duplicate lanes; do not create filler to keep workers occupied.

### C. Human-visible brevity vs large internal state
Not a conflict. Durable internal recovery material can be extensive; the normal human contract remains terse. This is a layered UX requirement, not a request to delete internal context.

### D. Master Context says `/wc` canary was not yet proven; current head says active high-parallelism canary
This is a temporal delta. The current head is newer and reports a broader prepared canary. Neither source claims production `/w` is proven. Therefore the safe current interpretation is **canary active, production still gated**.

### E. Guide-grade cognition vs scoped authority
Explicitly compatible. The user wants workers that can reason/plan/critique like the guide for worker-solvable work, but does not authorize them to make global Current/Human Accepted/Served claims.

## 4. Acceptance preferences for Plan de acción / Universal Control

1. **One-message operation:** a human correction or launch should translate to visible durable progress without requiring manual task decomposition.
2. **No special-chat dependency:** the surface must be reconstructible from durable state and usable after conversation loss.
3. **Evidence first:** ownership, work state, completion and progress are shown only when durable receipts exist.
4. **Minimal action:** when human action is actually needed, surface the smallest concrete action (for example, how many workers to open), not an architecture lecture.
5. **Cross-surface visibility without context collapse:** global control can show all four surfaces while local authority/context remain separate.
6. **Preserve-before-invent:** historical Prometeo mechanisms and accepted behavior must not disappear silently during redesign.
7. **No cosmetic substitution:** UI/Live polish cannot stand in for missing allocation, return, integration, recovery or planning loops.
8. **Canary honesty:** prepared specifications, queues and demos are not operational proof; do not promote `/w` from appearance or worker count alone.

## 5. Non-obvious finding

The key meaning of **Universal Control** is not “one universal screen” or “one universal worker.” The durable sources converge on a stronger invariant: **one shared control substrate with disposable chats and role-fluid cognition, while roots, claims, context and authority remain locally bounded.** A redesign that centralized all context/authority into the Control Plan would therefore violate the user’s intent even if it looked more unified.

## 6. Verified absences / source debt

The queue’s declared read scope references both `agent-runtime/manifest.json` and `agent-runtime/convergence.json`. Direct reads against `main` returned 404 for both during this run. They were not substituted with guessed equivalents. Any future integration that requires their semantics should resolve the intended current paths explicitly.

## 7. Evidence receipts

- `coordination/workstreams/chat-native-control-plane-v1/USER_INTENT_GAP_AUDIT_V1.md` — observed blob SHA `fbf7b77028b4d83927379ce8151c022b786d3eea`.
- `coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md` — observed blob SHA `cd6944b57e60c0de0a757248f1f3171d8d2fe1fc`.
- `coordination/CONTINUITY_HEAD.json` — observed blob SHA `a524a30e4db0d648190b5fe1742991c9353555ec`.
- `coordination/opportunities/UNIVERSAL_COGNITIVE_SWARM_QUEUE_V1.json` — queue defines this exact surface lane and its scoped return contract.
- `agent-runtime/manifest.json` — verified absent on `main` during run.
- `agent-runtime/convergence.json` — verified absent on `main` during run.

## 8. Remaining boundary

This ledger recovers intent only. It does not decide current UI truth, redesign the surface, merge worker returns, declare user acceptance, or promote `/w`. Those remain separate truth/UX/integration/verification lanes.
