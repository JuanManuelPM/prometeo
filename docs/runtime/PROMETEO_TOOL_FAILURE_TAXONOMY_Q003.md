# Q003 — Durable tool failure taxonomy

## Scope

This taxonomy classifies **observable evidence**, not guessed causes. A slow call, a missing result, or a lease expiring after a tool problem is not enough to infer rate limiting, security blocking, or connector failure.

## Precedence

1. **CONTROL_STALE_LEASE** — A Prometeo response was successfully received and its domain state is `STALE_LEASE` / `LEASE_NOT_CURRENT`. This is not a tool failure. The transport worked; control-plane authority expired. Follow the returned Prometeo action and never blindly retry the old publish.
2. **TOOL_SECURITY_BLOCKED** — The host/harness explicitly reports that a tool call was blocked by security/safety policy or that request safety could not be determined, before a normal backend response is available. A retry of the same permitted operation may succeed, but do not mutate the request to evade controls.
3. **TOOL_RATE_LIMITED** — Requires explicit rate-limit evidence such as HTTP 429, RESOURCE_EXHAUSTED/RATE_LIMITED, or a provider rate-limit code. Retry-After is evidence when present. Latency alone is never sufficient.
4. **TOOL_CONNECTOR_ERROR** — The tool/connector returns an error envelope or remote-operation rejection that is neither rate limit nor security block. Preserve machine codes (HTTP, SQLSTATE, MCP/connector code) and whether the backend was reached. Example observed here: connector surface INVALID_ARGUMENT / HttpException with PostgreSQL SQLSTATE 42601.
5. **TOOL_UNKNOWN** — An actual tool failure is observable, but none of the stronger classes is supported. UNKNOWN is a truthful residual, not a synonym for “probably connector”.

The order matters: a stale lease that arrives through a working Supabase connector must remain CONTROL_STALE_LEASE; an explicit 429 surfaced by a connector remains TOOL_RATE_LIMITED rather than generic connector error.

## Minimal durable signal

A TOOL_ERROR checkpoint/event should record only the minimum needed to classify and reproduce routing behavior:

- `reason_code` — one of the codes above.
- `failure_layer` — `HARNESS | CONNECTOR | REMOTE_PROVIDER | CONTROL_PLANE | UNKNOWN`.
- `operation` — stable operation name, not full arguments.
- `tool_family` — e.g. Supabase, GitHub.
- `observed_at` — timestamp.
- `attempt` and bounded `retry_budget`.
- `backend_response_received` — boolean.
- `status_code` / `provider_code` when explicitly present.
- `retry_after_seconds` only when provided by the failing layer.
- `control_state` and `control_reason_code` for Prometeo domain responses.
- `lease_fingerprint` rather than raw lease token when lease context matters.
- `message_fingerprint` plus a short sanitized `observed_surface`; never persist secrets, full SQL payloads, credentials, or arbitrary connector output.

## Recovery semantics

**TOOL_RATE_LIMITED:** obey an explicit Retry-After; otherwise use bounded backoff. Do not relabel a repeated 429 as UNKNOWN.

**TOOL_SECURITY_BLOCKED:** distinguish it from a backend rejection using `backend_response_received=false` when observable. One exact retry can establish whether the block was transient; repeated blocks remain the same class and become a boundary, not a prompt to bypass safety.

**OBEY-v2 operation override:** the sentence above is taxonomy-level fallback, not a universal retry mandate. The active protocol owns retry policy per operation: an optional `prometeo_checkpoint` blocked by security is not retried; BOOTSTRAP stops after the second explicit security block; WAIT permits at most one retry when the environment allows it. Never convert a protocol-specific “do not retry” rule into the generic taxonomy fallback.

**TOOL_CONNECTOR_ERROR:** preserve connector/provider machine codes. Syntax/validation errors are generally non-retryable without correcting the request; transport/5xx errors may be retried under a bounded policy. The taxonomy does not infer retryability from the word “connector”.

**CONTROL_STALE_LEASE:** do not retry the old write. Prometeo already provides the next action; the old lease is no longer authoritative.

**TOOL_UNKNOWN:** bounded retry only if the operation is retry-safe. If evidence remains insufficient, keep UNKNOWN and surface the boundary.

## Evidence from this cohort

K056 observed two harness security blocks while issuing read-only Supabase evidence queries; later the exact allowed operation succeeded, proving that those blocks were upstream of a normal Supabase result and should not be recorded as SQL/database failures.

K068 previously checkpointed Q003 with milestone TOOL_ERROR and `observed_surface="OpenAI blocked tool call because request safety state could not be determined"`, candidate SECURITY_BLOCK. That independent event supports a durable TOOL_SECURITY_BLOCKED class.

K056 also observed a connector/backend error on an invalid SQL publish attempt: the connector surfaced INVALID_ARGUMENT wrapping a Supabase HttpException with PostgreSQL code 42601. That belongs to TOOL_CONNECTOR_ERROR with the provider code retained, not SECURITY_BLOCK and not RATE_LIMITED.

Finally, K056 received Prometeo `STALE_LEASE` / `LEASE_NOT_CURRENT` after an expired I003 lease. The tool call itself succeeded and returned a structured control-plane state, so this is CONTROL_STALE_LEASE.

## Verification

`supabase/tests/runtime_tool_failure_taxonomy_q003.sql` implements five representative fixtures. Executed read-only against Supabase, every expected class matched: rate, security, connector, stale lease, and unknown.
