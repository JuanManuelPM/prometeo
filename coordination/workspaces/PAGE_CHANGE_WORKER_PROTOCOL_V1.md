# PROMETEO · PAGE CHANGE WORKER PROTOCOL V1

Status: CURRENT protocol for **post-claim execution context** of Page Change work delivered through the existing Prometeo worker allocator.

This protocol does not create a worker family, queue, scheduler, Guide or CURRENT architecture.
It is a post-claim adapter between the existing Page Change / Execution Packet system and the existing universal worker runtime.

## Authority boundary

A Page Change candidate in the compact worker frontier is only a discovery hint.

Execution authority remains the ordinary atomic GitHub opportunity claim supplied by the allocator:

`coordination/opportunities/claims/page-change-<work_item_id>.json`

Do not retrieve private Page Change context before the claim succeeds.

## Required capabilities

The candidate declares:

- `github_repository_write`
- `connected_supabase_prometeo`

If either capability is unavailable, do not claim the candidate.

The Prometeo Supabase project is:

`catnohyouxqjjtseaueb`

## After a successful claim

The compact frontier provides `work_item_id` and `private_packet_lookup`.

Use the connected Prometeo Supabase control plane to retrieve exactly that packet from:

`public.prometeo_execution_packets`

by exact `work_item_id`.

Retrieve only the owned row needed for this work item. Do not browse unrelated captures, threads or packets.

Required fields:

- `snapshot`
- `snapshot_hash`
- `return_path`
- `status`
- `expires_at`

The packet must still be `READY` and unexpired.

If it is missing, terminal, expired, or its `snapshot.work_item_id` differs from the claimed work item, do not mutate product state. Persist a bounded stale/invalid claim result and re-enter allocation.

## Private context law

The packet snapshot is private execution context.

Never publish to GitHub:

- raw human Capture transcripts;
- attachment access URLs/tokens;
- packet tokens;
- return tokens;
- private audio;
- private session payloads.

Use private literals only to understand and execute the owned task.

Public durable artifacts may contain sanitized requirements, decisions, changed paths, verification evidence and outcome summaries.

## Execution

After packet retrieval, follow the packet's embedded `execution.protocol_url` and the CURRENT `coordination/AGENT_EXECUTION_PROTOCOL_V1.md`.

The intended lifecycle remains:

`FETCH → VALIDATE → REINCARNATE → RESYNC → RESOLVE_OWNER → RECOVER_THREAD → PLAN → EXECUTE → TEST → PERSIST → RETURN → RECEIPT → UPDATE_THREAD`

Important rules:

1. Resolve the page/workstream source owner from the packet and CURRENT before editing.
2. Re-read mutable targets immediately before mutation.
3. Treat every selected human instruction as input to one coherent candidate version.
4. Preserve accepted baseline and negative knowledge when the source owner exposes them.
5. Candidate is not Human Accepted and not automatically Served.
6. Never invent visual/browser/test evidence.
7. If concurrent HEAD movement materially changes the owned target, stop or re-plan rather than blindly layering the old plan.
8. Use bounded decomposition only when the owned task genuinely benefits; do not manufacture workers or subtasks for metrics.

## RETURN

The packet supplies the canonical `return_path`.

Write the existing `prometeo.execution-result/v1` RETURN there with sanitized evidence.

The Page Change backend will ingest the durable GitHub RETURN through its existing `execution_status` polling path and surface the result in the same page thread.

A valid result should truthfully include, when applicable:

- `work_item_id`
- terminal status
- concise sanitized summary
- changed paths
- tests/checks actually executed
- candidate/public URL when real
- residual risks or blockers
- evidence refs

Never place the original private human messages in RETURN.

## Continue

After durable RETURN, follow the normal universal worker productive-chain law and re-enter the existing compact frontier in the same chat when capacity remains.

The human should not be used as a message bus.
