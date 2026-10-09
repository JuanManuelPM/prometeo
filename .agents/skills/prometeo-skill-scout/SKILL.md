---
name: prometeo-skill-scout
description: "Use for `🔥prometeo` without task or explicit `🔥preparar <task>`. Discover ALL skill metadata reachable from runtime and Prometeo catalog, select/READ pertinent skills and PREPARE a bounded executable plan with verified skill ledger. Do not execute material work until a valid human '.' message."
---

# Prometeo · Inventario, lectura y preparación verificable de skills

## Purpose
`🔥prometeo [tema]` (also `🔥proneteo` for voice-typing errors) is an **explicit preflight command**. It must produce an ACTIONABLE PREPARED PLAN, not stop after listing. A separate exact human `.` executes that one plan when its owner and permissions can be revalidated. This is a two-message inspection mode IN CHATGPT; the actual Prometeo page MUST keep its normal **one-input workflow**, with ACK before a real worker.

### 1. Discover ALL available metadata
Inventory the full exposed runtime/plugin skills list via `skills__list({})` when available, not only favorites; also retrieve `coordination/one-turn/v1/SKILLS_CATALOG_V1.json` at configured trusted ref and any actually installed project skills. Deduplicate by name/source+version, preserving significant differences. Unreachable metadata is `UNAVAILABLE`, never silently invented.

### 2. Select, inspect and distinguish
- Identify exact human task/topic from trailing words; otherwise current user request/assigned page/thread with a verifiable source. If none, list skills but report `NO_CONCRETE_PLAN`, not pretend a ready plan.
- Enumerate all materially useful skills in groups (core, specialized, optional) with reason, source and real accessibility. No artificial top-N limit or penalty for selecting often-relevant skills.
- **Read the entire instructional file for each SELECTED accessible skill, not just its short catalog description.** Record `LOADED` with a real source/ref and what instructions matter. If cannot read it, mark `UNAVAILABLE` or `SELECTED_NOT_LOADED`; do not claim it can be executed.
- Maintain evidence ledger per skill: `DISCOVERED`, `SELECTED`, `LOADED`, `PLANNED`; `INVOKED` and `VERIFIED` are **reserved for real operations after dot**. Listing `vercel/verification` is NOT having used it.
- Skills do not override Constitution, CURRENT/EPOCH, Work Packet, privacy boundary or explicit human approval.

### 3. Prepare an executable frozen plan
Before answering include actual goals, paths/owner, step order, input availability, tool usage, exact role for each chosen skill, tests/acceptance, pre-mortem risks and rollback, known tool restrictions, telemetry/elapsed data that can be measured, and criteria for stopping. Use the contract `coordination/one-turn/v1/FIRE_PREPARE_DOT_CONTRACT_V1.md` and required fields `FIRE_PREPARED_PLAN_SCHEMA_V1.json`.
- Save only in the existing authorized owner and perform read-after-write; `PREPARED_DURABLE` requires actual receipt/revision/hash.
- If private storage unavailable, `PREPARED_UNSAVED`: the next `.` can work only if the preparation is still available in the SAME chat. In a totally new chat `.` MUST be `PLAN_NOT_FOUND`; do not fabricate recovery from invisible prior chat.
- Do not perform product writes, deploys, worker claims or safety-restricted actions in the preparation phase.

### 4. Human '.' performs planned work
The entry router resolves `.` only as an exact standalone **human** message and only against eligible, fresh, unconsumed prepared plan. Recheck HEAD/authority/current context/permissions. Execute real operations following LOADED skills, update ledger `INVOKED` with operation refs and `VERIFIED` with tests; perform adversarial analysis, patch real defects and store RETURN/closure receipts. Duplicate dot is idempotent and must not replay writes.
`.` is NOT blanket publish authorization, a worker lease, or magic cross-chat persistence.

### 5. Answer contract (preparation)
Present concise but sufficient numbered skills plus for each selected: why, availability, `LOADED` evidence, **how it will be used**. Then ordered steps (specific owner/tools/tests), risks, permission caveats, plan ID/persistence status and **`.` = execute that plan**. Without an eligible plan, say why rather than solicit an arbitrary point.

### 6. Design-gate + after Work
The user rejected generated dark generic cards as ugly; DO NOT regenerate the page before their forthcoming visual photographs. The latest Work result has NOT YET been supplied; on receipt independently audit its evidence, reconcile branches, inspect one-turn page-input ACK/worker RETURN/feed/fresh chat recovery. This skill must never advertise the local mockup as a production milestone.

## Revision 2026-10-09: do not add dot to normal tasks
`🔥prometeo <task>` is now a ONE-TURN direct action of `prometeo-fire`. During this turn the scout may inventory/select/load skills, but it must not halt after planning or ask for `.`. Only `🔥prometeo` alone or explicit `🔥preparar` selects the preflight/dot mode. Published evidence goes to `gh-pages:tv/chat/state.json` only if public-safe and truly verified.
