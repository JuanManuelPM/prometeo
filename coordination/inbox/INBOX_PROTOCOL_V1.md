# Prometeo Inbox Protocol v1

Purpose: give the human a tiny durable inbox for genuinely useful Prometeo messages, written like a short chat from someone close: few words, no dashboard prose, no implementation noise.

## Path

Messages are append-only JSON files under:

`coordination/inbox/messages/<created_at_compact>-<message_id>.json`

## Shape

```json
{
  "schema": "prometeo.inbox-message/v1",
  "message_id": "L001",
  "created_at": "<ISO-8601>",
  "author": "guide|worker|system",
  "text": "<plain human message>",
  "topic": "<short topic or null>",
  "refs": []
}
```

## Human-tone law

- `text` SHOULD be <= 110 characters and MUST be <= 180 characters.
- One idea per message.
- No commit hashes, schema names, queue IDs, worker IDs, file paths, percentages or technical receipts in the visible text unless the human explicitly needs that exact identifier.
- Prefer forms such as: `Che, ya quedó andando el registro de workers.` or `Ojo: audio → texto sigue trabado.`
- Never write motivational filler, routine status, every worker completion, or information already obvious in Live.
- A worker may write an inbox message only for a material user-relevant result, blocker, question, regression or surprising discovery. Routine execution stays in receipts.
- The guide may write when something is worth telling the human but does not deserve interrupting the current conversation.

## Continuity

`/g` loads the recent inbox before its first human-facing response. The human may later refer to a message by its short `message_id`, topic, or wording (for example `lo de L014` or `eso que me dijiste de audio`) and the guide should resolve it from durable inbox history without asking the human to paste it again.

## Truth boundary

Inbox is human communication, not product authority. A message may summarize durable evidence but never promotes Candidate/Verified/Current/Human Accepted/Served by itself.
