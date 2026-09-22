# CORE-V1 · ADMISSION · BUILD evidence

Status: VERIFIED — no code change required

Scope: `prometeo_bootstrap + OBEY-v2`.

## Atomic bootstrap

Current canonical `o/index.html` requires one first Prometeo server call:

`ADMISSION → BOOTSTRAP(PREFLIGHT+ENTER) → WORK | WAIT`

and explicitly forbids splitting initial admission into separate PREFLIGHT/ENTER calls or substituting repository/scheduler archaeology for failed bootstrap.

Versioned adoption evidence:
- `cd31c1526ae2c4e3c25b59ac3f614c55b17b1be7` — AGENTS OBEY entry aligned to atomic bootstrap.
- `f28422332c9ff9bcda2776a91781e012984a9d20` — generated worker launcher aligned to atomic bootstrap.
- `04be223410a5c295a4c99b789be22029d05f49ff` — OBEY production rule aligned to ADMISSION→BOOTSTRAP.

## Rate-limit retry behavior

Current `o/index.html` preserves the same `agent_id` across admission retries and requires retrying the same `prometeo_bootstrap` operation. It defines bounded admission retry attempts and terminal BLOCKED behavior instead of lateral routing.

Generic connector backoff is also explicit in the worker prompt: respect RATE_LIMITED/Retry-After and retry the same operation without changing route. Versioned evidence: `dab5f8ab51fcafc1120ef7bccb178b3281f1f70e`.

## Live evidence from this worker session

Agent `wc-20260922T0122-8f3c9d20` entered through `prometeo_bootstrap` and received the durable OBEY-v2 WORK state/session used for this closeout. The first connector attempt was security-blocked; the same bootstrap operation was retried without lateral routing and succeeded.

## Remaining gaps

No functional admission gap was found in the canonical protocol/launcher/runtime behavior exercised here.

Direct backend function-body introspection was blocked by connector security during this sheet and was not retried through an alternate route. This is an evidence-access limitation, not evidence of a runtime defect.
