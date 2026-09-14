# Prometeo Live Handoff Lab — 2026-09-14

Status: ACTIVE EXPERIMENT / NOT PRODUCT AUTHORITY

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

Example:
- two Calendar comments + one Gym comment => **2 prepared jobs**, not 3 raw-note jobs and not 1 giant job;
- Calendar + Student World + Navigator notes => three coherent prepared jobs even if six or ten raw notes were captured.

After Planner finishes, the human sees prepared cards. Dragging the action on an individual card opens a fresh execution chat for that specific job. Five independent prepared jobs may therefore spawn five independent ChatGPT workers, potentially in parallel.

Primary human flow:

**ANOTAR → PREPARAR (1 Planner) → JOB CARDS → PRODUCIR (N workers)**

## Core handoff flow

1. Human writes or records arbitrary notes in Capture.
2. Notes sync silently in the background as they change.
3. Human drags **Preparar** to the right.
4. That gesture does not execute product changes and does not ask for a second confirmation.
5. Capture performs one final silent sync to close the tiny network race, creates a tokenized planner packet, and immediately opens a fresh ChatGPT window with a deliberately tiny prompt:

   `PROMETEO PREPARE · <code>\n<packet_url>`

6. The fresh Planner reads the packet URL itself. The packet contains the notes, dispatch timestamp, note versions/freshness, and planner contract.
7. Planner groups/splits the batch into coherent work items and publishes prepared job cards back to Prometeo.
8. Each prepared card has its own tactile **Producir / Trabajar** action.
9. Dragging a prepared card opens a fresh execution ChatGPT with a tiny worker prompt containing only the work-item identifier + packet URL.
10. That worker reads its own execution packet, performs the arbitrary software/product work, persists results, and returns durable status/evidence.
11. Multiple workers may run in parallel when their work is independent.

## Prometeo Live is both control room and result host

The Live surface must not be limited to showing final generated pages. It should also visualize the orchestration itself.

When a Planner or worker spawns, Prometeo Live can immediately create a live card/tile such as:

- `Planner · organizing 11 notes`
- `Calendar · worker 1 · reading context`
- `Gym · worker 2 · implementing`
- `Navigator · worker 3 · testing`

Each run may carry lightweight visual identity chosen by the Planner or host:
- short title;
- stable color/accent;
- small avatar/image/icon if useful;
- work-item code;
- target page/workstream;
- concise prompt summary;
- current phase;
- last status message;
- started_at / updated_at;
- final candidate/served/result link when available.

This is not chain-of-thought streaming. Workers publish concise operational progress events after meaningful steps, for example:

`SPAWNED → READING_CONTEXT → PLANNING → IMPLEMENTING → TESTING → PUBLISHING → DONE`

or `BLOCKED / FAILED` with a short human-readable reason.

A worker should publish its first status event immediately after opening its packet so Prometeo Live can show that the chat has spawned and is alive before any final artifact exists.

The control room can scale from one worker to many. If six jobs are prepared and the human launches all six, Live may show six animated worker cards simultaneously while result surfaces update independently underneath or in another mode.

## Live result surfaces

Prometeo Live must remain a universal host for arbitrary agent-produced software, not a TV widget with predefined meanings.

Manifest contract:

```json
{
  "schema": "prometeo.live-manifest/v1",
  "revision": 2,
  "updated_at": "ISO-8601",
  "layout": "single | split | quad",
  "surfaces": [
    {"id":"main","title":"...","url":"./surfaces/main.html"}
  ]
}
```

The host may display one, two, or four independent live surfaces. Each surface can itself be a complete interactive app. This supports single-page generation, split-screen tools, four parallel visual alternatives, iterative donor/recombination workflows, and arbitrary future page types.

The result-host layer and the worker-control-room layer are related but distinct. A worker can exist and visibly be `working` before it has produced any page surface.

## Human-friction law

Infrastructure uncertainty must not become human waiting unless a real failure requires intervention.

- Audio can be sent while still transcribing.
- A new recording can start while prior transcription runs.
- Notes sync continuously without a visible sync ritual.
- The final Prepare drag opens the Planner rather than making the user wait on a multi-step verification UI.
- The backend records dispatch time and note versions.
- If a transcript is still pending when a packet is first served, the packet may instruct the receiving AI to re-fetch before finalizing; the human should not be blocked in front of Capture.
- Worker progress is reported asynchronously to Live; the human does not have to sit inside each ChatGPT tab to know whether it is alive.

## Active experiment state

### Capture

Served path: `experiments/capture-lab/`

The existing V8 transport currently proves that Capture can sync notes, create a tokenized packet and open a fresh ChatGPT. However, its current packet/worker behavior must be evolved so the first drag is a **Planner/Compiler**, not a direct arbitrary execution worker.

### Backend

Supabase Edge Function: `prometeo-live-lab-v1`

Current lab transport already provides tokenized dispatch. Next iteration needs durable planner outputs and run-status events, conceptually:
- dispatch batch;
- planner run;
- prepared work items;
- worker runs;
- worker status/event stream;
- result/surface references.

This remains a lab transport, not the final private production authorization model.

### Live host

Served path: `experiments/prometeo-live/`

Current host already supports generated surfaces through a live manifest. Next iteration should add a **Control Room** view driven by planner/worker status events so spawned chats become visible immediately even before they publish product artifacts.

## Non-regression constraints

- The first **Preparar** drag is a planner/compiler step, not direct arbitrary product execution.
- Do not replace the AI handoff with local regex/keyword execution.
- Do not make Prometeo Live know what a calendar, cat, Student World, gym, football match, dashboard, or any future request means.
- Do not require the user to export/copy notes into ChatGPT.
- Do not block the human on transcription completion when a pending state can travel safely.
- Do not collapse the system into a one-purpose TV widget.
- Do not require the human to watch every worker tab to understand progress; Live should expose concise operational state.
- Do not expose or attempt to stream private chain-of-thought. Only high-level execution status and artifact/evidence events belong in the control room.
- Do not treat this lab as Human Accepted product authority until the Planner → prepared jobs → multiple fresh workers → durable results round trip is tested by the human.
