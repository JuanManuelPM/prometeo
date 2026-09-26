# PROMETEO · CHAT MIGRATION READINESS V1

Status: CANDIDATE AUDIT  
Date: 2026-09-26  
Scope: Control Room / Current Tree / Work Context / Organism / chat continuity  
Authority: analysis only; this document does not promote a new architecture by itself.

## Executive finding

Prometeo already has most of the primitives required for chat-agnostic continuity, but mass migration is premature.

The CURRENT human control surface in the semantic registry is **Prometeo Control Room V10** at `/current-tree/control-v10/`.

The older **Live V6** remains referenced by some invocation and continuity contracts. This is pointer drift: two surfaces are being treated as "the" live human entry point.

The durable Work Context system exists, but adoption has not happened yet. Current rows are PAGE contexts for Live V6 and Control Room V7–V10. There are currently no CHAT or BRANCH contexts representing the parallel chats we actually want to make disposable.

## What is already strong enough to preserve

### Current Tree V2
A light orientation projection over source owners. It must remain an index/projection, never a second owner of truth.

### Organism Projection V1.1
Provides addresses and dependency/impact relationships for important semantic pieces and Work Contexts.

### Work Context V1
Already provides:
- stable `context_key`;
- PAGE / CHAT / BRANCH / IDEA / PROJECT / GUIDE kinds;
- private exact user prompts;
- events;
- checkpoints;
- search;
- reopen;
- summary / next action;
- organism parent;
- public/private visibility.

This is the correct durable spine for chat continuity, but not yet a complete reincarnation package.

### Control Room V10
Already solved several issues from earlier versions:
- Projects use static screenshots instead of live iframes;
- History and Statistics are separate;
- Statistics V3 is intervention-oriented;
- Organism is available as a navigable impact graph;
- recent Work Contexts appear under Projects;
- search/focus can pivot around semantic nodes.

### Visual Reincarnation Protocol V1
The visual system independently solved continuity more rigorously than generic Work Context V1. Its durable package distinguishes:
- ACCEPTED BASELINE;
- CURRENT CANDIDATE;
- OPEN FEEDBACK;
- REJECTED HISTORY;
- assets;
- decisions;
- version lineage;
- one handoff projection;
- abandonment test.

That pattern should be generalized instead of reinvented.

### Experimentos branch
It proved useful capabilities but remains intentionally isolated:
- AI Horde anonymous fabric;
- browser QA;
- Asset Repair;
- local MMS TTS;
- Causal Replay;
- provider vaults.

These are capability candidates/evidence, not part of chat continuity or canonical Prometeo runtime yet.

## Blocking gaps before mass chat migration

### 1. Canonical human entry point is drifting
Semantic Registry says Control Room V10 is CURRENT, while Guide/continuity text still points humans to Live V6. A fresh chat can therefore be correctly bootstrapped and still be sent to the wrong UI.

We need one stable non-versioned human route and every invocation contract must resolve to it.

### 2. Control Room V10 is still brittle
V10 currently loads Current Tree, Organism, Work Contexts, Activity, Statistics and catalog as one `Promise.all()`. One RPC failure can still blank the whole current surface.

Live V6 was hardened with stale-while-revalidate, but the CURRENT Control Room has not inherited that work yet.

V10 also bootstraps Supabase config by scraping Control Room V7 and consumes the V8 catalog. Those historical-version dependencies are accidental infrastructure and should be removed.

### 3. Work Context V1 remembers continuation, but not enough semantic history
A summary + next_action + reopen_prompt is insufficient for long-running design/build chats.

Generic continuity needs first-class equivalents of the visual package:
- accepted baseline;
- current candidate;
- open feedback;
- rejected history / DO NOT REVIVE;
- important decisions;
- artifacts/source refs;
- evidence;
- unresolved risks;
- next focus.

These can be represented as structured state plus events, but they need an explicit contract.

### 4. Adoption is manual
The protocol exists at `/current-tree/work-context/invoke.txt`, but a chat does not automatically know:
- which context to adopt;
- whether to reopen or register;
- what exact sources to read;
- what receipt proves it read them;
- what it must checkpoint before dying.

A single universal bootstrap projection is still missing.

### 5. No formal shell succession lineage
`context_kind=BRANCH` exists, but there is no first-class durable relation for:
- parent context;
- branch-from event;
- successor shell;
- superseded shell;
- merge/return;
- divergence.

`organism_parent_key` is a semantic parent, not chat lineage.

### 6. Migration coverage is currently zero for actual chats
Current Work Context rows are all PAGE contexts. No active chat branch has been adopted into the registry yet.

Before bulk migration, the page must show adoption coverage:
- adopted chats;
- untracked chats;
- stale checkpoints;
- contexts with no source ref;
- contexts with no organism parent;
- contexts with no recent checkpoint;
- contexts that can/cannot pass reincarnation.

### 7. Generic Reincarnation and Succession have not been certified
Two tests must pass before multiplying this pattern:

**Reincarnation:** a fresh chat receives only the durable bootstrap/context projection and correctly reconstructs current state, accepted baseline, open feedback, rejected history, source owners and next action.

**Succession:** after that fresh chat performs a real update and checkpoints it, a second fresh chat must reconstruct both the pre-existing history and the newly produced candidate without reviving rejected work.

### 8. Privacy model needs a deliberate split
Exact prompts are correctly PRIVATE. But a public GitHub Pages Control Room cannot safely expose every private chat.

Mass migration therefore needs two distinct concepts:
- durable private context used by connected chats;
- safe public projection used by Control Room.

Do not solve this by publishing raw prompts or service-role credentials.

### 9. Chat bootstrap, worker packet and UI projection are still separate dialects
The old continuity direction was:
- BOOT for chats;
- PACKET for workers;
- PROJECTION for humans.

Current Prometeo has all three pieces, but not one shared manifest/receipt contract tying them together.

A Bootstrap Manifest + receipt/hash would let a fresh shell prove exactly what it loaded and which versions/source refs it is continuing from.

### 10. Backend outage resilience is not yet system-wide
Live V6 now has local cache/retry/static fallback behavior because PostgREST is intermittently returning 503 while rebuilding schema cache.

The CURRENT Control Room and chat bootstrap still need the same resilience. A continuity system that disappears during a transient backend outage defeats its own purpose.

### 11. Strategy Guide is effectively stale
Current Tree reports STRATEGY as STALE relative to the Work Graph architecture promoted later. Mass migration should not depend on a stale coordinator capsule.

The Guide should be re-synthesized after the continuity contract is stabilized, not before.

### 12. Experimentos must remain separate during continuity migration
Provider/TTS/Horde/browser results should eventually appear as candidate capabilities and evidence.

They should not be mixed into the first migration step. Chat continuity and capability integration are different migrations.

## Required pre-migration sequence

### Gate A · One stable entry point
- choose one stable non-versioned Control Room route;
- make it resolve to the CURRENT control surface;
- update Guide, Work Context and Organism references;
- preserve versioned pages as history.

### Gate B · Resilient CURRENT Control Room
- port stale-while-revalidate to V10/current;
- remove dependencies on V7 for config and V8 for catalog ownership;
- show snapshot age/source;
- degrade individual panels independently.

### Gate C · Work Context V2 continuity package
Generalize the visual reincarnation semantics:
- BASELINE;
- CANDIDATE;
- OPEN;
- REJECTED;
- DECISIONS;
- ARTIFACTS;
- EVIDENCE;
- NEXT.

Do not make Work Context the owner of those artifacts; store refs and continuity state.

### Gate D · Universal bootstrap + receipt
A new chat should need one public bootstrap URL plus a context key.

The bootstrap must resolve:
CURRENT_TREE → architecture → domain/current owners → context → organism impact → open work.

It should emit a receipt with context key, source refs/versions and checkpoint generation.

### Gate E · Control Room continuity view
Add a first-class Chats/Contexts surface with:
- migration/adoption status;
- context freshness;
- last checkpoint;
- event/prompt counts;
- branch/successor lineage;
- reopen/copy prompt;
- organism parent;
- source refs;
- privacy-safe status.

### Gate F · Two canary migrations
Use exactly two existing threads first:
1. the original Control Room / organism chat;
2. the isolated Experimentos branch.

They are deliberately different and therefore make a good test pair.

Do not integrate Experimentos capabilities. Only migrate its continuity metadata.

### Gate G · Reincarnation + Succession certification
Kill the shell conceptually and verify fresh chats can continue both canaries without the user restating context.

Only after both tests pass should other active Prometeo chats be adopted.

## Definition of migration-ready

Mass migration is ready when:
- one stable CURRENT human route exists;
- CURRENT UI survives individual RPC failures;
- every adopted chat has one durable context key;
- baseline/candidate/open/rejected are reconstructible;
- source refs and organism parent are explicit;
- branch/successor lineage is durable;
- a fresh chat can bootstrap from one prompt;
- a second fresh chat can succeed the first;
- private prompts remain private;
- Control Room shows adoption/freshness without claiming liveness;
- no Experimentos capability is silently promoted during continuity migration.

Until those conditions hold, use the existing system as a candidate continuity spine, not as mandatory infrastructure for every chat.
