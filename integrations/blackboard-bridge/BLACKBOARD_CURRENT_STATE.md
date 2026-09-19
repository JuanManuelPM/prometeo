# BLACKBOARD_CURRENT_STATE

Snapshot: 2026-09-19 integration pass.

## Verified in repository / deployed development infrastructure

- Firefox bridge package in `main`: `0.5.0`.
- The bridge reuses the user's authenticated `palermo.blackboard.com` session and does not request/store the Blackboard password.
- Active Supabase functions observed: `study-blackboard-v1` v2, `study-blackboard-files-v1` v1, `study-blackboard-probe-v1` v2.
- Current database aggregate observed before this integration: 147 `study_source_artifacts`, 142 historical canonical metadata rows, 23 canonical text versions, 0 queued binary extraction jobs, 5 derived events.
- Historical candidate migration tables for canonical metadata / text versions / extraction queue / derived events remain intact. Their RLS state was not weakened.
- New `study_document_contract_v1_derivatives` is additive, has RLS enabled, and is used only for the authoritative v1 contract identities/cache bridge.

## Reconciliation decision

The old Blackboard branch's provider/source graph, extraction queue and derived-event semantics are retained. Its separate canonical document schema/identity is superseded for Reader-facing data by `.study-system/document-pipeline/v1/CANONICAL_DOCUMENT.schema.json` from `main`.

`Blackboard attachment -> private_ref -> SOURCE ARTIFACT -> shared MIME extractor -> Canonical Document -> Reader Payload` is now the code path. There is no Blackboard PDF parser.

## Boundaries

`study_bb_files` had no real mirrored files in the inspected snapshot, so `BLACKBOARD_FILE_PIPELINE_LIVE_VERIFIED` is false. A fresh 0.5.0 browser sync/version-bound receipt is also still pending. These boundaries do not block Drive, the shared extractor, Reader projection, TTS projection or the public canary.
