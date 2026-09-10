# LAST_RETURN — youtube-creator-runtime

Status: READY_FOR_HUMAN_GATES
Date: 2026-09-10

## Material completion

- Real Supabase DB/storage/Vault/scheduler/job leasing deployed.
- `creator-api`, `creator-worker`, `creator-google-oauth`, `creator-work` deployed.
- Fixture pipeline E2E PASS: creative package -> vertical H.264/AAC MP4 -> private Storage -> deterministic QA -> READY.
- Stale lease recovery PASS: RUNNING/dead lease -> RETRY -> scheduler -> SUCCEEDED.
- WAITING_AUTH isolation PASS: YouTube publish parked while unrelated generation completed.
- Job/publication idempotency PASS at durable row layer.
- External work GET PASS and return->transactional auto-apply PASS via database trigger; version conflicts stop application.
- Three Frutidrama story arcs seeded for the real Prometeo owner.
- Approved Channels UI wired to real backend when a Prometeo Supabase session exists; unauthenticated view preserves the visual demo only.
- Human setup page prepared and published to gh-pages with Google Cloud/AI Studio/YouTube links, Vault submission, OAuth start, explicit video spend policy, zero-cost factory canary, private-upload canary and secret-free handoff export.
- Stable frontend contract published.

## Human-only frontier

See `HUMAN_ONLY.md`. Current real-provider blockers are credentials/consent/channel creation/spend authorization only. Do not ask the user to build infrastructure.

## Important negative knowledge

- `casa-tts` timed out in Creator canary at 12 s. Voice is non-blocking and marked BLOCKED until a later successful probe; pipeline still completes. Do not claim Creator TTS canary PASS yet.
- No real Gemini/Veo/YouTube upload canary is possible until the corresponding human credentials/consent exist.
- Paid Veo is disabled by default even after a valid Gemini key is stored.
- Fixture output is always identified as fixture and is never evidence of real AI video generation.

## Public entries

- Channels: https://juanmanuelpm.github.io/prometeo/pages/lab/channels/
- Setup: https://juanmanuelpm.github.io/prometeo/pages/lab/channels/setup/
- Frontend contract: https://juanmanuelpm.github.io/prometeo/pages/lab/channels/frontend-contract.json

## Backend entries

- Creator API: https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-api
- External work: https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-work?schema=1
- OAuth callback: https://catnohyouxqjjtseaueb.supabase.co/functions/v1/creator-google-oauth/callback

## Next action

Human opens Setup. Runtime should accept secrets/consent there, probe them, and then execute canaries. No further worker-soluble infrastructure step precedes that action.
