# HANDOFF — Public State v1

Read `README.md`, both schemas, `prometeo-public-state.mjs`, the synthetic example, and `supabase/design/prometeo-public-state-v1.sql`.

Integration order:

1. Implement durable local cache/outbox adapter without changing canonical domain ownership.
2. Turn the SQL design into a reviewed production migration; keep tables private and add an authenticated Edge Function transport.
3. Implement server-side key/channel/source/schema registry enforcement and scoped capabilities before `friends` or anonymous-public sharing.
4. Add Realtime Broadcast if useful; retain authenticated polling + snapshot reconciliation as fallback.
5. Integrate one low-risk producer projection, then one renderer. Do not make remote sync a prerequisite for local writes.
6. Keep TV Room commands separate from Public State subscriptions.

Do not copy canonical histories/files/transcripts/finance/private notes into Public State. Publish only explicit safe projections.
