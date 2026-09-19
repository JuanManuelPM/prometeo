# BLACKBOARD_CURRENT_STATE

Snapshot: 2026-09-19. Scope: Blackboard ingestion for Study Library only. No Facultad UI, Reader/TTS UI, or authentication bypass work.

## Executive state

Blackboard already participates in Study's historical SOURCE → CONTENT separation. The browser extension captures only content visible to the user's authenticated `palermo.blackboard.com` session; the backend persists raw Blackboard rows and projects them into the common `study_source_artifacts` graph. The missing layer was an explicit provider-neutral Canonical Document contract and a shared document-extraction handoff. `study_canonical_document_pipeline_v1` now supplies that layer without changing public UI.

The repository bridge package is **0.5.0** (`integrations/blackboard-bridge/firefox/manifest.json`). Runtime receipts do **not** bind a successful sync to that addon version, so “0.5.0 browser-verified” must not be claimed. The public installer copy and `INTEGRATION_MANIFEST.json` were still describing 0.4.x before this work; that is documentation drift, not evidence that the source tree is 0.4.

## VERIFIED

Verified directly against current repository + deployed Supabase state:

- Blackboard source base is `https://palermo.blackboard.com`.
- Browser bridge uses the already-authenticated Firefox Blackboard session and does not request/store the Blackboard password.
- Browser source package in repo: `0.5.0`.
- Deployed private endpoints are active:
  - `study-blackboard-v1` v2
  - `study-blackboard-files-v1` v1
  - `study-blackboard-probe-v1` v2
- `study-blackboard-v1` custom-authenticates with the Study workspace token hash and exposes `status`, `data`, `ingest`, and `calendar-sync` actions.
- `study-blackboard-files-v1` stores mirrored bytes only in private bucket `study-blackboard-files`, max 50 MiB, and returns short-lived signed URLs.
- Blackboard raw persistence exists in `study_bb_courses`, `study_bb_items`, `study_bb_events`, `study_bb_changes`, `study_bb_sync_runs`, `study_bb_files`, `study_bb_sources`.
- Current aggregate state at snapshot:
  - 4 Blackboard courses
  - 36 Blackboard items
  - 5 Blackboard calendar events
  - 0 mirrored Blackboard files
  - 41 Blackboard `study_source_artifacts`
- Canonical course mapping is through `study_course_aliases`:
  - exact Blackboard `course_key` aliases (`source_kind=blackboard`)
  - Blackboard course-code aliases (`source_kind=blackboard_course_code`)
  - exact `course_key` wins; course-code-in-content fallback is used only in the existing source-graph projection.
- Existing `study_sync_bb_item_to_source_graph()` trigger already projects `study_bb_items` into common `study_source_artifacts` with stable `source_id = bb:item:<item_key>`.
- Existing file-preservation trigger already turns a mirrored Blackboard file into `study_source_artifacts.private_ref = storage:study-blackboard-files/...` and records the content hash.
- New provider-neutral canonical layer is deployed:
  - 142 canonical documents total at backfill: 36 Blackboard, 105 Google Drive, 1 palermo.edu
  - 23 Blackboard documents have full versioned `source_text`
  - 13 Blackboard documents are metadata-only
  - 105 Drive documents remain metadata-only until a complete text/binary handoff is verifiable
  - 5 Blackboard calendar events are represented as derived events with direct source dates
- New canonical/document/event tables have RLS enabled and no public policies.
- No public Study Library UI was modified.

## STATICALLY PRESENT

Code/config exists, but current runtime success is not proven by a fresh receipt:

- Extension crawler discovers course/content/calendar/grades/messages/announcements/file links, captures rendered page body text, due-date hints, parent/source-page context, and bounded navigation.
- `blackboard.js` opportunistically snapshots JavaScript-rendered Blackboard pages.
- File mirror code fetches accessible file URLs with the authenticated Blackboard browser session, rejects HTML/login responses, skips large media, enforces 50 MiB, and uploads through the private file endpoint.
- Automatic/manual sync and 15-minute browser alarm exist.
- Server-side Blackboard calendar sync exists.
- Canonical file queue is provider-neutral: any source artifact with a private binary ref enters `study_document_extraction_queue` using `parser_profile=document-default`; there is no Blackboard PDF/DOCX parser.
- Synthetic schedule derivation adapter exists for explicit full dates in document text and a conflict marker that preserves every source value.

## HISTORICAL RECEIPT

Historical receipts prove the bridge has worked, but they are not equivalent to a fresh 2026-09-19 browser verification:

- A successful browser bridge ingest on 2026-09-11 recorded 11 pages, 1 course and 29 items.
- Probe receipts around that run report `pair-fix-v2`; later host telemetry reports `pair-fix-v3`. That value is the Study pairing helper version, not the Firefox addon manifest version.
- Existing project documentation records the first real Windows/Firefox ingest as the earlier verified baseline.
- Last source-level sync timestamp currently stored for the Palermo Blackboard source is 2026-09-12 UTC.

Therefore the safe statement is: **current source package = 0.5.0; last successful browser ingest = historically verified; installed addon version for that successful ingest = not version-bound / unknown.**

## SOURCE_DEBT

1. **Fresh browser validation:** no current 0.5.0-version-bound sync receipt. Add extension manifest version to probe/sync telemetry before declaring 0.5.0 browser-verified.
2. **File mirror:** `study_bb_files` is currently empty. Mirroring is implemented but not currently evidenced end-to-end. The next real accessible PDF/DOCX/PPTX/XLSX should prove: Blackboard fetch → private mirror → source artifact `private_ref` → generic extraction queue.
3. **Shared extractor worker:** the provider-neutral extraction queue exists, but the common binary extractor that consumes `parser_profile=document-default` is not implemented in this slice. Do not add a Blackboard-only parser.
4. **Drive bytes/text:** Drive has 105 source artifacts/canonical document identities but no current `private_ref`/complete canonical text version in the common layer. It should enter the same binary/text completion path rather than being treated as already complete.
5. **Calendar course mapping:** the 5 current calendar events have source dates but do not exact-match current aliases, so canonical `course_id` remains null. Add an explicit reviewed alias/crosswalk or stronger source key; do not fuzzy-guess silently.
6. **Syllabus/cronograma extraction:** only the safe prototype for explicit full dates is versioned. Production extraction from syllabus/cronograma documents should run after shared document text exists and must persist text spans/locators + confidence.
7. **Conflict materialization:** schema supports conflict groups and the adapter test proves preservation behavior, but no production conflict-reconciliation worker is attached yet.
8. **Backend source control:** deployed Blackboard Edge Function sources were historically absent from `supabase/functions/`. This branch snapshots the active sources; historical migrations that contain sensitive setup material must not be copied to GitHub.
9. **Sensitive historical migration debt:** Supabase migration history contains legacy secret-bearing setup statements. No secret values are reproduced in GitHub or this handoff. Active credentials/feed tokens should be rotated/sanitized separately and future cron auth should use a secret store, not literals in migration SQL.
10. **Body length mismatch:** browser capture can retain more text than `study-blackboard-v1` currently stores for an item; the endpoint caps `body_text` at 20,000 characters. Long rendered documents can therefore truncate before canonical text capture.
11. **Documentation drift:** README/public installer copy had limits/version text from older bridge releases. Runtime behavior must be derived from current code until docs are reconciled.

## Security boundary

- No Blackboard password is persisted by Prometeo.
- No authentication bypass is introduced.
- Only content visible to the legitimately authenticated browser session is fetched.
- Blackboard private content stays in private DB/storage paths; public GitHub contains only code, schemas, aggregate evidence and synthetic tests.
- Workspace tokens, cookies, calendar feed secrets, storage tokens and private source content are deliberately absent from this snapshot.
