# Prometeo Production Desk Worker Protocol v1

Status: ACTIVE SUPPLEMENT
Schema: `prometeo.production-desk-worker/v1`

This supplement is used together with the Execution Packet and `coordination/AGENT_EXECUTION_PROTOCOL_V1.md`.

## Invocation

The human-facing launcher may contain only:

```text
PROMETEO EXECUTE · <work_item_id>
<execution_packet_url>
PRODUCTION DESK · https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/PRODUCTION_DESK_WORKER_PROTOCOL_V1.md
```

That is sufficient. Do not ask the human for the previous chat or for context recoverable from Prometeo.

## Purpose

The Production Desk is a project-level control surface. The selected captures/attachments define what the human wants now. The visible Production Desk page is not automatically the mutation target: resolve the actual project/page/capability owner from the human intent and durable Prometeo state.

The worker may be asked to plan, research, modify UI/code, fix a bug, publish a candidate, organize future work, or do several of those in one run. If the request is materially executable, execute it; do not stop at planning merely because the Production Desk also visualizes plans.

## Live progress contract

The worker must keep a sanitized progress file at:

`coordination/executions/<work_item_id>/PROGRESS.json`

This file is public coordination evidence. Never put raw Capture text, private attachment content, tokens, secrets, personal data, or other private material in it.

Write/update it at useful checkpoints, normally at least:

1. after packet/context recovery;
2. after current authority/owner resolution;
3. after the main implementation/planning pass;
4. after tests/verification;
5. immediately before RETURN.

Use this schema:

```json
{
  "schema": "prometeo.execution-progress/v1",
  "work_item_id": "<exact work item id>",
  "progress": 35,
  "stage": "RESYNC",
  "message": "Current authority recovered; resolving the exact owner.",
  "updated_at": "<ISO timestamp>"
}
```

`progress` is an integer from 0 to 99 while work is active. Keep `message` short and sanitized. Useful `stage` values include `FETCH`, `RESYNC`, `PLAN`, `EXECUTE`, `TEST`, `PERSIST`, `RETURN`.

The first live signal requires no extra write: fetching the Execution Packet changes its transport state from READY to CLAIMED, which the Production Desk polls as the initial worker ping.

## Final Production Desk response

Follow the normal Execution Protocol and write the exact required `RETURN.json`. In addition, shape `summary` so the Production Desk can render a direct answer and planning buckets.

Recommended form:

```json
{
  "summary": {
    "text": "Concise human-readable result.",
    "answer": "What the human should know now.",
    "changes": ["..."],
    "tests": ["..."],
    "buckets": [
      {
        "title": "Calendar",
        "purpose": "What this workstream/chat is responsible for.",
        "tasks": ["task 1", "task 2"],
        "deliverable": "Expected concrete output.",
        "status": "READY"
      }
    ]
  }
}
```

`buckets` is optional when the request genuinely has no useful decomposition. When the user asked for planning, orchestration, or several parallel fronts, include it. A bucket describes a future workstream/chat/job; it is not proof that another worker was actually launched.

When the request was a direct product change, `summary.answer` should report what changed and `summary.buckets` may list remaining or follow-up work only if useful.

## Continuity law

A later Production Desk execution receives previous execution results through the Page Change Thread. Treat the new captures as a delta against that durable history. Preserve accepted behavior and previous negative knowledge. Do not rebuild from scratch because a later note says only “make this a little bigger”, “change this detail”, or equivalent.

## Completion

Before finishing, ensure:

- progress file reached the final pre-return checkpoint;
- requested material work was actually executed when executable;
- tests/evidence were run where relevant;
- durable RETURN was written;
- worker status was released according to the main Execution Protocol;
- final summary is useful inside the Production Desk without requiring the original chat.
