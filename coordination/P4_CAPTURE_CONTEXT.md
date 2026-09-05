# PROMETEO · P4-00 CAPTURE RECONCILIATION CONTEXT

Status: **PRE-EXECUTION FREEZE**. This document is descriptive and normative preparation only. It does **not** promote a Candidate, alter Human Accepted authority, alter Current Graph revision 17, or authorize a Served visual change.

## 0. Purpose

P4 exists to integrate the new voice/capture workflow into Prometeo as a first-class intake capability without creating a second architecture beside the durable platform completed in Part 3.

The human target is simple: while navigating Prometeo across pages, the user can record several observations consecutively, change pages without waiting for transcription, see each capture progress independently, edit/confirm transcripts, gather observations from one or many pages, press one preparation action, obtain a short Patent command, paste it into a fresh ChatGPT conversation, and have that agent reconstruct the durable project context before planning and executing the requested work. After execution, receipts/results flow back to the capture surface and old literal notes are compacted without losing provenance.

The system target is stricter: Capture must feed the existing Context Foundry, Seed/Work Item metabolism, modification resolver, authority model, privacy model, receipts, Current Graph and Reincarnation contracts. Chat history remains non-canonical.

## 1. Frozen authority entering P4

Part 3 is complete. `state/PART3_COMPLETE.json` records Current Graph revision 17 and final receipt `R-P3-20-FINAL-0018`. The exact visible V53 source blob remains `7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418`. The V23 navigation physics reference remains a separate Human Accepted baseline/oracle; V23 and V53 are different lineages and their numeric version labels are not comparable.

`state/CURRENT_GRAPH.json` distinguishes at least: visible frontend current, served current, human-accepted physics, runtime base, candidate current, human-accepted candidate, canary, rollback proof and export. P4 must preserve the distinction Candidate != Human Accepted != Served.

The authority order remains the one in `coordination/AUTHORITY_MAP.json`: verified exact artifact, explicit Human decision, Human Accepted exact checkpoint, canonical protocol, verified historical rule, derived evidence, inference, proposal. P4 must never promote an inference or a reconstruction merely because it is newer.

The cross-system invariants in `coordination/INVARIANTS.md` remain binding. Particularly relevant to P4 are: one gesture owner; lease-based focus; native touch scrolling; Universal Shell only for genuinely global services; chat history is not canonical storage; durable state is schema/version/lineage aware; LOCAL is not externally exportable by default; Seed → Work Item → Artifact → Return → Review → Accept → Integrate is explicit; test layers are distinct; promotion is pointer movement after acceptance; and receipts are evidence records, not self-validating proof.

## 2. Durable platform already available

P4 is not starting from an empty repository.

The repository already contains:

- Reincarnation entry points: `reincarnation/PROMETEO_REINCARNATE.md`, `BOOTSTRAP.json`, `OPERATOR_CONTRACT.json`.
- Current state: `state/CURRENT_GRAPH.json`, `HEAD.json`, `PARENT.json`, `DOT_STATE.json`, `PENDING.json`, `CARRY.json`, `WATERMARKS.json`.
- Catalog truth and writable targets: `catalog/CATALOG_MANIFEST.json`, `catalog/pages.json`, `catalog/tree.json`.
- Lineage and reusable capabilities: `lineage/LINEAGE_GRAPH.json`, `lineage/CAPABILITY_REGISTRY.json`.
- Context Foundry v2: `shared/context-foundry/v2/` plus HOT/WARM/COLD context books, raw records and note atoms.
- Privacy v1.1: `shared/privacy/v1/privacy.js`.
- Work metabolism: `shared/workflow/v1/workflow.js` and Seed/Work Item schemas.
- Modification resolver: `shared/modification/v1/resolver.js`.
- Input/Focus Ownership: `shared/runtime/ownership/v1/`.
- V53 no-extra-chrome adapter: `shared/shell/v53-adapter/v1/`.
- Receipt ledger: `receipts/ledger.jsonl` plus ledger runtime.
- Existing browser/clean-process/rollback/release evidence from Part 3.

Therefore P4 must add a Capture capability to those systems rather than replace them.

## 3. Existing Capture work that must be preserved as candidate evidence

Three shell generations currently exist and must be treated as donors/candidates, not automatically as visible authority.

### v1 — local voice queue

`shared/prometeo-shell/v1/` contains a local-first voice queue. It uses `getUserMedia` + `MediaRecorder`, writes a note before transcription finishes, persists IndexedDB data, decodes/resamples audio to 16 kHz and serializes transcription work. The worker uses Transformers.js 3.8.1 and multilingual `Xenova/whisper-small` with Spanish forced, WASM q8, deterministic decoding options and beam search. This is a valuable implementation donor because it matches the user requirement that recording B or C must not wait for transcript A.

The microphone path requires a secure context and a user gesture. This is compatible with mobile Chrome. The architecture should exploit a single stable Prometeo origin so microphone permission can normally be granted once for the Navigator host instead of requiring independent permission on every external child origin.

### v2 — Capture + remote sync + Patent prototype

`shared/prometeo-shell/v2/` extends v1 with page identity, page/path/title/viewport metadata, remote sync to Supabase, a linked-device workspace secret, an Inbox, and Patent creation. It already preserves IndexedDB as the first write and remote sync as secondary.

The v2 Patent prototype freezes selected capture text and includes the last 10 literal captures per affected page plus a page-memory record. The Patent URL is opaque, expires, uses no-store/noindex semantics, and the browser never receives the Supabase service-role key.

These are useful mechanisms, but the current v2 Patent is not the final Prometeo contract. It bypasses several durable platform layers described below.

### v3 — default-on boot wrapper

`shared/prometeo-shell/v3/prometeo-shell.js` is a very small wrapper that forces the v1 activation flag on by default and imports v2. It adds a fail-visible `!` puck when import fails.

It was created to fix the symptom that the capture UI could be invisible when the old local activation flag did not exist. It is not Human Accepted and does not supersede V53.

## 4. Concrete post-Part-3 divergence discovered during P4-00

The exact Part 3 final commit boundary used for reconciliation is `48c1b56dd6bbd8ff57b2793d680fb6fcaf31e174`.

At preparation time, `main` is only two commits ahead of that boundary and the diff contains exactly two added paths:

1. `.github/workflows/inject-prometeo-shell-v3.yml`
2. `shared/prometeo-shell/v3/prometeo-shell.js`

No existing Part 3 authority files were overwritten by those two commits.

However the Served GitHub Pages Navigator currently ends with a **v2** shell marker, not a v3 marker:

`<script type="module" src="/prometeo/shared/prometeo-shell/v2/prometeo-shell.js?v=2" data-prometeo-shell></script>`

while the v3 JS file is also present on `gh-pages`.

This is explained by a real publication ownership conflict. The older workflow `.github/workflows/inject-prometeo-shell.yml` triggers on `shared/prometeo-shell/**` and always rewrites every marker to v2. The newer v3 workflow also publishes/replaces markers to v3. Both use the same concurrency group but both can run for a v3 change; whichever executes last can determine the marker. Thus source existence, workflow success and Served participation are not equivalent. This must be fixed in P4 before any global Capture integration can be trusted.

The current Served v2 marker also means the intended v3 default-on fix is not a reliable explanation of what a user sees. P4 must test the actual Served bytes and browser behavior rather than infer from `main`.

## 5. Supabase candidate state discovered during P4-00

The existing Supabase project contains the candidate Capture tables:

- `prometeo_workspaces`
- `prometeo_pages`
- `prometeo_captures`
- `prometeo_capture_revisions`
- `prometeo_page_memory`
- `prometeo_batches`
- `prometeo_patents`
- `prometeo_receipts`

All of these tables have RLS enabled and no direct RLS policies. That means ordinary client access is closed; the Edge Function uses the service-role key server-side and custom workspace bearer authentication. This is preferable to exposing a service-role key or treating an anon key as security.

At P4-00 preparation time there is one workspace row and **zero captures, zero batches, zero patents, zero page-memory rows and zero Capture receipts**. Consequently the remote Capture/Patent design exists but has not yet demonstrated an end-to-end real capture in this database. P4 must treat the remote path as an unverified candidate until browser/mobile gates exercise it.

The `prometeo-capture` Edge Function is active. POST actions use a >=32-character bearer workspace secret that is hashed before lookup. Patent GET uses a separate high-entropy token. Patent snapshots are stored with a SHA-256 digest and expire after seven days.

Security/performance findings that belong in P4, not as hidden assumptions:

- RLS-with-no-policy is intentional for the Capture tables because direct client access is denied, but this must stay explicit and tested.
- The Edge Function currently allows `Access-Control-Allow-Origin: *`; P4 should replace this with a deliberate origin policy or document why a bearer-only cross-origin boundary is necessary.
- `bootstrap` currently permits any sufficiently long random secret to create a workspace, which creates avoidable abuse/spam surface. A single-user/private provisioning strategy is preferable.
- Several Capture foreign keys lack covering indexes; this is low urgency at zero rows but should be repaired before scale.
- Hard delete of a capture currently removes remote state; P4 should default to tombstone/archive so revision/provenance and summary watermarks cannot become unverifiable.

Supabase is to be treated as a **private transport/synchronization adapter for raw capture state**, not as application-code authority, Human Accepted authority, or a replacement for Current Graph/lineage/receipts.

## 6. Architectural mismatches P4 must repair

### 6.1 Second visible chrome

The current v2/v3 candidate creates a new floating puck over every page. Existing Prometeo architecture explicitly says the V53 adapter should adapt the existing terminal/return controls and create no second visible shell. P4 must preserve the capture function but re-home its primary Navigator UI into the existing interaction grammar. A standalone-page adapter may exist, but it must be a candidate with explicit ownership and acceptance, not a blind global injection.

### 6.2 Injection as the primary integration mechanism

Injecting a script into every GitHub Pages HTML is fragile, creates multi-workflow ownership races and requires microphone permission on different origins for external repositories. The preferred primary path is Navigator-hosted Capture: the recorder remains mounted in the stable Prometeo parent while child pages change. The host already knows the semantic page identity. This gives one microphone permission boundary and permits consecutive captures across same-origin and cross-origin child pages without asking the child document to control the microphone.

Standalone pages can opt into a shared Capture adapter separately where useful.

### 6.3 `prometeo_page_memory` as a parallel memory authority

The current remote table has `recent_exact`, `historical_summary`, decisions, negative knowledge, regressions and open questions. Those fields are useful as a private materialized view/cache, but they must not become a second canonical context architecture. P4 must map remote capture memory into Context Foundry semantics: raw records, Note Atoms, source refs, privacy inheritance, authority class, selection, consumption and watermarks.

### 6.4 Patent as a second boot system

The current Edge Function hard-codes a large `PROMETEO_EXHAUSTIVE_100/v1` instruction block inside every Patent. The permanent protocol belongs in durable repository coordination/reincarnation files. A Patent should freeze task-specific data and identify the protocol/version/digest to execute. A new agent validates Patent → reincarnates Prometeo → resolves the Work Item → then obeys the execution profile.

### 6.5 Patent missing durable identities

The current Patent does not bind enough of the durable world. P4 Patent v2 must carry at least creation Current Graph revision, catalog identity, page IDs and capture revision IDs, source identities/writable-target pointers, memory watermarks, Work Item identity, execution profile identity, privacy/export decision identity, snapshot hash, expiry and receipt return channel. It must require revalidation if Current has advanced.

### 6.6 Privacy mismatch

Context intake defaults raw material to `LOCAL`. Existing privacy logic forbids silent LOCAL external export and requires durable declassification when derived material becomes less private. The current Patent endpoint exposes selected text to anyone possessing an opaque URL; high entropy is access control, not a privacy-classification transition.

P4 must make `Preparar patente` an explicit Human export action for exactly the frozen selected revisions and produce an auditable declassification/export receipt. No whole-Inbox export. The derived Patent inherits the strongest source privacy until that explicit transition exists.

### 6.7 Capture is not truth

A spoken observation is a Human input, but the transcription itself may contain recognition errors and the content may be an idea rather than an accepted decision. P4 must distinguish at least raw audio, machine transcript, user-edited transcript, user-confirmed transcript, Human instruction/decision and derived summary. A transcript does not become a Human Accepted product decision merely because it exists.

## 7. Target Capture data semantics

A Capture should freeze its contextual target at record start, not infer it later from whichever page happens to be visible when transcription completes.

Minimum conceptual fields:

- `capture_id`
- `capture_revision`
- `created_at`
- `privacy` (default LOCAL)
- `page_id`
- `catalog_identity`
- `source_identity`
- `source_href`
- semantic Navigator snapshot where available: route/path/node/item/anchor/focus/scroll owner
- viewport/device class where useful
- local audio reference/digest
- transcript text
- transcript state: absent / machine / edited / confirmed
- processing state
- remote sync state
- Patent/Work Item membership
- archive/tombstone state

Raw audio remains local by default. Remote synchronization may initially carry transcript + metadata only. Audio export requires a separate explicit scope.

## 8. Consecutive recording and queue semantics

The key human promise is non-blocking capture:

`record A → save → navigate → record B → save → navigate → record C`

while transcription can proceed serially or in a bounded worker queue.

Each row must expose its own state rather than a global vague spinner. The expected visible state model is approximately:

`recorded → preparing → queued → model-loading/transcribing → transcript-ready → edited/confirmed → synced → patented/consumed → done`, with explicit error/retry states.

The row's page identity and context are frozen independently. Navigation must never retarget an in-flight capture.

## 9. Mobile microphone strategy

The primary mobile strategy is **one secure Navigator origin owning the recorder**. `getUserMedia` is requested only as the direct result of a user action. After Chrome grants microphone permission for that origin, later recordings should reuse that permission subject to browser/site settings.

This is superior to injecting microphone code into every child origin. A child page can be external while the parent recorder remains on the Prometeo origin.

P4 must still test:

- Chrome Android secure-context permission prompt;
- grant, deny and revoked permission;
- start/pause/resume/save/discard;
- page change while queued transcription exists;
- screen lock/background interruption where feasible;
- supported MediaRecorder MIME selection;
- decode/resample of recorded mobile blobs;
- model loading/memory failure.

## 10. Transcription quality policy

The existing donor uses multilingual Whisper Small, Spanish forced, q8 WASM. This matches the user preference for Spanish quality over minimum latency and must be tested before replacement.

P4 must not silently fall back to Tiny just to make a test fast. If Small exceeds device memory, the first fallback candidate is multilingual Base with the UI/report explicitly recording that the quality tier changed. The raw local audio must remain available for re-transcription.

The execution test must include a stable Spanish read-aloud sample and expose row-by-row processing so the user can verify whether the transcript is actually good.

## 11. Context Foundry integration

Capture enters the existing pipeline as RAW_UNCURATED material through `PrometeoContextIntakeV2`. The capture's source ref and privacy are mandatory. After transcription/edit/confirmation it may project one or more Note Atoms with explicit authority and lineage.

`EXISTS != PARTICIPATES` remains binding: a stored capture does not automatically enter every future prompt. Work Item creation selects relevant capture IDs/page context, and Context Foundry records why items were included or excluded.

The context tiers must not be misread as simple storage buckets. HOT/WARM/COLD are context-selection tiers/pointers. Per-page recent literals and rolling summaries are private capture-memory records that Context Foundry can select through those tiers when relevant.

## 12. Exact-ten + rolling-summary memory contract

For each page/work context, P4 must support the human requirement:

- keep the 10 most recent relevant literal capture revisions readily available;
- preserve older raw/revision records durably;
- maintain a rolling historical summary of older material;
- record exactly which capture revisions are covered by that summary;
- advance a watermark only after compaction is persisted;
- never let a summary silently erase contradictory/negative knowledge;
- keep summaries labeled DERIVED_EVIDENCE, never Human Accepted truth by default.

When an 11th literal becomes eligible for compaction, the oldest literal can leave the recent window only after the rolling summary is updated with source IDs/revisions and the new watermark is durable. The raw source remains reopenable.

A Patent freezes the last-ten window and summary/watermark as they existed at Patent creation. Later edits do not mutate an old Patent.

## 13. Seed → Work Item → Patent relationship

The correct hierarchy is:

`Capture(s) → selected Human intent → Seed → Work Item → Context Pack → Patent transport snapshot`

A Patent is not a replacement for Seed or Work Item. It is a transport/dereference handle that allows a fresh agent to load the frozen task input and then reincarnate the durable platform.

For multi-page observations, one Work Item may contain several page IDs if the resolver finds a shared capability owner; otherwise it may split into dependent work items. This decision must come from Catalog/Capability/WHERE_USED resolution, not from string matching alone.

## 14. Patent v2 target

Human-visible output stays tiny, e.g.:

`PROMETEO PATENT · PAT-...`
`https://.../patent/<opaque-token>`

Internally the frozen snapshot must include/point to:

- Patent schema/version;
- Patent code and snapshot digest;
- Work Item ID and Seed ID;
- capture IDs + exact transcript revision numbers/digests;
- page IDs and semantic context snapshots;
- Current Graph revision at creation;
- catalog identity;
- source/writable-target identities;
- last 10 exported literals per relevant page;
- historical summary + covered IDs + watermark;
- privacy/export/declassification receipt identity;
- execution profile ID/digest;
- expiry/revocation status;
- receipt return endpoint/identifier.

The agent must re-read current durable state and detect drift before writing. Patent creation-time Current is evidence, not an eternal lock on repository state.

## 15. Fresh-agent protocol target

A new ChatGPT receiving a Patent must not rely on prior chat memory.

Mandatory order:

1. Fetch and validate the Patent token/snapshot hash/expiry.
2. Read the durable P4 Agent Protocol named by the Patent.
3. Reincarnate Prometeo from repository bootstrap sources.
4. Validate Current Graph/catalog/ledger and compare current state to Patent creation identities.
5. Resolve Work Item targets and capability owners.
6. Load only relevant exported Capture context plus durable HOT/WARM/COLD context.
7. Before material writes, print a complete 100-title task-specific coverage plan.
8. Mark titles ACTIVE / N/A / DEFER with reasons; no filler.
9. Expand the implementation specification at materially greater depth than the title index.
10. Declare write scope, invariants, tests, rollback and publication owner.
11. Execute only authoritative sources/candidate paths.
12. Test, return Artifact, create evidence/receipt, and stop at genuine Human authority boundaries.
13. Never infer Human Acceptance or Served state from a source commit.

## 16. Receipt and feedback loop target

After an agent executes a Patent-associated Work Item, the result must be traceable back to the exact Patent and capture revisions.

The Capture Inbox should eventually show states such as `prepared`, `working`, `candidate ready`, `needs human review`, `published`, `rejected`, or `blocked`, derived from inspectable receipts rather than optimistic local UI state.

A successful outcome produces an Artifact Return and standard Prometeo receipt evidence. Human acceptance/rejection must be explicit. Once the Work Item is accepted/integrated, memory compaction can mark covered capture intent as metabolized while raw/revision records remain available.

## 17. Publication and visual integration target

Primary Capture UI inside Navigator should be adapted to existing V53 interaction chrome rather than globally adding a second puck. The `v53-shell-adapter` is the integration donor because it creates no visible shell and already handles semantic return, focus leases and gesture ownership without taking over V53 physics.

No exact V53 visible bytes may be silently redefined as Human Accepted merely because a candidate adapter exists. If P4 requires a visible V53 change, it must be built as an exact candidate and stop at the Human Acceptance gate before stable promotion.

A standalone-page Capture adapter may be added for pages used outside Navigator, but it is a consumer of the same Capture core. It must not fork recording, transcription, memory or Patent logic.

## 18. What P4 explicitly will not do

- It will not use old ChatGPT conversations as source of truth.
- It will not promise automatic DOM control/sending inside ChatGPT.
- It will not put GitHub/service-role secrets in browser HTML.
- It will not make Supabase the authority for application code or Human Accepted pointers.
- It will not redesign V53 as part of Capture integration.
- It will not duplicate Context Foundry with an unrelated page-memory architecture.
- It will not silently export LOCAL captures.
- It will not treat transcript text as an accepted decision without authority metadata.
- It will not treat a successful commit as Served proof.
- It will not manufacture 100 filler actions merely to satisfy a count.

## 19. P4 execution philosophy

The user-visible flow must stay simple because all complexity belongs backstage. Internally, P4 is intentionally exhaustive so that a later single `.` can mean deterministic execution rather than "remember the conversation and improvise".

P4-00 therefore freezes four layers before the next dot:

1. **Comprehension** — this document.
2. **Map** — the complete 100-title execution index.
3. **Specification** — the detailed execution plan/contracts/gates.
4. **Contract** — a durable next-dot instruction that tells a fresh agent exactly where to start, what not to modify, how far to continue, and where Human authority forces a stop.

Until that next dot is received, P4 preparation must not intentionally promote a visible product candidate or alter Human Accepted/Served pointers.
