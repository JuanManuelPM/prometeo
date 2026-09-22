# Blackboard file mirror — live verification contract

Status: EXECUTABLE_QA · NOT_LIVE_VERIFIED  
Created: 2026-09-22  
Backlog source: `coordination/STUDY_LIBRARY_PENDING_2026-09-10.md`

## Purpose

Close exactly one durable Study Library backlog item: validate the Blackboard attachment mirror end-to-end with a real authenticated Blackboard file. This document does **not** claim the mirror is already verified.

The current implementation path exists in `integrations/blackboard-bridge/firefox/background.js` through `bbMirrorFiles(items)`. The durable state file `integrations/blackboard-bridge/BLACKBOARD_CURRENT_STATE.md` still records `BLACKBOARD_FILE_PIPELINE_LIVE_VERIFIED=false`.

Backend baseline observed on 2026-09-22: `public.study_bb_files` contains **0 rows**.

## Preconditions

1. Firefox Blackboard Bridge version 0.5.0 is installed and paired to workspace `colo-study`.
2. The browser has a live authenticated `palermo.blackboard.com` session.
3. At least one current Blackboard item is classified as `item_type=file`.
4. The candidate is not excluded by the runtime: it is not a large media file, is at most 50 MiB, and its authenticated fetch returns binary content rather than HTML/login markup.
5. No Blackboard password, workspace token, cookie, or private file bytes may be copied into a public receipt.

If no eligible real file exists, result is `BLOCKED_NO_ELIGIBLE_FILE`, not PASS.

## Baseline evidence

Before the browser sync, record:

```sql
select count(*) as mirrored_files
from public.study_bb_files;
```

For the current baseline this value is 0.

The authoritative verification columns are:

- `workspace_id`
- `item_key`
- `course_key`
- `file_name`
- `storage_path`
- `source_url`
- `mime_type`
- `size_bytes`
- `sha256`
- `mirrored_at`

## Execution

1. Trigger one fresh sync from Blackboard Bridge 0.5.0 while the authenticated Blackboard session is valid.
2. Preserve the sync result returned by the bridge, including the `files` object emitted by `bbMirrorFiles`.
3. Require `files.candidates >= 1`. If it is 0, stop as `BLOCKED_NO_ELIGIBLE_FILE`; do not reinterpret absence of work as a successful mirror.
4. Require `files.mirrored >= 1`. A candidate that is skipped because it resolves to HTML does not count.
5. Re-query `public.study_bb_files` and identify the newly mirrored row by `item_key`.
6. Verify that:
   - row count increased from baseline;
   - `file_name` is non-empty;
   - `storage_path` is non-empty;
   - `size_bytes > 0`;
   - `mirrored_at` belongs to this test run;
   - `course_key` matches the source item when the item is course-scoped;
   - `source_url` points back to the Blackboard source rather than to a public mirror;
   - `mime_type` is not `text/html`;
   - `sha256`, when populated, is stable for the stored bytes.
7. Call the private file index path used by the extension (`study-blackboard-files-v1?action=index`) with the paired workspace credentials and verify that the same `item_key` is discoverable there.
8. If a private download/read path is available through the same function contract, verify that the stored object is retrievable and non-empty without making it public. Do not place file contents in the receipt.

## PASS gate

Set `BLACKBOARD_FILE_PIPELINE_LIVE_VERIFIED=true` only when all of these are simultaneously true:

- the run is explicitly version-bound to Firefox Bridge 0.5.0;
- an eligible real Blackboard file was observed;
- the bridge reports at least one successful mirror;
- `study_bb_files` gains the corresponding row;
- required metadata is coherent;
- the private index resolves the same item;
- no HTML/login document was stored as the file;
- no credential or private content leaked into public evidence.

A PASS receipt should contain only: bridge version, test timestamp, source item key or irreversible hash, course key when non-sensitive, MIME type, byte size, row-count delta, storage/index verification booleans, and redacted error summary if applicable.

## FAIL conditions

Any of the following keeps `BLACKBOARD_FILE_PIPELINE_LIVE_VERIFIED=false`:

- `files.candidates > 0` but `files.mirrored = 0`;
- upload endpoint error;
- database row count does not increase after a reported mirror;
- new row has empty `storage_path` or zero bytes;
- stored MIME type is HTML;
- course/item provenance is mismatched;
- private index cannot resolve the new row;
- version of the extension used for the run is unknown;
- verification requires exposing token, cookies, password, or file bytes publicly.

## Provenance and non-duplication

This contract was derived from the durable Study Library backlog and the 2026-09-19 Blackboard current-state boundary. Before selecting it, the current implementation was inspected: `bbMirrorFiles` already performs authenticated download, HTML rejection, 50 MiB bounds, private upload, and mirror-result reporting, so this task is deliberately **verification**, not a duplicate reimplementation.

The alternative backlog item “course canonicalization” was not selected because the current crawler already contains title scoring/normalization that penalizes file-like titles and preserves stronger course names. Likewise, currently READY opportunity-queue items were not selected because they already have durable claims.

## Closure update

After a PASS only:

1. update `integrations/blackboard-bridge/BLACKBOARD_CURRENT_STATE.md` with the version-bound receipt and set the live-verification boundary to true;
2. update `coordination/STUDY_LIBRARY_PENDING_2026-09-10.md` so “Mirror de archivos todavía no validado” is no longer presented as open;
3. preserve the receipt without secrets or file contents.

Until that PASS exists, both durable documents must continue to describe the file mirror as unverified.
