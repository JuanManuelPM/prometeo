# Prometeo Capture → Planner Handoff

Status: DESIGN DRAFT — not Human Accepted / not Current
Date: 2026-09-14
Scope: close the Capture → Prepare/Planner handoff after the voice-input baseline. This document does not authorize Planner implementation changes to product pages.

## Human interaction target

The user continuously captures notes by text and voice. Notes are synchronized in the background as they are created/edited/transcribed. The user should never have to manually export, copy, select, or upload notes.

When the user drags the physical **Preparar** control to the right, that gesture does only one human-facing thing: launch the Planner handoff. Internally, the system first proves that the latest intended note revisions are remotely available, freezes an immutable snapshot, then opens ChatGPT against that snapshot.

Human flow:

`ANOTAR → [automatic sync] → deslizar PREPARAR → [sync barrier + snapshot] → ChatGPT Planner reads exactly that snapshot → prepared work drafts`

## Core rule: timestamp is a sanity signal, not the integrity mechanism

The idea of storing the time of the slide is useful and should be kept, but clocks alone cannot prove that the newest note arrived. Client clocks may drift and a final network request may still be in flight.

Use three levels of evidence:

1. `triggered_at_client` — human-friendly local time of the slide.
2. `triggered_at_server` / `snapshot_created_at` — authoritative server time.
3. **Revision/watermark + digest** — authoritative integrity proof.

The handoff must never rely only on "the times look similar".

## Note identity and synchronization

Every note has a durable `note_id`. Every mutation of that note (text edit, completed transcription, added audio segment, deletion/restoration) advances its revision.

Suggested minimum fields:

- `note_id`
- `revision`
- `created_at_client`
- `updated_at_client`
- `received_at_server`
- `body/segments`
- `sync_state`
- `source_device_id`
- `local_seq`
- `content_hash`
- optional audio/source references

Each client mutation also receives a monotonically increasing `local_seq`. The server acknowledges the highest sequence it has durably stored.

Local states:

`DIRTY → SYNCING → ACKED`

The UI may stay visually minimal, but diagnostics must expose these states.

## Automatic sync

Sync happens continuously, not when Preparar is dragged.

Events that must enqueue a remote mutation:

- new text note
- edit existing note
- add audio segment
- completed audio transcription replacing a pending token
- manual text correction after transcription
- deletion/restoration

Local-first remains mandatory: loss of connectivity must not lose the note. Remote sync is asynchronous and retryable.

## Pending voice segments

A saved note may contain `transcribiendo audio` while Whisper continues in the background. Such a note is valid in Capture but not yet complete enough for Planner.

Dragging Preparar creates a **capture barrier**:

1. If a recording is active, finalize it.
2. Wait for all audio segments intended for this batch to finish transcription.
3. Persist their final transcript revisions locally.
4. Flush all dirty note revisions to the remote store.
5. Wait until the server acknowledges the latest local sequence captured at the moment of the gesture.
6. Only then create the Planner snapshot and open ChatGPT.

If a transcription fails, do not silently omit it. Keep the slider/handoff in a visible blocked state and offer an explicit retry or an explicit "continue without this failed audio" path later.

## Sync barrier

At pointer release on the right edge:

1. Capture `target_local_seq = current_latest_local_seq`.
2. Record `triggered_at_client`.
3. Flush pending mutations.
4. Wait for `server_ack_local_seq >= target_local_seq`.
5. Ask the server to create a Prepare Request from the acknowledged inbox state.

This eliminates the race where ChatGPT opens before the newest note has reached the server.

The physical control should remain visually committed to the right while the barrier runs, with semantic feedback such as:

- `cerrando audio…`
- `2 transcripciones…`
- `sincronizando…`
- `verificando…`
- `abriendo…`

Do not bounce back to idle and imply success before the server has acknowledged the handoff.

## Immutable Prepare Request

The slide does not send a loose query for "whatever notes are current". It creates a server-side immutable snapshot/manifest.

Suggested object:

```json
{
  "request_id": "...",
  "snapshot_created_at": "server timestamp",
  "triggered_at_client": "...",
  "triggered_at_server": "...",
  "from_watermark": 120,
  "to_watermark": 137,
  "note_count": 8,
  "note_revision_refs": [
    {"note_id":"...","revision":4},
    {"note_id":"...","revision":2}
  ],
  "snapshot_digest": "sha256...",
  "latest_note_received_at": "...",
  "scope": "unprepared revisions",
  "status": "READY_FOR_PLANNER"
}
```

The snapshot can materialize note text internally or pin exact historical note revisions. From the user's perspective there is still no export step.

Notes created after the snapshot belong to the next Prepare Request and must not mutate the already-open Planner job.

## Which notes participate

Default behavior should eventually be: include **new or changed note revisions not yet successfully prepared**.

A note prepared yesterday but edited today becomes eligible again because its revision advanced.

Do not mark a revision permanently consumed merely because the slider was moved. Distinguish:

- `snapshotted`
- `planner_read`
- `prepared_successfully`

If ChatGPT fails to open or Planner crashes, the same request can be reopened without losing the batch.

## Read URL / packet

ChatGPT should receive only an opaque handoff identifier/URL, not hundreds of note characters in the browser URL.

Conceptually:

`https://<private-prometeo-endpoint>/prepare/<opaque-token>`

The token resolves to exactly one immutable Prepare Request plus its note snapshot and Planner instructions.

Requirements:

- unguessable token
- read-only
- scoped to one request
- revocable/expirable as appropriate
- raw notes must not be committed to public GitHub Pages
- canonical private note storage remains separate from the public frontend

A Supabase-backed private transport / Edge Function is compatible with the existing Prometeo architecture; it should be treated as transport/storage for this flow, not as an excuse to infer Human Accepted/Current product state.

## Planner bootstrap contract

The ChatGPT bootstrap instruction should be tiny because the real material lives in the packet.

Conceptual bootstrap:

```
PROMETEO PREPARE
request_id=<id>
packet=<url>

Read the packet first. Verify its manifest before planning. If the packet is missing, stale, incomplete, or its declared integrity is invalid, stop and report the handoff failure. Do not implement page changes. Turn the notes into high-quality prepared work drafts grouped by the actual project/page/capability they affect.
```

Planner authority stays narrow:

- may read notes and project context
- may classify/group/split/merge notes
- may create Work Drafts / worker prompts
- may identify ambiguity/dependencies
- may inspect Current/Catalog/Lineage/donors as needed
- must not modify Calendar, Student World, Navigator, etc.
- must not promote candidate state to Human Accepted/Current

## Planner integrity check

The packet itself should expose:

- `request_id`
- `snapshot_created_at`
- `note_count`
- `to_watermark`
- `snapshot_digest`
- `latest_note_received_at`
- integrity status generated by the server

The Planner should echo a compact read receipt before doing material planning, e.g.:

`READ request=<id> notes=8 watermark=137 digest=<short> snapshot=15:27:04Z`

This is much stronger than merely comparing clock times. Time remains useful as a human sanity check: the snapshot time should be close to the gesture time, but exact revision/watermark identity is the actual guarantee.

## User-facing receipt

After successful handoff, Capture should retain a small durable record, for example:

`Preparado 15:27 · 8 notas · rev 137 · ✓ sincronizado`

Later it may become:

`Planner leyó 15:27 · 8 notas`

This gives the user a simple answer to "¿entró mi última nota?" without showing technical plumbing.

## Offline / failure rules

- If there is no network, notes continue to save locally.
- Preparar must not claim success while remote synchronization is incomplete.
- If the network drops during the barrier, keep the request pending and retry; do not open a stale Planner packet as if complete.
- If one note revision cannot sync, identify it in diagnostics.
- If the packet endpoint cannot be read, ChatGPT should stop rather than plan from an older batch.
- A duplicate slide should be idempotent for the same `target_local_seq` while a request is being created; do not create accidental duplicate batches.

## Test fixture for the first end-to-end experiment

Preload deliberately interleaved notes so Planner grouping can be verified:

1. `En Calendario quiero que las clases ya pasadas se vean más apagadas y que tocar una abra el detalle.`
2. `En Student World de José, en celular la práctica debería arrancar plegada para darle más lugar a teoría.`
3. `Volviendo a Calendario: no cambies la física del navegador; es solamente la tarjeta visual del evento.`
4. `En Navigator, RIGHT sobre una hoja debería abrir directamente la página.`
5. `Ese cambio de Navigator tiene que conservar Exact Back sin tocar V23 como oracle de física.`
6. `Para José también quiero ver el avance de práctica cuando la despliego.`

Expected Planner behavior:

- merge 1 + 3 into a Calendar work draft
- merge 2 + 6 into a Student World work draft
- merge 4 + 5 into a Navigator work draft
- preserve the "do not change navigator physics" constraint in Calendar rather than misclassifying it as a Navigator request
- generate three prepared jobs, not six jobs and not one giant job

## Acceptance tests for the handoff

1. Create/edit a note and immediately drag Preparar: Planner receives that exact latest revision.
2. Finish a voice note and drag Preparar before transcription completes: handoff waits; no audio is silently omitted.
3. Create several notes while prior transcriptions run: all intended revisions are included exactly once.
4. Disconnect network, add notes, reconnect, drag: barrier waits for ack and includes them.
5. Drag twice rapidly: no accidental duplicate request for the same cutoff.
6. Add a new note after the snapshot is created: it does not leak into the already-open request.
7. Edit an already-prepared note later: the new revision appears in the next batch.
8. Packet fetch failure: Planner refuses to operate from stale context.
9. Manifest reports exact note count/watermark and the UI receipt agrees.
10. Planner produces grouped Work Drafts only and performs no implementation changes.

## Minimal next vertical slice

Do not build the whole Planner ecosystem yet. Prove one end-to-end slice:

1. seed the six test notes
2. auto-sync them remotely
3. expose a minimal sync diagnostic
4. drag Preparar
5. run the sync barrier
6. create immutable request + opaque packet URL
7. open ChatGPT against that packet
8. have Planner read/receipt/group the notes into the three expected drafts

Only after this is reliable should the generated drafts be wired to the later Producir/worker stage.
