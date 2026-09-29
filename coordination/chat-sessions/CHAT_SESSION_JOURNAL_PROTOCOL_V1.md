# PROMETEO · CHAT SESSION JOURNAL PROTOCOL V1

Status: CANDIDATE CANARY
Date: 2026-09-29
Owner: existing Chat Object / Work Context architecture
Scope: disposable chat sessions, public continuity journal, reincarnation prompt, Control Room projection

## 0. Problem

A material Prometeo chat currently produces useful reasoning, actions, commits, links and decisions, but too much of that can remain discoverable only through the conversation transcript.

That violates the existing Survival Set:
- conversation is disposable compute;
- the human is not the context bus;
- a fresh shell must reconstruct state without transcript archaeology;
- material reasoning must become durable structured state.

The missing layer is not another memory authority. It is a **session journal projection** over the existing Chat Object / Work Context / source-owner system.

## 1. Identity model

### Chat Object

Long-lived durable conversational/operational identity.

Example:
`chat-object-prometeo-chat-control-main`

It owns the mission/role/survival method, not a specific ChatGPT conversation.

### Chat Session

One disposable conversation shell/incarnation of a Chat Object.

Each session gets:
- `session_id`
- `session_pin`
- `chat_object_id`
- `context_key`
- `started_at`
- `last_activity_at`
- `predecessor_session_id`
- `successor_session_id` when known
- `status`
- `journal_ref`
- `continue_prompt_ref`

A fresh chat must create a NEW session identity. It never reuses the predecessor's session id/pin.

### Turn Journal Entry

A sanitized public summary of one material interaction cycle.

It is NOT a raw transcript.

It records:
- timestamp;
- iteration ordinal;
- human intent summary;
- assistant conclusion;
- actions actually performed;
- artifacts/commits/URLs;
- decisions;
- blockers/boundaries;
- next action.

## 2. Privacy split

### PRIVATE / internal continuity

Existing Work Context remains the correct place for:
- exact user prompt;
- sensitive context;
- private source refs;
- private chat URL when available;
- detailed private payload.

Exact prompts remain PRIVATE by default.

### PUBLIC session journal

May contain:
- distilled human intent;
- non-sensitive conclusions;
- source-owner refs;
- public GitHub commits;
- public Pages URLs;
- public test/action links;
- high-level errors/boundaries;
- next action.

Must NOT contain:
- raw private prompts by default;
- note bodies;
- credentials/tokens;
- Authorization headers;
- private attachments;
- hidden chain-of-thought;
- secrets embedded in URLs/query strings.

## 3. Per-turn contract

For every MATERIAL user interaction in an adopted session:

### Before/while work

Use existing source owners and architecture normally. Do not mutate journal merely for every low-value token.

### Before final assistant reply

Append/update one public session journal entry containing:
1. `human_intent_summary`
2. `assistant_conclusion`
3. `actions[]`
4. `refs[]`
5. `decisions[]`
6. `boundaries[]`
7. `next_action`

Update the session head:
- last_activity_at;
- current_summary;
- next_action;
- last_entry_id;
- material_iteration_count.

The reply can then truthfully state what was persisted.

If repository write is externally blocked:
- do NOT fake publication;
- mention the boundary;
- retry only through the normal durable path later.

## 4. What counts as material

Journal:
- architecture decisions;
- implementation;
- test/verification;
- diagnosis;
- changed objective;
- blocker resolution;
- promotion/authority boundary;
- new reusable lesson;
- source-owner link worth reopening.

Do not journal:
- greetings;
- typo correction with no semantic change;
- repetitive status polling with no changed fact;
- filler.

## 5. Session bootstrap / PIN

Binding preflight:
`coordination/bootstrap/UNIVERSAL_SESSION_PREFLIGHT_V1.txt`

Every fresh/adopted session MUST use that preflight before material mutation. It must locate the target in Current Tree + Organism, recover objective/plan/baseline, and classify the new request as CONTINUE / COMPATIBLE_DELTA / EXPERIMENT / REPLAN / DESTRUCTIVE_RESET. Human intent can change the plan; it must not silently erase the previous plan or its rationale.

The continuation prompt must be small and stable.

A successor prompt carries:
- stable public bootstrap URL;
- chat_object_id;
- predecessor_session_id;
- predecessor session journal URL;
- requirement to create fresh session_id + session_pin;
- requirement to read Current Tree / Design DNA / session head / source owners before material mutation;
- requirement to append its own session journal each material turn.

The PIN proves a new incarnation exists. It does NOT grant authority.

## 6. Reincarnation flow

`old chat -> public journal head -> Copy Continue -> new chat -> fresh session pin -> read durable context -> write successor session -> continue work`

The successor:
1. reads the session head;
2. resolves Chat Object + Current Tree + relevant Work Context/source refs;
3. creates a fresh session identity with predecessor link;
4. publishes its session head;
5. performs work;
6. journals material iterations.

The old session can then be marked `SUPERSEDED_BY_SUCCESSOR` when the successor is durable.

## 7. Control Room projection

Project chat continuity inside the unified `Historial` view.

Historial can show recent chat/session events and expand a session to show:
- session title;
- chat_object_id;
- status;
- started / last activity;
- predecessor/successor;
- material iteration count;
- current summary;
- next action;
- recent journal entries;
- public refs/links;
- button `Copiar continuación`.

This history projection must not become Chat Object or Work Context authority.

## 8. Session files

For canary V1:

`coordination/chat-sessions/INDEX.json`

Per session:

`coordination/chat-sessions/<SESSION_ID>/SESSION.json`
`coordination/chat-sessions/<SESSION_ID>/JOURNAL.json`
`coordination/chat-sessions/<SESSION_ID>/CONTINUE.txt`

The first implementation uses immutable-ish journal entry arrays in JSON for simple GitHub Pages projection. If scale demands it later, storage may be sharded without changing session identity.

## 9. Authority / preservation

Must preserve:
- Current Tree V2 orientation;
- Chat Object durable identity;
- Work Context private exact prompt semantics;
- Design DNA;
- source-owner authority;
- no human result courier;
- no new scheduler/queue/CURRENT;
- private/public split;
- candidate/current/served distinctions.

The public journal is evidence/continuity projection, never product authority.

## 10. Canary

First adopted session:
- Chat Object: `chat-object-prometeo-chat-control-main`
- Domain: main Prometeo continuity/control conversation
- Purpose: prove one real chat can persist material turn summaries, actions, refs and a successor prompt while the human continues talking normally.

Canary passes when:
1. session appears in Control Room Chats;
2. at least one material iteration is publicly visible;
3. Continue copies a usable successor prompt;
4. fresh successor creates a new session/pin rather than reusing predecessor;
5. predecessor/successor lineage is visible;
6. successor can continue without human transcript reconstruction;
7. private prompt text is not exposed by the public projection.

