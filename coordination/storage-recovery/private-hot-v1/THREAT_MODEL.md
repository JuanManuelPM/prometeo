# Prometeo Primary HOT v1 · threat model

Status: **PREPARED / NOT DEPLOYED**

Authority: transport-only. This file does not create scheduler, queue, CURRENT, Work Graph, worker family or durable-memory authority.

## Protected assets

- raw Primary Chat text;
- browser workspace secret;
- Supabase service-role secret;
- wake tokens;
- GitHub write credential in the Vercel bridge;
- integrity of CURRENT portfolio jobs.

## Trust boundaries

1. Browser -> Primary HOT edge: raw text is allowed only over HTTPS after the browser has persisted the request locally.
2. Primary HOT edge -> Postgres: service-role access stays server-side.
3. Browser -> Vercel wake bridge: only wake token, never raw text.
4. Vercel -> Primary HOT edge: wake token is verified before any GitHub job can be materialized.
5. Vercel -> GitHub: only sanitized locator/job metadata.

## Threats and guards

### Arbitrary workspace self-provisioning

Threat: a public caller invents a 32+ character bearer, creates its own workspace, obtains a valid wake token and uses the bridge to create GitHub work.

Guard: `PROMETEO_PRIMARY_HOT_WORKSPACE_SECRET_SHA256` is mandatory. The edge hashes the presented browser secret and compares it in constant-time style against that single configured hash **before** reading or creating a workspace row. Missing guard fails closed with 503; mismatch returns 401. The raw workspace secret is never configured server-side.

### CORS bypass

Threat: non-browser callers omit `Origin`; CORS therefore cannot be treated as authentication.

Guard: CORS only limits browser origins. All submit/status workspace operations require the secret-hash guard. Wake operations require a valid HMAC-derived wake token.

### Wake-token forgery/replay

Guard: wake token is HMAC-derived using the Supabase service-role secret and bound to workspace_id + request_id + work_item_id. Database stores only SHA-256(token). Expired tokens fail. Replays converge on deterministic job IDs and create-only GitHub semantics.

### Secret publication

Guard: public GitHub objects contain only sanitized locators. No raw prompt, workspace secret, service-role secret, GitHub token or wake token may be committed. Browser config contains endpoint only after deployment passes health/security gates.

### Storage growth

Guard: 72h request expiry; bounded prune only on a new human submit; no heartbeat/poll/read telemetry writes; two tables only.

## Deployment auth mode

The edge uses a custom workspace bearer in the `Authorization` header. Therefore deployment must set **verify_jwt=false** and rely on the explicit application guards above. Enabling platform JWT verification would reject the custom bearer before the function runs; disabling it without these guards would make the endpoint public and unsafe.

## Mandatory deployment canaries

1. GET health without configured guard -> fail closed.
2. Random 32+ character bearer + submit -> 401 and **no workspace row created**.
3. Configured browser secret + submit -> exactly one workspace row and one STORED request.
4. Replay same request_id/text -> deterministic replay, no duplicate request.
5. Same request_id/different text -> 409.
6. Random wake token -> reject.
7. Valid wake token -> sanitized locator only, no raw text.
8. Read/status/health -> zero durable writes.
9. Vercel wake -> create-only deterministic GitHub job.
10. Full Primary Chat request -> CURRENT claim -> RETURN -> sanitized visible response.

Until all relevant canaries pass, `PROMETEO_PRIMARY_HOT_CONFIG_V1.enabled` remains false.
