# HUMAN_ONLY — YouTube Creator Runtime

This is the complete intended human frontier. Everything outside this list is runtime work.

## Required to leave fixture mode

1. Open the published Setup page. If the shared Prometeo Supabase session is not present, sign in once by email magic link.
2. Gemini / Veo: open Google AI Studio, create or copy one API key, paste it in Setup. Setup sends it directly to server-side Vault, probes available models, then clears the browser field.
3. Google / YouTube: in one Google Cloud project enable:
   - YouTube Data API v3
   - YouTube Analytics API
   - YouTube Reporting API
   Configure OAuth consent for the account, then create one **Web application** OAuth client with this exact redirect URI:
   `https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-google-oauth/callback`
   Paste Client ID + Client Secret into Setup, then press authorize and approve Google/YouTube once.
4. If there is no YouTube channel yet, create it using YouTube's own create-channel UI, return to Setup and authorize/detect again. The normal YouTube Data API does not create channels.
5. Decide whether paid Veo generation is allowed. It remains disabled by default. If enabled, set a per-video USD ceiling in Setup.
6. Run the zero-cost factory canary. Once Google/YouTube is authorized, optionally run the private-upload canary. The canary never requests public publication.
7. Export `prometeo_creator_handoff.json` if another chat/agent needs a portable status snapshot. It contains no provider secrets or tokens.

## Optional

- Hugging Face token: optional fallback only.
- External TTS credential: not required for the core factory. Creator treats voice-provider failure as non-blocking unless a specific channel later requires that voice provider.

## Never ask the user to do these

Database/schema, Storage bucket, Vault plumbing, scheduler, job leasing/recovery, OAuth callback, refresh-token storage, provider adapters, prompt compiler, QA, resumable upload logic, Analytics collectors, Reporting reach collector, external-AI work packets, idempotency, frontend contract, deploys, or GitHub persistence.

## Completion signal

Use `GET /setup/status` for human gates. A Reporting reach job may take up to YouTube's reporting delay after OAuth; that delay is machine-waiting, not a human gate. Export `GET /handoff/export` after setup. Secrets are never exported.
