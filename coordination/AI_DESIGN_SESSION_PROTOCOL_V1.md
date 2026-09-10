# Prometeo AI Design Session v1

This protocol is for a **disposable interactive thinking chat** opened from a Prometeo page with `PROMETEO PENSAR · <session_code>` plus a private session-packet URL.

It is not an execution run. Its job is to think, research, compare, design and help the human refine an idea while Prometeo remains the durable memory.

## Start

1. Fetch the private session packet supplied in the launcher. Treat the capability URL and every embedded save token as private; never publish them to GitHub, coordination files, search indexes or public chat artifacts.
2. Load the packet's Prometeo stable entry and reconcile its target page against Current, Catalog, Lineage and the target's writable owner before making claims about current product state.
3. Read the page memory, human notes, AI-derived notes, files, execution history and prior saved AI-session summaries included by the packet.
4. If packet and repository disagree, repository authorities decide product truth; the packet still decides which private notes/context this session is authorized to read.
5. Do not ask the human to recover an older ChatGPT conversation. Durable continuity comes from Prometeo's prior AI-session summaries and page memory.

## First response

The first substantive response should reconstruct the problem deeply enough that the human can immediately continue working. Integrate:

- what the page/product currently is;
- the newest unworked observations;
- relevant prior decisions and negative knowledge;
- previous execution outcomes and regressions;
- prior AI-session conclusions;
- important files/assets and authority boundaries;
- uncertainties that genuinely matter.

Do not print a ceremonial status dump. Use the context to do useful thinking.

## During the conversation

- Research externally when it improves the design or decision and the human has not prohibited web research.
- Inspect relevant source/code when useful.
- Generate alternatives, test assumptions, critique designs and refine details interactively.
- Preserve distinctions between human notes, machine transcription, AI-derived guidance, Current, Human Accepted and Served.
- Do not modify/publish Prometeo by default. If the human explicitly changes the task into execution, use the normal Prometeo execution authority rather than silently treating this thinking session as an executor.
- Do not rely on the ChatGPT conversation itself as the only durable record.

## `Guardar`

When the human says **Guardar** (or an unambiguous equivalent such as “guardá esto en Prometeo”), distill the useful work of the session. Do **not** dump the whole transcript.

Create one payload with this shape:

```json
{
  "title": "short descriptive session title",
  "ai_note": "high-quality actionable note for a future execution agent",
  "continuity_summary": "what a future thinking chat needs to continue without this chat",
  "decisions": [],
  "negative_knowledge": [],
  "open_questions": [],
  "sources": [],
  "artifacts": [],
  "chat_url": "optional; include only when a reliable URL is actually available"
}
```

`ai_note` is the important artifact. It should convert the conversation into implementation-grade guidance: intent, behavior, constraints, rationale, edge cases, accepted/rejected alternatives, relevant source references and what success should look like. Keep uncertainty explicit instead of inventing facts.

### Preferred save path

If this chat has an authorized Supabase connector/tool, invoke the private service-side save capability described by the session packet using the packet's `save_token` and the payload above. The canonical RPC is:

`public.prometeo_save_ai_session_v1(token, payload_jsonb)`

Never echo the token to the user or persist it in public artifacts.

### Fallback save path

If a direct authorized save tool is unavailable:

1. Serialize the JSON payload as UTF-8.
2. Encode it as URL-safe base64 without padding.
3. Take the packet's `save.fallback_page` URL and append `#p=<encoded_payload>`.
4. Give the human **one clickable “Guardar en Prometeo” link**. Do not ask them to copy JSON or tokens manually.

The fragment keeps the note body out of ordinary server request logs; the Prometeo save page sends it in a POST body to the private session capability.

After a confirmed save, state that the session was saved as an AI-derived note on that page. A later **Trabajar** run will automatically include that note if it is still unworked.

## Continuity rule

A future `Pensar` session does not need this ChatGPT transcript. Its packet should receive this session's saved continuity summary and AI note, plus subsequent page notes/results. If an actual chat URL was reliably captured it may be stored as an optional convenience handle, but it is never required for recovery.

## Authority and privacy

- Saved AI notes have authority `AI_DERIVED`; they are useful guidance, not Human Accepted truth.
- Private notes/files/session packets never become public GitHub coordination content.
- A thinking session does not create a Served/Human Accepted promotion.
- `Pensar` does not consume notes. `Trabajar` is the separate explicit action that selects the current unworked set for implementation.
