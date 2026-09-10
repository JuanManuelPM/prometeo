# HUMAN_ONLY — YouTube Creator Runtime

This file is the only intended human frontier after worker-soluble setup.

## Required only when moving from fixtures to real providers

1. Open the published Setup page and sign in with the existing Prometeo account if no session is present.
2. Gemini: create/copy one Google AI Studio API key and paste it into Setup. The key is sent to Supabase Vault and cleared from the browser field.
3. Google/YouTube: in a Google Cloud project, enable YouTube Data API v3 and YouTube Analytics API; configure OAuth consent for the user's account; create a Web OAuth client with redirect URI:
   `https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-google-oauth/callback`
   Paste client ID + client secret in Setup, then click authorize and approve Google once.
4. If no YouTube channel exists, create it in YouTube's UI, then authorize/detect again. Normal YouTube Data API does not create channels.
5. Paid video: explicitly choose whether Veo spending is allowed and set a per-video cap. Default remains blocked.

## Not human work

Do not ask the user to create the database, storage, Vault, workers, scheduler, OAuth callback, retry/recovery logic, API contract, QA fixture, external-work bridge, analytics schema, or frontend wiring. Those are runtime responsibilities.

## Completion signal

Use `GET /setup/status`. Human setup is complete only when `human_gates` is empty. Export `GET /handoff/export` after that; the handoff contains no provider secrets or tokens.
