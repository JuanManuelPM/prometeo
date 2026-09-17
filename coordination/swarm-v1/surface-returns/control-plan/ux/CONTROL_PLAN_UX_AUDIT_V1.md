# Control Plan / Universal Control — UX Flow Audit v1

Status: SCOPED CANDIDATE EVIDENCE — NOT CURRENT / NOT HUMAN ACCEPTED / NOT SERVED
Opportunity: `O-SURFACE-CONTROL_PLAN-UX-V1`
Run: `RUN-O-SURFACE-CONTROL_PLAN-UX-V1-20260917T0050-SOL56UX`
Surface: `control-plan`
Authority: read-only UX critique plus this isolated durable return. No product bytes, Current graph, Human Accepted state or Served authority are changed here.

## 1. Audit question

Does the current Plan de acción / Universal Control path let the human express a correction once and get a visible durable result with minimal routing/coordination burden, while preserving accepted behavior and existing authority boundaries?

## 2. Truth separation

### CURRENT / SERVED OBSERVATION

The currently served GitHub Pages root is a single Prometeo owner shell that mounts `shared/prometeo-home/v2/shell.js` and hosts child pages in an iframe. Its current root menu exposes:

- `Grabar una nota`
- `Notas y trabajo`
- `Páginas -> Prometeo Live`
- `Legado -> Prometeo anterior`

The owner shell mounts the existing Page Change Loop from `shared/capture/v1/change-loop.js`. That loop already supports text/audio/file capture, `prepare_execution` (`Trabajar`), `prepare_research` (`Pensar`), durable execution status, result history, mark-seen state, candidate/served previews and same-host result routing.

The current autonomous-improvement packet records this mechanism as software-complete/public-trial-ready and explicitly treats the worker chat as disposable: durable execution status/RETURN is the result authority and the human-facing result routes back through the single Universal Host.

### CANDIDATE / CANARY

The broad `/wc` swarm, Control Room projection, Page Thread bridge, surface registry, control-surface candidate and local-steward machinery are canary/candidate work. They may improve allocation/integration, but this audit does not treat them as already Served product behavior.

### HISTORICAL / MIGRATION CONTEXT

`universal-control-v5` remains important Golden-Master/migration evidence and protects invariants such as one global shell, Favorites, Corner Anchor and preserve-first parity. However, the current root chrome is the owner-shell/home implementation above, and the current menu explicitly labels the legacy route `Prometeo anterior`. Therefore V5 is not used here as a substitute for direct observation of the current root interaction.

## 3. Current human correction flow reconstructed from code

For a text correction in the currently served owner shell, the visible path is effectively:

1. Open the Prometeo control/menu.
2. Enter `Notas y trabajo`.
3. Type the correction in `Escribí una nota…`.
4. Press `Guardar`.
5. Press `Trabajar` once the capture is ready.
6. A disposable ChatGPT tab is opened from the backend handoff URL.
7. The Page Change Loop polls durable execution status and later shows the result in history; the result can route through `Prometeo` and may expose `Candidato` / `Publicado` previews.

Audio has the same semantic split, with record/save/transcription before `Trabajar`.

This is already a durable improvement loop. The main UX gap is not missing worker infrastructure; it is that **expressing intent and committing that intent to work are still separate human routing actions**.

## 4. Findings

### UX-01 — HIGH — “one message” is currently two semantic commits

The user expresses the correction once, but the UI requires a second decision after capture: save the note, then choose `Trabajar`. This is appropriate for notes that should remain notes, so the answer is **not** to remove note-only capture. The missing affordance is a primary path that means “send this correction to Prometeo now” while keeping `Guardar sin ejecutar` as a secondary/explicit choice.

**Preserve:** note-only mode, audio/file capture, durable thread history, privacy, same-host result return.

**Candidate UX direction:** one primary action can atomically persist the capture and request execution after the same validation already used by `prepare_execution`; save-only remains available but is not the default route for a correction.

### UX-02 — HIGH — the entry label exposes storage, not user intent

`Notas y trabajo` describes the internal container, not the user’s goal. For an ordinary correction the user thinks “cambiá esto”, not “abrí el sistema de notas y después decidí qué hacer con ellas”. Reuse the same Page Change Thread underneath, but the primary surface affordance should be intent-shaped (for example, “Cambiar esta página” / “Decirle a Prometeo”) rather than implementation-shaped.

This is wording/navigation compression, not a request for a second message system.

### UX-03 — HIGH — `Pensar` vs `Trabajar` makes the human route cognition

The durable human contract says the human should not be allocator/router. The bottom actions ask the user to decide whether the system should research or execute after the intent is already present. That distinction is useful internally, but it should not normally be a required routing choice. A default execute path can infer/compile the needed worker role; `Pensar` can remain an optional explicit mode when the human really wants analysis without mutation.

### UX-04 — MEDIUM — result cards expose too much authority plumbing as peer actions

Current result cards may show `Ver/Detalle`, `Prometeo`, `Candidato`, and `Publicado`. Those distinctions are valuable evidence and must remain available, but presenting them as peer actions forces the human to interpret internal authority states. Normal UX should have one primary result action (for example `Ver cambio` / `Abrir resultado`) and move candidate/served/evidence distinctions into detail unless a real human authority decision is required.

This preserves rather than collapses Candidate / Current / Human Accepted / Served semantics.

### UX-05 — MEDIUM/HIGH — non-obvious page-identity ambiguity in the current owner shell

`shared/prometeo-home/v2/shell.js` defines a fixed `PAGE_ID='prometeo-universal-shell-v5'` and passes that identity into the Page Change Loop. When an iframe child is active, `pageMeta()` captures the child `sourcePath`, `sourceHref` and `sourceTitle`, but `page.id` itself remains the owner-shell id. In the same adapter, `navigatePage` is currently a no-op.

This does **not** prove a backend bug: the backend may deliberately resolve the child target from source metadata or the fixed shell identity may be correct for the logical `control-plan` surface. But it is a concrete ambiguity that must be falsified before a shortcut is labeled “Cambiar esta página”. Otherwise the UI could promise page-scoped intent while the durable thread is actually shell-scoped.

**Verification needed, not rebuild:** demonstrate the exact mapping from visible iframe child -> durable page/thread identity -> `prepare_execution` -> same-host result route for at least two distinct child pages.

### UX-06 — MEDIUM — an unlinked workspace falls back to legacy instead of exposing the real boundary

When no workspace secret is present, `changeLoop.open()` calls `openLegacyNotes()`. In the current owner shell that redirects to `./legacy/prometeo-v5/`. This preserves compatibility, but it hides the actual reason the current flow is unavailable and can look like a product regression.

Prefer an inline “este dispositivo todavía no está vinculado” boundary with the smallest linking/recovery action; keep legacy as an explicit fallback rather than the implicit primary response.

### UX-07 — KEEP AS-IS — Live should not absorb this interaction

Prometeo Live is currently a separate experiment/control-room projection. Durable intent says Live is passive telemetry, not the brain/source of truth. The one-message correction flow belongs in the existing page/change-thread path, not in a new Live-owned mutation channel.

## 5. Protected invariants

Any UX implementation consuming this audit should preserve all of the following:

1. Exactly one global Universal Control / owner shell.
2. Page Change Thread/Feed remains the existing human iteration substrate; do not create a second messaging system.
3. Worker chats are disposable; durable claim/run/return and page-thread status remain result authority.
4. Human-facing result navigation returns through the Universal Host rather than making a raw child/candidate URL the primary result.
5. Preserve-first mutation; a UX simplification is not permission for clean-slate product reconstruction.
6. Note-only capture remains possible; not every observation authorizes mutation.
7. Private captures/audio/transcripts remain private.
8. Candidate, Current, Human Accepted and Served remain distinct even if normal UX hides their plumbing by default.
9. `/wc` remains canary until production promotion gates pass.

## 6. Deduplication against active/prepared work

No new opportunity is emitted from this audit. The relevant implementation/planning space is already covered by prepared or active lanes, including:

- `O-SWARM-PAGE-THREAD-BRIDGE-V1`
- `O-SWARM-CONTROL-SURFACE-CANDIDATE-V1`
- `O-SWARM-SURFACE-REGISTRY-BUILD-V1`
- `O-SWARM-CONTROL-ROOM-PROJECTION-V1`
- `O-SWARM-LOCAL-STEWARD-BUILD-V1`
- `O-SURFACE-CONTROL_PLAN-TRUTH-V1`
- `O-SURFACE-CONTROL_PLAN-INTENT-V1`
- `O-SURFACE-CONTROL_PLAN-RISK-V1`
- `O-SURFACE-CONTROL_PLAN-DISCOVER-V1`
- `O-SURFACE-CONTROL_PLAN-PLAN-V1`
- `O-SURFACE-CONTROL_PLAN-LOCAL-INTEGRATE-V1`

The UX-specific work above should be consumed as constraints/tests by `PLAN` and `LOCAL-INTEGRATE`, not multiplied into another parallel queue.

## 7. Handoff to the local plan/integration lanes

Use this audit as a candidate acceptance checklist:

- A normal text correction can be expressed and committed to work in one primary human action.
- Save-only capture still exists explicitly.
- The human is not required to choose worker role (`Pensar` vs `Trabajar`) for the normal correction path.
- The normal result card has one primary human action while detailed authority/evidence remains inspectable.
- Page/thread identity is proven against at least two iframe child pages before “esta página” wording is promoted.
- Unlinked-device state explains the boundary instead of silently jumping to legacy.
- No second shell, message system, worker truth store or mutation path is introduced.

## 8. Exact reopenable evidence

Durable intent / control-plane:
- `coordination/workstreams/chat-native-control-plane-v1/PROMETEO_MASTER_CONTEXT_V1.md`
- `coordination/workstreams/chat-native-control-plane-v1/USER_INTENT_GAP_AUDIT_V1.md`
- `coordination/swarm-v1/surface-returns/control-plan/intent/CONTROL_PLAN_INTENT_LEDGER_V1.md`
- `coordination/swarm-v1/surface-returns/control-plan/reuse/REUSE_MAP_V1.json`

Current served/runtime observation (`gh-pages`):
- `index.html`
- `shared/prometeo-home/v2/shell.js`
- `shared/prometeo-home/v1/menu-registry.js`
- `shared/capture/v1/change-loop.js`
- `agent-runtime/workstreams/prometeo-autonomous-improvement.json`
- `agent-runtime/workstreams/universal-control-v5.json`
- `experiments/prometeo-live/index.html`

## 9. Audit conclusion

The useful correction is narrower than a redesign: **keep the existing durable Page Change Thread + disposable-worker + same-host-return architecture, but collapse normal correction from “capture -> save -> route -> launch -> interpret result plumbing” toward “say what to change -> Prometeo does the routing -> one visible result”.**

The strongest non-obvious risk is page identity: the current owner shell carries a fixed Page Change Loop `page.id` while child-page location is metadata. That mapping should be proven before UX copy promises page-scoped correction.
