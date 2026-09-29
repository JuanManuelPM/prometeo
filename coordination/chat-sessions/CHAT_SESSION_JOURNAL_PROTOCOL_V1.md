# PROMETEO · CHAT SESSION JOURNAL PROTOCOL V1

Status: CANDIDATE CANARY · FAST_REINCARNATION_PATH_V1  
Date: 2026-09-29  
Owner: existing Chat Object / Work Context architecture

## 0. Core law

Conversation is disposable compute. Chat Object is the long-lived identity. Work Context/source owners retain private/exact operating state. Session Journal is a sanitized continuity projection.

**FIRST DURABLE ACTION for an authorized continuation is CREATE SUCCESSOR SESSION.**

Reincarnation is not research. A successor reads durable pointers, creates identity/lineage, reaches READY, and only then expands the exact target needed for work.

## 1. Identity

A Chat Session is one disposable shell/incarnation with:
- `session_id`, `session_pin`;
- `chat_object_id`, `context_key`;
- timestamps/status;
- predecessor/successor lineage;
- journal/continue refs.

A successor never reuses predecessor identity. PIN proves incarnation identity only; it grants no authority.

A material journal entry records only sanitized:
- human intent summary;
- assistant conclusion;
- real actions;
- refs;
- decisions;
- boundaries;
- exact next action.

It is not a transcript or hidden-reasoning store.

## 2. Privacy

PRIVATE remains in Work Context/private owners when available:
- exact prompt;
- sensitive/private refs;
- private chat URL/payload;
- note bodies/attachments.

PUBLIC session projection may contain distilled intent/conclusion, public refs, degraded-source boundaries, current summary and next action.

Never publish raw private prompts, credentials/tokens, Authorization headers, private note bodies/attachments, hidden reasoning or secrets in URLs.

## 3. FAST_REINCARNATION_PATH_V1

Binding preflight:  
`coordination/bootstrap/UNIVERSAL_SESSION_PREFLIGHT_V1.txt`

### R0 · Envelope
Parse chat_object_id, predecessor id/pin, focus, predecessor SESSION/JOURNAL, Current Tree/preflight pointer, exact next_action and optional `same_work_unit_ref`, `last_checkpoint_ref`, `current_stage`, `last_progress_at`, `repo_head_seen`.

### R1 · Minimal reads
Normal target is about 3–6 durable reads:
1. universal preflight;
2. predecessor SESSION;
3. predecessor JOURNAL material head;
4. named Current Tree/continuity snapshot;
5. `same_work_unit_ref` / `last_checkpoint_ref` when present, otherwise one exact plan/source owner only when SESSION already points to it.

No broad web/repo search, repo clone or Supabase investigation before READY unless next_action explicitly requires that source.

### R2 · Fresh identity
Create new session_id + session_pin.

### R3 · Successor publication
Preferred one CAS/tree commit:
- successor SESSION.json;
- successor JOURNAL.json;
- successor CONTINUE.txt;
- INDEX.json;
- predecessor successor/status update.

Publication happens before target-specific archaeology/implementation. When human intent still points to the same task, successor Session preserves the same Work Unit and resumes after the durable checkpoint instead of creating a second task.

### R4 · Session Head convention
New sessions should persist, when known:

`current_summary`  
`next_action`  
`focus_objects`  
`active_project`  
`organism_nodes`  
`chat_object_profile_ref`  
`role`  
`design_knowledge_refs`  
`active_change_refs`  
`recent_change_refs`  
`current_plan_ref`  
`objective_ref`  
`same_work_unit_ref`  
`last_checkpoint_ref`  
`current_stage`  
`last_progress_at`  
`work_context_refs`  
`source_owner_refs`  
`preservation_refs`  
`known_boundaries`  
`known_degraded_sources`  
`repo_head_seen`  
`latest_material_entry`  
`continue_prompt_ref`

A compact `bootstrap` object should include predecessor/head, repo head, Current Tree/Organism, objective/plan, Work Context, optional Design DNA, next_action, request_class, degraded sources, read count, pre-READY broad-search/clone/Supabase flags and `bootstrap_status`.

`bootstrap_status=READY` means a new shell can reopen identity, lineage and next action from durable pointers. It does not mean every live dependency is healthy.

### R5 · Target expansion
After READY, resolve only the relevant Organism subgraph and exact owners required by next_action. Design DNA is conditional on material scope.

### R6 · Normal work
Continue normal work and journal each material turn.

## 4. Degraded owners

Live owner succeeds -> use it.  
Live owner fails -> record DEGRADED -> use last-good/cache/GitHub durable owner -> continue when safe.

Current Tree/Organism/Work Context/Supabase degradation does not block reincarnation when durable identity, lineage and reopening pointers remain available.

A ChatGPT client error/spinner/Retry control is observation state, not durable work authority. Retry from the ChatGPT client UI is not assumed to be safe resume; reconcile durable Work Unit/checkpoint/commits first.

## 5. Request classification

Material requests are classified operationally as CONTINUE / COMPATIBLE_DELTA / EXPERIMENT / REPLAN / DESTRUCTIVE_RESET.

New human intent may change the plan. Preserve lineage/reason/baseline; do not use old context as a veto.

## 6. CONTINUE.txt universal envelope

CONTINUE.txt stays deliberately small:

```
PROMETEO CONTINUE

CHAT_OBJECT_ID: <id>
PREDECESSOR: <session_id>
PIN: <session_pin>
SAME_WORK_UNIT_REF: <ref-or-NONE>
LAST_CHECKPOINT_REF: <ref-or-NONE>
CURRENT_STAGE: <stage-or-UNKNOWN>
LAST_PROGRESS_AT: <timestamp-or-UNKNOWN>
REPO_HEAD_SEEN: <sha-or-UNKNOWN>

READ:
<universal preflight>
<predecessor SESSION>
<predecessor JOURNAL>
<current tree>

FIRST DURABLE ACTION:
Create a fresh successor SESSION_ID + SESSION_PIN, publish successor + index lineage, preserve SAME_WORK_UNIT_REF when the objective is unchanged, then continue from LAST_CHECKPOINT_REF/current stage.

RULE:
Read pointers, not the world. Expand only after READY.
```

Domain specificity lives in Session Head pointers, not giant rescue prompts. Specialized Chat Objects reuse the same envelope; their durable profile/role/design/change pointers travel through Session Head, never through a separate bootstrap system.

## 7. Per-turn contract

For each material interaction, before final reply update one sanitized journal entry and SESSION head fields: last_activity_at, current_summary, next_action, last_entry_id, material_iteration_count, latest_material_entry and any pointer/boundary field that materially changed.

If repository write is blocked, never fake publication.

## 8. Control Room

Continuity remains inside Historial.

Each session should show time/title, project/focus, state, current summary, next action, Continue, journal/refs and either `READY TO REINCARNATE` or `MISSING HANDOFF DATA`.

Buttons:
- CONTINUAR -> minimal continuation envelope;
- NUEVO CHAT -> same universal bootstrap, mode NEW;
- ADOPTAR CHAT -> same universal bootstrap, mode ADOPT_EXISTING;
- EXPORTAR PROYECTO / COPIAR PAQUETE -> continuity packet from the same contract.

No domain-specific giant prompt variants.

## 9. Worker variant

Worker CURRENT is preserved:

`fresh worker identity/beacon -> CURRENT dispatch/claim -> WORK -> target-specific preflight -> mutate within packet -> RETURN`.

Interactive:

`continuation envelope -> fresh durable session -> READY -> target-specific work`.

A worker never traverses all Prometeo before claim, and Organism never expands packet authority.

## 10. Authority preservation

Preserve Current Tree V2, CURRENT architecture/source-owner distinctions, Chat Object identity, Work Context private prompt semantics, Design DNA, no human result courier, no new queue/scheduler/CURRENT/Organism/memory authority, and candidate/current/human-accepted/served distinctions.

Journal/index are continuity/evidence projections only.

## 11. Fast-path canary

Pass requires: minimal reads, fresh identity, published lineage, target/plan pointers, READY, no human reconstruction, no broad search/clone/Supabase before READY, no invented owner, durable bootstrap refs, preserved next_action and no private raw prompt publication.

Budget:
- 1 envelope;
- about 3–6 durable reads;
- 1 successor publication CAS;
- READY.

An S02→S03 simulation may certify the contract without superseding an active real S02, but it must be explicitly non-live and absent from INDEX.
