# Prometeo Control Room V11 · Workspace Loop Candidate

Status: **CANDIDATE · V10 remains rollback/current baseline until canary + human promotion**

Public candidate:
https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/

## What changed

V11 is an evolution of V10, not a parallel control plane.

It preserves V10's:

- Ahora
- Proyectos
- Herramientas
- Historial
- Estadísticas
- Organismo

and adds:

- **Espacios**: the current Catalog as a folder/workspace view for all known pages plus durable Visual fronts.
- **Trabajo**: Page Change Thread status/results across pages.
- **Notas · HACER** on each page: persistent text/audio/files through the existing Capture/Page Change system.
- **WORKER_POOL delivery**: HACER freezes pending feedback into the existing Execution Packet model and exposes only sanitized metadata to the existing worker allocator.
- **↻ manual**: reincarnation fallback for interactive work.
- **Resilient loading**: Current Tree first, optional RPCs independently, local last-known-good cache, current Catalog fallback.

## Architecture

Normal V11 loop:

`page → text/audio/files → Page Change Thread → HACER → Execution Packet → existing live allocator → ordinary worker claim → private packet post-claim → owner edit/test/persist → GitHub RETURN → same Page Change feed → human review`

There is no second scheduler and no second feedback database.

### Source owners retained

- Catalog page identity: `catalog/CATALOG_MANIFEST.json`
- Page feedback/execution: existing `prometeo-change-loop-v1` + current Page Change tables/storage
- Worker allocation: existing `live-feed.yml`, fast allocator and compact claim frontier
- Execution law: `coordination/AGENT_EXECUTION_PROTOCOL_V1.md`
- Visual continuity: existing `visuals/fronts/*` and handoffs
- Current/Organism/Work Context: unchanged authorities/projections

## Privacy

The public worker frontier never includes:

- Capture transcripts
- packet URLs/tokens
- attachment URLs/tokens
- audio
- private AI-session payloads

A worker must first win the normal GitHub claim and then use its authorized connected Prometeo Supabase capability to load exactly the owned private packet.

## Compatibility

Existing Universal Shell/Page Change callers remain `MANUAL_CHAT` by default and continue opening ChatGPT.

Only callers that explicitly set `WORKER_POOL` use the automatic worker path. Control Room V11 does this.

## Promotion gate

Do not supersede V10 or call V11 Human Accepted until a real end-to-end canary proves:

1. note/audio/file captured;
2. HACER creates WORKER_POOL execution packet;
3. sanitized item reaches live claim frontier;
4. compatible worker wins ordinary claim;
5. worker loads exact private packet only post-claim;
6. worker writes truthful RETURN;
7. existing Page Change ingestion surfaces the result;
8. human can review candidate without acceptance being invented.

Preservation contract:
`coordination/design-dna/preservation-contracts/CONTROL_ROOM_V11_WORKSPACE_LOOP_V1.json`
