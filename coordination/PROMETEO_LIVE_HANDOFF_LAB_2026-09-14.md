# Prometeo Live Handoff Lab — 2026-09-14

Status: ACTIVE EXPERIMENT / NOT PRODUCT AUTHORITY

## Canonical design reference for this experiment

The broader and newer UX/architecture specification is:

`coordination/PROMETEO_CAPTURE_PLANNER_DIRECT_LIVE_MASTER_SPEC_2026-09-14.md`

That document supersedes this one when there is any ambiguity. It includes the complete Capture note lifecycle, deletion, grouping/selection, Planner vs Direct routing, prepared jobs, worker parallelism, Control Room, progressive previews, Prometeo Live surfaces, QR/room remote-control model, acceptance canaries and non-regression laws.

## Human intent

The human wants Capture to become a frictionless handoff surface, not a command parser. Notes may request anything: a cat image, a new calendar, a sports dashboard, a navigation redesign, a gym page, a three-column live page, a four-way comparison workspace, or iterative redesign of existing surfaces. Prometeo must not anticipate or hard-code a vocabulary of allowed commands.

## Critical architecture correction — PREPARAR is a planner/compiler step

The first drag of **Preparar** must NOT directly execute one arbitrary note as a product worker.

Its job is to open exactly one fresh **Planner / Prompt Compiler** AI that reads the entire new-note batch and turns it into a small set of coherent work items.

The Planner must:
- read all newly dispatched notes plus the durable Prometeo context needed to understand targets;
- merge comments that belong to the same page/capability even if they were captured far apart;
- split unrelated intents even if they were written in one note;
- allow one note to contribute to multiple work items when necessary;
- identify target page/workstream/owner and relevant Current/Catalog/Lineage/donors when needed;
- write a strong worker prompt/packet for each work item;
- publish those prepared work items back to Prometeo;
- NOT itself implement arbitrary product changes unless its only assigned task is the planner/control-room experiment.

After Planner finishes, the human sees prepared cards. Dragging the action on an individual card opens a fresh execution chat for that specific job. Independent jobs may therefore spawn independent workers in parallel.

Primary human flow:

**ANOTAR → PREPARAR (1 Planner) → JOB CARDS → PRODUCIR (N workers)**

A separate **DIRECTO** route exists for a single coherent note or selected bundle that the human intentionally wants to execute without the Planner stage. See the master spec.

## Core handoff flow

1. Human writes or records arbitrary notes in Capture.
2. Notes sync silently in the background as they change.
3. Human drags **Preparar** to the right.
4. That gesture does not execute product changes and does not ask for a second confirmation.
5. Capture performs one final silent sync, creates a tokenized planner packet, and immediately opens a fresh ChatGPT window with a deliberately tiny prompt:

   `PROMETEO PREPARE · <code>\n<packet_url>`

6. The fresh Planner reads the packet URL itself.
7. Planner groups/splits the batch into coherent work items and publishes prepared job cards back to Prometeo.
8. Each prepared card has its own tactile **Producir / Trabajar** action.
9. Dragging a prepared card opens a fresh execution ChatGPT with a tiny worker prompt containing only the work-item identifier + packet URL.
10. That worker reads its own execution packet, performs the scoped software/product work, persists results, and returns durable status/evidence.
11. Multiple workers may run in parallel when their work is independent.

## Prometeo Live is both control room and result host

The Live surface must not be limited to showing final generated pages. It should also visualize orchestration itself.

When a Planner or worker spawns, Prometeo Live can immediately create a live card/tile such as:

- `Planner · organizing 11 notes`
- `Calendar · worker 1 · reading context`
- `Gym · worker 2 · implementing`
- `Navigator · worker 3 · testing`

This is not chain-of-thought streaming. Workers publish concise operational progress events after meaningful steps, e.g.:

`SPAWNED → READING_CONTEXT → BUILDING → PREVIEW_READY → TESTING → PUBLISHING → DONE`

or `BLOCKED / FAILED` with a short human-readable reason.

A worker should publish its first status event immediately after opening its packet so Prometeo Live can show that the chat has spawned and is alive before any final artifact exists.

## Progressive preview requirement

The successful football/Argentina canary exposed a weakness: Live stayed visually empty until the final artifact was complete.

For a new surface, the desired progression is:

1. worker tile appears immediately;
2. first safe layout/skeleton becomes a candidate preview;
3. preview refreshes at meaningful milestones;
4. final validation marks the result complete.

For edits to an existing authoritative page, stable and candidate must remain distinct; early preview must not silently overwrite the stable surface.

## Human-confirmed canary

On 2026-09-14 the human reported a successful end-to-end test in which Capture opened a fresh ChatGPT with a `PROMETEO LIVE` packet, the new AI recovered the packet/context and produced the requested football/Argentina result for Prometeo Live.

This validates the basic **fresh chat → external packet → worker → Live result** transport/execution path. It does not validate the final Planner-first UX, progressive preview, note lifecycle, multi-worker control room or remote-room model.

## Human-friction law

Infrastructure uncertainty must not become human waiting unless a real failure requires intervention.

- Audio can be sent while still transcribing.
- A new recording can start while prior transcription runs.
- Notes sync continuously without a visible sync ritual.
- The final Prepare drag opens the Planner rather than making the user wait on a multi-step verification UI.
- The backend records dispatch time and note versions.
- If a transcript is still pending when a packet is first served, the receiver may re-fetch; the human should not be blocked in front of Capture.
- Worker progress is reported asynchronously to Live; the human does not have to sit inside each ChatGPT tab to know whether it is alive.

## Active experiment state

### Capture

Served path: `experiments/capture-lab/`

Existing V8 proves note sync, tokenized packet creation and fresh ChatGPT launch. It still needs to evolve from direct executor behavior into the two explicit paths documented in the master spec:

- global `Preparar` → Planner;
- note/selection `Directo` → worker.

### Backend

Supabase Edge Function: `prometeo-live-lab-v1`

Current lab transport already provides tokenized dispatch. Next iteration needs durable Planner outputs and run-status events: dispatch batch, Planner run, prepared work items, worker runs, status/event stream, preview/result/surface references.

### Live host

Served path: `experiments/prometeo-live/`

Current host already supports generated surfaces through a live manifest. Next iteration should add a **Control Room** view driven by Planner/worker status events and progressive candidate previews.

## Non-regression constraints

- Global **Preparar** is a Planner/Compiler step, not direct arbitrary product execution.
- A separate **Directo** route exists for intentionally bypassing Planner.
- Do not replace AI handoff with local regex/keyword execution.
- Do not make Prometeo Live know what a calendar, cat, Student World, gym, football match, dashboard, or future request means.
- Do not require the user to export/copy notes into ChatGPT.
- Do not block the human on transcription completion when a pending state can travel safely.
- Do not collapse the system into a one-purpose TV widget.
- Do not require the human to watch every worker tab to understand progress.
- Do not expose or attempt to stream private chain-of-thought. Only high-level execution status and artifact/evidence events belong in the control room.
- Do not treat this lab as Human Accepted product authority until the Planner → prepared jobs → multiple fresh workers → durable results round trip is tested by the human.
