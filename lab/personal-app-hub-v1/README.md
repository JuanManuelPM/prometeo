
# Prometeo Personal App Hub v1

Candidate runnable local receiver (Node 20+, built-in modules only). This is an isolated event projection, not a replacement for Phone Bridge, Finance, Calendar, P4 Capture or local-first habits storage.

Run: node lab/personal-app-hub-v1/server.mjs
Test: node --test lab/personal-app-hub-v1/tests.mjs

Open the localhost URL printed by Node. The random key is generated and stored with mode 0600 under ~/.local/share/prometeo/personal-app-hub-v1/api-key and sent only via same-origin custom header. Server binds to 127.0.0.1, rejects non-loopback Hosts and mismatched Origins, and has a restrictive CSP.

POST /api/events with Content-Type application/json and X-Prometeo-Key. JSON fields: source, external_id, actor_id, occurred_at, title, text. GET /api/status, /api/events, /api/proposals.

Allowed source IDs: whatsapp_notification, android_notification, gmail_export, calendar_export, pinterest_bookmark, youtube_link. They are input format names, NOT connected provider accounts. Provider sessions reported as 0. Never treat ingestion of a manually constructed JSON as successful phone/WhatsApp integration.

By default message body and title are discarded. To explicitly opt in to local body persistence, start with PROMETEO_HUB_STORE_BODIES=1. Data stays in a local JSONL file with 0700 directory permissions; future production needs encryption, retention limits, export/delete and integration with the existing canonical storage owner. Duplication key: source + external_id.

The UI offers a clearly marked fake example which is not persisted. All proposals remain PROPOSED_ONLY. No endpoints perform external actions. No automatic launch, Android installation, WhatsApp sessions, API credentials or Mercado Pago data are configured.

Existing code preserved: phone-bridge/v1 and v2 packages, Pinterest query lab, finance-auth, Calendar preview, PrometeoDB and all served UI. Source is on an isolated feature branch, not Current/Accepted/Served.

Next integration boundary: inspect actual Android relay inputs, then implement an authorized adapter producing stable IDs and send one real event. This step cannot be inferred from existing opaque installer packages.
