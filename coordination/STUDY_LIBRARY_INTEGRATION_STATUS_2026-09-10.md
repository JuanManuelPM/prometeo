# Study Library × Study System V2 × Universal Whiteboard — integration status

Date: 2026-09-10

## Resync finding

The durable handoff described V6 as the then-current Study Library lineage. The actual `main` resync had already advanced through V7/V8/V9 layers, including global presence/community, improved Walky/custom voices, multiple class boards, Blackboard Bridge and Blackboard content. Integration is additive on top of that current stack; none of those layers is replaced.

## Material integration

- `Parciales` is now backed by a first-class assessment registry with `assessment_id`, `course_id`, metadata and optional `study_instance_id`.
- `Modelos y Teorías II → Parciales → Primer parcial` opens the complete existing Study System V2 reference surface inside Study Library rather than sending the user to a competing app.
- Modelos P1 remains the full M1–M5 reference UX. The current reference surface still reconstructs historical compressed content; that technique is explicitly transitional lineage. New assessments must use `EXAM_INSTANCE.schema.json`.
- A reusable assessment adapter contract makes the Library/Study-System ownership boundary durable.

## Universal Whiteboard class adapter

Class mode now consumes the manifest-authoritative `mnemonic-whiteboard-v10` engine through one adapter instead of embedding the older v7 class board as authority.

The adapter persists structured canonical state in `study_boards.state`:

```text
schema / engine / base vectors+images / decor text+shapes / derivative preview
```

Existing v7-shaped `study_boards.state` rows are migrated non-destructively when opened/saved. High-fidelity preview comes from the WB10 source-rendered thumbnail pipeline; Study Library no longer needs `canvasSnapshot()` for the new class-board path.

Class boards remain a collection. Each board has id, title, owner, state, visibility, revision and timestamps. `+` creates another board; `duplicar` creates a private copy; `publicar` makes the current board shared and creates/updates its class-note artifact without clearing the board or forcing a replacement board.

Shared boards are editable by participants who possess the class room token under the existing `study_boards_room_all` RLS policy. Persistence is whole-structured-state/revision based rather than stroke-CRDT; simultaneous edits are therefore coarse-grained realtime, not yet conflict-free per-stroke collaboration.

## Personal vs shared

- Study-topic mnemonic state stays personal/local under Study System namespaces.
- Class boards live in room-token-protected Supabase rows; personal boards are filtered to owner, shared boards are visible to the room.
- Publishing is explicit. A private class board is not exposed merely because it exists.

## QA / non-regression checks

Static integration checks:

- Study Library current loader order preserved through V9 and V10 appended last.
- Blackboard Bridge/content layers remain loaded.
- Modelos P1 route is data-registry driven.
- No new custom drawing physics were copied into Study Library.
- Class iframe points to WB10 authority.
- No new low-resolution canvas screenshot path is used by V10 publishing.
- Publishing no longer auto-creates a replacement board.
- Existing `study_boards` table requires no DDL migration: its JSONB `state`, `visibility`, `revision`, owner/title and timestamp columns already support the new model.
- Existing RLS remains room-token scoped.

Browser/hardware behavior still depends on the WB10 contract: Pointer Events, tablet mode, long-press suppression and pen-aware palm rejection work when the browser exposes a pen signal; hardware that reports pen and palm identically as generic touch cannot be perfectly distinguished.

## Final publish evidence

- `main`: `28c845ce235618bdc6f4835b7f10dd70b71e2ba4` (`Integrate Study System V2 and WB10 into Study Library`).
- A concurrent GitHub Actions publish advanced `gh-pages` during integration. The first ref update correctly failed as non-fast-forward; the integration was rebuilt on the newer Pages tree instead of forcing over it.
- `gh-pages`: `cd82463635da38c60eef9df2f2967f231937f3e2`, parent `5447bdb9a291137c5fdc1895c1a7b085851b99c6` (`runtime: publish Agent Network v3 + global constitution`). This preserves that parallel publish.
- Public HTTP probes returned 200 for the Study Library route, assessment registry, V10 loader, V10 integration runtime, Universal Whiteboard adapter and Study System reference lab.
- Local static QA before publish: `node --check` passed for `study-v10-loader.js`, `universal-whiteboard-adapter-v1.js` and `study-v10-integration.js`; JSON parsing passed for both integration manifests/registry.

The remaining validation boundary is browser/hardware interaction: microphone, realtime multi-device editing and pen/palm behavior require an actual browser/device session. The implementation does not claim per-stroke CRDT semantics.
