# Prometeo Button Worker Protocol v1

This is an additive UI/progress convention for work launched from the Prometeo button. It does not replace `coordination/AGENT_EXECUTION_PROTOCOL_V1.md`; the canonical execution protocol and Global Constitution remain authoritative.

## Invocation

The human-facing launcher copies a normal Prometeo command:

```text
PROMETEO EXECUTE · <work_item_id>
<execution_packet_url>
BUTTON UI · https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/BUTTON_WORKER_PROTOCOL_V1.md
```

Fetch and execute the packet exactly as required by the canonical protocol.

## Progress pings

The button polls the following optional public, sanitized progress artifact:

`coordination/executions/<work_item_id>/PROGRESS.json`

After opening/validating the packet, and at useful material checkpoints, create or update that file when GitHub write access is available. Do not write private Capture text, packet URLs, secrets, attachments, or user-sensitive material into it.

Schema:

```json
{
  "schema": "prometeo.button-progress/v1",
  "work_item_id": "WI-...",
  "progress": 30,
  "stage": "RESYNC",
  "message": "Short sanitized human-facing status.",
  "updated_at": "ISO-8601"
}
```

`progress` is an integer from 0 to 100. Prefer these coarse checkpoints rather than noisy updates:

- 10: packet fetched and validated
- 30: runtime/current/owner resynchronized
- 55: material work underway
- 80: implementation complete, tests/verification underway
- 95: persistence/RETURN/receipt being finalized
- 100: final RETURN persisted

The button already gets its first automatic ping from the execution packet changing from READY to CLAIMED when the packet is opened. `PROGRESS.json` supplies the intermediate feedback only.

## Preserve-first law

A small human correction means a small delta against the current authoritative product. Do not rebuild or replace working behavior unless the request explicitly requires replacement. Resolve the real capability owner before editing.

## Plan-only requests

If the selected human notes explicitly say that the requested mode is planning/research only, do not modify product code. Produce the requested plan as the execution result and persist a normal sanitized RETURN so the button can show the result.

## Final result for the button

In the normal `prometeo.execution-result/v1` RETURN, `summary` may additionally include:

```json
{
  "text": "Concise answer to the human.",
  "answer": "Optional fuller answer shown inside the Prometeo button.",
  "buckets": [
    {
      "title": "Chat / workstream name",
      "purpose": "What this worker would do",
      "tasks": ["..."],
      "deliverable": "Expected output"
    }
  ]
}
```

This extension is optional and sanitized. Never include private raw Capture transcript literals in public GitHub coordination files.
