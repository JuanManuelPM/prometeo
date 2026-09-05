# Prometeo Global Shell v2 · Capture + Patent

Status: `CANDIDATE_INTEGRATED`
Owner: `shared/prometeo-shell/v2`
Baseline preserved: `shared/prometeo-shell/v1`

## What v2 adds

- Preserves the v1 local-first voice queue and Whisper Small Spanish worker.
- Resolves a stable `page_id` from `catalog/pages.json` with deterministic fallback.
- Keeps page path, href, title and viewport on every capture.
- Synchronizes capture text privately to the existing Prometeo Supabase project through `prometeo-capture` Edge Function.
- Uses a 256-bit local workspace secret; the browser never receives a service-role key.
- Direct database access remains closed by RLS; the Edge Function performs custom workspace authentication.
- `Vincular` can copy/import the workspace code so another browser/device can join the same private Inbox.
- `Esta página` and `Todas` remain available.
- `Preparar patente` freezes all visible, transcribed, not-yet-patented captures into an immutable remote snapshot.
- The patent includes affected pages, selected captures, the last 10 literal captures per page, rolling page memory when present, Prometeo Boot pointers and `PROMETEO_EXHAUSTIVE_100/v1` execution protocol.
- A patent returns a minimal two-line command that can be pasted into a completely new ChatGPT conversation.
- `Abrir ChatGPT` copies that command and opens ChatGPT; it does not automate sending or control ChatGPT DOM.
- Patent read URLs are opaque, expire after seven days, are no-index/no-store and expose only the frozen snapshot, never the whole private Inbox.

## Activation

`?prometeo=1` enables the owner shell for the GitHub Pages origin and stores the choice locally.

`?prometeo=0` disables the shell without deleting captures.

## Storage layers

1. IndexedDB is still the first write and survives navigation/offline use.
2. Remote sync is secondary and retried when online.
3. GitHub remains product/source authority; Supabase stores captures/patents, not authoritative application code.

## Security boundary

The workspace code shown by `Vincular` is a bearer secret. Treat it like a private key: do not publish it in GitHub, screenshots or public chats. Patent URLs use separate random tokens and can expose only their immutable batch snapshot.
