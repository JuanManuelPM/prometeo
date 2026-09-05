# PROMETEO · P4 CAPTURE INTEGRATION · EXECUTION PLAN

Status: **FROZEN PRE-EXECUTION SPECIFICATION**  
Index: `coordination/P4_CAPTURE_TITLE_INDEX.json`  
Context: `coordination/P4_CAPTURE_CONTEXT.md`

This plan expands every one of the 100 preplanned titles before implementation. It is not evidence that the work has already run. During execution each numbered item must be classified `ACTIVE`, `N/A`, or `DEFER`; `N/A` and `DEFER` require concrete evidence/reason. No count inflation, placeholder tests, or fake empirical claims are allowed.

For every ACTIVE item, the execution agent must preserve four distinctions: source vs Served; Candidate vs Human Accepted; stored context vs participating context; and Human input vs machine-derived transcript/summary.

---

## P4-01 · Authority Reincarnation and Workstream Opening

### 001 · Reincarnate durable baseline from required bootstrap sources
**Existing evidence.** `reincarnation/BOOTSTRAP.json` already enumerates Current Graph, HEAD, DOT_STATE, PARENT, PENDING, CARRY, WATERMARKS, Catalog, Lineage, Capabilities, HOT, operator contract and ledger.  
**Execution.** Run the existing clean-process reincarnation path before modifying Capture. Re-read every required artifact from the execution checkout rather than trusting this plan's copied identities.  
**Pass evidence.** Produce a machine-readable wake result that resolves WHAT_IS_PROMETEO, Current, Human Accepted scopes, Served inherited state, active frontend, pages, capabilities, pending, rules, change/test/release procedures.  
**Guard.** A missing or schema-drifted bootstrap artifact blocks execution; chat history cannot fill the gap.

### 002 · Verify Part 3 completion and receipt-ledger chain
**Existing evidence.** Part 3 reports revision 17 and final receipt `R-P3-20-FINAL-0018`. The final known ledger hash is `144479240672176a83149132ddf28cadc94ec132f4c6d01dd33dc52b56fef334`.  
**Execution.** Validate the complete JSONL ledger with `PrometeoLedger`, confirm hash continuity through the final receipt, and verify `PART3_COMPLETE`, Current Graph and DOT state agree.  
**Pass evidence.** Fresh-process ledger validation plus exact receipt/pointer comparison.  
**Guard.** Do not append a P4 receipt on top of an invalid chain; repair/reconcile the evidence first.

### 003 · Pin V53 exact visible baseline and V23 physics oracle
**Existing evidence.** V53 visible blob is `7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418`; V23 physics has its own Human Accepted SHA.  
**Execution.** Bind P4's regression fixtures to exact identities, not version names. Save both identities into the P4 Work Item/context pack.  
**Pass evidence.** Candidate tests can prove V53 unchanged when no visible V53 edit is intended and can use V23 only as physics/rollback evidence.  
**Guard.** Never copy V23 wholesale over V53 or infer authority from `23`, `53`, or any larger version number.

### 004 · Validate Catalog, Current Graph, lineage and capability identities
**Existing evidence.** Catalog identity is a digest pair over `tree.json` and `pages.json`; Current Graph revision 17 points to it.  
**Execution.** Recompute/verify source identities, page count, page IDs, writable targets, capability registry and lineage relations before Capture targets any page.  
**Pass evidence.** A deterministic validation report with catalog identity and any drift recorded explicitly.  
**Guard.** A page URL alone is never enough to authorize a write; writable target + source identity are required.

### 005 · Open P4 Capture Work Item without moving authority
**Existing evidence.** Existing workflow supports immutable Seed and Work Item objects and forbids direct integration.  
**Execution.** Create a P4 Seed describing Capture integration and a Work Item whose dependencies include the frozen P3 state and this P4-00 preparation package. Store them as candidate/backstage work objects.  
**Pass evidence.** Stable IDs, dependency list, LOCAL/PROJECT privacy decision, state `WORK_ITEM`, and no Current/Served/Human Accepted pointer movement.  
**Guard.** Opening P4 is not a product release.

---

## P4-02 · Parallel-Work Reconciliation and Drift Quarantine

### 006 · Diff post-Part-3 main against the final completion boundary
**Existing evidence.** P4-00 observed `main` two commits ahead of `48c1b56...`, adding only the v3 wrapper and v3 injector workflow.  
**Execution.** Re-run the comparison at execution time and record any new files/commits introduced since this freeze. Separate coordination-only P4 commits from product/runtime changes.  
**Pass evidence.** Exact base/head commit IDs and per-file classification.  
**Guard.** Any unexpected product delta becomes `UNKNOWN` until inspected; it cannot be silently folded into Capture.

### 007 · Inspect actual gh-pages Served participation instead of source declarations
**Existing evidence.** The Served Navigator currently contains a v2 shell marker while v3 bytes also exist on `gh-pages`.  
**Execution.** Read final served branch bytes and, where possible, the public URL response/browser DOM. Record marker version, script requests, build ID and visible behavior.  
**Pass evidence.** A Served identity report proving what actually participates.  
**Guard.** `main` source presence, workflow configuration, and published asset existence are not Served participation proof.

### 008 · Classify Capture shell v1, v2 and v3 donors, liabilities and authority state
**Existing evidence.** v1 owns local voice queue; v2 adds remote/Patent and visible puck; v3 only changes activation/fail-visible boot. None is a Human Accepted replacement for V53.  
**Execution.** Produce a KEEP/ADAPT/QUARANTINE/DELETE-LATER matrix at file/module granularity. Prefer reusing recording/transcription/sync modules while separating them from visible shell chrome.  
**Pass evidence.** Every shell path has an owner, consumer, authority state and migration target.  
**Guard.** Do not delete useful donor code until the integrated candidate proves equivalent behavior.

### 009 · Prove and resolve the dual-injector publication ownership race
**Existing evidence.** `inject-prometeo-shell.yml` rewrites markers to v2 and triggers on `shared/prometeo-shell/**`; the v3 workflow rewrites to v3. Both can run for a v3 change.  
**Execution.** Replace the competing publishers with one explicit owner or make the legacy workflow incapable of rewriting the new integration. Add a test that two workflows cannot claim the same served marker.  
**Pass evidence.** One owner manifest/workflow and a deterministic marker result after repeated publish simulation.  
**Guard.** Concurrency serialization alone is insufficient if two serialized jobs intentionally write different desired versions.

### 010 · Quarantine unaccepted global-shell drift without losing candidate evidence
**Existing evidence.** Part 3's Human Accepted/Served state predates v3; the extra Capture chrome was not accepted through the P3 boundary.  
**Execution.** Preserve v1/v2/v3 under candidate/donor paths, remove their ability to redefine stable V53 participation during P4 candidate work, and document exact rollback/restore bytes.  
**Pass evidence.** Stable production can be restored to accepted V53 behavior independently of the Capture candidate.  
**Guard.** Quarantine means stop automatic participation, not destroy history.

---

## P4-03 · Capture Domain Contract

### 011 · Define Capture schema, stable identity and immutable creation facts
**Existing evidence.** Remote tables and local notes already carry IDs, page metadata, transcript revisions and timestamps but no single canonical Capture contract.  
**Execution.** Add a versioned Capture schema that separates immutable creation facts from mutable processing state. Freeze `capture_id`, created time, privacy, page/source identity snapshot and recording-start semantic snapshot.  
**Pass evidence.** Schema validation fixtures for minimal valid, complete valid and malformed captures.  
**Guard.** Never regenerate a Capture ID because text was edited or transcription retried.

### 012 · Define Capture processing and lifecycle state machine
**Execution.** Specify legal transitions such as `RECORDING → PREPARING → QUEUED → TRANSCRIBING → TRANSCRIPT_READY → CONFIRMED/EDITED → SYNCED → SELECTED → PATENTED → CONSUMED/METABOLIZED`, plus `ERROR`, `RETRY`, `ARCHIVED`. Separate transcription state from remote-sync and workflow state so one spinner does not hide which subsystem is waiting.  
**Pass evidence.** Transition table plus tests that illegal regressions fail closed.  
**Guard.** `SYNCED` does not mean transcript confirmed; `PATENTED` does not mean implemented; `SERVED` remains outside Capture state.

### 013 · Define transcript revision, edit and confirmation semantics
**Execution.** Every machine transcript begins at a revision with provenance `machine`. User editing creates a new revision with provenance `human_edit`; explicit confirmation adds a confirmation record rather than rewriting history. A retried model result cannot overwrite a later human revision.  
**Pass evidence.** Conflict tests for late worker result, two-device edit, edit-after-Patent and confirm-after-edit.  
**Guard.** Patent snapshots bind a specific revision; editing afterward creates new future intent and never mutates old Patent content.

### 014 · Define semantic context snapshot frozen at recording start
**Execution.** Capture page ID, catalog identity, source identity, URL/title, Navigator path/current node/selected item/anchor/focus/scroll owner and viewport at the moment recording starts. Optionally record end snapshot separately if navigation occurs mid-recording.  
**Pass evidence.** A test begins recording on page A, navigates to B before saving, and proves the Capture target remains A unless the user deliberately retargets it.  
**Guard.** Transcription completion time must never determine page identity.

### 015 · Define archive, tombstone, supersession and reopen semantics
**Execution.** Replace destructive deletion as the normal path with tombstone/archive records that retain revision/digest/summary lineage while hiding the item from normal Inbox views. Define when raw audio can be purged independently to save space.  
**Pass evidence.** Summary/Patent lineage remains verifiable after UI delete; reopen handles work for retained data.  
**Guard.** If the user explicitly requests irreversible deletion, privacy deletion policy may supersede audit retention; the system must record that provenance can no longer reopen content rather than pretending otherwise.

---

## P4-04 · Page Identity and Semantic Targeting

### 016 · Resolve stable page_id from Catalog truth
**Existing evidence.** Catalog already supplies `page_id`, source identity, href and writable target for known pages.  
**Execution.** Make Catalog ID the primary Capture target. Deterministic path fallback may label unknown observations for storage but cannot authorize writes. Cache catalog with identity and refresh on mismatch.  
**Pass evidence.** Known pages resolve identically across reloads; changed URL query/hash does not create duplicate page identities.  
**Guard.** Fallback IDs are `UNRESOLVED` until Catalog/source resolution succeeds.

### 017 · Bind Navigator semantic route, node, item and anchor context
**Existing evidence.** The V53 adapter already produces semantic snapshots and fingerprints.  
**Execution.** Extend the Capture host adapter to ask the existing V53 semantic API for context without taking camera/physics ownership. Attach relevant node/item/anchor identity to each Capture.  
**Pass evidence.** Captures from two different items on the same page can be distinguished without storing stale pixel coordinates as truth.  
**Guard.** Old scroll pixels are advisory; semantic identity wins on restore.

### 018 · Resolve identity for standalone Prometeo pages
**Execution.** Provide a lightweight host adapter that resolves `page_id` using canonical meta/manifest data or Catalog matching when a page is opened outside Navigator. Keep it separate from the core Capture engine.  
**Pass evidence.** Same page captured from Navigator and standalone maps to the same canonical page ID/source identity.  
**Guard.** Standalone UI may differ, but data contracts and backend must not fork.

### 019 · Resolve cross-repository pages and writable targets
**Existing evidence.** Catalog includes external writable targets such as `JuanManuelPM/jose-study/index.html`.  
**Execution.** Store repository/path/source identity explicitly. For cross-origin child pages, let Navigator host own microphone/UI while page metadata comes from Catalog/Navigator selection.  
**Pass evidence.** A José page Capture can produce a Work Item targeting its actual repository without asking the iframe to expose DOM internals.  
**Guard.** Cross-origin content inspection is not assumed; semantic target metadata comes from durable Catalog/host state.

### 020 · Fail closed on unknown, ambiguous or drifted targets
**Execution.** If source identity, writable target, or Catalog mapping cannot be uniquely resolved, Capture may still be saved but Patent/Work Item enters `NEEDS_TARGET_RESOLUTION`. Provide candidate target list instead of guessing.  
**Pass evidence.** Ambiguity test produces a blocker with evidence, not a random path.  
**Guard.** Human words such as "esta página" are contextual hints, not sufficient source authority by themselves.

---

## P4-05 · Mobile Media Capture

### 021 · Enforce secure-context and explicit microphone permission contract
**Execution.** Request `getUserMedia` only from HTTPS/localhost and only after a direct user action. Report `NotAllowedError`, absent mediaDevices and insecure context separately. Do not prompt on page load.  
**Pass evidence.** Grant/deny/revoke paths are exercised in real Chrome; denial leaves navigation functional.  
**Guard.** Permission failure must never erase an existing queue or block non-voice text Capture.

### 022 · Validate MediaRecorder MIME and device compatibility matrix
**Existing donor.** v1 chooses webm/opus, webm, ogg/opus, mp4 in supported order.  
**Execution.** Test actual Chrome Android + desktop output and `decodeAudioData` compatibility. Persist the real recorded MIME with each audio blob.  
**Pass evidence.** Non-empty recording → decode → 16 kHz PCM on supported target browsers; incompatible combinations have an explicit fallback.  
**Guard.** `MediaRecorder.isTypeSupported` is capability evidence, not proof that downstream decoder accepts the produced blob.

### 023 · Implement microphone lifecycle for pause, resume, save and discard
**Execution.** Retain v1's stream reuse/release strategy but formalize ownership and cleanup on pointer cancel, pagehide, visibility interruption and errors. Save writes the Capture shell record before recorder stop/final blob completion.  
**Pass evidence.** Pause excludes paused time correctly, save persists, discard removes the in-progress draft, tracks stop after idle, and no microphone indicator remains stuck.  
**Guard.** Recorder callbacks may arrive after UI state changed; they must use frozen Capture IDs/context.

### 024 · Guarantee consecutive recording with a non-blocking transcription queue
**Execution.** Decouple recorder availability from transcription worker activity. After A is durably saved, allow B immediately even if A is model-loading/transcribing. Queue ordering is deterministic and bounded; failures do not block later items indefinitely.  
**Pass evidence.** Record A/B/C on three pages faster than transcription; all retain correct IDs/context and eventually settle independently.  
**Guard.** One model worker may serialize expensive ASR, but microphone capture must not wait for it.

### 025 · Adopt a one-origin Chrome mobile permission strategy through Navigator host
**Execution.** Keep primary recorder mounted in the Prometeo Navigator origin while child pages change. Avoid microphone requests from cross-origin child repositories. Document browser permission persistence as browser-controlled, not guaranteed forever.  
**Pass evidence.** One permission grant supports captures while traversing multiple child pages in the same Navigator session.  
**Guard.** Standalone external pages may require their own origin permission; this is an adapter case, not the primary promise.

---

## P4-06 · Spanish Transcription Engine

### 026 · Verify the Whisper Small multilingual Spanish donor end to end
**Existing donor.** Worker uses Transformers.js 3.8.1, `Xenova/whisper-small`, WASM q8, `language: spanish`, `task: transcribe`, deterministic options and beam search.  
**Execution.** Test loading, caching, PCM input, Spanish output and repeated queue use on target devices. Verify the exact runtime options actually work; do not assume `num_beams` support from syntax alone.  
**Pass evidence.** Stable Spanish sample transcripts plus timing/memory/error data.  
**Guard.** If an option is unsupported, simplify decoding options before changing the media path or quality tier.

### 027 · Define explicit quality-tier and fallback policy without silent Tiny downgrade
**Execution.** `Small` is the preferred quality profile. If memory/runtime makes it unusable on a device, offer/record `Base` as an explicit fallback. Tiny is not an automatic recovery path because the user prioritizes Spanish quality.  
**Pass evidence.** UI/debug state identifies model tier for every transcript; fallback trigger is reproducible.  
**Guard.** Performance optimization cannot silently change semantic quality expectations.

### 028 · Control model warmup, browser cache and worker lifecycle
**Execution.** Warm the worker after recording begins rather than at page load. Reuse browser cache/model session across queued captures where feasible. Terminate or release workers on explicit teardown without corrupting queued state.  
**Pass evidence.** First vs subsequent transcription timing recorded; reload recovery can restart pending jobs from local audio.  
**Guard.** Model cache existence is not proof that a current worker/session is ready.

### 029 · Bound model memory, latency and recoverable failure behavior
**Execution.** Define max audio duration/chunking, worker timeout diagnostics and memory-failure handling. Long audio can be chunked without losing the original local blob. Failed ASR keeps a retryable Capture.  
**Pass evidence.** Synthetic/real long clip, worker crash and model-load failure leave recoverable state and later captures usable.  
**Guard.** Never delete raw audio merely because transcription failed.

### 030 · Build a read-aloud transcription observability and feedback test
**Execution.** Add a dedicated test surface with a fixed Spanish paragraph. Each row visibly progresses spinner → transcript → editable/confirmable check. The user can compare spoken source and transcript and mark correct/incorrect.  
**Pass evidence.** Real human feedback plus transcript revision/confirmation persisted.  
**Guard.** Speed alone is not quality evidence; test output must expose actual text.

---

## P4-07 · Input Ownership and Human UI Integration

### 031 · Acquire and release voice gesture ownership explicitly
**Existing evidence.** `PrometeoOwnership` enforces one generic gesture owner.  
**Execution.** Voice initiation acquires `voice.capture` or an adapter-specific owner token on the active pointer and releases on completion/cancel/loss/teardown. Integrate long-press threshold without allowing underlying click after capture activation.  
**Pass evidence.** Conflict tests with Navigator drag/back grip and page interaction.  
**Guard.** Catching an ownership conflict must not steal the gesture; voice UI stays inert for that pointer.

### 032 · Integrate Focus Lease nesting and semantic restore
**Execution.** Capture drawer/editor/permission/error overlays acquire focus leases, name current parent when nested, release LIFO and return semantic restore keys.  
**Pass evidence.** Opening/closing Capture while terminal/page focus is active restores the intended semantic owner after layout change.  
**Guard.** No stale DOM element reference may restore focus after generation invalidation.

### 033 · Reuse existing V53 human interaction chrome for primary Capture entry
**Existing evidence.** V53 shell adapter is explicitly designed to adapt existing `.terminal`, `.terminal-frame`, `.return-tooth` and create no visible shell.  
**Execution.** Prototype Capture entry through the existing universal control/terminal vocabulary, keeping the visual change minimal. Recording must be possible without leaving the viewed page.  
**Pass evidence.** Candidate screenshots/interaction tests show one coherent control system, not V53 plus another floating application.  
**Guard.** Do not change V53 camera/geometry/physics/back behavior as a side effect.

### 034 · Remove second-shell ownership from the Navigator candidate
**Execution.** Stop using the global v2/v3 puck as the Navigator's primary visible control. Preserve underlying Capture core modules. Remove/disable blanket injection into accepted Navigator during candidate work.  
**Pass evidence.** Exact accepted V53 can run with no injected Capture chrome; P4 canary can mount the adapter deliberately.  
**Guard.** This is not permission to delete standalone-page capability.

### 035 · Design a standalone Capture adapter without forking the core
**Execution.** Expose a small host API: resolve context, start/save/discard, open Inbox, prepare Patent. Standalone consumers import the same Capture core/data modules and choose a minimal approved trigger.  
**Pass evidence.** Navigator and a standalone test page create schema-identical Captures and share the same remote workspace.  
**Guard.** No second transcription worker implementation, database schema or Patent builder per product.

---

## P4-08 · Local-First Durability

### 036 · Version the IndexedDB Capture store and migrations
**Execution.** Replace implicit note-shape evolution with an explicit DB schema version covering captures, audio blobs, transcript revisions, queue jobs, sync state and tombstones. Provide idempotent migration from existing v1 notes.  
**Pass evidence.** Migration fixture with existing records; downgrade/unknown schema fails safely.  
**Guard.** Never clear IndexedDB as a normal migration strategy.

### 037 · Make raw audio the first durable write before transcription
**Execution.** Preserve the current strong principle: save metadata immediately, then attach finalized blob as soon as recorder stops, then queue ASR. Consider writing recorder chunks incrementally only if mobile crash testing proves necessary.  
**Pass evidence.** Navigate/reload after Save but before transcript and recover the audio/queue.  
**Guard.** A transcript without source audio may still be stored, but the loss must be explicit provenance, not silent.

### 038 · Recover unfinished queue state after navigation, crash or reload
**Existing donor.** v1 resets `loading/transcribing` with audio back to `queued` and marks incomplete preparing records as error.  
**Execution.** Generalize recovery using the formal state machine and lease/sync generation.  
**Pass evidence.** Force-close during each processing state and validate deterministic restart behavior.  
**Guard.** A stale worker callback from a previous generation cannot overwrite recovered state.

### 039 · Persist transcript edits, revisions and confirmation locally
**Execution.** Store append-only transcript revisions plus current revision pointer/confirmation metadata. Debounced editing may update a draft, but a Patent uses a committed revision.  
**Pass evidence.** Reload preserves text, revision history and confirmation; late sync merges do not overwrite newer local revision.  
**Guard.** Editing a patented note creates a new revision and future pending intent, never mutates the old snapshot.

### 040 · Implement offline-first remote retry and sync backlog
**Execution.** Every local mutation records remote intent independently. Online events/background UI retries can sync, but local save never waits for network. Backoff prevents hot loops.  
**Pass evidence.** Create/edit/archive several Captures offline, reload, reconnect and converge remote state exactly once per revision.  
**Guard.** `navigator.onLine` is a hint; request success/failure is actual evidence.

---

## P4-09 · Private Remote Sync Adapter

### 041 · Declare Supabase as private transport adapter rather than Prometeo authority
**Execution.** Document tables/functions as `transport/private-capture` in P4 manifests. GitHub durable Current/Lineage/Receipt systems remain product authority. Supabase can hold LOCAL/PROJECT Capture data and transport status.  
**Pass evidence.** Reincarnation still reconstructs product authority if Supabase is unavailable; Capture history may be unavailable but cannot redefine Current.  
**Guard.** Do not add Supabase `latest/current` fields that compete with Current Graph.

### 042 · Harden workspace authentication and linked-device bootstrap
**Existing evidence.** The browser stores a 256-bit bearer secret and the Edge Function compares only its SHA-256 hash.  
**Execution.** Keep service-role server-only, version the workspace credential format, support rotation, and require deliberate device-link action. Prefer provisioning the existing private workspace over arbitrary public workspace creation.  
**Pass evidence.** Wrong/short/rotated secret tests; linked device can sync only its workspace.  
**Guard.** Never log or put the workspace secret in Patent snapshots, GitHub, receipts or screenshots.

### 043 · Restrict bootstrap, CORS and abuse surface
**Execution.** Replace permissive bootstrap with owner-controlled provisioning or a one-time link flow. Restrict origins to required Prometeo/known consumer origins where compatible; otherwise explicitly justify bearer-only CORS. Add basic request/body/rate limits appropriate for a single-user free project.  
**Pass evidence.** Untrusted unauthenticated origin cannot enumerate/read/write Inbox or create unlimited workspaces.  
**Guard.** CORS is not authentication; bearer validation remains mandatory.

### 044 · Define revision-aware remote sync and conflict semantics
**Execution.** Use `(workspace_id,capture_id,revision)` append history and explicit current revision. Prevent lower revisions from overwriting higher ones. Define same-revision/different-content conflict as a real conflict, not last-write-wins.  
**Pass evidence.** Two-device concurrent edit simulation with deterministic conflict/result.  
**Guard.** Timestamps alone cannot order semantic edits reliably.

### 045 · Replace hard delete with archive or tombstone as the default
**Execution.** Edge action `delete_capture` becomes archive/tombstone for normal UI deletion. Preserve revisions and coverage references. Add explicit hard-delete maintenance only for deliberate privacy erasure.  
**Pass evidence.** Deleted item disappears from normal lists while old Patent/summary source identity remains resolvable.  
**Guard.** Hard deletion must invalidate/rewrite dependent reopen claims honestly.

---

## P4-10 · Privacy and Export Boundary

### 046 · Default raw Capture and audio lineage to LOCAL privacy
**Existing evidence.** Context Intake defaults to LOCAL and privacy derivation inherits strongest source.  
**Execution.** Add explicit privacy field to local/remote Capture schema. Raw audio, transcript and derived summary remain LOCAL unless an explicit scoped export/declassification occurs.  
**Pass evidence.** External Context Foundry selection rejects raw Captures by default.  
**Guard.** Opaque storage location/token does not change privacy class.

### 047 · Define explicit Human Patent export selection for exact revisions
**Execution.** `Preparar patente` shows/counts the exact selected Capture revisions and affected pages, and the user action authorizes only that set for transport. No automatic whole-Inbox export.  
**Pass evidence.** Patent contains exact selected revision IDs and excludes unselected LOCAL items.  
**Guard.** A previously selected Capture that was edited must require exporting the new revision separately.

### 048 · Create an auditable declassification and export receipt
**Execution.** Define a durable, hash-bound Human export receipt from LOCAL to the minimum transport class (normally PROJECT-external) for selected source IDs/revisions. Anchor it in a trusted Capture transport ledger and bridge it to the standard receipt chain when the Work Item is metabolized.  
**Pass evidence.** Privacy module can validate source IDs, from/to classes, Human approval and trusted receipt hash before Patent material is served externally.  
**Guard.** Pressing a generic button without a durable scoped receipt is insufficient for the formal privacy contract.

### 049 · Redact and minimize every Patent snapshot to selected scope
**Execution.** Include transcript text/context necessary for the Work Item; exclude workspace secret, unrelated captures, raw audio by default, private link codes, service configuration and unnecessary personal metadata.  
**Pass evidence.** Automated snapshot allowlist test plus negative-secret scan.  
**Guard.** Historical summary itself may inherit LOCAL sources and must be covered by the export receipt/source set.

### 050 · Define workspace-secret and Patent-token expiry, rotation and revocation
**Execution.** Keep Patent tokens independent from workspace secrets. Set short configurable expiry, revoke after completion/rejection where possible, support manual revoke, and rotate workspace secret without invalidating historical Patent hashes.  
**Pass evidence.** Expired/revoked tokens return 410/404 semantics and never disclose snapshot; rotated workspace token blocks old credential.  
**Guard.** Token URLs can appear in browser/server logs; high entropy reduces guessing but not accidental disclosure.

---

## P4-11 · Context Foundry Intake

### 051 · Normalize Capture through Context Foundry Raw Intake
**Execution.** Map every committed transcript revision to `prometeo.raw-record/v1` with `authority: RAW_UNCURATED`, privacy, source ref and capture lineage. Store private records in the Capture transport/cache while exposing a Foundry adapter.  
**Pass evidence.** Intake validation accepts complete records and rejects missing source/privacy/ID.  
**Guard.** Raw ingestion is not curation or participation.

### 052 · Project transcript and confirmed intent into lineage-bound Note Atoms
**Execution.** Create separate atoms for machine transcript observation, human edit/confirmation and explicit Human instruction where applicable. Each atom references the exact Capture revision.  
**Pass evidence.** Atom validation, duplicate/conflict tests, and ability to reopen source Capture.  
**Guard.** Machine text cannot be mislabeled `EXPLICIT_HUMAN_DECISION` merely because it originated from the user's voice; confirmation/decision semantics must be explicit.

### 053 · Assign authority and currentness without overclaiming transcript truth
**Execution.** Define mapping: raw ASR `RAW_UNCURATED`; edited/confirmed transcript may be Human-supplied evidence; explicit accepted design decision can be elevated only by the normal authority process. Summaries are `DERIVED_EVIDENCE`. Superseded transcript revisions become historical.  
**Pass evidence.** Context conflict tests show high-authority contradiction fails closed.  
**Guard.** Latest transcript revision is current text, not necessarily current product decision.

### 054 · Preserve source refs, digests, lineage and reopen handles
**Execution.** Every exported/selected context record carries capture ID, revision, transcript digest, page/source identity and transport reopen handle (when privacy/auth permits).  
**Pass evidence.** An agent can explain which exact Capture revision supported a plan point and can detect a changed source revision.  
**Guard.** Reopen handles must never embed the private workspace bearer secret.

### 055 · Make Context Foundry explain Capture inclusion and exclusion
**Execution.** Selection accepts Work Item query/page tags/explicit IDs under privacy constraints and emits why each selected item participated and key excluded items did not.  
**Pass evidence.** Patent/context-pack test includes relevant A/B and excludes unrelated C with explicit reasons.  
**Guard.** Explicit IDs do not bypass privacy, supersession or unresolved high-authority conflicts.

---

## P4-12 · Recent Literal Memory and Rolling Metabolism

### 056 · Define the per-page recent exact ten-revision window
**Execution.** Maintain an ordered materialized view of the ten most recent eligible literal Capture revisions per semantic page/work context. Eligibility and ordering use committed revision/capture time, not transcript completion time.  
**Pass evidence.** Out-of-order ASR completion still produces the correct ten.  
**Guard.** The exact-ten window is a context convenience, not deletion policy; all source revisions remain durable according to retention policy.

### 057 · Define the rolling historical summary as DERIVED_EVIDENCE
**Execution.** Summary object stores text, source revision IDs/digests, covered-through watermark, privacy, generation model/agent identity when available, contradictions/negative knowledge and previous-summary lineage.  
**Pass evidence.** Summary can be rebuilt/audited from covered sources and never claims Human Accepted status.  
**Guard.** A concise summary must preserve unresolved contradictions rather than smoothing them away.

### 058 · Compact the oldest literal when an eleventh becomes eligible
**Execution.** Prepare summary update including the oldest eligible literal before removing it from the recent exact view. Compaction can run after capture stabilization or Work Item metabolism, but must be deterministic and idempotent.  
**Pass evidence.** With 11 records, view becomes 2..11 only after summary proves coverage of 1. Re-running does not double-summarize 1.  
**Guard.** Unconfirmed/error/superseded records follow explicit eligibility policy rather than silently contaminating summary.

### 059 · Advance covered IDs, revision sets and watermarks atomically
**Execution.** Summary write and watermark advance are one logical transaction/CAS. Record source revision set and previous summary revision.  
**Pass evidence.** Injected failure between summary/write steps cannot leave a watermark claiming material that summary does not cover.  
**Guard.** Timestamps are not watermarks; source revision identity is.

### 060 · Preserve reopenable raw history, contradictions and negative knowledge
**Execution.** Older literal material moves out of default HOT view but stays addressable by capture/revision ID subject to privacy/retention. Promote explicitly useful regression/negative knowledge into durable atoms/context.  
**Pass evidence.** Query for an old contradiction can reopen the raw source after multiple compactions.  
**Guard.** COLD means not default-selected, not forgotten.

---

## P4-13 · Seed and Work Item Metabolism

### 061 · Convert selected Capture intent into a canonical Seed
**Execution.** Patent preparation begins from selected Human intent and creates a `prometeo.seed/v1` request referencing exact selected Capture source refs under privacy policy. Preserve user wording as literal context while creating a concise work request separately.  
**Pass evidence.** Seed has stable digest ID, privacy and source refs.  
**Guard.** Do not replace literal captures with the Seed summary; both remain linked.

### 062 · Coalesce or split multi-page intent deterministically
**Execution.** Group observations by semantic target and capability owner. If several pages report the same shared Touch-First defect, one shared Work Item may own the repair with consumer tests. If requests are unrelated, create dependent/separate Work Items.  
**Pass evidence.** Resolver report explains grouping/splitting and affected consumers.  
**Guard.** Proximity in recording time is not sufficient evidence of one implementation owner.

### 063 · Create a Work Item with exact targets, owners and dependencies
**Execution.** Use Workflow + Catalog writable targets. Attach creation Current revision/catalog identity, capture revision IDs, capability owner, dependencies and required gates.  
**Pass evidence.** Immutable Work Item validates and can be reincarnated independently of chat.  
**Guard.** `owner: ai-worker` means execution responsibility, not authority to promote.

### 064 · Run capability, WHERE_USED and modification resolution before implementation
**Execution.** Consult capability registry, shared modules, product WHERE_USED maps and modification resolver. Resolve whether the defect belongs in page source, shared capability, adapter, backend, or Navigator host.  
**Pass evidence.** Planned write scope names root owner and representative consumers.  
**Guard.** A page where a symptom is observed is not automatically the code owner.

### 065 · Prevent Work Items from mutating Current or Served directly
**Existing evidence.** Workflow requires receipt/evidence for VERIFIED/CANDIDATE/HUMAN_ACCEPTED/INTEGRATED and explicit current-transition requests.  
**Execution.** Ensure Patent agents return candidates/artifacts and cannot call a convenience path that writes stable pages/current pointers automatically.  
**Pass evidence.** Negative test attempts direct stable mutation and is rejected.  
**Guard.** Automation may proceed through technical gates but must stop at real Human authority boundaries.

---

## P4-14 · Execution Patent v2

### 066 · Define Patent v2 schema, identifier, token and snapshot hash
**Execution.** Add versioned schema with separate human code, opaque read token, UUID/internal ID and canonical snapshot hash. Token hash is stored server-side; plaintext token exists only in generated URL/authorized client.  
**Pass evidence.** Schema validation, token entropy check and stable snapshot digest verification.  
**Guard.** Patent code alone must not expose content unless an authenticated resolver is intentionally added later.

### 067 · Freeze exact Capture revisions and content digests in the Patent
**Execution.** For every selected Capture include `capture_id`, revision, transcript digest, page ID and exported literal text. Patent creation fails if requested revision no longer matches current selected revision unless the user explicitly chooses historical revision.  
**Pass evidence.** Editing after Patent leaves old snapshot hash unchanged and makes edited revision pending for a new Patent.  
**Guard.** Patent must never dereference mutable "latest transcript" at read time.

### 068 · Bind Current, Catalog and source identities at Patent creation
**Execution.** Snapshot creation Current Graph revision, Catalog identity, page source identities and writable-target metadata. These are starting evidence; execution agent revalidates against live durable state.  
**Pass evidence.** Drift test advances Current/Catalog after Patent and forces agent to reconcile before writes.  
**Guard.** Old Patent is not automatically invalid, but stale assumptions are.

### 069 · Export only selected last-ten literals and rolling-summary context
**Execution.** For affected pages, export the selected current work captures plus bounded recent literal context and rolling summary/negative knowledge allowed by the export receipt. Include covered IDs/watermarks.  
**Pass evidence.** Snapshot size/content allowlist test; unrelated pages and unselected private captures absent.  
**Guard.** Do not dump all Context Foundry records "just in case".

### 070 · Enforce Patent expiry, revocation and Current-drift revalidation
**Execution.** Preserve short expiry/no-store/noindex. Add explicit revoke action and completion-triggered revocation policy. Fresh agent must compare Patent creation identities to current durable state and classify drift.  
**Pass evidence.** Expired/revoked/read-current-drift tests.  
**Guard.** A valid token proves access to a snapshot, not that the snapshot's implementation assumptions are still current.

---

## P4-15 · Fresh-Agent Exhaustive Execution Protocol

### 071 · Validate the Patent before any material planning or write
**Execution.** Check schema, hash, expiry/revocation, privacy/export receipt, Capture revision digests and required protocol identity. Reject incomplete/corrupt snapshots before opening implementation files.  
**Pass evidence.** Mutated snapshot/token tests fail closed with exact blockers.  
**Guard.** Never "repair" a broken Patent by guessing missing text from conversation memory.

### 072 · Reincarnate full Prometeo durable context before planning
**Execution.** Follow repository Reincarnation entry, validate ledger/Current/Catalog/Lineage/HOT/PENDING, then compare to Patent. Load WARM/COLD only by relevance.  
**Pass evidence.** Fresh-agent wake packet states both durable current truth and Patent task scope.  
**Guard.** Patent task context does not supersede global authority.

### 073 · Generate exactly 100 task-specific execution titles before expansion
**Execution.** The Patent execution profile requires the new agent to first plan all 100 task-specific coverage titles in one contiguous index after understanding context. Titles must span reconstruction, target resolution, implementation, regressions, verification, release and closure as applicable.  
**Pass evidence.** Exactly 100 unique numbered titles, with no placeholder variants or ledger-count inflation.  
**Guard.** This permanent P4 build index is not the same as the future Patent's dynamic 100-title plan.

### 074 · Expand ACTIVE, N/A and DEFER coverage at high detail without filler
**Execution.** Classify every dynamic title. ACTIVE points receive implementation-level detail: existing evidence, decision, alternatives, write scope, risks, tests, proof and rollback. N/A/DEFER require evidence. The expansion must materially exceed the title index in information density.  
**Pass evidence.** Coverage report can be audited against actual changed files/tests.  
**Guard.** Word count is not itself evidence; repetition or artificial subpoints are failure modes.

### 075 · Declare write scope, tests, rollback and publication owner before writes
**Execution.** Before first mutation, list exact repositories/paths allowed, forbidden stable paths, shared consumers, test matrix, rollback identity and single publication owner.  
**Pass evidence.** Later diff is entirely inside declared scope or an amended scope receipt explains why it changed.  
**Guard.** No opportunistic cleanup outside the declared Work Item.

---

## P4-16 · Modification Resolution and Reuse

### 076 · Resolve page-local versus shared-capability ownership
**Execution.** Map each requested behavior to capability registry/shared modules. Page-local content/design stays local; shared gesture/persistence/Capture defects are repaired in shared owner.  
**Pass evidence.** Resolver produces owner path and rationale for every requested change.  
**Guard.** Avoid copying a shared fix into several HTML files.

### 077 · Inspect WHERE_USED consumers before changing shared behavior
**Execution.** Enumerate representative and safety-critical consumers of the shared owner. Use existing WHERE_USED data and search for real imports/usage.  
**Pass evidence.** Consumer list becomes regression scope; affected products stay pinned until verified.  
**Guard.** A shared module with zero discovered consumers must not be assumed harmless; catalog/runtime integration may be indirect.

### 078 · Prefer a shared capability repair when the root cause is shared
**Execution.** If several captures expose the same shared problem, implement one versioned capability candidate and migrate consumers deliberately. Preserve visual identity of each product.  
**Pass evidence.** Representative consumers pass behavior gates without becoming one visual template.  
**Guard.** Design Kernel/shared capabilities own laws/primitives, not product-specific layout.

### 079 · Detect source, Current and Served drift before patching
**Execution.** Immediately before write, compare expected source blob/commit to live repository; compare Current/Served identity to Patent creation state. Rebase/replan or block on conflicting drift.  
**Pass evidence.** CAS-like source check prevents editing stale bytes.  
**Guard.** A successful GitHub update against stale assumptions is a failure, not progress.

### 080 · Return a Candidate only until exact acceptance authority exists
**Execution.** Build candidate path/branch/artifact and return it with evidence. If visible/behavioral Human acceptance is needed, stop with exact candidate link and acceptance scope.  
**Pass evidence.** Candidate identity is immutable and distinguishable from stable.  
**Guard.** Do not set Human Accepted or Served flags based on AI judgment.

---

## P4-17 · Artifact Return, Receipt and Human Feedback Loop

### 081 · Produce Artifact Return linked to Work Item and Patent
**Execution.** Return exact candidate commit/artifact, changed files, source/base identities, Work Item ID, Patent ID, Capture revision IDs and next required authority.  
**Pass evidence.** Artifact Return validates against schema and can be reopened without this chat.  
**Guard.** A prose claim without artifact identity is not a Return.

### 082 · Record executable or inspectable test evidence rather than declarations
**Execution.** Attach commands, CI runs, browser artifacts, hashes, screenshots/DOM snapshots where appropriate, and negative tests.  
**Pass evidence.** Receipt references evidence another agent can inspect/re-run.  
**Guard.** `PASS` text generated by the agent without executing the gate is not proof.

### 083 · Bridge standard Prometeo receipt identity to Capture transport status
**Execution.** Supabase receipt/status row stores the standard receipt ID/hash/reference, Patent and workspace association, not an independent competing truth. GitHub ledger remains authoritative for product transition receipts.  
**Pass evidence.** Inbox status can dereference the standard receipt and verify its claimed commit/served evidence.  
**Guard.** Remote `status='done'` is a cache; if it disagrees with ledger/current truth, show conflict.

### 084 · Surface working, blocked, candidate, accepted and published states in Inbox
**Execution.** Map workflow/receipt states to simple row UI with spinner/check/error and actionable next step. Keep details behind expansion.  
**Pass evidence.** State transitions come from receipts/polling, survive reload/device switch and never jump directly from Patent to Published without evidence.  
**Guard.** Human UI remains minimal; internal hashes need not be shown unless requested.

### 085 · Capture explicit Human accept, reject, edit and follow-up feedback
**Execution.** Candidate review supports accept/reject and new Capture feedback. Acceptance stores exact candidate identity/scope; rejection keeps candidate historical and returns work to repair with notes.  
**Pass evidence.** Work Item transition to HUMAN_ACCEPTED requires exact Human acceptance ID.  
**Guard.** Merely opening a candidate or recording no complaint is not acceptance.

---

## P4-18 · Verification Matrix

### 086 · Run schema, unit and static gates for every new contract
**Execution.** Parse every JSON, validate schemas, JS syntax, state-machine transitions, digest determinism, privacy rules, memory compaction and Patent snapshot allowlist. Extend known-disease tests.  
**Pass evidence.** CI on final candidate commit, not pre-final bytes.  
**Guard.** Static gates cannot substitute for browser/microphone tests.

### 087 · Run real desktop browser gates against final candidate bytes
**Execution.** Load Navigator/candidate in Chrome (and Firefox where relevant), exercise navigation, Capture UI, recording, queue, edit, sync/Patent, exact back and no-console/page errors.  
**Pass evidence.** Browser logs/screenshots/HAR or equivalent tied to candidate hash.  
**Guard.** Local harness and Served URL are separate evidence layers.

### 088 · Run Chrome Android microphone and transcription gates
**Execution.** Use real mobile Chrome where tool/human access allows. Verify permission, MediaRecorder, save, navigation while ASR runs, Whisper quality/latency, edit/confirm and remote sync. If a physical-device gate requires Human action, stop at that exact boundary with a minimal script.  
**Pass evidence.** Device/browser version + observed results.  
**Guard.** Desktop responsive emulation is not microphone/mobile-runtime proof.

### 089 · Run consecutive multi-page and cross-origin host-navigation gates
**Execution.** Record A on Prometeo page, B on cross-repo child, C on another page without waiting for transcripts. Verify frozen page identities, one parent permission, queue order and no iframe-origin assumptions.  
**Pass evidence.** Three Capture IDs with correct context and settled independent statuses.  
**Guard.** A cross-origin iframe need not expose its DOM for the host-level Capture promise.

### 090 · Run failure, privacy, known-disease and regression attacks
**Execution.** Inject network loss, worker crash, denied mic, stale workspace secret, concurrent edit, expired Patent, tampered snapshot, Current drift, ownership conflict and old known navigation diseases.  
**Pass evidence.** Failures produce explicit blockers/retry and no authority/privacy violation.  
**Guard.** Worker-soluble failures discovered here must be repaired and regression-tested in the same execution turn.

---

## P4-19 · Canary, Human Acceptance and Stable Promotion

### 091 · Build an exact Capture candidate without redefining V53 authority
**Execution.** Package Capture core + Navigator adapter + backend protocol as candidate. Bind exact source hashes. If V53 visible HTML must change to expose Capture, create a candidate derivative while preserving the accepted V53 base identity separately.  
**Pass evidence.** Candidate diff clearly identifies minimal visible changes and unchanged physics.  
**Guard.** Do not call the candidate `V53 Human Accepted` before review.

### 092 · Publish an isolated canary through one declared owner
**Execution.** Use one release workflow/owner to publish candidate URLs/assets. Eliminate competing shell injectors from the canary path. Verify asset hashes and browser runtime.  
**Pass evidence.** Canary URL, commit, served hash and zero ownership race.  
**Guard.** Canary success is not stable promotion.

### 093 · Stop at the Human visual or behavioral acceptance boundary when required
**Execution.** Present the exact canary and a short test script: navigate, record A/B/C, inspect row spinner/check, edit/confirm, prepare Patent. Ask only for genuinely Human evidence that automation cannot supply.  
**Pass evidence.** Explicit acceptance/rejection tied to exact candidate identity.  
**Guard.** Do not keep asking for dots between automatable technical gates; stop only here or another real authority/external-access boundary.

### 094 · Promote an accepted pointer only with the exact acceptance receipt
**Execution.** After acceptance, create receipt-backed Current transition request and promote through the declared release owner. Update relevant pointers atomically/CAS-style.  
**Pass evidence.** Current Graph revision advances with exact acceptance/receipt references.  
**Guard.** Promotion is pointer movement after acceptance, not overwriting historical accepted bytes.

### 095 · Verify stable Served identity and rollback A to B to A
**Execution.** Independently fetch/browser-test stable Served result after promotion. Exercise rollback to prior stable identity and re-promote if release protocol requires proof. Verify cache/pointer/state compatibility.  
**Pass evidence.** Stable hashes/browser result + rollback receipt.  
**Guard.** GitHub Action green state alone is not Served verification.

---

## P4-20 · Metabolism, Export and Reincarnation Closure

### 096 · Compact accepted and metabolized Capture memory without source loss
**Execution.** Once Work Item result is accepted/integrated, mark covered Capture intent metabolized and run recent-ten/summary compaction under watermark rules. Preserve raw/history according to retention/privacy.  
**Pass evidence.** Summary links exact covered revisions and recent window remains correct.  
**Guard.** Rejected/blocked intent is not compacted as though successfully resolved; it remains open/negative context.

### 097 · Update Pending, Carry, HOT, Watermarks and Current truth only as warranted
**Execution.** Close P4 pending items, add lasting invariants/negative knowledge to CARRY/WARM as appropriate, update HOT to next frontier, advance watermarks and Current Graph only for legitimate accepted transitions.  
**Pass evidence.** Fresh Reincarnation reconstructs the same final state and no stale P4 active gate remains.  
**Guard.** Coordination convenience cannot overwrite Human Accepted product authority.

### 098 · Regenerate a privacy-safe export and reincarnation package
**Execution.** Export public/durable platform state while excluding workspace secrets, LOCAL raw captures/audio and private transport records. Include schemas/protocols needed to understand Patent mechanics.  
**Pass evidence.** Secret scan, privacy selection test and clean extraction.  
**Guard.** Patent examples in export must use synthetic/redacted data, never real user captures.

### 099 · Prove a fresh agent can execute from Patent plus durable repository
**Execution.** Run a clean-process/fresh-agent simulation with no chat history. Give it a test Patent and repository access, require validation → reincarnation → 100-title plan → target resolution → candidate/blocked result.  
**Pass evidence.** Deterministic wake/execution report that identifies Current, task, sources, privacy, write scope and correct authority boundary.  
**Guard.** The test must not smuggle this conversation into the child process.

### 100 · Append final receipt and close P4 only when the evidence chain is complete
**Execution.** Append a standard hash-chained receipt linking P4 Work Item, final candidate/accepted/served identities as applicable, tests, privacy decisions, rollback and Patent fresh-agent proof. Mark P4 COMPLETE only if required gates truly passed; otherwise leave precise pending frontier.  
**Pass evidence.** Ledger validates from genesis through P4 final receipt; DOT/PENDING/Current/Reincarnation agree.  
**Guard.** A partial but truthful `BLOCKED`/`AWAITING_HUMAN_ACCEPTANCE` state is superior to a fabricated closure.

---

# Execution rule for the next dot

The next `.` does **not** mean "do item 001 and stop". It means: reincarnate this plan, execute P4 gates in dependency order, repair worker-soluble failures in the same turn, and continue through every automatable gate until either P4 closes or a genuine Human/external authority boundary is reached. The agent must never shorten the plan by forgetting later gates and must never inflate completion by inventing evidence.
