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

The candidate always declares the concrete capabilities required by its selected private-context adapter. The protocol itself does **not** require one storage/provider.

- `github_repository_write` is required for the ordinary GitHub claim / PREWRITE / RETURN path.
- Any private-context capability is adapter-specific and MUST come from the compact frontier candidate. Never invent, silently add or globally hard-code a provider capability.
- `context_transport` and `private_packet_lookup` MUST both be explicit in the candidate. If either is missing or the runtime cannot use the declared transport, do not claim that candidate.

The currently deployed adapter may declare `context_transport=SUPABASE_CONNECTED_PROJECT` with `connected_supabase_prometeo`. That is one adapter, not an architectural dependency. A future authenticated adapter may replace it without changing the Page Change authority, privacy, PREWRITE, RETURN or verifier laws.

## After a successful claim

The compact frontier provides `work_item_id`, `context_transport` and `private_packet_lookup`.

Resolve exactly the owned private packet using the **declared** authenticated transport only after the atomic opportunity claim succeeds. Do not probe alternate providers, downgrade to public context, or browse unrelated captures, threads or packets.

For the current `SUPABASE_CONNECTED_PROJECT` adapter, the lookup resolves the exact `work_item_id` in the declared Prometeo project/table and requires the existing connected capability. Other adapters must supply an equally bounded exact lookup contract in the frontier before they are eligible.

The resolved private packet must expose the fields needed by the execution contract, including:

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

`FETCH → VALIDATE → REINCARNATE → RESYNC → CLAIM/WRITER_STATUS → RESOLVE_OWNER → RECOVER_THREAD → PLAN → PREWRITE → EXECUTE → TEST → PERSIST → RETURN → RECEIPT → UPDATE_THREAD → RELEASE`

Important rules:

1. Resolve the page/workstream source owner from the packet and CURRENT before editing.
2. Re-read mutable targets immediately before mutation.
3. Treat every selected human instruction as input to one coherent candidate version.
4. Preserve accepted baseline and negative knowledge when the source owner exposes them.
5. Candidate is not Human Accepted and not automatically Served.
6. Never invent visual/browser/test evidence.
7. If concurrent HEAD movement materially changes the owned target, stop or re-plan rather than blindly layering the old plan.
8. Use bounded decomposition only when the owned task genuinely benefits; do not manufacture workers or subtasks for metrics.
9. The ordinary opportunity claim grants execution authority, but material work must still expose/refresh the narrow active writer status required by the Global Agent Constitution when practical; this is what lets overlapping live write scopes become visible.
10. Immediately before material mutation, run the CURRENT PREWRITE law: refresh EPOCH/compiled packet as needed, re-fetch the target, reconcile active overlapping writers, and use CAS/blob-SHA/head-aware writes.
11. After RETURN or a real boundary, release active writer status so completed Page Change work does not become a phantom HARD_WRITE_COLLISION.

## Primary Chat response root branch

When the claimed compact frontier candidate has `kind=PRIMARY_CHAT_RESPONSE_ROOT`, this is not an ordinary single-worker Page Change answer.

The candidate MUST already expose a sanitized `primary_chat_response_request` with schema `prometeo.primary-chat-response-request-public-projection/v1`. Before any materialization:

1. Claim the root through the ordinary atomic opportunity claim. The public root is discovery only.
2. Resolve exactly the claimed private packet through its declared `context_transport` / `private_packet_lookup`.
3. Require the private packet to remain READY/unexpired and require `snapshot.intent.primary_chat_response_request.request_id` to equal the public root `request_id`. A mismatch is a bounded stale/private-correlation boundary.
4. Never publish the packet transcript, capture text, tokens or private envelope. The only public request input is the sanitized projection already carried by the root.
5. Compile the four-way fanout with `scripts/primary-chat-response-fanout-v1.mjs` and materialize it with `scripts/materialize-primary-chat-response-root-v1.mjs`, reusing the CURRENT compiled-dispatch root and a capability-neutral ready WorkBlock template.
6. The public private-context binding passed to the materializer contains only `work_item_id`, declared transport, the exact sanitized lookup locator, required capabilities, `raw_text_public=false` and `resolution=POST_CLAIM_ONLY`. Unknown lookup fields are discarded by the materializer.
7. Persist exactly four deterministic `prometeo.portfolio-derived-job/v1` candidate jobs. Do not invent worker identities or claims. Their ordinary portfolio PIN/claim remains execution authority.
8. CREATE replay is idempotent: if the same request-specific candidate file already exists, compare it against the deterministic compiled output. Identical means already materialized; divergent bytes are a collision/boundary. Never create a differently named duplicate to escape `CREATE_EXISTS`.
9. The root worker's own durable RETURN reports only sanitized materialization evidence and the four candidate job refs. It is not one of the four candidate answers and it must not claim that the response was synthesized or served.
10. Re-enter E8/SUBMIT_NEXT immediately. Candidate RETURNS are consumed incrementally by the existing Guide Integrator and the C006/C007 response contracts; the human is not a routing step.

The root fanout is successful only when four claimable candidate jobs exist durably. `candidates_prepared=4` is not equivalent to four workers alive or four RETURNS.

## RETURN

The packet supplies the canonical `return_path`.

Write the existing `prometeo.execution-result/v1` RETURN there with sanitized evidence.

The Page Change backend will ingest the durable GitHub RETURN through its existing `execution_status` polling path and surface the result in the same page thread.

For `WORKER_POOL` material execution, the builder's highest truthful success status is `CANDIDATE_READY`. A builder must never self-declare `VERIFIED` or `SERVED`; the backend also fences those claims back to `CANDIDATE_READY` until an independent verifier result is ingested.

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
