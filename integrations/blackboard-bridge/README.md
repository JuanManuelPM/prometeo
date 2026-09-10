# Prometeo Blackboard Bridge

Private Study Library integration for `palermo.blackboard.com`.

## Data flow

1. `study-blackboard-v1` fetches the private Blackboard calendar feed server-side and normalizes events with stable Blackboard UID values.
2. A Supabase cron job runs calendar sync every 15 minutes, independent of the browser.
3. The Firefox extension reuses the user's already-authenticated Blackboard browser session. It never stores the Blackboard password.
4. The extension crawls user-visible course/navigation/content pages, opportunistically captures rendered Blackboard pages, and posts normalized course/content metadata to `study-blackboard-v1?action=ingest`.
5. Accessible document links are mirrored to the private Supabase Storage bucket `study-blackboard-files` through `study-blackboard-files-v1` (50 MB per-file cap; large media is skipped).
6. Study Library V9 reads normalized data through the private workspace token stored only in the user's browser, shows upcoming Blackboard events/changes, and exposes a Blackboard tab inside matched courses. Mirrored files are opened with short-lived signed URLs.

## Browser sync

The extension has a 15-minute alarm and a manual sync trigger. It is bounded to avoid runaway crawling (90 HTML pages, roughly 2200 metadata items per full pass, up to 80 file mirror candidates per pass). On every Blackboard page the content script also captures the rendered page after load, which improves coverage for JavaScript-rendered Blackboard views.

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
