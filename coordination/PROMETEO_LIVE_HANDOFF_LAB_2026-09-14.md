# Prometeo Live Handoff Lab — 2026-09-14

Status: ACTIVE EXPERIMENT / NOT PRODUCT AUTHORITY

## Human intent

The human wants Capture to become a frictionless handoff surface, not a command parser. Notes may request anything: a cat image, a new calendar, a sports dashboard, a three-column live page, a four-way comparison workspace, or iterative redesign of existing surfaces. Prometeo must not anticipate or hard-code a vocabulary of allowed commands.

## Core flow

1. Human writes or records notes in Capture.
2. Notes sync silently in the background as they change.
3. Human drags **Preparar** to the right.
4. That gesture does not execute the request inside the Capture page and does not ask for a second confirmation.
5. Capture performs one final silent sync to close the tiny network race, creates a tokenized handoff packet, and immediately opens a fresh ChatGPT window with a deliberately tiny prompt:

   `PROMETEO LIVE · <code>\n<packet_url>`

6. The fresh AI reads the packet URL itself. The packet contains the notes, dispatch timestamp, note versions/freshness, and the execution contract.
7. The AI interprets the notes as arbitrary software/product intent, uses the connected GitHub tool, creates or modifies real HTML/CSS/JS surfaces, and updates `experiments/prometeo-live/live-manifest.json` last.
8. Prometeo Live polls that manifest and changes automatically. The human does not copy files, move prompts, or refresh manually.

## Human-friction law

Infrastructure uncertainty must not become human waiting unless a real failure requires intervention.

- Audio can be sent while still transcribing.
- A new recording can start while prior transcription runs.
- Notes sync continuously without a visible sync ritual.
- The final drag opens the new chat rather than making the user wait on a multi-step verification UI.
- The backend records dispatch time and note versions. The packet endpoint can briefly wait for a just-finishing audio transcript, but that waiting happens on the agent side, not in front of the human.
- If a transcript is still pending when the packet is served, the packet tells the agent to re-fetch once before finalizing.

## Active implementation

### Capture

Served path: `experiments/capture-lab/`

Active wrapper: `experiments/capture-lab/capture-lab-v8.js`

V8 preserves the previously working Capture/Whisper path and adds:
- automatic remote note sync;
- final silent sync on drag;
- tokenized dispatch;
- fresh ChatGPT launch using the returned `chatgpt_url`;
- no predefined interpretation of note content in the browser.

### Backend

Supabase Edge Function: `prometeo-live-lab-v1`

Tables:
- `prometeo_live_lab_notes`
- `prometeo_live_lab_dispatches`

The public packet is capability-token scoped and expires. The Capture write path uses a separate lab key. This is a lab transport, not the final private production authorization model.

### Live host

Served path: `experiments/prometeo-live/`

Files:
- `experiments/prometeo-live/index.html`
- `experiments/prometeo-live/live-manifest.json`
- `experiments/prometeo-live/surfaces/*`

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

The host supports one, two, or four independent live surfaces. Each surface can itself be a complete interactive app. This makes the same handoff usable for single-page generation, split-screen tools, parallel visual alternatives, and iterative donor/recombination workflows.

## Non-regression constraints

- Do not replace the AI handoff with local regex/keyword execution.
- Do not make Prometeo Live know what a calendar, cat, Student World, football match, dashboard, or any future request means.
- Do not require the user to export/copy notes into ChatGPT.
- Do not block the human on transcription completion when a pending state can travel safely.
- Do not collapse the system into a one-purpose TV widget. Prometeo Live is a universal host for agent-produced software surfaces.
- Do not treat this lab as Human Accepted product authority until the complete fresh-chat round trip is tested by the human.
