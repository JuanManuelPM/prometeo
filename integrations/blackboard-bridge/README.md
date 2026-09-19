# Prometeo Blackboard Bridge

Private Study Library integration for `palermo.blackboard.com`.

## Data flow

1. `study-blackboard-v1` fetches the private Blackboard calendar feed server-side and normalizes events with stable Blackboard UID values.
2. A Supabase cron job runs calendar sync every 15 minutes, independent of the browser.
3. The Firefox extension reuses the user's already-authenticated Blackboard browser session. It never stores the Blackboard password.
4. The extension crawls user-visible course/navigation/content pages, opportunistically captures rendered Blackboard pages, and posts normalized course/content metadata to `study-blackboard-v1?action=ingest`.
5. Accessible document links are mirrored to the private Supabase Storage bucket `study-blackboard-files` through `study-blackboard-files-v1` (50 MB per-file cap; large media is skipped).
6. The existing source-graph trigger projects Blackboard items into `study_source_artifacts`; the provider-neutral canonical pipeline projects them into `study_canonical_documents` and versioned text. Binary files enter the shared `document-default` extraction queue only after a private mirror exists.
7. Study Library V9 still reads normalized Blackboard data through the private workspace token stored only in the user's browser. No public UI behavior is changed by the canonical-ingestion layer.

## Browser sync

The extension source package is `0.5.0`. It has a 15-minute alarm and a manual sync trigger. Current `background.js` bounds a pass to fewer than 180 HTML pages and 4200 metadata items, with up to 80 file mirror candidates. Historical successful ingest receipts are not addon-version-bound, so a fresh 0.5.0 browser receipt is still required before calling 0.5.0 browser-verified. On every Blackboard page the content script also captures the rendered page after load, which improves coverage for JavaScript-rendered Blackboard views.

## Security

- The original calendar-feed URL is stored only in Supabase `study_bb_sources`, never in GitHub or public frontend assets.
- Blackboard credentials are not requested or persisted by Prometeo.
- Blackboard metadata/file tables have RLS enabled with no public policies. Access from the web app is through custom-token Edge Functions.
- The Study workspace token is SHA-256 hashed in `study_bb_workspaces`; the raw token is paired to the browser through a private setup URL fragment and stripped from the address immediately after setup.
- Mirrored files are in a private Storage bucket and are exposed only via short-lived signed URLs.

## Runtime files

- `firefox/manifest.json`
- `firefox/crawler.js`
- `firefox/background.js`
- `firefox/study.js`
- `firefox/blackboard.js`
- `pages/study-library/study-v9-patch.js`
- `pages/study-library/study-v9-content.js`
- `pages/study-library/blackboard-bridge.html`

## Current human boundary

Firefox Stable does not allow a website to silently install an unsigned local extension. For the prototype, the only mandatory browser-side step is loading `manifest.json` as a temporary add-on through `about:debugging#/runtime/this-firefox`. Once loaded, pairing and sync are automatic. A future AMO-signed build can remove this prototype-only step.

## Canonical ingestion state

See `BLACKBOARD_CURRENT_STATE.md`, `DATA_FLOW.md`, and `HANDOFF.md`. The canonical document migration is provider-neutral and intentionally leaves PDF/DOCX/PPTX/XLSX parsing to the shared document extractor rather than a Blackboard-specific parser.
